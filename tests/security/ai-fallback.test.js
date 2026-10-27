import { describe, it, expect, beforeEach, vi } from 'vitest';
import { req, json, makeUser } from '../helpers';
import { resetRateLimits } from '@/lib/rateLimit';
import Song from '@/models/Song';

// Gemini scripted per test; Groq not configured, so "all down" means both Gemini models fail
delete process.env.GROQ_API_KEY;
const model = { answers: [] };
vi.mock('@google/genai', () => ({
    GoogleGenAI: class {
        models = {
            generateContent: async () => {
                const next = model.answers.shift();
                if (next === undefined || typeof next === 'number') throw Object.assign(new Error('upstream'), { status: next ?? 503 });
                return { text: next, usageMetadata: { totalTokenCount: 50 } };
            },
        };
    },
}));

const { resetProviderCooldowns } = await import('@/lib/llm');
const generateRoute = await import('@/app/api/generate/route');
const description = await import('@/app/api/description/route');
const patch = await import('@/app/api/patch/route');

beforeEach(() => {
    resetRateLimits();
    resetProviderCooldowns();
    model.answers = [];
});

const call = async (route, path, as, body) => json(await route.POST(await req('POST', path, { as, body })));

describe('AI requests are always answered', () => {
    it('insight: model answer when available', async () => {
        model.answers.push('Sell the sunset slot.');
        const organizer = await makeUser('organizer');
        const { status, body } = await call(generateRoute, '/api/generate', organizer, { task: 'insight', prompt: 'rooftop show' });
        expect(status).toBe(200);
        expect(body).toMatchObject({ result: 'Sell the sunset slot.', degraded: false, model: 'gemini-3.8-flash' });
    });

    it('insight: template copy when every provider is down', async () => {
        const organizer = await makeUser('organizer');
        const { status, body } = await call(generateRoute, '/api/generate', organizer, { task: 'insight', prompt: 'rooftop show' });
        expect(status).toBe(200);
        expect(body.degraded).toBe(true);
        expect(body.result).toContain('rooftop show');
    });

    it("songs: falls back to the artist's own catalogue, never invented songs", async () => {
        const artist = await makeUser('artist');
        await Song.create([{ artistId: artist._id, title: 'Real Song One', bpm: 128 }, { artistId: artist._id, title: 'Real Song Two' }]);
        const { status, body } = await call(generateRoute, '/api/generate', artist, { task: 'songs', request: 'upbeat openers' });
        expect(status).toBe(200);
        expect(body.degraded).toBe(true);
        expect(body.result.map((s) => s.title).sort()).toEqual(['Real Song One', 'Real Song Two']);
    });

    it('songs: invalid model output is not passed through; the fallback is used', async () => {
        model.answers.push('{"songs": [{"title": "x"}]}'); // missing required fields
        const artist = await makeUser('artist');
        const { body } = await call(generateRoute, '/api/generate', artist, { task: 'songs', request: 'anything' });
        expect(body.degraded).toBe(true);
        expect(body.result).toEqual([]);
    });

    it('reorder: model order is sanitised (unknown/duplicate ids dropped, missing ones appended)', async () => {
        model.answers.push('{"order": ["c", "c", "zzz", "a"]}');
        const artist = await makeUser('artist');
        const songs = [{ id: 'a', title: 'A', bpm: 100 }, { id: 'b', title: 'B', bpm: 120 }, { id: 'c', title: 'C', bpm: 90 }];
        const { body } = await call(generateRoute, '/api/generate', artist, { task: 'reorder', goal: 'chill', songs });
        expect(body).toMatchObject({ result: ['c', 'a', 'b'], degraded: false });
    });

    it('reorder: energy curve when every provider is down', async () => {
        const artist = await makeUser('artist');
        const songs = [{ id: 'a', title: 'A', bpm: 100 }, { id: 'b', title: 'B', bpm: 140 }, { id: 'c', title: 'C', bpm: 120 }];
        const { body } = await call(generateRoute, '/api/generate', artist, { task: 'reorder', songs });
        expect(body.degraded).toBe(true);
        expect(body.result).toEqual(['c', 'a', 'b']); // second-highest opens, highest closes
    });

    it('description: template draft when every provider is down', async () => {
        const organizer = await makeUser('organizer');
        const { status, body } = await call(description, '/api/description', organizer, { artist: 'Band', genre: 'Rock', vibe: 'Loud', city: 'Leeds' });
        expect(status).toBe(200);
        expect(body.degraded).toBe(true);
        expect(body.description).toContain('HEADLINE: Band Live in Leeds!');
    });

    it('patch: rule-based reading when every provider is down', async () => {
        const crew = await makeUser('production');
        const { status, body } = await call(patch, '/api/patch', crew, { prompt: 'add 4 beams', currentPatch: [{ u: 1, a: 1, c: 16, type: 'Spot' }] });
        expect(status).toBe(200);
        expect(body.meta).toMatchObject({ degraded: true, model: null });
        expect(body.patch.map((f) => f.address)).toEqual([17, 33, 49, 65]);
    });

    it('patch: an unreadable request during an outage gets guidance, not "unavailable"', async () => {
        const crew = await makeUser('production');
        const { status, body } = await call(patch, '/api/patch', crew, { prompt: 'make it look cool' });
        expect(status).toBe(422);
        expect(body.error).toMatch(/Try something like/);
    });

    it('our own abuse limit still applies (that one is intentional)', async () => {
        const organizer = await makeUser('organizer');
        for (let i = 0; i < 10; i++) await call(generateRoute, '/api/generate', organizer, { prompt: 'x' });
        const { status } = await call(generateRoute, '/api/generate', organizer, { prompt: 'x' });
        expect(status).toBe(429);
    });
});
