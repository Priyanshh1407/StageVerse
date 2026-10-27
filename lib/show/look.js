// A "look" is everything the rig shows at one moment. The scroll show, the song show and the
// lighting desk all produce looks; the 3D rig eases toward whichever one is in charge.
// No imports, so the Node scripts, the tests and the browser all share this file.

export const DEFAULT_LOOK = {
    master: 1,          // 0 = blackout
    intensity: 0.9,     // beam brightness
    beams: 1,           // beam level (desk "beams" on/off)
    sweep: 0.45,        // how far beams swing
    speed: 1.2,         // how fast they move
    converge: 0,        // 1 = every beam aims at one point (the drop)
    haze: 0.5,          // smoke grain inside the beams
    colorA: '#19d9ff',
    colorB: '#ff3df2',
    laser: 0,           // laser level
    laserColor: '#39ff14',
    blinder: 0,         // audience blinders (warm white)
    strobe: 0,          // 0..1 strobe mix
    stars: 0.2,         // sparkle density on the LED screens
    pulse: 0,           // beat pulse, set per frame by the song show
    pulseAmount: 0.4,   // how hard each beat hits in this cue
};

const NUMERIC = Object.keys(DEFAULT_LOOK).filter((k) => typeof DEFAULT_LOOK[k] === 'number');
const COLORS = Object.keys(DEFAULT_LOOK).filter((k) => typeof DEFAULT_LOOK[k] === 'string');

const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smoothstep = (x) => {
    const t = clamp01(x);
    return t * t * (3 - 2 * t);
};

function parseHex(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Blend two '#rrggbb' colours. */
export function mixHex(a, b, t) {
    if (a === b || t <= 0) return a;
    if (t >= 1) return b;
    const ca = parseHex(a);
    const cb = parseHex(b);
    const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
    return `#${((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1)}`;
}

/** Blend two complete looks; t = 0 gives a, t = 1 gives b. */
export function mixLooks(a, b, t) {
    const out = { ...b };
    for (const k of NUMERIC) out[k] = a[k] + (b[k] - a[k]) * t;
    for (const k of COLORS) out[k] = mixHex(a[k], b[k], t);
    return out;
}
