import React, { useState, useContext } from "react";
import "./MyProfile.css";
import Footer from "../Footer";
import { UserContext } from "../../context/UserContext"; // make sure the path is correct

const MyProfile = () => {
  const [activeAccordion, setActiveAccordion] = useState(null);
  const [activeTab, setActiveTab] = useState("account");
  const { user } = useContext(UserContext);

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

  return (
    <>
      <div className="profile-container">
        <h1 className="profile-title">
          {getGreeting()}, {user?.name || "משתמש"}
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
            פרופיל
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
              <p>תאריך הרשמה: 01.03.2025</p>

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
                      <p>חשבון לא פעיל</p>
                      <p>
                        חשבון ניסיון לא הופעל עדיין,{" "}
                        <a href="/start-trial">הפעלת חשבון ניסיון</a>
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
                      <p>
                        <a href="/filters">סינונים לחיפוש מוצרים</a> (אלרגניים)
                      </p>
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
                    פרטיות
                  </div>
                  {activeAccordion === 3 && (
                    <div className="accordion-content">
                      <form>
                        <label>
                          מסכים לשתף את המוצרים שלי בצורה אנונימית
                          <input type="checkbox" checked />
                        </label>
                      </form>
                      <p>
                        השימוש באחריות המשתמש בלבד.{" "}
                        <a href="/terms">לתנאי השימוש</a>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="tab-pane">פרופיל אישי</div>
          )}

          {activeTab === "newsletters" && (
            <div className="tab-pane">ניוזלטרים</div>
          )}

          {activeTab === "password" && (
            <div className="tab-pane">
              <form>
                <label>סיסמא נוכחית</label>
                <input type="password" className="input-field" />
                <label>סיסמא חדשה</label>
                <input type="password" className="input-field" />
                <label>אשר סיסמא חדשה</label>
                <input type="password" className="input-field" />
                <button className="profile-btn">החלפת סיסמא</button>
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
