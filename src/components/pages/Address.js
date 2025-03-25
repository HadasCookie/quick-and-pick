import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { LoadScript, Autocomplete } from "@react-google-maps/api";
import "./Address.css";
import { LocationContext } from "../../context/LocationContext";

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const libraries = ["places"]; // Keep libraries static

const Address = () => {
    const { address, setAddress } = useContext(LocationContext); // Get context
    const [autocomplete, setAutocomplete] = useState(null);
    const [isLocationFetched, setIsLocationFetched] = useState(false);
    const navigate = useNavigate();

    // Function to check if the address contains a house number
    const hasHouseNumber = (place) => {
        return place.address_components.some(component => 
            component.types.includes("street_number") // Looks for a house number component
        );
    };

    // When the user selects an address from autocomplete
    const onPlaceSelected = () => {
        if (autocomplete) {
            const place = autocomplete.getPlace();
            if (place && place.formatted_address) {
                const formattedAddress = place.formatted_address.replace(", ישראל", "").trim();

                // Check if the address is in Israel
                const isInIsrael = place.address_components.some(component => 
                    component.long_name === "Israel" || component.short_name === "IL"
                );

                if (!isInIsrael) {
                    alert("השירות זמין רק לישראל.");
                    setAddress("");
                    setIsLocationFetched(false);
                    return;
                }

                // Ensure address contains a house number
                if (!hasHouseNumber(place)) {
                    setIsLocationFetched(false);
                    return;
                }
                setAddress(formattedAddress);
                setIsLocationFetched(true);
            }
        }
    };

    // Handle the "Use My Current Location" button
    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert("המיקום הנוכחי לא נתמך בדפדפן שלך.");
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;

            try {
                const response = await fetch(
                    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&language=he`
                );

                const data = await response.json();
                if (data.results && data.results.length > 0) {
                    const result = data.results[0];
                    const formattedAddress = result.formatted_address.replace(", ישראל", "").trim();
                    
                    // Check if the location is in Israel
                    const isInIsrael = result.address_components.some(component => 
                        component.long_name === "Israel" || component.short_name === "IL"
                    );

                    if (!isInIsrael) {
                        alert("השירות זמין רק לישראל.");
                        setAddress("");
                        setIsLocationFetched(false);
                        return;
                    }

                    // Ensure address contains a house number
                    if (!hasHouseNumber(result)) {
                        setIsLocationFetched(false);
                        return;
                    }
                    setAddress(formattedAddress);
                    setIsLocationFetched(true);
                } else {
                    alert("לא הצלחנו לזהות את הכתובת שלך.");
                }
            } catch (error) {
                console.error("Error fetching address:", error);
                alert("שגיאה בזיהוי המיקום.");
            }
        }, (error) => {
            alert("שגיאה בקבלת המיקום: " + error.message);
        });
    };

    // Handle manual input
    const handleChange = (e) => {
        setAddress(e.target.value);
        setIsLocationFetched(false); // Prevent enabling continue button for manual input
    };

    // Redirect to FindCheapest page
    const handleContinue = () => {
        if (isLocationFetched) {
            navigate("/FindCheapest");
        }
    };

    return (
        <div className="address-container">
            <h2>אנא הזן את כתובתך</h2>
            <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries}>
                <div className="input-container">
                    <Autocomplete
                        onLoad={(auto) => setAutocomplete(auto)}
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
            <button
                className="continue-btn"
                onClick={handleContinue}
                disabled={!isLocationFetched}
            >
                המשך למציאת הסל
            </button>
        </div>
    );
};

export default Address;