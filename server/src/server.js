const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const roomRoutes = require("./routes/roomRoutes");

const app = express();

// =========================
// MIDDLEWARE
// =========================

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

// =========================
// TEST ROUTE
// =========================

app.get("/", (req, res) => {
  res.send("YouTube Watch Party Server is running");
});

// =========================
// ROOM API ROUTES
// =========================

app.use("/api/rooms", roomRoutes);

// =========================
// CREATE HTTP SERVER
// =========================

const server = http.createServer(app);

// =========================
// SOCKET.IO SERVER
// =========================

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// =========================
// STORE CONNECTED USERS
// =========================

const rooms = {};

// =========================
// SOCKET.IO CONNECTION
// =========================

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // =========================
  // JOIN ROOM
  // =========================

  socket.on("join-room", (data) => {
    console.log(
      "join-room event received:",
      data
    );

    const { roomId, username } = data;

    if (!roomId || !username) {
      console.log(
        "Missing roomId or username"
      );
      return;
    }

    // Join Socket.IO room
    socket.join(roomId);

    // Create room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    // Prevent duplicate socket entry
    const alreadyJoined =
      rooms[roomId].some(
        (user) =>
          user.socketId === socket.id
      );

    if (alreadyJoined) {
      console.log(
        `${username} is already in room ${roomId}`
      );
      return;
    }

    // Determine role
    const role =
      rooms[roomId].length === 0
        ? "HOST"
        : "PARTICIPANT";

    // Add user
    rooms[roomId].push({
      socketId: socket.id,
      username: username,
      role: role,
    });

    console.log(
      `${username} joined room ${roomId}`
    );

    console.log(
      "Current participants:",
      rooms[roomId]
    );

    // Send updated participant list
    io.to(roomId).emit(
      "participants-updated",
      {
        participants:
          rooms[roomId].map((user) => ({
            username: user.username,
            role: user.role,
          })),
      }
    );
  });

  // =========================
  // VIDEO PLAY
  // =========================

  socket.on("video-play", (data) => {
    console.log(
      "video-play event received:",
      data
    );

    const {
      roomId,
      currentTime,
    } = data;

    if (!roomId) {
      console.log(
        "Missing roomId for video-play"
      );
      return;
    }

    console.log(
      `Broadcasting PLAY to room ${roomId} at ${currentTime || 0}s`
    );

    // Send to everyone except sender
    socket.to(roomId).emit(
      "video-play",
      {
        currentTime:
          currentTime || 0,
      }
    );
  });

  // =========================
  // VIDEO PAUSE
  // =========================

  socket.on("video-pause", (data) => {
    console.log(
      "video-pause event received:",
      data
    );

    const {
      roomId,
      currentTime,
    } = data;

    if (!roomId) {
      console.log(
        "Missing roomId for video-pause"
      );
      return;
    }

    console.log(
      `Broadcasting PAUSE to room ${roomId} at ${currentTime || 0}s`
    );

    // Send to everyone except sender
    socket.to(roomId).emit(
      "video-pause",
      {
        currentTime:
          currentTime || 0,
      }
    );
  });

  // =========================
  // DISCONNECT
  // =========================

  socket.on("disconnect", () => {
    console.log(
      "User disconnected:",
      socket.id
    );

    // Find user's room
    for (const roomId in rooms) {
      const userIndex =
        rooms[roomId].findIndex(
          (user) =>
            user.socketId === socket.id
        );

      if (userIndex !== -1) {
        const removedUser =
          rooms[roomId][userIndex];

        // Remove user
        rooms[roomId].splice(
          userIndex,
          1
        );

        console.log(
          `${removedUser.username} left room ${roomId}`
        );

        // Send updated participant list
        io.to(roomId).emit(
          "participants-updated",
          {
            participants:
              rooms[roomId].map(
                (user) => ({
                  username:
                    user.username,
                  role: user.role,
                })
              ),
          }
        );

        // Delete empty room
        if (
          rooms[roomId].length === 0
        ) {
          delete rooms[roomId];

          console.log(
            `Room ${roomId} deleted`
          );
        }

        break;
      }
    }
  });
});

// =========================
// START SERVER
// =========================

server.listen(5000, () => {
  console.log(
    "Server running on http://localhost:5000"
  );
});