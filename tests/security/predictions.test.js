import { describe, it, expect, beforeEach } from 'vitest';
import { req, json, makeWorld } from '../helpers';
import * as declareResults from '@/app/api/artist/declare-results/route';
import * as predict from '@/app/api/fan/predict/route';
import Prediction from '@/models/Prediction';
import Setlist from '@/models/Setlist';

let w;
beforeEach(async () => {
    w = await makeWorld(); // truth setlist: Song A, Song B, Song C
});

const submit = async (user, titles) => predict.POST(await req('POST', '/api/fan/predict', {
    as: user, body: { eventId: String(w.event._id), songs: titles.map((title) => ({ title })) },
}));

const declare = async () => json(await declareResults.POST(await req('POST', '/api/artist/declare-results', {
    as: w.artist, body: { eventId: String(w.event._id) },
})));

describe('SEC-05: prediction scoring can\'t be gamed', () => {
    it('repeating a correct song scores it once', async () => {
        await submit(w.fan, ['Song A', 'Song A', 'Song A']);
        await declare();
        const p = await Prediction.findOne({ userId: w.fan._id });
        expect(p.score).toBe(15); // 10 for the song + 5 for the right position, once
    });

    it('a perfect prediction scores 15 per song', async () => {
        await submit(w.fan, ['Song A', 'Song B', 'Song C']);
        await declare();
        expect((await Prediction.findOne({ userId: w.fan._id })).score).toBe(45);
    });

    it('titles match case- and whitespace-insensitively', async () => {
        await submit(w.fan, ['  song a ', 'SONG B']);
        await declare();
        expect((await Prediction.findOne({ userId: w.fan._id })).score).toBe(30);
    });
});

describe('SEC-05: predictions lock when the show starts', () => {
    it('a fan can submit while the show is on standby', async () => {
        const res = await submit(w.fan, ['Song A']);
        expect(res.status).toBe(200);
    });

    it('a fan cannot submit or change a prediction once the show is live', async () => {
        await Setlist.updateOne({ eventId: w.event._id }, { showStatus: 'Live' });
        const res = await submit(w.fan, ['Song A']);
        expect(res.status).toBe(409);
    });
});
