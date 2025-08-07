import json
from datetime import datetime
from src.DBConnector import get_db_connection
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from collections import Counter
import pandas as pd
from scipy.stats import zscore
from sklearn.metrics.pairwise import cosine_similarity



NUTRITION_KEYS = ["is_vegan", "is_vegetarian", "is_gluten_free", "is_kosher", "is_high_protein"]

def calculate_age(birth_date):
    if not birth_date:
        return None
    return int((datetime.now().date() - birth_date).days / 365.25)

def parse_preferences(pref_str):
    try:
        prefs = json.loads(pref_str or '{}')
        return {key: prefs.get(key, False) for key in NUTRITION_KEYS}
    except Exception:
        return {key: False for key in NUTRITION_KEYS}

def fetch_user_lists():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT user_id, products FROM user_lists")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    records = []
    for row in rows:
        try:
            # Parse the products JSON string into a Python dictionary
            products_dict = json.loads(row["products"] or "{}")

            # Ensure the keys are valid barcodes (all digits as strings)
            # This filters out old lists where keys were product names
            if all(isinstance(k, str) and k.isdigit() for k in products_dict.keys()):
                for item_code in products_dict:
                    records.append({
                        "user_id": row["user_id"],
                        "item_code": item_code
                    })
            else:
                # Skip old-format lists (with product names instead of barcodes)
                continue
        except Exception:
            # Skip malformed or non-JSON data
            continue
    return records

def fetch_product_taxonomies():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT item_code, taxonomy_json FROM products WHERE taxonomy_json IS NOT NULL")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    tax_map = {}
    for row in rows:
        try:
            tax = json.loads(row["taxonomy_json"])
            
            prefs = tax.get("NutritionalPreferences", {})
            pref_keys = list(prefs.keys()) if isinstance(prefs, dict) else []

            tax_map[row["item_code"]] = pref_keys
        except Exception:
            # Skip malformed JSON or unexpected structures
            continue
    return tax_map

def build_user_vectors(users, user_lists, product_taxonomies):
    list_df = pd.DataFrame(user_lists)
    all_users = []

    for user in users:
        user_id = user["user_id"]
        user_vector = {
            "user_id": user_id,
            "age": user["age"] if user["age"] is not None else 0,
            "gender": user["gender"]
        }

        # user profile preferences
        for key in NUTRITION_KEYS:
            user_vector[key] = int(user.get(key, False))

        # from product taxonomy
        user_items = list_df[list_df.user_id == user_id].item_code.dropna().values
        counter = Counter()
        for item in user_items:
            counter.update(product_taxonomies.get(item, []))

        for key in NUTRITION_KEYS:
            user_vector[f"purchased_{key}"] = counter.get(key, 0)

        all_users.append(user_vector)

    return pd.DataFrame(all_users)

def cluster_users(user_df, max_k=10):
    features = user_df.drop(columns=["user_id"])
    scaler = StandardScaler()
    X = scaler.fit_transform(features)

    best_k = 2
    best_score = -1
    best_model = None

    max_k = min(max_k, len(X))

    for k in range(3, max_k+1):
        model = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = model.fit_predict(X)
        score = silhouette_score(X, labels)
        if score > best_score:
            best_score = score
            best_k = k
            best_model = model

    print(f"Best K: {best_k} with silhouette score: {best_score:.4f}")
    user_df["cluster_id"] = best_model.predict(X)
    return user_df[["user_id", "cluster_id"]]

def fetch_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, birth_date, gender, dietary_preferences FROM users")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    users = []
    for row in rows:
        user = {
            "user_id": row["id"],
            "age": calculate_age(row["birth_date"]),
            "gender": 1 if row["gender"] == "male" else 0
        }
        user.update(parse_preferences(row.get("dietary_preferences")))
        users.append(user)
    return users

def update_user_clusters(clustered_df):
    conn = get_db_connection()
    cursor = conn.cursor()
    for _, row in clustered_df.iterrows():
        cluster_id = int(row["cluster_id"])  
        user_id = int(row["user_id"])        
        print(f"Updating user {user_id} to cluster {cluster_id}")
        cursor.execute("""
            UPDATE users
            SET user_cluster = %s
            WHERE id = %s
        """, (cluster_id, user_id))
    conn.commit()
    cursor.close()
    conn.close()


def remove_outliers(df, threshold=3, max_outlier_ratio=0.2):
    features = df.drop(columns=["user_id"])
    z_scores = abs(zscore(features))
    outlier_counts = (z_scores > threshold).sum(axis=1)
    allowed_outliers = int(max_outlier_ratio * features.shape[1])
    non_outliers = outlier_counts <= allowed_outliers
    return df[non_outliers]


def assign_cluster_for_new_user(user_id):
    print(f"Assigning cluster for new user {user_id}...")
    user_id = int(user_id)
    
    # Fetch users and lists
    users = fetch_users()
    user_lists = fetch_user_lists()
    taxonomies = fetch_product_taxonomies()

    # Build full user DataFrame
    user_df = build_user_vectors(users, user_lists, taxonomies)

    # Split into existing + new
    existing_users = user_df[user_df["user_id"] != user_id]
    new_user = user_df[user_df["user_id"] == user_id]

    if new_user.empty:
        print(f"User {user_id} not found or missing data.")
        return

    # Get user clusters for existing users
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, user_cluster FROM users WHERE user_cluster IS NOT NULL")
    cluster_map = {row["id"]: row["user_cluster"] for row in cursor.fetchall()}
    cursor.close()
    conn.close()

    existing_users = existing_users[existing_users["user_id"].isin(cluster_map.keys())]
    existing_users["cluster_id"] = existing_users["user_id"].map(cluster_map)

    if existing_users.empty:
        print("No existing clustered users to compare against.")
        return

    # Prepare vectors
    features = [col for col in user_df.columns if col not in ["user_id"]]
    existing_features = existing_users[features].values
    new_features = new_user[features].values

    sim_matrix = cosine_similarity(new_features, existing_features)
    most_similar_index = sim_matrix[0].argmax()
    chosen_cluster = int(existing_users.iloc[most_similar_index]["cluster_id"])

    # Save to DB
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users SET user_cluster = %s WHERE id = %s
    """, (chosen_cluster, user_id))
    conn.commit()
    cursor.close()
    conn.close()

    print(f"User {user_id} assigned to cluster {chosen_cluster}")

def user_has_cluster(user_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_cluster FROM users WHERE id = %s", (user_id,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()

    return result is not None and result[0] is not None



def assign_outlier_clusters(original_df, clustered_df):
    features = [col for col in original_df.columns if col not in ["user_id", "cluster_id"]]

    clustered = original_df[original_df.user_id.isin(clustered_df.user_id)]
    outliers = original_df[~original_df.user_id.isin(clustered_df.user_id)]

    if clustered.empty or outliers.empty:
        return clustered_df

    clustered_features = clustered[features].values
    outlier_features = outliers[features].values

    clustered_user_ids = clustered["user_id"].values
    clustered_labels = clustered_df.set_index("user_id").loc[clustered_user_ids]["cluster_id"].values

    sim_matrix = cosine_similarity(outlier_features, clustered_features)

    assigned = []
    for i, user_id in enumerate(outliers["user_id"]):
        most_similar_index = sim_matrix[i].argmax()
        cluster = clustered_labels[most_similar_index]
        assigned.append({"user_id": int(user_id), "cluster_id": int(cluster)})

    print(f"Assigned {len(assigned)} outlier users to nearest clusters")
    return pd.concat([clustered_df, pd.DataFrame(assigned)], ignore_index=True)


def cluster_all_users():
    print("Fetching users and products...")
    users = fetch_users()
    user_lists = fetch_user_lists()
    taxonomies = fetch_product_taxonomies()

    print("Building vectors...")
    user_df = build_user_vectors(users, user_lists, taxonomies)

    print(f"Original user count: {len(user_df)}")

    original_user_df = user_df.copy()

    user_df = remove_outliers(user_df, threshold=3)
    print(f"After removing outliers: {len(user_df)} users remaining")

    print("Clustering...")
    clustered_df = cluster_users(user_df)

    print("Assigning outlier users to nearest clusters...")
    clustered_df = assign_outlier_clusters(original_user_df, clustered_df)

    print("Saving to DB...")
    update_user_clusters(clustered_df)

    print("Done.")



