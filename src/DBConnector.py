import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = "34.78.145.126"
DB_USER = "Admin"
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_NAME = "quickpick"

def get_db_connection():
    try:
        return mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            autocommit=True
        )
    except mysql.connector.Error as err:
        print(f"[DB ERROR] {err}")
        return None
