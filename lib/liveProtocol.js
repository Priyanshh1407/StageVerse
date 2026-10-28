import { z } from 'zod';

// The live-show socket protocol in one place.
//
// Client -> server (relayed to the show room, artist/crew only):
//   show:update  { eventId, status?, time? }   timer sync on pause/resume
//   poll:reveal  { eventId, winner }           crew triggers the encore screen
//
// Server -> clients (emitted by HTTP routes after the DB write; clients can't send these):
//   show:update  { eventId, status, warning }
//   show:warning { eventId }
//   poll:start | poll:update | poll:end  { eventId, pollId, question, isActive, winner, options[] }
//
// Every relayed payload is parsed with these schemas. Unknown fields are dropped and wrong
// types are rejected, so a client can't push arbitrary data onto other people's screens.

const eventId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const clientEvents = {
    'show:update': z.object({
        eventId,
        status: z.enum(['Standby', 'Live', 'Paused']).optional(),
        time: z.number().int().min(0).max(24 * 3600).optional(),
    }),
    'poll:reveal': z.object({
        eventId,
        winner: z.string().trim().min(1).max(200),
    }),
};

export const CLIENT_EVENT_NAMES = Object.keys(clientEvents);

/** Validate a client event. Returns the clean payload, or null if it's malformed. */
export function parseClientEvent(name, data) {
    const schema = clientEvents[name];
    if (!schema) return null;
    const result = schema.safeParse(data);
    return result.success ? result.data : null;
}
