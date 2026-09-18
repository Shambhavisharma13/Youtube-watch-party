const express = require("express");
const router = express.Router();

const roomService = require("../services/roomService");

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

module.exports = router;