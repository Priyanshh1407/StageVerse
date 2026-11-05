// CO2 jets (item 15): nozzles along the stage front that blast white plumes up for a second or so,
// which then billow out and fade. Pure helpers shared by the song programming, the playback of a
// show, the lighting desk and the stage component.
//
// A jet's state is { age, len }: seconds since it started firing, and how long it fires (the valve
// stays open), after which the plume takes CO2_FADE seconds to dissipate. On a look, `co2` is a flat
// array [age0, len0, age1, len1, ...] for the jets left to right; age < 0 means idle.

export const CO2_JETS = 6;
export const CO2_FADE = 1.6;   // seconds for a plume to dissipate after the valve closes
export const CO2_BLAST = 1.2;  // a normal blast, in seconds

/** Which jets (0 = far left ... 5 = far right) a pattern name fires. */
export function jetsFor(spec) {
    const all = Array.from({ length: CO2_JETS }, (_, i) => i);
    if (Array.isArray(spec)) return spec.filter((i) => i >= 0 && i < CO2_JETS);
    if (typeof spec === 'number') return spec >= 0 && spec < CO2_JETS ? [spec] : [];
    const last = CO2_JETS - 1;
    switch (spec) {
        case 'outer': return [0, last];
        case 'middle': return [1, last - 1];
        case 'inner': return [2, last - 2];
        case 'odd': return all.filter((i) => i % 2 === 0);  // 1st, 3rd, 5th from the left
        case 'even': return all.filter((i) => i % 2 === 1);
        default: return all;
    }
}

/** An idle state for every jet. */
export function idleCo2() {
    const s = new Array(CO2_JETS * 2).fill(0);
    for (let j = 0; j < CO2_JETS; j++) s[j * 2] = -1;
    return s;
}

/** Whether any jet in a state array is still visible (firing or dissipating). */
export function co2Active(state) {
    if (!state) return false;
    for (let j = 0; j < CO2_JETS; j++) {
        const age = state[j * 2];
        if (age >= 0 && age < state[j * 2 + 1] + CO2_FADE) return true;
    }
    return false;
}

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
 * Desk firings: `fired` is a list of { jet, at, len } (at in ms from performance.now(); len in
 * seconds, or null while the button is held). Returns the state array, or null when all are idle.
 */
export function co2FromFirings(fired, now) {
    let state = null;
    for (const f of fired) {
        const age = (now - f.at) / 1000;
        if (age < 0) continue;
        const len = f.len ?? age; // still held: firing for as long as it's been open
        if (age >= len + CO2_FADE) continue;
        state ??= idleCo2();
        // the newest firing of a jet wins
        if (state[f.jet * 2] < 0 || age < state[f.jet * 2]) {
            state[f.jet * 2] = age;
            state[f.jet * 2 + 1] = len;
        }
    }
    return state;
}

/**
 * The desk's CO2 patterns as firings relative to now: [{ jet, delay (ms), len (s) }].
 *   chase       left to right and back, one jet after another
 *   outside-in  the outer pair, then the middle pair, then the inner pair
 */
export function co2Pattern(name) {
    if (name === 'chase') {
        const order = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0];
        return order.map((jet, k) => ({ jet, delay: k * 140, len: 0.35 }));
    }
    if (name === 'outside-in') {
        return ['outer', 'middle', 'inner'].flatMap((spec, k) => jetsFor(spec).map((jet) => ({ jet, delay: k * 260, len: 0.6 })));
    }
    return jetsFor('all').map((jet) => ({ jet, delay: 0, len: CO2_BLAST }));
}
