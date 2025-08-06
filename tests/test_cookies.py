import time
import json
import os
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains


# === Login helper ===
def login_if_needed(driver, wait):
    try:
        wait.until(EC.presence_of_element_located((By.XPATH, "//button[contains(text(), 'שלום')]")))
        print("Already logged in.")
        return
    except:
        print("Not logged in, proceeding to login...")

    with open("tests/login_credentials.json", "r", encoding="utf-8") as f:
        credentials = json.load(f)

    login_link = wait.until(EC.presence_of_element_located((By.XPATH, "//a[contains(@class, 'log-in-text')]")))
    driver.execute_script("arguments[0].click();", login_link)
    wait.until(EC.presence_of_element_located((By.TAG_NAME, "form")))

    try:
        login_tab = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'התחברות')]")))
        login_tab.click()
    except:
        pass

    time.sleep(1)
    email_input = wait.until(EC.presence_of_element_located((By.NAME, "email")))
    password_input = wait.until(EC.presence_of_element_located((By.NAME, "password")))

    email_input.send_keys(credentials["email"])
    password_input.send_keys(credentials["password"])

    time.sleep(1)
    submit_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//form//button[@type='submit']")))
    submit_btn.click()

    wait.until(EC.presence_of_element_located((By.XPATH, "//button[contains(text(), 'שלום')]")))
    print("Login successful.")

# === Test 1: Save cart using user-data-dir profile ===
def test_save_cart_with_profile():
    profile_dir = os.path.abspath("selenium-profile")
    options = Options()
    options.add_argument("--window-size=1920,1080")
    options.add_argument(f"user-data-dir={profile_dir}")

    driver = webdriver.Chrome(options=options)
    driver.execute_cdp_cmd("Emulation.setGeolocationOverride", {
        "latitude": 32.0696,
        "longitude": 34.7943,
        "accuracy": 100
    })
    wait = WebDriverWait(driver, 10)
    driver.get("http://localhost:3000")
    actions = ActionChains(driver)

    login_if_needed(driver, wait)

    find_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), 'מצא סופר')]")))
    find_btn.click()

    location_button = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "location-btn")))
    location_button.click()
    time.sleep(1)

    dropdown = driver.find_element(By.CLASS_NAME, "dropdown")
    for option in dropdown.find_elements(By.TAG_NAME, "option"):
        if option.text == "5 ק״מ":
            option.click()
            break

        
    continue_btn = driver.find_element(By.CLASS_NAME, "continue-btn")
    actions.move_to_element_with_offset(continue_btn, 5, 5).click().perform()

    time.sleep(3)

    category = wait.until(EC.element_to_be_clickable((By.XPATH, "//div[contains(@class, 'category-card') and .//span[contains(text(), 'מוצרי חלב וביצים')]]")))
    actions.move_to_element_with_offset(category, 5, 5).click().perform()

    subcategory = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'subcategory-btn') and contains(text(), 'ביצים')]")))
    actions.move_to_element_with_offset(subcategory, 5, 5).click().perform()

    product = wait.until(EC.element_to_be_clickable((By.XPATH, "//div[contains(@class, 'product-card')]//h3[contains(text(), 'ביצים')]")))
    actions.move_to_element_with_offset(product, 5, 5).click().perform()

    add_btn = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "add-to-cart")))
    actions.move_to_element_with_offset(add_btn, 5, 5).click().perform()

    cart_btn = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "cart-button")))
    actions.move_to_element_with_offset(cart_btn, 5, 5).click().perform()

    time.sleep(3)

    wait.until(EC.presence_of_element_located((By.CLASS_NAME, "cart-items")))
    product_elements = driver.find_elements(By.CSS_SELECTOR, ".cart-item .item-details p")
    assert any("ביצים" in el.text for el in product_elements), "Eggs not found in cart"

    driver.quit()

# === Test 2: Load profile and verify cart ===
def test_restore_cart_with_profile():
    profile_dir = os.path.abspath("selenium-profile")
    options = Options()
    options.add_argument("--window-size=1920,1080")
    options.add_argument(f"user-data-dir={profile_dir}")

    driver = webdriver.Chrome(options=options)
    driver.execute_cdp_cmd("Emulation.setGeolocationOverride", {
        "latitude": 32.0696,
        "longitude": 34.7943,
        "accuracy": 100
    })
    driver.get("http://localhost:3000")

    wait = WebDriverWait(driver, 10)
    login_if_needed(driver, wait)

    find_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), 'מצא סופר')]")))
    find_btn.click()

    location_button = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "location-btn")))
    location_button.click()
    time.sleep(1)

    dropdown = driver.find_element(By.CLASS_NAME, "dropdown")
    for option in dropdown.find_elements(By.TAG_NAME, "option"):
        if option.text == "5 ק״מ":
            option.click()
            break

    #continue_btn = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "continue-btn")))
    #continue_btn.click()
        
    continue_btn = driver.find_element(By.CLASS_NAME, "continue-btn")
    actions = ActionChains(driver)
    actions.move_to_element_with_offset(continue_btn, 5, 5).click().perform()

    time.sleep(0.3)
    cart_btn = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "cart-button")))
    cart_btn.click()

    time.sleep(3)
    wait.until(EC.presence_of_element_located((By.CLASS_NAME, "cart-items")))
    product_elements = driver.find_elements(By.CSS_SELECTOR, ".cart-item .item-details p")
    assert any("ביצים" in el.text for el in product_elements), "Cart did not persist after reload"

    driver.quit()
