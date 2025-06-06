import React, { createContext, useState, useEffect, useContext } from "react";
import { UserContext } from "./UserContext";

export const ListsContext = createContext();

export const ListsProvider = ({ children }) => {
  const { user } = useContext(UserContext);
  const [userLists, setUserLists] = useState([]);
  const [currentList, setCurrentList] = useState(null);

  // Move outside useEffect
  const fetchUserLists = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(
        `http://localhost:5000/api/user-lists?user_id=${user.id}`
      );
      const data = await response.json();
      setUserLists(data.slice(0, 5));
    } catch (error) {
      console.error("Error fetching user lists:", error);
    }
  };

  // Call on mount and when user changes
  useEffect(() => {
    fetchUserLists();
  }, [user]);

  return (
    <ListsContext.Provider
      value={{
        userLists,
        setUserLists,
        currentList,
        setCurrentList,
        fetchUserLists, // <-- Expose it here!
      }}
    >
      {children}
    </ListsContext.Provider>
  );
};
