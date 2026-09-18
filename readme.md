# 🎬 YouTube Watch Party

> A real-time YouTube Watch Party application where multiple users can join the same room and watch videos together with synchronized playback.

---

##  Project Overview

**YouTube Watch Party** is a full-stack web application that allows multiple users to watch a YouTube video together in real time.

Users can:

* 🏠 Create a watch room
* 🔑 Join a room using a room code
* 👥 See other participants
* 🎥 Load a YouTube video
* ▶️ Synchronize Play
* ⏸️ Synchronize Pause
* ⏩ Synchronize Seek
* 👑 Assign different roles
* 🚫 Restrict playback controls based on roles

The application uses **React + TypeScript** for the frontend, **Node.js + Express** for the backend, and **Socket.IO** for real-time communication.

---

# ✨ Features

### 🏠 Room Management

* Create a new watch party room.
* Automatically generate a unique room code.
* Join an existing room using the room code.
* Display the current participants in the room.

### 👥 Participants

Each participant has a role.

| Role           | Permissions      |
| -------------- | ---------------- |
| 👑 Host        | Full control     |
| 🛡️ Moderator  | Playback control |
| 👤 Participant | Watch only       |

The assignment specifies that the room creator becomes the Host and joiners are Participants by default.

### 🎥 YouTube Integration

Users can paste a YouTube URL and load the video inside the application.

Supported URL formats include:

```text
https://www.youtube.com/watch?v=VIDEO_ID
```

and

```text
https://youtu.be/VIDEO_ID
```

The application extracts the YouTube video ID and loads it using the YouTube player.

### 🔄 Real-Time Synchronization

When the Host or authorized user performs an action, Socket.IO sends the event to other users in the same room.

Supported synchronization:

```text
Play
Pause
Seek
Change Video
```

The assignment requires participants to see the same playback state, including play/pause, seek position and current video.

---

# 🏗️ Architecture

```text
                  ┌──────────────────────┐
                  │      User 1          │
                  │   React Frontend     │
                  └──────────┬───────────┘
                             │
                             │ Socket.IO
                             │
                             ▼
                  ┌──────────────────────┐
                  │   Node.js Server     │
                  │      Express         │
                  │      Socket.IO       │
                  └──────────┬───────────┘
                             │
                             │ Broadcast
                             │
                             ▼
                  ┌──────────────────────┐
                  │      User 2          │
                  │   React Frontend     │
                  └──────────────────────┘
```

### How synchronization works

Example:

```text
Host presses PLAY
       ↓
React detects YouTube PLAY event
       ↓
Client emits "video-play"
       ↓
Socket.IO server receives event
       ↓
Server broadcasts event to room
       ↓
Participant receives "video-play"
       ↓
Participant's YouTube player starts
```

This allows users in the same room to stay synchronized.

---

# 🛠️ Technology Stack

## Frontend

* React
* TypeScript
* Vite
* React YouTube
* Socket.IO Client

## Backend

* Node.js
* Express.js
* Socket.IO
* CORS

## Video

* YouTube IFrame Player
* `react-youtube`

The assignment recommends React + TypeScript + Vite for the frontend and Node.js + Express for the backend, with WebSockets for real-time communication.

---

# 📂 Project Structure

```text
youtube-watch-party/
│
├── client/
│   │
│   ├── src/
│   │   ├── App.tsx
│   │   ├── YouTubePlayer.tsx
│   │   ├── main.tsx
│   │   └── ...
│   │
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.ts
│
├── server/
│   │
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/
│   │   │   └── roomRoutes.js
│   │   └── ...
│   │
│   ├── package.json
│   └── package-lock.json
│
└── README.md
```

---

# ⚙️ Installation

## 1. Clone / Open the Project

Open the project folder:

```text
youtube-watch-party
```

---

# 💻 Frontend Setup

Open a terminal:

```bash
cd C:\Users\shambhavi_s\OneDrive\Desktop\youtube-watch-party\client
```

Install dependencies:

```bash
npm install
```

The YouTube React package should also be installed:

```bash
npm install react-youtube
```

Socket.IO client:

```bash
npm install socket.io-client
```

---

# 🖥️ Backend Setup

Open another terminal:

```bash
cd C:\Users\shambhavi_s\OneDrive\Desktop\youtube-watch-party\server
```

Install dependencies:

```bash
npm install
```

---

# ▶️ Run the Backend

The backend server is located at:

```text
server/src/server.js
```

Run:

```bash
cd C:\Users\shambhavi_s\OneDrive\Desktop\youtube-watch-party\server\src
```

Then:

```bash
node server.js
```

Expected output:

```text
=================================
YouTube Watch Party Server
Server running on http://localhost:5000
=================================
```

---

# 🌐 Run the Frontend

Open another terminal.

```bash
cd C:\Users\shambhavi_s\OneDrive\Desktop\youtube-watch-party\client
```

Run:

```bash
npm run dev
```

The Vite development server should provide:

```text
http://localhost:5173
```

Open that address in your browser.

---

# 🔌 Socket.IO Connection

The frontend connects to the backend using:

```text
http://localhost:5000
```

Example:

```typescript
const socket = io("http://localhost:5000");
```

The backend creates the Socket.IO server:

```javascript
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});
```

---

# 🏠 Create a Room

1. Open the application.
2. Enter your username.
3. Click **Create Room**.
4. The backend creates a room.
5. The creator becomes the **HOST**.
6. A room code is displayed.

Example:

```text
Room Code: ABC123
```

The room creator is automatically assigned the Host role, as required by the assignment.

---

# 🔑 Join a Room

Open another browser tab.

Enter:

```text
Username: User2
Room Code: ABC123
```

Click:

```text
Join Room
```

The new user joins as:

```text
PARTICIPANT
```

The participant list is then updated for everyone in the room.

---

# 🎥 Load a YouTube Video

Paste a YouTube URL:

```text
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Click:

```text
Load Video
```

The application extracts:

```text
dQw4w9WgXcQ
```

and loads the video into the YouTube player.

---

# 🔄 Real-Time Video Synchronization

The application uses Socket.IO events to synchronize playback.

## ▶️ Play

Client:

```javascript
socket.emit("video-play", {
  roomId,
  currentTime
});
```

Server:

```javascript
socket.to(roomId).emit("video-play", {
  currentTime
});
```

Participant:

```javascript
socket.on("video-play", (data) => {
  // synchronize player
});
```

---

## ⏸️ Pause

Client:

```javascript
socket.emit("video-pause", {
  roomId,
  currentTime
});
```

Server:

```javascript
socket.to(roomId).emit("video-pause", {
  currentTime
});
```

---

## ⏩ Seek

Client:

```javascript
socket.emit("video-seek", {
  roomId,
  currentTime
});
```

Server:

```javascript
socket.to(roomId).emit("video-seek", {
  currentTime
});
```

The assignment explicitly lists play, pause and seek as WebSocket synchronization events.

---

# 🔌 Socket Events

The application uses Socket.IO events for communication.

| Event                  | Direction        | Purpose                 |
| ---------------------- | ---------------- | ----------------------- |
| `join-room`            | Client → Server  | Join a room             |
| `participants-updated` | Server → Clients | Update participant list |
| `video-play`           | Client → Server  | Play video              |
| `video-pause`          | Client → Server  | Pause video             |
| `video-seek`           | Client → Server  | Synchronize seek        |
| `disconnect`           | Client → Server  | Handle user leaving     |

The assignment also defines events such as `join_room`, `sync_state`, `change_video`, `assign_role`, and `remove_participant` for the complete implementation.

---

# 👑 Role-Based Access

The application is designed around room roles.

## Host

The Host is the creator of the room.

Expected permissions include:

```text
✓ Play
✓ Pause
✓ Seek
✓ Change Video
✓ Assign Roles
✓ Remove Participants
✓ Transfer Host
```

## Moderator

A Moderator can be given playback permissions:

```text
✓ Play
✓ Pause
✓ Seek
✓ Change Video
```

## Participant

A normal Participant is primarily a viewer:

```text
✓ Watch video
✗ Control playback
✗ Change video
```

The assignment requires backend permission validation before processing restricted events.

---

# 🧪 Testing the Watch Party

## Test 1 — Create Room

Open:

```text
http://localhost:5173
```

Enter:

```text
User 1
```

Click:

```text
Create Room
```

Copy the room code.

---

## Test 2 — Join Room

Open another browser tab.

Enter:

```text
User 2
```

Enter the same room code.

Click:

```text
Join Room
```

You should see both users in:

```text
👥 Participants
```

---

## Test 3 — Play Synchronization

On the Host tab:

```text
▶️ Play
```

Expected:

```text
Host     → Playing
User 2   → Playing
```

---

## Test 4 — Pause Synchronization

On the Host:

```text
⏸️ Pause
```

Expected:

```text
Host     → Paused
User 2   → Paused
```

---

## Test 5 — Seek Synchronization

Move the YouTube video to another position.

Expected:

```text
Host     → New position
User 2   → Same position
```

---

# 🐛 Troubleshooting

## Server says `EADDRINUSE`

Example:

```text
Error: listen EADDRINUSE
address already in use :::5000
```

This means port `5000` is already being used.

Either stop the existing Node process or use another port.

On Windows:

```bash
netstat -ano | findstr :5000
```

Then stop the process if necessary.

---

## `Cannot find module server.js`

Make sure you are inside:

```text
server/src
```

Run:

```bash
cd C:\Users\shambhavi_s\OneDrive\Desktop\youtube-watch-party\server\src
```

Then:

```bash
node server.js
```

---

## Frontend Cannot Connect to Server

Check that the backend is running:

```text
http://localhost:5000
```

You should see:

```text
YouTube Watch Party Server is running
```

Then start the frontend:

```bash
npm run dev
```

---

## Socket.IO Not Connecting

Check the browser console for:

```text
🟢 Socket.IO Connected
```

and the server terminal for:

```text
USER CONNECTED
Socket ID: ...
```

---

# 🧠 Code Understanding

Important concepts used in this project:

### React

Used to create the user interface and manage application state.

### TypeScript

Used for type safety in the frontend.

### Express

Used to create backend APIs and HTTP routes.

### Socket.IO

Used for real-time bidirectional communication between clients and the server.

### YouTube IFrame Player

Used to embed and control the YouTube video.

### CORS

Allows the frontend running on port `5173` to communicate with the backend running on port `5000`.

The assignment specifically expects the developer to be able to explain how React, Express, Socket.IO/WebSockets and the backend role logic work.

---

# 🔄 Complete Application Flow

```text
User opens application
        ↓
React frontend starts
        ↓
Socket.IO connects to server
        ↓
User creates room
        ↓
Server creates room
        ↓
Creator becomes HOST
        ↓
Another user joins
        ↓
Server assigns PARTICIPANT
        ↓
Participant list is updated
        ↓
Host loads YouTube video
        ↓
Host presses PLAY
        ↓
Socket.IO sends event
        ↓
Server broadcasts event
        ↓
Other users receive event
        ↓
YouTube players synchronize
```

---

# 📋 Assignment Requirement Mapping

| Assignment Requirement | Implementation       |
| ---------------------- | -------------------- |
| Create watch party     | ✅ Room creation      |
| Join room              | ✅ Room code          |
| Participants           | ✅ Participant list   |
| YouTube integration    | ✅ YouTube Player     |
| WebSockets             | ✅ Socket.IO          |
| Play synchronization   | ✅ Implemented        |
| Pause synchronization  | ✅ Implemented        |
| Seek synchronization   | ✅ Implemented        |
| Role system            | ✅ Host / Participant |
| Local application      | ✅ React + Node.js    |
| README                 | ✅ This file          |
| Architecture overview  | ✅ Included           |

The assignment's deliverables include the working application, README, architecture overview, and readiness to explain the implementation.

---

# 🚀 Future Improvements

Possible future features include:

* 🛡️ Complete Moderator role
* 👑 Host transfer
* 🚫 Remove participant
* 💬 Room chat
* 😀 Emoji reactions
* 🔐 Authentication
* 💾 Persistent rooms
* 🗄️ Database integration
* 📱 Responsive mobile UI
* 🌐 Production deployment
* 📈 Redis-based Socket.IO scaling

These are also aligned with the bonus ideas listed in the assignment.

---

# 🎯 Learning Outcomes

Through this project, the following concepts are demonstrated:

* React component development
* TypeScript
* State management
* REST APIs
* Node.js
* Express.js
* Socket.IO
* WebSocket communication
* Real-time synchronization
* Room-based communication
* Role-based access concepts
* YouTube IFrame integration
* Client-server architecture

---

# 👩‍💻 Author

**Shambhavi Sharma**

B.Tech – Computer Science Engineering

Built as part of the **Intern Assignment: YouTube Watch Party**.

---

# ⭐ Project Summary

```text
React + TypeScript
        +
Node.js + Express
        +
Socket.IO
        +
YouTube IFrame API
        ↓
Real-Time YouTube Watch Party
```

🎬 **Watch together. Stay synchronized. Enjoy together.**

---
