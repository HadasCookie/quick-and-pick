import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import json



def login_if_needed(driver, wait):
    try:
        # Check if already logged in
        wait.until(EC.presence_of_element_located((By.XPATH, "//button[contains(text(), 'שלום')]")))
        print("Already logged in.")
        return
    except:
        print("Not logged in, proceeding to login...")

    # Load login credentials from JSON
    with open("tests/login_credentials.json", "r", encoding="utf-8") as f:
        credentials = json.load(f)

    # Click the "משתמש קיים? לחץ כאן" link
    login_link = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(@class, 'log-in-text')]")))
    login_link.click()

    # Fill in the email and password
    email_input = wait.until(EC.presence_of_element_located((By.NAME, "email")))
    password_input = driver.find_element(By.NAME, "password")

    email_input.send_keys(credentials["email"])
    password_input.send_keys(credentials["password"])

    # Click the "התחבר" button
    submit_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'התחבר')]")
    submit_btn.click()

    # Wait until login is successful and greeting appears
    wait.until(EC.presence_of_element_located((By.XPATH, "//button[contains(text(), 'שלום')]")))
    print("Login successful.")

def test_recipe_shopping_flow(driver):
    wait = WebDriverWait(driver, 10)
    login_if_needed(driver, wait)

    # Step 1: Verify that the user is logged in (by checking the greeting button)
    user_button = wait.until(EC.presence_of_element_located((By.XPATH, "//button[contains(text(), 'שלום')]")))
    assert "שלום" in user_button.text

    # Step 2: Click on "Paste Recipe" to go to the input-recipe page
    recipe_link = driver.find_element(By.XPATH, "//a[contains(text(), 'הדבק מתכון')]")
    recipe_link.click()

    # Step 3: Enter a sample recipe in the textarea
    textarea = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "recipe-input")))
    textarea.send_keys("1 כוס סוכר\n2 כפיות מלח")

    # Click on "Create Shopping List"
    generate_button = driver.find_element(By.CLASS_NAME, "recipe-button")
    generate_button.click()

    # Step 4: Wait for the shopping list to appear
    time.sleep(3)  # You can replace this with a more robust wait if needed
    shopping_list = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "shopping-list")))
    assert "רשימת הקניות שלך" in shopping_list.text

    # Step 5: Click "Find Supermarket" button (second button with the same class)
    find_button = driver.find_elements(By.CLASS_NAME, "recipe-button")[-1]
    find_button.click()

    # Step 6: Fill in the address field with a fake address
    address_input = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "address-input")))
    address_input.clear()
    address_input.send_keys("יגאל אלון 148, תל אביב-יפו")

    # Step 7: Select radius of 5 km from the dropdown
    dropdown = driver.find_element(By.CLASS_NAME, "dropdown")
    for option in dropdown.find_elements(By.TAG_NAME, "option"):
        if option.text == "5 ק״מ":
            option.click()
            break

    # Step 8: Click "Continue to find basket"
    continue_btn = driver.find_element(By.CLASS_NAME, "continue-btn")
    continue_btn.click()

    # Step 9: Open the shopping cart by clicking the cart icon button
    cart_btn = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "cart-button")))
    cart_btn.click()

    # Step 10: Verify that one of the recipe items (e.g., sugar) appears in the cart
    cart_items = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "cart-items")))
    assert "סוכר לבן" in cart_items.text or "סוכר" in cart_items.text
