import json
import os
import time
from openai import OpenAI
from src.DBConnector import get_db_connection
import re

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Only these flags are allowed to appear in the nutritional preferences
ALLOWED_FLAGS = {"is_vegan", "is_vegetarian", "is_gluten_free", "is_kosher", "is_high_protein"}

# Excluded brand names that indicate missing/unknown data
EXCLUDED_BRANDS = {"unknown", "לא ידוע", "unkown", "לא צויין"}

def fetch_products():
    """Fetch all products from the database, including taxonomy_json."""
    conn = get_db_connection()
    if not conn:
        return []
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT item_code as product_id, item_name, category, subcategory, manufacturer_name as brand, taxonomy_json
        FROM products
    """)
    products = cursor.fetchall()
    cursor.close()
    conn.close()
    return products

def clean_gpt_response(content: str) -> str:
    """Remove markdown code block wrapping (e.g., ```json ... ```) from GPT output."""
    content = content.strip()
    if content.startswith("```json") or content.startswith("```"):
        content = re.sub(r"^```json\s*|```$", "", content, flags=re.MULTILINE).strip()
    return content

def gpt_enrich_nutritional_flags_batch(item_names, max_retries=3):
    """Send a batch of product names to GPT and extract valid nutritional flags."""
    prompt = """
You will receive a list of food product names. For each item, analyze the product name ONLY and return a JSON object with the following allowed keys:

- is_vegan
- is_vegetarian
- is_gluten_free
- is_kosher
- is_high_protein

Only include a flag if it is clearly stated or implied in the product name.
Return a raw JSON array (no markdown, no explanation, no numbering) in the same order as the input.

Input:
"""
    prompt += "\n".join(f"- \"{name}\"" for name in item_names)

    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that classifies food nutritional attributes."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0,
                timeout=60
            )

            content = response.choices[0].message.content.strip()
            cleaned = clean_gpt_response(content)
            results = json.loads(cleaned)

            # Filter only the allowed flags (ignore extra fields)
            filtered_results = []
            for flags in results:
                filtered = {k: v for k, v in flags.items() if k in ALLOWED_FLAGS and v is True}
                filtered_results.append(filtered)
            return filtered_results

        except Exception as e:
            print(f"[GPT BATCH ERROR] Attempt {attempt+1} failed: {e}")
            time.sleep(2 * (attempt + 1))
    return [{} for _ in item_names]

def build_taxonomy_for_product(product, gpt_flags=None):
    """
    Build the taxonomy JSON for a product.
    Skip update if taxonomy already includes NutritionalPreferences.
    Remove invalid or unknown brands.
    """
    existing_taxonomy = product.get("taxonomy_json")
    if existing_taxonomy:
        try:
            parsed = json.loads(existing_taxonomy)
            if parsed.get("NutritionalPreferences"):
                return None  # Skip if already enriched
        except json.JSONDecodeError:
            pass  # If existing taxonomy is broken, we still attempt to fix it

    brand = (product.get("brand") or "").strip()
    if not brand or brand.lower() in EXCLUDED_BRANDS:
        brand = None

    taxonomy = {
        "Category": {
            "main": product.get("category"),
            "sub": product.get("subcategory")
        },
        "Brand": brand,
        "NutritionalPreferences": gpt_flags or None
    }

    # Remove empty or None entries
    taxonomy = {k: v for k, v in taxonomy.items() if v is not None and v != {}}
    return taxonomy

def save_taxonomies_batch(batch_data):
    """Update taxonomy_json field for a batch of products in the database."""
    conn = get_db_connection()
    if not conn:
        return
    cursor = conn.cursor()
    cursor.executemany("""
        UPDATE products
        SET taxonomy_json = %s
        WHERE item_code = %s
    """, batch_data)
    conn.commit()
    cursor.close()
    conn.close()

def update_taxonomies(batch_size=50, delay_between_batches=1):
    """Main function to fetch, process, and update taxonomy for products."""
    print("Fetching products...")
    products = fetch_products()
    print(f"Fetched {len(products)} products.")

    # Filter only those without NutritionalPreferences
    candidates = [p for p in products if not p.get("taxonomy_json")]

    print(f"Processing {len(candidates)} products without taxonomies.")

    for i in range(0, len(candidates), batch_size):
        batch = candidates[i:i+batch_size]
        names = [p["item_name"] for p in batch]
        gpt_flag_list = gpt_enrich_nutritional_flags_batch(names)

        batch_to_save = []
        for p, gpt_flags in zip(batch, gpt_flag_list):
            taxonomy = build_taxonomy_for_product(p, gpt_flags)
            if taxonomy:
                taxonomy_json = json.dumps(taxonomy, ensure_ascii=False)
                batch_to_save.append((taxonomy_json, p["product_id"]))

        if batch_to_save:
            save_taxonomies_batch(batch_to_save)
            print(f" Updated {len(batch_to_save)} taxonomies.")
        
        time.sleep(delay_between_batches)



