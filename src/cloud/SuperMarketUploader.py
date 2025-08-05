import os
from src.cloud.ProductNameCorrector import fix_product_name
from src.DBConnector import get_db_connection
from src.cloud.ProductCategorizer import categorize_large_product_list
from src.cloud.ProductImageFetcher import get_image_url
import xml.etree.ElementTree as ET
from google.cloud import storage
import time

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
gcp_credentials_path = os.path.join(PROJECT_ROOT, "src", "cloud", "JSON", "gcp_credentials.json")

def process_supermarket_from_gcs(supermarket_name, price_type, credentials_path=gcp_credentials_path):
    print(f"\n Start processing {supermarket_name} from GCS")
    bucket_name = "quickpick-exports"
    folder_path = f"{supermarket_name}/{price_type}/"

    storage_client = storage.Client.from_service_account_json(credentials_path)
    bucket = storage_client.bucket(bucket_name)
    blobs = bucket.list_blobs(prefix=folder_path)

    for blob in blobs:
        if blob.name.endswith("/"):
            continue 
        print(f"\n Downloading and processing: {blob.name}")
        content = blob.download_as_bytes()

        try:
            tree = ET.ElementTree(ET.fromstring(content))
        except ET.ParseError:
            print(f" Skipping non-XML blob: {blob.name}")
            continue

        filename = os.path.basename(blob.name)
        
        temp_path = f"/tmp/{filename}"
        # Save content to temp file so it can be passed to existing upload functions
        with open(temp_path, "wb") as f:
            f.write(content)

        if supermarket_name == "Shufersal":
            products_with_prices = shufersal_upload(temp_path)
        elif supermarket_name == "Yohananof":
            products_with_prices = yohananof_upload(temp_path)
        elif supermarket_name == "TivTaam":
            products_with_prices = tivtaam_upload(temp_path)
        elif supermarket_name == "Victory":
            products_with_prices = victory_upload(temp_path)
        else:
            print(f" Unknown supermarket: {supermarket_name}")
            continue

        if products_with_prices:
            process_products_to_db(products_with_prices)


def get_text(elem, tag):
    found = elem.find(tag)
    return found.text.strip() if found is not None and found.text is not None else None


def shufersal_upload(file_path, chain_id="7290027600007"):
    tree = ET.parse(file_path)
    root = tree.getroot()
    filename = os.path.basename(file_path)
    store_id = str(int(filename.split("-")[1])) 

    all_products = []

    for item in root.find("Items").findall("Item"):
        try:
            item_code = get_text(item, "ItemCode")
            item_type = get_text(item, "ItemType")
            item_name = get_text(item, "ItemName")
            manufacturer_name = get_text(item, "ManufacturerName")
            unit_qty = get_text(item, "UnitQty")
            price_update_date = get_text(item, "PriceUpdateDate")
            unit_of_measure_price = get_text(item, "UnitOfMeasurePrice")
            item_price = get_text(item, "ItemPrice")

            product_data = {
                "item_code": item_code,
                "item_type": item_type,
                "item_name": item_name,
                "manufacturer_name": manufacturer_name,
                "unit_qty": unit_qty,
            }

            price_data = {
                "chain_id": chain_id,
                "store_id": store_id,
                "item_code": item_code,
                "price_update_date": price_update_date,
                "unit_of_measure_price": unit_of_measure_price,
                "item_price": item_price
            }

            all_products.append((product_data, price_data))

        except Exception as e:
            print(f" Error parsing item: {e}")
            continue

    return all_products

def yohananof_upload(file_path, chain_id="7290803800003"):
    tree = ET.parse(file_path)
    root = tree.getroot()
    filename = os.path.basename(file_path)
    store_id = str(int(filename.split("-")[1])) 

    all_products = []

    for item in root.find("Items").findall("Item"):
        try:
            item_code = get_text(item, "ItemCode")
            item_type = get_text(item, "ItemType")
            item_name = get_text(item, "ItemName")
            manufacturer_name = get_text(item, "ManufacturerName")
            unit_qty = get_text(item, "UnitQty")
            price_update_date = get_text(item, "PriceUpdateDate")
            unit_of_measure_price = get_text(item, "UnitOfMeasurePrice")
            item_price = get_text(item, "ItemPrice")

            product_data = {
                "item_code": item_code,
                "item_type": item_type,
                "item_name": item_name,
                "manufacturer_name": manufacturer_name,
                "unit_qty": unit_qty,
            }

            price_data = {
                "chain_id": chain_id,
                "store_id": store_id,
                "item_code": item_code,
                "price_update_date": price_update_date,
                "unit_of_measure_price": unit_of_measure_price,
                "item_price": item_price
            }

            all_products.append((product_data, price_data))

        except Exception as e:
            print(f" Error parsing item: {e}")
            continue

    return all_products

def tivtaam_upload(file_path, chain_id="7290873255550"):
    tree = ET.parse(file_path)
    root = tree.getroot()
    filename = os.path.basename(file_path)
    store_id = str(int(filename.split("-")[1])) 

    all_products = []

    for item in root.find("Items").findall("Item"):
        try:
            item_code = get_text(item, "ItemCode")
            item_type = get_text(item, "ItemType")
            item_name = get_text(item, "ItemName")
            manufacturer_name = get_text(item, "ManufacturerName")
            unit_qty = get_text(item, "UnitQty")
            price_update_date = get_text(item, "PriceUpdateDate")
            unit_of_measure_price = get_text(item, "UnitOfMeasurePrice")
            item_price = get_text(item, "ItemPrice")

            product_data = {
                "item_code": item_code,
                "item_type": item_type,
                "item_name": item_name,
                "manufacturer_name": manufacturer_name,
                "unit_qty": unit_qty,
            }

            price_data = {
                "chain_id": chain_id,
                "store_id": store_id,
                "item_code": item_code,
                "price_update_date": price_update_date,
                "unit_of_measure_price": unit_of_measure_price,
                "item_price": item_price
            }

            all_products.append((product_data, price_data))

        except Exception as e:
            print(f" Error parsing item: {e}")
            continue

    return all_products

def victory_upload(file_path, chain_id="7290696200003"):
    tree = ET.parse(file_path)
    root = tree.getroot()
    filename = os.path.basename(file_path)
    store_id = filename.split("-")[1]

    all_products = []

    for item in root.find("Products").findall("Product"): # "Products" for Victory
        try:
            item_code = get_text(item, "ItemCode")
            item_type = get_text(item, "ItemType")
            item_name = get_text(item, "ItemName")
            manufacturer_name = get_text(item, "ManufacturerName")
            unit_qty = get_text(item, "UnitQty")
            price_update_date = get_text(item, "PriceUpdateDate")
            unit_of_measure_price = get_text(item, "UnitOfMeasurePrice")
            item_price = get_text(item, "ItemPrice")

            product_data = {
                "item_code": item_code,
                "item_type": item_type,
                "item_name": item_name,
                "manufacturer_name": manufacturer_name,
                "unit_qty": unit_qty,
            }

            price_data = {
                "chain_id": chain_id,
                "store_id": store_id,
                "item_code": item_code,
                "price_update_date": price_update_date,
                "unit_of_measure_price": unit_of_measure_price,
                "item_price": item_price
            }

            all_products.append((product_data, price_data))

        except Exception as e:
            print(f" Error parsing item: {e}")
            continue

    return all_products

def process_products_to_db(products_with_prices):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    all_products = [p[0] for p in products_with_prices]
    all_prices = [p[1] for p in products_with_prices]

    # Filter new products
    new_products = []
    for product in all_products:
        if not product_exists(cursor, product["item_code"]):
            product["item_name"] = fix_product_name(product["item_name"])
            new_products.append(product)

    # Categorize and enrich new products
    categorized = categorize_large_product_list(new_products)
    for product in new_products:
        code = product["item_code"]
        product["category"] = categorized.get(code, {}).get("category")
        product["subcategory"] = categorized.get(code, {}).get("subcategory")
        product["image_url"] = get_image_url(code)
        insert_product(cursor, product)

    # Insert/update prices
    for price in all_prices:
        insert_or_update_price(cursor, price)

    conn.commit()
    cursor.close()
    conn.close()

    print(f" Inserted {len(new_products)} new products.")
    print(f" Updated {len(all_prices)} prices.")
    time.sleep(1)  # Optional delay to avoid overwhelming the database

def product_exists(cursor, item_code):
    cursor.execute("SELECT 1 FROM products WHERE item_code = %s LIMIT 1", (item_code,))
    return cursor.fetchone() is not None

def insert_product(cursor, product):
    cursor.execute("""
        INSERT INTO products (
            item_code, item_type, item_name, manufacturer_name, unit_qty,
            category, subcategory, image_url
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        product["item_code"],
        product["item_type"],
        product["item_name"],
        product["manufacturer_name"],
        product["unit_qty"],
        product["category"],
        product["subcategory"],
        product["image_url"]
    ))

def insert_or_update_price(cursor, price):
    cursor.execute("""
        INSERT INTO store_prices (
            chain_id, store_id, item_code, price_update_date,
            unit_of_measure_price, item_price
        )
        VALUES (%s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            price_update_date = VALUES(price_update_date),
            unit_of_measure_price = VALUES(unit_of_measure_price),
            item_price = VALUES(item_price)
    """, (
        price["chain_id"],
        price["store_id"],
        price["item_code"],
        price["price_update_date"],
        price["unit_of_measure_price"],
        price["item_price"]
    ))

# Main function to start the supermarket uploader process
def SupermarketUploader(price_type):
    print("🔁 Calling process_products_to_db")
    for chain in ["Shufersal", "Yohananof", "TivTaam", "Victory"]:
        process_supermarket_from_gcs(chain, price_type)
