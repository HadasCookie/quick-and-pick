import React, { useState, useEffect, useRef } from "react";
import "./Products.css";

const Products = () => {
  const [inputText, setInputText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [debouncedInput, setDebouncedInput] = useState("");
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const suggestionsRef = useRef(null);

  const measurementUnits = ["גרם", "כף", "כוס"]; // Grams, Tablespoon, Cup

  const fetchSuggestions = async (searchTerm) => {
    if (!searchTerm) return setSuggestions([]);

    try {
      const response = await fetch(
        `http://localhost:5000/api/suggestions?q=${encodeURIComponent(
          searchTerm
        )}&source=fd`
      );
      if (!response.ok) throw new Error("API Error");

      const data = await response.json();

      // ✅ Extract only the 'value' field (product name) from each object
      const suggestionsList = data.map((item) => item.value).filter(Boolean);

      setSuggestions(suggestionsList);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInput(inputText);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputText]);

  useEffect(() => {
    if (debouncedInput) fetchSuggestions(debouncedInput);
  }, [debouncedInput]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    setActiveSuggestion(0);
  };

  const handleAddItem = (item) => {
    if (!selectedItems.some((i) => i.name === item)) {
      setSelectedItems([
        ...selectedItems,
        { name: item, quantity: 1, unit: "גרם" },
      ]);
    }
    setInputText("");
    setSuggestions([]);
  };

  const handleQuantityChange = (index, value) => {
    setSelectedItems((prevItems) =>
      prevItems.map((item, i) =>
        i === index
          ? { ...item, quantity: Math.max(1, Math.min(999, value)) }
          : item
      )
    );
  };

  const handleUnitChange = (index, newUnit) => {
    setSelectedItems((prevItems) =>
      prevItems.map((item, i) =>
        i === index ? { ...item, unit: newUnit } : item
      )
    );
  };

  return (
    <div className="container">
      <h2>חפש מוצרים</h2>
      <input
        type="text"
        value={inputText}
        onChange={handleInputChange}
        placeholder="...הכנס שם מוצר"
        className="input-field"
      />

      {suggestions.length > 0 && (
        <ul className="suggestions" ref={suggestionsRef}>
          {suggestions.map((item, index) => (
            <li
              key={index}
              className={index === activeSuggestion ? "active" : ""}
              onClick={() => handleAddItem(item)}
            >
              {item}
            </li>
          ))}
        </ul>
      )}

      <h2>:רשימת הקניות</h2>
      <ul className="selected-items">
        {selectedItems.map((item, index) => (
          <li key={index} className="shopping-item">
            <span className="item-name">{item.name}</span>
            <div className="quantity-controls">
              <button
                onClick={() => handleQuantityChange(index, item.quantity - 1)}
              >
                -
              </button>
              <input
                type="number"
                value={item.quantity}
                className="quantity-input"
                min="1"
                max="999"
                onChange={(e) =>
                  handleQuantityChange(index, parseInt(e.target.value) || 1)
                }
                onDoubleClick={(e) => e.target.select()}
              />
              <button
                onClick={() => handleQuantityChange(index, item.quantity + 1)}
              >
                +
              </button>
            </div>
            <select
              value={item.unit}
              onChange={(e) => handleUnitChange(index, e.target.value)}
              className="unit-select"
            >
              {measurementUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Products;
