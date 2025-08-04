import React from "react";
import { Button } from "./Button";
import "./Footer.css";
import { Link } from "react-router-dom";

function Footer() {
  return (
    <div className="footer-container">
      <section className="footer-container">
        <p className="footer-subscription-heading">
          הצטרפו לניוזלטר שלנו כדי לקבל את המבצעים הטובים ביותר
        </p>
        <p className="footer-subscription-text">ניתן לבטל את המנוי בכל עת</p>
        <div className="input-areas">
          <form>
            <input
              type="email"
              name="email"
              placeholder="Your Email"
              className="footer-input"
            />
            <Button buttonStyle="btn--outline">הירשם למנוי</Button>
          </form>
        </div>
      </section>
      <div className="footer-links">
        <div className="footer-link-wrapper">
          <div className="footer-link-items">
            <h2>עלינו</h2>
            <Link to="/sign-up">איך זה עובד</Link>
            <Link to="/">המלצות</Link>
            <Link to="/">קריירה</Link>
            <Link to="/">משקיעים</Link>
            <Link to="/">תנאי שירות</Link>
          </div>
          <div className="footer-link-items">
            <h2>צור קשר</h2>
            <Link to="/">צור קשר</Link>
            <Link to="/">תמיכה</Link>
            <Link to="/">חנויות</Link>
            <Link to="/">ספונסרשיפס</Link>
          </div>
        </div>
        <div className="footer-link-wrapper">
          <div className="footer-link-items">
            <h2>סירטונים</h2>
            <Link to="/">שלח וידאו</Link>
            <Link to="/">שגרירים</Link>
            <Link to="/">סוכנות</Link>
            <Link to="/">משפיען</Link>
          </div>
          <div className="footer-link-items">
            <h2>מדיה חברתית</h2>
            <Link to="/">אינסטגרם</Link>
            <Link to="/">פייסבוק</Link>
            <Link to="/">יוטיוב</Link>
            <Link to="/">טוויטר</Link>
          </div>
        </div>
      </div>
      <section className="social-media">
        <div className="social-media-wrap">
          <div className="footer-logo">
            <Link to="/" className="social-logo">
              <i className="fa-solid fa-cart-shopping fa-xl" /> Quick&Pick
            </Link>
          </div>
          <small className="website-rights">Quick&Pick © 2025</small>
          <div className="social-icons">
            <Link
              className="social-icon-link facebook"
              to="/"
              target="_blank"
              aria-label="Facebook"
            >
              <i className="fab fa-facebook-f" />
            </Link>
            <Link
              className="social-icon-link instagram"
              to="/"
              target="_blank"
              aria-label="Instagram"
            >
              <i className="fab fa-instagram" />
            </Link>
            <Link
              className="social-icon-link youtube"
              to="/"
              target="_blank"
              aria-label="Youtube"
            >
              <i className="fab fa-youtube" />
            </Link>
            <Link
              className="social-icon-link twitter"
              to="/"
              target="_blank"
              aria-label="Twitter"
            >
              <i className="fab fa-twitter" />
            </Link>
            <Link
              className="social-icon-link linkedin"
              to="/"
              target="_blank"
              aria-label="LinkedIn"
            >
              <i className="fab fa-linkedin" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Footer;
