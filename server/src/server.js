const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const roomRoutes = require("./routes/roomRoutes");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("YouTube Watch Party Server is running");
});

app.use("/api/rooms", roomRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Store connected users
const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // =========================
  // JOIN ROOM
  // =========================

  socket.on("join-room", (data) => {
    console.log("join-room event received:", data);

    const { roomId, username } = data;

    if (!roomId || !username) {
      console.log("Missing roomId or username");
      return;
    }

    socket.join(roomId);

    // Create room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    // Add user
    rooms[roomId].push({
      socketId: socket.id,
      username: username,
      role: rooms[roomId].length === 0
        ? "HOST"
        : "PARTICIPANT",
    });

    console.log(`${username} joined room ${roomId}`);

    console.log(
      "Current participants:",
      rooms[roomId]
    );

    // Send updated participant list
    io.to(roomId).emit("participants-updated", {
      participants: rooms[roomId],
    });
  });

  // =========================
  // DISCONNECT
  // =========================

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Find the user's room
    for (const roomId in rooms) {
      const userIndex = rooms[roomId].findIndex(
        (user) => user.socketId === socket.id
      );

      if (userIndex !== -1) {
        const removedUser =
          rooms[roomId][userIndex];

        rooms[roomId].splice(userIndex, 1);

        console.log(
          `${removedUser.username} left room ${roomId}`
        );

        // Send updated list
        io.to(roomId).emit(
          "participants-updated",
          {
            participants: rooms[roomId],
          }
        );

        // Delete empty room
        if (rooms[roomId].length === 0) {
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

server.listen(5000, () => {
  console.log(
    "Server running on http://localhost:5000"
  );
});