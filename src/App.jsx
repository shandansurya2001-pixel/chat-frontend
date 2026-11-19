
import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000";
const WS = "ws://127.0.0.1:8000/ws";

function formatLastSeen(lastSeen) {
  if (!lastSeen) return "Last seen: Unknown";

  const date = new Date(lastSeen);

  if (isNaN(date.getTime())) return "Last seen: Unknown";

  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return `Last seen ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  return `Last seen ${date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
  })} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function App() {
  const [username, setUsername] = useState("");
  const [registered, setRegistered] = useState(false);

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const selectedUserRef = useRef(null);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  // Load recent chats
  const loadUsers = useCallback(async () => {
    if (!username) return;

    try {
      const response = await fetch(
        `${API}/contacts/${encodeURIComponent(username)}`
      );

      if (response.ok) {
        setUsers(await response.json());
      }
    } catch (error) {
      console.error("Could not load chats:", error);
    }
  }, [username]);

  // Connect to backend
  useEffect(() => {
    if (!registered) return;

    const socket = new WebSocket(WS);
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "register",
          username,
        })
      );

      loadUsers();
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "user_list") {
        loadUsers();
      }

      if (data.type === "private_message") {
        loadUsers();

        if (data.sender === selectedUserRef.current) {
          setMessages((prev) => [
            ...prev,
            {
              text: data.text,
              type: "received",
            },
          ]);
        }
      }

      if (data.type === "error") {
        alert(data.message);
      }
    };

    socket.onclose = () => {
      socketRef.current = null;
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [registered, username, loadUsers]);

  // Refresh online status every 3 seconds
  useEffect(() => {
    if (!registered) return;

    const interval = setInterval(() => {
      loadUsers();
    }, 3000);

    return () => clearInterval(interval);
  }, [registered, loadUsers]);

  // Search registered users
  useEffect(() => {
    if (!registered || !newChatOpen) return;

    const searchUsers = async () => {
      try {
        const response = await fetch(
          `${API}/users/search/${encodeURIComponent(username)}?q=${encodeURIComponent(searchQuery)}`
        );

        if (response.ok) {
          setSearchResults(await response.json());
        }
      } catch (error) {
        console.error("Could not search users:", error);
      }
    };

    searchUsers();
  }, [registered, newChatOpen, searchQuery, username]);

  // Open conversation
  const openChat = async (user) => {
    setSelectedUser(user.username);
    setMessages([]);
    setMessage("");
    setNewChatOpen(false);
    setSearchQuery("");

    try {
      const response = await fetch(
        `${API}/messages/${encodeURIComponent(username)}/${encodeURIComponent(user.username)}`
      );

      if (!response.ok) {
        throw new Error("Failed to load messages");
      }

      const data = await response.json();

      setMessages(
        data.map((msg) => ({
          text: msg.text,
          type: msg.sender === username ? "sent" : "received",
        }))
      );
    } catch (error) {
      console.error("Could not load chat history:", error);
      alert("Could not load chat history.");
    }
  };

  // Send message
  const sendMessage = () => {
    const text = message.trim();

    if (!text || !selectedUser) return;

    if (
      !socketRef.current ||
      socketRef.current.readyState !== WebSocket.OPEN
    ) {
      alert("Connection not ready. Please wait.");
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "private_message",
        sender: username,
        receiver: selectedUser,
        text,
      })
    );

    setMessages((prev) => [
      ...prev,
      {
        text,
        type: "sent",
      },
    ]);

    setUsers((prev) => {
      if (prev.some((user) => user.username === selectedUser)) {
        return prev;
      }

      return [
        {
          username: selectedUser,
          online: false,
          last_seen: null,
        },
        ...prev,
      ];
    });

    setMessage("");

    // Refresh recent chats after sending
    setTimeout(() => {
      loadUsers();
    }, 500);
  };

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // User status display
  const UserStatus = ({ user }) => (
    <small
      style={{
        display: "block",
        marginLeft: "26px",
        marginTop: "4px",
        color: user.online ? "#16a34a" : "#888",
        fontSize: "12px",
      }}
    >
      {user.online ? "Online" : formatLastSeen(user.last_seen)}
    </small>
  );

  // Login screen
  if (!registered) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>💬 Our Personal Chat</h1>
          <p>— by Surya</p>

          <h3>Enter Username</h3>

          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your name"
          />

          <button
            onClick={() => {
              if (username.trim()) {
                setUsername(username.trim());
                setRegistered(true);
              }
            }}
          >
            Join Chat
          </button>
        </div>
      </div>
    );
  }

  // Chat screen
  return (
    <div className="chat-container">

      {/* Sidebar */}
      <div className="sidebar">

        <div className="sidebar-header">
          <h3>Chats</h3>

          <button
            onClick={() => {
              setNewChatOpen((prev) => !prev);
              setSearchQuery("");
            }}
          >
            {newChatOpen ? "Cancel" : "+ New Chat"}
          </button>
        </div>

        {newChatOpen ? (
          <div className="search-section">

            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people..."
              autoFocus
            />

            <h4>People</h4>

            {searchResults.length === 0 && (
              <p>No users found.</p>
            )}

            {searchResults.map((user) => (
              <div
                key={user.username}
                className="user"
                onClick={() => openChat(user)}
              >
                <span
                  style={{
                    color: user.online ? "#16a34a" : "#999",
                    marginRight: "8px",
                  }}
                >
                  ●
                </span>

                {user.username}

                <UserStatus user={user} />
              </div>
            ))}

          </div>
        ) : (
          <>

            {users.length === 0 && (
              <p>No chats yet. Click + New Chat to find someone.</p>
            )}

            {users.map((user) => (
              <div
                key={user.username}
                className={`user ${
                  selectedUser === user.username ? "selected" : ""
                }`}
                onClick={() => openChat(user)}
              >
                <span
                  style={{
                    color: user.online ? "#16a34a" : "#999",
                    marginRight: "8px",
                  }}
                >
                  ●
                </span>

                {user.username}

                <UserStatus user={user} />
              </div>
            ))}

          </>
        )}

      </div>

      {/* Chat window */}
      <div className="chat-window">

        {selectedUser ? (
          <>

            <div className="chat-header">
              <h3>{selectedUser}</h3>
            </div>

            <div className="messages">

              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`message ${msg.type}`}
                >
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendMessage();
                  }
                }}
              />

              <button onClick={sendMessage}>
                Send
              </button>

            </div>

          </>
        ) : (
          <div style={{ padding: 20 }}>
            <h3>Welcome, {username}!</h3>
            <p>Select a chat or start a new conversation.</p>
          </div>
        )}

      </div>

    </div>
  );
}

export default App;
