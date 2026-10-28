import { describe, it, expect } from 'vitest';
import { eventFilter, resolveEvent } from '@/lib/events';
import { makeWorld } from '../helpers';

describe('eventFilter (ARCH-01)', () => {
    it('accepts a 24-hex ObjectId and a numeric short id', () => {
        expect(eventFilter('507f1f77bcf86cd799439011')).toEqual({ _id: '507f1f77bcf86cd799439011' });
        expect(eventFilter('1004')).toEqual({ eventId: 1004 });
        expect(eventFilter(1004)).toEqual({ eventId: 1004 });
    });

    it('rejects anything else', () => {
        expect(eventFilter('twelve-chars')).toBeNull();
        expect(eventFilter('12abc')).toBeNull();
        expect(eventFilter('')).toBeNull();
        expect(eventFilter(undefined)).toBeNull();
    });
});

describe('resolveEvent', () => {
    it('finds an event by short id or ObjectId and 404s otherwise', async () => {
        const { event } = await makeWorld();
        expect(String((await resolveEvent(String(event.eventId)))._id)).toBe(String(event._id));
        expect(String((await resolveEvent(String(event._id)))._id)).toBe(String(event._id));
        await expect(resolveEvent('999999')).rejects.toMatchObject({ status: 404 });
        await expect(resolveEvent('nope')).rejects.toMatchObject({ status: 404 });
    });
});
