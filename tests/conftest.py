import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

@pytest.fixture(scope="module")
def driver():
    options = Options()

    # Allow geolocation in Chrome preferences
    options.add_experimental_option("prefs", {
        "profile.default_content_setting_values.geolocation": 1
    })

    # Prevent geolocation permission prompt
    options.add_argument("--use-fake-ui-for-media-stream")

    # Set window size for consistent layout rendering
    options.add_argument("--window-size=1920,1080")

    # Initialize the Chrome WebDriver
    driver = webdriver.Chrome(options=options)

    # Simulate a fixed geolocation (Yigal Alon 148, Tel Aviv)
    driver.execute_cdp_cmd("Emulation.setGeolocationOverride", {
        "latitude": 32.0696,
        "longitude": 34.7943,
        "accuracy": 100
    })

    # Open the web application
    driver.get("http://localhost:3000/")

    # Debug: verify the location received in browser context
    position = driver.execute_script("""
        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                pos => resolve({lat: pos.coords.latitude, lon: pos.coords.longitude}),
                err => resolve({error: err.message})
            );
        });
    """)
    print(" Simulated browser geolocation:", position)

    yield driver

    # Close the browser after tests
    driver.quit()
