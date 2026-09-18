
import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import YouTubePlayer from "./YouTubePlayer";

type Participant = {
  username: string;
  role: string;
};

function App() {
  // =====================================
  // CREATE ROOM STATES
  // =====================================

  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // =====================================
  // JOIN ROOM STATES
  // =====================================

  const [joinUsername, setJoinUsername] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  // =====================================
  // YOUTUBE STATES
  // =====================================

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // =====================================
  // SOCKET STATES
  // =====================================

  const [socketStatus, setSocketStatus] =
    useState("Connecting...");

  const socketRef = useRef<Socket | null>(null);

  // =====================================
  // PARTICIPANTS
  // =====================================

  const [participants, setParticipants] =
    useState<Participant[]>([]);

  // =====================================
  // SOCKET.IO CONNECTION
  // =====================================

  useEffect(() => {
    const socket = io("http://localhost:5000");

    socketRef.current = socket;

    // =====================================
    // SOCKET CONNECTED
    // =====================================

    socket.on("connect", () => {
      setSocketStatus("🟢 Socket.IO Connected");

      console.log(
        "Connected to Socket.IO:",
        socket.id
      );
    });

    // =====================================
    // CONNECTION ERROR
    // =====================================

    socket.on("connect_error", (error) => {
      setSocketStatus(
        "🔴 Socket.IO Connection Failed"
      );

      console.error(
        "Socket error:",
        error
      );
    });

    // =====================================
    // DISCONNECTED
    // =====================================

    socket.on("disconnect", () => {
      setSocketStatus(
        "🟡 Socket.IO Disconnected"
      );

      console.log(
        "Disconnected from Socket.IO"
      );
    });

    // =====================================
    // PARTICIPANTS UPDATED
    // =====================================

    socket.on(
      "participants-updated",
      (data) => {
        console.log(
          "Updated participants:",
          data
        );

        if (
          data &&
          Array.isArray(data.participants)
        ) {
          const updatedParticipants =
            data.participants.map(
              (participant: any) => ({
                username:
                  participant.username ||
                  participant.name ||
                  "Unknown User",

                role:
                  participant.role ||
                  "PARTICIPANT",
              })
            );

          console.log(
            "Final participants:",
            updatedParticipants
          );

          setParticipants(
            updatedParticipants
          );
        }
      }
    );

    // =====================================
    // VIDEO PLAY RECEIVED
    // =====================================

    socket.on(
      "video-play",
      (data) => {
        console.log(
          "Received video-play:",
          data
        );

        setCurrentTime(
          Number(data?.currentTime) || 0
        );

        setIsPlaying(true);
      }
    );

    // =====================================
    // VIDEO PAUSE RECEIVED
    // =====================================

    socket.on(
      "video-pause",
      (data) => {
        console.log(
          "Received video-pause:",
          data
        );

        setCurrentTime(
          Number(data?.currentTime) || 0
        );

        setIsPlaying(false);
      }
    );

    // =====================================
    // VIDEO SEEK RECEIVED
    // =====================================

    socket.on(
      "video-seek",
      (data) => {
        console.log(
          "Received video-seek:",
          data
        );

        setCurrentTime(
          Number(data?.currentTime) || 0
        );
      }
    );

    // =====================================
    // CLEANUP
    // =====================================

    return () => {
      socket.disconnect();
    };
  }, []);

  // =====================================
  // EXTRACT YOUTUBE VIDEO ID
  // =====================================

  const extractVideoId = (
    url: string
  ): string | null => {
    try {
      const parsedUrl = new URL(url);

      // youtube.com/watch?v=VIDEO_ID

      if (
        parsedUrl.hostname.includes(
          "youtube.com"
        )
      ) {
        const id =
          parsedUrl.searchParams.get("v");

        if (id) {
          return id;
        }
      }

      // youtu.be/VIDEO_ID

      if (
        parsedUrl.hostname.includes(
          "youtu.be"
        )
      ) {
        const id =
          parsedUrl.pathname.substring(1);

        if (id) {
          return id;
        }
      }

      return null;
    } catch {
      return null;
    }
  };

  // =====================================
  // LOAD YOUTUBE VIDEO
  // =====================================

  const loadVideo = () => {
    if (!youtubeUrl.trim()) {
      alert(
        "Please enter a YouTube URL"
      );

      return;
    }

    const id =
      extractVideoId(youtubeUrl);

    if (!id) {
      alert(
        "Invalid YouTube URL"
      );

      return;
    }

    console.log(
      "Loading YouTube video:",
      id
    );

    setVideoId(id);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // =====================================
  // CREATE ROOM
  // =====================================

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

      console.log(
        "Room created response:",
        data
      );

      if (!response.ok) {
        setMessage(
          data.message ||
            "Failed to create room"
        );

        return;
      }

      // =====================================
      // SAVE ROOM ID
      // =====================================

      const createdRoomId =
        data.roomId;

      const hostUsername =
        username.trim();

      setRoomId(createdRoomId);

      console.log(
        "Room created:",
        createdRoomId
      );

      console.log(
        "Sending HOST to socket:",
        createdRoomId,
        hostUsername
      );

      // =====================================
      // JOIN SOCKET.IO ROOM
      // =====================================

      if (
        socketRef.current &&
        socketRef.current.connected
      ) {
        socketRef.current.emit(
          "join-room",
          {
            roomId:
              createdRoomId,

            username:
              hostUsername,

            role: "HOST",
          }
        );
      } else {
        console.log(
          "Socket not connected"
        );
      }

      setMessage(
        "Room created! You are the HOST."
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

  // =====================================
  // JOIN ROOM
  // =====================================

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

      console.log(
        "Room joined response:",
        data
      );

      if (!response.ok) {
        setJoinMessage(
          data.message ||
            "Failed to join room"
        );

        return;
      }

      // =====================================
      // SAVE ROOM ID
      // =====================================

      const joinedRoomId =
        data.roomId;

      const participantUsername =
        joinUsername.trim();

      setRoomId(joinedRoomId);

      console.log(
        "Room joined:",
        joinedRoomId
      );

      console.log(
        "Sending PARTICIPANT to socket:",
        joinedRoomId,
        participantUsername
      );

      // =====================================
      // JOIN SOCKET.IO ROOM
      // =====================================

      if (
        socketRef.current &&
        socketRef.current.connected
      ) {
        socketRef.current.emit(
          "join-room",
          {
            roomId:
              joinedRoomId,

            username:
              participantUsername,

            role: "PARTICIPANT",
          }
        );
      } else {
        console.log(
          "Socket not connected"
        );
      }

      setJoinMessage(
        "Joined room successfully! You are the PARTICIPANT."
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

  // =====================================
  // VIDEO PLAY
  // =====================================

  const handlePlay = (
    time: number
  ) => {
    setIsPlaying(true);
    setCurrentTime(time);

    console.log(
      "Sending video-play:",
      roomId,
      time
    );

    if (
      socketRef.current &&
      roomId
    ) {
      socketRef.current.emit(
        "video-play",
        {
          roomId,
          currentTime: time,
        }
      );
    }
  };

  // =====================================
  // VIDEO PAUSE
  // =====================================

  const handlePause = (
    time: number
  ) => {
    setIsPlaying(false);
    setCurrentTime(time);

    console.log(
      "Sending video-pause:",
      roomId,
      time
    );

    if (
      socketRef.current &&
      roomId
    ) {
      socketRef.current.emit(
        "video-pause",
        {
          roomId,
          currentTime: time,
        }
      );
    }
  };

  // =====================================
  // VIDEO SEEK
  // =====================================

  const handleSeek = (
    time: number
  ) => {
    setCurrentTime(time);

    console.log(
      "Sending video-seek:",
      roomId,
      time
    );

    if (
      socketRef.current &&
      roomId
    ) {
      socketRef.current.emit(
        "video-seek",
        {
          roomId,
          currentTime: time,
        }
      );
    }
  };

  // =====================================
  // MANUAL PLAY BUTTON
  // =====================================

  const playVideo = () => {
    const time =
      currentTime || 0;

    handlePlay(time);
  };

  // =====================================
  // MANUAL PAUSE BUTTON
  // =====================================

  const pauseVideo = () => {
    const time =
      currentTime || 0;

    handlePause(time);
  };

  // =====================================
  // UI
  // =====================================

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "30px",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      {/* TITLE */}

      <h1>
        🎬 YouTube Watch Party
      </h1>

      <p>
        Socket status:{" "}
        {socketStatus}
      </p>

      <hr />

      {/* CREATE ROOM */}

      <section>
        <h2>
          Create Room
        </h2>

        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) =>
            setUsername(
              e.target.value
            )
          }
          style={{
            padding: "8px",
            width: "300px",
          }}
        />

        <br />
        <br />

        <button
          onClick={createRoom}
          disabled={loading}
          style={{
            padding:
              "10px 20px",
            cursor:
              "pointer",
          }}
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
          <p>
            {message}
          </p>
        )}
      </section>

      <hr />

      {/* JOIN ROOM */}

      <section>
        <h2>
          Join Room
        </h2>

        <input
          type="text"
          placeholder="Enter your username"
          value={joinUsername}
          onChange={(e) =>
            setJoinUsername(
              e.target.value
            )
          }
          style={{
            padding: "8px",
            width: "300px",
          }}
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
          style={{
            padding: "8px",
            width: "300px",
          }}
        />

        <br />
        <br />

        <button
          onClick={joinRoom}
          disabled={joinLoading}
          style={{
            padding:
              "10px 20px",
            cursor:
              "pointer",
          }}
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

      {/* YOUTUBE VIDEO */}

      <section>
        <h2>
          🎥 YouTube Video
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
            width: "400px",
            padding: "8px",
          }}
        />

        <button
          onClick={loadVideo}
          style={{
            marginLeft: "10px",
            padding:
              "8px 15px",
            cursor:
              "pointer",
          }}
        >
          Load Video
        </button>

        {videoId && (
          <div
            style={{
              marginTop: "20px",
            }}
          >
            {/* PLAYER */}

            <YouTubePlayer
              videoId={videoId}
              isPlaying={isPlaying}
              currentTime={currentTime}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
            />

            {/* PLAY / PAUSE BUTTONS */}

            <div
              style={{
                marginTop: "15px",
                display: "flex",
                gap: "10px",
              }}
            >
              <button
                onClick={playVideo}
                style={{
                  padding:
                    "10px 25px",
                  fontSize:
                    "16px",
                  cursor:
                    "pointer",
                }}
              >
                ▶️ Play
              </button>

              <button
                onClick={pauseVideo}
                style={{
                  padding:
                    "10px 25px",
                  fontSize:
                    "16px",
                  cursor:
                    "pointer",
                }}
              >
                ⏸️ Pause
              </button>
            </div>

            {/* VIDEO STATUS */}

            <p>
              Status:{" "}
              <strong>
                {isPlaying
                  ? "▶️ Playing"
                  : "⏸️ Paused"}
              </strong>
            </p>

            <p>
              Current Time:{" "}
              {currentTime.toFixed(1)}
              s
            </p>
          </div>
        )}
      </section>

      <hr />

      {/* PARTICIPANTS */}

      <section>
        <h2>
          👥 Participants
        </h2>

        {participants.length === 0 ? (
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
                  key={`${participant.username}-${index}`}
                  style={{
                    marginBottom:
                      "10px",
                  }}
                >
                  🟢{" "}
                  <strong>
                    {
                      participant.username
                    }
                  </strong>

                  {" — "}

                  <span>
                    {
                      participant.role
                    }
                  </span>
                </li>
              )
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

export default App;
