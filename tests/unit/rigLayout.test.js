import { describe, it, expect } from 'vitest';
import { rigLayout, GROUPS } from '@/components/home/stage/rigLayout';

describe('rigLayout', () => {
    it.each([5, 28, 56, 72, 140])('places exactly %i fixtures, every group represented', (count) => {
        const fixtures = rigLayout(count);
        expect(fixtures).toHaveLength(count);
        expect(new Set(fixtures.map((f) => f.group))).toEqual(new Set(GROUPS.map((g) => g.name)));
    });

    it('side towers are mirrored left/right and fire outward', () => {
        const towers = rigLayout(56).filter((f) => f.group === 'sideTowers');
        for (const f of towers) expect(Math.sign(f.position[0])).toBe(Math.sign(f.pan));
        expect(towers.some((f) => f.position[0] < 0) && towers.some((f) => f.position[0] > 0)).toBe(true);
    });

    it('floor fixtures aim up and truss fixtures aim down', () => {
        const fixtures = rigLayout(56);
        for (const f of fixtures.filter((x) => x.group === 'floor')) expect(f.tilt).toBeGreaterThan(Math.PI / 2);
        for (const f of fixtures.filter((x) => x.group === 'midRows' || x.group === 'frontTruss')) expect(f.tilt).toBeLessThan(Math.PI / 2);
    });

    it('alternates the two show colours', () => {
        const mixes = rigLayout(20).map((f) => f.colorMix);
        expect(mixes).toContain(0);
        expect(mixes).toContain(1);
    });
});
