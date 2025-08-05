import os
import time
import requests
from dotenv import load_dotenv
from src.DBConnector import get_db_connection

load_dotenv()

if not os.getenv('DB_PASSWORD'):
    print("DB_PASSWORD is not set. Please check your .env file.")
else:
    print("DB_PASSWORD loaded successfully.")


def get_image_url(barcode):
    """
    Attempts to get the image URL for a product using its barcode
    from multiple sources. Returns the first valid image URL found, else None.
    """
    sources = [
        f"https://m.pricez.co.il/ProductPictures/{barcode}.jpg",
        f"https://superpharmstorage.blob.core.windows.net/hybris/products/mobile/medium/{barcode}.jpg"
        f"https://salute.co.il/wp-content/uploads/2021/02/{barcode}-600x600-1.png"
        f"https://img.zapmarket.co.il/images/B_{barcode}/dt_1.jpg"
    ]
    for url in sources:
        try:
            response = requests.head(url, timeout=5)
            if response.status_code == 200:
                return url
        except Exception as e:
            print(f"Error checking {url} for barcode {barcode}: {e}")
    return None



def update_image_url(cursor, item_code, image_url):
    """
    Updates the image_url field in the products table for the given item_code.
    """
    query = "UPDATE products SET image_url = %s WHERE item_code = %s"
    cursor.execute(query, (image_url, item_code))


def process_products(batch_size=50):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None:
            print("Failed to connect to the database. Terminating script.")
            return

        cursor = conn.cursor(dictionary=True)
        print("Connected to the database.")

        offset = 0
        while True:
            cursor.execute("""
                SELECT item_code, item_name 
                FROM products 
                WHERE image_url IS NULL OR image_url = '' 
                LIMIT %s OFFSET %s
            """, (batch_size, offset))
            products = cursor.fetchall()

            if not products:
                print("No more products to process.")
                break

            print(f"Processing {len(products)} products (offset {offset})...")

            for product in products:
                item_code = product["item_code"]
                item_name = product.get("item_name", "")
                print(f"Checking image for: {item_code} - {item_name}")
                image_url = get_image_url(item_code)
                if image_url:
                    update_image_url(cursor, item_code, image_url)
                    print(f"Updated image URL for {item_code}")
                else:
                    print(f"No image found for {item_code}")
                time.sleep(0.3) 

            conn.commit()
            offset += batch_size

        print("All image URLs updated.")

    except Exception as e:
        print("An error occurred:", e)

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()
            print("Database connection closed.")


# if __name__ == "__main__":
#     process_products()
