import { describe, expect, it } from 'vitest';
import { FLAME_FADE, FLAME_UNITS, flameGlow, flamePattern, flamesActive, flamesFromFirings } from '@/lib/show/flames';
import { firingsDone } from '@/lib/show/effects';
import { FLAME_CLEAR, FLAME_FRONT_CLEAR, FLAME_SPACING, FLAME_Z, co2Layout, flameLayout, laserLayout, rigLayout } from '@/components/home/stage/rigLayout';
import { roomFlash } from '@/components/home/stage/flash';

describe('flame units: where they stand', () => {
    for (const count of [64, 96, 140]) {
        it(`${count} moving heads: 6 units on the front lip, clear of the lights, lasers, CO2 nozzles and each other`, () => {
            const units = flameLayout(count);
            expect(units).toHaveLength(FLAME_UNITS);
            const xs = units.map((u) => u.pos[0]);
            expect([...xs].sort((a, b) => a - b)).toEqual(xs);
            const heads = rigLayout(count).filter((f) => f.group === 'floor').map((f) => f.position[0]);
            const lasers = laserLayout(count).filter((l) => !l.tower).map((l) => l.pos[0]);
            const jets = co2Layout(count);
            for (const [i, u] of units.entries()) {
                const [x, , z] = u.pos;
                // always in front of the lights
                expect(z).toBe(FLAME_Z);
                expect(z).toBeGreaterThan(-0.6 + 0.3);
                // never straight in front of a moving head or a CO2 nozzle back in the row
                for (const h of heads) expect(Math.abs(h - x)).toBeGreaterThanOrEqual(FLAME_FRONT_CLEAR - 0.001);
                for (const j of jets) expect(Math.abs(j.pos[0] - x)).toBeGreaterThanOrEqual((j.front ? FLAME_CLEAR : FLAME_FRONT_CLEAR) - 0.001);
                // and well away from the laser housings that reach the lip
                for (const l of lasers) expect(Math.abs(l - x)).toBeGreaterThanOrEqual(FLAME_CLEAR - 0.001);
                if (i) expect(x - xs[i - 1]).toBeGreaterThanOrEqual(FLAME_SPACING - 0.001);
            }
        });
    }

    it('the default rig is mirrored left and right', () => {
        const xs = flameLayout(64).map((u) => u.pos[0]);
        xs.forEach((x, i) => expect(x).toBeCloseTo(-xs[FLAME_UNITS - 1 - i], 5));
    });
});

describe('flame units: firing and glow', () => {
    it('a held burst burns while held, then burns out within FLAME_FADE', () => {
        const held = [{ unit: 2, at: 0, len: null }];
        const burning = flamesFromFirings(held, 1500);
        expect(burning[4]).toBeCloseTo(1.5);
        expect(flamesActive(burning)).toBe(true);
        const released = [{ unit: 2, at: 0, len: 1.5 }];
        expect(flamesActive(flamesFromFirings(released, 1500 + (FLAME_FADE - 0.05) * 1000))).toBe(true);
        expect(flamesFromFirings(released, 1500 + (FLAME_FADE + 0.05) * 1000)).toBeNull();
        expect(firingsDone(released, 1500 + (FLAME_FADE + 0.05) * 1000, FLAME_FADE)).toBe(true);
        expect(firingsDone(held, 99999, FLAME_FADE)).toBe(false); // still held
    });

    it('the glow grows with the number of burning units, flares as they ignite and dies as they burn out', () => {
        const state = (units, age, len = 2) => Array.from({ length: FLAME_UNITS }, (_, j) => (units.includes(j) ? [age, len] : [-1, 0])).flat();
        expect(flameGlow(null)).toBe(0);
        const one = flameGlow(state([0], 1));
        const three = flameGlow(state([0, 1, 2], 1));
        expect(three).toBeGreaterThan(one);
        expect(flameGlow(state([0, 1, 2, 3, 4, 5], 1))).toBeLessThanOrEqual(1);
        expect(flameGlow(state([0], 0.12))).toBeGreaterThan(one);           // the whoosh as it lights
        expect(flameGlow(state([0], 2 + FLAME_FADE / 2))).toBeLessThan(one); // burning out
    });

    it('the room is lit warm while flames burn, even in a blackout; strobes and blinders are unchanged', () => {
        const burning = Array.from({ length: FLAME_UNITS }, () => [0.5, 1]).flat();
        const lit = roomFlash({ master: 0, strobe: 0, blinder: 0, flames: burning }, 0);
        expect(lit.fire).toBeGreaterThan(0.5);
        expect(lit.total).toBe(0);
        expect(roomFlash({ master: 1, strobe: 0, blinder: 0 }, 0).fire).toBe(0);
    });

    it('desk patterns: a chase left to right and back; outside-in in pairs; a burst of all six', () => {
        expect(flamePattern('chase').map((f) => f.unit)).toEqual([0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0]);
        expect(flamePattern('outside-in').filter((f) => f.delay === 0).map((f) => f.unit)).toEqual([0, 5]);
        expect(flamePattern('burst')).toHaveLength(FLAME_UNITS);
    });
});
