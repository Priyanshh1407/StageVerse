import { describe, expect, it } from 'vitest';
import { CHAIN, HOME_ONLY, PAUSE_SECONDS, SITE, TOUR_STRETCHES, WALK_SECONDS, homeShot, stepTour, tourAt, wantedStop } from '@/components/home/show/tour';
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

    // play the camera's walk: the scroll jumps to `p`, then `seconds` pass at 60 frames a second
    const play = (state, p, seconds, each = () => {}) => {
        let out;
        for (let f = 0; f < seconds * 60; f++) { out = stepTour(state, p, 1 / 60); each(out); }
        return out;
    };

    it('takes 8 seconds for each walk, whatever the scroll does', () => {
        expect(WALK_SECONDS).toBe(8);
        const by = Object.fromEntries(ROLES.map((r) => [r.key, r]));
        const state = { at: 0 };
        play(state, by.Organizer.at + 0.01, 7.5);
        expect(state.leg?.to).toBe(1); // still walking after 7.5 s
        play(state, by.Organizer.at + 0.01, 0.6);
        expect(state.at).toBe(1);
        expect(state.leg).toBeNull();
        expect(stepTour(state, by.Organizer.at + 0.01, 1 / 60).where).toBe('organizer');
    });

    it('walks one stage at a time, never zapping through, and back up the same way', () => {
        const state = { at: 0 };
        const visited = [];
        const note = (t) => { if (t.where !== 'walk' && visited.at(-1) !== t.where) visited.push(t.where); };
        // a fast scroll from Crew to the encore: every stage in turn, 8 s each
        play(state, 0.875, 4 * WALK_SECONDS + 3 * PAUSE_SECONDS + 1, note);
        expect(visited).toEqual(['organizer', 'fan', 'artist', 'home']);
        expect(state.at).toBe(4);
        // scrolling back up from the encore to the Artist: a slow walk to the mainstage, not on to Crew
        const by = Object.fromEntries(ROLES.map((r) => [r.key, r]));
        expect(wantedStop(by.Artist.at + 0.01)).toBe(3);
        const before = visited.length;
        play(state, by.Artist.at + 0.01, 3);
        expect(state.leg).toMatchObject({ from: 4, to: 3 });
        play(state, by.Artist.at + 0.01, WALK_SECONDS + PAUSE_SECONDS);
        expect(state.at).toBe(3);
        expect(stepTour(state, by.Artist.at + 0.01, 1 / 60).where).toBe('artist');
        expect(visited.length).toBe(before);
    });

    it('starts and ends every walk exactly where the camera stands, so nothing jumps', () => {
        for (let from = 0; from < 4; from++) {
            for (const [a, b] of [[from, from + 1], [from + 1, from]]) {
                const state = { at: a, leg: { from: a, to: b, t: 0 } };
                const start = stepTour(state, 0.47, 0);
                const end = stepTour({ at: a, leg: { from: a, to: b, t: 0.999999 } }, 0.47, 0);
                if (CHAIN[a] === 'home' && a === 0) start.pos.forEach((v, i) => expect(v).toBeCloseTo(homeShot(TOUR_STRETCHES[0].a.shot).pos[i], 3));
                if (CHAIN[b] === 'home' && b === 4) end.pos.forEach((v, i) => expect(v).toBeCloseTo(homeShot(TOUR_STRETCHES[3].b.shot).pos[i], 2));
            }
        }
    });

    it('walks through the gate opening, round the stages, one stage lit at a time', () => {
        // every walk, both ways
        for (let a = 0; a < 4; a++) {
            for (const [from, to] of [[a, a + 1], [a + 1, a]]) {
                let prev = null;
                for (let t = 0; t <= 1; t += 0.0025) {
                    const w = stepTour({ at: from, leg: { from, to, t } }, 0.47, 0);
                    const pos = w.pos;
                    // (no jumps: each step is 1/400 of a walk)
                    if (prev) expect(Math.hypot(...pos.map((v, i) => v - prev[i])), `${from}>${to} at ${t}`).toBeLessThan(10);
                    prev = pos;
                    if (Math.abs(pos[2] - 34) < 0.8) {
                        expect(Math.abs(pos[0]) < 4.2 || Math.abs(pos[0]) > 48.5, `gate wall ${from}>${to} at ${t}`).toBe(true);
                        expect(pos[1], `arch top ${from}>${to} at ${t}`).toBeLessThan(9.5);
                    }
                    expect(Math.abs(pos[0]) < 25 && pos[2] > -16 && pos[2] < 3, `this stage ${from}>${to} at ${t}`).toBe(false);
                    for (const [key, s] of Object.entries(SITE)) {
                        const [lx, lz] = local(s, pos);
                        const [hw, z0, z1] = FOOT[s.stage];
                        const inside = Math.abs(lx) < hw && lz > z0 && lz < z1;
                        if (s.stage === 'warehouse') expect(inside && Math.abs(lx) > 18.6 && lz < 45, `warehouse wall ${from}>${to} at ${t}`).toBe(false);
                        else expect(inside, `${key} ${from}>${to} at ${t}`).toBe(false);
                    }
                    expect(Object.values(w.levels).filter((v) => v > 0.001).length, `lit ${from}>${to} at ${t}`).toBeLessThanOrEqual(1);
                }
            }
        }
    });
});
