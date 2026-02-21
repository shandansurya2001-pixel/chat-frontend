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

    socketRef.current =new WebSocket("wss://chat-backend-6h73.onrender.com/ws");

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
          { text: data.text, type: "received", from: data.sender },
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
      { text: message, type: "sent", to: selectedUser },
    ]);

    setMessage("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!registered) {
    return (
      <div style={{ padding: 50 }}>
        <h2>Enter Username</h2>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your name"
        />
        <button onClick={() => setRegistered(true)}>Join</button>
      </div>
    );
  }

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
          <div style={{ padding: 20 }}>Select a user to chat</div>
        )}
      </div>
    </div>
  );
}

export default App;