import json
from collections import Counter
import re
from src.DBConnector import get_db_connection

# Map Hebrew preference keys to English taxonomy keys
HEB_TO_ENG_PREF_KEYS = {
    "טבעוני": "is_vegan",
    "צמחוני": "is_vegetarian",
    "ללא_גלוטן": "is_gluten_free",
    "כשרות": "is_kosher",
    "חלבון_גבוה": "is_high_protein",
    "ללא_סוכר": "is_sugar_free"
}

# List of common adjectives to exclude in product name normalization
EXCLUDED_ADJECTIVES = {
    "בהיר", "כהה", "צפוני", "דרומי", "שחורה", "לבנה", "קל", "מלא", "קטן", "גדול",
    "אישי", "משפחתי", "פרוס", "טרי", "קפוא", "יבש", "מבושל", "מתובל", "מעושן",
    "גרוס", "שלם", "טחון", "דק", "עבה", "רגיל", "אורגני", "נטול", "מהיר", "איטי",
    "איכותי", "מיובא", "מקומי", "שקוף", "מרוכז", "דל", "עשיר", "קלאסי", "חום", "לבן",
    "אדום", "צהוב", "ירוק", "שחור", "אפור", "זהוב", "כתום", "כחול", "מעורב", "מעורבת",
    "מסחרי", "טעים", "חדש", "ישן", "ממותג", "חסכוני", "יקר", "זול", "ביתי", "חיצוני",
    "תעשייתי", "אישי", "גדול", "קטן", "דק", "עבה", "חם", "קר", "מוגז", "טבעי"
}

# Normalize product name to group similar items
def normalize_product_name(name):
    name = re.sub(r"[^א-ת ]", "", name)
    name = re.sub(r"\s+", " ", name).strip()
    tokens = name.split()
    for token in tokens:
        if token not in EXCLUDED_ADJECTIVES:
            return token  # use only the first non-adjective word
    return ""  # fallback


# Get mapping of item_code to item_name
def get_product_names():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT item_code, item_name FROM products")
    names = {row["item_code"]: row["item_name"] for row in cursor.fetchall()}
    cursor.close()
    conn.close()
    return names

# Get user's budget
def fetch_user_budget(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT budget_amount FROM users WHERE id = %s", (user_id,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    return result["budget_amount"] if result else 0

# Get user's dietary preferences in English key format
def get_user_dietary_preferences(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT dietary_preferences FROM users WHERE id = %s", (user_id,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    
    preferences = {}
    if result and result["dietary_preferences"]:
        try:
            raw_prefs = json.loads(result["dietary_preferences"])
            for heb_key, val in raw_prefs.items():
                eng_key = HEB_TO_ENG_PREF_KEYS.get(heb_key)
                if eng_key:
                    preferences[eng_key] = val
        except json.JSONDecodeError:
            pass
    return preferences

# Count user's purchased products
def get_user_purchase_counts(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT products FROM user_lists WHERE user_id = %s", (user_id,))
    
    item_counts = Counter()
    for row in cursor.fetchall():
        try:
            products = json.loads(row[0])
            for item_code, details in products.items():
                quantity = details.get("quantity", 1)
                item_counts[item_code] += quantity
        except (json.JSONDecodeError, TypeError):
            continue

    cursor.close()
    conn.close()
    return item_counts

# Get other users from the same cluster (excluding self)
def get_cluster_user_ids(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT user_cluster FROM users WHERE id = %s", (user_id,))
    cluster = cursor.fetchone()
    if not cluster or cluster["user_cluster"] is None:
        return []
    cluster_id = cluster["user_cluster"]
    cursor.execute("SELECT id FROM users WHERE user_cluster = %s AND id != %s", (cluster_id, user_id))
    users = [row["id"] for row in cursor.fetchall()]
    cursor.close()
    conn.close()
    return users

# Get product taxonomy mapping
def get_product_taxonomies():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT item_code, taxonomy_json FROM products WHERE taxonomy_json IS NOT NULL")
    tax_map = {}
    for row in cursor.fetchall():
        try:
            tax_map[row["item_code"]] = json.loads(row["taxonomy_json"])
        except:
            continue
    cursor.close()
    conn.close()
    return tax_map

# Get average price per product
def get_product_prices():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT item_code, AVG(item_price) as avg_price
        FROM store_prices
        GROUP BY item_code
    """)
    prices = {row["item_code"]: float(row["avg_price"]) for row in cursor.fetchall()}
    cursor.close()
    conn.close()
    return prices

# Compare taxonomy similarity using set intersection
def taxonomy_similarity(tax1, tax2):
    set1 = set(tax1.get("NutritionalPreferences", {}).keys())
    set2 = set(tax2.get("NutritionalPreferences", {}).keys())
    if not set1 or not set2:
        return 0.0
    return len(set1 & set2) / len(set1 | set2)

# Generate product recommendations for user
def generate_recommendations(user_id, max_items=10):
    budget = fetch_user_budget(user_id)
    user_purchases = get_user_purchase_counts(user_id)
    cluster_users = get_cluster_user_ids(user_id)
    preferences = get_user_dietary_preferences(user_id)

    cluster_items = Counter()
    conn = get_db_connection()
    cursor = conn.cursor()
    for uid in cluster_users:
        cursor.execute("SELECT products FROM user_lists WHERE user_id = %s", (uid,))
        for row in cursor.fetchall():
            try:
                products = json.loads(row[0])
                for item_code, details in products.items():
                    quantity = details.get("quantity", 1)
                    cluster_items[item_code] += quantity
            except (json.JSONDecodeError, TypeError):
                continue
    cursor.close()
    conn.close()

    taxonomies = get_product_taxonomies()
    prices = get_product_prices()
    product_names = get_product_names()
    purchased_taxonomies = [taxonomies[i] for i in user_purchases if i in taxonomies]

    scores = []
    for item_code, tax in taxonomies.items():
        if item_code not in prices:
            continue

        product_prefs = tax.get("NutritionalPreferences", {})
        incompatible = any(
            preferences.get(k, False) and not product_prefs.get(k, False)
            for k in preferences
        )
        if incompatible:
            continue

        sim_score = max([taxonomy_similarity(tax, p_tax) for p_tax in purchased_taxonomies], default=0)
        cluster_popularity = cluster_items[item_code] / max(len(cluster_users), 1)
        self_popularity = user_purchases.get(item_code, 0)
        normalized_self_pop = self_popularity / max(user_purchases.values(), default=1)

        score = 0.5 * sim_score + 0.3 * cluster_popularity + 0.2 * normalized_self_pop
        scores.append((item_code, prices[item_code], score))

    scores.sort(key=lambda x: x[2], reverse=True)
    added_roots = set()
    recommendations = []
    total = 0

    for item_code, price, _ in scores:
        name = product_names.get(item_code, "")
        root = normalize_product_name(name)
        if root in added_roots:
            continue
        if total + price <= budget:
            recommendations.append(item_code)
            added_roots.add(root)
            total += price
        if len(recommendations) >= max_items:
            break

    return recommendations