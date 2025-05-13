// src/components/pages/ChatBot.js
import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import Chat from "../Chat"; // The chatbot component
import Footer from "../Footer";

const ChatBot = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  if (!user) {
    navigate("/");
    return null;
  }

  return (
    <>
      <div className="chatbot-page-wrapper">
        <div className="chatbot-header-section">
          <h1>🤖 עוזר הקניות החכם שלך</h1>
          <p>שאל שאלות, קבל מתכונים, צור רשימות מותאמות אישית!</p>
        </div>
        <div className="chatbot-box">
          <Chat />
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ChatBot;
