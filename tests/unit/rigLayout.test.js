import { describe, it, expect } from 'vitest';
import { rigLayout, strobeLayout, GROUPS } from '@/components/home/stage/rigLayout';
import { ROWS } from '@/components/home/stage/trussGeometry';

describe('rigLayout', () => {
    it.each([6, 28, 52, 72, 140])('places exactly %i fixtures, every group represented', (count) => {
        const fixtures = rigLayout(count);
        expect(fixtures).toHaveLength(count);
        expect(new Set(fixtures.map((f) => f.group))).toEqual(new Set(GROUPS.map((g) => g.name)));
    });

    it('every fixture has one job: aerial, sides, floor or wash', () => {
        const roles = new Set(rigLayout(52).map((f) => f.role));
        expect(roles).toEqual(new Set(['aerial', 'sides', 'floor', 'wash']));
    });

    it('side towers are mirrored left/right and fire inward across the stage', () => {
        const towers = rigLayout(52).filter((f) => f.group === 'sideTowers');
        for (const f of towers) {
            expect(Math.sign(f.pan)).toBe(-Math.sign(f.position[0]));
            // clamped sideways: base against the tower, head pointing in toward the stage
            expect(f.mount).toBe('side');
            expect(Math.sign(f.up[0])).toBe(-Math.sign(f.position[0]));
            expect(Math.abs(f.position[0])).toBeCloseTo(15.6 - 0.255);
        }
        expect(towers.some((f) => f.position[0] < 0) && towers.some((f) => f.position[0] > 0)).toBe(true);
    });

    it('floor fixtures stand and aim up; aerials hang upside down facing the audience; washes hang onto the stage', () => {
        const fixtures = rigLayout(52);
        for (const f of fixtures.filter((x) => x.group === 'floor')) {
            expect(f.tilt).toBeGreaterThan(Math.PI / 2);
            expect(f.mount).toBe('standing');
            expect(f.up).toEqual([0, 1, 0]);
        }
        for (const f of fixtures.filter((x) => x.role === 'aerial')) {
            expect(f.mount).toBe('hanging');
            expect(f.up).toEqual([0, -1, 0]);
            expect(Math.cos(f.pan)).toBeGreaterThan(0);       // toward the audience
            expect(f.tilt).toBeGreaterThan(Math.PI / 2 - 0.1); // out, not down onto the stage
        }
        for (const f of fixtures.filter((x) => x.role === 'wash')) {
            expect(f.tilt).toBeLessThan(0.5);
            expect(Math.cos(f.pan)).toBeLessThan(0); // facing back toward the stage
            expect(f.mount).toBe('hanging');
            expect(f.up).toEqual([0, -1, 0]);
        }
    });

    it('nothing hangs in front of the LED wall: every row-mounted fixture is above its top edge', () => {
        const wallTop = 11.2; // LedWall.jsx: main wall centre 6.3, height 9.8
        for (const f of rigLayout(72).filter((x) => x.group !== 'floor' && x.group !== 'sideTowers')) {
            // hanging heads extend ~1.3 m below their mount
            const lowest = f.mount === 'hanging' ? f.position[1] - 1.3 : f.position[1];
            expect(lowest).toBeGreaterThan(wallTop);
        }
    });

    it('movement phase is each head\'s place along its row (0..1), so waves travel along the row', () => {
        const top = rigLayout(52).filter((f) => f.group === 'topFan');
        expect(top[0].phase).toBe(0);
        expect(top.at(-1).phase).toBe(1);
        for (let i = 1; i < top.length; i++) expect(top[i].phase).toBeGreaterThan(top[i - 1].phase);
    });

    it('alternates the two colours', () => {
        const mixes = rigLayout(20).map((f) => f.colorMix);
        expect(mixes).toContain(0);
        expect(mixes).toContain(1);
    });
});

describe('strobeLayout', () => {
    it('puts strobes in the gaps between moving heads on the top and mid trusses', () => {
        const strobes = strobeLayout(52);
        const top = rigLayout(52).filter((f) => f.group === 'topFan').map((f) => f.position[0]).sort((a, b) => a - b);
        const onTop = strobes.filter((s) => s[1] === ROWS[0].y).map((s) => s[0]);
        expect(onTop).toHaveLength(top.length - 1);
        onTop.forEach((x, i) => {
            expect(x).toBeGreaterThan(top[i]);
            expect(x).toBeLessThan(top[i + 1]);
        });
        expect(strobes.some((s) => s[1] === ROWS[3].y)).toBe(true);
        expect(strobes.some((s) => s[1] < 1.5)).toBe(true); // a row standing on the deck
    });
});
