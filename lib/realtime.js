// Server-side broadcast helpers. Route handlers call these *after* a successful
// DB write, so connected clients only ever hear about state that was persisted.
// The Socket.IO server is created in lib/socketServer.js and stored on globalThis.

export const roomFor = (eventId) => `event:${String(eventId)}`;

export function emitToEvent(eventId, eventName, payload = {}) {
    const io = globalThis.io;
    if (!io) return false; // no socket server running (e.g. tests, serverless build)
    io.to(roomFor(eventId)).emit(eventName, { ...payload, eventId: String(eventId) });
    return true;
}

/** Public shape of a poll sent to clients. */
export function pollPayload(poll) {
    return {
        pollId: String(poll._id),
        question: poll.question,
        isActive: poll.isActive,
        options: poll.options.map((o) => ({ _id: String(o._id), text: o.text, votes: o.votes })),
    };
}
