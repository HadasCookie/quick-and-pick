import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import "./InputRecipe.css";
import matchIngredientsToProducts from "../../context/matchIngredientsToProducts";
import Footer from "../Footer";
import { CartContext } from "../../context/CartContext";
import stringSimilarity from "string-similarity";
import Recipes from "../../components/Recipes";

const InputRecipe = () => {
  const [recipeText, setRecipeText] = useState("");
  const [shoppingList, setShoppingList] = useState([]);
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();
  const { setCartItems } = useContext(CartContext);

  // Load products from DB
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/products");
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error("❌ Failed to load products:", err);
        setProducts([]);
      }
    };
    fetchProducts();
  }, []);

  // Food-related categories only!
  const foodCategories = [
    "מזון יבש",
    "מוצרי חלב",
    "בשר",
    "פירות וירקות",
    "מאפים",
    "משקאות",
    "דגנים",
    "קפואים",
    "טבעוני",
    "מוצרי קירור",
  ];

  const filteredProducts = products.filter(
    (p) =>
      p &&
      p.item_name &&
      foodCategories.some((cat) => (p.category || "").includes(cat))
  );

  // When user clicks "צור רשימת קניות"
  const handleGenerateList = () => {
    if (!Array.isArray(filteredProducts) || filteredProducts.length === 0) {
      console.error("Products data is not available");
      return;
    }
    const matchedItems = matchIngredientsToProducts(
      recipeText,
      filteredProducts
    );
    setShoppingList(matchedItems);
  };

  // Find the closest product using string similarity (and price if ties)
  const getBestProductMatch = (ingredientName, foodProducts) => {
    if (!ingredientName) return null;
    const normalizedIng = ingredientName.trim().toLowerCase();

    // 1. Exact match
    let exact = foodProducts.find(
      (p) => p.item_name.trim().toLowerCase() === normalizedIng
    );
    if (exact) return exact;

    // 2. Starts with (strong candidate, AND must be <= 2 tokens for generic ingredients)
    let startsWith = foodProducts.find((p) => {
      const prodName = p.item_name.trim().toLowerCase();
      if (prodName.startsWith(normalizedIng)) {
        if (normalizedIng.length <= 4) {
          // Very short generic ingredient: match only short names
          return prodName.split(" ").length <= 2;
        }
        return true;
      }
      return false;
    });
    if (startsWith) return startsWith;

    // 3. All tokens required
    const tokens = normalizedIng.split(/\s+/);
    let allTokens = foodProducts.find((p) =>
      tokens.every((tok) => p.item_name.toLowerCase().includes(tok))
    );
    if (allTokens) {
      // For generic ingredient, only short product names
      if (
        normalizedIng.length <= 4 &&
        allTokens.item_name.split(" ").length > 2
      )
        return null;
      return allTokens;
    }

    // 4. String similarity (threshold >= 0.75 for generic, >= 0.6 otherwise)
    const candidates = foodProducts.map((p) => p.item_name);
    const { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(
      normalizedIng,
      candidates
    );
    const minThreshold = normalizedIng.length <= 4 ? 0.75 : 0.6;
    if (bestMatch.rating > minThreshold && foodProducts[bestMatchIndex]) {
      // Again, short names only for generic
      if (
        normalizedIng.length <= 4 &&
        foodProducts[bestMatchIndex].item_name.split(" ").length > 2
      )
        return null;
      return foodProducts[bestMatchIndex];
    }

    // 5. Nothing found
    return null;
  };

  // When user clicks "חפש בסופר"
  const handleSearchSupermarket = () => {
    const cart = shoppingList
      .map((recipeItem) => {
        const match = getBestProductMatch(recipeItem.name, filteredProducts);
        if (match) {
          return {
            id: match.item_code,
            name: match.item_name,
            quantity: recipeItem.quantity,
            unit: recipeItem.unit,
            image: match.image_url || "",
          };
        }
        return null;
      })
      .filter(Boolean);

    setCartItems(cart);
    navigate("/Address");
  };

  const handleRecipeSelect = (text) => {
    setRecipeText(text);
  };

  return (
    <>
      <div className="recipe-container">
        <h1 className="recipe-title"> 🥣 הכנס מתכון</h1>
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
              {shoppingList.map((item, index) => (
                <li key={index}>
                  {item.name} - {item.quantity} {item.unit}
                </li>
              ))}
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
