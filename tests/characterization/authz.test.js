import { describe, it, expect } from 'vitest';
import { req, json, params, makeWorld, makePoll, makeUser } from '../helpers';
import { POST as saveSetlist } from '@/app/api/artist/setlist/route';
import { POST as votePoll } from '@/app/api/fan/poll/route';
import { PUT as setLiveStatus } from '@/app/api/production/live/route';
import { GET as reports } from '@/app/api/reports/route';
import Setlist from '@/models/Setlist';

describe('authorization (characterization)', () => {
    it('the artist can save the setlist for their own event', async () => {
        const { artist, event } = await makeWorld();
        const { status } = await json(await saveSetlist(req('POST', '/api/artist/setlist', {
            as: artist,
            body: { eventId: String(event._id), items: [{ title: 'Opener' }] },
        })));
        expect(status).toBe(200);
        const saved = await Setlist.findOne({ eventId: event._id });
        expect(saved.items.map((i) => i.title)).toEqual(['Opener']);
    });

    // SEC-03: any logged-in user can overwrite any event's setlist
    it.fails('a fan cannot overwrite an artist\'s setlist', async () => {
        const { fan, event } = await makeWorld();
        const res = await saveSetlist(req('POST', '/api/artist/setlist', {
            as: fan,
            body: { eventId: String(event._id), items: [{ title: 'Hacked' }] },
        }));
        expect(res.status).toBe(403);
    });

    // SEC-04: voting needs no session at all
    it.fails('voting without a session is rejected', async () => {
        const { event } = await makeWorld();
        const poll = await makePoll(event._id);
        const res = await votePoll(req('POST', '/api/fan/poll', {
            body: { pollId: String(poll._id), optionId: String(poll.options[0]._id) },
        }));
        expect(res.status).toBe(401);
    });

    // SEC-02: anyone can change a live show's status
    it.fails('changing live show status without a session is rejected', async () => {
        const { event } = await makeWorld();
        const res = await setLiveStatus(req('PUT', '/api/production/live', {
            body: { eventId: String(event._id), status: 'Live' },
        }));
        expect(res.status).toBe(401);
    });

    // SEC-03: reports trusts ?eventId= without checking the organizer owns it
    it.fails('an organizer cannot read another organizer\'s reports', async () => {
        const { event } = await makeWorld();
        const otherOrganizer = await makeUser('organizer');
        const res = await reports(req('GET', `/api/reports?eventId=${event._id}`, { as: otherOrganizer }));
        expect(res.status).toBe(403);
    });
});
