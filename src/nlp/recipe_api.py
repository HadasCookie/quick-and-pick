from flask import Blueprint, request, jsonify, make_response
from flask_cors import CORS
from transformers import pipeline
from rapidfuzz import fuzz
from src.DBConnector import get_db_connection
import fractions
import re

match_api = Blueprint("match_api", __name__)

# Load Hebrew NER model
nlp = pipeline("token-classification", model="avichr/heBERT", aggregation_strategy="simple")
CONFIDENCE_THRESHOLD = 0.85

# List of recognized measurement units
UNIT_KEYWORDS = [
    "יחידה", "יחידות", "יח'", "יח",
    "כפית", "כפות", "כף", "כפיות",
    "גרם", "ג'", "קג", "ק״ג",
    "מ״ל", "מל", "ליטר", "שקית", "חבילה", "פחית",
    "שן", "שיני", "שינים", "גביע", "גביעים", "קופסה", "קופסאות","כוס","כוסות", "קופסית", "קופסיות","חבילת" 
]

# List of adjectives to remove from ingredient names
ADJECTIVES = [
    "כתוש", "כתושה", "כתושים", "כתושות",
    "קצוץ", "קצוצה", "קצוצים", "קצוצות",
    "מבושל", "מבושלת", "מגורר", "מגוררת", "גרוס", "גרוסה",
    "מטוגן", "מטוגנת", "טרי", "טרייה", "קפוא", "קפואה",
    "כבוש", "קלוי", "קלויה", "מעושן", "מעושנת", "כתית", "מעולה",
    "מצוין", "מצוינת", "גדושה", "גדושים", "גדושות",
]

# Words that indicate irrelevant products
DISTRACTOR_TERMS = [
     "סלט", "ממרח", "פיצה", "לחם", "עוגה",
    "עוגיות", "קינוח", "חטיפון", "חלבון", "טעמים",
    "תיבול", "חבילה", "תחליף", "בטעם", "אטריות", "פסטה"
]

# Categories to exclude
NON_RECIPE_CATEGORIES = {
    "פארם נקיון וטואלטיקה", "מוצרי תינוקות", "הגיינה", "הגיינה נשית",
    "מוצרי טיפוח", "מוצרי סבון ושיער", "נייר טואלט"
}

# Categories relevant for recipes
RECIPE_CATEGORIES = {
    "מזון יבש", "מוצרי אפייה", "מוצרי מרק ותבלינים", "אורז וקטניות",
    "שימורים", "פירות וירקות", "בשר עוף ודגים", "מוצרי חלב וביצים", "מאפים","טבעוני וצמחוני","חטיפים ודגני בוקר","משקאות"
}

# Subcategories considered non-raw or prepared food
NON_RAW_SUBCATEGORIES = {
    "עוגות ועוגיות",
    "תבשילים מוכנים", "מזון מוכן", "מאפים"
}

def normalize_ingredient_name(name):
    words = name.strip().split()
    return " ".join(w for w in words if w not in ADJECTIVES)

def is_irrelevant(product, ingredient_name):
    name = product["item_name"].lower()
    ing = ingredient_name.lower()
    subcategory = product.get("subcategory", "")

    name = re.sub(r"[^\w\s]", "", name)
    ing = re.sub(r"[^\w\s]", "", ing)

    if name == ing or name.startswith(ing):
        return False
    if re.match(rf"^{re.escape(ing)}\b", name):
        return False
    if subcategory in NON_RAW_SUBCATEGORIES:
        return True
    if any(term in name for term in DISTRACTOR_TERMS):
        return True
    if ing in name and len(name.split()) > 4:
        return True

    return False

# Robust parsing of quantity, unit, and ingredient from free text
def parse_quantity_unit_name(line):
    line = line.strip()
    words = line.split()

    # Special case: two words and no number, treat as full ingredient or unit+ingredient
    if len(words) == 2 and not re.match(r"^\d", words[0]):
        if words[0] in UNIT_KEYWORDS:
            return "", words[0], words[1]
        else:
            return "", "", line

    match = re.match(r"^(\d+(?:/\d+)?|\d+\.\d+)?\s*(\S+)?\s+(.+)", line)
    if match:
        quantity_raw, unit, name = match.groups()
        try:
            quantity = str(float(sum(fractions.Fraction(s) for s in quantity_raw.split()))) if quantity_raw else ""
        except Exception:
            quantity = quantity_raw or ""
        if not quantity and unit and name and unit not in UNIT_KEYWORDS and name not in UNIT_KEYWORDS:
            return "", "", f"{unit} {name}"
    else:
        return "", "", line

    return quantity, unit, name

def parse_ingredients(text):
    lines = text.strip().split('\n')
    parsed = []

    for line in lines:
        quantity, unit, name = parse_quantity_unit_name(line)
        normalized_name = normalize_ingredient_name(name)
        has_missing = any([not quantity and not unit, not normalized_name])

        parsed.append({
            "original_line": line.strip(),
            "ingredient": normalized_name,
            "quantity": quantity,
            "unit": unit,
            "missing_data": has_missing
        })

    return parsed

def score_product(name, ingredient):
    base_score = fuzz.token_sort_ratio(ingredient, name) / 100.0
    name_lower = name.lower()
    ing_lower = ingredient.lower()

    simple_name = re.sub(r"\s*\d+\s*(?:ק\"?ג|גרם|יחידות?|יח'|ליטר|מ\"?ל)?", "", name_lower)

    if simple_name == ing_lower or simple_name.startswith(ing_lower):
        return 1.0
    if name_lower == ing_lower or name_lower.startswith(ing_lower):
        base_score = max(base_score, 0.85)
    if ing_lower in name_lower and len(name.split()) <= 3:
        base_score = max(base_score, 0.85)
    if any(term in name_lower for term in ["טרי", "ראש", "ארוז", "יחידה"]):
        base_score += 0.05
    if len(name.split()) > 4:
        base_score -= 0.05

    return round(min(base_score, 1.0), 2)

def match_to_product(ingredient):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT item_name, manufacturer_name, unit_qty, item_code, category, subcategory
        FROM products
        WHERE item_name LIKE %s;
    """
    like_pattern = f"%{ingredient['ingredient']}%"
    cursor.execute(query, (like_pattern,))
    results = cursor.fetchall()

    cursor.close()
    conn.close()

    filtered_results = [
        r for r in results
        if not is_irrelevant(r, ingredient['ingredient']) and
           (r.get("category") or "").strip() in RECIPE_CATEGORIES
    ]

    if not filtered_results:
        return {
            **ingredient,
            "matched_product": None,
            "barcode": None,
            "manufacturer": None,
            "confidence": 0.0,
            "options": [],
            "missing_data": True
        }

    scored = []
    for result in filtered_results:
        score = score_product(result['item_name'], ingredient['ingredient'])
        scored.append({
            "product": result['item_name'],
            "manufacturer": result['manufacturer_name'],
            "unit": result['unit_qty'],
            "barcode": result['item_code'],
            "confidence": score
        })

    scored.sort(key=lambda x: x["confidence"], reverse=True)
    best = scored[0]

    if best["confidence"] >= CONFIDENCE_THRESHOLD or len(scored) == 1:
        return {
            **ingredient,
            "matched_product": best["product"],
            "barcode": best["barcode"],
            "manufacturer": best["manufacturer"],
            "unit": ingredient["unit"] or best["unit"] or "",
            "confidence": best["confidence"],
            "missing_data": False,
            "options": [opt for opt in scored[1:5] if opt["confidence"] >= 0.5]
        }

    return {
        **ingredient,
        "matched_product": None,
        "barcode": None,
        "manufacturer": None,
        "unit": ingredient["unit"],
        "confidence": best["confidence"],
        "missing_data": True,
        "options": scored[:5]
    }

@match_api.route("/match_ingredients", methods=["POST", "OPTIONS"])
def match_ingredients():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        return response

    data = request.get_json()
    recipe_text = data.get("recipe", "")
    ingredients = parse_ingredients(recipe_text)
    matched = [match_to_product(ingredient) for ingredient in ingredients]
    print(matched)
    return jsonify(matched)