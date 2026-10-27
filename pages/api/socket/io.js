import { createSocketServer } from '@/lib/socketServer';

export const config = {
    api: {
        bodyParser: false,
    },
};

// Next.js has no built-in WebSocket support, so the Socket.IO server is attached
// to the underlying Node HTTP server the first time this route is hit.
// This needs a long-running Node process (next start / custom server), not serverless.
const ioHandler = (req, res) => {
    if (!res.socket.server.io) {
        const allowedOrigins = (process.env.SOCKET_ALLOWED_ORIGINS || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

        // Reuse the instance if the module was reloaded but the process lived (dev HMR)
        const io = globalThis.io ?? createSocketServer(res.socket.server, { allowedOrigins });
        globalThis.io = io;
        res.socket.server.io = io;
    }
    res.end();
};

export default ioHandler;
