import os
import json
import time
import gzip
import shutil
import re
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from datetime import datetime
from google.cloud import storage
import tempfile
import requests



SHUFRSAL_URL = "https://prices.shufersal.co.il/"
VICTORY_URL = "https://laibcatalog.co.il/"
OTHER_URL = "https://url.publishedprices.co.il/login"

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
branches_json_path = os.path.join(PROJECT_ROOT, "src", "cloud", "JSON", "branches.json")
login_json_path = os.path.join(PROJECT_ROOT, "src", "cloud", "JSON", "Login.json")
gcp_credentials_path = os.path.join(PROJECT_ROOT, "src", "cloud", "JSON", "gcp_credentials.json")

# Load branches.json
with open(branches_json_path, "r", encoding="utf-8") as f:
    BRANCHES = json.load(f)


def setup_driver():
    options = webdriver.ChromeOptions()

    # Use a temporary directory for downloads
    temp_dir = tempfile.mkdtemp()

    prefs = {
        "download.default_directory": temp_dir,
        "download.prompt_for_download": False,
        "profile.default_content_settings.popups": 0
    }

    options.add_experimental_option("prefs", prefs)
    driver = webdriver.Chrome(options=options)
    driver.temp_download_dir = temp_dir  # נשמור את הנתיב להמשך ניקוי

    return driver
# ========== Shufersal ==========

def download_shufersal(chain_id, store_ids):
    print("Handling Shufersal...")
    driver = setup_driver()  # משתמש ב-temp dir
    temp_dir = driver.temp_download_dir

    try:
        driver.get(SHUFRSAL_URL)

        # Select Prices
        Select(WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.XPATH, "/html/body/div[2]/div[4]/div/div[2]/select"))
        )).select_by_visible_text("Prices")

        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//table"))
        )

        downloaded = set()
        while True:
            rows = driver.find_elements(By.XPATH, "//table/tbody/tr")
            for row in rows:
                try:
                    link = row.find_element(By.XPATH, "td[1]/a")
                    href = link.get_attribute("href")
                    filename = href.split("/")[-1].split("?")[0]
                    parts = filename.replace(".gz", "").replace("Price", "").split("-")

                    if len(parts) < 2:
                        continue

                    current_chain_id, store_id = parts[0], parts[1]  
                    if current_chain_id == chain_id and store_id in store_ids:
                        if filename in downloaded or os.path.exists(os.path.join(temp_dir, filename)):
                            continue
                        print(f" Downloading {filename}...")
                        downloaded.add(filename)
                        driver.execute_script("arguments[0].scrollIntoView(true);", link)
                        time.sleep(0.5)
                        response = requests.get(href, stream=True)
                        if response.status_code == 200:
                            file_path = os.path.join(temp_dir, filename)
                            with open(file_path, 'wb') as f:
                                for chunk in response.iter_content(chunk_size=8192):
                                    f.write(chunk)
                            print(f" Downloaded {filename}")
                            downloaded.add(filename)
                        else:
                            print(f" Failed to download {filename}, status: {response.status_code}")
                except:
                    continue

            try:
                next_btn = driver.find_element(By.XPATH, "//a[text()='>']")
                next_btn.click()
                time.sleep(5)
            except:
                break

        print(f" Downloaded {len(downloaded)} files from Shufersal.")
        extract_gz_files(temp_dir, chain_name="Shufersal")

    except Exception as e:
        print(f" Error with Shufersal: {e}")
    finally:
        driver.quit()
        # Clean up temp directory
        try:
            shutil.rmtree(temp_dir)
        except Exception as e:
            print(f" Failed to clean temp dir: {e}")


# ========== Victory ==========
def download_victory(chain_id, store_ids):
    print("Handling Victory...")

    driver = setup_driver()
    temp_dir = driver.temp_download_dir

    try:
        driver.get(VICTORY_URL)

        # Step 1: Select "Victory" from the chain dropdown
        WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.ID, "MainContent_chain")))
        Select(driver.find_element(By.ID, "MainContent_chain")).select_by_value(chain_id)
        time.sleep(2)

        # Step 2: Select "Prices" (not PriceFull!) from the file type dropdown
        Select(driver.find_element(By.ID, "MainContent_fileType")).select_by_value("price")
        time.sleep(1)

        # Step 3: Click the "Search" button
        driver.find_element(By.ID, "MainContent_btnSearch").click()

        # Step 4: Wait for the results table to load
        WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.XPATH, "//table")))

        rows = driver.find_elements(By.XPATH, "//table/tbody/tr")

        latest_files = {}  # store_id → (filename, download_link, datetime_object)

        for row in rows:
            try:
                cells = row.find_elements(By.TAG_NAME, "td")
                if len(cells) < 3:
                    continue

                filename = cells[0].text.strip()
                date_str = cells[6].text.strip()  # This is the "תאריך" column

                if not filename.startswith("Price") or "PriceFull" in filename:
                    continue  # Ignore full-price files

                match = re.match(r"Price(\d+)-(\d+)-", filename)
                if not match:
                    continue

                current_chain, store_id = match.groups()
                if current_chain != chain_id or store_id not in store_ids:
                    continue

                # Parse the date string (format: dd/MM/yyyy HH:mm:ss)
                file_datetime = datetime.strptime(date_str, "%d/%m/%Y %H:%M:%S")

                # Save only the latest file per store_id
                if store_id not in latest_files or file_datetime > latest_files[store_id][2]:
                    download_link = row.find_element(By.XPATH, ".//a[contains(@href, '.gz')]")
                    latest_files[store_id] = (filename, download_link, file_datetime)

            except Exception as e:
                print(f"⚠️ Error parsing row: {e}")
                continue

        # Download the latest file for each store_id
        downloaded = set()
        for store_id, (filename, link, dt) in latest_files.items():
            try:
                print(f"Downloading {filename} (store {store_id}, date {dt})")
                link.click()
                time.sleep(3)
                downloaded.add(filename)
            except Exception as e:
                print(f"Failed to download {filename}: {e}")

        print(f" Downloaded {len(downloaded)} files from Victory.")
        extract_gz_files(temp_dir, chain_name="Victory")

    except Exception as e:
        print(f" Error with Victory: {e}")
    finally:
        driver.quit()
        try:
            shutil.rmtree(temp_dir)
        except Exception as e:
            print(f"⚠️ Failed to clean temp dir: {e}")



# ========== Tiv Taam ==========
def download_tivtaam(chain_id, store_ids):
    print("Handling Tiv Taam...")

    # Load login credentials from JSON file
    with open(login_json_path, "r", encoding="utf-8") as f:
        credentials = json.load(f)["TivTaam"]

    # Set up driver with temporary download directory
    driver = setup_driver()
    temp_dir = driver.temp_download_dir

    try:
        driver.get(OTHER_URL)

        # Step 1: Login with provided credentials
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.XPATH, "//input[@type='text']"))
        ).send_keys(credentials["username"])
        driver.find_element(By.XPATH, "//input[@type='password']").send_keys(credentials["password"])
        driver.find_element(By.XPATH, "//button[contains(text(), 'Sign in')]").click()

        # Step 2: Wait for search input and search for "Price"
        search_input = WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.XPATH, "//input[@type='search' and @aria-controls='fileList']"))
        )
        search_input.clear()
        search_input.send_keys("Price")
        time.sleep(3)

        # Map store_id → (filename, row_index, timestamp)
        latest_files = {}
        rows = driver.find_elements(By.XPATH, "//table/tbody/tr")

        for i in range(len(rows)):
            try:
                filename = rows[i].find_element(By.XPATH, "./td[1]").text.strip()
                if not filename.endswith(".gz") or "Price" not in filename:
                    continue

                # Parse chain_id and store_id
                match = re.match(r"Price(\d+)-(\d+)-(\d+)\.gz", filename)
                if not match:
                    continue

                current_chain, store_id, _ = match.groups()
                if current_chain != chain_id or store_id not in store_ids:
                    continue

                # Parse timestamp from <time> element
                time_str = rows[i].find_element(By.XPATH, "./td[4]/time").get_attribute("datetime")
                timestamp = datetime.strptime(time_str, "%Y-%m-%dT%H:%M:%SZ")

                # Keep only the most recent file per store
                if store_id not in latest_files or timestamp > latest_files[store_id][2]:
                    latest_files[store_id] = (filename, i, timestamp)

            except Exception as e:
                print(f"⚠️ Error parsing row {i}: {e}")
                continue

        print(f"Found {len(latest_files)} latest files for Tiv Taam.")

        downloaded = set()
        for store_id, (filename, _, _) in latest_files.items():
            if filename in downloaded:
                continue

            try:
                print(f"Downloading {filename} (store {store_id})")

                # Expand the row and trigger the download link
                row = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, f"//tr[@id='{filename}']"))
                )
                expand_btn = row.find_element(By.XPATH, ".//a[@class='is']")
                driver.execute_script("arguments[0].scrollIntoView(true);", expand_btn)
                expand_btn.click()

                download_button = WebDriverWait(driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, f"//a[contains(@href, '/file/d/{filename}')]"))
                )
                download_button.click()
                time.sleep(5)

                downloaded.add(filename)

            except Exception as e:
                print(f"⚠️ Failed to download {filename}: {e}")

        print(f"Downloaded {len(downloaded)} files from Tiv Taam.")

        # Extract and upload to GCS
        extract_gz_files(temp_dir, chain_name="TivTaam")

    except Exception as e:
        print(f"Error with Tiv Taam: {e}")
    finally:
        driver.quit()
        try:
            shutil.rmtree(temp_dir)
        except Exception as e:
            print(f"Failed to clean temp dir: {e}")


# ========== Yohananof ==========
def download_yohananof(chain_id, store_ids):
    print("Handling Yohananof...")

    # Load login credentials from JSON file
    with open(login_json_path, "r", encoding="utf-8") as f:
        credentials = json.load(f)["Yohananof"]

    # Setup driver with temporary download directory
    driver = setup_driver()
    temp_dir = driver.temp_download_dir

    try:
        driver.get(OTHER_URL)

        # Step 1: Login using provided credentials
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.XPATH, "//input[@type='text']"))
        ).send_keys(credentials["username"])
        driver.find_element(By.XPATH, "//input[@type='password']").send_keys(credentials["password"])
        driver.find_element(By.XPATH, "//button[contains(text(), 'Sign in')]").click()

        # Step 2: Wait for search bar and enter "Price"
        search_input = WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.XPATH, "//input[@type='search' and @aria-controls='fileList']"))
        )
        search_input.clear()
        search_input.send_keys("Price")
        time.sleep(3)

        # Step 3: Parse the latest file per store_id
        latest_files = {}
        rows = driver.find_elements(By.XPATH, "//table/tbody/tr")

        for i in range(len(rows)):
            try:
                filename = rows[i].find_element(By.XPATH, "./td[1]").text.strip()
                if not filename.endswith(".gz") or "Price" not in filename:
                    continue

                # Extract chain and store IDs
                match = re.match(r"Price(\d+)-(\d+)-(\d+)\.gz", filename)
                if not match:
                    continue

                current_chain, store_id, _ = match.groups()
                if current_chain != chain_id or store_id not in store_ids:
                    continue

                # Extract timestamp from <time> tag
                time_str = rows[i].find_element(By.XPATH, "./td[4]/time").get_attribute("datetime")
                timestamp = datetime.strptime(time_str, "%Y-%m-%dT%H:%M:%SZ")

                # Keep only the most recent file for each store
                if store_id not in latest_files or timestamp > latest_files[store_id][2]:
                    latest_files[store_id] = (filename, i, timestamp)

            except Exception as e:
                print(f"⚠️ Error parsing row {i}: {e}")
                continue

        print(f"Found {len(latest_files)} files for Yohananof.")

        # Step 4: Download each file
        downloaded = set()
        for store_id, (filename, _, _) in latest_files.items():
            if filename in downloaded:
                continue

            try:
                print(f"Downloading {filename} (store {store_id})")

                # Expand the row and click download link
                row = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, f"//tr[@id='{filename}']"))
                )
                expand_btn = row.find_element(By.XPATH, ".//a[@class='is']")
                driver.execute_script("arguments[0].scrollIntoView(true);", expand_btn)
                expand_btn.click()

                download_button = WebDriverWait(driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, f"//a[contains(@href, '/file/d/{filename}')]"))
                )
                download_button.click()
                time.sleep(5)

                downloaded.add(filename)

            except Exception as e:
                print(f"⚠️ Failed to download {filename}: {e}")

        print(f"Downloaded {len(downloaded)} files from Yohananof.")

        # Step 5: Extract and upload files to GCS
        extract_gz_files(temp_dir, chain_name="Yohananof")

    except Exception as e:
        print(f"Error with Yohananof: {e}")
    finally:
        driver.quit()
        try:
            shutil.rmtree(temp_dir)
        except Exception as e:
            print(f"Failed to clean temp dir: {e}")

      
# === GCS Upload Function ===
def upload_to_gcs(local_file_path, bucket_name, destination_blob_name, credentials_path=gcp_credentials_path):
    try:
        # Extract store_id from the filename using pattern -XXX- (e.g., -229-)
        match = re.search(r"-(\d{2,4})-", os.path.basename(destination_blob_name))
        store_id = match.group(1) if match else None

        client = storage.Client.from_service_account_json(credentials_path)
        bucket = client.bucket(bucket_name)

        if store_id:
            prefix = os.path.dirname(destination_blob_name) + "/"
            blobs = list(bucket.list_blobs(prefix=prefix))

            # Delete any existing blob for the same store_id
            for blob in blobs:
                if re.search(rf"-{store_id}-", blob.name):
                    print(f"Found existing file for store {store_id}: {blob.name} — deleting...")
                    blob.delete()

        # Upload the new file
        blob = bucket.blob(destination_blob_name)
        blob.upload_from_filename(local_file_path)
        print(f"Uploaded to GCS: gs://{bucket_name}/{destination_blob_name}")

    except Exception as e:
        print(f"Failed to upload {local_file_path} to GCS: {e}")

# === Modified extract_gz_files ===
def extract_gz_files(download_dir, chain_name):
    BUCKET_NAME = "quickpick-exports"
    chain_folder = f"{chain_name}/Prices"

    for file in os.listdir(download_dir):
        if file.endswith(".gz"):
            gz_path = os.path.join(download_dir, file)
            xml_filename = file.replace(".gz", "")
            xml_path = os.path.join(download_dir, xml_filename)

            try:
                # Extract
                with gzip.open(gz_path, 'rb') as f_in, open(xml_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
                print(f" Extracted: {xml_path}")

                # Upload to GCS
                blob_name = f"{chain_folder}/{xml_filename}"
                upload_to_gcs(xml_path, BUCKET_NAME, blob_name)

                # Delete .gz file
                os.remove(gz_path)
                print(f" Deleted: {gz_path}")
            except Exception as e:
                print(f" Error processing {file}: {e}")

# === Main Function to Download All Branches ===
def download_all_branches():            
    if "Shufersal" in BRANCHES:
        download_shufersal(BRANCHES["Shufersal"]["chain_id"], BRANCHES["Shufersal"]["store_ids"])
    if "Victory" in BRANCHES:
       download_victory(BRANCHES["Victory"]["chain_id"], BRANCHES["Victory"]["store_ids"])
    if "TivTaam" in BRANCHES:
        download_tivtaam(BRANCHES["TivTaam"]["chain_id"], BRANCHES["TivTaam"]["store_ids"])
    if "Yohananof" in BRANCHES:
        download_yohananof(BRANCHES["Yohananof"]["chain_id"], BRANCHES["Yohananof"]["store_ids"])


