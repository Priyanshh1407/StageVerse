import { describe, it, expect } from 'vitest';
import { req, json, makeWorld, makeUser, params } from '../helpers';
import * as messages from '@/app/api/fan/messages/route';
import * as orgStats from '@/app/api/organizer/stats/route';
import * as prodEvent from '@/app/api/production/events/[id]/route';
import Message from '@/models/Message';
import Ticket from '@/models/Ticket';
import Event from '@/models/Event';

const send = async (as, to, text) => json(await messages.POST(await req('POST', '/api/fan/messages', { as, body: { to: String(to), text } })));
const thread = async (as, other) => json(await messages.GET(await req('GET', `/api/fan/messages?with=${other}`, { as })));
const inbox = async (as) => json(await messages.GET(await req('GET', '/api/fan/messages', { as })));

describe('Fan messages (/api/fan/messages)', () => {
    it('requires a login', async () => {
        expect((await json(await messages.GET(await req('GET', '/api/fan/messages')))).status).toBe(401);
    });

    it('sends a message, shows it in both conversations, and marks it read when opened', async () => {
        const a = await makeUser('fan');
        const b = await makeUser('fan');
        expect((await send(a, b._id, '  See you at the show!  ')).status).toBe(201);

        let { body } = await inbox(b);
        expect(body.conversations).toHaveLength(1);
        expect(body.conversations[0]).toMatchObject({ with: { name: a.name }, unread: 1 });
        expect(body.conversations[0].last.text).toBe('See you at the show!');

        ({ body } = await thread(b, a._id));
        expect(body.messages).toEqual([expect.objectContaining({ text: 'See you at the show!', mine: false })]);
        expect((await inbox(b)).body.conversations[0].unread).toBe(0);
        expect((await thread(a, b._id)).body.messages[0].mine).toBe(true);
    });

    it("never shows other people's conversations", async () => {
        const a = await makeUser('fan');
        const b = await makeUser('fan');
        const snoop = await makeUser('fan');
        await send(a, b._id, 'private');
        expect((await inbox(snoop)).body.conversations).toHaveLength(0);
        // reading "a conversation with a" as the snoop only returns the snoop's own messages with a (none)
        expect((await thread(snoop, a._id)).body.messages).toHaveLength(0);
    });

    it('rejects empty, too long, self-addressed, malformed and unknown recipients', async () => {
        const a = await makeUser('fan');
        const b = await makeUser('fan');
        expect((await send(a, b._id, '   ')).status).toBe(400);
        expect((await send(a, b._id, 'x'.repeat(1001))).status).toBe(400);
        expect((await send(a, a._id, 'hi me')).status).toBe(400);
        expect((await send(a, 'nope', 'hi')).status).toBe(400);
        expect((await send(a, '0123456789abcdef01234567', 'hi')).status).toBe(404);
        expect(await Message.countDocuments({ from: a._id })).toBe(0);
    });
});

describe('Organizer dashboard stats (/api/organizer/stats)', () => {
    it('is for organizers only', async () => {
        const { fan } = await makeWorld();
        expect((await json(await orgStats.GET(await req('GET', '/api/organizer/stats', { as: fan })))).status).toBe(403);
    });

    it("counts only the organizer's own events: revenue, tickets, capacity, upcoming shows", async () => {
        const { organizer, fan, event } = await makeWorld();
        const other = await makeWorld(); // another organizer's show and sales
        await Ticket.create([
            { userId: fan._id, eventId: event._id, price: 50, qrCode: 'O-1' },
            { userId: fan._id, eventId: event._id, price: 50, qrCode: 'O-2' },
            { userId: fan._id, eventId: event._id, price: 50, qrCode: 'O-3', status: 'Refunded' },
            { userId: other.fan._id, eventId: other.event._id, price: 999, qrCode: 'O-4' },
        ]);
        const { status, body } = await json(await orgStats.GET(await req('GET', '/api/organizer/stats', { as: organizer })));
        expect(status).toBe(200);
        expect(body.stats).toMatchObject({ revenue: 100, ticketsSold: 2, capacityPercent: 2, upcomingShows: 1 });
        expect(body.stats.nextShow.title).toBe(event.title);
    });
});

describe('Archiving a show from the crew dashboard', () => {
    it('archives and unarchives through productionStatus, which the dashboard reads', async () => {
        const { crew, event } = await makeWorld();
        await Event.updateOne({ _id: event._id }, { productionStatus: 'active' });
        const put = async (status) => json(await prodEvent.PUT(await req('PUT', `/api/production/events/${event.eventId}`, { as: crew, body: { status } }), params({ id: String(event.eventId) })));
        expect((await put('archived')).status).toBe(200);
        let saved = await Event.findById(event._id).lean();
        expect(saved.productionStatus).toBe('archived');
        expect(saved.status).toBe('Scheduled'); // the public status is untouched
        expect((await put('active')).status).toBe(200);
        saved = await Event.findById(event._id).lean();
        expect(saved.productionStatus).toBe('active');
    });
});
