// The homepage's walk through the festival grounds. The gate, the doors and the rig coming up stay on this
// stage (the homepage's own); from the personas on, each one is met at its own stage:
//
//   Crew       this stage (inside the gate)
//   Organizer  the warehouse        outside the gate, to the left of the avenue
//   Fan        the desert stage     further up on the left
//   Artist     the mainstage        across the far end of the avenue, facing back down it toward the gate
//
// then back in through the gate to this stage for the drop and the encore. Between two stops the camera walks
// (lib/show/stages/festival.js walkAt): it backs away from the stage it is at, turns to face the next one and
// moves forward to it, at eye level, over 8 seconds; the stage it leaves goes dark first, then the next one
// lights up. The dot (or the playground's arrows) says which stage to go to; the camera walks straight there,
// from wherever it is, in one walk. Pure: the director and the tests use it.

import { SHOTS } from '@/lib/show/shots';
import { STAGES, fitShot } from '@/lib/show/stages';
import { groundShot, walkAt } from '@/lib/show/stages/festival';
import { stageCamera } from '@/lib/show/stages/camera';
import { ROLES } from './scrollShow';

/** Where the other stages stand on the homepage's grounds (this stage at the origin, facing the gate at z 34). */
export const SITE = {
    organizer: { stage: 'warehouse', position: [-150, 0, 140], turn: Math.PI / 2 },
    fan: { stage: 'desert', position: [-170, 0, 330], turn: 1.77 },
    artist: { stage: 'mainstage', position: [0, 0, 370], turn: Math.PI },
};
export const SITE_KEYS = Object.keys(SITE);
const ROLE_STOP = { Crew: 'home', Organizer: 'organizer', Fan: 'fan', Artist: 'artist' };
// the riser: by then the camera is back at this stage, for the drop and the encore
const BACK_HOME_AT = 0.785;
const BACK = 45; // metres the camera steps back from a stage before it turns

/**
 * This stage's shot as the scroll frames it from the rig to the encore (components/home/show/ShowStage.jsx):
 * 5 m further back along its view, looking 1.8 m higher.
 */
export function homeShot(name) {
    const shot = SHOTS[name] ?? SHOTS.wide;
    const look = [shot.target[0], shot.target[1] + 1.8, shot.target[2]];
    const d = shot.pos.map((v, i) => v - look[i]);
    const len = Math.hypot(...d) || 1;
    return { pos: shot.pos.map((v, i) => v + (d[i] / len) * 5), target: look };
}

/** Where the camera stands at one of the other stages: its wide view (fitted to the whole stage where it has a frame). */
export function siteShot(key, aspect = 1.78) {
    const place = SITE[key];
    const stage = STAGES[place.stage];
    const wide = stage.shots.wide;
    return groundShot(place, stage.frame ? fitShot(wide, stage.frame, aspect, 55) : wide);
}

const shotAt = (stop, aspect) => (stop.key === 'home' ? homeShot(stop.shot) : siteShot(stop.key, aspect));
const levels = (lit) => ({ home: 0, ...Object.fromEntries(SITE_KEYS.map((k) => [k, 0])), ...lit });
export const HOME_ONLY = levels({ home: 1 });

/** The scroll's stretches: staying at a stage, or walking from one to the next ({ from, to, a, b }). */
function stretches() {
    const stops = [...ROLES].sort((x, y) => x.at - y.at).map((r) => ({ key: ROLE_STOP[r.key] ?? 'home', at: r.at, end: r.at + r.hold, shot: r.shot }));
    const out = [];
    stops.forEach((stop, i) => {
        const next = stops[i + 1] ?? { key: 'home', at: BACK_HOME_AT, shot: 'dolly' };
        if (next.key !== stop.key) out.push({ from: stop.end, to: next.at, a: stop, b: next });
    });
    return out;
}
const STRETCHES = stretches();

/**
 * Which stop of the chain the scroll asks for at progress p: 0 = this stage (Crew), 1..3 = the other stages,
 * 4 = this stage again (the drop and the encore). Once the scroll passes the start of a walk, it asks for that
 * walk's destination.
 */
export function wantedStop(p) {
    return STRETCHES.filter((s) => p >= s.from).length;
}
export const CHAIN = ['home', ...STRETCHES.map((s) => s.b.key)];
const chainShot = (index, aspect, home = null) => {
    if (home && CHAIN[index] === 'home') return home;
    if (index === 0) return homeShot(STRETCHES[0].a.shot);
    const s = STRETCHES[index - 1];
    return shotAt(s.b, aspect);
};

export const WALK_SECONDS = 8;
// (kept for the tests and the guide: walks are direct now, so the camera never passes through a stage)
export const PAUSE_SECONDS = 0;
// turned round mid-walk, the camera steps back only this far before it turns (it is already out on the grounds)
const TURN_BACK = 6;

/**
 * One frame of the camera's walk (`state` is kept between frames: { at, leg }): the scroll says which stop it
 * wants (wantedStop), and the camera walks there one stage at a time, each walk taking WALK_SECONDS whatever the
 * scroll does (a fast scroll never sends it zapping through the grounds; scrolling back up walks back the same
 * way). A walk under way is finished before the next begins. Returns where the camera is, as tourAt does.
 */
export function stepTour(state, p, delta, aspect = 1.78, { wanted: asked = null, home = null } = {}) {
    // (`asked`: a stop chosen in the playground instead of by the scroll; `home`: this stage's shot there)
    const wanted = asked ?? wantedStop(p);
    if (state.at === undefined) state.at = wanted; // the page opened part-way down: start where the scroll is
    const same = (a, b) => a === b || (CHAIN[a] === 'home' && CHAIN[b] === 'home'); // the live stage is at both ends
    // where a walk is now (its start: a stop, or the spot it was turned from when the visitor changed their mind)
    const poseOf = (leg) => walkAt(leg.fromShot ?? chainShot(leg.from, aspect, home), chainShot(leg.to, aspect, home), leg.t, { back: leg.back ?? BACK });
    if (state.leg) {
        // asked for somewhere else mid-walk: turn from where the camera is, now, and walk straight there
        if (!same(state.leg.to, wanted)) {
            const old = state.leg;
            const now = poseOf(old);
            const lit = now.arriving > now.leaving ? old.to : old.fromKeyIndex ?? old.from;
            state.leg = { fromShot: { pos: now.pos, target: now.target }, fromKeyIndex: lit, to: wanted, t: 0, back: TURN_BACK };
        } else {
            state.leg.t = Math.min(1, state.leg.t + delta / WALK_SECONDS);
            if (state.leg.t >= 1) { state.at = state.leg.to; state.leg = null; }
        }
    }
    // already there (the live stage counts at either end of the chain)
    if (!state.leg && same(state.at, wanted)) state.at = wanted;
    // straight to the stage asked for, from wherever the camera is: one walk, never through the stages between
    if (!state.leg && state.at !== wanted) state.leg = { from: state.at, to: wanted, t: 0 };
    if (state.leg) {
        const leg = state.leg;
        const now = poseOf(leg);
        const a = CHAIN[leg.fromKeyIndex ?? leg.from];
        const b = CHAIN[leg.to];
        return { where: 'walk', pos: now.pos, target: now.target, step: now.step, levels: levels({ [a]: now.leaving, [b]: now.arriving }) };
    }
    const key = CHAIN[state.at];
    if (key === 'home') return { where: 'home', levels: HOME_ONLY };
    const shot = chainShot(state.at, aspect, home);
    return { where: key, pos: shot.pos, target: shot.target, levels: levels({ [key]: 1 }) };
}

/**
 * Where the tour is at scroll progress p when the camera keeps up with the scroll (every walk already done):
 * at this stage ({ where: 'home' }), at one of the others ({ where: key, pos, target }), or at a walk's start or
 * end. Used by the tests; the homepage uses stepTour.
 */
export function tourAt(p, aspect = 1.78) {
    return stepTour({ at: wantedStop(p) }, p, 0, aspect);
}

/** Each persona's own look and screen at its stage (the role's held look from the scroll's cue sheet). */
export function personaAt(key) {
    const role = ROLES.find((r) => ROLE_STOP[r.key] === key);
    return role ?? null;
}

// ---- the playground: choosing a stage ----

/** The stages the playground can play on, in the order the arrows go round them. */
export const PLAY_STAGES = [
    { key: 'home', title: 'Live stage', genres: [] },
    { key: 'organizer', title: 'Warehouse', genres: ['rap'] },
    { key: 'fan', title: 'Desert live stage', genres: ['pop', 'bollywood'] },
    { key: 'artist', title: 'Mainstage', genres: ['edm'] },
];

/**
 * The next stop for a playground arrow (dir -1 or +1), from where the camera stands (`state.at`), or null while
 * it is walking. This stage is at both ends of the chain, so from it the arrows go either way round.
 */
export function playStep(state, dir) {
    if (state.leg || state.at === undefined) return null;
    if (CHAIN[state.at] === 'home') state.at = dir > 0 ? 0 : CHAIN.length - 1;
    return state.at + dir;
}

/**
 * The camera at one of the other stages during a song there: exactly as on its test page (lib/show/stages/camera.js:
 * its song shots, the warehouse's circling camera, the sky shot while fireworks are up), placed on the grounds.
 * Returns { pos, target, ease }.
 */
export function siteSongShot(key, { look, shot, t = 0, duration = 0, aspect = 1.78 }) {
    const place = SITE[key];
    const cam = stageCamera(STAGES[place.stage], { look, shot, t, duration, aspect });
    return { ...groundShot(place, cam), ease: cam.ease };
}

export const TOUR_STRETCHES = STRETCHES;
