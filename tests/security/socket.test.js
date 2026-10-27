import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { io as connect } from 'socket.io-client';
import { req, makeWorld, makeUser, makePoll, tokenFor } from '../helpers';
import { createSocketServer } from '@/lib/socketServer';
import * as fanPoll from '@/app/api/fan/poll/route';

let httpServer, ioServer, url;
const clients = [];

beforeAll(async () => {
    httpServer = createServer();
    ioServer = createSocketServer(httpServer);
    globalThis.io = ioServer; // lets route handlers broadcast via lib/realtime
    await new Promise((resolve) => httpServer.listen(0, resolve));
    url = `http://localhost:${httpServer.address().port}`;
});

afterAll(async () => {
    delete globalThis.io;
    await new Promise((resolve) => ioServer.close(resolve));
});

afterEach(() => {
    while (clients.length) clients.pop().disconnect();
});

/** Connect as a user (or anonymously / with a raw token). Resolves once connected, rejects on connect_error. */
async function client({ as, token } = {}) {
    const jwt = token ?? (as ? await tokenFor(as) : undefined);
    const socket = connect(url, {
        path: '/api/socket/io',
        transports: ['websocket'],
        reconnection: false,
        extraHeaders: jwt ? { cookie: `token=${jwt}` } : {},
    });
    clients.push(socket);
    await new Promise((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('connect_error', reject);
    });
    return socket;
}

const join = (socket, eventId) => socket.emitWithAck('show:join', String(eventId));

/** Resolve with the next `name` event, or with null after `ms`. */
const next = (socket, name, ms = 300) => new Promise((resolve) => {
    const timer = setTimeout(() => { socket.off(name, handler); resolve(null); }, ms);
    const handler = (data) => { clearTimeout(timer); resolve(data); };
    socket.once(name, handler);
});

let w, other;
beforeEach(async () => {
    w = await makeWorld();
    other = await makeWorld(); // a second, unrelated show
});

describe('SEC-02: socket handshake authentication', () => {
    it('rejects a connection without a session cookie', async () => {
        await expect(client()).rejects.toThrow('unauthorized');
    });

    it('rejects a forged token', async () => {
        await expect(client({ token: 'eyJhbGciOiJIUzI1NiJ9.e30.forged' })).rejects.toThrow('unauthorized');
    });

    it('accepts a valid session and assigns the role from the event, not the account', async () => {
        const crew = await client({ as: w.crew });
        expect(await join(crew, w.event._id)).toMatchObject({ ok: true, role: 'crew' });

        const outsiderArtist = await client({ as: await makeUser('artist') });
        expect(await join(outsiderArtist, w.event._id)).toMatchObject({ ok: true, role: 'audience' });
    });

    it('joining an unknown event fails cleanly', async () => {
        const fan = await client({ as: w.fan });
        expect(await join(fan, '507f1f77bcf86cd799439011')).toMatchObject({ ok: false, error: 'Event not found' });
    });
});

describe('SEC-02: only the artist/crew of a show can control it', () => {
    it('a fan cannot broadcast a show update', async () => {
        const fan = await client({ as: w.fan });
        const crew = await client({ as: w.crew });
        await join(fan, w.event._id);
        await join(crew, w.event._id);

        const forbidden = next(fan, 'error:forbidden');
        const received = next(crew, 'show:update');
        fan.emit('show:update', { eventId: String(w.event._id), status: 'Paused' });

        expect(await forbidden).toMatchObject({ event: 'show:update' });
        expect(await received).toBeNull();
    });

    it('a socket cannot control a show it has not joined', async () => {
        const artistOfOther = await client({ as: other.artist });
        const crew = await client({ as: w.crew });
        await join(crew, w.event._id);

        const received = next(crew, 'show:update');
        artistOfOther.emit('show:update', { eventId: String(w.event._id), status: 'Paused' });
        expect(await received).toBeNull();
    });

    it('the artist\'s update reaches their own crew, with unknown fields stripped', async () => {
        const artist = await client({ as: w.artist });
        const crew = await client({ as: w.crew });
        await join(artist, w.event._id);
        await join(crew, w.event._id);

        const received = next(crew, 'show:update');
        artist.emit('show:update', { eventId: String(w.event._id), status: 'Live', time: 42, injected: '<script>' });
        expect(await received).toEqual({ eventId: String(w.event._id), status: 'Live', time: 42 });
    });
});

describe('BUG-05: events stay inside their show', () => {
    it('an update for show A never reaches show B', async () => {
        const artistA = await client({ as: w.artist });
        const crewA = await client({ as: w.crew });
        const crewB = await client({ as: other.crew });
        await join(artistA, w.event._id);
        await join(crewA, w.event._id);
        await join(crewB, other.event._id);

        const inA = next(crewA, 'show:update');
        const inB = next(crewB, 'show:update');
        artistA.emit('show:update', { eventId: String(w.event._id), status: 'Live' });

        expect(await inA).toMatchObject({ status: 'Live' });
        expect(await inB).toBeNull();
    });
});

describe('SEC-04: tallies come from the server after the DB write', () => {
    it('a vote over HTTP broadcasts the persisted tally to that show only', async () => {
        const poll = await makePoll(w.event._id, { isActive: true });
        const crewA = await client({ as: w.crew });
        const crewB = await client({ as: other.crew });
        await join(crewA, w.event._id);
        await join(crewB, other.event._id);

        const inA = next(crewA, 'poll:update', 1000);
        const inB = next(crewB, 'poll:update');
        await fanPoll.POST(await req('POST', '/api/fan/poll', {
            as: w.fan, body: { pollId: String(poll._id), optionId: String(poll.options[0]._id) },
        }));

        const update = await inA;
        expect(update.pollId).toBe(String(poll._id));
        expect(update.options.map((o) => o.votes)).toEqual([1, 0]);
        expect(await inB).toBeNull();
    });

    it('client-sent poll:vote messages are ignored', async () => {
        const fan = await client({ as: w.fan });
        const crew = await client({ as: w.crew });
        await join(fan, w.event._id);
        await join(crew, w.event._id);

        const received = next(crew, 'poll:update');
        fan.emit('poll:vote', { eventId: String(w.event._id), pollId: 'x', optionId: 'y' });
        expect(await received).toBeNull();
    });
});
