import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import YouTubePlayer from "./YouTubePlayer";

type Participant = {
  username: string;
  role: string;
};

function App() {
  // =========================
  // CREATE ROOM STATES
  // =========================

  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // =========================
  // JOIN ROOM STATES
  // =========================

  const [joinUsername, setJoinUsername] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  // =========================
  // SOCKET STATE
  // =========================

  const [socketStatus, setSocketStatus] =
    useState("Connecting...");

  const socketRef = useRef<any>(null);

  // =========================
  // PARTICIPANTS
  // =========================

  const [participants, setParticipants] =
    useState<Participant[]>([]);

  // =========================
  // YOUTUBE STATES
  // =========================

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoId, setVideoId] = useState("");

  const [isPlaying, setIsPlaying] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState(0);

  // =========================
  // SOCKET.IO CONNECTION
  // =========================

  useEffect(() => {
    const socket = io("http://localhost:5000");

    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketStatus("🟢 Socket.IO Connected");

      console.log(
        "Connected to Socket.IO:",
        socket.id
      );
    });

    socket.on("connect_error", (error) => {
      setSocketStatus(
        "🔴 Socket.IO Connection Failed"
      );

      console.error(
        "Socket error:",
        error
      );
    });

    socket.on("disconnect", () => {
      setSocketStatus(
        "🟡 Socket.IO Disconnected"
      );

      console.log(
        "Disconnected from Socket.IO"
      );
    });

    // =========================
    // PARTICIPANTS UPDATED
    // =========================

    socket.on(
      "participants-updated",
      (data) => {
        console.log(
          "Updated participants:",
          data.participants
        );

        setParticipants(
          data.participants
        );
      }
    );

    // =========================
    // VIDEO PLAY
    // =========================

    socket.on("video-play", (data) => {
      console.log(
        "Video play received:",
        data
      );

      setIsPlaying(true);

      if (
        typeof data.currentTime ===
        "number"
      ) {
        setCurrentTime(
          data.currentTime
        );
      }
    });

    // =========================
    // VIDEO PAUSE
    // =========================

    socket.on("video-pause", (data) => {
      console.log(
        "Video pause received:",
        data
      );

      setIsPlaying(false);

      if (
        typeof data.currentTime ===
        "number"
      ) {
        setCurrentTime(
          data.currentTime
        );
      }
    });

    // =========================
    // VIDEO SEEK
    // =========================

    socket.on("video-seek", (data) => {
      console.log(
        "Video seek received:",
        data
      );

      if (
        typeof data.currentTime ===
        "number"
      ) {
        setCurrentTime(
          data.currentTime
        );
      }
    });

    // =========================
    // CLEANUP
    // =========================

    return () => {
      socket.disconnect();
    };
  }, []);

  // =========================
  // CREATE ROOM
  // =========================

  const createRoom = async () => {
    if (!username.trim()) {
      setMessage(
        "Please enter your username"
      );
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
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            username:
              username.trim(),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            "Failed to create room"
        );

        return;
      }

      setRoomId(data.roomId);

      console.log(
        "Sending join-room:",
        data.roomId,
        data.username
      );

      // Join Socket.IO room
      if (socketRef.current) {
        socketRef.current.emit(
          "join-room",
          {
            roomId:
              data.roomId,

            username:
              data.username,
          }
        );
      }

      setMessage(
        `Room created! You are the ${data.role}.`
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "Cannot connect to server"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // JOIN ROOM
  // =========================

  const joinRoom = async () => {
    if (!joinUsername.trim()) {
      setJoinMessage(
        "Please enter your username"
      );

      return;
    }

    if (!joinRoomId.trim()) {
      setJoinMessage(
        "Please enter the room code"
      );

      return;
    }

    setJoinLoading(true);
    setJoinMessage("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/rooms/join",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            roomId:
              joinRoomId
                .trim()
                .toUpperCase(),

            username:
              joinUsername.trim(),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setJoinMessage(
          data.message ||
            "Failed to join room"
        );

        return;
      }

      setRoomId(data.roomId);

      console.log(
        "Sending join-room:",
        data.roomId,
        data.username
      );

      // Join Socket.IO room
      if (socketRef.current) {
        socketRef.current.emit(
          "join-room",
          {
            roomId:
              data.roomId,

            username:
              data.username,
          }
        );
      }

      setJoinMessage(
        `Joined room successfully! You are the ${data.role}.`
      );
    } catch (error) {
      console.error(error);

      setJoinMessage(
        "Cannot connect to server"
      );
    } finally {
      setJoinLoading(false);
    }
  };

  // =========================
  // EXTRACT YOUTUBE VIDEO ID
  // =========================

  const extractVideoId = (
    url: string
  ) => {
    try {
      const parsedUrl =
        new URL(url);

      if (
        parsedUrl.hostname.includes(
          "youtube.com"
        )
      ) {
        return parsedUrl.searchParams.get(
          "v"
        );
      }

      if (
        parsedUrl.hostname.includes(
          "youtu.be"
        )
      ) {
        return parsedUrl.pathname.substring(
          1
        );
      }

      return null;
    } catch {
      return null;
    }
  };

  // =========================
  // LOAD YOUTUBE VIDEO
  // =========================

  const loadVideo = () => {
    if (!youtubeUrl.trim()) {
      alert(
        "Please enter a YouTube URL"
      );

      return;
    }

    const id =
      extractVideoId(
        youtubeUrl.trim()
      );

    if (!id) {
      alert(
        "Invalid YouTube URL"
      );

      return;
    }

    console.log(
      "YouTube Video ID:",
      id
    );

    setVideoId(id);

    setCurrentTime(0);

    setIsPlaying(false);
  };

  // =========================
  // PLAY VIDEO
  // =========================

  const playVideo = () => {
    setIsPlaying(true);

    if (
      socketRef.current &&
      roomId
    ) {
      socketRef.current.emit(
        "video-play",
        {
          roomId,
          currentTime,
        }
      );
    }
  };

  // =========================
  // PAUSE VIDEO
  // =========================

  const pauseVideo = () => {
    setIsPlaying(false);

    if (
      socketRef.current &&
      roomId
    ) {
      socketRef.current.emit(
        "video-pause",
        {
          roomId,
          currentTime,
        }
      );
    }
  };

  // =========================
  // TIME UPDATE
  // =========================

  const handleTimeUpdate = (
    time: number
  ) => {
    setCurrentTime(time);
  };

  // =========================
  // UI
  // =========================

  return (
    <div
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "30px",
      }}
    >
      <h1>
        🎬 YouTube Watch Party
      </h1>

      <p>
        Socket status:{" "}
        {socketStatus}
      </p>

      <hr />

      {/* =========================
          CREATE ROOM
      ========================= */}

      <section>
        <h2>Create Room</h2>

        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) =>
            setUsername(
              e.target.value
            )
          }
        />

        <br />
        <br />

        <button
          onClick={createRoom}
          disabled={loading}
        >
          {loading
            ? "Creating..."
            : "Create Room"}
        </button>

        {roomId && (
          <div>
            <h3>
              Room Created!
            </h3>

            <p>
              Room Code:{" "}
              <strong>
                {roomId}
              </strong>
            </p>
          </div>
        )}

        {message && (
          <p>{message}</p>
        )}
      </section>

      <hr />

      {/* =========================
          JOIN ROOM
      ========================= */}

      <section>
        <h2>Join Room</h2>

        <input
          type="text"
          placeholder="Enter your username"
          value={joinUsername}
          onChange={(e) =>
            setJoinUsername(
              e.target.value
            )
          }
        />

        <br />
        <br />

        <input
          type="text"
          placeholder="Enter room code"
          value={joinRoomId}
          onChange={(e) =>
            setJoinRoomId(
              e.target.value
            )
          }
        />

        <br />
        <br />

        <button
          onClick={joinRoom}
          disabled={joinLoading}
        >
          {joinLoading
            ? "Joining..."
            : "Join Room"}
        </button>

        {joinMessage && (
          <p>
            {joinMessage}
          </p>
        )}
      </section>

      <hr />

      {/* =========================
          PARTICIPANTS
      ========================= */}

      <section>
        <h2>
          👥 Participants
        </h2>

        {participants.length ===
        0 ? (
          <p>
            No participants yet.
          </p>
        ) : (
          <ul>
            {participants.map(
              (
                participant,
                index
              ) => (
                <li
                  key={index}
                >
                  🟢{" "}
                  <strong>
                    {
                      participant.username
                    }
                  </strong>{" "}
                  —{" "}
                  {
                    participant.role
                  }
                </li>
              )
            )}
          </ul>
        )}
      </section>

      <hr />

      {/* =========================
          YOUTUBE VIDEO
      ========================= */}

      <section>
        <h2>
          📺 YouTube Video
        </h2>

        <input
          type="text"
          placeholder="Paste YouTube URL"
          value={youtubeUrl}
          onChange={(e) =>
            setYoutubeUrl(
              e.target.value
            )
          }
          style={{
            width: "500px",
          }}
        />

        <button
          onClick={loadVideo}
          style={{
            marginLeft: "10px",
          }}
        >
          Load Video
        </button>

        <br />
        <br />

        {videoId && (
          <>
            <YouTubePlayer
              videoId={videoId}
              isPlaying={isPlaying}
              currentTime={
                currentTime
              }
              onTimeUpdate={
                handleTimeUpdate
              }
            />

            <br />

            <button
              onClick={
                playVideo
              }
              disabled={isPlaying}
            >
              ▶️ Play
            </button>

            <button
              onClick={
                pauseVideo
              }
              disabled={!isPlaying}
              style={{
                marginLeft: "10px",
              }}
            >
              ⏸️ Pause
            </button>

            <p>
              Current Time:{" "}
              {Math.floor(
                currentTime
              )}{" "}
              seconds
            </p>
          </>
        )}
      </section>
    </div>
  );
}

export default App;