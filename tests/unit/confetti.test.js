import { describe, expect, it } from 'vitest';
import { CANNON_UNITS, CONFETTI_LIFE, CONFETTI_SHOTS, CONFETTI_SHOT_GAP, STREAMER_LIFE, cannonPattern, confettiActive, confettiFromFirings, shotsFired, streamersFromFirings } from '@/lib/show/confetti';
import { cannonLayout, co2Layout, laserLayout, rigLayout, sparkLayout } from '@/components/home/stage/rigLayout';

describe('confetti and streamer cannons: where they stand', () => {
    const confetti = cannonLayout('confetti');
    const streamers = cannonLayout('streamers');

    it('one of each at each wing, on the deck, mirrored left and right', () => {
        for (const set of [confetti, streamers]) {
            expect(set).toHaveLength(CANNON_UNITS);
            expect(set[0].pos[0]).toBeCloseTo(-set[1].pos[0], 6);
            for (const { pos } of set) {
                expect(Math.abs(pos[0])).toBeLessThanOrEqual(15 - 0.3); // the deck is 30 m wide
                expect(pos[2]).toBeLessThan(0);                         // and ends at z = 0
                expect(pos[2]).toBeGreaterThan(-4);                     // ahead of the side towers
            }
        }
    });

    for (const count of [64, 96, 140]) {
        it(`${count} moving heads: beyond every floor head, laser, CO2 nozzle and spark machine`, () => {
            const others = [
                ...rigLayout(count).filter((f) => f.group === 'floor').map((f) => f.position[0]),
                ...laserLayout(count).filter((l) => !l.tower).map((l) => l.pos[0]),
                ...co2Layout(count).map((j) => j.pos[0]),
                ...sparkLayout(count).map((s) => s.pos[0]),
            ];
            for (const { pos } of [...confetti, ...streamers]) {
                for (const o of others) expect(Math.abs(o - pos[0])).toBeGreaterThanOrEqual(0.9);
            }
        });
    }

    it('the confetti cannon and the streamer launcher at a wing stand apart (bases 0.5 m wide)', () => {
        for (let i = 0; i < CANNON_UNITS; i++) {
            const [a, b] = [confetti[i].pos, streamers[i].pos];
            expect(Math.hypot(a[0] - b[0], a[2] - b[2])).toBeGreaterThanOrEqual(0.6);
        }
    });

    it('both aim up, out over the audience and in toward the middle', () => {
        for (const set of [confetti, streamers]) {
            for (const { pos, dir } of set) {
                expect(Math.hypot(...dir)).toBeCloseTo(1, 6);
                expect(dir[1]).toBeGreaterThan(0.5);                    // up
                expect(dir[2]).toBeGreaterThan(0.3);                    // toward the audience
                expect(Math.sign(dir[0])).toBe(-Math.sign(pos[0]));     // in toward the middle
            }
        }
    });
});

describe('confetti and streamer cannons: firing', () => {
    it('a tap fires one shot; holding fires another every shot gap, up to the whole load', () => {
        expect(shotsFired(0.4, CONFETTI_SHOTS, CONFETTI_SHOT_GAP)).toBe(1);
        expect(shotsFired(CONFETTI_SHOT_GAP + 0.1, CONFETTI_SHOTS, CONFETTI_SHOT_GAP)).toBe(2);
        expect(shotsFired(60, CONFETTI_SHOTS, CONFETTI_SHOT_GAP)).toBe(CONFETTI_SHOTS);
    });

    it('paper stays in the air long after the shot: up to CONFETTI_LIFE and STREAMER_LIFE', () => {
        const shot = [{ unit: 0, at: 0, len: 0.4 }];
        expect(confettiActive(confettiFromFirings(shot, (0.4 + CONFETTI_LIFE - 0.5) * 1000))).toBe(true);
        expect(confettiFromFirings(shot, (0.4 + CONFETTI_LIFE + 0.1) * 1000)).toBeNull();
        expect(streamersFromFirings(shot, (0.4 + STREAMER_LIFE - 0.5) * 1000)).not.toBeNull();
        expect(streamersFromFirings(shot, (0.4 + STREAMER_LIFE + 0.1) * 1000)).toBeNull();
    });

    it('desk patterns: a big burst from both cannons, or left then right', () => {
        expect(cannonPattern('burst').map((f) => [f.unit, f.delay])).toEqual([[0, 0], [1, 0]]);
        const sides = cannonPattern('sides');
        expect(sides.map((f) => f.unit)).toEqual([0, 1]);
        expect(sides[1].delay).toBeGreaterThan(sides[0].delay);
    });
});

describe('the confetti cannons fire with CO2', () => {
    it('every shot leaves in a short CO2 blast: one for a tap, a new one with each shot while held', async () => {
        const { blastsFromShots } = await import('@/lib/show/confetti');
        const opts = { count: CONFETTI_SHOTS, gap: CONFETTI_SHOT_GAP, blast: 0.35 };
        // a tap, 0.2 s ago: the first shot's blast, 0.2 s in
        expect(blastsFromShots([0.2, 0.4, -1, 0], 2, opts)).toEqual([0.2, 0.35, -1, 0.35]);
        // held for 2.6 s: the third shot fired at 2.4 s
        const held = blastsFromShots([2.6, 2.6, -1, 0], 2, opts);
        expect(held[0]).toBeCloseTo(2.6 - 2 * CONFETTI_SHOT_GAP, 6);
        // released after a tap: no new blast later on, the old one just ages
        expect(blastsFromShots([5, 0.4, -1, 0], 2, opts)[0]).toBe(5);
        expect(blastsFromShots(null, 2, opts)).toBeNull();
    });
});
