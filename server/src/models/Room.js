class Room {
    constructor(roomId, hostId, username) {
        this.roomId = roomId;
        this.hostId = hostId;

        this.participants = [
            {
                id: hostId,
                username: username,
                role: "HOST"
            }
        ];

        this.videoId = null;
        this.currentTime = 0;
        this.playState = "paused";
    }
}

module.exports = Room;