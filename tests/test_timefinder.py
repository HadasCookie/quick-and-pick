import time
import pytest
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
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

# === Non-functional test: Response time under 5 seconds ===
def test_supermarket_finder_response_time(driver):
    wait = WebDriverWait(driver, 10)
    actions = ActionChains(driver)
    login_if_needed(driver, wait)


    find_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), 'מצא סופר')]")))
    actions.move_to_element_with_offset(find_btn, 5, 5).click().perform()


    location_button = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "location-btn")))
    actions.move_to_element_with_offset(location_button, 5, 5).click().perform()
    time.sleep(4)  # Wait for location detection to complete


    dropdown = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "dropdown")))
    for option in dropdown.find_elements(By.TAG_NAME, "option"):
        if option.text == "5 ק״מ":
            option.click()
            break
    
    time.sleep(3)


    btn = driver.find_element(By.CLASS_NAME, "continue-btn")
    actions.move_to_element_with_offset(btn, 5, 5).click().perform()

    time.sleep(2) 

    search_input = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "search-input")))
    search_input.clear()
    search_input.send_keys("קולה זירו")

    suggestion = wait.until(EC.element_to_be_clickable(
        (By.XPATH, "//ul[contains(@class, 'search-suggestions')]//li[contains(text(), 'קולה זירו 1 ליטר')]")
    ))
    actions.move_to_element_with_offset(suggestion, 5, 5).click().perform()

    product = wait.until(EC.element_to_be_clickable(
        (By.XPATH, "//div[contains(@class, 'product-card')]//h3[contains(text(), 'קולה זירו 1 ליטר')]")
    ))
    actions.move_to_element_with_offset(product, 5, 5).click().perform()

    add_btn = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "add-to-cart")))
    actions.move_to_element_with_offset(add_btn, 5, 5).click().perform()


    cart_btn = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "cart-button")))
    actions.move_to_element_with_offset(cart_btn, 5, 5).click().perform()
    time.sleep(3)  # Wait for the cart to load

    # Start measuring time before click
    find_supermarket_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'מצא סופר')]")))

    start_time = time.time()
    actions.move_to_element_with_offset(find_supermarket_btn, 5, 5).click().perform()

    # --- Handle unexpected alert if appears ---
    try:
        supermarket_cards = WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((By.CLASS_NAME, "store-card"))
        )
    except Exception as e:
        # Check if alert appeared
        try:
            alert = driver.switch_to.alert
            print("Unexpected alert during supermarket loading:", alert.text)
            alert.accept()
            pytest.fail(f"Test failed due to alert: {alert.text}")
        except:
            pytest.fail(f"Unexpected exception: {e}")
        return

    end_time = time.time()

    response_time = end_time - start_time
    print(f"Supermarket recommendations loaded in {response_time:.2f} seconds")
    
    assert response_time <= 10, "Recommendations took longer than 5 seconds to load"
    assert len(supermarket_cards) > 0, "No supermarkets were displayed"

    driver.quit()
