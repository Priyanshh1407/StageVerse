import Counter from '@/models/Counter';
import Event from '@/models/Event';

const FLOOR = 1000;

async function increment(name) {
    return Counter.findOneAndUpdate({ id: name }, { $inc: { seq: 1 } }, { returnDocument: 'after' });
}

/**
 * Next numeric event short id (1001, 1002, ...).
 * A single atomic $inc on one counter document, so concurrent creates never get the
 * same id and deletions never cause reuse (unlike `1000 + countDocuments() + 1`).
 * The first call seeds the counter from the highest id already in the collection.
 */
export async function nextEventId() {
    let counter = await increment('eventId');
    if (!counter) {
        const highest = await Event.findOne({ eventId: { $ne: null } }).sort({ eventId: -1 }).select('eventId');
        try {
            await Counter.create({ id: 'eventId', seq: Math.max(FLOOR, highest?.eventId ?? FLOOR) });
        } catch (error) {
            if (error?.code !== 11000) throw error; // another request seeded it first: fine
        }
        counter = await increment('eventId');
    }
    // The counter can be behind ids that already exist (older data, imports, the seed's fixed
    // ids). Handing one of those out made the save fail with a duplicate key, and the organizer
    // had to retry until the counter passed them. Jump it past the highest id instead.
    if (await Event.exists({ eventId: counter.seq })) {
        const highest = await Event.findOne({ eventId: { $ne: null } }).sort({ eventId: -1 }).select('eventId');
        await Counter.updateOne({ id: 'eventId' }, { $max: { seq: Math.max(FLOOR, highest?.eventId ?? FLOOR) } });
        counter = await increment('eventId');
    }
    return counter.seq;
}
