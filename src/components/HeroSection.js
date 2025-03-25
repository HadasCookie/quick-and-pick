import React from "react";
import { Button } from "./Button";
import { Link, useNavigate } from "react-router-dom";
import "./HeroSection.css";
import "../App.css";

function HeroSection() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("user");

  return (
    <div className="hero-container">
      <video src="/videos/video-2.mp4" autoPlay loop muted />
      <h1>חווית הקניות שלא הכרתם</h1>
      <p>?למה אתם מחכים</p>
      <div className="hero-btns">
        <Link to={isLoggedIn ? "/MyProfile" : "/sign-up"}>
          <Button
            className="btns"
            buttonStyle="btn--outline"
            buttonSize="btn--large"
            onClick={() => navigate(isLoggedIn ? "/MyProfile" : "/sign-up")}
          >
            {isLoggedIn ? "לפרופיל שלי" : "הרשמו עכשיו"}
          </Button>
        </Link>

        <button className="btn btn--primary btn--large">
          צפו בדמו <i className="far fa-play-circle" />
        </button>
      </div>
      <div className="log-in-link">
        <Link to={isLoggedIn ? "/MyProfile" : "/LogIn"} className="log-in-text">
          משתמש קיים? לחץ כאן
        </Link>
      </div>
    </div>
  );
}

export default HeroSection;
