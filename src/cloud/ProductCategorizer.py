import json
import openai
from src.DBConnector import get_db_connection
import os
from dotenv import load_dotenv
import time
import re


# Load environment variables
load_dotenv()


PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
categories_path = os.path.join(PROJECT_ROOT, "src", "cloud", "JSON", "categories.json")
# Load categories from JSON
with open(categories_path, "r", encoding="utf-8") as f:
    categories = json.load(f)

# Initialize OpenAI client
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Connect to the database
conn = get_db_connection()
cursor = conn.cursor(dictionary=True)

pattern = re.compile(r"^(\d+)\.\s*") 

# Batch size
BATCH_SIZE = 50

def categorize_large_product_list(products):
    """
    Accepts a large list of products and returns a mapping from item_code to category/subcategory
    using batching .
    """
    categorized = {}
    for i in range(0, len(products), BATCH_SIZE):
        batch = products[i:i + BATCH_SIZE]
        batch_results = categorize_product_batch(batch)
        for idx, product in enumerate(batch):
            result = batch_results.get(idx)
            if result and result["category"] in categories and result["subcategory"] in categories[result["category"]]:
                categorized[product["item_code"]] = result
            else:
                print(f"⚠️ Not classified: '{product['item_name']}'")

        time.sleep(1)  # Optional delay between batches

    return categorized

# Function to classify a batch of products
def categorize_product_batch(products):
    product_names = [f"{i+1}. {p['item_name']}" for i, p in enumerate(products)]

    prompt = (
        f"You will receive a list of product names. "
        f"For each product, choose the most appropriate category and subcategory from the list below:\n\n"
        f"{json.dumps(categories, ensure_ascii=False, indent=2)}\n\n"
        f"Respond in the following format for each item:\n"
        f"1. <product name>\n"
        f"Category: <category name>\n"
        f"Subcategory: <subcategory name>\n\n"
        f"---\n\n"
        f"Here are the products:\n" + "\n".join(product_names)
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a product categorization assistant."},
                {"role": "user", "content": prompt}
            ]
        )
        content = response.choices[0].message.content.strip()

        results = {}
        current_index = None
        lines = content.splitlines()

        for line in lines:
            stripped = line.strip()
            match = pattern.match(stripped)
            if match:
                current_index = int(match.group(1)) - 1
                if 0 <= current_index < len(products):
                    results[current_index] = {"category": None, "subcategory": None}
            elif "Category:" in stripped and current_index is not None:
                results[current_index]["category"] = stripped.split("Category:")[1].strip()
            elif "Subcategory:" in stripped and current_index is not None:
                results[current_index]["subcategory"] = stripped.split("Subcategory:")[1].strip()

        return results
    except Exception as e:
        print(f" Error during batch classification: {e}")
        return {}

def run_categorization_loop():
    while True:
        cursor.execute(
            f"SELECT item_code, item_name FROM products WHERE category IS NULL OR subcategory IS NULL LIMIT {BATCH_SIZE}"
        )
        products = cursor.fetchall()

        if not products:
            print("All products are categorized.")
            break

        results = categorize_product_batch(products)

        for idx, product in enumerate(products):
            result = results.get(idx)
            if result and result["category"] in categories and result["subcategory"] in categories[result["category"]]:
                try:
                    cursor.execute(
                        "UPDATE products SET category = %s, subcategory = %s WHERE item_code = %s",
                        (result["category"], result["subcategory"], product["item_code"])
                    )
                    conn.commit()
                    print(f"'{product['item_name']}' → {result['category']} / {result['subcategory']}")
                except Exception as e:
                    print(f" Error updating '{product['item_name']}': {e}")
            else:
                print(f"Not classified: '{product['item_name']}'")

        time.sleep(1)  # Optional delay between batches

    cursor.close()
    conn.close()


# if __name__ == "__main__":
#     run_categorization_loop()