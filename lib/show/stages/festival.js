// The festival ground: four stages round a plaza, one for each kind of user, and the camera's way between
// them. Pure (the test page and the tests use it); the homepage does not use it yet.
//
//   Fan        the desert live stage      (west, facing the plaza)
//   Artist     the mainstage              (north)
//   Organizer  the warehouse              (east)
//   Crew       the live stage (today's homepage stage: the truss rig)   (south)
//
// Travelling (walkAt): the camera backs away from the stage it is at, turns to face the next one, and moves
// forward to it, at eye level. The stage it leaves goes dark as it backs away and the one it reaches lights up
// as it arrives, so only one stage is ever lit.

import { COLORS, aim, box, fx, spread, truss } from './blockoutKit.js';

/** A rough stand-in for today's homepage stage: deck, LED wall, four truss rows, side towers. */
function roughLiveStage() {
    const structure = [
        box([40, 1.8, 16], [0, 0.9, -8], COLORS.deck),
        box([26, 11, 0.5], [0, 1.8 + 5.5, -14], COLORS.screen, { ledWall: 'main' }),
    ];
    for (const s of [-1, 1]) {
        structure.push(box([8, 9, 0.5], [s * 17.5, 1.8 + 5, -13], COLORS.screen));
        for (const x of [19.5, 21, 22.5]) structure.push(truss([s * x, 0, -2], [s * x, 19, -2]));
    }
    for (const [y, z] of [[13, -12], [15, -8.5], [17, -5], [19, -1.5]]) structure.push(truss([-22.5, y, z], [22.5, y, z]));
    const heads = [];
    for (const [y, z] of [[13, -12], [17, -5], [19, -1.5]]) for (const x of spread(-18, 18, 6)) heads.push(fx('beam', [x, y - 0.6, z], aim(x * 0.02, -0.55, 1)));
    for (const x of spread(-16, 16, 6)) heads.push(fx('beam', [x, 2.3, -2], aim(x * 0.012, 0.8, 1)));
    return {
        key: 'live', title: 'Live stage', indoor: false, structure, heads, pixelBars: [],
        screens: structure.filter((p) => p.color === COLORS.screen),
        shots: { wide: { pos: [0, 3.6, 30], target: [0, 9, -8] } },
    };
}

export const LIVE_STAGE = roughLiveStage();

/** The four stops, in tour order: who it is for, which stage, where it stands and which way it faces (turn about y). */
export const FESTIVAL = [
    { key: 'fan', persona: 'Fan', stage: 'desert', title: 'Desert live stage', colors: ['#19d9ff', '#ff3df2'], position: [-240, 0, 0], turn: Math.PI / 2, genres: ['pop', 'bollywood'] },
    { key: 'artist', persona: 'Artist', stage: 'mainstage', title: 'Mainstage', colors: ['#ff0055', '#ffd400'], position: [0, 0, -240], turn: 0, genres: ['edm'] },
    { key: 'organizer', persona: 'Organizer', stage: 'warehouse', title: 'Warehouse', colors: ['#a855f7', '#ffffff'], position: [240, 0, 0], turn: -Math.PI / 2, genres: ['rap'] },
    { key: 'crew', persona: 'Crew', stage: 'live', title: 'Live stage', colors: ['#39ff14', '#19d9ff'], position: [0, 0, 190], turn: Math.PI, genres: [] },
];

/** A point in a stage's own space, placed on the ground (turned about y, then moved). */
export function toGround(stop, [x, y, z]) {
    const c = Math.cos(stop.turn);
    const s = Math.sin(stop.turn);
    return [stop.position[0] + x * c + z * s, stop.position[1] + y, stop.position[2] - x * s + z * c];
}

/** A stage's shot ({ pos, target } in its own space) on the ground. */
export const groundShot = (stop, shot) => ({ pos: toGround(stop, shot.pos), target: toGround(stop, shot.target) });

const smoother = (t) => { const k = Math.min(1, Math.max(0, t)); return k * k * k * (k * (k * 6 - 15) + 10); };
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

/**
 * The camera at progress t (0..1) of the walk between two ground shots: { pos, target, leaving, arriving, step }.
 * Three moves, at eye level, like someone walking the grounds:
 *   1 back     (to 28%)  it backs straight away from the stage it is at (`back` metres), still looking at it
 *   2 turn     (to 50%)  standing there, it turns the short way round to face the next stage
 *   3 forward  (to 100%) it moves forward to the next stage's view, looking at that stage all the way
 * `leaving` (1 -> 0) and `arriving` (0 -> 1) are the two stages' light levels: the old stage goes dark while the
 * camera backs away, and the new one lights up over the last stretch, so the two are never lit together.
 */
export function walkAt(from, to, t, { back = 45 } = {}) {
    const BACK = 0.28;
    const TURN = 0.5;
    // straight back from the old stage, along the ground
    const away = [from.pos[0] - from.target[0], 0, from.pos[2] - from.target[2]];
    const len = Math.hypot(away[0], away[2]) || 1;
    const stand = [from.pos[0] + (away[0] / len) * back, from.pos[1], from.pos[2] + (away[2] / len) * back];
    const leaving = 1 - smoother((t - 0.08) / 0.2);
    const arriving = smoother((t - 0.8) / 0.2);
    if (t <= BACK) return { pos: mix(from.pos, stand, smoother(t / BACK)), target: [...from.target], leaving, arriving, step: 'back' };
    if (t <= TURN) {
        // turn on the spot: the direction of the gaze swings the short way from the old stage to the new one
        const k = smoother((t - BACK) / (TURN - BACK));
        const yawOf = (q) => Math.atan2(q[0] - stand[0], q[2] - stand[2]);
        const a = yawOf(from.target);
        let d = yawOf(to.target) - a;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        const reach = Math.hypot(from.target[0] - stand[0], from.target[2] - stand[2]) * (1 - k) + Math.hypot(to.target[0] - stand[0], to.target[2] - stand[2]) * k;
        const yaw = a + d * k;
        return { pos: stand, target: [stand[0] + Math.sin(yaw) * reach, from.target[1] + (to.target[1] - from.target[1]) * k, stand[2] + Math.cos(yaw) * reach], leaving, arriving, step: 'turn' };
    }
    return { pos: mix(stand, to.pos, smoother((t - TURN) / (1 - TURN))), target: [...to.target], leaving, arriving, step: 'forward' };
}
