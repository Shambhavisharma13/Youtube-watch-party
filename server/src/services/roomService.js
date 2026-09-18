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

function getRoom(roomId) {
    return rooms.get(roomId);
}

module.exports = {
    createRoom,
    getRoom
};