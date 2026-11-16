// The festival ground: four stages round a plaza, one for each kind of user, and the camera's flight between
// them. Pure (the test page and the tests use it); the homepage does not use it yet.
//
//   Fan        the desert live stage      (west, facing the plaza)
//   Artist     the mainstage              (north)
//   Organizer  the warehouse              (east)
//   Crew       the live stage (today's homepage stage: the truss rig)   (south)
//
// A flight: the camera lifts off from one stage's audience view, arcs over the plaza looking down at the
// grounds, and comes down into the next stage's view. The stage it leaves goes dark as it lifts off and the one
// it lands at lights up as it comes in, so only one stage is ever lit.

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
 * The camera at progress t (0..1) of a flight between two ground shots: { pos, target, leaving, arriving }.
 * It eases along the straight line between them while arcing up (`lift` metres at most, by default a quarter
 * of the distance, between 35 and 90 m); it looks back at the stage it left for the first moments, sweeps its
 * gaze across the grounds, and is on the new stage well before it lands. `leaving` (1 -> 0) and `arriving`
 * (0 -> 1) are the two stages' light levels: the old one is dark before the new one starts to light.
 */
export function flightAt(from, to, t, { lift } = {}) {
    const k = smoother(t);
    const distance = Math.hypot(to.pos[0] - from.pos[0], to.pos[2] - from.pos[2]);
    const height = lift ?? Math.min(90, Math.max(35, distance * 0.25));
    const pos = mix(from.pos, to.pos, k);
    pos[1] += Math.sin(Math.PI * k) * height;
    // the gaze leads the body: it has left the old stage by a third of the way and is on the new one by 80%
    const target = mix(from.target, to.target, smoother((t - 0.12) / 0.68));
    return { pos, target, leaving: 1 - smoother(t / 0.22), arriving: smoother((t - 0.72) / 0.28) };
}
