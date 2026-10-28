import { describe, it, expect } from 'vitest';
import { req, json, makeWorld, makeUser } from '../helpers';
import * as social from '@/app/api/social/route';
import Ticket from '@/models/Ticket';
import User from '@/models/User';

const follow = async (as, userId, value = true) => json(await social.POST(await req('POST', '/api/social', { as, body: { userId: String(userId), follow: value } })));
const list = async (as) => json(await social.GET(await req('GET', '/api/social', { as })));

describe('Friends page API (/api/social)', () => {
    it('requires a login', async () => {
        expect((await json(await social.GET(await req('GET', '/api/social')))).status).toBe(401);
    });

    it('follows and unfollows, and counts shows you share', async () => {
        const { fan, event } = await makeWorld();
        const friend = await makeUser('fan');
        await Ticket.create([
            { userId: fan._id, eventId: event._id, price: 50, qrCode: 'S-1' },
            { userId: friend._id, eventId: event._id, price: 50, qrCode: 'S-2' },
        ]);

        expect((await follow(fan, friend._id)).status).toBe(200);
        let { body } = await list(fan);
        expect(body.following).toHaveLength(1);
        expect(body.following[0]).toMatchObject({ name: friend.name, sharedShows: 1 });
        expect(body.following[0].nextShow.title).toBe(event.title);

        expect((await follow(fan, friend._id, false)).status).toBe(200);
        ({ body } = await list(fan));
        expect(body.following).toHaveLength(0);
    });

    it('suggests fans going to the same shows, not people already followed', async () => {
        const { fan, event } = await makeWorld();
        const stranger = await makeUser('fan');
        const followed = await makeUser('fan');
        await Ticket.create([
            { userId: fan._id, eventId: event._id, price: 50, qrCode: 'S-3' },
            { userId: stranger._id, eventId: event._id, price: 50, qrCode: 'S-4' },
            { userId: followed._id, eventId: event._id, price: 50, qrCode: 'S-5' },
        ]);
        await follow(fan, followed._id);

        const { body } = await list(fan);
        expect(body.suggestions.map((s) => s.id)).toEqual([String(stranger._id)]);
        expect(body.suggestions[0].reason).toContain(event.title);
    });

    it("rejects following yourself, bad ids and people who don't exist", async () => {
        const fan = await makeUser('fan');
        expect((await follow(fan, fan._id)).status).toBe(400);
        expect((await follow(fan, 'not-an-id')).status).toBe(400);
        expect((await follow(fan, '0123456789abcdef01234567')).status).toBe(404);
        expect((await User.findById(fan._id)).following).toHaveLength(0);
    });

    it('only ever changes your own following list', async () => {
        const a = await makeUser('fan');
        const b = await makeUser('fan');
        await json(await social.POST(await req('POST', '/api/social', { as: a, body: { userId: String(b._id), follow: true, as: String(b._id) } })));
        expect((await User.findById(b._id)).following).toHaveLength(0);
        expect((await User.findById(a._id)).following.map(String)).toEqual([String(b._id)]);
    });
});
