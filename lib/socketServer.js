import { Server } from 'socket.io';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { resolveEvent } from '@/lib/events';
import { eventRelations } from '@/lib/authz';
import { roomFor } from '@/lib/realtime';
import { CLIENT_EVENT_NAMES, parseClientEvent } from '@/lib/liveProtocol';

// Who may send client events (the event list and payload schemas live in lib/liveProtocol.js).
// Poll start/end/vote tallies are *not* client events: the HTTP routes broadcast those
// after the DB write, so clients can't fake them.
const CONTROL_ROLES = new Set(['artist', 'crew']);

function readCookie(header, name) {
    if (!header) return undefined;
    for (const part of header.split(';')) {
        const [key, ...rest] = part.trim().split('=');
        if (key === name) return decodeURIComponent(rest.join('='));
    }
    return undefined;
}

/** The strongest relation wins: artist > crew > organizer > audience. */
function roleIn(user, event) {
    const relations = eventRelations(user, event);
    for (const role of ['artist', 'crew', 'organizer']) if (relations.has(role)) return role;
    return 'audience';
}

/**
 * Attach an authenticated, room-scoped Socket.IO server to an HTTP server.
 *  - Handshake: the `token` session cookie must be a valid JWT, or the connection is refused.
 *  - `show:join` (eventId, ack): joins `event:<id>`; the server decides the caller's role.
 *  - Control events are relayed only to the sender's show room, only from artist/crew.
 */
export function createSocketServer(httpServer, { allowedOrigins = [] } = {}) {
    const io = new Server(httpServer, {
        path: '/api/socket/io',
        addTrailingSlash: false,
        pingTimeout: 60000,
        pingInterval: 25000,
        // Same-origin needs no CORS. Cross-origin clients must be listed explicitly;
        // `origin: "*"` with credentials would let any site ride a user's cookie.
        cors: allowedOrigins.length ? { origin: allowedOrigins, credentials: true } : undefined,
        transports: ['polling', 'websocket'],
    });

    io.use(async (socket, next) => {
        try {
            const token = readCookie(socket.handshake.headers.cookie, 'token');
            socket.data.user = await verifyToken(token);
            socket.data.shows = new Map(); // eventId -> role
            next();
        } catch {
            next(new Error('unauthorized'));
        }
    });

    io.on('connection', (socket) => {
        const reply = (ack, payload) => { if (typeof ack === 'function') ack(payload); };

        socket.on('show:join', async (eventId, ack) => {
            try {
                await dbConnect();
                const event = await resolveEvent(eventId);
                const id = String(event._id);
                const role = roleIn(socket.data.user, event);
                socket.data.shows.set(id, role);
                await socket.join(roomFor(id));
                reply(ack, { ok: true, eventId: id, role });
            } catch (error) {
                reply(ack, { ok: false, error: error.status === 404 ? 'Event not found' : 'Could not join show' });
            }
        });

        socket.on('show:leave', (eventId) => {
            const id = String(eventId ?? '');
            socket.data.shows.delete(id);
            socket.leave(roomFor(id));
        });

        for (const name of CLIENT_EVENT_NAMES) {
            socket.on(name, (data = {}) => {
                const id = String(data?.eventId ?? '');
                const role = socket.data.shows.get(id);
                if (!CONTROL_ROLES.has(role)) {
                    socket.emit('error:forbidden', { event: name, eventId: id });
                    return;
                }
                const payload = parseClientEvent(name, data);
                if (!payload) {
                    socket.emit('error:invalid', { event: name, eventId: id });
                    return;
                }
                io.to(roomFor(id)).emit(name, payload);
            });
        }
    });

    return io;
}
