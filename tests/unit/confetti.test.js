import { describe, expect, it } from 'vitest';
import {
    CONFETTI_BLAST_SHARE, CONFETTI_LIFE, CONFETTI_STREAM, CONFETTI_TAP, CONFETTI_UNITS, STREAMER_LIFE, STREAMER_SHOTS, STREAMER_SHOT_GAP, STREAMER_UNITS,
    confettiActive, confettiFromFirings, confettiLaunchAt, confettiPattern, shotsFired, streamerPattern, streamersFromFirings,
} from '@/lib/show/confetti';
import { ARRAY_X, ARRAY_Z, SUB_PITCH, SUB_WIDTH, SUB_Z, confettiLayout, streamerLayout } from '@/components/home/stage/rigLayout';
import { ROWS } from '@/components/home/stage/trussGeometry';

describe('confetti cannons: where they stand', () => {
    const cannons = confettiLayout();

    it('four: one under each line array, two in the gaps between the middle sub stacks, mirrored', () => {
        expect(cannons).toHaveLength(CONFETTI_UNITS);
        expect(cannons.map((c) => c.spot)).toEqual(['line array', 'sub gap', 'sub gap', 'line array']);
        cannons.forEach((c, i) => expect(c.base[0]).toBeCloseTo(-cannons[CONFETTI_UNITS - 1 - i].base[0], 6));
        for (const c of cannons) expect(c.base[1]).toBeLessThan(0.5); // on the ground
        // under the line arrays
        for (const c of [cannons[0], cannons[3]]) {
            expect(Math.abs(c.base[0])).toBeCloseTo(ARRAY_X, 6);
            expect(c.base[2]).toBeCloseTo(ARRAY_Z, 6);
        }
    });

    it('the middle two sit in sub gaps with room to spare: clear of the stacks either side', () => {
        const stacks = Array.from({ length: 12 }, (_, i) => (i - 5.5) * SUB_PITCH);
        for (const c of [cannons[1], cannons[2]]) {
            expect(c.base[2]).toBeCloseTo(SUB_Z, 6);
            const nearest = Math.min(...stacks.map((x) => Math.abs(x - c.base[0])));
            // half a stack (SUB_WIDTH / 2) plus half the 0.5 m base, with a margin
            expect(nearest).toBeGreaterThanOrEqual(SUB_WIDTH / 2 + 0.25 + 0.1);
        }
    });

    it('all aim up and out over the audience; the sides angle in, the middle two fire nearly straight', () => {
        for (const c of cannons) {
            expect(Math.hypot(...c.dir)).toBeCloseTo(1, 6);
            expect(c.dir[1]).toBeGreaterThan(0.6);
            expect(c.dir[2]).toBeGreaterThan(0.4);
        }
        expect(Math.sign(cannons[0].dir[0])).toBe(1);   // the left one angles right, in over the crowd
        expect(Math.sign(cannons[3].dir[0])).toBe(-1);
        expect(Math.abs(cannons[1].dir[0])).toBeLessThan(0.1);
        expect(Math.abs(cannons[2].dir[0])).toBeLessThan(0.1);
    });
});

describe('streamer launchers: where they stand', () => {
    const launchers = streamerLayout();

    it('three on top of the aerial truss: left, centre and right, each aimed at its own third of the crowd', () => {
        expect(launchers).toHaveLength(STREAMER_UNITS);
        for (const l of launchers) {
            expect(l.base[1]).toBeGreaterThan(ROWS[0].y + 0.2);           // on top of the truss
            expect(Math.abs(l.base[2] - ROWS[0].z)).toBeLessThan(0.2);   // within its depth
            expect(Math.hypot(...l.dir)).toBeCloseTo(1, 6);
            expect(l.dir[2]).toBeGreaterThan(0.6);                        // out over the audience
        }
        expect(launchers.map((l) => Math.sign(l.base[0]))).toEqual([-1, 0, 1]);
        expect(launchers[0].dir[0]).toBeLessThan(-0.2);
        expect(launchers[1].dir[0]).toBeCloseTo(0, 6);
        expect(launchers[2].dir[0]).toBeGreaterThan(0.2);
    });
});

describe('confetti: streams while held, like the CO2', () => {
    it('a tap launches the instant burst; holding keeps it pouring until the load runs out', () => {
        expect(confettiLaunchAt(0)).toBe(0);
        // the first share of the load all leaves within the tap
        expect(confettiLaunchAt(CONFETTI_BLAST_SHARE - 1e-6)).toBeLessThanOrEqual(CONFETTI_TAP);
        // the rest streams out evenly afterwards
        const a = confettiLaunchAt(0.5);
        const b = confettiLaunchAt(0.6);
        const c = confettiLaunchAt(0.7);
        expect(b - a).toBeCloseTo(c - b, 6);
        expect(a).toBeGreaterThan(CONFETTI_TAP);
        expect(confettiLaunchAt(1)).toBeCloseTo(CONFETTI_STREAM, 6);
    });

    it('paper stays in the air long after the cannon stops', () => {
        const tap = [{ unit: 0, at: 0, len: CONFETTI_TAP }];
        expect(confettiActive(confettiFromFirings(tap, (CONFETTI_TAP + CONFETTI_LIFE - 0.5) * 1000))).toBe(true);
        expect(confettiFromFirings(tap, (CONFETTI_TAP + CONFETTI_LIFE + 0.1) * 1000)).toBeNull();
        expect(streamersFromFirings(tap, (CONFETTI_TAP + STREAMER_LIFE - 0.5) * 1000)).not.toBeNull();
        expect(streamersFromFirings(tap, (CONFETTI_TAP + STREAMER_LIFE + 0.1) * 1000)).toBeNull();
    });

    it('streamers fire in shots: a tap fires one, holding fires another every shot gap, up to the load', () => {
        expect(shotsFired(0.4, STREAMER_SHOTS, STREAMER_SHOT_GAP)).toBe(1);
        expect(shotsFired(STREAMER_SHOT_GAP + 0.1, STREAMER_SHOTS, STREAMER_SHOT_GAP)).toBe(2);
        expect(shotsFired(60, STREAMER_SHOTS, STREAMER_SHOT_GAP)).toBe(STREAMER_SHOTS);
    });

    it('desk patterns: a big burst from every cannon, or a sweep left to right', () => {
        expect(confettiPattern('burst').every((f) => f.delay === 0)).toBe(true);
        expect(confettiPattern('burst')).toHaveLength(CONFETTI_UNITS);
        const sweep = streamerPattern('sweep');
        expect(sweep.map((f) => f.unit)).toEqual([0, 1, 2]);
        expect(sweep[2].delay).toBeGreaterThan(sweep[1].delay);
    });
});
