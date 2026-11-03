import { describe, it, expect } from 'vitest';
import { rigLayout, strobeLayout, laserLayout, GROUPS, STROBE_DROP } from '@/components/home/stage/rigLayout';
import { ROWS } from '@/components/home/stage/trussGeometry';

describe('rigLayout', () => {
    it('fills the wash rows (trusses 2 and 3) about as fully as the aerial rows', () => {
        const count = (n, group) => rigLayout(n).filter((f) => f.group === group).length;
        for (const n of [64, 96]) {
            for (const wash of ['washFront', 'washMid']) expect(count(n, wash)).toBeGreaterThanOrEqual(count(n, 'lowFan') - 1);
        }
        expect(count(64, 'washFront')).toBeGreaterThanOrEqual(10);
        expect(GROUPS.reduce((sum, g) => sum + g.share, 0)).toBeCloseTo(1);
    });


    it.each([6, 28, 52, 72, 140])('places exactly %i fixtures, every group represented', (count) => {
        const fixtures = rigLayout(count);
        expect(fixtures).toHaveLength(count);
        expect(new Set(fixtures.map((f) => f.group))).toEqual(new Set(GROUPS.map((g) => g.name)));
    });

    it('every fixture has one job: aerial, sides, floor or wash', () => {
        const roles = new Set(rigLayout(52).map((f) => f.role));
        expect(roles).toEqual(new Set(['aerial', 'sides', 'floor', 'wash']));
    });

    it('side towers are mirrored and cross the stage: left beams go right, right beams go left', () => {
        const towers = rigLayout(52).filter((f) => f.group === 'sideTowers');
        for (const f of towers) {
            expect(Math.sign(f.pan)).toBe(-Math.sign(f.position[0]));
            expect(Math.abs(f.pan)).toBeGreaterThan(0.6);   // well across
            expect(Math.abs(f.pan)).toBeLessThan(1.2);      // still forward of sideways
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
            expect(f.tilt).toBeLessThan(Math.PI / 2);           // out over the audience, below the truss
            expect(f.tilt).toBeGreaterThan(1.0);                // not straight down onto the stage
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

    it('side towers alternate colours up each tower, mirrored on both sides', () => {
        const towers = rigLayout(52).filter((f) => f.group === 'sideTowers');
        for (const side of [-1, 1]) {
            const mixes = towers.filter((f) => Math.sign(f.position[0]) === side).sort((a, b) => a.position[1] - b.position[1]).map((f) => f.colorMix);
            expect(new Set(mixes).size).toBe(2);
            for (let k = 1; k < mixes.length; k++) expect(mixes[k]).not.toBe(mixes[k - 1]);
        }
        // the same height has the same colour on the left and the right
        const byHeight = (side) => towers.filter((f) => Math.sign(f.position[0]) === side).sort((a, b) => a.position[1] - b.position[1]).map((f) => f.colorMix);
        expect(byHeight(-1)).toEqual(byHeight(1).slice(0, byHeight(-1).length));
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
        // hanging under the top truss, not on or above it
        const onTop = strobes.filter((s) => s[1] === ROWS[0].y - STROBE_DROP).map((s) => s[0]);
        expect(onTop).toHaveLength(top.length - 1);
        onTop.forEach((x, i) => {
            expect(x).toBeGreaterThan(top[i]);
            expect(x).toBeLessThan(top[i + 1]);
        });
        expect(strobes.some((s) => s[1] === ROWS[3].y - STROBE_DROP)).toBe(true);
        for (const s of strobes) expect(ROWS.every((r) => !(Math.abs(s[2] - r.z) < 0.5 && s[1] > r.y - 0.5))).toBe(true);
        expect(strobes.some((s) => s[1] < 1.5)).toBe(false); // none on the deck: only the trusses
    });
});

describe('laserLayout and tower strobes', () => {
    it('puts 4 lasers on the floor in gaps between the floor moving heads, and 2 on each tower', () => {
        for (const n of [64, 96, 140]) {
            const lasers = laserLayout(n);
            const floor = lasers.filter((l) => !l.tower);
            const towers = lasers.filter((l) => l.tower);
            expect(floor).toHaveLength(4);
            expect(towers).toHaveLength(4);
            const heads = rigLayout(n).filter((f) => f.group === 'floor').map((f) => f.position[0]);
            // never on top of a floor moving head (housing 0.75 m wide, head ~0.6 m)
            // never on top of a floor moving head (housing 0.75 m wide, head ~0.6 m): in a gap, or a little ahead of the row
            for (const l of floor) expect(Math.min(...heads.map((x) => Math.abs(x - l.pos[0]))) > 0.6 || l.pos[2] > 0).toBe(true);
            expect(new Set(floor.map((l) => l.pos[0])).size).toBe(4);
            // the tower lasers hang on the front columns, clear of the side moving heads on the rear ones
            const sideHeads = rigLayout(n).filter((f) => f.group === 'sideTowers');
            for (const l of towers) expect(Math.min(...sideHeads.map((f) => Math.abs(f.position[2] - l.pos[2])))).toBeGreaterThan(5);
            expect(towers.filter((l) => l.pos[0] < 0)).toHaveLength(2);
        }
    });

    it('stands a few strobes vertically on each tower', () => {
        const vertical = strobeLayout(64).filter((s) => s[3]);
        expect(vertical).toHaveLength(6);
        for (const s of vertical) expect(Math.abs(s[0])).toBeGreaterThan(14);
        expect(vertical.filter((s) => s[0] < 0)).toHaveLength(3);
    });
});
