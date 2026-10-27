import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { tokenFor, makeUser } from '../helpers';
import { proxy } from '@/proxy';
import * as health from '@/app/api/health/route';

async function visit(path, user) {
    const headers = user ? { cookie: `token=${await tokenFor(user)}` } : {};
    const res = await proxy(new NextRequest(new URL(path, 'http://localhost:3000'), { headers }));
    const location = res.headers.get('location');
    return location ? new URL(location).pathname : 'next';
}

describe('page gate (proxy.js)', () => {
    it('public pages are open to anonymous visitors', async () => {
        expect(await visit('/')).toBe('next');
        expect(await visit('/events/123')).toBe('next');
    });

    it('protected pages send anonymous visitors to login', async () => {
        expect(await visit('/live-show/abc')).toBe('/login');
        expect(await visit('/prod-dashboard')).toBe('/login');
    });

    it("a role is redirected away from another role's pages", async () => {
        const fan = await makeUser('fan');
        expect(await visit('/live-show/abc', fan)).toBe('/dashboard');
        expect(await visit('/create-event', fan)).toBe('/dashboard');
        expect(await visit('/dashboard', fan)).toBe('next');
    });

    it('prefixes match whole path segments: /live (crew) is not /live-show (artist)', async () => {
        const artist = await makeUser('artist');
        expect(await visit('/live-show/abc', artist)).toBe('next');
        expect(await visit('/live/abc', artist)).toBe('/artist-dashboard');
        const crew = await makeUser('production');
        expect(await visit('/live/abc', crew)).toBe('next');
    });

    it('a tampered token is treated as logged out', async () => {
        const res = await proxy(new NextRequest('http://localhost:3000/tasks', { headers: { cookie: 'token=forged.jwt.value' } }));
        expect(new URL(res.headers.get('location')).pathname).toBe('/login');
    });

    it('logged-in users visiting /login go to their dashboard', async () => {
        const organizer = await makeUser('organizer');
        expect(await visit('/login', organizer)).toBe('/manage/dashboard');
    });
});

describe('/api/health', () => {
    it('reports ok with the database up, and nothing else', async () => {
        const res = await health.GET();
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toMatchObject({ status: 'ok', db: 'up' });
        expect(Object.keys(body).sort()).toEqual(['db', 'latencyMs', 'status']);
    });
});
