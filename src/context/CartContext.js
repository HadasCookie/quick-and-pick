import React, { createContext, useState, useEffect } from "react";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem("cartItems");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
  }, [cartItems]);

  const addItem = (item) => {
    const unit =
      item.category === "פירות וירקות" || item.category === "בשר עוף ודגים"
        ? "ק״ג"
        : "יחידה";

    setCartItems((prev) => [
      ...prev,
      {
        ...item,
        unit,
      },
    ]);
  };

  const removeItem = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => setCartItems([]);

  // const searchBestSupermarket

  // Optional: utility function if you want to expose it here
  const generateCartProducts = () => {
    const result = {};
    cartItems.forEach((item) => {
      result[item.name] = {
        price: item.price,
        unit: item.unit,
        quantity: item.quantity,
      };
    });
    return result;
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addItem,
        removeItem,
        setCartItems,
        clearCart,
        generateCartProducts,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
