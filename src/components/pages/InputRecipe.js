import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import "./InputRecipe.css";
import matchIngredientsToProducts from "../../context/matchIngredientsToProducts";
import Footer from "../Footer";
import { CartContext } from "../../context/CartContext";
import Recipes from "../../components/Recipes";

const InputRecipe = () => {
  const [recipeText, setRecipeText] = useState("");
  const [shoppingList, setShoppingList] = useState([]);
  const [products, setProducts] = useState([]);
  const [isGeneratingList, setIsGeneratingList] = useState(false);
  const [isFindingSupermarket, setIsFindingSupermarket] = useState(false);
  const navigate = useNavigate();
  const { setCartItems } = useContext(CartContext);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/products");
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error("Failed to load products:", err);
        setProducts([]);
      }
    };
    fetchProducts();
  }, []);

  const handleGenerateList = async () => {
    if (!recipeText.trim()) return;
    setIsGeneratingList(true);
    try {
      const matchedItems = await matchIngredientsToProducts(recipeText);
      setShoppingList(matchedItems);
    } catch (error) {
      console.error("Failed to generate shopping list:", error);
      setShoppingList([]);
    } finally {
      setIsGeneratingList(false);
    }
  };

  const handleRemoveItem = (indexToRemove) => {
    setShoppingList((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleAlternativeSelect = (index, selectedBarcode) => {
    setShoppingList((prevList) => {
      const newList = [...prevList];
      const selectedOption = newList[index].options.find(
        (opt) => opt.barcode === selectedBarcode
      );
      if (selectedOption) {
        newList[index] = {
          ...newList[index],
          name: selectedOption.product,
          matched_product: selectedOption.product,
          barcode: selectedOption.barcode,
          unit: selectedOption.unit,
          manufacturer: selectedOption.manufacturer,
        };
      }
      return newList;
    });
  };

  const handleSearchSupermarket = async () => {
    setIsFindingSupermarket(true);

    try {
      const cart = shoppingList
        .filter((item) => item.barcode && item.matched_product !== null)
        .map((item) => {
          const product = products.find((p) => p.item_code === item.barcode);
          return {
            id: item.barcode,
            name: item.name || item.matched_product || "מוצר לא מזוהה",
            quantity: item.quantity || 1,
            unit: item.unit || "",
            image: product?.image_url || "",
          };
        });

      console.log("Setting cart items:", cart); // Debug log
      setCartItems(cart);

      // Add a small delay to show the loading screen before navigation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log("Navigating to /Address"); // Debug log
      navigate("/Address");
    } catch (error) {
      console.error("Error in handleSearchSupermarket:", error);
    } finally {
      setIsFindingSupermarket(false);
    }
  };

  const handleRecipeSelect = (text) => {
    setRecipeText(text);
  };

  return (
    <>
      {isGeneratingList && (
        <div className="loading-overlay">
          <div className="spinner" />
          <div className="loading-text">...יוצר רשימת קניות</div>
        </div>
      )}

      {isFindingSupermarket && (
        <div className="loading-overlay">
          <div className="spinner" />
          <div className="loading-text">...מחפש סופרים מתאימים</div>
        </div>
      )}

      <div className="recipe-container">
        <h1 className="recipe-title">🥣 הכנס מתכון</h1>
        <textarea
          className="recipe-input"
          value={recipeText}
          onChange={(e) => setRecipeText(e.target.value)}
          placeholder="...כתוב את רשימת המרכיבים"
        />
        <button className="recipe-button" onClick={handleGenerateList}>
          🛒 צור רשימת קניות
        </button>

        {shoppingList.length > 0 && (
          <button className="recipe-button" onClick={handleSearchSupermarket}>
            🎉 חפש סופר
          </button>
        )}

        {shoppingList.length > 0 && (
          <div className="shopping-list">
            <h3>:רשימת הקניות שלך</h3>
            <ul>
              {shoppingList.map((item, index) => {
                const isUnmatched = item.matched_product === null;

                return (
                  <li
                    key={index}
                    className={isUnmatched ? "unmatched-item" : "matched-item"}
                  >
                    {isUnmatched ? (
                      <div className="unmatched-item-container">
                        <div>
                          לא נמצא מוצר תואם עבור{" "}
                          <strong>
                            {item.ingredient || item.original_line}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <div className="matched-item-container">
                        <div className="matched-item-header">
                          <div>
                            <strong>{item.name || item.matched_product}</strong>{" "}
                            - {item.quantity || "1"} {item.unit || ""}
                          </div>
                          <button
                            className="remove-button"
                            onClick={() => handleRemoveItem(index)}
                          >
                            הסר
                          </button>
                        </div>

                        {item.options?.length > 0 && (
                          <select
                            className="alt-select"
                            onChange={(e) =>
                              handleAlternativeSelect(index, e.target.value)
                            }
                            value=""
                            dir="rtl"
                          >
                            <option disabled value="">
                              בחר מוצר חלופי
                            </option>
                            {item.options.map((opt, i) => (
                              <option
                                key={i}
                                value={opt.barcode}
                                disabled={opt.barcode === item.barcode}
                              >
                                {opt.product} ({opt.unit}) - התאמה:{" "}
                                {opt.confidence.toFixed(2)}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      <Recipes onRecipeSelect={handleRecipeSelect} />
      <Footer />
    </>
  );
};

export default InputRecipe;
