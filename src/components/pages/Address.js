import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LoadScript, Autocomplete } from "@react-google-maps/api";
import "./Address.css";
import { LocationContext } from "../../context/LocationContext";
import { UserContext } from "../../context/UserContext";
import Footer from "../Footer";

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const libraries = ["places"];

const Address = () => {
  const { address, setAddress } = useContext(LocationContext);
  const { user } = useContext(UserContext);
  const [autocomplete, setAutocomplete] = useState(null);
  const [isLocationFetched, setIsLocationFetched] = useState(false);
  const navigate = useNavigate();

  // Supermarket filters
  const [radius, setRadius] = useState(user?.supermarket_radius || 5);
  const [accessibility, setAccessibility] = useState(
    user?.disabled_permit || false
  );
  const [hasDisabledParking, setHasDisabledParking] = useState(false);
  const [hasFreeParking, setHasFreeParking] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [isOpenNow, setIsOpenNow] = useState(false);

  // Update radius when user data changes
  useEffect(() => {
    if (user?.supermarket_radius) {
      setRadius(user.supermarket_radius);
    }
  }, [user]);

  // Dietary preferences
  const defaultPrefs = {
    ללא_גלוטן: false,
    ללא_סוכר: false,
    כשרות: false,
    צמחוני: false,
    טבעוני: false,
    חלבון_גבוה: false,
  };

  const [preferences, setPreferences] = useState(() => {
    if (!user?.preferences) return defaultPrefs;
    try {
      const parsed =
        typeof user.preferences === "string"
          ? JSON.parse(user.preferences)
          : user.preferences;
      return { ...defaultPrefs, ...parsed }; // Fill missing keys
    } catch {
      return defaultPrefs;
    }
  });

  const handlePreferenceChange = (key) => {
    setPreferences({ ...preferences, [key]: !preferences[key] });
  };

  const hasHouseNumber = (place) => {
    return place.address_components.some((c) =>
      c.types.includes("street_number")
    );
  };

  const onPlaceSelected = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place && place.formatted_address) {
        const formattedAddress = place.formatted_address
          .replace(", ישראל", "")
          .trim();
        const isInIsrael = place.address_components.some(
          (c) => c.long_name === "Israel" || c.short_name === "IL"
        );

        if (!isInIsrael) {
          alert("השירות זמין רק לישראל.");
          setAddress("");
          setIsLocationFetched(false);
          return;
        }

        if (!hasHouseNumber(place)) {
          setIsLocationFetched(false);
          return;
        }

        setAddress(formattedAddress);
        setIsLocationFetched(true);
      }
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("המיקום הנוכחי לא נתמך בדפדפן שלך.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&language=he`
          );
          const data = await res.json();
          if (data.results?.length > 0) {
            const result = data.results[0];
            const formatted = result.formatted_address
              .replace(", ישראל", "")
              .trim();
            const isInIsrael = result.address_components.some(
              (c) => c.long_name === "Israel" || c.short_name === "IL"
            );

            if (!isInIsrael) {
              alert("השירות זמין רק לישראל.");
              setAddress("");
              setIsLocationFetched(false);
              return;
            }

            if (!hasHouseNumber(result)) {
              setIsLocationFetched(false);
              return;
            }

            setAddress(formatted);
            setIsLocationFetched(true);
          } else {
            alert("לא הצלחנו לזהות את הכתובת שלך.");
          }
        } catch (err) {
          console.error("Error:", err);
          alert("שגיאה בזיהוי מיקום.");
        }
      },
      (err) => alert("שגיאה בקבלת המיקום: " + err.message)
    );
  };

  const handleChange = (e) => {
    setAddress(e.target.value);
    setIsLocationFetched(false);
  };

  const handleContinue = () => {
    if (isLocationFetched) {
      // Optionally store preferences and filters somewhere (e.g. Context/Backend)
      navigate("/FindCheapest");
    }
  };

  return (
    <>
      <div className="address-container">
        <h2>אנא הזן את כתובתך</h2>

        <LoadScript
          googleMapsApiKey={GOOGLE_MAPS_API_KEY}
          libraries={libraries}
        >
          <div className="input-container">
            <Autocomplete
              onLoad={setAutocomplete}
              onPlaceChanged={onPlaceSelected}
            >
              <input
                type="text"
                placeholder="הקלד את כתובתך"
                value={address}
                onChange={handleChange}
                className="address-input"
              />
            </Autocomplete>
            <button onClick={handleUseCurrentLocation} className="location-btn">
              📍 השתמש במיקום הנוכחי שלי
            </button>
          </div>
        </LoadScript>

        <div className="section-header">רדיוס סופרמרקט מועדף</div>
        <select
          className="dropdown"
          value={radius}
          onChange={(e) => setRadius(parseInt(e.target.value))}
        >
          {[5, 10, 15, 20, 25, 30].map((km) => (
            <option key={km} value={km}>
              {km} ק״מ
            </option>
          ))}
        </select>

        <div className="section-header"> 🚚 העדפות לסופרמרקט</div>
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={accessibility}
              onChange={() => setAccessibility(!accessibility)}
            />
            נגיש לנכים
          </label>
          <label>
            <input
              type="checkbox"
              checked={hasDisabledParking}
              onChange={() => setHasDisabledParking(!hasDisabledParking)}
            />
            חניית נכים
          </label>
          <label>
            <input
              type="checkbox"
              checked={hasFreeParking}
              onChange={() => setHasFreeParking(!hasFreeParking)}
            />
            חניה חינם
          </label>
          <label>
            <input
              type="checkbox"
              checked={hasDelivery}
              onChange={() => setHasDelivery(!hasDelivery)}
            />
            שירות משלוחים
          </label>
        </div>

        <div className="section-header"> 🍏 עדכון העדפות תזונתיות</div>
        <div className="checkbox-group">
          {Object.entries(preferences).map(([key, value]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={value}
                onChange={() => handlePreferenceChange(key)}
              />
              {key.replace(/_/g, " ")}
            </label>
          ))}
        </div>

        {/* Open Now Toggle */}
        <div className="open-now-toggle">
          <span className="toggle-label">האם הסופר פתוח עכשיו?</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={isOpenNow}
              onChange={() => setIsOpenNow(!isOpenNow)}
            />
            <span className={`slider ${isOpenNow ? "day" : "night"}`}>
              <span className="emoji">{isOpenNow ? "🌞" : "🌙"}</span>
            </span>
          </label>
        </div>

        <button
          className="continue-btn"
          onClick={handleContinue}
          disabled={!isLocationFetched}
        >
          המשך למציאת הסל
        </button>
      </div>
      <Footer />
    </>
  );
};

export default Address;
