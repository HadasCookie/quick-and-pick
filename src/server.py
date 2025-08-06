import re
import bcrypt
from flask import Flask, json, request, jsonify
from flask_cors import CORS
from transformers import pipeline
import pymysql
import requests
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import mysql.connector
from twilio.rest import Client
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from apscheduler.schedulers.background import BackgroundScheduler
from src.cloud.ContinuousSuperMarketDownloader import download_all_branches
from src.cloud.SuperMarketUploader import SupermarketUploader
from src.cloud.InitialSuperMarketDownloader import download_initial_supermarket_data
from src.recommender.TaxonomyUpdater import update_taxonomies
from src.recommender.UserModel import cluster_all_users,assign_cluster_for_new_user, user_has_cluster
from src.recommender.HybridRecommender import generate_recommendations
import pytz
from dotenv import load_dotenv
load_dotenv()  # this loads variables from .env into os.environ
from src.nlp.recipe_api import match_api

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Allow requests from React frontend

# Database Configuration
DB_HOST = "34.78.145.126"
DB_USER = "root"
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_NAME = "quickpick"

SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))  # Default to 587 if not set

# API Endpoints
FOODS_DICTIONARY_URL = "https://www.foodsdictionary.co.il/services/c/getSuggestions.php"
CHP_AUTOCOMPLETE_URL = "https://chp.co.il/autocompletion/product_extended"


TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")  # e.g. ACxxxx
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")    # actual token
TWILIO_PHONE_NUMBER = "whatsapp:+14155238886"         # always this in sandbox


# Send list to WhatsApp
@app.route("/api/send-list-sms", methods=["POST"])
def send_list_sms():
    try:
        data = request.json
        print("Received Data:", data)
        raw_phone = data.get("phone", "").strip()

        # Remove all characters that are not digits
        raw_phone = re.sub(r"\D", "", raw_phone)  # Keeps only digits (0-9)

        products = data.get("products", {})
        list_name = data.get("list_name", "רשימת קניות")

        if not raw_phone or not products:
            return jsonify({"error": "Missing phone or products"}), 400

        if raw_phone.startswith("0"):
            raw_phone = raw_phone[1:]
        phone_number = f"whatsapp:+972{raw_phone}"
        print("Formatted phone:", phone_number)

        # Format the message
        product_lines = [
            f"{info['quantity']} -   {info['name']}"
            for code, info in products.items()
        ]
        message_body = f"📋 {list_name}:\n" + "\n".join(product_lines)

        # Send message via Twilio
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=message_body,
            from_=TWILIO_PHONE_NUMBER,
            to=phone_number,
        )

        return jsonify({"message": "WhatsApp message sent!", "sid": message.sid}), 200

    except Exception as e:
        print("❌ SMS error:", e)
        return jsonify({"error": f"Failed to send SMS: {str(e)}"}), 500


# Fetch suggestions from FoodsDictionary
def fetch_suggestions_fd(search_term, page=1):
    """Fetch product suggestions from FoodsDictionary."""
    params = {
        "q": search_term,
        "t": 1,
        "v": 1,
        "f": "",
        "page": page
    }

    try:
        response = requests.get(FOODS_DICTIONARY_URL, params=params)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}

# Fetch suggestions from CHP Autocomplete API
def fetch_suggestions_chp(search_term):
    """Fetch product suggestions from CHP autocomplete API."""
    params = {
        "term": search_term,
        "from": 0,  
        "u": "0.34048016531342373",
        "shopping_address": "",
        "shopping_address_city_id": 0,
        "shopping_address_street_id": 0
    }
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",  
        "Referer": "https://chp.co.il/",
        "Accept": "application/json",
    }

    try:
        response = requests.get(CHP_AUTOCOMPLETE_URL, params=params, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}

# API Route: Get suggestions from selected source
@app.route("/api/suggestions", methods=["GET"])
def get_suggestions():
    """API endpoint for fetching product suggestions."""
    search_term = request.args.get("q", "").strip()
    page = request.args.get("page", 1, type=int)
    source = request.args.get("source", "fd") 

    if not search_term:
        return jsonify({"error": "Missing search term"}), 400

    # ✅ Select source (CHP or FoodsDictionary)
    if source == "chp":
        suggestions = fetch_suggestions_chp(search_term)
        if isinstance(suggestions, list):
            print("hi")
            suggestions = suggestions[:-1]
    elif source == "fd":
        suggestions = fetch_suggestions_fd(search_term, page)
    else:
        return jsonify({"error": "Invalid source"}), 400

    return jsonify(suggestions)

### Finding The Best Supermarket
def get_products_in_supermarket(cursor, store_id):
    cursor.execute("SELECT item_code, item_price FROM store_prices WHERE store_id = %s", (store_id,))
    return {row[0]: row[1] for row in cursor.fetchall()}

def calculate_match_ratio(user_products, store_products):
    user_item_codes = set(user_products.keys())
    available_item_codes = set(store_products.keys())
    matched = user_item_codes & available_item_codes
    return len(matched) / len(user_item_codes) if user_item_codes else 0

def calculate_total_cost(user_products, store_products):
    total = 0
    for code, details in user_products.items():
        quantity = details.get("quantity", 1)
        price = store_products.get(code)
        if price is not None:
            total += quantity * price
    return round(total, 2)

# We'll improve this later, but for now
def check_if_open_now(store):
    # Assuming store['opening_hours'] contains hours like "08:00-22:00"
    from datetime import datetime
    try:
        now = datetime.now().time()
        open_str, close_str = store.get("opening_hours", "00:00-23:59").split("-")
        open_time = datetime.strptime(open_str, "%H:%M").time()
        close_time = datetime.strptime(close_str, "%H:%M").time()
        return open_time <= now <= close_time
    except:
        return False  # fallback if format is unexpected

# Find Nearby Stores Within Radius
@app.route("/api/find-nearby-stores/<int:list_id>", methods=["GET"])
def find_nearby_stores(list_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT latitude, longitude, supermarket_radius FROM user_lists WHERE id = %s", (list_id,))
    row = cursor.fetchone()

    if not row:
        return jsonify({"error": "List not found"}), 404

    user_lat, user_lng, radius = row

    cursor.execute("""
        SELECT *, 
          (6371 * acos(
            cos(radians(%s)) *
            cos(radians(latitude)) *
            cos(radians(longitude) - radians(%s)) +
            sin(radians(%s)) * sin(radians(latitude))
          )) AS distance
        FROM stores
        HAVING distance <= %s
        ORDER BY distance ASC
    """, (user_lat, user_lng, user_lat, radius))

    stores = cursor.fetchall()
    columns = [col[0] for col in cursor.description]
    result = [dict(zip(columns, s)) for s in stores]


    cursor.close()
    conn.close()

    return jsonify(result)

# For each matching store, check product availability and cost
@app.route("/api/evaluate-supermarkets/<int:list_id>", methods=["POST"])
def evaluate_supermarkets(list_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM user_lists WHERE id = %s", (list_id,))
    user_list = cursor.fetchone()
    if not user_list:
        return jsonify({"error": "List not found"}), 404

    try:
        products = json.loads(user_list["products"])  # {item_code: {quantity, ...}}
    except Exception as e:
        print("❌ Failed to parse products:", e)
        return jsonify({"error": "Invalid product format"}), 400

    nearby_store_ids = request.json.get("store_ids", [])
    if not nearby_store_ids:
        return jsonify({"error": "No store IDs provided"}), 400

    results = []
    item_codes = list(products.keys())

    # Get all product metadata once (outside the loop)
    code_to_info = {}
    if item_codes:
        placeholders = ", ".join(["%s"] * len(item_codes))
        cursor.execute(
            f"SELECT item_code, item_name, unit_qty FROM products WHERE item_code IN ({placeholders})",
            item_codes,
        )
        code_to_info = {row["item_code"]: row for row in cursor.fetchall()}

    for store_id in nearby_store_ids:
        if not item_codes:
            continue

        placeholders = ", ".join(["%s"] * len(item_codes))
        query = f"""
            SELECT s.item_code, s.item_price
            FROM store_prices s
            WHERE s.store_id = %s AND s.item_code IN ({placeholders})
        """
        cursor.execute(query, [store_id] + item_codes)
        available = cursor.fetchall()

        if not available:
            continue

        available_codes = {item["item_code"] for item in available}
        match_ratio = len(available_codes) / len(products)
        store_prices = {item["item_code"]: item["item_price"] for item in available}

        try:
            total_cost = sum(
                float(store_prices[code]) * products[code].get("quantity", 1)
                for code in products if code in store_prices
            )
        except Exception as e:
            print(f"❌ Failed to calculate total cost for store {store_id}: {e}")
            continue

        # Build product breakdown
        store_products = []
        for code, user_prod in products.items():
            prod_meta = code_to_info.get(code, {})
            store_products.append({
                "item_code": code,
                "name": prod_meta.get("item_name", code),
                "unit": prod_meta.get("unit_qty", ""),
                "quantity": user_prod.get("quantity", 1),
                "price": float(store_prices[code]) if code in store_prices else None,
                "missing": code not in store_prices
            })
        print(store_products)
        results.append({
            "store_id": store_id,
            "match_ratio": round(match_ratio, 2),
            "total_cost": round(total_cost, 2),
            "products": store_products  # This is what the frontend will render
        })

    print(results)
    cursor.close()
    conn.close()

    return jsonify(results)

def get_best_list_price(list_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Get the user's list and its products
    cursor.execute("SELECT * FROM user_lists WHERE id = %s", (list_id,))
    user_list = cursor.fetchone()
    if not user_list:
        cursor.close()
        conn.close()
        return None, None  # No such list

    try:
        products = json.loads(user_list["products"])
    except Exception:
        cursor.close()
        conn.close()
        return None, None

    # Find all nearby stores within the radius
    lat, lng, radius = user_list["latitude"], user_list["longitude"], user_list["supermarket_radius"]
    cursor.execute("""
        SELECT id FROM stores WHERE 
            (6371 * acos(
                cos(radians(%s)) *
                cos(radians(latitude)) *
                cos(radians(longitude) - radians(%s)) +
                sin(radians(%s)) * sin(radians(latitude))
            )) <= %s
    """, (lat, lng, lat, radius))
    store_rows = cursor.fetchall()
    store_ids = [r["id"] for r in store_rows]

    # If no stores found, can't calculate
    if not store_ids:
        cursor.close()
        conn.close()
        return None, None

    # Evaluate all stores to get the lowest price with max match ratio
    best_price = None
    best_store = None
    for store_id in store_ids:
        # Get product prices for this store
        placeholders = ", ".join(["%s"] * len(products))
        codes = list(products.keys())
        query = f"""
            SELECT item_code, item_price FROM store_prices
            WHERE store_id = %s AND item_code IN ({placeholders})
        """
        cursor.execute(query, [store_id] + codes)
        items = cursor.fetchall()
        store_prices = {i["item_code"]: float(i["item_price"]) for i in items}
        match_ratio = len(store_prices) / len(products)
        if match_ratio < 0.7:  # Optional: Only alert for decent matches, adjust as needed
            continue
        total = sum(
            store_prices.get(code, 0) * products[code].get("quantity", 1)
            for code in codes if code in store_prices
        )
        if best_price is None or total < best_price:
            best_price = total
            best_store = store_id
    cursor.close()
    conn.close()
    return best_price, best_store


### DB Logic
# Establish Database Connection
def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            autocommit=True
        )
        return conn
    except mysql.connector.Error as err:
        print(f"Database connection error: {err}")
        return None

# Helper function for getting user data
def get_full_user_data(user_id, cursor):
    cursor.execute("""
        SELECT id, first_name, email, phone, dietary_preferences, supermarket_attributes,
               supermarket_radius, disabled_permit, created_at, budget, budget_amount 
        FROM users 
        WHERE id = %s
    """, (user_id,))

    user = cursor.fetchone()

    if not user:
        return None
    return {
        "id": user["id"],
        "first_name": user["first_name"],
        "email": user["email"],
        "phone": user["phone"],
        "preferences": user["dietary_preferences"],
        "supermarket_attributes": user["supermarket_attributes"],
        "supermarket_radius": user["supermarket_radius"],
        "disabled_permit": user["disabled_permit"],
        "created_at": user["created_at"].isoformat(),
        "budget": user["budget"],
        "budget_amount": user["budget_amount"]
    }

# Register a new User
@app.route("/api/register", methods=["POST"])
def register_user():
    try:
        data = request.json
        print("Received Data:", data)
        # Extract user data from request
        first_name = data.get("first_name")
        last_name = data.get("last_name")
        email = data.get("email")
        password = data.get("password")
        phone = data.get("phone")
        birth_date = data.get("birthDate")
        gender = data.get("gender")
        city = data.get("city")
        disabled_permit = data.get("disabledPermit", False)

        dietary_preferences = json.dumps(data.get("preferences", {}))
        supermarket_attributes = json.dumps(data.get("supermarket_attributes", {}))

        budget = data.get("budget")
        budget_amount = float(data.get("budgetAmount") or 0)
        supermarket_radius = int(data.get("supermarket_radius") or 5)
        newsletter = data.get("newsletter", False)
        marketing_updates = data.get("marketingUpdates", False)

        if not first_name or not last_name or not email or not password:
            return jsonify({"error": "Missing required fields"}), 400

        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = """INSERT INTO users 
            (first_name, last_name, email, password_hash, phone, birth_date, gender,
             city, disabled_permit, dietary_preferences, supermarket_attributes,
             budget, budget_amount, supermarket_radius,
             newsletter, marketing_updates, subscription_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Active')"""
        
        values = (
            first_name, last_name, email, hashed_password, phone, birth_date, gender, city,
            disabled_permit, dietary_preferences, supermarket_attributes,
            budget, budget_amount, supermarket_radius,
            newsletter, marketing_updates
        )

        cursor.execute(sql, values)
        conn.commit()

        new_user_id = cursor.lastrowid
        full_user = get_full_user_data(new_user_id, cursor)

        return jsonify({
            "message": "User registered successfully!",
            "user": full_user
        }), 201    

    except mysql.connector.Error as e:
        print("❌ Database Error:", e)
        if e.errno == 1062:  # Duplicate entry error
            return jsonify({"error": "האימייל כבר קיים במערכת"}), 409
        return jsonify({"error": "שגיאת מסד נתונים"}), 500

    except Exception as e:
        print("❌ Unexpected Error:", e)
        return jsonify({"error": "שגיאה פנימית בשרת"}), 500

    finally:
        try:
            if 'conn' in locals() and conn.is_connected():
                cursor.close()
                conn.close()
        except:
            pass

# Log In
@app.route("/api/login", methods=["POST"])
def login_user():
    """API endpoint for user login."""
    try:
        data = request.json
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Missing email or password"}), 400

        # Connect to the database
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Fetch user by email
        cursor.execute("""
            SELECT id, email, password_hash, subscription_status 
            FROM users 
            WHERE email = %s
        """, (email,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "משתמש לא נמצא ❔"}), 404

        # Check if the user is inactive
        if user["subscription_status"] != "Active":
            return jsonify({"error": "החשבון שלך אינו פעיל 🚫"}), 403

        # Verify password
        if not bcrypt.checkpw(password.encode('utf-8'), user["password_hash"].encode('utf-8')):
            return jsonify({"error": "סיסמא לא נכונה ❌"}), 401

        # Fetch and return full user details
        full_user = get_full_user_data(user["id"], cursor)

        return jsonify({
            "message": "User registered successfully!",
            "user": full_user
        }), 201

    except Exception as e:
        print("❌ Unexpected Error:", e)
        return jsonify({"error": "Internal server error"}), 500

    finally:
        if conn and cursor:
            cursor.close()
            conn.close()

# change password
@app.route("/api/change-password", methods=["POST"])
def change_password():
    data = request.get_json()
    email = data.get("email")
    current_password = data.get("currentPassword")
    new_password = data.get("newPassword")

    if not email or not current_password or not new_password:
        return jsonify({"error": "Missing required fields"}), 400

    # Connect to DB
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()

    if not user:
        return jsonify({"error": "User not found"}), 404
    
    if not bcrypt.checkpw(current_password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        return jsonify({"error": "Incorrect current password"}), 401

    new_hashed = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    cursor.execute("UPDATE users SET password_hash = %s WHERE email = %s", (new_hashed, email))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Password updated successfully"}), 200

# Save new User List
@app.route("/api/save-list", methods=["POST"])
def save_list():
    try:
        data = request.get_json()
        
        # Extract latitude and longitude
        latitude = data.get("latitude")
        longitude = data.get("longitude")
        is_open_now = data.get("is_open_now", False)


        required = ["user_id", "list_name", "address", "supermarket_radius", "preferences", "products"]
        for field in required:
            if field not in data:
                return jsonify({"error": f"Missing field: {field}"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
        INSERT INTO user_lists (
        user_id, list_name, address, latitude, longitude,
        supermarket_radius, supermarket_attributes,
        dietary_preferences, products, total_price, is_favorite, is_open_now
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        cursor.execute(query, (
            data["user_id"],
            data["list_name"],
            data["address"],
            latitude,
            longitude,
            data["supermarket_radius"],
            json.dumps(data.get("supermarket_attributes", {})),
            json.dumps(data.get("preferences", {})),
            json.dumps(data["products"]),
            data.get("total_price"),
            data.get("is_favorite", 0),  # Default to False if not provided
            is_open_now,
        ))
        conn.commit()
        print(data)
        new_id = cursor.lastrowid

        # ✅ Fetch the saved list with created_at
        cursor.execute("SELECT * FROM user_lists WHERE id = %s", (new_id,))
        saved_list = cursor.fetchone()
        columns = [col[0] for col in cursor.description]
        saved_list_dict = dict(zip(columns, saved_list))

        # Normalize created_at to ISO string (if not None)
        created_at = saved_list_dict.get("created_at")
        if created_at and isinstance(created_at, datetime):
            saved_list_dict["created_at"] = created_at.isoformat()
        elif created_at and isinstance(created_at, str):
            # If it's a string, parse and reformat
            try:
                dt = datetime.strptime(created_at, "%Y-%m-%d %H:%M:%S")
                saved_list_dict["created_at"] = dt.isoformat()
            except Exception:
                pass  # fallback: leave as is

        cursor.close()
        conn.close()

        return jsonify(saved_list_dict), 200

    except Exception as e:
        print("🔥 Error while saving list:", e)
        return jsonify({"error": "Failed to save list"}), 500

# Get user lists
@app.route("/api/user-lists", methods=["GET"])
def get_user_lists():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "Missing user_id parameter"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT * FROM user_lists WHERE user_id = %s ORDER BY created_at DESC",
        (user_id,)
    )
    lists = cursor.fetchall()

    # Convert fields for frontend
    for l in lists:
        l["created_at"] = l["created_at"].isoformat()
        if "total_price" in l and l["total_price"] is not None:
            l["total_price"] = float(l["total_price"])

    print(lists)
    cursor.close()
    conn.close()
    return jsonify(lists)

# Get user last list
@app.route("/api/user-last-list", methods=["GET"])
def get_user_last_list():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "Missing user_id parameter"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT * FROM user_lists WHERE user_id = %s ORDER BY created_at DESC LIMIT 1",
        (user_id,)
    )
    last_list = cursor.fetchone()

    if not last_list:
        return jsonify({"message": "No lists found for this user"}), 404

    # Convert fields for frontend
    last_list["created_at"] = last_list["created_at"].isoformat()
    if "total_price" in last_list and last_list["total_price"] is not None:
        last_list["total_price"] = float(last_list["total_price"])

    cursor.close()
    conn.close()
    return jsonify(last_list)

# Update List Name
@app.route("/api/update-list-name", methods=["POST"])
def update_list_name():
    data = request.get_json()
    list_id = data.get("list_id")
    new_name = data.get("list_name")

    if not list_id or not new_name:
        return jsonify({"error": "Missing list ID or new name"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Update both list name and is_favorite
        cursor.execute(
            "UPDATE user_lists SET list_name = %s, is_favorite = 1 WHERE id = %s",
            (new_name, list_id)
        )
        conn.commit()
        return jsonify({"message": "List name and favorite status updated successfully"}), 200
    except Exception as e:
        print("Error updating list name:", e)
        return jsonify({"error": "Failed to update list name"}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/update-list-price", methods=["POST"])
def update_list_price():
    data = request.get_json()
    list_id = data.get("list_id")
    total_price = data.get("total_price")

    if not list_id or total_price is None:
        return jsonify({"error": "Missing list ID or price"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE user_lists SET total_price = %s WHERE id = %s",
            (total_price, list_id)
        )
        conn.commit()
        return jsonify({"message": "List price updated successfully"}), 200
    except Exception as e:
        print("Error updating list price:", e)
        return jsonify({"error": "Failed to update list price"}), 500
    finally:
        cursor.close()
        conn.close()

# Update Favorite List
@app.route("/api/update-list-favorite", methods=["POST"])
def update_list_favorite():
    data = request.get_json()
    list_id = data.get("list_id")
    is_favorite = data.get("is_favorite")

    if list_id is None or is_favorite is None:
        return jsonify({"error": "Missing list ID or favorite status"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE user_lists SET is_favorite = %s WHERE id = %s",
            (is_favorite, list_id)
        )
        conn.commit()
        return jsonify({"message": "Favorite status updated successfully"}), 200
    except Exception as e:
        print("Error updating favorite status:", e)
        return jsonify({"error": "Failed to update favorite status"}), 500
    finally:
        cursor.close()
        conn.close()

# Update users preferences
@app.route("/api/update-preferences", methods=["POST"])
def update_preferences():
    data = request.get_json()
    email = data.get("email")

    if not email:
        return jsonify({"error": "Missing email"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE users
            SET dietary_preferences = %s,
                supermarket_attributes = %s,
                budget = %s,
                budget_amount = %s,
                supermarket_radius = %s,
                disabled_permit = %s
            WHERE email = %s
        """, (
            json.dumps(data.get("preferences", {})),
            json.dumps(data.get("supermarket_attributes", {})),
            data.get("budget", "weekly"),
            float(data.get("budgetAmount", 0)),
            int(data.get("supermarketRadius", 5)),
            bool(data.get("disabledPermit", False)),
            email
        ))

        conn.commit()
        return jsonify({"message": "Preferences updated successfully"}), 200

    except Exception as e:
        print("Error updating preferences:", e)
        return jsonify({"error": "Failed to update preferences"}), 500

    finally:
        cursor.close()
        conn.close()
       
# Close user account
@app.route("/api/close-account", methods=["POST"])
def close_account():
    data = request.get_json()
    email = data.get("email")

    if not email:
        return jsonify({"error": "Missing email"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Set subscription_status to 'Inactive' for this user
        cursor.execute(
            "UPDATE users SET subscription_status = 'Inactive' WHERE email = %s",
            (email,)
        )

        conn.commit()
        return jsonify({"message": "Account closed successfully"}), 200

    except Exception as e:
        print("Error closing account:", e)
        return jsonify({"error": "Failed to close account"}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Get all products
@app.route("/api/products", methods=["GET"])
def get_products():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM products")
    products = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(products)

# Get All Users (For Testing)
@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        conn = get_db_connection()
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT id, full_name, email, subscription_status, created_at FROM users")
            users = cursor.fetchall()
        conn.close()
        return jsonify(users)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Price Drop Alerts
# Create a new price drop alert
@app.route('/api/user-alerts')
def get_user_alerts():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify([])  # Return empty if no user

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    # Join user_lists to get list name, date, etc.
    cursor.execute('''
        SELECT a.id, a.list_id, a.created_at, a.threshold_percent, l.list_name
        FROM price_drop_alerts a
        LEFT JOIN user_lists l ON a.list_id = l.id
        WHERE a.user_id = %s
        ORDER BY a.created_at DESC
    ''', (user_id,))
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(results)

# Delete a price drop alert
@app.route('/api/delete-alert/<int:alert_id>', methods=['DELETE'])
def delete_alert(alert_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM price_drop_alerts WHERE id = %s", (alert_id,))
    conn.commit()
    success = cursor.rowcount > 0
    cursor.close()
    conn.close()
    return jsonify({"success": success})

# Update an existing price drop alert
@app.route('/api/update-alert-threshold', methods=['POST'])
def update_alert_threshold():
    data = request.get_json()
    alert_id = data.get("alert_id")
    new_threshold = data.get("threshold_percent")
    if not alert_id or not new_threshold:
        return jsonify({"success": False, "error": "Missing data"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE price_drop_alerts SET threshold_percent = %s WHERE id = %s",
        (new_threshold, alert_id)
    )
    conn.commit()
    success = cursor.rowcount > 0
    cursor.close()
    conn.close()
    return jsonify({"success": success})
	
def send_email(to_email, subject, html_body, text_body=None):
    msg = MIMEMultipart("alternative")
    msg['Subject'] = subject
    msg['From'] = SMTP_USER
    msg['To'] = to_email

    msg.attach(MIMEText(text_body or "יש עדכון מחיר ברשימת הקניות שלך!", "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    print(msg.as_string())

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, [to_email], msg.as_string())
        print("Email sent to", to_email)
    except Exception as e:
        print("Failed to send email:", e)

def get_best_list_offer(list_id):
    """Finds the best supermarket for a user list, including detailed breakdown."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Get the user's list and its products
    cursor.execute("SELECT * FROM user_lists WHERE id = %s", (list_id,))
    user_list = cursor.fetchone()
    if not user_list:
        cursor.close()
        conn.close()
        return None

    try:
        products = json.loads(user_list["products"])
    except Exception:
        cursor.close()
        conn.close()
        return None

    # Find all nearby stores within the radius
    lat, lng, radius = user_list["latitude"], user_list["longitude"], user_list["supermarket_radius"]
    cursor.execute("""
        SELECT * FROM stores WHERE 
            (6371 * acos(
                cos(radians(%s)) *
                cos(radians(latitude)) *
                cos(radians(longitude) - radians(%s)) +
                sin(radians(%s)) * sin(radians(latitude))
            )) <= %s
    """, (lat, lng, lat, radius))
    stores = cursor.fetchall()
    print("Nearby stores found:", len(stores))
    if not stores:
        cursor.close()
        conn.close()
        return None

    best_offer = None
    for store in stores:
        store_id = store["store_id"]
        # Get product prices for this store
        codes = list(products.keys())
        if not codes:
            continue
        placeholders = ", ".join(["%s"] * len(codes))
        query = f"""
            SELECT item_code, item_price FROM store_prices
            WHERE store_id = %s AND item_code IN ({placeholders})
        """
        cursor.execute(query, [store_id] + codes)
        items = cursor.fetchall()
        store_prices = {i["item_code"]: float(i["item_price"]) for i in items}
        match_ratio = len(store_prices) / len(products)
        
        print(f"Store {store_id}: Found {len(store_prices)} out of {len(products)} products, match ratio: {match_ratio:.2f}")
        
        # Lower the minimum match ratio to 0.6 (60%) for price alerts
        if match_ratio < 0.6:
            print(f"Skipping store {store_id} due to low match ratio: {match_ratio:.2f} (need 60%+ for price alerts)")
            continue
            
        total = sum(
            store_prices.get(code, 0) * products[code].get("quantity", 1)
            for code in codes if code in store_prices
        )
        
        print(f"Store {store_id}: Total cost: {total:.2f}")
        
        # Prepare full product details for the email
        product_details = []
        # Fetch product names from DB
        code_to_info = {}
        if codes:
            placeholders = ", ".join(["%s"] * len(codes))
            cursor.execute(
                f"SELECT item_code, item_name FROM products WHERE item_code IN ({placeholders})",
                codes,
            )
            code_to_info = {row["item_code"]: row for row in cursor.fetchall()}
        
        # Build product details
        for code in codes:
            qty = products[code].get("quantity", 1)
            price = store_prices.get(code)
            prod_name = code_to_info.get(code, {}).get("item_name", code)
            product_details.append({
                "name": prod_name,
                "quantity": qty,
                "price": price,
                "total": (price or 0) * qty,
                "missing": price is None
            })
        
        # Save if best offer so far
        if not best_offer or total < best_offer["total_price"]:
            best_offer = {
                "total_price": total,
                "store": store,
                "match_ratio": match_ratio,
                "products": product_details
            }
            print(f"New best offer: Store {store_id} with price {total:.2f} and {match_ratio:.1%} match ratio")
    
    cursor.close()
    conn.close()
    if best_offer:
        print(f"Final best offer: {best_offer['total_price']:.2f} ₪ with {best_offer['match_ratio']:.1%} product match")
    else:
        print("No valid offers found (need 60%+ product match for price alerts)")
    return best_offer

def check_price_drops():
    print("🔔 Running price drop check...", datetime.now())
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT id, user_id, email, list_id, threshold_percent, last_notified_price FROM price_drop_alerts")
    alerts = cursor.fetchall()
    cursor.close()
    conn.close()

    for alert in alerts:
        print("Alert being checked:", alert)

        alert_id = alert["id"]
        email = alert["email"]
        list_id = alert["list_id"]
        threshold = alert["threshold_percent"]
        last_price = alert["last_notified_price"]

        # Get list details for list name
        conn2 = get_db_connection()
        cursor2 = conn2.cursor(dictionary=True)
        cursor2.execute("SELECT list_name FROM user_lists WHERE id = %s", (list_id,))
        list_data = cursor2.fetchone()
        list_name = list_data["list_name"] if list_data else f"רשימה #{list_id}"
        cursor2.close()
        conn2.close()

        # Get the latest best offer!
        offer = get_best_list_offer(list_id)
        print("Best offer found:", offer)

        if not offer:
            print(f"No valid offer found for list {list_id}")
            continue  # No valid supermarket found

        current_price = offer["total_price"]
        store = offer["store"]
        match_ratio = offer["match_ratio"]
        products = offer["products"]

        # If this is the first notification, just set the price and continue
        if last_price is None or last_price == 0:
            print(f"First notification for alert {alert_id}, setting last_notified_price to {current_price}")
            conn2 = get_db_connection()
            cursor2 = conn2.cursor()
            cursor2.execute("UPDATE price_drop_alerts SET last_notified_price = %s WHERE id = %s", (current_price, alert_id))
            conn2.commit()
            cursor2.close()
            conn2.close()
            continue  # Skip sending email on first run

        # Compare to last notified price
        drop_percent = ((last_price - current_price) / last_price) * 100
        print(f"Price drop for alert {alert_id}: last={last_price}, current={current_price}, drop={drop_percent:.2f}%")
        
        if drop_percent >= threshold:
            print(f"Triggering price drop alert! Drop: {drop_percent:.2f}% >= threshold: {threshold}%")
            
            # Get store details
            store_name = store.get("store_name", "")
            store_address = f'{store.get("address", "")}, {store.get("city", "")}'
            coverage = int(match_ratio * 100)

            email_body = f"""
            <html dir="rtl" lang="he">
            <body style="font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif; background: #f6e5fa; color: #1e1028; padding: 50px 0 50px 0; margin: 0;">
                <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 18px; box-shadow: 0 6px 24px #3a1e4d22;">
                <div style="background: #3a1e4d; color: #fff; border-radius: 18px 18px 0 0; padding: 24px 32px 16px 32px; text-align: right;">
                    <h1 style="margin:0; font-size: 2.2em; text-align:center;">Quick&Pick</h1>
                    <h2 style="margin:0; font-size: 1.3em; text-align:center;">🎉 ירידת מחיר ברשימה שלך!</h2>
                </div>
                <div style="padding: 22px 32px; text-align: right;">
                    <div style="background: #e7baf2; padding: 16px; border-radius: 10px; margin-bottom: 20px; text-align: center;">
                        <h3 style="margin: 0; color: #3a1e4d; font-size: 1.4em;">📋 {list_name}</h3>
                    </div>
                    <p style="font-size:1.1em; margin-top:0;">
                    <strong>מחיר הרשימה שלך ירד מ־{last_price:.2f} ל־{current_price:.2f} ₪</strong>
                    <span style="color:#3a1e4d; font-weight:bold;">({drop_percent:.1f}% ירידה!)</span>
                    </p>
                    <p style="margin: 0.5em 0;">
                    <strong>סופרמרקט:</strong> {store_name}<br>
                    <strong>כתובת:</strong> {store_address}<br>
                    <strong>סטטוס כיסוי:</strong> {coverage}% מהמוצרים נמצאו בחנות זו
                    </p>
                    <table style="width:100%; border-collapse:collapse; margin-top:24px; background: #f6e5fa; border-radius: 10px; text-align:right;">
                    <thead>
                        <tr style="background:#e7baf2; color:#1e1028;">
                        <th style="padding:10px;">מוצר</th>
                        <th style="padding:10px;">כמות</th>
                        <th style="padding:10px;">מחיר ליח'</th>
                        <th style="padding:10px;">סה"כ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {''.join(
                            f"<tr>"
                            f"<td style='padding:8px'>{p['name']}</td>"
                            f"<td style='padding:8px'>{p['quantity']}</td>"
                            f"<td style='padding:8px'>{'❌ חסר בחנות' if p['missing'] else format(p['price'], '.2f') + ' ₪'}</td>"
                            f"<td style='padding:8px'>{'' if p['missing'] else format(p['total'], '.2f') + ' ₪'}</td>"
                            f"</tr>"
                            for p in products
                        )}
                    </tbody>
                    </table>
                    <div style="text-align:center; margin:36px 0 0 0;">
                        <a href="https://quickandpick.co.il"
                            style="display:inline-block; padding:10px 32px; background:#3a1e4d; color:#fff; border-radius:8px; text-decoration:none; font-size:1.2em; font-weight:bold;">
                            לעדכון הרשימה באתר
                        </a>
                    </div>
                </div>
                </div>
            </body>
            </html>
            """
            
            # Send the email
            print(f"📧 Sending price drop email to {email} for alert ID {alert_id} and list '{list_name}'")
            send_email(
                email,
                f"עדכון: ירידת מחיר ב'{list_name}'!",
                email_body
            )
            
            # Update last_notified_price
            conn2 = get_db_connection()
            cursor2 = conn2.cursor()
            cursor2.execute("UPDATE price_drop_alerts SET last_notified_price = %s WHERE id = %s", (current_price, alert_id))
            conn2.commit()
            cursor2.close()
            conn2.close()
        else:
            print(f"No price drop alert triggered. Drop: {drop_percent:.2f}% < threshold: {threshold}%")

def start_scheduler():
    scheduler = BackgroundScheduler(timezone=pytz.timezone("Asia/Jerusalem"))
    # Schedule for 7:00 AM and 7:00 PM
    scheduler.add_job(check_price_drops, 'cron', hour=7, minute=0)
    scheduler.add_job(check_price_drops, 'cron', hour=20, minute=23)

    # Initial supermarket data download: once a month (1st) at 03:00 
    scheduler.add_job(lambda: (download_initial_supermarket_data() or print("Finished: Initial supermarket data download")), 'cron', day=1, hour=3, minute=0)
    # Download all branches: every 4 hours 
    scheduler.add_job(lambda: (download_all_branches() or print("Finished: Download all branches")), 'cron', hour='0,4,8,12,16,20', minute=0)
    # Upload Prices: every 4 hours, 1 hour after download 
    scheduler.add_job(lambda: (SupermarketUploader("Prices") or print("Finished: Upload Prices")), 'cron', hour='1,5,9,13,17,21', minute=0)
    # Upload PricesFull: once a month (2nd) at 03:00 
    scheduler.add_job(lambda: (SupermarketUploader("PricesFull") or print("Finished: Upload PricesFull")), 'cron', day='2', hour=3, minute=0)

    # Update taxonomies: every day at 02:00
    scheduler.add_job(lambda: (update_taxonomies() or print("Finished: Update Taxonomies")), 'cron', hour=2, minute=0)
    # Cluster all users: every day at 03:00
    scheduler.add_job(lambda: (cluster_all_users() or print("Finished: cluster_all_users")), 'cron', hour=3, minute=0)

    scheduler.start()
    print("🔔 Price drop scheduler started!")

# API Route: Get item recommendations for a user
@app.route('/api/recommend-items', methods=['GET'])
def recommend_items_api():
    user_id = request.args.get('user_id')
    print("Start generating recommendations for user:", user_id)
    if not user_id:
        return jsonify({'error': 'Missing user_id'}), 400
    
    try:
        # Check if user has at least 3 saved lists
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT COUNT(*) as list_count FROM user_lists WHERE user_id = %s", (user_id,))
        result = cursor.fetchone()
        list_count = result['list_count'] if result else 0
        cursor.close()
        conn.close()
        
        if list_count < 3:
            return jsonify({
                'error': 'insufficient_data',
                'message': 'כדי לקבל המלצות מותאמות אישית, עליך לבצע לפחות 3 חיפושי קניות נוספים',
                'lists_needed': 3 - list_count
            }), 400
        
        if not user_has_cluster(user_id):
            print(f"User {user_id} has no cluster. Assigning one...")
            assign_cluster_for_new_user(user_id)
        
        # Replace with actual logic from HybridRecommender.py
        rec_items = generate_recommendations(user_id)  # should return a list of item_codes or full products
        return jsonify(rec_items)
    except Exception as e:
        print("Recommendation error:", e)
        return jsonify({'error': str(e)}), 500
    

# --- Flask routes below as normal ---
@app.route('/api/subscribe-to-price-drop', methods=['POST'])
def subscribe_to_price_drop():
    data = request.get_json()
    user_id = data.get("user_id")
    email = data.get("email")
    list_id = data.get("list_id")
    threshold = data.get("threshold_percent", 5)
    last_notified_price = data.get("last_notified_price")

    if not (user_id and email and list_id):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Check if already exists
        cursor.execute(
            "SELECT id FROM price_drop_alerts WHERE user_id = %s AND list_id = %s",
            (user_id, list_id)
        )
        exists = cursor.fetchone()
        if exists:
            return jsonify({"error": "Already subscribed"}), 409

        cursor.execute(
            "INSERT INTO price_drop_alerts (user_id, email, list_id, threshold_percent, last_notified_price) VALUES (%s, %s, %s, %s, %s)",
            (user_id, email, list_id, threshold, last_notified_price)
        )
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": "Subscription successful"}), 200
    except Exception as e:
        print("Error subscribing to price drop:", e)
        return jsonify({"error": "Database error"}), 500


if __name__ == "__main__":
    start_scheduler()
    app.register_blueprint(match_api)
    app.run(host="0.0.0.0", port=5000, debug=True)


