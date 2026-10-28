import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { req, json, params, makeWorld, makeUser, tokenFor } from '../helpers';
import * as events from '@/app/api/events/route';
import * as setlist from '@/app/api/artist/setlist/route';
import * as fanPoll from '@/app/api/fan/poll/route';
import * as venues from '@/app/api/venues/route';
import * as daySheet from '@/app/api/artist/day-sheet/[id]/route';
import Venue from '@/models/Venue';

let w;
beforeEach(async () => { w = await makeWorld(); });

describe('VAL-01: request bodies are validated and whitelisted', () => {
    it('event create drops client-supplied sold counts and ownership', async () => {
        const venue = await Venue.create({ name: 'V2', city: 'C', address: 'A' });
        const { status, body } = await json(await events.POST(await req('POST', '/api/events', {
            as: w.organizer,
            body: {
                title: 'Show', description: 'd', date: '2030-01-01', time: '8 PM', venue: String(venue._id), city: 'C', artist: 'Band',
                ticketTiers: [{ name: 'GA', price: 10, capacity: 100, sold: 999 }],
                organizerId: String(w.fan._id), eventId: 1, assignedTo: String(w.fan._id),
            },
        })));
        expect(status).toBe(200);
        expect(body.data.ticketTiers[0].sold).toBe(0);
        expect(String(body.data.organizerId)).toBe(String(w.organizer._id));
        expect(body.data.assignedTo).toBeUndefined();
    });

    it('bad fields return 400 with the field name', async () => {
        const { status, body } = await json(await events.POST(await req('POST', '/api/events', {
            as: w.organizer, body: { title: 'Show', date: 'not-a-date' },
        })));
        expect(status).toBe(400);
        expect(body.details.map((d) => d.field)).toEqual(expect.arrayContaining(['date', 'venue']));
    });

    it('setlist items must be a list of titled songs', async () => {
        const res = await setlist.POST(await req('POST', '/api/artist/setlist', {
            as: w.artist, body: { eventId: String(w.event._id), items: [{ duration: '3:00' }] },
        }));
        expect(res.status).toBe(400);
    });

    it('a poll needs at least two options', async () => {
        const res = await fanPoll.POST(await req('POST', '/api/fan/poll', {
            as: w.artist, body: { create: true, eventId: String(w.event._id), question: 'Q', options: ['only one'] },
        }));
        expect(res.status).toBe(400);
    });

    it('venues need an address', async () => {
        const res = await venues.POST(await req('POST', '/api/venues', { as: w.organizer, body: { name: 'X', city: 'Y' } }));
        expect(res.status).toBe(400);
    });

    it('day sheet items must have a known type', async () => {
        const res = await daySheet.PUT(await req('PUT', `/api/artist/day-sheet/${w.event._id}`, {
            as: w.artist, body: { schedule: [{ time: '10:00', title: 'Call', type: 'party' }] },
        }), params({ id: String(w.event._id) }));
        expect(res.status).toBe(400);
    });

    it('malformed JSON returns 400, not 500', async () => {
        const organizer = await makeUser('organizer');
        const token = await tokenFor(organizer);
        globalThis.__testCookies = { token };
        const res = await venues.POST(new NextRequest('http://localhost/api/venues', {
            method: 'POST', headers: { cookie: `token=${token}`, 'content-type': 'application/json' }, body: '{not json',
        }));
        expect(res.status).toBe(400);
    });
});
