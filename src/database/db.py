import mysql.connector

config = {
    'user': 'root',
    'password': 'your_password',
    'host': '34.136.219.66',  # Replace with your Cloud SQL IP
    'database': 'quickpick_users',
}

try:
    conn = mysql.connector.connect(**config)
    cursor = conn.cursor()
    print("✅ Connected to MySQL database!")
    cursor.execute("SHOW TABLES;")
    for table in cursor.fetchall():
        print(table)

    cursor.close()
    conn.close()
except mysql.connector.Error as err:
    print(f"❌ Error: {err}")
