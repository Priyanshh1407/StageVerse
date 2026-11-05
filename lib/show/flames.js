// Flame units (item 15): fire columns shooting up from units on the stage's front lip for as long
// as they're fired, gone a moment after they stop. Their glow lights the stage, floor and haze in
// warm orange through the flash system (no real lights). For now they fire from the lighting desk;
// song programming comes later.
//
// A unit's state is { age, len } like the CO2 jets (see effects.js); on a look, `flames` is the flat
// array [age0, len0, ...] for the units left to right.
import { firingsState, patternFirings, stateActive, unitsFor } from './effects.js';

export const FLAME_UNITS = 6;
export const FLAME_FADE = 0.4;    // seconds for a column to burn out after the unit stops
export const FLAME_BURST = 0.8;   // a normal burst, in seconds

/** Which units (0 = far left ... 5 = far right) a pattern name fires. */
export const unitsForFlames = (spec) => unitsFor(spec, FLAME_UNITS);

/** Whether any flame is still burning. */
export const flamesActive = (state) => stateActive(state, FLAME_UNITS, FLAME_FADE);

/** Desk firings ({ unit, at, len }) into the units' state, or null when none is burning. */
export const flamesFromFirings = (fired, now) => firingsState(fired, now, FLAME_UNITS, FLAME_FADE);

/**
 * The desk's flame patterns: [{ unit, delay (ms), len (s) }]. Flames are short, sharp bursts.
 *   chase       left to right and back
 *   outside-in  outer pair, middle pair, inner pair
 *   anything else: every unit at once
 */
export const flamePattern = (name) => patternFirings(name, FLAME_UNITS, { step: 120, short: 0.3, pairStep: 220, pairLen: 0.45, blast: FLAME_BURST });

/**
 * How much warm light the fire is throwing right now, 0..1: each burning unit adds its share, with a
 * quick flare as it ignites, falling away as it burns out.
 */
export function flameGlow(state) {
    if (!state) return 0;
    let sum = 0;
    for (let j = 0; j < FLAME_UNITS; j++) {
        const age = state[j * 2];
        const len = state[j * 2 + 1];
        if (age < 0 || age >= len + FLAME_FADE) continue;
        const ignite = Math.min(1, age / 0.08);
        const flare = 1 + 0.4 * Math.exp(-age * 8); // the whoosh as it lights
        const out = age > len ? 1 - (age - len) / FLAME_FADE : 1;
        sum += ignite * flare * out;
    }
    // two or three units already light the stage well; all six a little more
    return Math.min(1, sum / 3);
}
