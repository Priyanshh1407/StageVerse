import { describe, it, expect, beforeEach } from 'vitest';
import { req, json, params, makeUser } from '../helpers';
import * as events from '@/app/api/events/route';
import * as eventById from '@/app/api/events/[id]/route';
import * as productionEvents from '@/app/api/production/events/route';
import Venue from '@/models/Venue';
import Event from '@/models/Event';

let organizer, venue;
beforeEach(async () => {
    organizer = await makeUser('organizer');
    venue = await Venue.create({ name: 'Hall', city: 'Leeds', address: '1 St' });
});

const body = (title) => ({
    title, description: 'd', date: new Date(Date.now() + 86400000).toISOString(), time: '8 PM',
    venue: String(venue._id), city: 'Leeds', artist: 'Band',
});
const create = async (title) => json(await events.POST(await req('POST', '/api/events', { as: organizer, body: body(title) })));

describe('BUG-09: event short ids', () => {
    it('creating an event after a deletion does not collide', async () => {
        const first = await create('One');
        await create('Two');
        await eventById.DELETE(await req('DELETE', `/api/events/${first.body.data._id}`, { as: organizer }), params({ id: String(first.body.data._id) }));

        const third = await create('Three');
        expect(third.status).toBe(200);
        const ids = (await Event.find().select('eventId')).map((e) => e.eventId);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('concurrent creates get distinct ids', async () => {
        const results = await Promise.all(['A', 'B', 'C', 'D', 'E'].map(create));
        expect(results.every((r) => r.status === 200)).toBe(true);
        const ids = results.map((r) => r.body.data.eventId);
        expect(new Set(ids).size).toBe(5);
    });

    it('continues after the highest existing short id (no reuse of legacy ids)', async () => {
        await Event.create({ ...body('Legacy'), eventId: 1500, organizerId: organizer._id });
        const created = await create('New');
        expect(created.body.data.eventId).toBeGreaterThan(1500);
    });

    it('a counter behind existing ids still creates on the first attempt (used to fail until retried past them)', async () => {
        await create('First'); // the counter exists now
        const { default: Counter } = await import('@/models/Counter');
        const { seq } = await Counter.findOne({ id: 'eventId' });
        // Legacy events sitting right where the counter goes next
        for (const id of [seq + 1, seq + 2, seq + 3]) await Event.create({ ...body(`Old ${id}`), eventId: id, organizerId: organizer._id });

        const created = await create('New');
        expect(created.status).toBe(200);
        expect(created.body.data.eventId).toBeGreaterThan(seq + 3);
    });
});

describe('BUG-14: production "Create show" with a new venue name', () => {
    it('creates the venue instead of failing validation', async () => {
        const crew = await makeUser('production');
        const res = await productionEvents.POST(await req('POST', '/api/production/events', {
            as: crew, body: { title: 'Arena Tour', date: new Date().toISOString(), venue: 'Brand New Hall' },
        }));
        expect(res.status).toBe(200);
        expect(await Venue.findOne({ name: 'Brand New Hall' })).not.toBeNull();
    });
});
