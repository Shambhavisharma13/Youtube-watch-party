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
    origin: "http://localhost:5173",
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
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// =====================================
// SOCKET ROOMS
// =====================================

const rooms = {};

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
  // DISCONNECT
  // =====================================

  socket.on("disconnect", () => {
    console.log(
      "\nUSER DISCONNECTED:",
      socket.id
    );

    // =====================================
    // GET ROOM ID
    // =====================================

    const roomId = socket.roomId;

    if (!roomId) {
      console.log(
        "Socket was not inside a room"
      );
      return;
    }

    // =====================================
    // CHECK ROOM
    // =====================================

    if (!rooms[roomId]) {
      return;
    }

    // =====================================
    // FIND USER
    // =====================================

    const index =
      rooms[roomId].findIndex(
        (user) =>
          user.socketId === socket.id
      );

    if (index === -1) {
      return;
    }

    // =====================================
    // REMOVE USER
    // =====================================

    const removedUser =
      rooms[roomId][index];

    rooms[roomId].splice(index, 1);

    console.log(
      `${removedUser.username} left room ${roomId}`
    );

    // =====================================
    // IF HOST LEAVES
    // MAKE FIRST PARTICIPANT HOST
    // =====================================

    if (
      removedUser.role === "HOST" &&
      rooms[roomId].length > 0
    ) {
      rooms[roomId][0].role = "HOST";

      console.log(
        `${rooms[roomId][0].username} is now HOST`
      );
    }

    // =====================================
    // CREATE UPDATED PARTICIPANT LIST
    // =====================================

    const participantList =
      rooms[roomId].map((user) => ({
        username: user.username,
        role: user.role,
      }));

    // =====================================
    // SEND UPDATED PARTICIPANTS
    // =====================================

    io.to(roomId).emit(
      "participants-updated",
      {
        participants: participantList,
      }
    );

    // =====================================
    // DELETE EMPTY ROOM
    // =====================================

    if (rooms[roomId].length === 0) {
      delete rooms[roomId];

      console.log(
        `Room ${roomId} deleted`
      );
    }
  });
});

// =====================================
// START SERVER
// =====================================

const PORT = 5000;

server.listen(PORT, () => {
  console.log("=================================");
  console.log("YouTube Watch Party Server");
  console.log(
    `Server running on http://localhost:${PORT}`
  );
  console.log("=================================");
});