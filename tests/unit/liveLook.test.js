import { describe, expect, it } from 'vitest';
import { VOTE_COLORS, leadingOption, liveLook, patchRig } from '@/lib/show/liveLook';

const poll = (votes, extra = {}) => ({ isActive: true, options: votes.map((v, i) => ({ _id: String(i), text: `Song ${i + 1}`, votes: v })), ...extra });

describe('the live show on the 3D stage', () => {
    it('nobody leads before the first vote; then the option with the most votes; then the declared winner', () => {
        expect(leadingOption(null)).toBeNull();
        expect(leadingOption(poll([0, 0, 0]))).toBeNull();
        expect(leadingOption(poll([2, 7, 3]))).toMatchObject({ index: 1, text: 'Song 2', decided: false });
        // a closed poll keeps its persisted winner, even if a later count differs
        expect(leadingOption(poll([2, 7, 3], { isActive: false, winner: { text: 'Song 3', votes: 9 } }))).toMatchObject({ index: 2, decided: true });
    });

    it('standby is the venue under house lights, with nothing moving', () => {
        const look = liveLook({ status: 'Standby' }, 3);
        expect(look.house).toBeGreaterThan(0.5);
        expect(look.beams).toBeLessThan(0.2);
        expect(look.laser).toBe(0);
    });

    it('live runs the rig, in the colours of the option in front', () => {
        const none = liveLook({ status: 'Live' }, 1);
        expect(none.house).toBe(0);
        expect(none.intensity).toBeGreaterThan(1);
        expect(none.colorA).toBe(VOTE_COLORS[0].a);
        const led = liveLook({ status: 'Live', poll: poll([1, 0, 5]) }, 1);
        expect([led.colorA, led.colorB]).toEqual([VOTE_COLORS[2].a, VOTE_COLORS[2].b]);
        expect(led.laser).toBe(0);
        // the winner brings the lasers in
        const won = liveLook({ status: 'Live', poll: poll([1, 0, 5], { isActive: false, winner: { text: 'Song 3', votes: 5 } }) }, 1);
        expect(won.laser).toBe(1);
        expect(won.colorA).toBe(VOTE_COLORS[2].a);
    });

    it('an open vote makes the rig busier, a warning flashes the strobes, a pause holds a soft wash', () => {
        expect(liveLook({ status: 'Live', poll: poll([1, 2]) }, 1).speed).toBeGreaterThan(liveLook({ status: 'Live' }, 1).speed);
        const flashes = new Set([0, 0.06, 0.13, 0.19, 0.26].map((t) => liveLook({ status: 'Live', warning: true }, t).strobe));
        expect(flashes).toEqual(new Set([0, 1]));
        expect(liveLook({ status: 'Live' }, 0.13).strobe).toBe(0);
        const paused = liveLook({ status: 'Paused' }, 1);
        expect(paused.sweep).toBe(0);
        expect(paused.intensity).toBeLessThan(0.6);
    });
});

describe('a patch as a rig', () => {
    const fixtures = [
        ...Array.from({ length: 24 }, (_, i) => ({ profile: 'Martin MAC Aura XB', universe: 1, address: 1 + i * 20 })),
        ...Array.from({ length: 10 }, () => ({ profile: 'Clay Paky Sharpy', universe: 2 })),
        { profile: 'Atomic 3000 Strobe', universe: 2 }, { profile: 'Kvant Laser 10W', universe: 3 }, { profile: 'Kvant Laser 10W', universe: 3 },
        { profile: '4-Lite Blinder', universe: 3 }, { profile: 'MDG Hazer', universe: 3 }, { profile: 'Sunstrip LED bar', universe: 3 }, { profile: 'Intercom base station', universe: 3 },
    ];

    it('counts each kind of fixture and the universes used', () => {
        const rig = patchRig(fixtures);
        expect(rig.counts).toEqual({ heads: 34, lasers: 2, strobes: 1, blinders: 1, hazers: 1, bars: 1, other: 1 });
        expect(rig.universes).toBe(3);
        expect(rig.total).toBe(41);
        expect(rig.stage).toEqual({ beams: 34, lasers: 16, blinders: 4 });
        expect(rig.exact).toBe(true);
    });

    it('keeps the stage inside what it can draw', () => {
        expect(patchRig([]).stage.beams).toBe(12);
        expect(patchRig([]).exact).toBe(false);
        const huge = patchRig(Array.from({ length: 400 }, () => ({ profile: 'Robe MegaPointe' })));
        expect(huge.stage.beams).toBe(140);
        expect(huge.exact).toBe(false);
    });
});
