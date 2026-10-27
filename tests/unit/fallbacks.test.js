import { describe, it, expect } from 'vitest';
import { energyCurve } from '@/lib/setlistCurve';
import { ruleIntent } from '@/lib/dmx/ruleIntent';

describe('energyCurve (reorder fallback)', () => {
    const songs = [
        { id: 'a', bpm: '90 BPM' }, { id: 'b', bpm: 140 }, { id: 'c', bpm: '128' },
        { id: 'd', bpm: 100 }, { id: 'e', bpm: 110 }, { id: 'f', bpm: null },
    ];

    it('returns every id exactly once', () => {
        const order = energyCurve(songs);
        expect([...order].sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    });

    it('opens strong, dips in the middle and ends on the highest-energy song', () => {
        const order = energyCurve(songs);
        const bpm = { a: 90, b: 140, c: 128, d: 100, e: 110, f: 110 };
        expect(order[order.length - 1]).toBe('b'); // highest closes
        expect(order[0]).toBe('c');                // second highest opens
        const middle = bpm[order[Math.floor(order.length / 2)]];
        expect(middle).toBeLessThan(bpm[order[0]]);
    });

    it('handles tiny lists', () => {
        expect(energyCurve([{ id: 'x', bpm: 1 }, { id: 'y', bpm: 2 }])).toEqual(['y', 'x']);
    });
});

describe('ruleIntent (patch fallback)', () => {
    it.each([
        ['add 8 beams and 4 washes', { action: 'add', fixtures: [{ type: 'Wash', count: 4 }, { type: 'Beam', count: 8 }] }],
        ['Add 10 LED pars in 8 channel mode', { action: 'add', fixtures: [{ type: 'LED Par', count: 10, channels: 8 }] }],
        ['Add two 24-channel spots', { action: 'add', fixtures: [{ type: 'Spot', count: 2, channels: 24 }] }],
        ['I need a dozen wash lights', { action: 'add', fixtures: [{ type: 'Wash', count: 12 }] }],
        ['fix the collisions', { action: 'repatch', fixtures: [] }],
        ['Repatch and add 4 beams', { action: 'repatch', fixtures: [{ type: 'Beam', count: 4 }] }],
    ])('%s', (text, expected) => {
        expect(ruleIntent(text)).toEqual(expected);
    });

    it('returns null when it cannot read the request', () => {
        expect(ruleIntent('Add 3 Robe BMFL Blades')).toBeNull();
        expect(ruleIntent('make it look cool')).toBeNull();
    });
});
