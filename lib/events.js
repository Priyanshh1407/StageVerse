import Event from '@/models/Event';
import { NotFoundError } from '@/lib/errors';

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const SHORT_ID = /^\d+$/;

/**
 * Turn an event identifier from a URL or body into a Mongo filter.
 * Accepts a 24-hex ObjectId or the numeric short id (e.g. 1004). Anything else returns null.
 * (mongoose.isValidObjectId is not used on purpose: it accepts any 12-character string.)
 */
export function eventFilter(id) {
    const value = String(id ?? '').trim();
    if (OBJECT_ID.test(value)) return { _id: value };
    if (SHORT_ID.test(value)) return { eventId: Number(value) };
    return null;
}

/** Load an event by ObjectId or short id, or throw NotFoundError. */
export async function resolveEvent(id, { populate } = {}) {
    const filter = eventFilter(id);
    if (!filter) throw new NotFoundError('Event not found');
    let query = Event.findOne(filter);
    if (populate) query = query.populate(populate);
    const event = await query;
    if (!event) throw new NotFoundError('Event not found');
    return event;
}
