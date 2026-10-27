import { describe, it, expect } from 'vitest';
import { SignJWT } from 'jose';
import { req, json, params, makeWorld } from '../helpers';
import { apiError } from '@/lib/api';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { GET as fanNotifications } from '@/app/api/fan/notifications/route';
import { PUT as updateEvent } from '@/app/api/events/[id]/route';

describe('ERR-01: auth failures are 401, not 500', () => {
    it('a garbage token returns 401', async () => {
        const res = await fanNotifications(await req('GET', '/api/fan/notifications', { token: 'not-a-jwt' }));
        expect(res.status).toBe(401);
    });

    it('a token signed with the wrong secret returns 401', async () => {
        const forged = await new SignJWT({ userId: '507f1f77bcf86cd799439011', role: 'organizer' })
            .setProtectedHeader({ alg: 'HS256' })
            .sign(new TextEncoder().encode('attacker-secret'));
        const res = await fanNotifications(await req('GET', '/api/fan/notifications', { token: forged }));
        expect(res.status).toBe(401);
    });

    it('updating a non-existent event returns 404, not a TypeError 500', async () => {
        const { organizer } = await makeWorld();
        const res = await updateEvent(
            await req('PUT', '/api/events/507f1f77bcf86cd799439011', { as: organizer, body: { title: 'x' } }),
            params({ id: '507f1f77bcf86cd799439011' }),
        );
        expect(res.status).toBe(404);
    });
});

describe('apiError mapping', () => {
    it.each([
        [new ValidationError('bad'), 400],
        [new ForbiddenError(), 403],
        [new NotFoundError(), 404],
    ])('%s -> %i', async (err, status) => {
        const { status: s, body } = await json(apiError(err));
        expect(s).toBe(status);
        expect(body.error).toBe(err.message);
    });

    it('unknown errors become a generic 500 with a request id and no internals', async () => {
        const { status, body } = await json(apiError(new Error('mongo password is hunter2'), 'test'));
        expect(status).toBe(500);
        expect(body.error).toBe('Internal Server Error');
        expect(body.requestId).toMatch(/[0-9a-f-]{36}/);
        expect(JSON.stringify(body)).not.toContain('hunter2');
    });
});
