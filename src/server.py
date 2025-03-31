import bcrypt
from flask import Flask, json, request, jsonify
from flask_cors import CORS
import pymysql
import requests
import os
import mysql.connector

app = Flask(__name__)
CORS(app)  # Allow requests from React frontend

# Database Configuration
DB_HOST = "34.136.219.66"
DB_USER = "root"
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_NAME = "subscribed_users"

# ✅ API Endpoints
FOODS_DICTIONARY_URL = "https://www.foodsdictionary.co.il/services/c/getSuggestions.php"
CHP_AUTOCOMPLETE_URL = "https://chp.co.il/autocompletion/product_extended"

# ✅ Fetch suggestions from FoodsDictionary
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

# ✅ Fetch suggestions from CHP Autocomplete API
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

# ✅ API Route: Get suggestions from selected source
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

@app.route("/api/register", methods=["POST"])
def register_user():
    try:
        data = request.json
        print("Received Data:", data)

        # --- קבלת נתונים מהקליינט
        first_name = data.get("first_name")
        last_name = data.get("last_name")
        email = data.get("email")
        password = data.get("password")
        phone = data.get("phone")
        birth_date = data.get("birthDate")
        gender = data.get("gender")
        city = data.get("city")
        disabled_permit = data.get("disabledPermit", False)
        preferences = json.dumps(data.get("preferences", {}))
        budget = data.get("budget")
        budget_amount = float(data.get("budgetAmount") or 0)
        supermarket_radius = int(data.get("supermarket_radius") or 5)
        newsletter = data.get("newsletter", False)
        marketing_updates = data.get("marketingUpdates", False)

        if not first_name or not last_name or not email or not password:
            return jsonify({"error": "Missing required fields"}), 400

        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        conn = get_db_connection()
        cursor = conn.cursor()

        sql = """INSERT INTO users 
                (first_name, last_name, email, password_hash, phone, birth_date, gender,
                 city, disabled_permit, preferences, budget, budget_amount, supermarket_radius,
                 newsletter, marketing_updates, subscription_status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Inactive')"""
        
        values = (
            first_name, last_name, email, hashed_password, phone, birth_date, gender, city,
            disabled_permit, preferences, budget, budget_amount, supermarket_radius,
            newsletter, marketing_updates
        )

        cursor.execute(sql, values)
        conn.commit()

        return jsonify({"message": "User registered successfully!"}), 201

    except pymysql.Error as e:
        print("❌ Database Error:", e)
        if e.args[0] == 1062:
            return jsonify({"error": "Email already exists"}), 409
        return jsonify({"error": "Database error"}), 500

    except Exception as e:
        print("❌ Unexpected Error:", e)
        return jsonify({"error": "Internal Server Error"}), 500

    finally:
        try:
            if conn.open:
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
        cursor.execute("SELECT id, email, password_hash FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Verify password
        if not bcrypt.checkpw(password.encode('utf-8'), user["password_hash"].encode('utf-8')):
            return jsonify({"error": "Invalid credentials"}), 401

        # Return success response and return user details
        cursor.execute("SELECT first_name, email, preferences, supermarket_radius, disabled_permit FROM users WHERE id = %s", (user["id"],))
        the_user = cursor.fetchone()
        return jsonify({"message": "Login successful", "user": {"id": user["id"], "first_name": the_user["first_name"], "email": the_user["email"], "preferences": the_user["preferences"], "supermarket_radius": the_user["supermarket_radius"], "disabled_permit": the_user["disabled_permit"]}}), 200


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
    
    print("User from DB:", user)

    if not bcrypt.checkpw(current_password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        return jsonify({"error": "Incorrect current password"}), 401

    new_hashed = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    cursor.execute("UPDATE users SET password_hash = %s WHERE email = %s", (new_hashed, email))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Password updated successfully"}), 200


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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)


