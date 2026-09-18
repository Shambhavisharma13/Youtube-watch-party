import { useState } from "react";

function App() {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const createRoom = async () => {
    if (!username.trim()) {
      setMessage("Please enter your username");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/rooms/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to create room");
        return;
      }

      setRoomId(data.roomId);
      setMessage(`Room created! You are the ${data.role}.`);
    } catch (error) {
      console.error(error);
      setMessage("Cannot connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>🎬 YouTube Watch Party</h1>

      <h2>Create Room</h2>

      <input
        type="text"
        placeholder="Enter your username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <button onClick={createRoom} disabled={loading}>
        {loading ? "Creating..." : "Create Room"}
      </button>

      {roomId && (
        <div>
          <h2>Room Created!</h2>
          <p>
            Room Code: <strong>{roomId}</strong>
          </p>
        </div>
      )}

      {message && <p>{message}</p>}
    </div>
  );
}

export default App;