// A "look" is everything the rig shows at one moment. The scroll show, the song show and the
// lighting desk all produce looks; the 3D rig eases toward whichever one is in charge.
// No imports, so the Node scripts, the tests and the browser all share this file.

export const DEFAULT_LOOK = {
    master: 1,          // 0 = blackout
    intensity: 0.9,     // beam brightness
    beams: 1,           // aerial beams (top truss fan, mid trusses)
    sides: 1,           // side towers
    floor: 1,           // floor up-lights
    wash: 0.8,          // stage washes (front truss)
    washColor: '#3b5bff',
    sweep: 0.45,        // how far beams swing (0 = hold the position)
    speed: 1.2,         // how fast they move
    fan: 1,             // position: how wide each row fans out (0.5 tight, 1.3 wide)
    tiltShift: 0,       // position: lift (+) or drop (-) every beam, radians
    phaseSpread: 0.25,  // movement: 0 = every head in unison, 1 = a wave across the row
    converge: 0,        // 1 = every beam aims at one point (the drop)
    haze: 0.5,          // smoke grain inside the beams
    colorA: '#19d9ff',
    colorB: '#ff3df2',
    laser: 0,           // laser level
    laserColor: '#39ff14',
    blinder: 0,         // audience blinders (warm white)
    strobe: 0,          // strobes (0..1)
    dropFx: 0,          // the drop: beams focus on the stage centre, floor fixtures swing sideways
    laserChase: 0,      // lasers switch on and off in sequence across the fan
    laserAmount: 1,     // share of each laser fan that's lit (0.1 = the centre one or two)
    laserSpread: 1,     // how wide the laser fans open (1.8 in peaks)
    sidesAim: 0,        // side towers: 0 = crossing the stage (left beams go right), 1 = further across, -1 = out to the audience
    focusFloor: 0,      // where converging beams meet: 0 = mid-air over the stage, 1 = the stage floor's centre
    alternate: 0,       // odd and even beams swap on the beat
    sparkle: 0,         // random beams flick on and off every half beat
    energyFollow: 0,    // brightness follows the song's loudness (song shows)
    house: 0,           // venue house lights (warm)
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
