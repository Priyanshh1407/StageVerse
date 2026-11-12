// Shared pieces for the stage blockout pages (/lab/mainstage, /lab/desert, /lab/warehouse): the
// fixture types with their colours, and small helpers the three layouts use. Looking from the
// audience: x is left/right, y is up, z is towards the audience. All sizes are metres.

// Every kind of fixture or effect a layout can place. `beam` is how its light is previewed:
// [length, end radius] of a cone, or null for none.
export const TYPES = {
    beam: { label: 'Beam (moving head)', color: '#ffb000', size: [0.6, 0.9, 0.6], beam: [46, 1.1] },
    spot: { label: 'Spot (moving head)', color: '#ffffff', size: [0.6, 0.9, 0.6], beam: [34, 2.2] },
    wash: { label: 'Wash (moving head)', color: '#a855f7', size: [0.7, 0.7, 0.7], beam: [20, 4.5] },
    strobe: { label: 'Strobe panel', color: '#fff3a0', size: [1.2, 0.45, 0.25], beam: null },
    blinder: { label: 'Blinder', color: '#ff9d3c', size: [0.9, 0.5, 0.3], beam: null },
    ledbar: { label: 'LED pixel bar', color: '#19d9ff', size: [0.18, 1.6, 0.18], beam: null },
    laser: { label: 'Laser', color: '#ff3d7a', size: [0.5, 0.35, 0.6], beam: [70, 0.12] },
    co2: { label: 'CO2 jet', color: '#bfe9ff', size: [0.35, 0.6, 0.35], beam: null },
    confetti: { label: 'Confetti cannon', color: '#7dff8a', size: [0.6, 0.8, 0.6], beam: null },
    streamer: { label: 'Streamer launcher', color: '#3bffd5', size: [0.5, 0.5, 0.5], beam: null },
    pyro: { label: 'Stage pyro (comets, mines, candles)', color: '#ff4a2a', size: [0.4, 0.4, 0.4], beam: null },
    shell: { label: 'Firework shell mortar', color: '#c0392b', size: [0.6, 1.0, 0.6], beam: null },
    haze: { label: 'Haze machine', color: '#8d96a8', size: [0.8, 0.5, 0.6], beam: null },
};

// The groups the legend shows, in order
export const GROUPS = [
    { label: 'Lights', types: ['beam', 'spot', 'wash', 'strobe', 'blinder', 'ledbar', 'laser'] },
    { label: 'Effects', types: ['co2', 'confetti', 'streamer', 'pyro', 'shell', 'haze'] },
];

export const COLORS = { deck: '#2f333d', structure: '#b9bdc8', dark: '#16181f', truss: '#7b8194', screen: '#3a5f8f', logo: '#ff6a00', person: '#ffffff', ground: '#15171d', scenery: '#2a3140', booth: '#6c7180' };

/** n evenly spaced numbers from a to b (inclusive). */
export const spread = (a, b, n) => Array.from({ length: n }, (_, i) => (n === 1 ? (a + b) / 2 : a + ((b - a) * i) / (n - 1)));

/** Points along the line from p to q: n of them, kept `inset` (0-0.5) away from both ends. */
export const along = (p, q, n, inset = 0.08) => spread(inset, 1 - inset, n).map((t) => p.map((v, i) => v + (q[i] - v) * t));

const norm = ([x, y, z]) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
/** An aim direction, normalised. */
export const aim = (x, y, z) => norm([x, y, z]);

/** A fixture: its type, where it is, where it points, and (optionally) how far its beam reaches in metres. */
export const fx = (type, pos, dir, reach) => ({ type, pos, ...(dir ? { aim: dir } : {}), ...(reach ? { reach } : {}) });
/** The same fixture turned: `rot` is [x, y, z] in radians (a strobe stood on end, a pixel bar along an edge). */
export const turned = (fixture, rot) => ({ ...fixture, rot });
export const box = (size, position, color = COLORS.structure, extra = {}) => ({ kind: 'box', size, position, color, ...extra });
export const truss = (from, to, size = 0.5) => ({ kind: 'truss', from, to, size });
/** A solid tapered rod between two points (a palm frond): radius at `from`, then at `to`. */
export const rod = (from, to, radius = [0.25, 0.05], color = COLORS.scenery) => ({ kind: 'rod', from, to, radius, color });
/** A steel cable between two points. */
export const cable = (from, to) => ({ kind: 'cable', from, to });
/** A flat panel from an [x, y] outline at depth z, `depth` thick; y is measured from `base`. */
export const panel = (outline, z, color = COLORS.structure, depth = 0.5, base = 0) => ({ kind: 'panel', outline, z, color, depth, base });
