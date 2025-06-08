import React, { useState, useEffect, useContext } from "react";
import { useLocation } from "react-router-dom";
import "./FindCheapest.css";
import ShoppingCartSidebar from "../ShoppingCartSidebar";
import Footer from "../Footer";
import { ListsContext } from "../../context/ListsContext";
import { UserContext } from "../../context/UserContext";
import { CartContext } from "../../context/CartContext";

const images = [
  "/images/shufersalSale.jpeg",
  "/images/victory1.jpg",
  "/images/tivTaamSale.jpg",
];

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
  // const [products, setProducts] = useState(fakeProducts);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const { user } = useContext(UserContext);
  const { cartItems, setCartItems, addItem, removeItem, clearCart } =
    useContext(CartContext);
  const [rawCartItems, setRawCartItems] = useState([]);
  const { clearCart: contextClearCart } = useContext(CartContext);

  const [cartMessage, setCartMessage] = useState("");
  const { currentList, setCurrentList } = useContext(ListsContext);

  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  // State to track search input and selected product
  const [searchTerm, setSearchTerm] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [selectedSearchProduct, setSelectedSearchProduct] = useState(null);
  const location = useLocation();

  // Update search term with debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchTerm.length >= 2) {
        const suggestions = products
          .map((p) => p.name)
          .filter((name) =>
            name.toLowerCase().startsWith(searchTerm.toLowerCase())
          );
        setSearchSuggestions(suggestions);
      } else {
        setSearchSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchTerm, products]);

  // Handle search selection
  const handleSearchSelect = (productName) => {
    const product = products.find((p) => p.name === productName);
    if (product) {
      setSelectedSearchProduct(product);
    }
    setSearchTerm("");
    setSearchSuggestions([]);
  };

  useEffect(() => {
    if (!productSearch) {
      setSearchResults([]);
    } else {
      const searchTerm = productSearch.toLowerCase();
      const matches = products.filter((p) =>
        p.name.toLowerCase().includes(searchTerm)
      );
      setSearchResults(matches);
    }
  }, [productSearch, products]);

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

  useEffect(() => {
    if (!user?.id || currentList) return;

    const fetchLastList = async () => {
      try {
        const responseLastList = await fetch(
          `http://localhost:5000/api/user-last-list?user_id=${user?.id}`
        );
        const lastList = await responseLastList.json();

        if (lastList && lastList.products) {
          setCurrentList({
            ...lastList,
            products:
              typeof lastList.products === "string"
                ? JSON.parse(lastList.products)
                : lastList.products,
          });
        } else {
          setCurrentList({ products: [] });
        }
      } catch (error) {
        console.error("Error fetching last list:", error);
      }
    };

    fetchLastList();
  }, [user, setCurrentList, currentList]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/products");
        const data = await res.json();
        const formatted = data.map((p) => ({
          id: p.item_code,
          name: p.item_name,
          category: p.category,
          subcategory: p.subcategory,
          quantity: 0,
          unit: p.unit_qty,
          image: p.image_url || "/images/veggies/red-apple.jpg",
        }));
        setProducts(formatted);
      } catch (err) {
        console.error("❌ Failed to load products:", err);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    let loadedCart = [];

    // 1. If we're coming from a saved list, use currentList.products
    if (
      location.state?.fromList &&
      currentList &&
      currentList.products &&
      Object.keys(currentList.products).length > 0
    ) {
      loadedCart = Object.entries(currentList.products).map(([code, prod]) => ({
        ...prod,
        id: code,
        item_code: code,
      }));
      if (user?.email) {
        localStorage.setItem(
          `cartItems_${user.email}`,
          JSON.stringify(loadedCart)
        );
      }
      setRawCartItems(loadedCart);
      return; // prevent fallback
    }

    // 2. Otherwise, load from localStorage
    if (user?.email) {
      const stored = localStorage.getItem(`cartItems_${user.email}`);
      if (stored) {
        loadedCart = JSON.parse(stored);
      }
    }
    setRawCartItems(loadedCart);
  }, [user, currentList, location.state]);

  useEffect(() => {
    if (!products.length || !rawCartItems.length) {
      setCartItems([]);
      return;
    }

    const enriched = rawCartItems.map((cartItem) => {
      const prod = products.find(
        (p) => p.id === cartItem.id || p.id === cartItem.item_code
      );
      return {
        ...cartItem,
        name: prod?.name || cartItem.name || cartItem.id,
        image: prod?.image || cartItem.image || "",
        unit: prod?.unit || cartItem.unit,
      };
    });

    setCartItems(enriched);
  }, [products, rawCartItems, setCartItems]);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const handleCategoryClick = (category) => {
    setSelectedSearchProduct(null); // Clear search result
    setSearchTerm(""); // Clear search input
    setSearchSuggestions([]);
    if (category.hasSubcategories) {
      setSelectedCategory(category.name);
      setSelectedSubCategory(null);
    } else {
      setSelectedCategory(category.name);
      setSelectedSubCategory(null);
    }
  };

  const handleSubCategoryClick = (subcategory) => {
    setSelectedSearchProduct(null); // Clear search result
    setSearchTerm(""); // Clear search input
    setSearchSuggestions([]);
    setSelectedSubCategory(subcategory);
  };

  const handleProductClick = (productId) => {
    setSelectedProductId(productId);

    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.id === productId
          ? {
              ...product,
              quantity:
                product.quantity === 0
                  ? product.category === "פירות וירקות"
                    ? 0.5
                    : 1
                  : product.quantity, // If already selected, keep quantity
            }
          : {
              ...product,
              quantity: 0, // Unselect all others
            }
      )
    );

    // For search-selected product
    if (
      selectedSearchProduct &&
      selectedSearchProduct.id === productId &&
      selectedSearchProduct.quantity === 0
    ) {
      setSelectedSearchProduct({
        ...selectedSearchProduct,
        quantity: selectedSearchProduct.category === "פירות וירקות" ? 0.5 : 1,
      });
    }
  };

  const updateQuantity = (productId, newQuantity) => {
    setProducts((products) => {
      const updatedProducts = products.map((product) => {
        if (product.id === productId) {
          const isFruitOrVeggie = product.category === "פירות וירקות";
          const minQuantity = isFruitOrVeggie ? 0.5 : 1;
          const updatedQuantity =
            newQuantity < minQuantity ? minQuantity : newQuantity;
          return { ...product, quantity: updatedQuantity };
        }
        return product;
      });

      // Update selectedSearchProduct if relevant
      if (selectedSearchProduct && selectedSearchProduct.id === productId) {
        const updatedProduct = updatedProducts.find((p) => p.id === productId);
        setSelectedSearchProduct({ ...updatedProduct });
      }

      return updatedProducts;
    });
  };

  const addToCart = (product) => {
    setRawCartItems((prevCart) => {
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
    setTimeout(() => setCartMessage(""), 2000);
  };

  // Filter products based on selected category and subcategory
  let filteredProducts = [];

  // CASE 1: Default (no category selected): show only last list products
  if (
    (!selectedCategory || selectedCategory === "הכל") &&
    currentList?.products &&
    Object.keys(currentList.products).length > 0
  ) {
    filteredProducts = products.filter((product) =>
      Object.keys(currentList.products).includes(product.name)
    );
  }
  // CASE 2: Category selected: show ALL products for that category (not only from last list)
  else if (selectedCategory) {
    filteredProducts = products.filter((product) => {
      if (selectedCategory && product.category !== selectedCategory)
        return false;
      if (selectedSubCategory && product.subcategory !== selectedSubCategory)
        return false;
      return true;
    });
  } else {
    // fallback: show nothing or everything as you like (usually nothing)
    filteredProducts = [];
  }

  const displayedItems = productSearch ? searchResults : filteredProducts;

  const handleClearCart = () => {
    contextClearCart(); // clears cartItems in context
    setRawCartItems([]); // clears local rawCartItems
    if (user?.email) {
      localStorage.removeItem(`cartItems_${user.email}`);
    }
  };

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
          clearCart={handleClearCart}
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

        {/* Search Bar */}
        <div className="product-search-box">
          <input
            type="text"
            className="search-input"
            value={searchTerm}
            placeholder="...חפש מוצר לפי שם"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchSuggestions.length > 0 && (
            <ul className="search-suggestions">
              {searchSuggestions.map((suggestion, index) => (
                <li key={index} onClick={() => handleSearchSelect(suggestion)}>
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Products Section */}
        <div className="products-section">
          {selectedSearchProduct ? (
            <div
              className="product-card"
              key={selectedSearchProduct.id}
              onClick={() => handleProductClick(selectedSearchProduct.id)}
            >
              <img
                src={selectedSearchProduct.image}
                alt={selectedSearchProduct.name}
                className="product-image"
              />
              <div className="product-info">
                <h3>{selectedSearchProduct.name}</h3>
                {selectedSearchProduct.quantity > 0 && (
                  <div className="quantity-container">
                    <button
                      className="quantity-btn"
                      onClick={() =>
                        updateQuantity(
                          selectedSearchProduct.id,
                          selectedSearchProduct.quantity -
                            (selectedSearchProduct.category === "פירות וירקות"
                              ? 0.5
                              : 1)
                        )
                      }
                      disabled={
                        selectedSearchProduct.quantity <=
                        (selectedSearchProduct.category === "פירות וירקות"
                          ? 0.5
                          : 1)
                      }
                    >
                      -
                    </button>
                    <span>
                      {selectedSearchProduct.quantity}{" "}
                      {selectedSearchProduct.category === "פירות וירקות"
                        ? "ק״ג"
                        : "יחידות"}
                    </span>
                    <button
                      className="quantity-btn"
                      onClick={() =>
                        updateQuantity(
                          selectedSearchProduct.id,
                          selectedSearchProduct.quantity +
                            (selectedSearchProduct.category === "פירות וירקות"
                              ? 0.5
                              : 1)
                        )
                      }
                    >
                      +
                    </button>
                  </div>
                )}
                {(selectedSearchProduct.quantity >= 0.5 ||
                  selectedSearchProduct.quantity >= 1) && (
                  <button
                    className="add-to-cart"
                    onClick={() => addToCart(selectedSearchProduct)}
                  >
                    הוסף לעגלה
                  </button>
                )}
              </div>
            </div>
          ) : (
            displayedItems.map((product) => (
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
            ))
          )}
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
