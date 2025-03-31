import React from "react";
import NavBar from "./components/NavBar";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./components/pages/Home";
import CreateList from "./components/pages/CreateList";
import Products from "./components/pages/Products";
import SignUp from "./components/pages/SignUp";
import Address from "./components/pages/Address";
import FindCheapest from "./components/pages/FindCheapest";
import MyProfile from "./components/pages/MyProfile";
import InputRecipe from "./components/pages/InputRecipe";
import LogIn from "./components/pages/LogIn";
import { LocationProvider } from "./context/LocationContext"; // Import the LocationProvider
import { UserProvider } from "./context/UserContext"; // Import the UserProvider
import { CartProvider } from "./context/CartContext";

function App() {
  return (
    <LocationProvider>
      <UserProvider>
        <CartProvider>
          {/* Wrap the entire app with the provider */}
          <Router>
            <NavBar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/CreateList" element={<CreateList />} />
              <Route path="/Products" element={<Products />} />
              <Route path="/sign-up" element={<SignUp />} />
              <Route path="/Address" element={<Address />} />
              <Route path="/FindCheapest" element={<FindCheapest />} />
              <Route path="/MyProfile" element={<MyProfile />} />
              <Route path="/input-recipe" element={<InputRecipe />} />
              <Route path="/LogIn" element={<LogIn />} />
            </Routes>
          </Router>
        </CartProvider>
      </UserProvider>
    </LocationProvider>
  );
}

export default App;
