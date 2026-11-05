// Fireworks (item 16): aerial shells bursting in the sky behind the stage, and pyro on the stage
// itself. Pure helpers shared by the lighting desk, the song programming, the playback of a show
// and the stage component.
//
// A firework is a "launch": { id, type, x, y, z, h, seed, len, variant, unit, colorA, colorB }:
//   type     one of TYPES (a name)
//   x, y, z  where it leaves from (shells: the ground behind the stage; mines: resolved on stage
//            from `unit`, a pyro spot on the stage front)
//   h        shells: the burst height above the launch point
//   seed     0..1, varies every random detail of it
//   len      waterfall: how long it pours (seconds)
//   variant  shaped shells: 0 heart, 1 smiley, 2 "S"; roof comets: 0 V fan, 1 W fan
// On a look, `fireworks` is the list of launches in the air, each with its `age` (seconds since it
// was fired). Every launch knows how long it lasts (fireworkDuration), smoke included.

export const SHELLS = ['peony', 'chrysanthemum', 'willow', 'palm', 'ring', 'crossette', 'glitter', 'shape'];
export const STAGE_PYRO = ['waterfall', 'comets', 'mines', 'candles'];
export const TYPES = [...SHELLS, ...STAGE_PYRO];
export const typeId = (name) => TYPES.indexOf(name);

export const RISE = 1.3;   // seconds a shell climbs before it bursts
export const SMOKE = 2.5;  // seconds its smoke lingers after the stars burn out

// how long each shell's stars burn after the burst
export const BURN = { peony: 2.2, chrysanthemum: 3.0, willow: 5.0, palm: 3.0, ring: 2.4, crossette: 3.0, glitter: 3.6, shape: 2.8 };

// The stage (mirrors components/home/stage: the top truss, its front face; a test keeps it in step)
export const TRUSS_Y = 19.0;
export const TRUSS_Z = -4.0;
export const TRUSS_TOP = TRUSS_Y + 0.225;
// the waterfall pours from just in front of the top truss, so it falls in front of the lights
// hanging under it; eight emitters across the stage, 3.5 m each: a dense curtain
export const WATERFALL_X = [-12.25, -8.75, -5.25, -1.75, 1.75, 5.25, 8.75, 12.25];
export const WATERFALL_Y = TRUSS_Y - 0.3;
export const WATERFALL_Z = TRUSS_Z + 0.6;
// roof comets: two fan cakes on top of the truss; roman candles: six along its top
export const COMETS_X = [-6, 6];
export const CANDLES_X = [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5];
export const MINES = 6; // the pyro spots on the stage front

/** Seconds a launch lasts, from firing to its last smoke. */
export function fireworkDuration(f) {
    if (SHELLS.includes(f.type)) return RISE + BURN[f.type] + SMOKE;
    if (f.type === 'waterfall') return (f.len ?? 5) + 2.6;
    if (f.type === 'comets') return 8 * 0.14 + 2.4;
    if (f.type === 'mines') return 2.2;
    if (f.type === 'candles') return CANDLES_X.length * 0.15 + 3 * 0.55 + 1.8;
    return 0;
}

/** A small seeded random number generator (mulberry32): the same seed gives the same show. */
export function rng(seed) {
    let a = Math.floor(seed * 4294967296) >>> 0 || 1;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Classic firework colours: gold, silver, red, green, blue, purple, orange, pink
export const CLASSIC = ['#ffc23a', '#e9eef7', '#ff2b2b', '#2bff6a', '#2f6bff', '#b04bff', '#ff8a1f', '#ff4fb8'];

/**
 * A shell's two colours. `scheme`: 'classic' (firework colours), 'show' (the show's two colours) or
 * 'mixed' (either, at random). Willows are always gold, glitter silver, shaped shells their own.
 */
export function shellColours(type, random, { scheme = 'mixed', show = ['#19d9ff', '#ff3df2'], variant = 0 } = {}) {
    if (type === 'willow') return ['#ffb43a', '#ffd27a'];
    if (type === 'glitter') return ['#f4f7ff', '#ffe9a8'];
    if (type === 'shape') return [['#ff2b55', '#ff7aa8'], ['#ffd400', '#ffe97a'], ['#ff3df2', '#19d9ff']][variant] ?? ['#ffffff', '#ffffff'];
    const classic = () => CLASSIC[Math.floor(random() * CLASSIC.length)];
    const useShow = scheme === 'show' || (scheme === 'mixed' && random() < 0.5);
    if (useShow) return random() < 0.5 ? [show[0], show[1]] : [show[1], show[0]];
    return [classic(), classic()];
}

let nextId = 1;

/**
 * An aerial shell, launched from the ground behind the LED wall (z -32 to -42) and bursting 40-50 m
 * up, ~30 m across: high enough that, seen from the audience, it opens clearly above the top truss
 * (lower bursts, being further away than the truss, sat behind it on screen), and inside the sky shot.
 */
export function makeShell(type, random, opts = {}) {
    const variant = type === 'shape' ? Math.floor(random() * 3) : 0;
    const [colorA, colorB] = shellColours(type, random, { ...opts, variant });
    const shape = type === 'shape';
    return {
        id: nextId++, type, variant,
        x: (random() * 2 - 1) * (shape ? 10 : 16),
        y: 0,
        z: shape ? -34 : -32 - random() * 10,
        h: shape ? 45 : 40 + random() * 10,
        seed: random(), len: 0, colorA, colorB,
    };
}

/** Pyro on the stage: the launches one desk press (or one song cue) fires. */
export function makeStagePyro(type, random, { len = 5, variant, ...opts } = {}) {
    const [colorA, colorB] = shellColours('peony', random, opts);
    const base = { type, y: 0, z: 0, h: 0, len, colorA, colorB };
    if (type === 'waterfall') return WATERFALL_X.map((x) => ({ ...base, id: nextId++, x, y: WATERFALL_Y, z: WATERFALL_Z, seed: random(), colorA: '#ffd27a', colorB: '#fff3d6' }));
    if (type === 'comets') {
        const v = variant ?? Math.floor(random() * 2);
        return COMETS_X.map((x) => ({ ...base, id: nextId++, x, y: TRUSS_TOP, z: TRUSS_Z, variant: v, seed: random() }));
    }
    if (type === 'mines') return Array.from({ length: MINES }, (_, unit) => ({ ...base, id: nextId++, unit, x: 0, seed: random() }));
    if (type === 'candles') return [{ ...base, id: nextId++, x: 0, y: TRUSS_TOP, z: TRUSS_Z, seed: random() }];
    return [];
}

/** One desk press: the launches it fires (a shell, or a piece of stage pyro). */
export function fireOne(type, random, opts) {
    return SHELLS.includes(type) ? [makeShell(type, random, opts)] : makeStagePyro(type, random, opts);
}

/**
 * The FINALE: [{ delay (s), launch }], about 8 s: roman candles and roof comets open it, the waterfall
 * pours, shells climb faster and faster, mines at the front, then a closing volley of willows,
 * chrysanthemums and glitter with a last round of mines.
 */
export function finale(random, opts) {
    const out = [];
    const at = (delay, launches) => launches.forEach((launch) => out.push({ delay, launch }));
    at(0, makeStagePyro('candles', random, opts));
    at(0.4, makeStagePyro('comets', random, { ...opts, variant: 0 }));
    at(0.8, makeStagePyro('waterfall', random, { ...opts, len: 7 }));
    const build = ['peony', 'chrysanthemum', 'palm', 'ring', 'crossette', 'glitter', 'peony', 'chrysanthemum', 'shape', 'palm', 'ring', 'crossette', 'peony', 'glitter', 'chrysanthemum', 'palm'];
    let t = 0.6;
    build.forEach((type, i) => {
        at(t, [makeShell(type, random, opts)]);
        t += Math.max(0.18, 0.62 - i * 0.03); // faster and faster
    });
    at(3.2, makeStagePyro('comets', random, { ...opts, variant: 1 }));
    at(5.6, makeStagePyro('mines', random, opts));
    ['willow', 'willow', 'chrysanthemum', 'chrysanthemum', 'glitter', 'peony'].forEach((type, i) => at(6.6 + i * 0.05, [makeShell(type, random, opts)]));
    at(6.9, makeStagePyro('mines', random, opts));
    return out.sort((a, b) => a.delay - b.delay);
}

/** A volley for a song's biggest drop: [{ delay, launch }]: mines on the beat, then a few shells. */
export function dropVolley(random, opts) {
    const out = makeStagePyro('mines', random, opts).map((launch) => ({ delay: 0, launch }));
    ['peony', 'chrysanthemum', 'palm', 'ring', 'glitter'].forEach((type, i) => out.push({ delay: 0.15 + i * 0.22, launch: makeShell(type, random, opts) }));
    return out;
}

/** The launches still in the air at time `now` (same units as `at`, seconds), each with its age. */
export function activeFireworks(list, now) {
    const out = [];
    for (const f of list) {
        const age = now - f.at;
        if (age >= 0 && age < fireworkDuration(f)) out.push({ ...f, age });
    }
    return out;
}
