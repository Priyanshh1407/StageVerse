import { Server } from "socket.io";

export const config = {
    api: {
        bodyParser: false,
    },
};

const ioHandler = (req, res) => {
    // 1. Check if IO is already running (Global or Server-Attached)
    if (global.io) {
        // Reuse global instance if server restarted but process lived
        if (!res.socket.server.io) {
            res.socket.server.io = global.io;
        }
    }

    if (!res.socket.server.io) {
        console.log("*First use, starting socket.io*");

        const httpServer = res.socket.server;
        const io = new Server(httpServer, {
            path: "/api/socket/io",
            addTrailingSlash: false,
            pingTimeout: 60000,
            pingInterval: 25000,
            cors: {
                origin: "*",
                methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                credentials: true,
            },
            transports: ["polling", "websocket"], // Explicitly allow both
        });

        // Save to Global
        global.io = io;

        io.on("connection", (socket) => {
            console.log(`Socket Connected: ${socket.id} (Unique Client ID)`);

            // Listen for Show Start
            socket.on("show:start", (data) => {
                console.log("Show Started:", data);
                io.emit("show:update", { status: 'Live', ...data });
            });

            // Listen for Generic Show Updates (Pause, Resume, etc)
            socket.on("show:update", (data) => {
                console.log("Show Update:", data);
                io.emit("show:update", data);
            });

            // Listen for Votes (Real-time broadcasting)
            socket.on("poll:vote", (data) => {
                console.log("Vote Cast:", data);
                io.emit("poll:update", data); // Broadcast to Production/Artist
            });

            // Listen for Poll Start
            socket.on("poll:start", (data) => {
                console.log("Poll Started:", data);
                io.emit("poll:start", data);
            });

            // Listen for Poll End
            socket.on("poll:end", () => {
                console.log("Poll Ended");
                io.emit("poll:end");
            });

            // Listen for Poll Reveal
            socket.on("poll:reveal", (data) => {
                console.log("Poll Reveal:", data);
                io.emit("poll:reveal", data);
            });

            // Listen for Last Song Warning
            socket.on("show:warning", (data) => {
                console.log("Show Warning:", data);
                io.emit("show:warning", data);
            });

            // Join specific rooms if needed (e.g., event_123)
            socket.on("join-room", (room) => {
                socket.join(room);
                console.log(`User ${socket.id} joined ${room}`);
            });

            socket.on("disconnect", () => {
                console.log("Socket Disconnected");
            });
        });

        res.socket.server.io = io;
    } else {
        // console.log("Socket.io already running");
    }

    res.end();
};

export default ioHandler;
