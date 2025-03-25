import React, { useState, useEffect } from "react";
import "./InputRecipe.css";
import matchIngredientsToProducts from "../../context/matchIngredientsToProducts";

const InputRecipe = () => {
  const [recipeText, setRecipeText] = useState("");
  const [shoppingList, setShoppingList] = useState([]);
  const [products, setProducts] = useState([]); // Ensure products are properly loaded

  useEffect(() => {
    // Fetch or set product data here
    setProducts([
      { name: "חלב", category: "מוצרי חלב" },
      { name: "קמח", category: "מוצרים יבשים" },
      { name: "סוכר", category: "מוצרי יסוד" },
      { name: "מלח", category: "תבלינים" },
    ]);
  }, []);

  const handleGenerateList = () => {
    if (!Array.isArray(products) || products.length === 0) {
      console.error("Products data is not available");
      return;
    }

    const matchedItems = matchIngredientsToProducts(recipeText, products);
    setShoppingList(matchedItems);
  };

  return (
    <div className="recipe-container">
      <h1 className="recipe-title">הכנס מתכון</h1>
      <textarea
        className="recipe-input"
        value={recipeText}
        onChange={(e) => setRecipeText(e.target.value)}
        placeholder="...כתוב את רשימת המרכיבים"
      />
      <button className="recipe-button" onClick={handleGenerateList}>
        צור רשימת קניות
      </button>

      {shoppingList.length > 0 && (
        <div className="shopping-list">
          <h3>:רשימת הקניות שלך</h3>
          <ul>
            {shoppingList.map((item, index) => (
              <li key={index}>
                {item.name} - {item.quantity} {item.unit}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default InputRecipe;
