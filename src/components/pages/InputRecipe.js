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
      { name: "חלב סויה", category: "מוצרי חלב" },
      { name: "חלב שקדים", category: "מוצרי חלב" },
      { name: "חומץ", category: "מזון יבש" },
      { name: "שמן", category: "מזון יבש" },
      { name: "סוכר חום", category: "מזון יבש" },
      { name: "תמצית וניל", category: "מזון יבש" },
      { name: "רסק תפוחים", category: "מוצרי טבעוני" },
      { name: "קמח כוסמין", category: "מזון יבש" },
      { name: "קמח חיטה", category: "מזון יבש" },
      { name: "אבקת קקאו", category: "מזון יבש" },
      { name: "אבקת אפייה", category: "מזון יבש" },
      { name: "קרם קוקוס", category: "מוצרי קירור" },
      { name: "שוקולד מריר", category: "ממתקים" },
      { name: "חמאת אגוזים", category: "ממרחים" },
      { name: "סוכריות צבעוניות", category: "קישוטים" },
      { name: "אגוזים", category: "קישוטים" },
      { name: "תותים", category: "פירות" },
      { name: "דובדבנים", category: "פירות" },
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
