import React, { useState } from "react";
import "./LogIn.css"; // Reuse the styling for consistency
import { useNavigate } from "react-router-dom";
import Footer from "../Footer";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage("התחברת בהצלחה! 🎉");
        console.log("Login Result:", result);
        localStorage.setItem("user", JSON.stringify(result.user));
        navigate("/MyProfile");
        window.location.reload();
      } else {
        setMessage(result.error || "שגיאה בהתחברות.");
      }
    } catch (error) {
      console.error("Login Error:", error);
      setMessage(".שגיאה בשרת. נסה שוב מאוחר יותר");
    }
  };

  return (
    <>
      <div className="container">
        <h2>התחברות</h2>
        <form onSubmit={handleSubmit}>
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
            type="password"
            name="password"
            placeholder="סיסמה"
            className="input-field"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <button type="submit" className="button">
            התחבר
          </button>
        </form>

        {message && (
          <p style={{ marginTop: "15px", color: "#3a1e4d" }}>{message}</p>
        )}
      </div>
      <Footer />
    </>
  );
};

export default Login;
