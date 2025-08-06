import React, { useState, useContext } from "react";
import { UserContext } from "../../context/UserContext"; // adjust path if needed
import { useNavigate } from "react-router-dom";
import "./SignUp.css";
import Footer from "../Footer";

const SignUp = () => {
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    birthDate: "",
    gender: "",
    city: "",
    supermarket_radius: 5,
    disabledPermit: false,
    preferences: {
      ללא_גלוטן: false,
      ללא_סוכר: false,
      כשרות: false,
      צמחוני: false,
      טבעוני: false,
      חלבון_גבוה: false,
    },
    budget: "weekly",
    budgetAmount: "",
    newsletter: false,
    marketingUpdates: false,
  });

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name in formData.preferences) {
      setFormData({
        ...formData,
        preferences: { ...formData.preferences, [name]: checked },
      });
    } else if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setMessage("הסיסמאות אינן תואמות ❌");
      setIsLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (formData.password.length < 6) {
      setMessage("הסיסמה חייבת להכיל לפחות 6 תווים ❌");
      setIsLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.status === 409) {
        // Duplicate email error
        setMessage(
          "❌ האימייל כבר קיים במערכת. אנא השתמש באימייל אחר או התחבר לחשבון הקיים."
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (response.status === 400) {
        setMessage("❌ נא למלא את כל השדות החיוניים");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (response.status === 500) {
        setMessage("❌ שגיאה בשרת. אנא נסה שוב מאוחר יותר");
        alert("❌ שגיאה בשרת. אנא נסה שוב מאוחר יותר");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (response.ok) {
        // ✅ Success
        if (result.user) {
          localStorage.setItem("user", JSON.stringify(result.user));
          setUser(result.user);
        }

        setMessage("✅ משתמש נרשם בהצלחה!");
        alert("🎉 ברוך הבא ל-Quick&Pick!\nההרשמה הושלמה בהצלחה!");

        // Reset form fields
        setFormData({
          first_name: "",
          last_name: "",
          email: "",
          password: "",
          confirmPassword: "",
          phone: "",
          birthDate: "",
          gender: "",
          city: "",
          supermarket_radius: 5,
          disabledPermit: false,
          preferences: {
            ללא_גלוטן: false,
            ללא_סוכר: false,
            כשרות: false,
            צמחוני: false,
            טבעוני: false,
            חלבון_גבוה: false,
          },
          budget: "weekly",
          budgetAmount: "",
          newsletter: false,
          marketingUpdates: false,
        });

        navigate("/MyProfile");
      } else {
        setMessage(result.error || "❌ שגיאה לא צפויה. אנא נסה שוב");
        alert(result.error || "❌ שגיאה לא צפויה. אנא נסה שוב");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (error) {
      setMessage("❌ שגיאה בחיבור לשרת. בדוק את החיבור לאינטרנט ונסה שוב");
      alert("❌ שגיאה בחיבור לשרת\n\nבדוק את החיבור לאינטרנט ונסה שוב");
      console.error("❌ Fetch error:", error);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="container">
        <h2>הרשמה</h2>
        {message && (
          <p
            className={`message ${
              message.includes("❌") ? "error" : "success"
            }`}
          >
            {message}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <div className="label-input-container">
            <input
              type="text"
              name="last_name"
              placeholder="שם משפחה"
              className="input-field"
              value={formData.last_name}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="first_name"
              placeholder="שם פרטי"
              className="input-field"
              value={formData.first_name}
              onChange={handleChange}
              required
            />
          </div>
          <input
            type="email"
            name="email"
            placeholder="אימייל"
            className="input-field"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="phone"
            placeholder="טלפון"
            className="input-field"
            value={formData.phone}
            onChange={handleChange}
            required
          />
          <div className="label-input-container">
            <input
              type="date"
              name="birthDate"
              className="input-field-birthdate"
              value={formData.birthDate}
              onChange={handleChange}
              required
            />
            <label className="label-text">:תאריך לידה</label>
          </div>
          <div className="budget-container">
            <label className="radio-label">
              זכר
              <input
                type="radio"
                name="gender"
                value="male"
                checked={formData.gender === "male"}
                onChange={handleChange}
              />
            </label>
            <label className="radio-label">
              נקבה
              <input
                type="radio"
                name="gender"
                value="female"
                checked={formData.gender === "female"}
                onChange={handleChange}
              />
            </label>
            <label className="radio-label">
              אחר
              <input
                type="radio"
                name="gender"
                value="other"
                checked={formData.gender === "other"}
                onChange={handleChange}
              />
            </label>
            <label className="label-text">:מגדר</label>
          </div>
          <input
            type="password"
            name="password"
            placeholder="סיסמה"
            className="input-field"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="אימות סיסמה"
            className="input-field"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="city"
            placeholder="עיר מגורים"
            className="input-field"
            value={formData.city}
            onChange={handleChange}
            required
          />

          <div className="section-header">♥ נשמח להכיר אותך יותר</div>

          <div className="checkbox-container">
            <label>
              בעל תו נכה
              <input
                type="checkbox"
                name="disabledPermit"
                checked={formData.disabledPermit}
                onChange={handleChange}
              />
            </label>
          </div>

          <div className="section-header">העדפות תזונתיות</div>
          {Object.entries(formData.preferences).map(([key, value]) => (
            <div className="checkbox-container" key={key}>
              <label>
                {key.replace(/_/g, " ")}
                <input
                  type="checkbox"
                  name={key}
                  checked={value}
                  onChange={handleChange}
                />
              </label>
            </div>
          ))}

          <div className="section-header">תקציב קניות</div>
          <div className="budget-container">
            <label className="radio-label">
              אחר
              <input
                type="radio"
                name="budget"
                value="other"
                checked={formData.budget === "other"}
                onChange={handleChange}
              />
            </label>
            <label className="radio-label">
              שבועי
              <input
                type="radio"
                name="budget"
                value="weekly"
                checked={formData.budget === "weekly"}
                onChange={handleChange}
              />
            </label>
            <label className="radio-label">
              חודשי
              <input
                type="radio"
                name="budget"
                value="monthly"
                checked={formData.budget === "monthly"}
                onChange={handleChange}
              />
            </label>
          </div>
          <input
            type="number"
            name="budgetAmount"
            placeholder="הכנס סכום"
            className="input-field budget-input"
            value={formData.budgetAmount}
            onChange={handleChange}
          />

          <div className="section-header">רדיוס סופרמרקט מועדף (בק״מ)</div>
          <select
            name="supermarket_radius"
            className="input-field"
            value={formData.supermarket_radius}
            onChange={handleChange}
          >
            {[5, 10, 15, 20, 25, 30].map((km) => (
              <option key={km} value={km}>
                {km} ק״מ
              </option>
            ))}
          </select>

          <div className="section-header">אפשרויות דיוור</div>
          <div className="checkbox-container">
            <label>
              אני מעוניין להירשם לניוזלטר דו-שבועי
              <input
                type="checkbox"
                name="newsletter"
                checked={formData.newsletter}
                onChange={handleChange}
              />
            </label>
          </div>
          <div className="checkbox-container">
            <label>
              אני רוצה לקבל עדכונים על מבצעים ומוצרים
              <input
                type="checkbox"
                name="marketingUpdates"
                checked={formData.marketingUpdates}
                onChange={handleChange}
              />
            </label>
          </div>

          <button type="submit" className="button" disabled={isLoading}>
            {isLoading ? "מעבד הרשמה..." : "הירשם"}
          </button>
        </form>
      </div>
      <Footer />
    </>
  );
};

export default SignUp;
