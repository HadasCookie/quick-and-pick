import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./MyProfile.css";
import Footer from "../Footer";
import { UserContext } from "../../context/UserContext";
import { ListsContext } from "../../context/ListsContext";

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

  const handleReSearch = (list) => {
    setCurrentList(list);
    navigate("/Address");
  };

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
  }, [activeTab, userLists]);

  useEffect(() => {
    console.log("Loaded lists from context:", userLists);
  }, [userLists]);

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

  const [userEmoji, setUserEmoji] = useState("");

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

      setBudget(user.budget || "weekly");
      setBudgetAmount(user.budget_amount || 0);
      setSupermarketRadius(user.supermarket_radius || 5);
      setAccessibility(user.accessibility || false);
      setHasDisabledParking(user.has_disabled_parking || false);
      setHasFreeParking(user.has_free_parking || false);
      setHasDelivery(user.has_delivery || false);
    }
  }, [user]);

  const handleSavePreferences = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/update-preferences",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            preferences,
            budget,
            budgetAmount,
            supermarketRadius,
            accessibility,
            hasDisabledParking,
            hasFreeParking,
            hasDelivery,
          }),
        }
      );

      if (response.ok) {
        alert("✅ השינויים נשמרו בהצלחה!");

        const updatedUser = {
          ...user, // Preserve existing fields like created_at
          preferences,
          budget,
          budget_amount: budgetAmount,
          supermarket_radius: supermarketRadius,
          disabled_permit: accessibility,
        };

        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        toggleAccordion(0); // Close the accordion after saving
      } else {
        const result = await response.json();
        alert(result.error || "שגיאה בשמירת השינויים");
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      alert("שגיאה בשרת. נסה שוב מאוחר יותר.");
    }
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
                      .map((list, idx) => (
                        <div
                          key={list.id}
                          className={`saved-list ${
                            activeListId === list.id ? "active" : ""
                          }`}
                          onClick={() => toggleListOpen(list.id)}
                        >
                          <div className="list-header">
                            <span>
                              🗓️{" "}
                              {new Date(list.created_at).toLocaleDateString(
                                "he-IL"
                              )}{" "}
                              {new Date(list.created_at).toLocaleTimeString(
                                "he-IL",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
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
                              <p>
                                העדפות:{" "}
                                {Object.keys(
                                  JSON.parse(list.preferences || "{}")
                                ).join(", ")}
                              </p>
                              <div className="list-actions">
                                <button
                                  className="profile-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReSearch(list);
                                  }}
                                >
                                  🔁 מצא שוב סופר
                                </button>
                                <button
                                  className="profile-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveProducts(
                                      JSON.parse(list.products || "[]")
                                    );
                                    setShowProductsPopup(true);
                                  }}
                                >
                                  📋 הצג רשימה
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
