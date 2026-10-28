// PERF-01 benchmark: cost of the crew live screen.
// Run: npm run bench            (optionally BENCH_LABEL=before|after to save results)
//
// Measures, against the in-memory replica set:
//  1. GET /api/production/live latency (p50/p95) with 2,000 other shows in the database
//  2. socket emit -> receive latency for 10 crew screens in one show room
// and derives DB-hitting requests/second from each screen's polling interval.
import { it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { performance } from 'node:perf_hooks';
import { io as connect } from 'socket.io-client';
import { req, makeWorld, tokenFor } from '../tests/helpers';
import { createSocketServer } from '@/lib/socketServer';
import * as live from '@/app/api/production/live/route';
import Setlist from '@/models/Setlist';
import Poll from '@/models/Poll';

const OTHER_SHOWS = 2000;
const REQUESTS = 300;
const CREW_SCREENS = 10;
const ROUNDS = 50;

// Polling interval of the crew screen, read from the page source so the numbers follow the code
const pageSrc = fs.readFileSync(path.resolve('app/(production)/live/[id]/page.jsx'), 'utf8');
const POLL_MS = Number(pageSrc.match(/RECONCILE_MS = (\d+)/)?.[1] ?? pageSrc.match(/\}, (\d+)\); \/\/ 1-second polling/)?.[1] ?? 1000);

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
const round = (n) => Math.round(n * 100) / 100;

it('crew live screen: endpoint latency, push latency, request rate', async () => {
    const w = await makeWorld();

    // Background data so query plans matter (one setlist + poll per other show)
    const filler = Array.from({ length: OTHER_SHOWS }, () => ({
        artistId: w.artist._id,
        eventId: new (Setlist.base.Types.ObjectId)(),
        items: [{ title: 'A' }, { title: 'B' }, { title: 'C' }],
    }));
    await Setlist.insertMany(filler);
    await Poll.insertMany(filler.map((f) => ({ eventId: f.eventId, question: 'q', options: [{ text: 'a' }, { text: 'b' }] })));
    await Setlist.syncIndexes();
    await Poll.syncIndexes();

    // 1. Endpoint latency
    const url = `/api/production/live?eventId=${w.event._id}`;
    for (let i = 0; i < 20; i++) await live.GET(await req('GET', url, { as: w.crew })); // warm-up
    const times = [];
    for (let i = 0; i < REQUESTS; i++) {
        const request = await req('GET', url, { as: w.crew });
        const t0 = performance.now();
        const res = await live.GET(request);
        times.push(performance.now() - t0);
        expect(res.status).toBe(200);
    }
    times.sort((a, b) => a - b);

    // Query plan for the per-poll setlist lookup
    const plan = await Setlist.find({ eventId: w.event._id }).explain('executionStats');
    const stats = plan.executionStats ?? plan[0]?.executionStats;
    const docsExamined = stats?.totalDocsExamined;

    // 2. Push latency to 10 crew screens
    const httpServer = createServer();
    const io = createSocketServer(httpServer);
    await new Promise((r) => httpServer.listen(0, r));
    const base = `http://localhost:${httpServer.address().port}`;
    const cookie = `token=${await tokenFor(w.crew)}`;
    const artistCookie = `token=${await tokenFor(w.artist)}`;
    const open = (c) => new Promise((resolve, reject) => {
        const s = connect(base, { path: '/api/socket/io', transports: ['websocket'], reconnection: false, extraHeaders: { cookie: c } });
        s.once('connect', () => resolve(s));
        s.once('connect_error', reject);
    });
    const screens = await Promise.all(Array.from({ length: CREW_SCREENS }, () => open(cookie)));
    const artist = await open(artistCookie);
    await Promise.all([...screens, artist].map((s) => s.emitWithAck('show:join', String(w.event._id))));

    const pushTimes = [];
    for (let i = 0; i < ROUNDS; i++) {
        const t0 = performance.now();
        await Promise.all(screens.map((s) => new Promise((r) => s.once('show:update', r))
            .then(() => pushTimes.push(performance.now() - t0)))
            .concat([Promise.resolve(artist.emit('show:update', { eventId: String(w.event._id), status: 'Live', time: i }))]));
    }
    pushTimes.sort((a, b) => a - b);
    [...screens, artist].forEach((s) => s.disconnect());
    await new Promise((r) => io.close(r));

    const result = {
        label: process.env.BENCH_LABEL || 'run',
        pollIntervalMs: POLL_MS,
        endpoint: { requests: REQUESTS, p50Ms: round(pct(times, 50)), p95Ms: round(pct(times, 95)) },
        setlistLookupDocsExamined: docsExamined,
        push: { screens: CREW_SCREENS, rounds: ROUNDS, p50Ms: round(pct(pushTimes, 50)), p95Ms: round(pct(pushTimes, 95)) },
        requestsPerSecondFor10Screens: round(CREW_SCREENS * (1000 / POLL_MS)),
    };
    console.log('\nPERF-01', JSON.stringify(result, null, 2));
    fs.mkdirSync('bench/results', { recursive: true });
    fs.writeFileSync(`bench/results/live-${result.label}.json`, JSON.stringify(result, null, 2) + '\n');
}, 120000);
