import { describe, expect, it } from 'vitest';
import { HOME_FOR, homeFor, safeNext } from '@/lib/roles';
import { eventImage, eventPhoto, isStockPhoto, stageForGenre } from '@/lib/eventImages';
import { formatPrice } from '@/lib/format';

describe('the role homes and the page to return to after signing in', () => {
    it('sends each role to its own home, the crew included', () => {
        expect(homeFor('production')).toBe('/prod-dashboard');
        expect(homeFor('Organizer')).toBe('/manage/dashboard');
        expect(homeFor('nobody')).toBe('/');
        expect(Object.keys(HOME_FOR)).toEqual(['fan', 'artist', 'organizer', 'production']);
    });

    it('only returns to a page on this site', () => {
        expect(safeNext('/setlist-builder?event=3')).toBe('/setlist-builder?event=3');
        for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '', null, '/login', '/signup?x=1']) {
            expect(safeNext(bad), String(bad)).toBeNull();
        }
    });
});

describe('the event photos', () => {
    it('picks the stage that suits the genre', () => {
        expect(stageForGenre('EDM')).toBe('mainstage');
        expect(stageForGenre('Electronic')).toBe('mainstage');
        expect(stageForGenre('Hip-Hop')).toBe('warehouse');
        expect(stageForGenre('Bollywood')).toBe('desert');
        expect(stageForGenre('Polka')).toBeNull();
        expect(eventPhoto({ _id: 'a', genre: 'Rap' })).toMatch(/^\/images\/events\/warehouse-\d\.jpg$/);
    });

    it('always gives an event the same photo, and neighbours different ones', () => {
        const a = eventPhoto({ _id: 'event-1', genre: 'EDM' });
        expect(eventPhoto({ _id: 'event-1', genre: 'EDM' })).toBe(a);
        const many = new Set(Array.from({ length: 12 }, (_, i) => eventPhoto({ _id: `e${i}`, genre: 'EDM' })));
        expect(many.size).toBeGreaterThan(2);
    });

    it("keeps an event's own picture, and replaces stock placeholders", () => {
        expect(eventImage({ _id: 'x', images: { hero: 'https://cdn.example/poster.jpg' } })).toBe('https://cdn.example/poster.jpg');
        expect(eventImage({ _id: 'x', images: { hero: 'https://images.unsplash.com/photo-1?w=800' } })).toMatch(/^\/images\/events\//);
        expect(eventImage({ id: 'x' })).toMatch(/^\/images\/events\//);
        expect(isStockPhoto('')).toBe(true);
    });
});

describe('prices', () => {
    it('one format everywhere', () => {
        expect(formatPrice(45)).toBe('$45');
        expect(formatPrice(12.5)).toBe('$12.50');
        expect(formatPrice(0)).toBe('Free');
        expect(formatPrice(undefined)).toBe('Free');
    });
});
