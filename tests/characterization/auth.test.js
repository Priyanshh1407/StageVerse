import { describe, it, expect } from 'vitest';
import { req, json, makeUser } from '../helpers';
import { POST as signup } from '@/app/api/auth/signup/route';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as fanNotifications } from '@/app/api/fan/notifications/route';

describe('auth flow', () => {
    it('signup then login sets an httpOnly session cookie', async () => {
        const s = await json(await signup(await req('POST', '/api/auth/signup', {
            body: { name: 'Ana', email: 'ana@test.dev', password: 'password123' },
        })));
        expect(s.status).toBe(201);
        expect(s.body.user.role).toBe('fan');

        const res = await login(await req('POST', '/api/auth/login', {
            body: { email: 'ana@test.dev', password: 'password123' },
        }));
        expect(res.status).toBe(200);
        const cookie = res.headers.get('set-cookie');
        expect(cookie).toMatch(/token=/);
        expect(cookie).toMatch(/HttpOnly/i);
    });

    it('wrong password returns 401 with a generic message', async () => {
        await makeUser('fan', { email: 'bob@test.dev' });
        const { status, body } = await json(await login(await req('POST', '/api/auth/login', {
            body: { email: 'bob@test.dev', password: 'nope' },
        })));
        expect(status).toBe(401);
        expect(body.message).toBe('Invalid credentials.');
    });

    // ERR-01 (fixed): used to be a 500 because verifyAuth threw into a generic catch
    it('protected route without a cookie returns 401', async () => {
        const res = await fanNotifications(await req('GET', '/api/fan/notifications'));
        expect(res.status).toBe(401);
    });
});
