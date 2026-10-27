import { describe, it, expect, beforeEach, vi } from 'vitest';
import { req, json, makeUser } from '../helpers';
import { rateLimit, resetRateLimits } from '@/lib/rateLimit';

// The LLM routes must never reach Google in tests
vi.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: class {
        getGenerativeModel() {
            return { generateContent: async () => ({ response: { text: () => 'A punchy teaser.' } }) };
        }
    },
}));

const generate = await import('@/app/api/generate/route');
const description = await import('@/app/api/description/route');
const patch = await import('@/app/api/patch/route');
const signup = await import('@/app/api/auth/signup/route');
const login = await import('@/app/api/auth/login/route');
const me = await import('@/app/api/auth/me/route');

beforeEach(() => resetRateLimits());

describe('rateLimit (token bucket)', () => {
    it('allows `capacity` calls, then 429 with Retry-After, then refills over time', () => {
        const limits = { capacity: 2, refillPerMinute: 60 }; // one token per second
        rateLimit('k', limits, 0);
        rateLimit('k', limits, 0);
        try {
            rateLimit('k', limits, 0);
            throw new Error('should have thrown');
        } catch (e) {
            expect(e.status).toBe(429);
            expect(e.retryAfterSeconds).toBe(1);
        }
        expect(() => rateLimit('k', limits, 1000)).not.toThrow();
    });

    it('keys are independent', () => {
        const limits = { capacity: 1, refillPerMinute: 1 };
        rateLimit('a', limits, 0);
        expect(() => rateLimit('b', limits, 0)).not.toThrow();
    });
});

describe('SEC-06: LLM endpoints', () => {
    it('reject anonymous callers', async () => {
        const res = await generate.POST(await req('POST', '/api/generate', { body: { prompt: 'hi' } }));
        expect(res.status).toBe(401);
    });

    it('reject the wrong role', async () => {
        const fan = await makeUser('fan');
        expect((await generate.POST(await req('POST', '/api/generate', { as: fan, body: { prompt: 'hi' } }))).status).toBe(403);
        const organizer = await makeUser('organizer');
        expect((await patch.POST(await req('POST', '/api/patch', { as: organizer, body: { prompt: 'add 4 beams' } }))).status).toBe(403);
    });

    it('cap prompt length', async () => {
        const organizer = await makeUser('organizer');
        const res = await generate.POST(await req('POST', '/api/generate', { as: organizer, body: { prompt: 'x'.repeat(5000) } }));
        expect(res.status).toBe(400);
    });

    it('allow 10 calls a minute per user, then 429 with Retry-After', async () => {
        const organizer = await makeUser('organizer');
        const call = async () => generate.POST(await req('POST', '/api/generate', { as: organizer, body: { prompt: 'hi' } }));
        for (let i = 0; i < 10; i++) expect((await call()).status).toBe(200);
        const limited = await call();
        expect(limited.status).toBe(429);
        expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    });

    it('organizers can generate descriptions', async () => {
        const organizer = await makeUser('organizer');
        const res = await description.POST(await req('POST', '/api/description', {
            as: organizer, body: { artist: 'Band', genre: 'Rock', vibe: 'Loud' },
        }));
        expect(res.status).toBe(200);
    });
});

describe('SEC-09: signup and login', () => {
    const signupWith = async (body) => json(await signup.POST(await req('POST', '/api/auth/signup', { body })));

    it('rejects short passwords, bad emails and unknown roles', async () => {
        expect((await signupWith({ name: 'A', email: 'a@test.dev', password: 'short' })).status).toBe(400);
        expect((await signupWith({ name: 'A', email: 'not-an-email', password: 'password123' })).status).toBe(400);
        expect((await signupWith({ name: 'A', email: 'a@test.dev', password: 'password123', role: 'admin' })).status).toBe(400);
    });

    it('stores emails lowercase so the same address cannot register twice with different case', async () => {
        expect((await signupWith({ name: 'A', email: 'Mixed@Test.dev', password: 'password123' })).status).toBe(201);
        expect((await signupWith({ name: 'B', email: 'mixed@test.dev', password: 'password123' })).status).toBe(409);
    });

    it('locks out password guessing after 5 attempts a minute', async () => {
        await makeUser('fan', { email: 'victim@test.dev' });
        const attempt = async () => login.POST(await req('POST', '/api/auth/login', { body: { email: 'victim@test.dev', password: 'wrong' } }));
        for (let i = 0; i < 5; i++) expect((await attempt()).status).toBe(401);
        expect((await attempt()).status).toBe(429);
    });
});

describe('BUG-11: /api/auth/me', () => {
    it('returns the real name and email, not "User"', async () => {
        const user = await makeUser('artist', { name: 'Real Name', email: 'real@test.dev' });
        const { status, body } = await json(await me.GET(await req('GET', '/api/auth/me', { as: user })));
        expect(status).toBe(200);
        expect(body.user).toMatchObject({ name: 'Real Name', email: 'real@test.dev', role: 'artist' });
    });

    it('returns 401 with user: null when logged out', async () => {
        const { status, body } = await json(await me.GET(await req('GET', '/api/auth/me')));
        expect(status).toBe(401);
        expect(body.user).toBeNull();
    });
});
