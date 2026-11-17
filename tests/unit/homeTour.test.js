import { describe, expect, it } from 'vitest';
import { CHAIN, HOME_ONLY, PAUSE_SECONDS, PLAY_STAGES, SITE, TOUR_STRETCHES, WALK_SECONDS, homeShot, playStep, siteSongShot, stepTour, tourAt, wantedStop } from '@/components/home/show/tour';
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

    it('walks straight to the stage asked for, from anywhere, in one walk', () => {
        const by = Object.fromEntries(ROLES.map((r) => [r.key, r]));
        // from the encore (the live stage) to the Organizer: one walk to the warehouse, nothing between
        const state = { at: 4 };
        const visited = [];
        const note = (t) => { if (t.where !== 'walk' && visited.at(-1) !== t.where) visited.push(t.where); };
        play(state, by.Organizer.at + 0.01, 1, note);
        expect(state.leg).toMatchObject({ from: 4, to: 1 });
        play(state, by.Organizer.at + 0.01, WALK_SECONDS + 1, note);
        expect(visited).toEqual(['organizer']);
        // from the warehouse to the Artist: straight to the mainstage
        play(state, by.Artist.at + 0.01, WALK_SECONDS + PAUSE_SECONDS + 1, note);
        expect(visited).toEqual(['organizer', 'artist']);
        // from the mainstage back to Crew: straight to the live stage
        play(state, by.Crew.at + 0.01, WALK_SECONDS + PAUSE_SECONDS + 1, note);
        expect(visited).toEqual(['organizer', 'artist', 'home']);
        // from Crew to the encore: both on the live stage, no walk at all
        const still = { at: 0 };
        expect(stepTour(still, 0.875, 1 / 60).where).toBe('home');
        expect(still.leg).toBeFalsy();
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
        // every walk, both ways, and the straight walks back to the live stage from each of the others
        // every walk from any stop to any other (the camera goes straight there)
        const walks = [];
        for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) if (a !== b && !(CHAIN[a] === 'home' && CHAIN[b] === 'home')) walks.push([a, b]);
        {
            for (const [from, to] of walks) {
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

    it('lets the playground walk round the stages with the arrows, either way, one at a time', () => {
        expect(PLAY_STAGES.map((st) => st.key)).toEqual(['home', 'organizer', 'fan', 'artist']);
        expect(PLAY_STAGES.find((st) => st.key === 'artist').genres).toEqual(['edm']);
        const state = { at: 4 }; // this stage, after the encore
        expect(CHAIN[playStep(state, 1)]).toBe('organizer'); // right from this stage: the warehouse
        const left = { at: 4 };
        expect(CHAIN[playStep(left, -1)]).toBe('artist'); // left: the mainstage
        // walking there takes a walk's time, and the arrows wait for it
        const walk = { at: 4 };
        const to = playStep(walk, -1);
        stepTour(walk, 0.96, 1 / 60, 1.78, { wanted: to, home: homeShot('finale') });
        expect(playStep(walk, 1)).toBeNull();
        for (let f = 0; f < WALK_SECONDS * 60 + 5; f++) stepTour(walk, 0.96, 1 / 60, 1.78, { wanted: to, home: homeShot('finale') });
        expect(CHAIN[walk.at]).toBe('artist');
    });

    it('films a song at another stage with the shots of that stage', () => {
        // the mainstage's shots move round its framing: each one somewhere else
        const moves = ['wide', 'dolly', 'left', 'right', 'high', 'drop'].map((n) => siteSongShot('artist', n, 10, 200).pos.map((v) => v.toFixed(0)).join());
        expect(new Set(moves).size).toBe(6);
        // fireworks: the sky shot looks up
        for (const key of ['artist', 'fan']) {
            const sky = siteSongShot(key, 'sky', 10, 200);
            expect(sky.target[1] - sky.pos[1], key).toBeGreaterThan(10);
        }
        const mainstage = siteSongShot('artist', 'wide', 10, 200);
        expect(mainstage.pos[2]).toBeGreaterThan(200); // out on the grounds, in front of the mainstage
        const warehouse = [0, 30, 60].map((t) => siteSongShot('organizer', 'wide', t, 240).pos);
        expect(new Set(warehouse.map((q) => q.map((v) => v.toFixed(1)).join())).size).toBe(3); // its camera circles
    });

    it('turns straight to a new stage when asked mid-walk, without finishing the old walk first', () => {
        const by = Object.fromEntries(ROLES.map((r) => [r.key, r]));
        const state = { at: 0 };
        play(state, by.Fan.at + 0.01, 3); // walking to the desert stage
        expect(state.leg).toMatchObject({ to: 2 });
        const before = stepTour(state, by.Fan.at + 0.01, 0).pos;
        const turned = stepTour(state, by.Artist.at + 0.01, 1 / 60); // asked for the Artist: the mainstage
        expect(state.leg.to).toBe(3);
        expect(Math.hypot(...turned.pos.map((v, i) => v - before[i]))).toBeLessThan(1); // from where it was, no jump
        const visited = [];
        play(state, by.Artist.at + 0.01, WALK_SECONDS + 1, (t) => { if (t.where !== 'walk' && visited.at(-1) !== t.where) visited.push(t.where); });
        expect(visited).toEqual(['artist']); // never reached the desert stage
    });

    it('keeps clear of the gate and the stages when it turns mid-walk, wherever it turns', () => {
        const stops = [0, 1, 2, 3, 4];
        const clear = (pos, label) => {
            if (Math.abs(pos[2] - 34) < 0.8) expect(Math.abs(pos[0]) < 4.2 || Math.abs(pos[0]) > 48.5, `gate wall ${label}`).toBe(true);
            expect(Math.abs(pos[0]) < 25 && pos[2] > -16 && pos[2] < 3, `this stage ${label}`).toBe(false);
            for (const [key, st] of Object.entries(SITE)) {
                const [lx, lz] = local(st, pos);
                const [hw, z0, z1] = FOOT[st.stage];
                const inside = Math.abs(lx) < hw && lz > z0 && lz < z1;
                if (st.stage === 'warehouse') expect(inside && Math.abs(lx) > 18.6 && lz < 45, `warehouse wall ${label}`).toBe(false);
                else expect(inside, `${key} ${label}`).toBe(false);
            }
        };
        const pAt = (i) => (CHAIN[i] === 'home' ? (i === 0 ? 0.47 : 0.875) : ROLES.find((r) => ({ organizer: 'Organizer', fan: 'Fan', artist: 'Artist' })[CHAIN[i]] === r.key).at + 0.01);
        for (const a of stops) for (const b of stops) for (const c of stops) {
            if (a === b || CHAIN[a] === CHAIN[b] || CHAIN[b] === CHAIN[c]) continue;
            for (const turnAt of [0.2, 0.5, 0.8]) {
                const state = { at: a };
                for (let f = 0; f < WALK_SECONDS * 60 * turnAt; f++) stepTour(state, pAt(b), 1 / 60);
                for (let f = 0; f < WALK_SECONDS * 60 + 5; f += 2) {
                    const w = stepTour(state, pAt(c), 2 / 60);
                    if (w.pos) clear(w.pos, `${a}>${b} turned at ${turnAt} to ${c}`); // (at the live stage the director films it)
                }
            }
        }
    });
});
