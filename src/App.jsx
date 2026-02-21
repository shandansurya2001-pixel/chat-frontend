import { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const [username, setUsername] = useState("");
  const [registered, setRegistered] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!registered) return;

    socketRef.current = new WebSocket(
      "wss://chat-backend-6h73.onrender.com/ws"
    );

    socketRef.current.onopen = () => {
      socketRef.current.send(
        JSON.stringify({
          type: "register",
          username: username,
        })
      );
    };

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "user_list") {
        setUsers(data.users.filter((u) => u !== username));
      }

      if (data.type === "private_message") {
        setMessages((prev) => [
          ...prev,
          { text: data.text, type: "received" },
        ]);
      }
    };

    return () => socketRef.current.close();
  }, [registered]);

  const sendMessage = () => {
    if (!message || !selectedUser) return;

    const messageData = {
      type: "private_message",
      sender: username,
      receiver: selectedUser,
      text: message,
    };

    socketRef.current.send(JSON.stringify(messageData));

    setMessages((prev) => [
      ...prev,
      { text: message, type: "sent" },
    ]);

    setMessage("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔹 LOGIN SCREEN
  if (!registered) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(to right, #667eea, #764ba2)",
          color: "white",
        }}
      >
        <div
          style={{
            background: "white",
            color: "black",
            padding: "40px",
            borderRadius: "12px",
            textAlign: "center",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            width: "300px",
          }}
        >
          <h1 style={{ marginBottom: "5px" }}>
            💬 Our Personal Chat
          </h1>
          <p style={{ color: "gray", marginBottom: "25px" }}>
            — by Surya
          </p>

          <h3>Enter Username</h3>

          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your name"
            style={{
              padding: "10px",
              width: "100%",
              marginBottom: "15px",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />

          <button
            onClick={() => setRegistered(true)}
            style={{
              padding: "10px",
              width: "100%",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#667eea",
              color: "white",
              cursor: "pointer",
            }}
          >
            Join Chat
          </button>
        </div>
      </div>
    );
  }

  // 🔹 CHAT SCREEN
  return (
    <div className="chat-container">
      <div className="sidebar">
        <h3>Online Users</h3>
        {users.map((user, index) => (
          <div
            key={index}
            className="user"
            onClick={async () => {
              setSelectedUser(user);

              const response = await fetch(
                `https://chat-backend-6h73.onrender.com/messages/${username}/${user}`
              );
              const data = await response.json();

              const formatted = data.map((msg) => ({
                text: msg.text,
                type: msg.sender === username ? "sent" : "received",
              }));

              setMessages(formatted);
            }}
          >
            {user}
          </div>
        ))}
      </div>

      <div className="chat-window">
        {selectedUser ? (
          <>
            <div className="messages">
              {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.type}`}>
                  {msg.text}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="input-area">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        ) : (
          <div style={{ padding: 20 }}>
            Select a user to chat
          </div>
        )}
      </div>
    </div>
  );
}

export default App;