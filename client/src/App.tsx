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

const SAMPLE_VIDEOS = [
  {
    title: "Big Buck Bunny",
    url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
  },
  {
    title: "Lofi Beats",
    url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
  },
  {
    title: "Synthwave Radio",
    url: "https://www.youtube.com/watch?v=4xDzrJKXOOY",
  },
];

const REACTION_EMOJIS = ["🔥", "❤️", "😂", "🍿", "👏"];

function App() {
  // Create room state
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Join room state
  const [joinUsername, setJoinUsername] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  // Active tab in lobby ('create' | 'join')
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");

  // Current logged in username
  const [currentUsername, setCurrentUsername] = useState("");

  // Video state
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Socket state
  const [socketStatus, setSocketStatus] = useState("Connecting...");
  const socketRef = useRef<Socket | null>(null);

  // Room state
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [sidebarTab, setSidebarTab] = useState<"participants" | "chat">("participants");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // UI feedback
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => {
      setToast(null);
    }, 2800);
  };

  // Check user role
  const currentUserRole =
    participants.find(
      (p) => p.username.toLowerCase() === currentUsername.toLowerCase()
    )?.role || "PARTICIPANT";

  const isHost = currentUserRole === "HOST";
  const canControl = currentUserRole === "HOST" || currentUserRole === "MODERATOR";

  // Pre-fill room code from URL ?room=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    if (roomParam) {
      setJoinRoomId(roomParam.toUpperCase());
      setActiveTab("join");
    }
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Initialize socket connection
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const socket = io(API_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketStatus("Connected");
    });

    socket.on("connect_error", () => {
      setSocketStatus("Disconnected");
    });

    socket.on("disconnect", () => {
      setSocketStatus("Disconnected");
    });

    // Participant list updates
    socket.on("participants-updated", (data) => {
      if (data && Array.isArray(data.participants)) {
        setParticipants(
          data.participants.map((p: any) => ({
            username: p.username || p.name || "Unknown",
            role: p.role || "PARTICIPANT",
          }))
        );
      }
    });

    // Catch-up video state for new joiner
    socket.on("sync-state", (data) => {
      if (data?.videoId) setVideoId(data.videoId);
      if (typeof data?.currentTime === "number") setCurrentTime(data.currentTime);
      if (typeof data?.isPlaying === "boolean") setIsPlaying(data.isPlaying);
      showToast("Synced with room playback");
    });

    // Sync play
    socket.on("video-play", (data) => {
      setCurrentTime(Number(data?.currentTime) || 0);
      setIsPlaying(true);
    });

    // Sync pause
    socket.on("video-pause", (data) => {
      setCurrentTime(Number(data?.currentTime) || 0);
      setIsPlaying(false);
    });

    // Sync seek
    socket.on("video-seek", (data) => {
      setCurrentTime(Number(data?.currentTime) || 0);
    });

    // Sync video change
    socket.on("change-video", (data) => {
      if (data?.videoId) {
        setVideoId(data.videoId);
        setCurrentTime(0);
        setIsPlaying(false);
        showToast("Video changed by room controller");
      }
    });

    // Role assignment notification
    socket.on("role-assigned", (data) => {
      if (data?.targetUsername && data?.newRole) {
        showToast(`${data.targetUsername} is now ${data.newRole}`);
      }
    });

    // Permission warnings
    socket.on("permission-denied", (data) => {
      showToast(data?.message || "Permission denied");
    });

    // Removed by host
    socket.on("kicked", (data) => {
      alert(data?.message || "You were removed from the room.");
      setRoomId("");
      setVideoId("");
      setParticipants([]);
      setChatMessages([]);
    });

    // Chat messages
    socket.on("chat-message", (data: ChatMessage) => {
      setChatMessages((prev) => [...prev, data]);
    });

    // Floating reaction
    socket.on("receive-reaction", (data) => {
      const id = String(data.id || Math.random());
      const left = 20 + Math.random() * 60;
      setReactions((prev) => [...prev, { id, emoji: data.emoji, left }]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2600);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Parse YouTube video ID from URL
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
      if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
        return url.trim();
      }
      return null;
    }
  };

  // Load video & notify room
  const loadVideo = () => {
    if (!youtubeUrl.trim()) {
      showToast("Please enter a YouTube URL");
      return;
    }

    if (!canControl) {
      showToast("Only Host or Moderator can change video");
      return;
    }

    const id = extractVideoId(youtubeUrl);
    if (!id) {
      showToast("Invalid YouTube URL");
      return;
    }

    setVideoId(id);
    setIsPlaying(false);
    setCurrentTime(0);

    if (socketRef.current && roomId) {
      socketRef.current.emit("change-video", {
        roomId,
        videoId: id,
      });
    }

    showToast("Video loaded");
  };

  // Create a new room via API + Socket
  const createRoom = async () => {
    if (!username.trim()) {
      setMessage("Please enter your username");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/api/rooms/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || "Failed to create room");
        return;
      }

      const createdRoomId = data.roomId;
      const hostUser = username.trim();

      setRoomId(createdRoomId);
      setCurrentUsername(hostUser);

      if (socketRef.current?.connected) {
        socketRef.current.emit("join-room", {
          roomId: createdRoomId,
          username: hostUser,
          role: "HOST",
        });
      }

      showToast("Room created");
    } catch (err) {
      console.error(err);
      setMessage("Cannot connect to server");
    } finally {
      setLoading(false);
    }
  };

  // Join existing room
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
      const formattedCode = joinRoomId.trim().toUpperCase();
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/api/rooms/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: formattedCode,
          username: joinUsername.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setJoinMessage(data.message || "Failed to join room");
        return;
      }

      const joinedRoomId = data.roomId;
      const participantUser = joinUsername.trim();

      setRoomId(joinedRoomId);
      setCurrentUsername(participantUser);

      if (socketRef.current?.connected) {
        socketRef.current.emit("join-room", {
          roomId: joinedRoomId,
          username: participantUser,
          role: data.role || "PARTICIPANT",
        });
      }

      showToast(`Joined room ${joinedRoomId}`);
    } catch (err) {
      console.error(err);
      setJoinMessage("Cannot connect to server");
    } finally {
      setJoinLoading(false);
    }
  };

  // Handlers for playback controls
  const handlePlay = (time: number) => {
    if (!canControl) {
      showToast("Playback controlled by Host/Moderator");
      return;
    }
    setIsPlaying(true);
    setCurrentTime(time);
    if (socketRef.current && roomId) {
      socketRef.current.emit("video-play", { roomId, currentTime: time });
    }
  };

  const handlePause = (time: number) => {
    if (!canControl) {
      showToast("Playback controlled by Host/Moderator");
      return;
    }
    setIsPlaying(false);
    setCurrentTime(time);
    if (socketRef.current && roomId) {
      socketRef.current.emit("video-pause", { roomId, currentTime: time });
    }
  };

  const handleSeek = (time: number) => {
    if (!canControl) {
      showToast("Seek controlled by Host/Moderator");
      return;
    }
    setCurrentTime(time);
    if (socketRef.current && roomId) {
      socketRef.current.emit("video-seek", { roomId, currentTime: time });
    }
  };

  const playVideo = () => handlePlay(currentTime || 0);
  const pauseVideo = () => handlePause(currentTime || 0);

  // Host role assignment & kick
  const handleAssignRole = (targetUsername: string, newRole: string) => {
    if (!isHost) return;
    if (socketRef.current && roomId) {
      socketRef.current.emit("assign-role", { roomId, targetUsername, newRole });
      showToast(`Role updated: ${targetUsername} -> ${newRole}`);
    }
  };

  const handleRemoveParticipant = (targetUsername: string) => {
    if (!isHost) return;
    if (window.confirm(`Remove ${targetUsername} from the room?`)) {
      if (socketRef.current && roomId) {
        socketRef.current.emit("remove-participant", { roomId, targetUsername });
        showToast(`Removed ${targetUsername}`);
      }
    }
  };

  // Chat message & reaction
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !roomId) return;
    socketRef.current?.emit("chat-message", {
      roomId,
      message: chatInput.trim(),
      username: currentUsername,
      role: currentUserRole,
    });
    setChatInput("");
  };

  const handleSendReaction = (emoji: string) => {
    if (!roomId) return;
    socketRef.current?.emit("send-reaction", {
      roomId,
      emoji,
      username: currentUsername,
    });
  };

  // Leave room
  const handleLeaveRoom = () => {
    if (window.confirm("Leave watch party room?")) {
      socketRef.current?.emit("leave-room");
      setRoomId("");
      setVideoId("");
      setParticipants([]);
      setChatMessages([]);
      showToast("Left room");
    }
  };

  // Copy helpers
  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    showToast("Invite link copied");
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    showToast("Room code copied");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="app-container">
      {/* Floating Reactions */}
      <div className="floating-reactions-container">
        {reactions.map((r) => (
          <span key={r.id} className="floating-reaction" style={{ left: `${r.left}%` }}>
            {r.emoji}
          </span>
        ))}
      </div>

      {/* Toast alert */}
      {toast && (
        <div className="toast-container">
          <div className="toast">{toast}</div>
        </div>
      )}

      {/* Top Header */}
      <header className="app-header">
        <div className="brand" onClick={() => !roomId && window.location.reload()}>
          <div className="brand-icon-wrapper">🎬</div>
          <span className="brand-title">YouTube Watch Party</span>
        </div>

        <div className="header-actions">
          <div className="socket-pill">
            <span className={`socket-dot ${socketStatus === "Connected" ? "connected" : "failed"}`} />
            <span>{socketStatus}</span>
          </div>

          {roomId && (
            <>
              <div className="room-code-badge">
                <span>Room:</span>
                <strong>{roomId}</strong>
                <button type="button" className="copy-btn" onClick={copyRoomCode} title="Copy code">
                  Code
                </button>
                <button type="button" className="copy-btn" onClick={copyInviteLink} title="Copy invite link">
                  Link
                </button>
              </div>

              <div className="user-tag">
                <span>{currentUsername}</span>
                <span className={`role-badge ${currentUserRole.toLowerCase()}`}>
                  {currentUserRole}
                </span>
              </div>

              <button type="button" className="leave-btn" onClick={handleLeaveRoom}>
                Leave
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      {!roomId ? (
        /* LOBBY VIEW */
        <main className="lobby-wrapper">
          <div className="hero-section">
            <h1 className="hero-title">YouTube Watch Party</h1>
            <p className="hero-subtitle">
              Watch YouTube videos in real time with friends. Create a room to host or join an existing party with a room code.
            </p>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${activeTab === "create" ? "active" : ""}`}
              onClick={() => setActiveTab("create")}
            >
              Create Room
            </button>
            <button
              type="button"
              className={`auth-tab ${activeTab === "join" ? "active" : ""}`}
              onClick={() => setActiveTab("join")}
            >
              Join Room
            </button>
          </div>

          <div className="card-lobby">
            {activeTab === "create" ? (
              <div className="lobby-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="create-username">
                    Username
                  </label>
                  <input
                    id="create-username"
                    type="text"
                    className="form-input"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createRoom()}
                  />
                </div>

                <button type="button" className="submit-btn" onClick={createRoom} disabled={loading}>
                  {loading ? "Creating..." : "Create Room"}
                </button>

                {message && (
                  <div className={`alert-message ${message.includes("created") ? "alert-success" : "alert-error"}`}>
                    {message}
                  </div>
                )}
              </div>
            ) : (
              <div className="lobby-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="join-username">
                    Username
                  </label>
                  <input
                    id="join-username"
                    type="text"
                    className="form-input"
                    placeholder="Enter your username"
                    value={joinUsername}
                    onChange={(e) => setJoinUsername(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="join-room-id">
                    Room Code
                  </label>
                  <input
                    id="join-room-id"
                    type="text"
                    className="form-input"
                    placeholder="e.g. 6-digit room code"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                  />
                </div>

                <button type="button" className="submit-btn" onClick={joinRoom} disabled={joinLoading}>
                  {joinLoading ? "Joining..." : "Join Room"}
                </button>

                {joinMessage && (
                  <div className={`alert-message ${joinMessage.includes("success") ? "alert-success" : "alert-error"}`}>
                    {joinMessage}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      ) : (
        /* THEATER ROOM VIEW */
        <main className="theater-layout">
          {/* Left Column: Player & Playback */}
          <div className="cinema-column">
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
                  <h2 className="empty-title">No Video Selected</h2>
                  <p className="empty-subtitle">
                    {canControl
                      ? "Paste a YouTube link below to start playback for everyone."
                      : "Waiting for the Host to select a video."}
                  </p>
                </div>
              )}
            </div>

            {/* Playback Controls Deck */}
            <div className="control-deck">
              <div className="deck-left">
                <div className="sync-status-badge">
                  <span>{isPlaying ? "Playing" : "Paused"}</span>
                </div>
                <div className="time-counter">
                  {formatTime(currentTime)} ({currentTime.toFixed(1)}s)
                </div>
              </div>

              {canControl ? (
                <div className="deck-playback-btns">
                  <button
                    type="button"
                    className={`playback-btn ${!isPlaying ? "play-primary" : ""}`}
                    onClick={playVideo}
                  >
                    Play
                  </button>
                  <button
                    type="button"
                    className={`playback-btn ${isPlaying ? "play-primary" : ""}`}
                    onClick={pauseVideo}
                  >
                    Pause
                  </button>
                </div>
              ) : (
                <div className="watcher-notice">
                  <span>Playback controlled by Host & Moderators</span>
                </div>
              )}
            </div>

            {/* Video URL Input (Host / Moderator only) */}
            {canControl && (
              <div className="video-loader-card">
                <div className="loader-header">
                  <span className="loader-title">Change Video</span>
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
                  <button type="button" className="load-video-btn" onClick={loadVideo}>
                    Load Video
                  </button>
                </div>

                <div className="preset-chips">
                  <span className="preset-label">Suggestions:</span>
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
                          socketRef.current?.emit("change-video", { roomId, videoId: id });
                          showToast(`Loaded: ${item.title}`);
                        }
                      }}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Participants & Chat */}
          <aside className="sidebar-column">
            <div className="sidebar-tabs">
              <button
                type="button"
                className={`sidebar-tab-btn ${sidebarTab === "participants" ? "active" : ""}`}
                onClick={() => setSidebarTab("participants")}
              >
                Participants ({participants.length})
              </button>
              <button
                type="button"
                className={`sidebar-tab-btn ${sidebarTab === "chat" ? "active" : ""}`}
                onClick={() => setSidebarTab("chat")}
              >
                Chat ({chatMessages.length})
              </button>
            </div>

            {/* Participants Tab */}
            {sidebarTab === "participants" && (
              <div className="tab-content">
                <ul className="participants-list">
                  {participants.map((p, idx) => {
                    const isSelf = p.username.toLowerCase() === currentUsername.toLowerCase();
                    return (
                      <li key={`${p.username}-${idx}`} className="participant-item">
                        <div className="participant-info">
                          <div className="avatar">{p.username.substring(0, 2)}</div>
                          <div className="participant-details">
                            <span className="participant-name">
                              {p.username}
                              {isSelf && <span className="is-you-badge">(You)</span>}
                            </span>
                            <span className={`role-badge ${p.role.toLowerCase()}`}>
                              {p.role}
                            </span>
                          </div>
                        </div>

                        {/* Host controls */}
                        {isHost && !isSelf && (
                          <div className="participant-actions">
                            {p.role === "PARTICIPANT" ? (
                              <button
                                type="button"
                                className="action-icon-btn"
                                onClick={() => handleAssignRole(p.username, "MODERATOR")}
                              >
                                Make Mod
                              </button>
                            ) : p.role === "MODERATOR" ? (
                              <button
                                type="button"
                                className="action-icon-btn"
                                onClick={() => handleAssignRole(p.username, "PARTICIPANT")}
                              >
                                Make Viewer
                              </button>
                            ) : null}

                            <button
                              type="button"
                              className="action-icon-btn danger"
                              onClick={() => handleRemoveParticipant(p.username)}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Live Chat Tab */}
            {sidebarTab === "chat" && (
              <div className="tab-content chat-container">
                <div className="chat-messages">
                  {chatMessages.length === 0 ? (
                    <div className="chat-empty">
                      <span>No messages yet.</span>
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isOwn = msg.username.toLowerCase() === currentUsername.toLowerCase();
                      return (
                        <div key={msg.id} className={`chat-bubble ${isOwn ? "own" : ""}`}>
                          <div className="chat-meta">
                            <span className="chat-author">
                              {msg.username}
                              <span className={`role-badge ${msg.role.toLowerCase()}`}>{msg.role}</span>
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

                {/* Reaction buttons */}
                <div className="reaction-bar">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="reaction-btn"
                      onClick={() => handleSendReaction(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Chat input */}
                <form className="chat-form" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    className="chat-input"
                    placeholder="Type a message..."
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
