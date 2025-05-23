import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);

        // Parse preferences if needed
        const preferences =
          typeof parsed.preferences === "string"
            ? JSON.parse(parsed.preferences)
            : parsed.preferences || {};

        // Parse supermarket_attributes if needed
        const supermarket_attributes =
          typeof parsed.supermarket_attributes === "string"
            ? JSON.parse(parsed.supermarket_attributes)
            : parsed.supermarket_attributes || {};

        // Parse numeric and boolean fields
        const radius =
          typeof parsed.supermarket_radius === "string"
            ? parseFloat(parsed.supermarket_radius)
            : parsed.supermarket_radius || 5;

        const disabled_permit =
          typeof parsed.disabled_permit === "string"
            ? parsed.disabled_permit === "true"
            : parsed.disabled_permit || false;

        const budget =
          typeof parsed.budget === "string"
            ? parsed.budget
            : parsed.budget || "weekly";

        const budget_amount =
          typeof parsed.budget_amount === "string"
            ? parseFloat(parsed.budget_amount)
            : parsed.budget_amount || 0;

        const phone =
          typeof parsed.phone === "string" ? parsed.phone : parsed.phone || "";

        const created_at =
          typeof parsed.created_at === "string"
            ? new Date(parsed.created_at)
            : parsed.created_at || new Date();

        const enrichedUser = {
          ...parsed,
          preferences,
          supermarket_attributes,
          supermarket_radius: radius,
          disabled_permit,
          budget,
          budget_amount,
          phone,
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
