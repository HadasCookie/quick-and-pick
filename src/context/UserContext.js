import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    //console.log("Stored user data:", stored); // Debugging line
    if (stored) {
      try {
        const parsed = JSON.parse(stored);

        // Parse preferences if they exist and are stringified
        const preferences =
          typeof parsed.preferences === "string"
            ? JSON.parse(parsed.preferences)
            : parsed.preferences || {};

        // Parse other properties if needed
        const radius =
          typeof parsed.supermarket_radius === "string"
            ? parseFloat(parsed.supermarket_radius)
            : parsed.supermarket_radius || 5; // Default radius

        const disabled_permit =
          typeof parsed.disabled_permit === "string"
            ? parsed.disabled_permit === "true"
            : parsed.disabled_permit || false; // Default disabled parking

        const budget =
          typeof parsed.budget === "string"
            ? parseFloat(parsed.budget)
            : parsed.budget || 0; // Default budget

        const created_at =
          typeof parsed.created_at === "string"
            ? new Date(parsed.created_at)
                .toLocaleDateString("en-GB")
                .replace(/\//g, "/")
            : parsed.created_at ||
              new Date().toLocaleDateString("en-GB").replace(/\//g, "/"); // Default registration date

        // Construct enriched user object
        const enrichedUser = {
          ...parsed,
          preferences,
          supermarket_radius: radius,
          disabled_permit,
          budget,
          created_at,
        };

        setUser(enrichedUser);
      } catch (err) {
        console.error("Invalid user JSON", err);
        localStorage.removeItem("user");
      }
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};
