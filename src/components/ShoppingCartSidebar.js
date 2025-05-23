import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import "./ShoppingCartSidebar.css";
import { UserContext } from "../context/UserContext";
import { LocationContext } from "../context/LocationContext";
import { ListsContext } from "../context/ListsContext";

const ShoppingCartSidebar = ({
  isOpen,
  onClose,
  cartItems,
  removeItem,
  clearCart,
  currentList,
}) => {
  const { address } = useContext(LocationContext); // Get context value
  const navigate = useNavigate();
  console.log("currentList", currentList);

  const { user } = useContext(UserContext);
  const { userLists, setUserLists } = useContext(ListsContext);

  const handleSaveList = async () => {
    if (cartItems.length === 0) {
      alert("🛒 העגלה ריקה, לא ניתן לשמור רשימה ריקה.");
      return;
    }

    // Normalize products
    const cartProducts = {};
    cartItems.forEach((item) => {
      if (item.name && item.quantity > 0) {
        cartProducts[item.name] = {
          price: item.price,
          unit: item.unit,
          quantity: item.quantity,
        };
      }
    });

    // Duplicate check
    const existingList = userLists.find(
      (list) =>
        JSON.stringify(JSON.parse(list.products)) ===
        JSON.stringify(cartProducts)
    );
    if (existingList) {
      alert(
        `📦 רשימה זהה כבר קיימת בשם: "${
          existingList.list_name || `רשימה #${existingList.id}`
        }"`
      );
      return;
    }

    // List name prompt
    const usedNames = userLists
      .map((list) => list.list_name)
      .filter((name) => /^רשימה #\d+$/.test(name));
    const usedNumbers = usedNames.map((name) => parseInt(name.split("#")[1]));
    const nextNumber = Math.max(0, ...usedNumbers) + 1;
    const newListNumber = nextNumber;

    const listName =
      prompt(
        `רשימה #${newListNumber} נשמרה! האם ברצונך לשנות את שמה?`,
        `רשימה #${newListNumber}`
      ) || `רשימה #${newListNumber}`;

    const prefs = currentList?.preferences || user.preferences || {};
    const supermarketAttrs =
      currentList?.supermarket_attributes || user.supermarket_attributes || {};

    console.log("supermarketAttrs", supermarketAttrs);
    console.log("prefs", prefs);

    const payload = {
      user_id: user.id,
      list_name: listName,
      address: currentList?.address || address,
      supermarket_radius:
        currentList?.supermarket_radius || user.supermarket_radius || 5,
      preferences: prefs,
      supermarket_attributes: supermarketAttrs,
      products: cartProducts,
      is_favorite: 0,
      total_price: null,
    };

    console.log(
      "🧾 Final payload being sent:",
      JSON.stringify(payload, null, 2)
    );

    try {
      const res = await fetch("http://localhost:5000/api/save-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert(`✅ "${listName}" נשמרה בהצלחה בפרופיל שלי!`);
        const saved = await res.json();

        const formattedList = {
          ...saved,
          created_at: saved.created_at
            ? new Date(saved.created_at).toISOString()
            : new Date().toISOString(),
        };

        setUserLists([...userLists, formattedList]);
      } else {
        const error = await res.json();
        alert("❌ שגיאה בשמירה: " + (error.error || "שגיאה לא מזוהה"));
      }
    } catch (err) {
      console.error("Save failed:", err);
      alert("שגיאה בחיבור לשרת.");
    }
  };

  const handleSendSMS = async () => {
    if (!user?.phone) {
      alert("לא ניתן לשלוח SMS ללא מספר טלפון.");
      return;
    }

    const cartProducts = {};
    cartItems.forEach((item) => {
      cartProducts[item.name] = {
        price: 0,
        unit: item.unit,
        quantity: item.quantity,
      };
    });

    try {
      const res = await fetch("http://localhost:5000/api/send-list-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: user.phone, // clean value like "972549505840"
          list_name: "רשימת קניות Quick&Pick",
          products: cartProducts,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        alert("📩 רשימה נשלחה ב-SMS בהצלחה!");
      } else {
        alert("❌ שגיאה בשליחת SMS: " + (result.error || "שגיאה לא מזוהה"));
      }
    } catch (err) {
      console.error("SMS Error:", err);
      alert("❌ בעיה בשליחת SMS. בדוק את החיבור לשרת.");
    }
  };

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
        <button className="action-btn" onClick={handleSaveList}>
          💾 שמור רשימה
        </button>
        <button className="action-btn" onClick={handleSendSMS}>
          📩 שלח בסמס
        </button>
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
