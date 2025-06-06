// NavBar.js
import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "./Button";
import { UserContext } from "../context/UserContext";
import "./NavBar.css";

function NavBar() {
  const [click, setClick] = useState(false);
  const [button, setButton] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();

  const handleClick = () => setClick(!click);
  const closeMobileMenu = () => setClick(false);
  const showButton = () => setButton(window.innerWidth > 960);

  useEffect(() => {
    showButton();
    window.addEventListener("resize", showButton);
    return () => window.removeEventListener("resize", showButton);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-icon">
            <i className="fa-solid fa-cart-shopping fa-bounce fa-xl"></i>
          </div>
          <Link to="/" className="navbar-logo">
            Quick&Pick
          </Link>
          <div className="menu-icon" onClick={handleClick}>
            <i className={click ? "fas fa-times" : "fas fa-bars"} />
          </div>
          <ul className={click ? "nav-menu active" : "nav-menu"}>
            <li className="nav-item">
              <Link
                to="/input-recipe"
                className="nav-links"
                onClick={closeMobileMenu}
              >
                הדבק מתכון
              </Link>
            </li>

            <li className="nav-item">
              <Link
                to="/Address"
                className="nav-links"
                onClick={closeMobileMenu}
              >
                מצא סופר
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/" className="nav-links" onClick={closeMobileMenu}>
                ראשי
              </Link>
            </li>
            <li className="nav-item">
              {!user ? (
                <Link
                  to="/sign-up"
                  className="nav-links-mobile"
                  onClick={closeMobileMenu}
                >
                  הרשמה
                </Link>
              ) : (
                <div className="nav-links-mobile">שלום, {user.first_name}</div>
              )}
            </li>
          </ul>

          {button &&
            (!user ? (
              <Button buttonStyle="btn--outline" redirect={"/sign-up"}>
                הרשמה
              </Button>
            ) : (
              <div
                className="user-dropdown"
                onMouseEnter={() => setShowDropdown(true)}
                onMouseLeave={(e) => {
                  const related = e.relatedTarget;
                  if (
                    !(related instanceof HTMLElement) ||
                    !related.closest(".user-dropdown")
                  ) {
                    setShowDropdown(false);
                  }
                }}
              >
                <Button buttonStyle="btn--outline" redirect={"/MyProfile"}>
                  שלום, {user.first_name}
                </Button>
                {showDropdown && (
                  <div className="dropdown-menu">
                    <div
                      onClick={() => navigate("/MyProfile")}
                      className="dropdown-item"
                    >
                      פרופיל
                    </div>
                    <div onClick={handleLogout} className="dropdown-item">
                      התנתקות
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </nav>
    </>
  );
}

export default NavBar;
