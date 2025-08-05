import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

@pytest.fixture(scope="module")
def driver():
    options = Options()
    options.add_argument("--headless")  
    options.add_argument("--window-size=1920,1080")
    driver = webdriver.Chrome(options=options)
    driver.get("http://localhost:3000/") 
    yield driver
    driver.quit()