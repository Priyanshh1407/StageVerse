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
// moves forward to it, at eye level; the stage it leaves goes dark first, then the next one lights up. All of it
// follows the scroll position. Pure: the director and the tests use it.

import { SHOTS } from '@/lib/show/shots';
import { STAGES, fitShot } from '@/lib/show/stages';
import { groundShot, walkAt } from '@/lib/show/stages/festival';
import { ROLES } from './scrollShow';

/** Where the other stages stand on the homepage's grounds (this stage at the origin, facing the gate at z 34). */
export const SITE = {
    organizer: { stage: 'warehouse', position: [-150, 0, 140], turn: Math.PI / 2 },
    fan: { stage: 'desert', position: [-170, 0, 330], turn: 1.77 },
    artist: { stage: 'mainstage', position: [0, 0, 560], turn: Math.PI },
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
 * Where the tour is at scroll progress p: at this stage ({ where: 'home' }, the director's own shots), at one of
 * the others ({ where: key, pos, target }) or walking ({ where: 'walk', pos, target, step }), with every stage's
 * light level (`levels`: home and each SITE key, 0..1).
 */
export function tourAt(p, aspect = 1.78) {
    for (const s of STRETCHES) {
        if (p >= s.from && p < s.to) {
            const now = walkAt(shotAt(s.a, aspect), shotAt(s.b, aspect), (p - s.from) / (s.to - s.from), { back: BACK });
            return { where: 'walk', pos: now.pos, target: now.target, step: now.step, levels: levels({ [s.a.key]: now.leaving, [s.b.key]: now.arriving }) };
        }
    }
    // staying at one of the other stages: from the end of the walk there to the start of the walk away
    for (let i = 0; i < STRETCHES.length - 1; i++) {
        const arrive = STRETCHES[i];
        const leave = STRETCHES[i + 1];
        if (arrive.b.key !== 'home' && p >= arrive.to && p < leave.from) {
            const shot = shotAt(arrive.b, aspect);
            return { where: arrive.b.key, pos: shot.pos, target: shot.target, levels: levels({ [arrive.b.key]: 1 }) };
        }
    }
    return { where: 'home', levels: HOME_ONLY };
}

export const TOUR_STRETCHES = STRETCHES;
