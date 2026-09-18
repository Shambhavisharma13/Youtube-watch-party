import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import YouTubePlayer from "./YouTubePlayer";
import "./App.css";

type Participant = {
  username: string;
  role: string;
};

type ChatMessage = {
  id: string;
  text: string;
  username: string;
  role: string;
  timestamp: string;
};

type FloatingReaction = {
  id: string;
  emoji: string;
  left: number;
};

// Preset sample videos for quick testing
const SAMPLE_VIDEOS = [
  {
    title: "🎧 Lofi Hip Hop",
    url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
  },
  {
    title: "🐰 Big Buck Bunny",
    url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
  },
  {
    title: "🌆 Synthwave Chill",
    url: "https://www.youtube.com/watch?v=4xDzrJKXOOY",
  },
];

const REACTION_EMOJIS = ["🔥", "❤️", "😂", "🍿", "🚀", "👏"];

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

  // Active Lobby Tab ("create" | "join")
  const [activeLobbyTab, setActiveLobbyTab] = useState<"create" | "join">("create");

  // Track who the current local user is
  const [currentUsername, setCurrentUsername] = useState("");

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

  const [socketStatus, setSocketStatus] = useState("Connecting...");
  const socketRef = useRef<Socket | null>(null);

  // =====================================
  // PARTICIPANTS & CHAT
  // =====================================

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [sidebarTab, setSidebarTab] = useState<"participants" | "chat">("participants");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // =====================================
  // UI & REACTIONS
  // =====================================

  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Determine current user's role
  const currentUserRole =
    participants.find(
      (p) => p.username.toLowerCase() === currentUsername.toLowerCase()
    )?.role || "PARTICIPANT";

  const isHost = currentUserRole === "HOST";
  const canControl = currentUserRole === "HOST" || currentUserRole === "MODERATOR";

  // Check URL query parameters for ?room=ROOMCODE on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    if (roomParam) {
      setJoinRoomId(roomParam.toUpperCase());
      setActiveLobbyTab("join");
    }
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // =====================================
  // SOCKET.IO CONNECTION
  // =====================================

  useEffect(() => {
    const socket = io("http://localhost:5000");
    socketRef.current = socket;

    // SOCKET CONNECTED
    socket.on("connect", () => {
      setSocketStatus("🟢 Connected");
      console.log("Connected to Socket.IO:", socket.id);
    });

    // CONNECTION ERROR
    socket.on("connect_error", (error) => {
      setSocketStatus("🔴 Connection Failed");
      console.error("Socket error:", error);
    });

    // DISCONNECTED
    socket.on("disconnect", () => {
      setSocketStatus("🟡 Disconnected");
      console.log("Disconnected from Socket.IO");
    });

    // PARTICIPANTS UPDATED
    socket.on("participants-updated", (data) => {
      console.log("Updated participants:", data);

      if (data && Array.isArray(data.participants)) {
        const updatedParticipants = data.participants.map((participant: any) => ({
          username:
            participant.username ||
            participant.name ||
            "Unknown User",
          role: participant.role || "PARTICIPANT",
        }));

        setParticipants(updatedParticipants);
      }
    });

    // INITIAL SYNC STATE (FOR LATE JOINERS)
    socket.on("sync-state", (data) => {
      console.log("Received sync-state:", data);
      if (data?.videoId) {
        setVideoId(data.videoId);
      }
      if (typeof data?.currentTime === "number") {
        setCurrentTime(data.currentTime);
      }
      if (typeof data?.isPlaying === "boolean") {
        setIsPlaying(data.isPlaying);
      }
      showToast("🔄 Synced with party video");
    });

    // VIDEO PLAY RECEIVED
    socket.on("video-play", (data) => {
      console.log("Received video-play:", data);
      setCurrentTime(Number(data?.currentTime) || 0);
      setIsPlaying(true);
    });

    // VIDEO PAUSE RECEIVED
    socket.on("video-pause", (data) => {
      console.log("Received video-pause:", data);
      setCurrentTime(Number(data?.currentTime) || 0);
      setIsPlaying(false);
    });

    // VIDEO SEEK RECEIVED
    socket.on("video-seek", (data) => {
      console.log("Received video-seek:", data);
      setCurrentTime(Number(data?.currentTime) || 0);
    });

    // VIDEO CHANGE RECEIVED
    socket.on("change-video", (data) => {
      console.log("Received change-video:", data);
      if (data?.videoId) {
        setVideoId(data.videoId);
        setCurrentTime(0);
        setIsPlaying(false);
        showToast("🎬 New video loaded by room leader");
      }
    });

    // ROLE ASSIGNED
    socket.on("role-assigned", (data) => {
      if (data?.targetUsername && data?.newRole) {
        showToast(`🛡️ ${data.targetUsername} is now ${data.newRole}`);
      }
    });

    // PERMISSION DENIED
    socket.on("permission-denied", (data) => {
      showToast(`⚠️ ${data?.message || "Permission denied"}`);
    });

    // KICKED / REMOVED BY HOST
    socket.on("kicked", (data) => {
      alert(data?.message || "You were removed from the room by the host.");
      setRoomId("");
      setVideoId("");
      setParticipants([]);
      setChatMessages([]);
    });

    // CHAT MESSAGE RECEIVED
    socket.on("chat-message", (data: ChatMessage) => {
      setChatMessages((prev) => [...prev, data]);
    });

    // REACTION RECEIVED
    socket.on("receive-reaction", (data) => {
      const reactionId = String(data.id || Math.random());
      const randomLeft = 15 + Math.random() * 70; // 15% to 85% width

      setReactions((prev) => [
        ...prev,
        { id: reactionId, emoji: data.emoji, left: randomLeft },
      ]);

      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reactionId));
      }, 2800);
    });

    // CLEANUP
    return () => {
      socket.disconnect();
    };
  }, []);

  // =====================================
  // EXTRACT YOUTUBE VIDEO ID
  // =====================================

  const extractVideoId = (url: string): string | null => {
    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.hostname.includes("youtube.com")) {
        const id = parsedUrl.searchParams.get("v");
        if (id) return id;
      }

      if (parsedUrl.hostname.includes("youtu.be")) {
        const id = parsedUrl.pathname.substring(1);
        if (id) return id;
      }

      return null;
    } catch {
      // Check if user directly pasted an 11-char video ID
      if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
        return url.trim();
      }
      return null;
    }
  };

  // =====================================
  // LOAD YOUTUBE VIDEO
  // =====================================

  const loadVideo = () => {
    if (!youtubeUrl.trim()) {
      showToast("⚠️ Please enter a YouTube URL");
      return;
    }

    if (!canControl) {
      showToast("🔒 Only Host or Moderator can change the video");
      return;
    }

    const id = extractVideoId(youtubeUrl);

    if (!id) {
      showToast("⚠️ Invalid YouTube URL or Video ID");
      return;
    }

    console.log("Loading YouTube video:", id);
    setVideoId(id);
    setIsPlaying(false);
    setCurrentTime(0);

    // Broadcast change-video across socket
    if (socketRef.current && roomId) {
      socketRef.current.emit("change-video", {
        roomId,
        videoId: id,
      });
    }

    showToast("🎬 Video loaded and broadcasted to room");
  };

  // =====================================
  // CREATE ROOM
  // =====================================

  const createRoom = async () => {
    if (!username.trim()) {
      setMessage("Please enter your username");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("http://localhost:5000/api/rooms/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
        }),
      });

      const data = await response.json();
      console.log("Room created response:", data);

      if (!response.ok) {
        setMessage(data.message || "Failed to create room");
        return;
      }

      const createdRoomId = data.roomId;
      const hostUsername = username.trim();

      setRoomId(createdRoomId);
      setCurrentUsername(hostUsername);

      console.log("Room created:", createdRoomId);

      // Join socket room
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("join-room", {
          roomId: createdRoomId,
          username: hostUsername,
          role: "HOST",
        });
      }

      setMessage("Room created! You are the HOST.");
      showToast("🎉 Watch party room created!");
    } catch (error) {
      console.error(error);
      setMessage("Cannot connect to server");
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // JOIN ROOM
  // =====================================

  const joinRoom = async () => {
    if (!joinUsername.trim()) {
      setJoinMessage("Please enter your username");
      return;
    }

    if (!joinRoomId.trim()) {
      setJoinMessage("Please enter the room code");
      return;
    }

    setJoinLoading(true);
    setJoinMessage("");

    try {
      const formattedRoomCode = joinRoomId.trim().toUpperCase();

      const response = await fetch("http://localhost:5000/api/rooms/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId: formattedRoomCode,
          username: joinUsername.trim(),
        }),
      });

      const data = await response.json();
      console.log("Room joined response:", data);

      if (!response.ok) {
        setJoinMessage(data.message || "Failed to join room");
        return;
      }

      const joinedRoomId = data.roomId;
      const participantUsername = joinUsername.trim();

      setRoomId(joinedRoomId);
      setCurrentUsername(participantUsername);

      // Join socket room
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("join-room", {
          roomId: joinedRoomId,
          username: participantUsername,
          role: data.role || "PARTICIPANT",
        });
      }

      setJoinMessage("Joined room successfully! You are a PARTICIPANT.");
      showToast(`🍿 Joined room ${joinedRoomId}`);
    } catch (error) {
      console.error(error);
      setJoinMessage("Cannot connect to server");
    } finally {
      setJoinLoading(false);
    }
  };

  // =====================================
  // VIDEO PLAY
  // =====================================

  const handlePlay = (time: number) => {
    if (!canControl) {
      showToast("🔒 Only Host and Moderator can control playback");
      return;
    }

    setIsPlaying(true);
    setCurrentTime(time);

    console.log("Sending video-play:", roomId, time);

    if (socketRef.current && roomId) {
      socketRef.current.emit("video-play", {
        roomId,
        currentTime: time,
      });
    }
  };

  // =====================================
  // VIDEO PAUSE
  // =====================================

  const handlePause = (time: number) => {
    if (!canControl) {
      showToast("🔒 Only Host and Moderator can control playback");
      return;
    }

    setIsPlaying(false);
    setCurrentTime(time);

    console.log("Sending video-pause:", roomId, time);

    if (socketRef.current && roomId) {
      socketRef.current.emit("video-pause", {
        roomId,
        currentTime: time,
      });
    }
  };

  // =====================================
  // VIDEO SEEK
  // =====================================

  const handleSeek = (time: number) => {
    if (!canControl) {
      showToast("🔒 Only Host and Moderator can seek video");
      return;
    }

    setCurrentTime(time);

    console.log("Sending video-seek:", roomId, time);

    if (socketRef.current && roomId) {
      socketRef.current.emit("video-seek", {
        roomId,
        currentTime: time,
      });
    }
  };

  // Manual Play Button
  const playVideo = () => {
    const time = currentTime || 0;
    handlePlay(time);
  };

  // Manual Pause Button
  const pauseVideo = () => {
    const time = currentTime || 0;
    handlePause(time);
  };

  // =====================================
  // ROLE MANAGEMENT (HOST ONLY)
  // =====================================

  const handleAssignRole = (targetUsername: string, newRole: string) => {
    if (!isHost) {
      showToast("⚠️ Only the Host can assign roles");
      return;
    }

    if (socketRef.current && roomId) {
      socketRef.current.emit("assign-role", {
        roomId,
        targetUsername,
        newRole,
      });
      showToast(`Updated ${targetUsername} to ${newRole}`);
    }
  };

  const handleRemoveParticipant = (targetUsername: string) => {
    if (!isHost) {
      showToast("⚠️ Only the Host can remove participants");
      return;
    }

    if (window.confirm(`Remove ${targetUsername} from the watch party?`)) {
      if (socketRef.current && roomId) {
        socketRef.current.emit("remove-participant", {
          roomId,
          targetUsername,
        });
        showToast(`Removed ${targetUsername}`);
      }
    }
  };

  // =====================================
  // CHAT & REACTIONS
  // =====================================

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !roomId) return;

    if (socketRef.current) {
      socketRef.current.emit("chat-message", {
        roomId,
        message: chatInput.trim(),
        username: currentUsername,
        role: currentUserRole,
      });
    }

    setChatInput("");
  };

  const handleSendReaction = (emoji: string) => {
    if (!roomId) return;

    if (socketRef.current) {
      socketRef.current.emit("send-reaction", {
        roomId,
        emoji,
        username: currentUsername,
      });
    }
  };

  // =====================================
  // LEAVE ROOM
  // =====================================

  const handleLeaveRoom = () => {
    if (window.confirm("Are you sure you want to leave the watch party?")) {
      if (socketRef.current && roomId) {
        socketRef.current.emit("leave-room");
      }
      setRoomId("");
      setVideoId("");
      setParticipants([]);
      setChatMessages([]);
      showToast("👋 You left the party");
    }
  };

  // Copy Room Link
  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    showToast("📋 Invite link copied to clipboard!");
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    showToast("📋 Room code copied!");
  };

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // =====================================
  // RENDER
  // =====================================

  return (
    <div className="app-container">
      {/* FLOATING EMOJI REACTIONS */}
      <div className="floating-reactions-container">
        {reactions.map((reaction) => (
          <span
            key={reaction.id}
            className="floating-reaction"
            style={{ left: `${reaction.left}%` }}
          >
            {reaction.emoji}
          </span>
        ))}
      </div>

      {/* TOAST ALERTS */}
      {toast && (
        <div className="toast-container">
          <div className="toast">{toast}</div>
        </div>
      )}

      {/* TOP NAVIGATION HEADER */}
      <header className="app-header">
        <div className="brand" onClick={() => !roomId && window.location.reload()}>
          <div className="brand-icon-wrapper">🎬</div>
          <div>
            <span className="brand-title">WatchParty</span>
            <span className="brand-badge">PRO</span>
          </div>
        </div>

        <div className="header-actions">
          {/* Socket Status */}
          <div className="socket-pill">
            <span
              className={`socket-dot ${
                socketStatus.includes("Connected")
                  ? "connected"
                  : socketStatus.includes("Failed")
                  ? "failed"
                  : ""
              }`}
            />
            <span>{socketStatus}</span>
          </div>

          {/* If In Room: Show Room Code & User Info */}
          {roomId && (
            <>
              <div className="room-code-badge">
                <span>Room:</span>
                <strong>{roomId}</strong>
                <button
                  type="button"
                  className="copy-btn"
                  onClick={copyRoomCode}
                  title="Copy room code"
                >
                  📋 Code
                </button>
                <button
                  type="button"
                  className="copy-btn"
                  onClick={copyInviteLink}
                  title="Copy full invite link"
                >
                  🔗 Link
                </button>
              </div>

              <div className="user-tag">
                <span>{currentUsername || "You"}</span>
                <span
                  className={`role-badge ${currentUserRole.toLowerCase()}`}
                >
                  {currentUserRole === "HOST" ? "👑 " : currentUserRole === "MODERATOR" ? "🛡️ " : "👁️ "}
                  {currentUserRole}
                </span>
              </div>

              <button
                type="button"
                className="leave-btn"
                onClick={handleLeaveRoom}
              >
                🚪 Leave Party
              </button>
            </>
          )}
        </div>
      </header>

      {/* =========================================================
          VIEW A: LOBBY VIEW (WHEN NOT IN A ROOM)
          ========================================================= */}
      {!roomId ? (
        <main className="lobby-wrapper">
          <div className="hero-section">
            <div className="hero-pill">✨ Real-time YouTube Watch Party</div>
            <h1 className="hero-title">Watch Videos Together,<br />Perfect In Sync.</h1>
            <p className="hero-subtitle">
              Host movie nights, binge music videos, or study with friends.
              Featuring synchronized playback, role-based controls, and live reaction chat.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${activeLobbyTab === "create" ? "active" : ""}`}
              onClick={() => setActiveLobbyTab("create")}
            >
              🚀 Create Watch Party
            </button>
            <button
              type="button"
              className={`auth-tab ${activeLobbyTab === "join" ? "active" : ""}`}
              onClick={() => setActiveLobbyTab("join")}
            >
              🔑 Join with Code
            </button>
          </div>

          {/* Form Card */}
          <div className="card-lobby">
            {activeLobbyTab === "create" ? (
              /* CREATE ROOM FORM */
              <div className="lobby-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="create-username">
                    Your Display Name
                  </label>
                  <div className="input-icon-wrapper">
                    <span className="input-icon">👤</span>
                    <input
                      id="create-username"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Alex, Sarah, Neo..."
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && createRoom()}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="submit-btn"
                  onClick={createRoom}
                  disabled={loading}
                >
                  {loading ? "Creating Theater..." : "🚀 Launch Party as Host"}
                </button>

                {message && (
                  <div
                    className={`alert-message ${
                      message.includes("created") ? "alert-success" : "alert-error"
                    }`}
                  >
                    {message}
                  </div>
                )}
              </div>
            ) : (
              /* JOIN ROOM FORM */
              <div className="lobby-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="join-username">
                    Your Display Name
                  </label>
                  <div className="input-icon-wrapper">
                    <span className="input-icon">👤</span>
                    <input
                      id="join-username"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Jordan, Sam..."
                      value={joinUsername}
                      onChange={(e) => setJoinUsername(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="join-room-id">
                    6-Character Room Code
                  </label>
                  <div className="input-icon-wrapper">
                    <span className="input-icon">🔑</span>
                    <input
                      id="join-room-id"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 7A9K2M"
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="submit-btn"
                  onClick={joinRoom}
                  disabled={joinLoading}
                >
                  {joinLoading ? "Connecting to Room..." : "🍿 Join Watch Party"}
                </button>

                {joinMessage && (
                  <div
                    className={`alert-message ${
                      joinMessage.includes("success") ? "alert-success" : "alert-error"
                    }`}
                  >
                    {joinMessage}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Highlight Features */}
          <div className="lobby-features">
            <div className="feature-box">
              <div className="feature-icon">⚡</div>
              <h3 className="feature-title">Real-Time Sync</h3>
              <p className="feature-desc">
                When host plays, pauses, or scrubs the timeline, all viewers sync instantly.
              </p>
            </div>
            <div className="feature-box">
              <div className="feature-icon">👑</div>
              <h3 className="feature-title">Role-Based Access</h3>
              <p className="feature-desc">
                Host manages permissions, promotes moderators, or restricts playback tampering.
              </p>
            </div>
            <div className="feature-box">
              <div className="feature-icon">💬</div>
              <h3 className="feature-title">Live Chat & Reactions</h3>
              <p className="feature-desc">
                Cheer together with floating emoji explosions and room messaging in real-time.
              </p>
            </div>
          </div>
        </main>
      ) : (
        /* =========================================================
            VIEW B: CINEMA THEATER VIEW (INSIDE ROOM)
            ========================================================= */
        <main className="theater-layout">
          {/* LEFT COLUMN: CINEMA STAGE & CONTROLS */}
          <div className="cinema-column">
            {/* VIDEO STAGE */}
            <div className="cinema-stage">
              {videoId ? (
                <YouTubePlayer
                  videoId={videoId}
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  canControl={canControl}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onSeek={handleSeek}
                />
              ) : (
                <div className="player-empty">
                  <div className="empty-icon">📺</div>
                  <h2 className="empty-title">Ready for Showtime</h2>
                  <p className="empty-subtitle">
                    {canControl
                      ? "Paste any YouTube link below or pick a preset to stream video to all participants."
                      : "Waiting for the Host to pick a video to start the stream..."}
                  </p>
                </div>
              )}
            </div>

            {/* PLAYBACK CONTROL DECK */}
            <div className="control-deck">
              <div className="deck-left">
                <div className="sync-status-badge">
                  <span>{isPlaying ? "▶️ Playing" : "⏸️ Paused"}</span>
                </div>
                <div className="time-counter">
                  ⏱️ {formatTime(currentTime)} ({currentTime.toFixed(1)}s)
                </div>
              </div>

              {canControl ? (
                <div className="deck-playback-btns">
                  <button
                    type="button"
                    className={`playback-btn ${!isPlaying ? "play-primary" : ""}`}
                    onClick={playVideo}
                  >
                    ▶️ Play
                  </button>
                  <button
                    type="button"
                    className={`playback-btn ${isPlaying ? "play-primary" : ""}`}
                    onClick={pauseVideo}
                  >
                    ⏸️ Pause
                  </button>
                </div>
              ) : (
                <div className="watcher-notice">
                  <span>🔒 Watcher Mode (Synced with Host)</span>
                </div>
              )}
            </div>

            {/* LOAD / CHANGE VIDEO BAR (HOST & MODERATOR) */}
            {canControl ? (
              <div className="video-loader-card">
                <div className="loader-header">
                  <span className="loader-title">🎬 Stream YouTube Video</span>
                </div>

                <div className="url-input-row">
                  <input
                    type="text"
                    className="url-input"
                    placeholder="Paste YouTube link (e.g. https://www.youtube.com/watch?v=...)"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadVideo()}
                  />
                  <button
                    type="button"
                    className="load-video-btn"
                    onClick={loadVideo}
                  >
                    Sync & Play
                  </button>
                </div>

                {/* Preset Suggestions */}
                <div className="preset-chips">
                  <span className="preset-label">Quick Picks:</span>
                  {SAMPLE_VIDEOS.map((item) => (
                    <button
                      key={item.url}
                      type="button"
                      className="chip-btn"
                      onClick={() => {
                        setYoutubeUrl(item.url);
                        const id = extractVideoId(item.url);
                        if (id) {
                          setVideoId(id);
                          setCurrentTime(0);
                          setIsPlaying(false);
                          if (socketRef.current && roomId) {
                            socketRef.current.emit("change-video", {
                              roomId,
                              videoId: id,
                            });
                          }
                          showToast(`🎬 Loaded: ${item.title}`);
                        }
                      }}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* RIGHT COLUMN: PARTICIPANTS & CHAT SIDEBAR */}
          <aside className="sidebar-column">
            {/* Sidebar Tab Header */}
            <div className="sidebar-tabs">
              <button
                type="button"
                className={`sidebar-tab-btn ${sidebarTab === "participants" ? "active" : ""}`}
                onClick={() => setSidebarTab("participants")}
              >
                👥 Crew <span className="tab-count">{participants.length}</span>
              </button>
              <button
                type="button"
                className={`sidebar-tab-btn ${sidebarTab === "chat" ? "active" : ""}`}
                onClick={() => setSidebarTab("chat")}
              >
                💬 Live Chat <span className="tab-count">{chatMessages.length}</span>
              </button>
            </div>

            {/* TAB 1: PARTICIPANTS */}
            {sidebarTab === "participants" && (
              <div className="tab-content">
                <ul className="participants-list">
                  {participants.map((p, idx) => {
                    const isSelf = p.username.toLowerCase() === currentUsername.toLowerCase();
                    return (
                      <li key={`${p.username}-${idx}`} className="participant-item">
                        <div className="participant-info">
                          <div className="avatar">
                            {p.username.substring(0, 2)}
                          </div>
                          <div className="participant-details">
                            <span className="participant-name">
                              {p.username}
                              {isSelf && <span className="is-you-badge">(You)</span>}
                            </span>
                            <span
                              className={`role-badge ${p.role.toLowerCase()}`}
                            >
                              {p.role === "HOST" ? "👑 " : p.role === "MODERATOR" ? "🛡️ " : "👁️ "}
                              {p.role}
                            </span>
                          </div>
                        </div>

                        {/* Host Controls for other users */}
                        {isHost && !isSelf && (
                          <div className="participant-actions">
                            {p.role === "PARTICIPANT" ? (
                              <button
                                type="button"
                                className="action-icon-btn"
                                title="Promote to Moderator"
                                onClick={() => handleAssignRole(p.username, "MODERATOR")}
                              >
                                🛡️ Make Mod
                              </button>
                            ) : p.role === "MODERATOR" ? (
                              <button
                                type="button"
                                className="action-icon-btn"
                                title="Demote to Participant"
                                onClick={() => handleAssignRole(p.username, "PARTICIPANT")}
                              >
                                👁️ Make Viewer
                              </button>
                            ) : null}

                            <button
                              type="button"
                              className="action-icon-btn danger"
                              title="Remove from room"
                              onClick={() => handleRemoveParticipant(p.username)}
                            >
                              ❌
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* TAB 2: LIVE CHAT */}
            {sidebarTab === "chat" && (
              <div className="tab-content chat-container">
                <div className="chat-messages">
                  {chatMessages.length === 0 ? (
                    <div className="chat-empty">
                      <span>💬</span>
                      <span>No messages yet. Say hi to the party!</span>
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isOwn = msg.username.toLowerCase() === currentUsername.toLowerCase();
                      return (
                        <div
                          key={msg.id}
                          className={`chat-bubble ${isOwn ? "own" : ""}`}
                        >
                          <div className="chat-meta">
                            <span className="chat-author">
                              {msg.username}
                              <span className={`role-badge ${msg.role.toLowerCase()}`}>
                                {msg.role}
                              </span>
                            </span>
                            <span className="chat-time">{msg.timestamp}</span>
                          </div>
                          <p className="chat-text">{msg.text}</p>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Quick Emoji Reaction Bar */}
                <div className="reaction-bar">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="reaction-btn"
                      onClick={() => handleSendReaction(emoji)}
                      title={`Send ${emoji} reaction`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Chat Message Input */}
                <form className="chat-form" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    className="chat-input"
                    placeholder="Send a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button type="submit" className="chat-send-btn">
                    Send
                  </button>
                </form>
              </div>
            )}
          </aside>
        </main>
      )}
    </div>
  );
}

export default App;
