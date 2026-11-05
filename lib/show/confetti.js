// Confetti and streamer cannons (item 15): a cannon at each wing of the stage front (two kinds side
// by side) blasting confetti or long paper streamers up and out over the audience. Paper hangs in
// the air: confetti flutters down over several seconds, streamers float down slower still. For now
// they fire from the lighting desk.
//
// A cannon's state is { age, len } like the other effects (see effects.js); on a look, `confetti` and
// `streamers` are flat arrays [age0, len0, age1, len1] (left, right). A cannon holds a load split into
// a few shots: a tap fires the first shot; holding the button fires the next one every SHOT_GAP
// seconds, up to the last.
import { firingsState, stateActive } from './effects.js';

export const CANNON_UNITS = 2;           // left wing, right wing

export const CONFETTI_LIFE = 16;         // seconds the last pieces can take to reach the floor (it climbs ~15 m)
export const CONFETTI_SHOTS = 4;
export const CONFETTI_SHOT_GAP = 1.2;    // seconds between shots while the button is held

export const STREAMER_LIFE = 13;
export const STREAMER_SHOTS = 3;
export const STREAMER_SHOT_GAP = 1.5;

const SHOT = 0.4; // a tap: long enough for the first shot

export const confettiActive = (state) => stateActive(state, CANNON_UNITS, CONFETTI_LIFE);
export const streamersActive = (state) => stateActive(state, CANNON_UNITS, STREAMER_LIFE);
export const confettiFromFirings = (fired, now) => firingsState(fired, now, CANNON_UNITS, CONFETTI_LIFE);
export const streamersFromFirings = (fired, now) => firingsState(fired, now, CANNON_UNITS, STREAMER_LIFE);

/**
 * The desk's cannon patterns: [{ unit, delay (ms), len (s) }].
 *   sides  the left cannon, then the right
 *   anything else ('burst'): both at once
 */
export function cannonPattern(name) {
    if (name === 'sides') return [{ unit: 0, delay: 0, len: SHOT }, { unit: 1, delay: 450, len: SHOT }];
    return [{ unit: 0, delay: 0, len: SHOT }, { unit: 1, delay: 0, len: SHOT }];
}

/**
 * A cannon's state (firing for `len` s, a shot every `gap` s, up to `shots`) as CO2 blasts: for each
 * cannon its latest shot, `blast` seconds long. Confetti cannons are CO2-powered: every shot leaves
 * the barrel in a white blast. Returns a state array like the CO2 jets', or null.
 */
export function blastsFromShots(state, count, { count: shots, gap, blast }) {
    if (!state) return null;
    const out = new Array(count * 2);
    for (let j = 0; j < count; j++) {
        const age = state[j * 2];
        const len = state[j * 2 + 1];
        const k = Math.min(shots - 1, Math.floor(Math.max(0, Math.min(age, len)) / gap));
        out[j * 2] = age < 0 ? -1 : age - k * gap;
        out[j * 2 + 1] = blast;
    }
    return out;
}

/** How many shots a cannon has fired by the time it has been firing for `len` seconds. */
export const shotsFired = (len, shots, gap) => Math.min(shots, Math.floor(len / gap) + 1);
