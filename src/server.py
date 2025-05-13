import bcrypt
from flask import Flask, json, request, jsonify
from flask_cors import CORS
from transformers import pipeline
import pymysql
import requests
import os
import mysql.connector

app = Flask(__name__)
CORS(app)  # Allow requests from React frontend
chatbot = pipeline('text2text-generation', model='google/flan-t5-small')

# Database Configuration
DB_HOST = "104.199.102.228"
DB_USER = "root"
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_NAME = "quickpick"

# ✅ API Endpoints
FOODS_DICTIONARY_URL = "https://www.foodsdictionary.co.il/services/c/getSuggestions.php"
CHP_AUTOCOMPLETE_URL = "https://chp.co.il/autocompletion/product_extended"

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_input = data.get("message")

    if not user_input:
        return jsonify({"error": "No input provided"}), 400

    # ✅ Correct call to the pipeline
    bot_output = chatbot(user_input, max_length=100, do_sample=True)

    # ✅ Return the generated text
    return jsonify({"response": bot_output[0]['generated_text']})


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
        budget_amount = int(data.get("budgetAmount") or 0)
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
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Active')"""
        
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

        # Fetch and return user details
        cursor.execute("""
            SELECT first_name, email, preferences, supermarket_radius, 
                   disabled_permit, created_at, budget, budget_amount 
            FROM users 
            WHERE id = %s
        """, (user["id"],))
        the_user = cursor.fetchone()

        return jsonify({
            "message": "משתמש התחבר בהצלחה ✅",
            "user": {
                "id": user["id"],
                "first_name": the_user["first_name"],
                "email": the_user["email"],
                "preferences": the_user["preferences"],
                "supermarket_radius": the_user["supermarket_radius"],
                "disabled_permit": the_user["disabled_permit"],
                "created_at": the_user["created_at"],
                "budget": the_user["budget"],
                "budget_amount": the_user["budget_amount"]
            }
        }), 200

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
        l["created_at"] = l["created_at"].strftime("%Y-%m-%d %H:%M:%S")
        if "total_price" in l and l["total_price"] is not None:
            l["total_price"] = float(l["total_price"])

    print(lists)
    cursor.close()
    conn.close()
    return jsonify(lists)

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
        cursor.execute(
            "UPDATE user_lists SET list_name = %s WHERE id = %s",
            (new_name, list_id)
        )
        conn.commit()
        return jsonify({"message": "List name updated successfully"}), 200
    except Exception as e:
        print("Error updating list name:", e)
        return jsonify({"error": "Failed to update list name"}), 500
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
            SET preferences = %s,
            budget = %s,
            budget_amount = %s,
            supermarket_radius = %s,
            disabled_permit = %s
            WHERE email = %s
        """, (
            json.dumps(data.get("preferences", {})),
            data.get("budget", "weekly"),
            data.get("budgetAmount", 0),
            data.get("supermarketRadius", 5),
            data.get("accessibility", 0),
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
       
# ✅ Close user account
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


