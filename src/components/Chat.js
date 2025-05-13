import React, { useState } from "react";
import "./pages/ChatBot.css"; // Import the chatbot styles

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { text: input, sender: "user" }];
    setMessages(newMessages);
    setInput("");

    const botReply = await queryFlaskChatbot(input);
    setMessages((prev) => [...prev, { text: botReply, sender: "bot" }]);
  };

  const queryFlaskChatbot = async (message) => {
    const response = await fetch("http://localhost:5000/chat", {
      // 🚀 YOUR SERVER
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: message }),
    });

    const result = await response.json();
    return result.response || "Sorry, I didn't understand 🫠";
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          type="text"
          placeholder="כתוב הודעה..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
        />
        <button onClick={handleSend}>שלח</button>
      </div>
    </div>
  );
};

export default Chat;
