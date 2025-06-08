import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./MyProfile.css";
import Footer from "../Footer";
import { UserContext } from "../../context/UserContext";
import { ListsContext } from "../../context/ListsContext";
import { CartContext } from "../../context/CartContext";

const MyProfile = () => {
  const navigate = useNavigate();

  const [activeAccordion, setActiveAccordion] = useState(null);
  const [activeTab, setActiveTab] = useState("account");
  const { user, setUser } = useContext(UserContext);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [lists, setLists] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const { userLists, setCurrentList } = useContext(ListsContext);
  const [activeListId, setActiveListId] = useState(null);

  const [preferences, setPreferences] = useState({});
  const [budget, setBudget] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [supermarketRadius, setSupermarketRadius] = useState("");
  const [accessibility, setAccessibility] = useState(false);
  const [hasDisabledParking, setHasDisabledParking] = useState(false);
  const [hasFreeParking, setHasFreeParking] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [showProductsPopup, setShowProductsPopup] = useState(false);
  const [activeProducts, setActiveProducts] = useState([]);
  const [cartMessage, setCartMessage] = useState("");
  const [userEmoji, setUserEmoji] = useState("");
  const { setCartItems } = useContext(CartContext);

  const handleSubscribe = async (list) => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/subscribe-to-price-drop",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            list_id: list.id,
          }),
        }
      );

      const result = await response.json();
      if (response.ok) {
        alert("📩 You will now receive email updates for price drops!");
      } else {
        alert(result.error || "Failed to subscribe.");
      }
    } catch (err) {
      console.error("Error subscribing to price drop updates", err);
      alert("Something went wrong. Please try again.");
    }
  };

  // fetch lists on mount
  useEffect(() => {
    if (activeTab === "profile") {
      setLists(userLists);
      setCurrentPage(0); // Optional: reset to first page when switching tabs
    }
    console.log("User Lists:", userLists);
  }, [activeTab, userLists]);

  useEffect(() => {}, [userLists]);

  const toggleListOpen = (id) => {
    setActiveListId(activeListId === id ? null : id);
  };

  // Function to handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return setPasswordMessage("🛑 יש למלא את כל השדות.");
    }

    if (newPassword !== confirmPassword) {
      return setPasswordMessage("❌ הסיסמאות החדשות לא תואמות.");
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/change-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            currentPassword,
            newPassword,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        setPasswordMessage("✅ הסיסמה עודכנה בהצלחה!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordMessage(result.error || "❌ שגיאה בעדכון הסיסמה.");
      }
    } catch (error) {
      console.error("Password update error:", error);
      setPasswordMessage("❌ שגיאה בשרת. נסה שוב מאוחר יותר.");
    }
  };

  const toggleAccordion = (index) => {
    setActiveAccordion(activeAccordion === index ? null : index); // Toggle accordion
  };

  const getGreeting = () => {
    const currentHour = new Date().getHours();
    if (currentHour >= 5 && currentHour < 12) {
      return "בוקר טוב";
    } else if (currentHour >= 12 && currentHour < 18) {
      return "צהריים טובים";
    } else if (currentHour >= 18 && currentHour < 22) {
      return "ערב טוב";
    } else {
      return "לילה טוב";
    }
  };

  // Set the emoji ONCE on load
  useEffect(() => {
    const currentHour = new Date().getHours();
    if (currentHour >= 5 && currentHour < 12) {
      setUserEmoji("☀️");
    } else if (currentHour >= 12 && currentHour < 18) {
      setUserEmoji("🌤️");
    } else if (currentHour >= 18 && currentHour < 22) {
      setUserEmoji("🌙");
    } else {
      setUserEmoji("🌜");
    }
  }, []);

  useEffect(() => {
    if (user) {
      // Parse dietary preferences
      if (user?.preferences) {
        try {
          const parsedPreferences =
            typeof user.preferences === "string"
              ? JSON.parse(user.preferences)
              : user.preferences;
          setPreferences(parsedPreferences);
        } catch (error) {
          console.error("Failed to parse preferences:", error);
          setPreferences({});
        }
      }

      // Parse supermarket accessibility preferences
      if (user?.supermarket_attributes) {
        try {
          const parsedAttributes =
            typeof user.supermarket_attributes === "string"
              ? JSON.parse(user.supermarket_attributes)
              : user.supermarket_attributes;

          setAccessibility(
            parsedAttributes.is_supermarket_accessibility || false
          );
          setHasDisabledParking(parsedAttributes.has_disabled_parking || false);
          setHasFreeParking(parsedAttributes.has_free_parking || false);
          setHasDelivery(parsedAttributes.delivery_available || false);
        } catch (error) {
          console.error("Failed to parse supermarket_attributes:", error);
          setAccessibility(false);
          setHasDisabledParking(false);
          setHasFreeParking(false);
          setHasDelivery(false);
        }
      }

      setBudget(user.budget || "weekly");
      setBudgetAmount(user.budget_amount || 0);
      setSupermarketRadius(user.supermarket_radius || 5);
    }
  }, [user]);

  const handleSavePreferences = async () => {
    try {
      const supermarket_attributes = {
        is_supermarket_accessibility: accessibility,
        has_disabled_parking: hasDisabledParking,
        has_free_parking: hasFreeParking,
        delivery_available: hasDelivery,
      };

      const response = await fetch(
        "http://localhost:5000/api/update-preferences",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            preferences,
            supermarket_attributes,
            budget,
            budgetAmount,
            supermarketRadius,
            disabledPermit: accessibility,
          }),
        }
      );

      if (response.ok) {
        alert("✅ השינויים נשמרו בהצלחה!");

        const updatedUser = {
          ...user,
          preferences,
          supermarket_attributes,
          budget,
          budget_amount: budgetAmount,
          supermarket_radius: supermarketRadius,
          disabled_permit: accessibility,
        };

        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        toggleAccordion(0);
      } else {
        const result = await response.json();
        alert(result.error || "שגיאה בשמירת השינויים");
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      alert("שגיאה בשרת. נסה שוב מאוחר יותר.");
    }
  };

  // Helper function
  async function fetchProductsInfo(itemCodes) {
    const response = await fetch(
      `http://localhost:5000/api/products?codes=${itemCodes.join(",")}`
    );
    return response.json(); // should return an array of {item_code, item_name, unit_qty}
  }

  // ... inside handleSearchAgain:

  const handleSearchAgain = (list) => {
    // Parse products as you already do
    let parsedList = { ...list };
    if (typeof parsedList.products === "string") {
      parsedList.products = JSON.parse(parsedList.products);
    }

    // Assume you have access to all product data for enrichment!
    // Otherwise, fetch full metadata here

    // Create full cart item objects:
    const cartArray = Object.entries(parsedList.products).map(
      ([code, prod]) => ({
        ...prod,
        id: code,
        item_code: code,
        name: prod.name || code, // Fallback to code
        image: prod.image || "", // Fallback to empty string
        quantity: prod.quantity || 1,
        unit: prod.unit || "",
      })
    );

    setCartItems(cartArray); // <---- update the cart context directly

    setCurrentList(parsedList);

    // Remove old cart from localStorage if you want a clean slate
    if (user?.email) {
      localStorage.removeItem(`cartItems_${user.email}`);
    }
    navigate("/Address", { state: { fromList: true } });
  };

  return (
    <>
      <div className="profile-container">
        <h1 className="profile-title">
          {getGreeting()}, {user?.first_name} {userEmoji || "משתמש"}
        </h1>
        <ul className="nav-tabs">
          <li
            className={`nav-link ${
              activeTab === "newsletters" ? "active" : ""
            }`}
            onClick={() => setActiveTab("newsletters")}
          >
            ניוזלטרים
          </li>
          <li
            className={`nav-link ${activeTab === "password" ? "active" : ""}`}
            onClick={() => setActiveTab("password")}
          >
            החלפת סיסמא
          </li>
          <li
            className={`nav-link ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            הרשימות שלי
          </li>
          <li
            className={`nav-link ${activeTab === "account" ? "active" : ""}`}
            onClick={() => setActiveTab("account")}
          >
            החשבון שלי
          </li>
        </ul>

        {/* Tabs Content */}
        <div className="tab-content">
          {activeTab === "account" && (
            <div className="tab-pane">
              <p>
                תאריך הרשמה:{" "}
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("he-IL", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "לא ידוע"}
              </p>

              {/* Accordion Section */}
              <div className="accordion">
                <div
                  className={`accordion-item ${
                    activeAccordion === 1 ? "active" : ""
                  }`}
                >
                  <div
                    className="accordion-header"
                    onClick={() => toggleAccordion(1)}
                  >
                    Quick&Pick מנוי
                  </div>
                  {activeAccordion === 1 && (
                    <div className="accordion-content">
                      <p>החשבון שלך פעיל</p>
                      <p>:לשאלות תקלות והצעות, שלחו מייל לכתובת הבאה </p>
                      <p>
                        <a href="/start-trial">Support.qandp@gmail.com</a>
                      </p>
                      <p>
                        השימוש בכפוף <a href="/terms">לתקנון</a>
                      </p>
                    </div>
                  )}
                </div>

                <div
                  className={`accordion-item ${
                    activeAccordion === 2 ? "active" : ""
                  }`}
                >
                  <div
                    className="accordion-header"
                    onClick={() => toggleAccordion(2)}
                  >
                    העדפות
                  </div>
                  {activeAccordion === 2 && (
                    <div className="accordion-content">
                      {/* Preferences Checkboxes */}
                      <div className="personalization-checkbox-group">
                        {Object.keys(preferences).map((key) => (
                          <label key={key}>
                            <input
                              type="checkbox"
                              checked={preferences[key]}
                              onChange={(e) =>
                                setPreferences({
                                  ...preferences,
                                  [key]: e.target.checked,
                                })
                              }
                            />
                            {key.replace(/_/g, " ")}
                          </label>
                        ))}
                      </div>

                      {/* Accessibility Options */}
                      <h3 style={{ marginTop: "20px" }}>העדפות נגישות</h3>
                      <div
                        className="personalization-checkbox-group"
                        style={{ marginTop: "20px" }}
                      >
                        <label>
                          <input
                            type="checkbox"
                            checked={accessibility}
                            onChange={(e) => setAccessibility(e.target.checked)}
                          />
                          סופר נגיש
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={hasDisabledParking}
                            onChange={(e) =>
                              setHasDisabledParking(e.target.checked)
                            }
                          />
                          חניית נכים
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={hasFreeParking}
                            onChange={(e) =>
                              setHasFreeParking(e.target.checked)
                            }
                          />
                          חניה חינם
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={hasDelivery}
                            onChange={(e) => setHasDelivery(e.target.checked)}
                          />
                          אפשרות משלוח
                        </label>
                      </div>

                      {/* Budget Section */}
                      <div className="section-header">תקציב קניות</div>

                      <div className="personalization-budget-container">
                        <label className="personalization-radio-label">
                          אחר
                          <input
                            type="radio"
                            name="budget"
                            value="other"
                            checked={budget === "other"}
                            onChange={(e) => setBudget(e.target.value)}
                          />
                        </label>
                        <label className="personalization-radio-label">
                          שבועי
                          <input
                            type="radio"
                            name="budget"
                            value="weekly"
                            checked={budget === "weekly"}
                            onChange={(e) => setBudget(e.target.value)}
                          />
                        </label>
                        <label className="personalization-radio-label">
                          חודשי
                          <input
                            type="radio"
                            name="budget"
                            value="monthly"
                            checked={budget === "monthly"}
                            onChange={(e) => setBudget(e.target.value)}
                          />
                        </label>
                      </div>

                      <input
                        type="number"
                        name="budgetAmount"
                        placeholder="הכנס סכום"
                        className="personalization-input-small"
                        value={budgetAmount}
                        onChange={(e) => setBudgetAmount(e.target.value)}
                      />

                      {/* Supermarket Radius */}
                      <div className="section-header">
                        מרחק סופרמרקט מועדף (בק״מ)
                      </div>

                      <select
                        name="supermarket_radius"
                        className="personalization-dropdown"
                        value={supermarketRadius}
                        onChange={(e) => setSupermarketRadius(e.target.value)}
                      >
                        {[5, 10, 15, 20, 25, 30].map((km) => (
                          <option key={km} value={km}>
                            {km} ק״מ
                          </option>
                        ))}
                      </select>

                      {/* Save Button */}
                      <button
                        className="personalization-save-button"
                        onClick={handleSavePreferences}
                      >
                        💾 שמור שינויים
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className={`accordion-item ${
                    activeAccordion === 3 ? "active" : ""
                  }`}
                >
                  <div
                    className="accordion-header"
                    onClick={() => toggleAccordion(3)}
                  >
                    סגירת חשבון
                  </div>
                  {activeAccordion === 3 && (
                    <div className="accordion-content">
                      <form>
                        <label>
                          Quick&Pick אם תבחר לסגור את החשבון, לא תוכל להמשיך
                          להשתמש בשירותי
                        </label>
                      </form>
                      <button
                        className="close-account-btn"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              "האם אתה בטוח שברצונך לסגור את החשבון?"
                            )
                          ) {
                            try {
                              const response = await fetch(
                                "http://localhost:5000/api/close-account",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({ email: user.email }),
                                }
                              );

                              if (response.ok) {
                                alert("🛑 החשבון נסגר בהצלחה.");
                                localStorage.removeItem("user");
                                window.location.href = "/";
                              } else {
                                const result = await response.json();
                                alert(result.error || "שגיאה בסגירת החשבון.");
                              }
                            } catch (error) {
                              console.error("Failed to close account:", error);
                              alert("שגיאה בשרת. נסה שוב מאוחר יותר.");
                            }
                          }
                        }}
                      >
                        סגירת חשבון
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="tab-pane">
              <h2>📋 הרשימות שלי</h2>
              {lists.length === 0 ? (
                <p>אין עדיין רשימות שמורות.</p>
              ) : (
                <>
                  <div className="list-container">
                    {lists
                      .slice(currentPage * 3, currentPage * 3 + 3)
                      .map((list) => (
                        <div
                          key={list.id}
                          className={`saved-list ${
                            activeListId === list.id ? "active" : ""
                          }`}
                          onClick={() => toggleListOpen(list.id)}
                        >
                          <div className="list-header">
                            <span>
                              {(() => {
                                const created = new Date(list.created_at + "Z"); // This forces UTC
                                const optionsDate = {
                                  timeZone: "Asia/Jerusalem",
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                };
                                const optionsTime = {
                                  timeZone: "Asia/Jerusalem",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                };
                                return (
                                  <span>
                                    🗓️{" "}
                                    {created.toLocaleDateString(
                                      "he-IL",
                                      optionsDate
                                    )}{" "}
                                    {created.toLocaleTimeString(
                                      "he-IL",
                                      optionsTime
                                    )}
                                  </span>
                                );
                              })()}
                            </span>
                            <div className="list-title-row">
                              <strong>
                                {list.list_name || `רשימה #${list.id}`}
                              </strong>
                              <button
                                className="rename-btn"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const newName = prompt("שנה את שם הרשימה:");
                                  if (newName) {
                                    try {
                                      const response = await fetch(
                                        "http://localhost:5000/api/update-list-name",
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            list_id: list.id,
                                            list_name: newName,
                                          }),
                                        }
                                      );

                                      if (response.ok) {
                                        const updated = lists.map((l) =>
                                          l.id === list.id
                                            ? { ...l, list_name: newName }
                                            : l
                                        );
                                        setLists(updated);
                                      }
                                    } catch (err) {
                                      console.error(
                                        "Failed to update list name:",
                                        err
                                      );
                                    }
                                  }
                                }}
                              >
                                ✏️
                              </button>
                              {cartMessage && (
                                <div className="cart-message">
                                  {cartMessage}
                                </div>
                              )}
                              <button
                                className={`star-btn ${
                                  list.is_favorite ? "starred" : ""
                                }`}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const updatedStatus = list.is_favorite
                                    ? 0
                                    : 1;

                                  try {
                                    const response = await fetch(
                                      "http://localhost:5000/api/update-list-favorite",
                                      {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          list_id: list.id,
                                          is_favorite: updatedStatus,
                                        }),
                                      }
                                    );

                                    if (response.ok) {
                                      const updated = [...lists].map((l) =>
                                        l.id === list.id
                                          ? { ...l, is_favorite: updatedStatus }
                                          : l
                                      );

                                      // Sort: favorites first, then by ID
                                      updated.sort((a, b) => {
                                        if (a.is_favorite === b.is_favorite)
                                          return a.id - b.id;
                                        return b.is_favorite - a.is_favorite;
                                      });

                                      setLists(updated);

                                      // ⭐⭐ Add the notification message here ⭐⭐
                                      const listName =
                                        list.list_name || `רשימה #${list.id}`;
                                      if (updatedStatus === 1) {
                                        setCartMessage(
                                          `⭐ הרשימה "${listName}" נוספה למועדפים`
                                        );
                                      } else {
                                        setCartMessage(
                                          `☆ הרשימה "${listName}" הוסרה מהמועדפים`
                                        );
                                      }
                                      setTimeout(
                                        () => setCartMessage(""),
                                        2000
                                      );
                                    }
                                  } catch (error) {
                                    console.error(
                                      "Failed to update favorite:",
                                      error
                                    );
                                  }
                                }}
                                title="הוסף למועדפים"
                              >
                                {list.is_favorite ? "⭐" : "☆"}
                              </button>
                            </div>
                          </div>

                          {activeListId === list.id && (
                            <div className="list-details">
                              <p>📍 {list.address}</p>
                              <p>
                                💰{" "}
                                {list.total_price
                                  ? `${list.total_price} ₪`
                                  : "מחיר לא זמין"}
                              </p>
                              <div className="preferences-preview">
                                <strong>העדפות תזונה:</strong>{" "}
                                {(() => {
                                  try {
                                    const prefs =
                                      typeof list.dietary_preferences ===
                                      "string"
                                        ? JSON.parse(list.dietary_preferences)
                                        : list.dietary_preferences || {};

                                    const selected = Object.entries(prefs)
                                      .filter(([_, value]) => value === true)
                                      .map(([key]) => key.replace(/_/g, " "))
                                      .join(", ");

                                    return selected || "לא נבחרו העדפות תזונה";
                                  } catch (e) {
                                    console.error(
                                      "⚠️ Failed to parse dietary preferences:",
                                      e
                                    );
                                    return "שגיאה בהצגת העדפות תזונה";
                                  }
                                })()}
                              </div>

                              <div className="preferences-preview">
                                <strong>העדפות נגישות:</strong>{" "}
                                {(() => {
                                  try {
                                    const attr =
                                      typeof list.supermarket_attributes ===
                                      "string"
                                        ? JSON.parse(
                                            list.supermarket_attributes
                                          )
                                        : list.supermarket_attributes || {};

                                    const labels = {
                                      is_supermarket_accessibility: "נגישות ♿",
                                      has_disabled_parking: "חניית נכים 🅿️",
                                      has_free_parking: "חניה חינם 🚗",
                                      delivery_available: "משלוחים 🚚",
                                    };

                                    const selected = Object.entries(attr)
                                      .filter(([_, value]) => value === true)
                                      .map(([key]) => labels[key])
                                      .join(", ");

                                    return selected || "אין העדפות נגישות";
                                  } catch (e) {
                                    console.error(
                                      "⚠️ Failed to parse accessibility preferences:",
                                      e
                                    );
                                    return "שגיאה בהצגת העדפות נגישות";
                                  }
                                })()}
                              </div>

                              <div className="list-actions">
                                <button
                                  className="profile-btn"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const parsedProducts = JSON.parse(
                                      list.products || "{}"
                                    );
                                    const itemCodes =
                                      Object.keys(parsedProducts);

                                    // Fetch product info from server
                                    const codeInfo = await fetchProductsInfo(
                                      itemCodes
                                    );

                                    // Map each product to its metadata
                                    const codeToInfo = {};
                                    codeInfo.forEach((p) => {
                                      codeToInfo[p.item_code] = p;
                                    });

                                    setActiveProducts(
                                      Object.entries(parsedProducts).map(
                                        ([code, values]) => ({
                                          name:
                                            codeToInfo[code]?.item_name || code, // fallback to code if not found
                                          unit:
                                            codeToInfo[code]?.unit_qty ||
                                            values.unit,
                                          quantity: values.quantity,
                                        })
                                      )
                                    );

                                    setShowProductsPopup(true);
                                  }}
                                >
                                  📋 הצג רשימה
                                </button>
                                <button
                                  className="profile-btn"
                                  onClick={() => handleSearchAgain(list)}
                                >
                                  🔍 חיפוש מחדש
                                </button>

                                <button
                                  className="profile-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSubscribe(list);
                                  }}
                                >
                                  📩 קבל עדכון ירידת מחיר
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                  <div className="pagination-controls">
                    <button
                      disabled={currentPage === 0}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      ⬅️
                    </button>
                    <button
                      disabled={(currentPage + 1) * 3 >= lists.length}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      ➡️
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {showProductsPopup && (
            <div
              className="products-popup-overlay"
              onClick={() => setShowProductsPopup(false)}
            >
              <div
                className="products-popup"
                onClick={(e) => e.stopPropagation()}
              >
                <h3>📋 מוצרים ברשימה</h3>
                <ul>
                  {activeProducts.map((prod, idx) => (
                    <li key={idx}>
                      {prod.name} - {prod.quantity} {prod.unit}
                    </li>
                  ))}
                </ul>
                <button
                  className="close-popup-btn"
                  onClick={() => setShowProductsPopup(false)}
                >
                  סגור
                </button>
              </div>
            </div>
          )}

          {activeTab === "newsletters" && (
            <div className="tab-pane">ניוזלטרים</div>
          )}

          {activeTab === "password" && (
            <div className="change-password-section">
              <h4>החלפת סיסמא</h4>
              <form
                className="change-password-form"
                onSubmit={handlePasswordChange}
              >
                <input
                  type="password"
                  placeholder="סיסמא נוכחית"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="סיסמא חדשה"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="אשר סיסמא חדשה"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button className="profile-btn" type="submit">
                  החלפת סיסמא
                </button>
                {passwordMessage && (
                  <p className="password-message">{passwordMessage}</p>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default MyProfile;
