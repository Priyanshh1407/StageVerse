import { describe, it, expect } from 'vitest';
import { req, json, makeWorld } from '../helpers';
import * as setlist from '@/app/api/artist/setlist/route';
import * as venues from '@/app/api/venues/route';
import * as discover from '@/app/api/discover/route';
import * as productionSearch from '@/app/api/production/search/route';
import Song from '@/models/Song';
import { escapeRegex } from '@/lib/escapeRegex';

describe('SEC-08: user input is matched literally, never as a regex', () => {
    it('escapeRegex neutralises regex syntax', () => {
        expect(new RegExp(`^${escapeRegex('a.b')}$`).test('axb')).toBe(false);
        expect(() => new RegExp(escapeRegex('My Song (Live'))).not.toThrow();
    });

    it('a song title with "(" saves instead of crashing the setlist', async () => {
        const { artist, event } = await makeWorld();
        const res = await setlist.POST(await req('POST', '/api/artist/setlist', {
            as: artist, body: { eventId: String(event._id), items: [{ title: 'My Song (Live' }] },
        }));
        expect(res.status).toBe(200);
    });

    it('a title of ".*" creates its own song instead of linking an unrelated one', async () => {
        const { artist, event } = await makeWorld();
        const existing = await Song.create({ artistId: artist._id, title: 'Existing Hit' });
        const { body } = await json(await setlist.POST(await req('POST', '/api/artist/setlist', {
            as: artist, body: { eventId: String(event._id), items: [{ title: '.*' }] },
        })));
        expect(String(body.data.items[0].songId)).not.toBe(String(existing._id));
    });

    it('song matching is still case-insensitive and exact', async () => {
        const { artist, event } = await makeWorld();
        const existing = await Song.create({ artistId: artist._id, title: 'Existing Hit' });
        const { body } = await json(await setlist.POST(await req('POST', '/api/artist/setlist', {
            as: artist, body: { eventId: String(event._id), items: [{ title: 'existing hit' }] },
        })));
        expect(String(body.data.items[0].songId)).toBe(String(existing._id));
    });

    it.each([
        ['venues', () => venues.GET, '/api/venues?search=('],
        ['discover', () => discover.GET, '/api/discover?search=(&genre=(&city=('],
    ])('%s search with "(" returns 200, not an error', async (_name, handler, path) => {
        const res = await handler()(await req('GET', path));
        expect(res.status).toBe(200);
    });

    it('production search with "(" returns 200', async () => {
        const { crew } = await makeWorld();
        const res = await productionSearch.GET(await req('GET', '/api/production/search?q=(', { as: crew }));
        expect(res.status).toBe(200);
    });
});
