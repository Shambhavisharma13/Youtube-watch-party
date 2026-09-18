const Room = require("../models/Room");

const rooms = new Map();

function generateRoomId() {
    return Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
}

function generateUserId() {
    return Math.random()
        .toString(36)
        .substring(2, 10);
}

function createRoom(username) {
    let roomId = generateRoomId();

    while (rooms.has(roomId)) {
        roomId = generateRoomId();
    }

    const hostId = generateUserId();

    const room = new Room(
        roomId,
        hostId,
        username
    );

    rooms.set(roomId, room);

    return {
        room,
        hostId
    };
}


// JOIN ROOM
function joinRoom(roomId, username) {

    const room = rooms.get(roomId);

    // Check if room exists
    if (!room) {
        return {
            success: false,
            message: "Room not found"
        };
    }

    const userId = generateUserId();

    const participant = {
        id: userId,
        username: username,
        role: "PARTICIPANT"
    };

    room.participants.push(participant);

    return {
        success: true,
        room,
        participant
    };
}


function getRoom(roomId) {
    return rooms.get(roomId);
}


module.exports = {
    createRoom,
    joinRoom,
    getRoom
};