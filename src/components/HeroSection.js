import React, { useState } from "react";
import { Button } from "./Button";
import { Link, useNavigate } from "react-router-dom";
import "./HeroSection.css";
import "../App.css";

function HeroSection() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("user");
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const targetPath = isLoggedIn ? "/MyProfile" : "/LogIn";

  const openVideoModal = () => {
    console.log("Opening video modal"); // Debug log
    setIsVideoModalOpen(true);
  };

  const closeVideoModal = () => {
    console.log("Closing video modal"); // Debug log
    setIsVideoModalOpen(false);
  };

  return (
    <div className="hero-container">
      <video src="/videos/video-2.mp4" autoPlay loop muted />
      <h1>חווית הקניות שלא הכרתם</h1>
      <p>?למה אתם מחכים</p>
      <div className="hero-btns">
        <Link to={targetPath} className="log-in-text">
          <Button
            className="btns"
            buttonStyle="btn--outline"
            buttonSize="btn--large"
            redirect={isLoggedIn ? "/MyProfile" : "/sign-up"}
          >
            {isLoggedIn ? "לפרופיל שלי" : "הרשמו עכשיו"}
          </Button>
        </Link>

        <button
          className="btn btn--primary btn--large"
          onClick={openVideoModal}
        >
          צפו בדמו <i className="far fa-play-circle" />
        </button>
      </div>
      <div className="log-in-link">
        <Link to={targetPath} className="log-in-text">
          משתמש קיים? לחץ כאן
        </Link>
      </div>

      {/* Video Modal */}
      {isVideoModalOpen && (
        <div className="video-modal-overlay" onClick={closeVideoModal}>
          <div
            className="video-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="video-modal-close" onClick={closeVideoModal}>
              ✕
            </button>
            <div className="video-wrapper">
              <video
                src="/videos/video-1.mp4"
                controls
                autoPlay
                muted
                className="demo-video"
                onError={(e) => console.error("Video error:", e)}
                onLoadStart={() => console.log("Video load started")}
                onCanPlay={() => console.log("Video can play")}
              >
                הדפדפן שלך לא תומך בהצגת וידאו.
              </video>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HeroSection;
