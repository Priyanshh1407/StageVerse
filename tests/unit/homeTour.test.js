import { describe, expect, it } from 'vitest';
import { HOME_ONLY, SITE, TOUR_STRETCHES, homeShot, tourAt } from '@/components/home/show/tour';
import { ROLES, STOPS } from '@/components/home/show/scrollShow';

// a point in a site stage's own frame (x across it, z toward its audience)
const local = (s, [x, , z]) => {
    const dx = x - s.position[0];
    const dz = z - s.position[2];
    const c = Math.cos(s.turn);
    const n = Math.sin(s.turn);
    return [dx * c - dz * n, dx * n + dz * c];
};
// each stage's footprint in its own frame: half width, back, front
const FOOT = { desert: [48, -30, 6], mainstage: [52, -32, 4], warehouse: [19.2, -12.2, 46] };

describe('the homepage tour of the festival grounds', () => {
    it('meets the personas in the order Crew, Organizer, Fan, Artist', () => {
        expect([...ROLES].sort((a, b) => a.at - b.at).map((r) => r.key)).toEqual(['Crew', 'Organizer', 'Fan', 'Artist']);
        expect(STOPS.map((s) => s.label)).toEqual(['The gate', 'House lights', 'The rig comes up', 'Crew', 'Organizer', 'Fan', 'Artist', 'Encore', 'Your turn']);
    });

    it('stays on this stage for the gate, the rig, Crew, the drop, the encore and the playground', () => {
        for (const p of [0, 0.1, 0.16, 0.3, 0.375, 0.47, 0.8, 0.86, 0.96]) expect(tourAt(p).where, `at ${p}`).toBe('home');
        expect(tourAt(0.47).levels).toEqual(HOME_ONLY);
    });

    it('walks out to the warehouse, the desert stage, the mainstage, then back in', () => {
        expect(TOUR_STRETCHES.map((s) => `${s.a.key}>${s.b.key}`)).toEqual(['home>organizer', 'organizer>fan', 'fan>artist', 'artist>home']);
        const by = Object.fromEntries(ROLES.map((r) => [r.key, r]));
        expect(tourAt(by.Organizer.at + 0.01).where).toBe('organizer');
        expect(tourAt(by.Fan.at + 0.01).where).toBe('fan');
        expect(tourAt(by.Artist.at + 0.01).where).toBe('artist');
        // at a persona's stage, only that stage is lit
        const at = tourAt(by.Fan.at + 0.01).levels;
        expect(at.fan).toBe(1);
        expect(at.home + at.organizer + at.artist).toBe(0);
    });

    it('starts and ends every walk exactly where the camera stands, so nothing jumps', () => {
        for (const s of TOUR_STRETCHES) {
            const start = tourAt(s.from);
            const end = tourAt(s.to - 1e-7);
            if (s.a.key === 'home') start.pos.forEach((v, i) => expect(v).toBeCloseTo(homeShot(s.a.shot).pos[i], 4));
            if (s.b.key === 'home') end.pos.forEach((v, i) => expect(v).toBeCloseTo(homeShot(s.b.shot).pos[i], 2));
        }
    });

    it('walks through the gate\'s opening, round the stages and never jumps', () => {
        let prev = null;
        for (let p = 0.44; p <= 0.8; p += 0.00005) {
            const t = tourAt(p);
            if (t.where === 'home') { prev = null; continue; }
            const pos = t.pos;
            if (prev) expect(Math.hypot(...pos.map((v, i) => v - prev[i])), `step at ${p}`).toBeLessThan(5); // a jump would be tens of metres
            prev = pos;
            // the gate: a wall along z 34 from |x| 4.75 to 48; the arch is open below 10 m
            if (Math.abs(pos[2] - 34) < 0.8) {
                expect(Math.abs(pos[0]) < 4.2 || Math.abs(pos[0]) > 48.5, `gate wall at ${p}`).toBe(true);
                expect(pos[1], `arch top at ${p}`).toBeLessThan(9.5);
            }
            // never through this stage, the others, or the warehouse's walls
            expect(Math.abs(pos[0]) < 25 && pos[2] > -16 && pos[2] < 3, `this stage at ${p}`).toBe(false);
            for (const [key, s] of Object.entries(SITE)) {
                const [lx, lz] = local(s, pos);
                const [hw, z0, z1] = FOOT[s.stage];
                const inside = Math.abs(lx) < hw && lz > z0 && lz < z1;
                if (s.stage === 'warehouse') expect(inside && Math.abs(lx) > 18.6 && lz < 45, `warehouse wall at ${p}`).toBe(false);
                else expect(inside, `${key} at ${p}`).toBe(false);
            }
            // only ever one stage lit
            const lit = Object.values(t.levels).filter((v) => v > 0.001);
            expect(lit.length, `lit at ${p}`).toBeLessThanOrEqual(1);
        }
    });
});
