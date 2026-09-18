# 🎬 YouTube Watch Party

A real-time **YouTube Watch Party** web application that allows multiple users to join the same room and watch a YouTube video together.

The application uses **React + TypeScript** for the frontend, **Node.js + Express.js** for the backend, and **Socket.IO** for real-time communication and video synchronization.

---

# 📌 Project Overview

YouTube Watch Party allows users to create or join a shared room and watch a YouTube video together.

The user who creates the room becomes the **Host**, while users who join the room become **Participants**.

The application uses Socket.IO to synchronize video actions between users.

For example:

```text
Host presses Play
       ↓
React Client
       ↓
Socket.IO
       ↓
Node.js Server
       ↓
Socket.IO
       ↓
Participant Client
       ↓
Video plays
```

The same approach is used for:

* Play
* Pause
* Seek
* Video synchronization
* Participant updates

---

# ✨ Features

## 🏠 Room Management

* Create a watch-party room.
* Generate a unique room code.
* Join an existing room using the room code.
* Creator is assigned the Host role.
* Other users can join as Participants.
* Display participants currently inside the room.

---

## 👥 User Roles

The application supports different roles.

### Host

The Host is the creator of the room.

The Host can control the watch-party session, including video playback.

### Participant

Participants can join the room and watch the synchronized video.

---

# 🎥 YouTube Player

The application uses the YouTube player through the `react-youtube` package.

Users can paste a YouTube URL and load the video into the watch party.

Supported URL formats:

```text
https://www.youtube.com/watch?v=VIDEO_ID
```

and:

```text
https://youtu.be/VIDEO_ID
```

The application extracts the YouTube video ID and loads the video.

---

# 🔄 Real-Time Video Synchronization

Socket.IO is used to synchronize video actions between users.

## ▶️ Play Synchronization

When one user plays the video:

```text
User presses Play
       ↓
video-play event
       ↓
Server
       ↓
Other users
       ↓
Video starts playing
```

---

## ⏸️ Pause Synchronization

When one user pauses:

```text
User presses Pause
       ↓
video-pause event
       ↓
Server
       ↓
Other users
       ↓
Video pauses
```

---

## ⏩ Seek Synchronization

When the video position changes:

```text
Video position changes
       ↓
video-seek event
       ↓
Server
       ↓
Other users
       ↓
Video position updated
```

---

# 🔌 Socket.IO Events

## Client → Server

| Event         | Purpose                 |
| ------------- | ----------------------- |
| `join-room`   | Join a watch-party room |
| `video-play`  | Send play event         |
| `video-pause` | Send pause event        |
| `video-seek`  | Send video position     |

## Server → Client

| Event                  | Purpose                      |
| ---------------------- | ---------------------------- |
| `participants-updated` | Update participant list      |
| `video-play`           | Play video on other clients  |
| `video-pause`          | Pause video on other clients |
| `video-seek`           | Synchronize video position   |

---

# 🏗️ Technology Stack

## Frontend

* React
* TypeScript
* Vite
* React YouTube
* Socket.IO Client
* HTML
* CSS

## Backend

* Node.js
* Express.js
* Socket.IO
* CORS

## Video

* YouTube IFrame Player
* `react-youtube`

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
│   │   └── routes/
│   │       └── roomRoutes.js
│   │
│   ├── package.json
│   └── package-lock.json
│
└── README.md
```

---

# ⚙️ Prerequisites

Before running the project, install:

* Node.js
* npm
* Git

Check Node.js:

```bash
node -v
```

Check npm:

```bash
npm -v
```

---

# 🚀 Installation

Clone the repository:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
```

Go to the project:

```bash
cd youtube-watch-party
```

---

# 💻 Frontend Setup

Open a terminal and go to the client folder:

```bash
cd client
```

Install dependencies:

```bash
npm install
```

If required, install the YouTube package:

```bash
npm install react-youtube
```

Install Socket.IO client:

```bash
npm install socket.io-client
```

Start the frontend:

```bash
npm run dev
```

The frontend will normally run at:

```text
http://localhost:5173
```

---

# 🖥️ Backend Setup

Open a **second terminal**.

Go to the server:

```bash
cd youtube-watch-party/server
```

Install dependencies:

```bash
npm install
```

Then go to the source folder:

```bash
cd src
```

Start the backend:

```bash
node server.js
```

The backend will normally run at:

```text
http://localhost:5000
```

---

# ▶️ Running the Complete Project

You need **two terminals**.

### Terminal 1 — Backend

```bash
cd youtube-watch-party/server/src
node server.js
```

Expected output:

```text
YouTube Watch Party Server
Server running on http://localhost:5000
```

### Terminal 2 — Frontend

```bash
cd youtube-watch-party/client
npm run dev
```

Open:

```text
http://localhost:5173
```

---

# 🏠 Creating a Room

1. Open the application.
2. Enter your username.
3. Click **Create Room**.
4. A room code will be generated.
5. The creator becomes the **HOST**.

Example:

```text
Room Code: ABC123
Role: HOST
```

---

# 👤 Joining a Room

Open another browser tab or window.

Enter:

```text
Username: User2
Room Code: ABC123
```

Click:

```text
Join Room
```

The user will join the same watch-party room.

Example:

```text
👥 Participants

🟢 Shambhavi — HOST
🟢 User2 — PARTICIPANT
```

---

# 🎥 Loading a YouTube Video

Paste a YouTube URL into the video input.

Example:

```text
https://www.youtube.com/watch?v=VIDEO_ID
```

Click:

```text
Load Video
```

The video will appear in the YouTube player.

---

# 🧪 Testing Video Synchronization

## Test Play

1. Open the application in two browser tabs.
2. Create a room in Tab 1.
3. Join the same room from Tab 2.
4. Load the same video.
5. Press **Play** in Tab 1.

Expected:

```text
Tab 1 → Playing
Tab 2 → Playing
```

---

## Test Pause

Press **Pause** in Tab 1.

Expected:

```text
Tab 1 → Paused
Tab 2 → Paused
```

---

## Test Seek

Move the video position in the player.

Expected:

```text
Tab 1
   ↓
Socket.IO
   ↓
Server
   ↓
Tab 2
   ↓
Same video position
```

---

# 🔌 Backend Socket Flow

The backend creates a Socket.IO server:

```javascript
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});
```

When a user connects:

```text
Client
  ↓
Socket.IO Connection
  ↓
Node.js Server
```

When the user joins a room:

```text
join-room
```

The server adds the user's socket to the Socket.IO room.

---

# 👥 Participant Flow

When a user joins:

```text
User
 ↓
join-room
 ↓
Server
 ↓
Add user to room
 ↓
participants-updated
 ↓
All users receive updated list
```

When a user disconnects:

```text
User disconnects
 ↓
Server detects disconnect
 ↓
Remove user
 ↓
participants-updated
 ↓
Remaining users receive updated list
```

---

# 🧩 Important Files

## `client/src/App.tsx`

Main React component.

Responsible for:

* Create Room
* Join Room
* YouTube URL input
* Video ID extraction
* Socket.IO connection
* Sending video events
* Receiving video events
* Participant display

---

## `client/src/YouTubePlayer.tsx`

Responsible for the YouTube player.

It handles:

* Player initialization
* Play detection
* Pause detection
* Current video time
* Video synchronization

---

## `server/src/server.js`

Main backend server.

Responsible for:

* Express server
* CORS
* Socket.IO
* Room management
* User connections
* Participant management
* Video play event
* Video pause event
* Video seek event
* Disconnect handling

---

## `server/src/routes/roomRoutes.js`

Responsible for room-related API operations.

Examples:

```text
POST /api/rooms/create
POST /api/rooms/join
```

---

# 🏗️ Application Architecture

```text
                React Frontend
                      │
                      │
               Socket.IO Client
                      │
                      ▼
             Node.js + Express
                      │
                  Socket.IO
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
       User 1                  User 2
        Host                  Participant
          │                       │
          ▼                       ▼
   YouTube Player          YouTube Player
```

---

# 🔐 CORS Configuration

The backend allows the React development server:

```text
http://localhost:5173
```

Socket.IO also uses the same origin configuration.

This allows the frontend and backend to communicate during local development.

---

# 🛠️ Troubleshooting

## Cannot connect to server

Make sure the backend is running:

```bash
cd server/src
node server.js
```

Then open:

```text
http://localhost:5000
```

You should see:

```text
YouTube Watch Party Server is running
```

---

## Port 5000 Already in Use

If you see:

```text
EADDRINUSE: address already in use :::5000
```

another process is already using port `5000`.

Check the process:

```bash
netstat -ano | findstr :5000
```

Then, if necessary:

```bash
taskkill /PID <PID> /F
```

Start the server again:

```bash
node server.js
```

---

## Cannot Find `server.js`

The server file is located at:

```text
server/src/server.js
```

Therefore run:

```bash
cd server/src
node server.js
```

---

## YouTube Player Not Loading

Check that the package is installed:

```bash
npm list react-youtube
```

You should see something similar to:

```text
react-youtube@10.1.0
```

Also check the browser console for:

```text
YouTube READY
```

---

# 🧪 Manual Testing Checklist

Before considering the project ready, test:

```text
☐ Frontend starts successfully
☐ Backend starts successfully
☐ Create Room works
☐ Room code is generated
☐ Host is displayed
☐ Join Room works
☐ Participant appears
☐ YouTube URL can be entered
☐ YouTube video loads
☐ Play works
☐ Pause works
☐ Seek synchronization works
☐ Participant list updates
☐ Disconnect handling works
☐ Two browser tabs can communicate
```

---

# 📚 Concepts Demonstrated

This project demonstrates practical use of:

* React
* TypeScript
* React Hooks
* Components
* Props
* State Management
* Node.js
* Express.js
* REST APIs
* Socket.IO
* WebSockets
* CORS
* YouTube IFrame Player
* Real-time synchronization
* Room-based communication
* Role-based application logic

---

# 🚀 Future Improvements

Possible future improvements include:

* Persistent rooms
* Database-backed room state
* User authentication
* Text chat
* Emoji reactions
* Host transfer
* Better role management
* Redis Pub/Sub
* Multiple Socket.IO servers
* Load balancing
* Improved synchronization accuracy

---

# 👩‍💻 Author

**Shambhavi Sharma**

B.Tech Computer Science Engineering

Arya College of Engineering, Jaipur

---

# ⭐ Project Summary

**YouTube Watch Party** is a real-time full-stack web application that allows multiple users to watch YouTube videos together.

The project combines:

```text
React
   +
TypeScript
   +
Node.js
   +
Express.js
   +
Socket.IO
   +
YouTube Player
```

The primary purpose of the project is to demonstrate **real-time communication and synchronized video playback between multiple users in a shared room**.

---

## 🎬 Thank You

Built as a Full Stack Web Development Project.
