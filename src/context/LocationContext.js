import React, { createContext, useState } from "react";

export const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  return (
    <LocationContext.Provider
      value={{
        address,
        setAddress,
        latitude,
        setLatitude,
        longitude,
        setLongitude,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
