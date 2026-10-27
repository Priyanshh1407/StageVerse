import { describe, it, expect, beforeEach } from 'vitest';
import { req, json, makeWorld, makeUser, makePoll } from '../helpers';
import * as fanPoll from '@/app/api/fan/poll/route';
import * as artistPoll from '@/app/api/artist/poll/route';
import Poll from '@/models/Poll';
import Vote from '@/models/Vote';

let w, poll, optA, optB;

beforeEach(async () => {
    w = await makeWorld();
    poll = await makePoll(w.event._id, { isActive: true });
    optA = String(poll.options[0]._id);
    optB = String(poll.options[1]._id);
});

const vote = async (user, optionId = optA, pollId = String(poll._id)) =>
    fanPoll.POST(await req('POST', '/api/fan/poll', { as: user, body: { pollId, optionId } }));

const totalVotes = async () => (await Poll.findById(poll._id)).options.reduce((s, o) => s + o.votes, 0);

describe('SEC-04: one fan, one vote', () => {
    it('a logged-in fan can vote once', async () => {
        const { status, body } = await json(await vote(w.fan));
        expect(status).toBe(200);
        expect(body.votedOptionId).toBe(optA);
        expect(await totalVotes()).toBe(1);
    });

    it('a second vote from the same fan is rejected with 409 and not counted', async () => {
        await vote(w.fan, optA);
        const res = await vote(w.fan, optB);
        expect(res.status).toBe(409);
        expect(await totalVotes()).toBe(1);
    });

    it('20 simultaneous votes from one fan count exactly once (unique index, not app logic)', async () => {
        const results = await Promise.all(Array.from({ length: 20 }, () => vote(w.fan)));
        const statuses = results.map((r) => r.status);
        expect(statuses.filter((s) => s === 200)).toHaveLength(1);
        expect(statuses.filter((s) => s === 409)).toHaveLength(19);
        expect(await totalVotes()).toBe(1);
        expect(await Vote.countDocuments({ pollId: poll._id })).toBe(1);
    });

    it('different fans each get one vote', async () => {
        const fans = await Promise.all(Array.from({ length: 5 }, () => makeUser('fan')));
        await Promise.all(fans.map((f) => vote(f)));
        expect(await totalVotes()).toBe(5);
    });

    it('votes on a closed poll are rejected', async () => {
        await Poll.updateOne({ _id: poll._id }, { isActive: false });
        const res = await vote(w.fan);
        expect(res.status).toBe(409);
        expect(await totalVotes()).toBe(0);
    });

    it('an option from a different poll is rejected', async () => {
        const other = await makePoll(w.event._id, { isActive: false });
        const res = await vote(w.fan, String(other.options[0]._id));
        expect(res.status).toBe(404);
    });

    it('malformed ids return 400, not 500', async () => {
        const res = await vote(w.fan, 'not-an-id');
        expect(res.status).toBe(400);
    });

    it('GET reports which option the fan already voted for', async () => {
        await vote(w.fan, optB);
        const { body } = await json(await fanPoll.GET(await req('GET', `/api/fan/poll?eventId=${w.event._id}`, { as: w.fan })));
        expect(body.votedOptionId).toBe(optB);
    });
});

describe('poll lifecycle', () => {
    it('opening a poll closes any other open poll for the event', async () => {
        const second = await makePoll(w.event._id, { isActive: false });
        const res = await fanPoll.PUT(await req('PUT', '/api/fan/poll', { as: w.artist, body: { pollId: String(second._id), isActive: true } }));
        expect(res.status).toBe(200);
        expect((await Poll.findById(poll._id)).isActive).toBe(false);
        expect((await Poll.findById(second._id)).isActive).toBe(true);
    });

    it('polls configured in the setlist builder start closed', async () => {
        const { body } = await json(await artistPoll.POST(await req('POST', '/api/artist/poll', {
            as: w.artist, body: { eventId: String(w.event._id), question: 'Encore?', options: ['A', 'B'] },
        })));
        expect(body.poll.isActive).toBe(false);
    });
});
