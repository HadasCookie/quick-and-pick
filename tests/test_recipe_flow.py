import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
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
    login_link = wait.until(EC.presence_of_element_located((By.XPATH, "//a[contains(@class, 'log-in-text')]")))
    driver.execute_script("arguments[0].click();", login_link)

    # Optional: Wait for the form to appear
    wait.until(EC.presence_of_element_located((By.TAG_NAME, "form")))

    # Fill in email and password
    email_input = wait.until(EC.presence_of_element_located((By.NAME, "email")))
    password_input = wait.until(EC.presence_of_element_located((By.NAME, "password")))

    email_input.send_keys(credentials["email"])
    password_input.send_keys(credentials["password"])

    # Click login button
    submit_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//form//button[@type='submit']")))
    submit_btn.click()

    # Wait until login completes
    wait.until(EC.presence_of_element_located((By.XPATH, "//button[contains(text(), 'שלום')]")))
    print("Login successful.")


def test_recipe_shopping_flow(driver):
    wait = WebDriverWait(driver, 10)
    actions = ActionChains(driver)

    login_if_needed(driver, wait)

    #Verify that the user is logged in (by checking the greeting button)
    user_button = wait.until(EC.presence_of_element_located((By.XPATH, "//button[contains(text(), 'שלום')]")))
    assert "שלום" in user_button.text

    #Click on "Paste Recipe" to go to the input-recipe page
    recipe_link = driver.find_element(By.XPATH, "//a[contains(text(), 'הדבק מתכון')]")
    actions.move_to_element_with_offset(recipe_link, 5, 5).click().perform()

    #Enter a sample recipe in the textarea
    textarea = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "recipe-input")))
    textarea.send_keys("1 כוס סוכר\n2 כפיות מלח")

    # Click on "Create Shopping List"
    generate_button = driver.find_element(By.CLASS_NAME, "recipe-button")
    actions.move_to_element_with_offset(generate_button, 5, 5).click().perform()

    #Wait for the shopping list to appear
    time.sleep(3)  # You can replace this with a more robust wait if needed
    shopping_list = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "shopping-list")))
    assert "רשימת הקניות שלך" in shopping_list.text

    #Click "Find Supermarket" button (second button with the same class)
    find_button = driver.find_elements(By.CLASS_NAME, "recipe-button")[-1]
    find_button.click()

    # Click the "Use current location" button
    location_button = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "location-btn")))
    location_button.click()

    # Wait a moment to allow address + button to update
    time.sleep(3)

    #Select radius of 30 km from the dropdown
    dropdown = driver.find_element(By.CLASS_NAME, "dropdown")
    for option in dropdown.find_elements(By.TAG_NAME, "option"):
        if option.get_attribute("value") == "30":
            option.click()
            break

    time.sleep(1)

    #continue_btn = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "continue-btn")))
    #continue_btn.click()
        
    continue_btn = driver.find_element(By.CLASS_NAME, "continue-btn")
    actions.move_to_element_with_offset(continue_btn, 5, 5).click().perform()

    #Open the shopping cart by clicking the cart icon button
    cart_btn = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "cart-button")))
    actions.move_to_element_with_offset(cart_btn, 5, 5).click().perform()

    time.sleep(4)

    # Wait until cart items appear
    wait.until(EC.presence_of_element_located((By.CLASS_NAME, "cart-items")))
    
    # Get all product <p> elements inside cart
    product_elements = driver.find_elements(By.CSS_SELECTOR, ".cart-item .item-details p")
    
    # Debug print
    for el in product_elements:
        print("Cart item:", el.text)
    
    # Assert at least one product contains "סוכר"
    assert any("סוכר" in el.text for el in product_elements), "No item in cart contains the word 'סוכר'"

