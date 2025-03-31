import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import "./ShoppingCartSidebar.css"; // Import the updated CSS
import { LocationContext } from "../context/LocationContext"; // Import the LocationContext
import { CartContext } from "../context/CartContext";

const ShoppingCartSidebar = ({
  isOpen,
  onClose,
  cartItems,
  removeItem,
  clearCart,
}) => {
  const { address } = useContext(LocationContext); // Get context value
  const navigate = useNavigate();

  return (
    <div className={`shopping-cart-sidebar ${isOpen ? "open" : ""}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <h3>🛍️ עגלת הקניות שלי</h3>
        <button className="close-btn" onClick={onClose}>
          ✖
        </button>
      </div>

      {/* Sidebar Actions (All Buttons in One Row) */}
      <div className="sidebar-actions">
        <button className="action-btn" onClick={clearCart}>
          🧹 נקה עגלה
        </button>
        <button className="action-btn">💾 שמור רשימה</button>
        <button className="action-btn">📩 שלח בסמס</button>
      </div>
      <button
        className="change-location-btn"
        onClick={() => navigate("/Address")}
      >
        📍{address}
      </button>

      <div className="cart-items">
        {cartItems.length === 0 ? (
          <p className="empty-cart">העגלה ריקה</p>
        ) : (
          cartItems.map((item) => (
            <div className="cart-item" key={item.id}>
              <img src={item.image} alt={item.name} />
              <div className="item-details">
                <p>{item.name}</p>
                <p>
                  כמות: {item.quantity}{" "}
                  {item.category === "פירות וירקות" ||
                  item.category === "בשר עוף ודגים"
                    ? "ק״ג"
                    : "'יח"}
                </p>
                <button
                  className="remove-item-btn"
                  onClick={() => removeItem(item.id, item.name)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Find Supermarket Button */}
      <button className="find-super-btn">🔍 מצא סופר</button>
    </div>
  );
};

export default ShoppingCartSidebar;
