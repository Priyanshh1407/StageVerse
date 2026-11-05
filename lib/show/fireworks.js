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
//   len      roman candles and roof comets: seconds between one shot and the next (0: the default)
//   variant  roof comets: 0 V fan, 1 W fan
// On a look, `fireworks` is the list of launches in the air, each with its `age` (seconds since it
// was fired). Every launch knows how long it lasts (fireworkDuration), smoke included.

export const SHELLS = ['peony', 'chrysanthemum', 'willow', 'palm', 'ring', 'crossette', 'glitter'];
export const STAGE_PYRO = ['comets', 'mines', 'candles'];
export const TYPES = [...SHELLS, ...STAGE_PYRO];
export const typeId = (name) => TYPES.indexOf(name);

export const RISE = 1.3;   // seconds a shell climbs before it bursts
export const SMOKE = 2.5;  // seconds its smoke lingers after the stars burn out

// how long each shell's stars burn after the burst
export const BURN = { peony: 2.2, chrysanthemum: 3.0, willow: 5.0, palm: 3.0, ring: 2.4, crossette: 3.0, glitter: 3.6 };

// The stage (mirrors components/home/stage: the top truss; a test keeps it in step)
export const TRUSS_Y = 19.0;
export const TRUSS_Z = -4.0;
export const TRUSS_TOP = TRUSS_Y + 0.225;
// roof comets: two fan cakes on top of the truss; roman candles: six along its top
export const COMETS_X = [-6, 6];
export const CANDLES_X = [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5];
export const CANDLE_STEP = 0.15;  // default seconds between one candle and the next
export const COMET_STEP = 0.14;   // default seconds between one comet and the next
export const MINES = 6; // the pyro spots on the stage front

/** Seconds a launch lasts, from firing to its last smoke. */
export function fireworkDuration(f) {
    if (SHELLS.includes(f.type)) return RISE + BURN[f.type] + SMOKE;
    if (f.type === 'comets') return 8 * (f.len || COMET_STEP) + 2.4;
    if (f.type === 'mines') return 2.2;
    if (f.type === 'candles') return CANDLES_X.length * (f.len || CANDLE_STEP) + 3 * 0.55 + 1.8;
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
 * 'mixed' (either, at random). Willows are always gold, glitter silver.
 */
export function shellColours(type, random, { scheme = 'mixed', show = ['#19d9ff', '#ff3df2'] } = {}) {
    if (type === 'willow') return ['#ffb43a', '#ffd27a'];
    if (type === 'glitter') return ['#f4f7ff', '#ffe9a8'];
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
 * `x` places it across the sky (default: anywhere from -16 to 16 m).
 */
export function makeShell(type, random, { x, ...opts } = {}) {
    const [colorA, colorB] = shellColours(type, random, opts);
    return {
        id: nextId++, type, variant: 0,
        x: x ?? (random() * 2 - 1) * 16,
        y: 0,
        z: -32 - random() * 10,
        h: 40 + random() * 10,
        seed: random(), len: 0, colorA, colorB,
    };
}

/** A genre's signature shell: the one kind used outside the finale (EDM palms, pop peonies, rap crossettes, Bollywood chrysanthemums). */
export function signatureShell(genre) {
    return (GENRE_SHELLS[genre] ?? GENRE_SHELLS.edm).drop;
}

/** Pyro on the stage: the launches one desk press (or one cue) fires. `step`: seconds between shots. */
export function makeStagePyro(type, random, { step = 0, variant, ...opts } = {}) {
    const [colorA, colorB] = shellColours('peony', random, opts);
    const base = { type, y: 0, z: 0, h: 0, len: step, colorA, colorB };
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
 * A musical grid for the finale: `bars` holds 9 bar lines (8 bars and the final hit after them, in
 * seconds), each bar four beats. With no song, a 128 BPM grid starting late enough that the first
 * shells (which launch RISE s before their beat) still go up after time 0.
 */
export function defaultGrid(bpm = 128) {
    const beat = 60 / bpm;
    const start = RISE + 0.3;
    return { bars: Array.from({ length: 9 }, (_, i) => start + i * 4 * beat) };
}

// Each genre's shells for the finale (its bars, and its closing volley)
const GENRE_SHELLS = {
    edm: { bars: ['palm', 'crossette', 'glitter', 'chrysanthemum', 'peony', 'ring'], close: ['glitter', 'crossette', 'palm', 'willow', 'chrysanthemum'], comets: 2, drop: 'palm' },
    pop: { bars: ['peony', 'ring', 'chrysanthemum', 'willow', 'peony', 'crossette'], close: ['willow', 'chrysanthemum', 'peony', 'ring'], comets: 1, drop: 'peony' },
    rap: { bars: ['crossette', 'glitter', 'peony', 'palm', 'ring'], close: ['crossette', 'glitter', 'palm', 'peony'], comets: 2, mines: true, drop: 'crossette' },
    bollywood: { bars: ['peony', 'chrysanthemum', 'ring', 'willow', 'palm', 'glitter'], close: ['willow', 'chrysanthemum', 'peony', 'ring', 'glitter'], comets: 1, drop: 'chrysanthemum' },
};

// Bar patterns, quietest to most intense: how a bar's shells are placed on its beats
//   single     one big shell on the downbeat
//   pairs      a matched pair together on beats 1 and 3
//   alternate  left, right, left, right on every beat
//   sweep      one a beat, from one side to the other
//   roll       pairs on every beat, widening
//   rush       one every half-beat, sweeping across (fast songs only)
const PATTERNS = ['single', 'pairs', 'alternate', 'sweep', 'roll', 'rush'];

/**
 * The finale, choreographed on the song: [{ at (s, on the grid's clock), launch }]. Shells launch RISE s
 * early so they burst on their beat; some fire together, some in sequence, building to one closing
 * volley on the final hit (grid.bars[8]). Everything about it comes from the song (`style`):
 *   genre     which shells (EDM palms, crossettes and glitter with comet fans; pop peonies, rings and
 *             chrysanthemums; rap punchy crossettes and glitter with extra mines; Bollywood colourful
 *             peonies, chrysanthemums, rings and willows)
 *   energy    the song's loudness over each of the 8 bars (0..1): quiet bars get a single shell or a
 *             pair, loud ones sweeps, rolls and rushes; mines and comet fans on the loudest bars; how
 *             hard the song ends sizes the closing volley
 *   bpm       fast songs get half-beat rushes and fast candle chases; slow songs fewer, bigger,
 *             longer-hanging shells on whole beats
 * The last two bars always build: the crescendo, then the final hit.
 */
export function finale(random, opts = {}, grid = defaultGrid(), style = {}) {
    const out = [];
    const bars = grid.bars;
    const genre = GENRE_SHELLS[style.genre] ?? GENRE_SHELLS.edm;
    const bpm = style.bpm ?? 128;
    const fast = bpm >= 112;
    // how loud each bar is; with no song, a steady build
    const energy = Array.from({ length: 8 }, (_, i) => Math.min(1, Math.max(0, style.energy?.[i] ?? 0.45 + i * 0.07)));
    const beatAt = (bar, b) => bars[bar] + (b / 4) * (bars[bar + 1] - bars[bar]);
    const beatLen = (bars[1] - bars[0]) / 4;
    let pick = 0;
    const nextType = (list) => list[pick++ % list.length];
    const shell = (t, type, x) => out.push({ at: t - RISE, launch: makeShell(type, random, { ...opts, x }) });
    const pyro = (t, type, extra = {}) => makeStagePyro(type, random, { ...opts, ...extra }).forEach((launch) => out.push({ at: t, launch }));
    let side = random() < 0.5 ? -1 : 1; // which side each sweep starts from (it changes every sweep)

    const play = (bar, pattern) => {
        const type = () => nextType(genre.bars);
        if (pattern === 'single') shell(beatAt(bar, 0), fast ? type() : 'willow', 0);
        else if (pattern === 'pairs') [0, 2].forEach((b) => { const t = type(); shell(beatAt(bar, b), t, -9); shell(beatAt(bar, b), t, 9); });
        else if (pattern === 'alternate') [0, 1, 2, 3].forEach((b) => shell(beatAt(bar, b), type(), (b % 2 ? 1 : -1) * (6 + 4 * (b >> 1))));
        else if (pattern === 'sweep') { [0, 1, 2, 3].forEach((b) => shell(beatAt(bar, b), type(), side * (-14 + b * 9.3))); side = -side; }
        else if (pattern === 'roll') [3, 6, 10, 14].forEach((x, b) => { const t = type(); shell(beatAt(bar, b), t, -x); shell(beatAt(bar, b), t, x); });
        else if (pattern === 'rush') { for (let k = 0; k < 8; k++) shell(beatAt(bar, k / 2), type(), side * (-14 + k * 4)); side = -side; }
    };

    // Bars 1-6 follow the song's loudness: each bar's pattern is ranked by how loud it is among them
    // (and only fast songs rush); bars 7 and 8 always build to the end
    const usable = fast ? PATTERNS : PATTERNS.slice(0, 5);
    const order = energy.slice(0, 6).map((e, i) => [e, i]).sort((a, b) => a[0] - b[0]);
    const levels = new Array(6);
    order.forEach(([e, i], rank) => {
        // the quietest bars get the gentlest patterns, the loudest the most intense, never beyond what
        // the bar's loudness allows
        const byRank = Math.round((rank / 5) * (usable.length - 1));
        levels[i] = Math.min(byRank, Math.floor(e * (usable.length - 0.01)));
    });
    for (let bar = 0; bar < 6; bar++) play(bar, usable[levels[bar]]);
    play(6, fast ? 'roll' : 'sweep');
    play(7, fast ? 'rush' : 'roll');

    // stage pyro on the song's big moments
    pyro(beatAt(0, 0), 'candles', { step: fast ? beatLen / 2 : beatLen });
    pyro(beatAt(7, 0), 'candles', { step: fast ? beatLen / 4 : beatLen / 2 });
    const loudest = energy.slice(0, 7).map((e, i) => [e, i]).sort((a, b) => b[0] - a[0]);
    // roof comet fans on the loudest bars (every genre: two for EDM and rap, one for pop and Bollywood)
    pyro(beatAt(loudest[0][1], 0), 'comets', { variant: 0, step: beatLen / 4 });
    if (genre.comets > 1) pyro(beatAt(loudest[1][1], 2), 'comets', { variant: 1, step: beatLen / 4 });
    loudest.filter(([e]) => e >= 0.7).slice(0, genre.mines ? 3 : 1).forEach(([, i]) => pyro(beatAt(i, 0), 'mines'));

    // the final hit: the closing volley, all together, sized by how hard the song ends
    const size = 5 + Math.round(energy[7] * 4);
    for (let k = 0; k < size; k++) shell(bars[8], genre.close[k % genre.close.length], (k - (size - 1) / 2) * (28 / Math.max(1, size - 1)));
    pyro(bars[8], 'mines');
    if (genre.mines) pyro(bars[8] + beatLen, 'mines');
    return out.sort((a, b) => a.at - b.at);
}

/**
 * A volley for a song's biggest drop, on the beat: [{ at, launch }] with times relative to the drop.
 * Stage pyro on the drop (mines, and the roman candles chasing on the beat), then one shell bursting
 * on each of the next beats (`beats`: seconds after the drop), alternating sides. Only one kind of
 * shell (the genre's: EDM palms, pop peonies, rap crossettes, Bollywood chrysanthemums): the full
 * variety is kept for the finale.
 */
export function dropVolley(random, opts = {}, beats = [0.47, 0.94, 1.41, 1.88, 2.34], { genre = 'edm', beat = 0.47 } = {}) {
    const out = makeStagePyro('mines', random, opts).map((launch) => ({ at: 0, launch }));
    makeStagePyro('candles', random, { ...opts, step: beat / 2 }).forEach((launch) => out.push({ at: 0, launch }));
    const type = (GENRE_SHELLS[genre] ?? GENRE_SHELLS.edm).drop;
    beats.slice(0, 5).forEach((t, i) => {
        out.push({ at: t - RISE, launch: makeShell(type, random, { ...opts, x: (i % 2 ? 1 : -1) * (4 + 3 * i) }) });
    });
    return out.sort((a, b) => a.at - b.at);
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
