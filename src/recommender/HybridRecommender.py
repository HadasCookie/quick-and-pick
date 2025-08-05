import json
from collections import Counter
from src.DBConnector import get_db_connection

# --- Step 1: Fetch user budget ---
def fetch_user_budget(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT budget_amount FROM users WHERE id = %s", (user_id,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    return result["budget_amount"] if result else 0


# --- Step 2: Fetch user purchased item counts ---
def get_user_purchase_counts(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT products FROM user_lists WHERE user_id = %s", (user_id,))
    
    item_counts = Counter()
    for row in cursor.fetchall():
        product_json = row[0]
        try:
            products = json.loads(product_json)
            for item_code, details in products.items():
                quantity = details.get("quantity", 1)
                item_counts[item_code] += quantity
        except (json.JSONDecodeError, TypeError):
            continue

    cursor.close()
    conn.close()
    return item_counts


# --- Step 3: Get cluster peer users ---
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

# --- Step 4: Taxonomy mapping for products ---
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

# --- Step 5: Fetch prices ---
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

# --- Step 6: Similarity between taxonomies ---
def taxonomy_similarity(tax1, tax2):
    set1 = set(tax1.get("NutritionalPreferences", {}).keys())
    set2 = set(tax2.get("NutritionalPreferences", {}).keys())
    if not set1 or not set2:
        return 0.0
    return len(set1 & set2) / len(set1 | set2)

# --- Step 7: Main recommendation function ---
def generate_recommendations(user_id, max_items=10):
    budget = fetch_user_budget(user_id)
    user_purchases = get_user_purchase_counts(user_id)
    cluster_users = get_cluster_user_ids(user_id)

    # --- Items from cluster peers ---
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

    # --- Taxonomies and prices ---
    taxonomies = get_product_taxonomies()
    prices = get_product_prices()

    # --- Taxonomies of user's purchased items ---
    purchased_taxonomies = [taxonomies[i] for i in user_purchases if i in taxonomies]

    # --- Score computation ---
    scores = []
    for item_code, tax in taxonomies.items():
        if item_code not in prices:
            continue

        # Content-based similarity
        sim_score = max([taxonomy_similarity(tax, p_tax) for p_tax in purchased_taxonomies], default=0)

        # Collaborative score (popularity in cluster)
        cluster_popularity = cluster_items[item_code] / max(len(cluster_users), 1)

        # Self popularity (how much the user purchased it)
        self_popularity = user_purchases.get(item_code, 0)

        # Normalize self_popularity to [0, 1]
        normalized_self_pop = self_popularity / max(user_purchases.values(), default=1)

        # Final combined score
        score = 0.5 * sim_score + 0.3 * cluster_popularity + 0.2 * normalized_self_pop
        scores.append((item_code, prices[item_code], score))

    # --- Select top-scoring products within budget ---
    scores.sort(key=lambda x: x[2], reverse=True)
    recommendations = []
    total = 0
    for item_code, price, _ in scores:
        if total + price <= budget:
            recommendations.append(item_code)
            total += price
        if len(recommendations) >= max_items:
            break

    return recommendations


