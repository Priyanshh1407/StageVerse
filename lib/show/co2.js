// CO2 jets (item 15): nozzles along the stage front that blast white plumes up for a second or so,
// which then billow out and fade. Pure helpers shared by the song programming, the playback of a
// show, the lighting desk and the stage component.
//
// A jet's state is { age, len }: seconds since it started firing, and how long it fires (the valve
// stays open), after which the plume takes CO2_FADE seconds to dissipate. On a look, `co2` is a flat
// array [age0, len0, age1, len1, ...] for the jets left to right; age < 0 means idle.
import { firingsState, idleState, patternFirings, stateActive, unitsFor } from './effects.js';

export const CO2_JETS = 6;
export const CO2_FADE = 1.6;   // seconds for a plume to dissipate after the valve closes
export const CO2_BLAST = 1.2;  // a normal blast, in seconds

/** Which jets (0 = far left ... 5 = far right) a pattern name fires. */
export const jetsFor = (spec) => unitsFor(spec, CO2_JETS);

/** An idle state for every jet. */
export const idleCo2 = () => idleState(CO2_JETS);

/** Whether any jet in a state array is still visible (firing or dissipating). */
export const co2Active = (state) => stateActive(state, CO2_JETS, CO2_FADE);

/**
 * The jets' state at song time `t` from a show's CO2 hits ({ t, kind: 'co2', dur, jets }): for each
 * jet the most recent hit that fired it and is still visible. `hits` sorted by time.
 */
export function co2At(hits, t) {
    let state = null;
    const done = new Array(CO2_JETS).fill(false);
    for (let h = hits.length - 1; h >= 0; h--) {
        const hit = hits[h];
        if (hit.kind !== 'co2' || hit.t > t) continue;
        const age = t - hit.t;
        for (const j of jetsFor(hit.jets)) {
            if (done[j]) continue;
            done[j] = true; // a newer blast on a jet replaces an older one
            if (age < hit.dur + CO2_FADE) {
                state ??= idleCo2();
                state[j * 2] = age;
                state[j * 2 + 1] = hit.dur;
            }
        }
        if (done.every(Boolean)) break;
    }
    return state;
}

/**
 * Desk firings: `fired` is a list of { unit, at, len } (at in ms from performance.now(); len in
 * seconds, or null while the button is held). Returns the state array, or null when all are idle.
 */
export const co2FromFirings = (fired, now) => firingsState(fired, now, CO2_JETS, CO2_FADE);

/**
 * The desk's CO2 patterns as firings relative to now: [{ unit, delay (ms), len (s) }].
 *   chase       left to right and back, one jet after another
 *   outside-in  the outer pair, then the middle pair, then the inner pair
 */
export const co2Pattern = (name) => patternFirings(name, CO2_JETS, { blast: CO2_BLAST });

// CO2 jets on the aerial truss (a test): a few nozzles on the front face of the top truss, aimed out
// and down over the audience. Fired from the desk; the same blast, fade and patterns as the floor jets.
export const CO2_TRUSS_JETS = 4;
export const co2TrussActive = (state) => stateActive(state, CO2_TRUSS_JETS, CO2_FADE);
export const co2TrussFromFirings = (fired, now) => firingsState(fired, now, CO2_TRUSS_JETS, CO2_FADE);
export const co2TrussPattern = (name) => patternFirings(name, CO2_TRUSS_JETS, { step: 180, blast: CO2_BLAST });
