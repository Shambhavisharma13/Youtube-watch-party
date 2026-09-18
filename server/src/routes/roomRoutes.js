const express = require("express");
const router = express.Router();

const roomService = require("../services/roomService");


// CREATE ROOM
router.post("/create", (req, res) => {

    const { username } = req.body;

    if (!username || username.trim() === "") {
        return res.status(400).json({
            message: "Username is required"
        });
    }

    const result = roomService.createRoom(username.trim());

    res.status(201).json({
        message: "Room created successfully",
        roomId: result.room.roomId,
        userId: result.hostId,
        username: username.trim(),
        role: "HOST"
    });
});


// JOIN ROOM
router.post("/join", (req, res) => {

    const { roomId, username } = req.body;

    // Check username
    if (!username || username.trim() === "") {
        return res.status(400).json({
            message: "Username is required"
        });
    }

    // Check room ID
    if (!roomId || roomId.trim() === "") {
        return res.status(400).json({
            message: "Room ID is required"
        });
    }

    const result = roomService.joinRoom(
        roomId.trim().toUpperCase(),
        username.trim()
    );

    // Room doesn't exist
    if (!result.success) {
        return res.status(404).json({
            message: result.message
        });
    }

    // Successfully joined
    res.status(200).json({
        message: "Joined room successfully",
        roomId: result.room.roomId,
        userId: result.participant.id,
        username: result.participant.username,
        role: result.participant.role
    });
});


module.exports = router;