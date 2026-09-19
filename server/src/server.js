const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const roomRoutes = require("./routes/roomRoutes");

const app = express();

// =====================================
// CORS
// =====================================

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

// =====================================
// BASIC ROUTE
// =====================================

app.get("/", (req, res) => {
  res.send("YouTube Watch Party Server is running");
});

// =====================================
// ROOM API ROUTES
// =====================================

app.use("/api/rooms", roomRoutes);

// =====================================
// HTTP SERVER
// =====================================

const server = http.createServer(app);

// =====================================
// SOCKET.IO
// =====================================

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// =====================================
// =====================================
// SOCKET ROOMS
// =====================================

const rooms = {};
const roomStates = {};

// Helper: check if user can control playback (HOST or MODERATOR)
function canControlPlayback(roomId, socketId) {
  if (!rooms[roomId]) return false;
  const user = rooms[roomId].find((u) => u.socketId === socketId);
  return user && (user.role === "HOST" || user.role === "MODERATOR");
}

// Helper: check if user is HOST
function isHost(roomId, socketId) {
  if (!rooms[roomId]) return false;
  const user = rooms[roomId].find((u) => u.socketId === socketId);
  return user && user.role === "HOST";
}

// =====================================
// SOCKET CONNECTION
// =====================================

io.on("connection", (socket) => {
  console.log("=================================");
  console.log("USER CONNECTED");
  console.log("Socket ID:", socket.id);
  console.log("=================================");

  // =====================================
  // JOIN ROOM
  // =====================================

  socket.on("join-room", (data) => {
    console.log("\nJOIN ROOM EVENT:");
    console.log(data);

    const {
      roomId,
      username,
      role,
    } = data || {};

    // Check required data
    if (!roomId || !username) {
      console.log(
        "ERROR: roomId or username missing"
      );
      return;
    }

    // =====================================
    // CREATE ROOM IF NOT EXISTS
    // =====================================

    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    if (!roomStates[roomId]) {
      roomStates[roomId] = {
        videoId: null,
        currentTime: 0,
        isPlaying: false,
      };
    }

    // =====================================
    // PREVENT DUPLICATE SOCKET
    // =====================================

    const alreadyJoined = rooms[roomId].some(
      (user) => user.socketId === socket.id
    );

    if (alreadyJoined) {
      console.log(
        `${username} already joined ${roomId}`
      );
      return;
    }

    // =====================================
    // DETERMINE ROLE
    // =====================================

    let userRole = role;

    if (!userRole) {
      userRole =
        rooms[roomId].length === 0
          ? "HOST"
          : "PARTICIPANT";
    }

    // =====================================
    // JOIN SOCKET.IO ROOM
    // =====================================

    socket.join(roomId);

    // Save room information on socket
    socket.roomId = roomId;
    socket.username = username;

    // =====================================
    // ADD USER TO ROOM
    // =====================================

    const participant = {
      socketId: socket.id,
      username: username,
      role: userRole,
    };

    rooms[roomId].push(participant);

    console.log(
      `\n${username} joined room ${roomId}`
    );

    console.log(
      "PARTICIPANTS IN ROOM:"
    );

    console.log(rooms[roomId]);

    // =====================================
    // CREATE PARTICIPANT LIST
    // =====================================

    const participantList =
      rooms[roomId].map((user) => ({
        username: user.username,
        role: user.role,
      }));

    console.log(
      "Sending participants-updated:"
    );

    console.log(participantList);

    // =====================================
    // SEND PARTICIPANTS TO ROOM
    // =====================================

    io.to(roomId).emit(
      "participants-updated",
      {
        participants: participantList,
      }
    );

    // =====================================
    // SYNC STATE TO NEW PARTICIPANT
    // =====================================

    if (roomStates[roomId] && roomStates[roomId].videoId) {
      console.log(
        `Syncing current state to new participant ${username} in ${roomId}`
      );
      socket.emit("sync-state", {
        videoId: roomStates[roomId].videoId,
        currentTime: roomStates[roomId].currentTime,
        isPlaying: roomStates[roomId].isPlaying,
      });
    }
  });

  // =====================================
  // VIDEO PLAY
  // =====================================

  socket.on("video-play", (data) => {
    console.log("\nVIDEO PLAY:");
    console.log(data);

    const {
      roomId,
      currentTime,
    } = data || {};

    if (!roomId) {
      console.log(
        "VIDEO PLAY ERROR: roomId missing"
      );
      return;
    }

    // Role enforcement
    if (!canControlPlayback(roomId, socket.id)) {
      console.log(`Permission denied: ${socket.username} cannot play`);
      socket.emit("permission-denied", {
        message: "Only Host and Moderator can control playback",
      });
      return;
    }

    if (roomStates[roomId]) {
      roomStates[roomId].isPlaying = true;
      roomStates[roomId].currentTime = currentTime || 0;
    }

    console.log(
      `Broadcasting PLAY to room ${roomId} at ${
        currentTime || 0
      } seconds`
    );

    // Send PLAY to everyone except sender
    socket.to(roomId).emit(
      "video-play",
      {
        currentTime: currentTime || 0,
      }
    );
  });

  // =====================================
  // VIDEO PAUSE
  // =====================================

  socket.on("video-pause", (data) => {
    console.log("\nVIDEO PAUSE:");
    console.log(data);

    const {
      roomId,
      currentTime,
    } = data || {};

    if (!roomId) {
      console.log(
        "VIDEO PAUSE ERROR: roomId missing"
      );
      return;
    }

    // Role enforcement
    if (!canControlPlayback(roomId, socket.id)) {
      console.log(`Permission denied: ${socket.username} cannot pause`);
      socket.emit("permission-denied", {
        message: "Only Host and Moderator can control playback",
      });
      return;
    }

    if (roomStates[roomId]) {
      roomStates[roomId].isPlaying = false;
      roomStates[roomId].currentTime = currentTime || 0;
    }

    console.log(
      `Broadcasting PAUSE to room ${roomId} at ${
        currentTime || 0
      } seconds`
    );

    // Send PAUSE to everyone except sender
    socket.to(roomId).emit(
      "video-pause",
      {
        currentTime: currentTime || 0,
      }
    );
  });

  // =====================================
  // VIDEO SEEK
  // =====================================

  socket.on("video-seek", (data) => {
    console.log("\nVIDEO SEEK:");
    console.log(data);

    const {
      roomId,
      currentTime,
    } = data || {};

    if (!roomId) {
      console.log(
        "VIDEO SEEK ERROR: roomId missing"
      );
      return;
    }

    // Role enforcement
    if (!canControlPlayback(roomId, socket.id)) {
      console.log(`Permission denied: ${socket.username} cannot seek`);
      socket.emit("permission-denied", {
        message: "Only Host and Moderator can seek video",
      });
      return;
    }

    if (roomStates[roomId]) {
      roomStates[roomId].currentTime = currentTime || 0;
    }

    console.log(
      `Broadcasting SEEK to room ${roomId} at ${
        currentTime || 0
      } seconds`
    );

    // Send SEEK to everyone except sender
    socket.to(roomId).emit(
      "video-seek",
      {
        currentTime: currentTime || 0,
      }
    );
  });

  // =====================================
  // CHANGE VIDEO (SYNCHRONIZED)
  // =====================================

  socket.on("change-video", (data) => {
    console.log("\nCHANGE VIDEO:");
    console.log(data);

    const { roomId, videoId } = data || {};

    if (!roomId || !videoId) {
      console.log("CHANGE VIDEO ERROR: roomId or videoId missing");
      return;
    }

    // Role enforcement
    if (!canControlPlayback(roomId, socket.id)) {
      console.log(`Permission denied: ${socket.username} cannot change video`);
      socket.emit("permission-denied", {
        message: "Only Host and Moderator can change video",
      });
      return;
    }

    if (!roomStates[roomId]) {
      roomStates[roomId] = { videoId: null, currentTime: 0, isPlaying: false };
    }

    roomStates[roomId].videoId = videoId;
    roomStates[roomId].currentTime = 0;
    roomStates[roomId].isPlaying = false;

    console.log(`Broadcasting CHANGE_VIDEO ${videoId} to room ${roomId}`);

    // Broadcast change-video to everyone in the room (including sender or socket.to)
    io.to(roomId).emit("change-video", { videoId });
  });

  // =====================================
  // ROLE ASSIGNMENT (HOST ONLY)
  // =====================================

  socket.on("assign-role", (data) => {
    const { roomId, targetUsername, newRole } = data || {};

    if (!roomId || !targetUsername || !newRole) return;

    if (!isHost(roomId, socket.id)) {
      socket.emit("permission-denied", {
        message: "Only the Host can assign roles",
      });
      return;
    }

    if (!rooms[roomId]) return;

    const targetUser = rooms[roomId].find((u) => u.username === targetUsername);
    if (targetUser) {
      console.log(`Host changed ${targetUsername} role to ${newRole}`);
      targetUser.role = newRole;

      const participantList = rooms[roomId].map((user) => ({
        username: user.username,
        role: user.role,
      }));

      io.to(roomId).emit("participants-updated", {
        participants: participantList,
      });

      io.to(roomId).emit("role-assigned", {
        targetUsername,
        newRole,
      });
    }
  });

  // =====================================
  // REMOVE PARTICIPANT (HOST ONLY)
  // =====================================

  socket.on("remove-participant", (data) => {
    const { roomId, targetUsername } = data || {};

    if (!roomId || !targetUsername) return;

    if (!isHost(roomId, socket.id)) {
      socket.emit("permission-denied", {
        message: "Only the Host can remove participants",
      });
      return;
    }

    if (!rooms[roomId]) return;

    const index = rooms[roomId].findIndex((u) => u.username === targetUsername);
    if (index !== -1) {
      const removedUser = rooms[roomId][index];
      rooms[roomId].splice(index, 1);

      console.log(`Host removed ${targetUsername} from room ${roomId}`);

      // Notify the removed socket
      io.to(removedUser.socketId).emit("kicked", {
        message: "You were removed from the room by the host",
      });

      const removedSocket = io.sockets.sockets.get(removedUser.socketId);
      if (removedSocket) {
        removedSocket.leave(roomId);
        removedSocket.roomId = null;
      }

      const participantList = rooms[roomId].map((user) => ({
        username: user.username,
        role: user.role,
      }));

      io.to(roomId).emit("participants-updated", {
        participants: participantList,
      });
    }
  });

  // =====================================
  // CHAT MESSAGE
  // =====================================

  socket.on("chat-message", (data) => {
    const { roomId, message, username, role } = data || {};

    if (!roomId || !message || !message.trim()) return;

    const user = rooms[roomId]?.find((u) => u.socketId === socket.id);
    const senderName = username || user?.username || "Guest";
    const senderRole = role || user?.role || "PARTICIPANT";

    const chatPayload = {
      id: Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      text: message.trim(),
      username: senderName,
      role: senderRole,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    io.to(roomId).emit("chat-message", chatPayload);
  });

  // =====================================
  // EMOJI REACTIONS
  // =====================================

  socket.on("send-reaction", (data) => {
    const { roomId, emoji, username } = data || {};

    if (!roomId || !emoji) return;

    io.to(roomId).emit("receive-reaction", {
      id: Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      emoji,
      username: username || socket.username || "Anonymous",
    });
  });

  // =====================================
  // LEAVE ROOM
  // =====================================

  const handleLeaveRoom = () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;

    const index = rooms[roomId].findIndex(
      (user) => user.socketId === socket.id
    );

    if (index === -1) return;

    const removedUser = rooms[roomId][index];
    rooms[roomId].splice(index, 1);

    console.log(`${removedUser.username} left room ${roomId}`);

    socket.leave(roomId);
    socket.roomId = null;

    // If host leaves, promote next participant to host
    if (removedUser.role === "HOST" && rooms[roomId].length > 0) {
      rooms[roomId][0].role = "HOST";
      console.log(`${rooms[roomId][0].username} is now HOST`);
    }

    const participantList = rooms[roomId].map((user) => ({
      username: user.username,
      role: user.role,
    }));

    io.to(roomId).emit("participants-updated", {
      participants: participantList,
    });

    if (rooms[roomId].length === 0) {
      delete rooms[roomId];
      delete roomStates[roomId];
      console.log(`Room ${roomId} deleted`);
    }
  };

  socket.on("leave-room", handleLeaveRoom);

  // =====================================
  // DISCONNECT
  // =====================================

  socket.on("disconnect", () => {
    console.log(
      "\nUSER DISCONNECTED:",
      socket.id
    );

    handleLeaveRoom();
  });
});

// =====================================
// START SERVER
// =====================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("=================================");
  console.log("YouTube Watch Party Server");
  console.log(
    `Server running on http://localhost:${PORT}`
  );
  console.log("=================================");
});