// Confetti and streamer cannons (item 15). Paper hangs in the air: confetti flutters down for many
// seconds, streamers float down slowly too. For now they fire from the lighting desk.
//
// - Confetti: CONFETTI_UNITS CO2-powered cannons on the ground in front of the stage (two in the
//   middle sub gaps, one under each line array), blasting out over the whole
//   audience. While a cannon fires it streams confetti continuously, its CO2 blasting the whole time
//   like a CO2 jet: a tap gives an instant burst (the first CONFETTI_BLAST_SHARE of its load within
//   CONFETTI_TAP s); holding keeps it pouring until the load runs out after CONFETTI_STREAM s.
// - Streamers: STREAMER_UNITS launchers on top of the aerial truss; a launcher's load is split into
//   shots: a tap fires one, holding fires the next every STREAMER_SHOT_GAP s, up to the last.
//
// A cannon's state is { age, len } like the other effects (see effects.js); on a look, `confetti`
// and `streamers` are flat arrays [age0, len0, age1, len1, ...] (left to right).
import { firingsState, stateActive } from './effects.js';

export const CONFETTI_UNITS = 4;          // in front of the stage: under the line arrays and in the middle sub gaps
export const CONFETTI_LIFE = 18;          // seconds the last pieces can take to come down
export const CONFETTI_TAP = 0.4;          // a tap: the instant burst
export const CONFETTI_BLAST_SHARE = 0.3;  // of the load, in the instant burst
export const CONFETTI_STREAM = 7;         // seconds a held cannon keeps pouring before its load runs out

export const STREAMER_UNITS = 3;          // on top of the aerial truss: left, centre, right
export const STREAMER_LIFE = 45;          // the slowest ribbon from the top of the truss: all the way down, lying a moment, fading
                                          // (each ribbon works out its own lifetime from its height and sinking speed)
export const STREAMER_SHOTS = 3;
export const STREAMER_SHOT_GAP = 1.5;
const STREAMER_TAP = 0.4;

export const confettiActive = (state) => stateActive(state, CONFETTI_UNITS, CONFETTI_LIFE);
export const streamersActive = (state) => stateActive(state, STREAMER_UNITS, STREAMER_LIFE);
export const confettiFromFirings = (fired, now) => firingsState(fired, now, CONFETTI_UNITS, CONFETTI_LIFE);
export const streamersFromFirings = (fired, now) => firingsState(fired, now, STREAMER_UNITS, STREAMER_LIFE);

/**
 * When a piece leaves the cannon, in seconds after it starts firing, from its place in the load
 * (0..1): the first CONFETTI_BLAST_SHARE in the instant burst, the rest streaming evenly after it.
 * A piece only flies if the cannon was still firing at that moment.
 */
export function confettiLaunchAt(u) {
    if (u < CONFETTI_BLAST_SHARE) return (u / CONFETTI_BLAST_SHARE) * CONFETTI_TAP;
    return CONFETTI_TAP + ((u - CONFETTI_BLAST_SHARE) / (1 - CONFETTI_BLAST_SHARE)) * (CONFETTI_STREAM - CONFETTI_TAP);
}

/** A desk pattern over `count` cannons: 'sweep' one after another, left to right; else all at once. */
function sweepOrAll(name, count, len, step) {
    return Array.from({ length: count }, (_, unit) => ({ unit, delay: name === 'sweep' ? unit * step : 0, len }));
}

/** The desk's confetti patterns: [{ unit, delay (ms), len (s) }]: 'sweep' or 'burst' (all at once). */
export const confettiPattern = (name) => sweepOrAll(name, CONFETTI_UNITS, CONFETTI_TAP, 300);

/** The desk's streamer patterns: [{ unit, delay (ms), len (s) }]: 'sweep' or 'burst' (all at once). */
export const streamerPattern = (name) => sweepOrAll(name, STREAMER_UNITS, STREAMER_TAP, 400);

/** How many shots a launcher has fired by the time it has been firing for `len` seconds. */
export const shotsFired = (len, shots, gap) => Math.min(shots, Math.floor(len / gap) + 1);
