import React, { createContext, useState, useEffect, useContext } from "react";
import { UserContext } from "./UserContext";

export const ListsContext = createContext();

export const ListsProvider = ({ children }) => {
  const { user } = useContext(UserContext);
  const [userLists, setUserLists] = useState([]);
  const [currentList, setCurrentList] = useState(null);

  useEffect(() => {
    const fetchUserLists = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch(
          `http://localhost:5000/api/user-lists?user_id=${user.id}`
        );
        const data = await response.json();
        setUserLists(data.slice(0, 5)); // latest 5
      } catch (error) {
        console.error("Error fetching user lists:", error);
      }
    };

    fetchUserLists();
  }, [user]);

  return (
    <ListsContext.Provider
      value={{ userLists, setUserLists, currentList, setCurrentList }}
    >
      {children}
    </ListsContext.Provider>
  );
};
