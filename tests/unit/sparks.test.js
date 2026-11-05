import { describe, expect, it } from 'vitest';
import { SPARK_LIFE, SPARK_UNITS, sparkPattern, sparksActive, sparksFromFirings } from '@/lib/show/sparks';
import { firingsDone } from '@/lib/show/effects';
import { SPARK_CLEAR, SPARK_FRONT_CLEAR, SPARK_SPACING, SPARK_Z, co2Layout, laserLayout, rigLayout, sparkLayout } from '@/components/home/stage/rigLayout';

describe('cold spark machines: where they stand', () => {
    for (const count of [64, 96, 140]) {
        it(`${count} moving heads: 6 machines on the front lip, clear of the lights, lasers, CO2 nozzles and each other`, () => {
            const units = sparkLayout(count);
            expect(units).toHaveLength(SPARK_UNITS);
            const xs = units.map((u) => u.pos[0]);
            expect([...xs].sort((a, b) => a - b)).toEqual(xs);
            const heads = rigLayout(count).filter((f) => f.group === 'floor').map((f) => f.position[0]);
            const lasers = laserLayout(count).filter((l) => !l.tower).map((l) => l.pos[0]);
            const jets = co2Layout(count);
            for (const [i, u] of units.entries()) {
                const [x, , z] = u.pos;
                // always in front of the lights
                expect(z).toBe(SPARK_Z);
                expect(z).toBeGreaterThan(-0.6 + 0.3);
                // never straight in front of a moving head or a CO2 nozzle back in the row
                for (const h of heads) expect(Math.abs(h - x)).toBeGreaterThanOrEqual(SPARK_FRONT_CLEAR - 0.001);
                for (const j of jets) expect(Math.abs(j.pos[0] - x)).toBeGreaterThanOrEqual((j.front ? SPARK_CLEAR : SPARK_FRONT_CLEAR) - 0.001);
                // and well away from the laser housings that reach the lip
                for (const l of lasers) expect(Math.abs(l - x)).toBeGreaterThanOrEqual(SPARK_CLEAR - 0.001);
                if (i) expect(x - xs[i - 1]).toBeGreaterThanOrEqual(SPARK_SPACING - 0.001);
            }
        });
    }

    it('the default rig is mirrored left and right', () => {
        const xs = sparkLayout(64).map((u) => u.pos[0]);
        xs.forEach((x, i) => expect(x).toBeCloseTo(-xs[SPARK_UNITS - 1 - i], 5));
    });
});

describe('cold spark machines: firing', () => {
    it('a held burst fires while held; the sparks in the air finish falling within SPARK_LIFE', () => {
        const held = [{ unit: 2, at: 0, len: null }];
        const firing = sparksFromFirings(held, 1500);
        expect(firing[4]).toBeCloseTo(1.5);
        expect(sparksActive(firing)).toBe(true);
        const released = [{ unit: 2, at: 0, len: 1.5 }];
        expect(sparksActive(sparksFromFirings(released, 1500 + (SPARK_LIFE - 0.05) * 1000))).toBe(true);
        expect(sparksFromFirings(released, 1500 + (SPARK_LIFE + 0.05) * 1000)).toBeNull();
        expect(firingsDone(released, 1500 + (SPARK_LIFE + 0.05) * 1000, SPARK_LIFE)).toBe(true);
        expect(firingsDone(held, 99999, SPARK_LIFE)).toBe(false); // still held
    });

    it('desk patterns: a chase left to right and back; outside-in in pairs; a burst of all six', () => {
        expect(sparkPattern('chase').map((f) => f.unit)).toEqual([0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0]);
        expect(sparkPattern('outside-in').filter((f) => f.delay === 0).map((f) => f.unit)).toEqual([0, 5]);
        expect(sparkPattern('burst')).toHaveLength(SPARK_UNITS);
    });
});
