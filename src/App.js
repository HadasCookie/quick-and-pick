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
import { LocationProvider } from "./context/LocationContext";
import { UserProvider } from "./context/UserContext";
import { CartProvider } from "./context/CartContext";
import { ListsProvider } from "./context/ListsContext";
import ChatBot from "./components/pages/ChatBot";

function App() {
  return (
    <LocationProvider>
      <UserProvider>
        <ListsProvider>
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
                <Route path="/ChatBot" element={<ChatBot />} />
              </Routes>
            </Router>
          </CartProvider>
        </ListsProvider>
      </UserProvider>
    </LocationProvider>
  );
}

export default App;
