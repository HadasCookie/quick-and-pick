import React, { useState, useEffect, useContext } from "react";
import JSConfetti from "js-confetti";
import { useLocation, useNavigate } from "react-router-dom";
import "./SupermarketResults.css";
import Footer from "../Footer";
import { ListsContext } from "../../context/ListsContext";
import { UserContext } from "../../context/UserContext";

const SupermarketResults = () => {
  const location = useLocation();
  const results = location.state?.results || [];
  const lastSavedListId = location.state?.lastSavedListId;
  const { fetchUserLists } = useContext(ListsContext);
  const { user } = useContext(UserContext);

  const [expandedStoreId, setExpandedStoreId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const jsConfetti = new JSConfetti();
    jsConfetti.addConfetti({
      confettiColors: [
        "#3a1e4d", // Deep purple
        "#562c72", // Dark lavender
        "#e7baf2", // Light pink-purple
        "#f6e5fa", // Soft lavender background
        "#1e1028", // Deep background
        "#ffffff", // White for contrast
      ],
      confettiNumber: 100,
    });
  }, []);

  if (!results || results.length === 0) {
    return <div className="no-results">🔍 No matching supermarkets found.</div>;
  }

  const sorted = [...results].sort((a, b) => {
    // Put missing match_ratio last
    if (a.match_ratio === undefined || a.match_ratio === null) return 1;
    if (b.match_ratio === undefined || b.match_ratio === null) return -1;
    // Both have match_ratio, sort as before
    if (b.match_ratio !== a.match_ratio) return b.match_ratio - a.match_ratio;
    // Lower total_cost is better
    return a.total_cost - b.total_cost;
  });

  console.log("Raw store sample:", sorted[0]);

  const handleUpdateList = () => {
    navigate("/FindCheapest");
  };

  const toggleStoreOptions = (storeId) => {
    setExpandedStoreId(expandedStoreId === storeId ? null : storeId);
    const store = results.find((s) => s.store_id === storeId);
    console.log("Store data", store);
  };

  const top3 = sorted.slice(0, 3).map((s) => s.store_id);

  const handleSendSMS = (store) => {
    alert(`📩 שליחת רשימה של ${store.store_name} תתווסף בהמשך.`);
  };

  const handleRenameList = async (store) => {
    if (!lastSavedListId) {
      alert("לא נמצאה רשימה לעדכן. נסה לעדכן את העמוד.");
      return;
    }
    const newName = prompt("הזן שם חדש לרשימה:") || store.list_name;
    if (!newName) return;

    try {
      // Update name
      const renameRes = await fetch(
        "http://localhost:5000/api/update-list-name",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            list_id: lastSavedListId,
            list_name: newName,
          }),
        }
      );

      // Update price
      const priceRes = await fetch(
        "http://localhost:5000/api/update-list-price",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            list_id: lastSavedListId,
            total_price: store.total_cost,
          }),
        }
      );

      if (renameRes.ok && priceRes.ok) {
        alert(
          `✅ הרשימה נשמרה בשם "${newName}" והמחיר (${store.total_cost} ₪) נשמר`
        );
        await fetchUserLists(user.id);
      } else {
        alert("❌ שגיאה בשמירת הרשימה או המחיר");
      }
    } catch (e) {
      alert("❌ שגיאה בשמירת הרשימה או המחיר");
    }
  };

  // Returns a string of matching attribute tags
  const getStoreAttributes = (store) => {
    const attrs = [];
    if (store.delivery_available === 1) attrs.push("משלוחים 🚚");
    if (store.has_free_parking === 1) attrs.push("חניה חינם🚗");
    if (store.supermarket_accessibility === 1) attrs.push("נגישות ♿");
    return attrs; // return array, not join
  };

  // This is for showing "שעות היום: ..."
  const getTodayHours = (opening_hours_raw) => {
    let opening_hours;
    try {
      opening_hours =
        typeof opening_hours_raw === "string"
          ? JSON.parse(opening_hours_raw)
          : opening_hours_raw;
    } catch {
      return "לא ידוע";
    }
    const days = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
    const weekday = days[new Date().getDay()];
    return opening_hours && opening_hours[weekday]
      ? opening_hours[weekday]
      : "לא ידוע";
  };

  function getStoreStatus(opening_hours_raw) {
    let opening_hours;
    if (!opening_hours_raw) {
      return { text: "שעות לא ידועות", color: "#888" };
    }
    try {
      opening_hours =
        typeof opening_hours_raw === "string"
          ? JSON.parse(opening_hours_raw)
          : opening_hours_raw;
    } catch {
      return { text: "שעות לא ידועות", color: "#888" };
    }
    const days = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
    const now = new Date();
    const weekday = days[now.getDay()];
    const todayHours = opening_hours[weekday];

    if (!todayHours || todayHours.includes("סגור")) {
      return { text: "סגור היום", color: "#c42d47" };
    }
    // Example: "07:30–14:00"
    const match = todayHours.match(/(\d{2}):(\d{2})–(\d{2}):(\d{2})/);
    if (!match) return { text: "שעות לא ידועות", color: "#888" };

    const open = parseInt(match[1]) + parseInt(match[2]) / 60;
    const close = parseInt(match[3]) + parseInt(match[4]) / 60;
    const nowHour = now.getHours() + now.getMinutes() / 60;
    const minutesToClose = (close - nowHour) * 60;

    if (nowHour < open || nowHour >= close) {
      return { text: "סגור ❌", color: "#c42d47" };
    } else if (minutesToClose <= 60) {
      return { text: "נסגר בקרוב ⏰", color: "#e67e22" };
    } else {
      return { text: "פתוח ✅", color: "#32b655" };
    }
  }

  return (
    <>
      <div className="results-container">
        <h2> 🛒 הסופרים המומלצים</h2>
        {sorted.map((store, index) => {
          const isTop = top3.includes(store.store_id);

          return (
            <div
              key={store.store_id}
              className={`store-card ${isTop ? "top-store" : ""} ${
                expandedStoreId === store.store_id ? "active" : ""
              }`}
              onClick={() => toggleStoreOptions(store.store_id)}
            >
              <div className="store-header-grid rtl">
                <span className="rank">
                  #{index + 1}
                  {/* Open/close status next to rank */}
                  <span
                    style={{
                      marginRight: "8px",
                      fontWeight: "bold",
                      color: getStoreStatus(store.opening_hours).color,
                      fontSize: "1rem",
                    }}
                    className="store-status"
                  >
                    {getStoreStatus(store.opening_hours).text}
                  </span>
                </span>
                <span className="chain">
                  {store.chain_name}
                  {store.chain_image && (
                    <img
                      src={store.chain_image}
                      alt={store.chain_name}
                      className="chain-logo"
                    />
                  )}
                </span>
                <span className="distance">
                  📍 {store.distance.toFixed(2)} ק״מ
                </span>
              </div>

              {/* New: Attributes row, centered */}
              <div className="store-attributes">
                {getStoreAttributes(store).map((attr) => (
                  <div className="attr-chip-vertical" key={attr}>
                    {attr}
                  </div>
                ))}
              </div>
              <div className="today-hours">
                <strong>שעות היום:</strong> {getTodayHours(store.opening_hours)}
              </div>

              <div className="store-info rtl">
                <p>
                  <strong>כתובת:</strong> {store.address}
                </p>
                <p>
                  <strong>אחוז התאמה:</strong>{" "}
                  {store.match_ratio !== undefined && store.match_ratio !== null
                    ? (store.match_ratio * 100).toFixed(0) + "%"
                    : "לא זמין"}
                </p>
                <p>
                  <strong>מחיר הסל:</strong>{" "}
                  {store.total_cost !== undefined && store.total_cost !== null
                    ? `₪${store.total_cost}`
                    : ""}
                </p>
              </div>

              {expandedStoreId === store.store_id && (
                <div className="store-options-slide">
                  <div className="store-products-list">
                    <table className="product-table">
                      <thead>
                        <tr>
                          <th>מוצר</th>
                          <th>כמות</th>
                          <th>יחידה</th>
                          <th>מחיר (ליח')</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(store.products || []).length > 0 ? (
                          store.products.map((prod) => (
                            <tr
                              key={store.store_id + "_" + prod.item_code}
                              className={prod.missing ? "missing-product" : ""}
                            >
                              <td>
                                {prod.name || prod.item_code}
                                {prod.missing && (
                                  <span className="missing-product-text">
                                    {" "}
                                    (לא קיים בחנות)
                                  </span>
                                )}
                              </td>
                              <td>{prod.quantity}</td>
                              <td>{prod.unit}</td>
                              <td>
                                {prod.missing ? (
                                  <span className="missing-product-text">
                                    ❌ חסר
                                  </span>
                                ) : prod.price !== undefined &&
                                  prod.price !== null ? (
                                  `₪${Number(prod.price).toFixed(2)}`
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4}>לא נמצאו מוצרים לסופר זה</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="options-buttons">
                    <button
                      className="send-btn"
                      onClick={() => handleSendSMS(store)}
                      disabled={!lastSavedListId}
                    >
                      📩 שליחה בסמס
                    </button>
                    <button
                      className="save-btn"
                      onClick={() => handleRenameList(store)}
                    >
                      💾 שמירת רשימה
                    </button>
                    <button className="save-btn" onClick={handleUpdateList}>
                      🔄 עדכון רשימה
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Footer />
    </>
  );
};

export default SupermarketResults;
