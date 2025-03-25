import React, { createContext, useState } from "react";

export const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
    const [address, setAddress] = useState("");

    return (
        <LocationContext.Provider value={{ address, setAddress }}>
            {children}
        </LocationContext.Provider>
    );
};
