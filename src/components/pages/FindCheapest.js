import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "../../context/UserContext";
import "./FindCheapest.css";
import ShoppingCartSidebar from "../ShoppingCartSidebar";
import Footer from "../Footer";
import { ListsContext } from "../../context/ListsContext";

const images = ["/images/carousel1.jpg", "/images/carousel2.jpg"];

// Fake Products Data
const fakeProducts = [
  // Fruits & Vegetables (measured by KG)
  {
    id: 1,
    name: "תפוח",
    category: "פירות וירקות",
    subcategory: "פירות",
    quantity: 0,
    unit: "ק״ג",
    image: "/images/veggies/red-apple.jpg",
  },
  {
    id: 2,
    name: "אננס",
    category: "פירות וירקות",
    subcategory: "פירות",
    quantity: 0,
    unit: "ק״ג",
    image: "/images/veggies/anannas.jpg",
  },
  {
    id: 3,
    name: "תפוז",
    category: "פירות וירקות",
    subcategory: "פירות",
    quantity: 0,
    unit: "ק״ג",
    image: "/images/veggies/orange.jpg",
  },
  {
    id: 4,
    name: "מלפפון",
    category: "פירות וירקות",
    subcategory: "ירקות",
    quantity: 0,
    unit: "ק״ג",
    image: "/images/veggies/cucamber.jpg",
  },
  {
    id: 5,
    name: "גמבה",
    category: "פירות וירקות",
    subcategory: "ירקות",
    quantity: 0,
    unit: "ק״ג",
    image: "/images/veggies/gamba.jpg",
  },
  {
    id: 6,
    name: "בצל",
    category: "פירות וירקות",
    subcategory: "ירקות",
    quantity: 0,
    unit: "ק״ג",
    image: "/images/veggies/onion.jpg",
  },

  // Dairy & Eggs (measured by Unit)
  {
    id: 7,
    name: "גבינה צהובה",
    category: "מוצרי חלב וביצים",
    subcategory: "חמאה גבינות צהובות וקשות",
    quantity: 0,
    unit: "יח",
    image: "https://imageproxy.wolt.com/assets/6679480ea81b94465521a645",
  },
  {
    id: 8,
    name: "טיוב יוגורט תות יופלה",
    category: "מוצרי חלב וביצים",
    subcategory: "יוגורט ומעדנים",
    quantity: 0,
    unit: "יח",
    image: "https://imageproxy.wolt.com/assets/67751b4672e07c6625dc2052",
  },
  {
    id: 9,
    name: "חלב בטעם של פעם תנובה",
    category: "מוצרי חלב וביצים",
    subcategory: "חלב",
    quantity: 0,
    unit: "יח",
    image: "https://imageproxy.wolt.com/assets/66979cf2ddf40a236879fc9c",
  },
  {
    id: 10,
    name: "חלב תנובה עמיד",
    category: "מוצרי חלב וביצים",
    subcategory: "חלב",
    quantity: 0,
    unit: "יח",
    image: "https://imageproxy.wolt.com/assets/66794626a81b944655219a08",
  },
  {
    id: 11,
    name: "חלב תנובה עיזים 4%",
    category: "מוצרי חלב וביצים",
    subcategory: "חלב",
    quantity: 0,
    unit: "יח",
    image: "https://imageproxy.wolt.com/assets/66979d3178d7d84d1e9b98af",
  },
  {
    id: 12,
    name: "חלב דל לקטוז טרה",
    category: "מוצרי חלב וביצים",
    subcategory: "חלב",
    quantity: 0,
    unit: "יח",
    image: "https://imageproxy.wolt.com/assets/667947307cb0090848ace3bd",
  },
  {
    id: 13,
    name: "חלב טרה 3%",
    category: "מוצרי חלב וביצים",
    subcategory: "חלב",
    quantity: 0,
    unit: "יח",
    image: "https://imageproxy.wolt.com/assets/66793b4e34063d58fe45e430",
  },
];

const categories = [
  { name: "פירות וירקות", icon: "🍏", hasSubcategories: true },
  { name: "מאפים", icon: "🥖" },
  { name: "מוצרי חלב וביצים", icon: "🥛" },
  { name: "בשר עוף ודגים", icon: "🍖" },
  { name: "טבעוני וצמחוני", icon: "🌱" },
  { name: "מזון קפוא ובקירור", icon: "❄️" },
  { name: "משקאות", icon: "🥤" },
  { name: "מזון יבש", icon: "🥫" },
  { name: "חטיפים ודגני בוקר", icon: "🍫" },
  { name: "פארם נקיון וטואלטיקה", icon: "🧴" },
];

const FindCheapest = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [products, setProducts] = useState(fakeProducts);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const { user } = useContext(UserContext);
  const [cartItems, setCartItems] = useState(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const savedCart = storedUser
      ? localStorage.getItem(`cartItems_${storedUser.email}`)
      : null;
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [cartMessage, setCartMessage] = useState("");
  const { currentList } = useContext(ListsContext);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  useEffect(() => {
    if (user?.email) {
      localStorage.setItem(
        `cartItems_${user.email}`,
        JSON.stringify(cartItems)
      );
    }
  }, [cartItems, user]);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const handleCategoryClick = (category) => {
    if (category.hasSubcategories) {
      setSelectedCategory(category.name);
      setSelectedSubCategory(null);
    } else {
      setSelectedCategory(category.name);
      setSelectedSubCategory(null);
    }
  };

  const handleSubCategoryClick = (subcategory) => {
    setSelectedSubCategory(subcategory);
  };

  const handleProductClick = (productId) => {
    if (selectedProductId === productId) return; // Prevent re-clicking from resetting

    setSelectedProductId(productId);
    setProducts((prevProducts) =>
      prevProducts.map(
        (product) =>
          product.id === productId
            ? {
                ...product,
                quantity: product.category === "פירות וירקות" ? 0.5 : 1,
              } // Auto set to 0.5 kg on first click
            : { ...product, quantity: 0 } // Reset others to 0
      )
    );
  };

  const updateQuantity = (productId, newQuantity) => {
    setProducts(
      products.map((product) => {
        if (product.id === productId) {
          // Check if the product belongs to "פירות וירקות"
          const isFruitOrVeggie = product.category === "פירות וירקות";

          // Set minimum quantity
          const minQuantity = isFruitOrVeggie ? 0.5 : 1;

          // Prevent going below the minimum allowed quantity
          const updatedQuantity =
            newQuantity < minQuantity ? minQuantity : newQuantity;

          return { ...product, quantity: updatedQuantity };
        }
        return product;
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
    if (user?.email) {
      localStorage.removeItem(`cartItems_${user.email}`);
    }
  };

  const addToCart = (product) => {
    setCartItems((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);

      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + product.quantity,
                unit: product.unit,
              }
            : item
        );
      } else {
        return [
          ...prevCart,
          { ...product, quantity: product.quantity, unit: product.unit },
        ];
      }
    });

    // Show notification message
    setCartMessage(`${product.name} נוסף לעגלה`);
    setTimeout(() => setCartMessage(""), 2000); // Hide message after 2 seconds
  };

  const removeItem = (itemId, ItemName) => {
    setCartItems((prevCart) => prevCart.filter((item) => item.id !== itemId));

    // Show notification message
    setCartMessage(`${ItemName} הוסר מהעגלה`);
    setTimeout(() => setCartMessage(""), 2000); // Hide message after 2 seconds
  };

  // Filter products based on selected category and subcategory
  const filteredProducts = products.filter((product) => {
    // Show all products when "הכל" is selected
    if (!selectedCategory || selectedCategory === "הכל") {
      return true;
    }

    // Handle "פירות וירקות" separately since it has subcategories
    if (selectedCategory === "פירות וירקות") {
      if (!selectedSubCategory || selectedSubCategory === "הכל") {
        return product.category === "פירות וירקות";
      }
      return product.subcategory === selectedSubCategory;
    }

    // Handle Dairy & Eggs (מוצרי חלב וביצים) properly
    if (selectedCategory === "מוצרי חלב וביצים") {
      if (!selectedSubCategory || selectedSubCategory === "הכל") {
        return product.category === "מוצרי חלב וביצים";
      }
      return product.subcategory === selectedSubCategory;
    }

    // General case for categories that don't have subcategories
    return product.category === selectedCategory;
  });

  return (
    <>
      <div className="find-cheapest-container">
        {/* Carousel */}
        <div className="carousel-wrapper">
          <button className="carousel-btn left" onClick={handlePrev}>
            ◀
          </button>
          <div className="carousel-container">
            <div
              className="carousel-track"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt="Slider"
                  className="carousel-image"
                />
              ))}
            </div>
          </div>
          <button className="carousel-btn right" onClick={handleNext}>
            ▶
          </button>
        </div>

        {/* Shopping Cart Button */}
        {!isCartOpen && (
          <button
            className="cart-button"
            onClick={() => setIsCartOpen(!isCartOpen)}
          >
            🛒
          </button>
        )}

        {/* Sidebar for Shopping Cart */}
        <ShoppingCartSidebar
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cartItems={cartItems}
          removeItem={removeItem}
          clearCart={clearCart}
          currentList={currentList}
        />

        {/* Categories Section */}
        <div className="categories-section">
          <h2>קטגוריות מוצרים</h2>
          <div className="categories-grid">
            {categories.map((category, index) => (
              <div
                key={index}
                className={`category-card ${
                  selectedCategory === category.name ? "selected" : ""
                }`}
                onClick={() => handleCategoryClick(category)}
              >
                <span className="category-icon">{category.icon}</span>
                <span className="category-name">{category.name}</span>
              </div>
            ))}
          </div>

          {/* Subcategories for Fruits & Vegetables */}
          {selectedCategory === "פירות וירקות" && (
            <div className="subcategories">
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "ירקות" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("ירקות")}
              >
                ירקות
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "פירות" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("פירות")}
              >
                פירות
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "פירות יבשים ופיצוחים" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("פירות יבשים ופיצוחים")}
              >
                פירות יבשים ופיצוחים
              </button>
              <button
                className={`subcategory-btn ${
                  !selectedSubCategory ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick(null)}
              >
                הכל
              </button>
            </div>
          )}

          {/* Subcategories for Bakery */}
          {selectedCategory === "מאפים" && (
            <div className="subcategories">
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "קרקרים ופירכיות" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("קרקרים ופירכיות")}
              >
                קרקרים ופירכיות
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "לחם לחמניות ופיתות" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("לחם לחמניות ופיתות")}
              >
                לחם לחמניות ופיתות
              </button>
              <button
                className={`subcategory-btn ${
                  !selectedSubCategory ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick(null)}
              >
                הכל
              </button>
            </div>
          )}

          {/* Subcategories for Dairy & Eggs */}
          {selectedCategory === "מוצרי חלב וביצים" && (
            <div className="subcategories">
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "ביצים" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("ביצים")}
              >
                ביצים
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "גבינות לבנות וקוטג׳" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("גבינות לבנות וקוטג׳")}
              >
                גבינות לבנות וקוטג׳
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "חלב" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("חלב")}
              >
                חלב
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "חמאה גבינות צהובות וקשות"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleSubCategoryClick("חמאה גבינות צהובות וקשות")
                }
              >
                חמאה גבינות צהובות וקשות
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "יוגורט ומעדנים" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("יוגורט ומעדנים")}
              >
                יוגורט ומעדנים
              </button>
              <button
                className={`subcategory-btn ${
                  !selectedSubCategory ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick(null)}
              >
                הכל
              </button>
            </div>
          )}

          {/* Subcategories for Meat & Fish */}
          {selectedCategory === "בשר עוף ודגים" && (
            <div className="subcategories">
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "בשר" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("בשר")}
              >
                בשר
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "דגים" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("דגים")}
              >
                דגים
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "עוף" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("עוף")}
              >
                עוף
              </button>
              <button
                className={`subcategory-btn ${
                  !selectedSubCategory ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick(null)}
              >
                הכל
              </button>
            </div>
          )}

          {/* Subcategories for Vegan & Vegetarian */}
          {selectedCategory === "טבעוני וצמחוני" && (
            <div className="subcategories">
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "טופו" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("טופו")}
              >
                טופו
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "תחליפי גבינות ומעדנים"
                    ? "active"
                    : ""
                }`}
                onClick={() => handleSubCategoryClick("תחליפי גבינות ומעדנים")}
              >
                תחליפי גבינות ומעדנים
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "תחליפי בשר" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("תחליפי בשר")}
              >
                תחליפי בשר
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "תחליפי חלב" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("תחליפי חלב")}
              >
                תחליפי חלב
              </button>
              <button
                className={`subcategory-btn ${
                  !selectedSubCategory ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick(null)}
              >
                הכל
              </button>
            </div>
          )}

          {selectedCategory === "מזון קפוא ובקירור" && (
            <div className="subcategories">
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "בצקים" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("בצקים")}
              >
                בצקים
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "גלידות וארטיקים" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("גלידות וארטיקים")}
              >
                גלידות וארטיקים
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "חומוס וסלטים" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("חומוס וסלטים")}
              >
                חומוס וסלטים
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "ירקות ופירות קפואים" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("ירקות ופירות קפואים")}
              >
                ירקות ופירות קפואים
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "מזון קפוא ומקורר" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("מזון קפוא ומקורר")}
              >
                מזון קפוא ומקורר
              </button>
              <button
                className={`subcategory-btn ${
                  !selectedSubCategory ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick(null)}
              >
                הכל
              </button>
            </div>
          )}

          {selectedCategory === "משקאות" && (
            <div className="subcategories">
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "מים וסודה" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("מים וסודה")}
              >
                מים וסודה
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "משקאות חריפים" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("משקאות חריפים")}
              >
                משקאות חריפים
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "משקאות קלים" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("משקאות קלים")}
              >
                משקאות קלים
              </button>
              <button
                className={`subcategory-btn ${
                  !selectedSubCategory ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick(null)}
              >
                הכל
              </button>
            </div>
          )}

          {selectedCategory === "מזון יבש" && (
            <div className="subcategories">
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "אורז וקטניות" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("אורז וקטניות")}
              >
                אורז וקטניות
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "רטבים וממרחים" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("רטבים וממרחים")}
              >
                רטבים וממרחים
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "מוצרי אפייה" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("מוצרי אפייה")}
              >
                מוצרי אפייה
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "מוצרי מרק ותבלינים" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("מוצרי מרק ותבלינים")}
              >
                מוצרי מרק ותבלינים
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "פסטות ופתיתים" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("פסטות ופתיתים")}
              >
                פסטות ופתיתים
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "שימורים" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("שימורים")}
              >
                שימורים
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "שמן חומץ ומיץ לימון" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("שמן חומץ ומיץ לימון")}
              >
                שמן חומץ ומיץ לימון
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "תה וקפה" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("תה וקפה")}
              >
                תה וקפה
              </button>
              <button
                className={`subcategory-btn ${
                  !selectedSubCategory ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick(null)}
              >
                הכל
              </button>
            </div>
          )}

          {selectedCategory === "חטיפים ודגני בוקר" && (
            <div className="subcategories">
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "דגני בוקר וחטיפי אנרגיה"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleSubCategoryClick("דגני בוקר וחטיפי אנרגיה")
                }
              >
                דגני בוקר וחטיפי אנרגיה
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "חטיפים מלוחים" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("חטיפים מלוחים")}
              >
                חטיפים מלוחים
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "ממתקים" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("ממתקים")}
              >
                ממתקים
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "עוגות ועוגיות" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("עוגות ועוגיות")}
              >
                עוגות ועוגיות
              </button>
              <button
                className={`subcategory-btn ${
                  !selectedSubCategory ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick(null)}
              >
                הכל
              </button>
            </div>
          )}

          {selectedCategory === "פארם נקיון וטואלטיקה" && (
            <div className="subcategories">
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "הגיינה נשית" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("הגיינה נשית")}
              >
                הגיינה נשית
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "הגיינת הפה" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("הגיינת הפה")}
              >
                הגיינת הפה
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "מוצרי ניקוי" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("מוצרי ניקוי")}
              >
                מוצרי ניקוי
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "מוצרי תינוקות" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("מוצרי תינוקות")}
              >
                מוצרי תינוקות
              </button>
              <button
                className={`subcategory-btn ${
                  selectedSubCategory === "מוצרי סבון ושיער" ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick("מוצרי סבון ושיער")}
              >
                מוצרי סבון ושיער
              </button>
              <button
                className={`subcategory-btn ${
                  !selectedSubCategory ? "active" : ""
                }`}
                onClick={() => handleSubCategoryClick(null)}
              >
                הכל
              </button>
            </div>
          )}
        </div>

        {/* Products Section */}
        <div className="products-section">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="product-card"
              onClick={() => handleProductClick(product.id)}
            >
              <img
                src={product.image}
                alt={product.name}
                className="product-image"
              />
              <div className="product-info">
                <h3>{product.name}</h3>
                {product.quantity > 0 && (
                  <div className="quantity-container">
                    <button
                      className="quantity-btn"
                      onClick={() =>
                        updateQuantity(
                          product.id,
                          product.quantity -
                            (product.category === "פירות וירקות" ? 0.5 : 1)
                        )
                      }
                      disabled={
                        product.quantity <=
                        (product.category === "פירות וירקות" ? 0.5 : 1)
                      }
                    >
                      -
                    </button>
                    <span>
                      {product.quantity}{" "}
                      {product.category === "פירות וירקות" ? "ק״ג" : "יחידות"}
                    </span>
                    <button
                      className="quantity-btn"
                      onClick={() =>
                        updateQuantity(
                          product.id,
                          product.quantity +
                            (product.category === "פירות וירקות" ? 0.5 : 1)
                        )
                      }
                    >
                      +
                    </button>
                  </div>
                )}
                {(product.quantity >= 0.5 || product.quantity >= 1) && (
                  <button
                    className="add-to-cart"
                    onClick={() => addToCart(product)}
                  >
                    הוסף לעגלה
                  </button>
                )}
              </div>
            </div>
          ))}
          {cartMessage && (
            <div className="cart-notification">{cartMessage}</div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default FindCheapest;
