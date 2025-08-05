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
    try {
      const matchedItems = await matchIngredientsToProducts(recipeText);
      setShoppingList(matchedItems);
    } catch (error) {
      console.error("Failed to generate shopping list:", error);
      setShoppingList([]);
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

  const handleSearchSupermarket = () => {
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

    setCartItems(cart);
    navigate("/Address");
  };

  const handleRecipeSelect = (text) => {
    setRecipeText(text);
  };

  return (
    <>
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
                  <li key={index} style={{ color: isUnmatched ? "red" : "black" }}>
                    {isUnmatched ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row-reverse",
                          justifyContent: "space-between",
                          width: "100%",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          לא נמצא מוצר תואם עבור{" "}
                          <strong>{item.ingredient || item.original_line}</strong>
                        </div>
                        <button
                          className="remove-button"
                          onClick={() => handleRemoveItem(index)}
                          style={{ marginRight: "12px" }}
                        >
                          הסר מהרשימה
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "row-reverse",
                            justifyContent: "space-between",
                            width: "100%",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <strong>{item.name || item.matched_product}</strong> -{" "}
                            {item.quantity || "1"} {item.unit || ""}
                          </div>
                          <button
                            className="remove-button"
                            onClick={() => handleRemoveItem(index)}
                            style={{ marginRight: "12px" }}
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
                            style={{ marginTop: "8px", width: "100%" }}
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
