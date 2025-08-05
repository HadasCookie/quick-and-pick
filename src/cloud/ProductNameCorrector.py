import re
import time
from src.DBConnector import get_db_connection

# Units for matching
COUNTABLE_UNITS = ["יחידות", "כוסות", "כוס", "כפיות", "כפית", "כף"]
MEASURABLE_UNITS = ["גרם", "גרמים", "מ״ל", "ק״ג", "מיליליטרים"]
ALL_UNITS = COUNTABLE_UNITS + MEASURABLE_UNITS

def fix_product_name(name):
    name = re.sub(r'\s+', ' ', name).strip()

    # Normalize "מל" or "ml" to "מ״ל"
    name = re.sub(r'(\d+)\s*(מל|ml)', r'\1 מ״ל', name, flags=re.IGNORECASE)

    # Add missing spaces between numbers and letters
    name = re.sub(r'(\d+)([א-תA-Za-z])', r'\1 \2', name)
    name = re.sub(r'([א-תA-Za-z])(\d+)', r'\1 \2', name)

    # Look for quantity + unit
    match = re.search(r'(\d+)\s*(' + '|'.join(ALL_UNITS) + r')', name)
    if match:
        quantity = match.group(1)
        unit = match.group(2)
        full = f"{quantity} {unit}"

        # Remove quantity + unit from current position
        name_wo_quantity = re.sub(r'(\d+)\s*(' + '|'.join(ALL_UNITS) + r')', '', name).strip()

        # If it's a countable unit, move it to the beginning
        if unit in COUNTABLE_UNITS:
            name = f"{full} {name_wo_quantity}".strip()
        else:
            # Measurable units stay at the end
            name = f"{name_wo_quantity} {full}".strip()

    return name

def update_product_name(cursor, item_code, new_name):
    query = "UPDATE products SET item_name = %s WHERE item_code = %s"
    cursor.execute(query, (new_name, item_code))

def process_product_names(batch_size=50):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None:
            print("Failed to connect to DB.")
            return

        cursor = conn.cursor(dictionary=True)
        print(" Connected to the database.")

        offset = 0
        while True:
            cursor.execute("""
                SELECT item_code, item_name
                FROM products
                LIMIT %s OFFSET %s
            """, (batch_size, offset))
            products = cursor.fetchall()

            if not products:
                print(" All product names processed.")
                break

            updated = 0
            for product in products:
                item_code = product["item_code"]
                item_name = product["item_name"]
                corrected_name = fix_product_name(item_name)

                if corrected_name != item_name:
                    update_product_name(cursor, item_code, corrected_name)
                    print(f" Updated: {item_name} -> {corrected_name}")
                    updated += 1
                else:
                    print(f"No change: {item_name}")

                time.sleep(0.1)

            conn.commit()
            print(f" Batch update complete: {updated} products updated.")
            offset += batch_size

    except Exception as e:
        print("Error:", e)

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()
            print("DB connection closed.")

# if __name__ == "__main__":
#     process_product_names()
