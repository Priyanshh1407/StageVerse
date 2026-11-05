// Shared by the special effects that fire from a row of units (CO2 jets, flame units): each unit
// fires for `len` seconds (the valve open), then takes `fade` seconds to die away. A state is a
// flat array [age0, len0, age1, len1, ...] for the units left to right; age < 0 means idle.

/** An idle state for `count` units. */
export function idleState(count) {
    const s = new Array(count * 2).fill(0);
    for (let j = 0; j < count; j++) s[j * 2] = -1;
    return s;
}

/** Whether any unit in a state is still visible (firing or dying away). */
export function stateActive(state, count, fade) {
    if (!state) return false;
    for (let j = 0; j < count; j++) {
        const age = state[j * 2];
        if (age >= 0 && age < state[j * 2 + 1] + fade) return true;
    }
    return false;
}

/**
 * Desk firings: `fired` is a list of { unit, at, len } (at in ms from performance.now(); len in
 * seconds, or null while the button is held). Returns the state, or null when every unit is idle.
 */
export function firingsState(fired, now, count, fade) {
    let state = null;
    for (const f of fired) {
        const age = (now - f.at) / 1000;
        if (age < 0) continue;
        const len = f.len ?? age; // still held: firing for as long as it's been open
        if (age >= len + fade) continue;
        state ??= idleState(count);
        // the newest firing of a unit wins
        if (state[f.unit * 2] < 0 || age < state[f.unit * 2]) {
            state[f.unit * 2] = age;
            state[f.unit * 2 + 1] = len;
        }
    }
    return state;
}

/** Whether every desk firing has fired and faded (the list can be cleared). */
export function firingsDone(fired, now, fade) {
    return fired.every((f) => f.len !== null && now - f.at > (f.len + fade) * 1000);
}

/** Units for a pattern name, for a row of `count`: all, outer / middle / inner pairs, odd, even. */
export function unitsFor(spec, count) {
    const all = Array.from({ length: count }, (_, i) => i);
    if (Array.isArray(spec)) return spec.filter((i) => i >= 0 && i < count);
    if (typeof spec === 'number') return spec >= 0 && spec < count ? [spec] : [];
    const last = count - 1;
    switch (spec) {
        case 'outer': return [0, last];
        case 'middle': return [1, last - 1];
        case 'inner': return [2, last - 2];
        case 'odd': return all.filter((i) => i % 2 === 0);  // 1st, 3rd, 5th from the left
        case 'even': return all.filter((i) => i % 2 === 1);
        default: return all;
    }
}

/**
 * A desk pattern as firings relative to now: [{ unit, delay (ms), len (s) }].
 *   chase       left to right and back, one unit after another
 *   outside-in  the outer pair, then the middle pair, then the inner pair
 *   anything else: every unit at once for `blast` seconds
 */
export function patternFirings(name, count, { step = 140, short = 0.35, pairStep = 260, pairLen = 0.6, blast = 1.2 } = {}) {
    if (name === 'chase') {
        const order = [...Array.from({ length: count }, (_, i) => i), ...Array.from({ length: count - 1 }, (_, i) => count - 2 - i)];
        return order.map((unit, k) => ({ unit, delay: k * step, len: short }));
    }
    if (name === 'outside-in') {
        return ['outer', 'middle', 'inner'].flatMap((spec, k) => unitsFor(spec, count).map((unit) => ({ unit, delay: k * pairStep, len: pairLen })));
    }
    return unitsFor('all', count).map((unit) => ({ unit, delay: 0, len: blast }));
}
