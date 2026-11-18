// The mainstage's own cues: 16 beam positions and looks on top of the ones every show uses, in the manner of the
// big EDM main stages (parallel "fingers of God" spears into the sky, beams staggered up into a pyramid, rows
// crossed like swords, a static silhouette that snaps into a fan on the drop, one slow sweeper in the dark of a
// breakdown, laser-led moments). They belong to the mainstage alone: the show files are unchanged, and when a
// song plays on the mainstage some of its cues are swapped for these, by what kind of cue they are (`fits`):
//   peak     the later phrases of a peak, and every second "all in"
//   lasers   every second laser moment of a peak
//   groove   the later phrases of a groove
//   build    the first phrase of a build (sunrise) and its third (the pyramid)
//   quiet    calm sections (silhouette) and plain breakdowns (the lone sweeper)
// A peak's landing, its named moments (hook, chorus, slam, pinch, the pause), the solos and the focus cues stay
// as the show has them.
//
// Their own keys (read by the festival stages' heads): aerialTilt lifts or lowers the aerial beams freely
// (radians, + is up), and floorFan / floorTilt / floorSweep move the floor beams outside their usual limits.

import { cueKind } from './cues.js';

const ALL = { beams: 1, sides: 1, floor: 1, converge: 0, circle: 0, fanBreathe: 0 };

export const MAINSTAGE_CUES = [
    // --- peaks ---
    // (sky spears, sunrise and the pyramid hold the floor beams up in the sky: so they never stand still there, they
    // sway slowly side to side and flicker on the beat: floorSweep, sparkle)
    { kind: 'Mainstage · sky spears', fits: 'peak', look: { floorSweep: 0.18, speed: 0.8, sparkle: 0.45, ...ALL, fan: 0.12, aerialTilt: 1.1, floorFan: 0.1, floorTilt: 0.2, tiltWave: 0, alternate: 0, sidesAim: -1, phaseSpread: 0 } },
    { kind: 'Mainstage · crossed swords', fits: 'peak', look: { ...ALL, fan: -1, floorFan: -1, floorTilt: -0.3, floorSweep: 0.08, sweep: 0.08, tiltWave: 0, alternate: 0, sparkle: 0, sidesAim: 0.6 } },
    { kind: 'Mainstage · wide wings', fits: 'peak', look: { ...ALL, fan: 1.6, floorFan: 1.5, floorTilt: -0.45, floorSweep: 0, sweep: 0, tiltShift: -0.1, tiltWave: 0, sidesAim: -2, alternate: 0, sparkle: 0 } },
    { kind: 'Mainstage · starburst', fits: 'peak', look: { ...ALL, fan: 1.5, aerialTilt: 0.6, floorFan: 1.4, floorTilt: -0.6, floorSweep: 0, sweep: 0, tiltWave: 0, sparkle: 1, alternate: 0, sidesAim: -1.5 } },
    // (scissors: every group sweeps in unison, the right side the opposite way to the left (mirrorSweep), so the
    // two halves close across the middle and open out again like blades)
    { kind: 'Mainstage · scissors', fits: 'peak', look: { ...ALL, fan: 0.35, sweep: 0.55, speed: 1.6, phaseSpread: 0, mirrorSweep: 1, floorFan: 0.4, floorTilt: -0.35, floorSweep: 0.5, sidesMirror: 1, sidesAim: -0.6, alternate: 0, sparkle: 0, tiltWave: 0 } },
    { kind: 'Mainstage · pixel storm', fits: 'peak', look: { ...ALL, pixel: 1, pixelSparkle: 1, pixelChase: 1, strobeRandom: 0.5, alternate: 1, fan: 1, sweep: 0.2, sparkle: 0 } },
    { kind: 'Mainstage · wall of light', fits: 'peak', look: { ...ALL, fan: 0.05, aerialTilt: -0.25, floorFan: 0.05, floorTilt: -0.9, floorSweep: 0, sweep: 0, tiltWave: 0, sidesAim: -1, alternate: 0, sparkle: 0, phaseSpread: 0 } },
    // --- the laser moment of a peak ---
    { kind: 'Mainstage · laser cathedral', fits: 'lasers', look: { beams: 0.35, sides: 0.2, floor: 0.3, fan: 0.15, floorFan: 0.2, sweep: 0, floorSweep: 0, tiltWave: 0, laser: 1, laserAmount: 1, laserMax: 1, laserSpread: 2.2, laserTower: 1, laserFloor: 1, laserChase: 0, laserCount: 1, alternate: 0, sparkle: 0, circle: 0, fanBreathe: 0 } },
    // --- grooves ---
    { kind: 'Mainstage · crowd rake', fits: 'groove', look: { beams: 1, sides: 0.5, floor: 0, fan: 0.9, aerialTilt: -0.55, sweep: 0.5, speed: 0.6, phaseSpread: 0, tiltWave: 0, washDown: 1, alternate: 0, sparkle: 0, converge: 0, circle: 0, fanBreathe: 0 } },
    // (ripple: the floor rides the aerials' wave in step with them (floorWave), one wave rolling through the rig)
    { kind: 'Mainstage · ripple', fits: 'groove', look: { beams: 1, sides: 0.6, floor: 1, fan: 1, tiltWave: 0.32, phaseSpread: 1, sweep: 0.05, speed: 1.3, floorWave: 1, floorTilt: -0.3, alternate: 0, sparkle: 0, converge: 0, circle: 0, fanBreathe: 0 } },
    { kind: 'Mainstage · low tide', fits: 'groove', look: { beams: 0, sides: 0.8, floor: 1, sidesAim: -1, floorFan: 1.2, floorTilt: -0.7, floorSweep: 0.15, sweep: 0.15, alternate: 0, sparkle: 0, converge: 0, circle: 0, fanBreathe: 0 } },
    { kind: 'Mainstage · odd-even chop', fits: 'groove', look: { beams: 1, sides: 0.6, floor: 0.8, fan: 0.6, tiltShift: -0.2, sweep: 0.1, alternate: 1, pixelAlt: 1, sparkle: 0, tiltWave: 0, converge: 0, circle: 0, fanBreathe: 0 } },
    // --- builds ---
    { kind: 'Mainstage · sunrise', fits: 'build', phrase: 1, look: { floorSweep: 0.18, speed: 0.8, sparkle: 0.45, beams: 1, sides: 0.4, floor: 0.8, fan: 0.3, aerialTilt: 0.5, floorFan: 0.3, floorTilt: 0, tiltWave: 0, strobeRandom: 0.15, alternate: 0, converge: 0, circle: 0, fanBreathe: 0 } },
    { kind: 'Mainstage · the pyramid', fits: 'build', phrase: 3, look: { floorSweep: 0.18, speed: 0.8, sparkle: 0.45, beams: 1, sides: 1, floor: 0.8, converge: 0.75, focusFloor: 0, fan: 1, floorFan: 0.5, floorTilt: 0, tiltWave: 0, alternate: 0, circle: 0, fanBreathe: 0 } },
    // --- quiet parts ---
    { kind: 'Mainstage · silhouette', fits: 'calm', look: { beams: 0.6, sides: 0, floor: 0, wash: 0.35, fan: 0.25, aerialTilt: 0.15, sweep: 0, tiltWave: 0, laser: 0, pixel: 0.3, pixelSparkle: 0, haze: 0.6, alternate: 0, sparkle: 0, converge: 0, circle: 0, fanBreathe: 0 } },
    { kind: 'Mainstage · lone sweeper', fits: 'breakdown', look: { beams: 0, floor: 0, sides: 0.7, sidesAim: -1, sweep: 0.9, speed: 0.35, wash: 0.15, laser: 0, pixel: 0.15, pixelSparkle: 0, alternate: 0, sparkle: 0, converge: 0, circle: 0, fanBreathe: 0 } },
];

// The mainstage's own take on some of the shows' cues (applied on top of them, in songs and in the cue tester):
// the focus cues without the floor beams, the two-colour focus meeting at two points side by side (one white
// point otherwise: the two colours added up to white where every beam crossed)
export const PATCHES = {
    'Focus': { floor: 0 },
    'Focus · two colours': { floor: 0, focusSplit: 3.2 },
};
/** The patch the mainstage lays over one of the shows' cues (by its kind), or null. */
export const patchFor = (kind) => PATCHES[kind] ?? null;

/**
 * A look with a mainstage cue laid over it. The cue's `speed` is a multiple of the song's own (the songs move once
 * every 2, 4 or 8 bars of their own tempo), so its movement keeps to the song's tempo: faster in a fast song.
 */
export function withOwn(look, own) {
    if (!own) return look;
    const { speed, ...rest } = own.look;
    return speed === undefined ? { ...look, ...rest } : { ...look, ...rest, speed: (look.speed ?? 1) * speed };
}

const of = (fits) => MAINSTAGE_CUES.filter((c) => c.fits === fits);
const phraseOf = (name) => Number(/·\s*phrase\s*(\d+)/i.exec(name ?? '')?.[1] ?? 1);

/**
 * For a show's cues ([{ name }] in order: a demo song's or an uploaded one's), which mainstage cue (or null) plays
 * in place of each one.
 * The same song always gets the same plan; songs start at different places in the lists, so they differ.
 */
export function planMainstageCues(cues) {
    const kinds = cues.map((c) => cueKind(c.name));
    const has = (k) => kinds.includes(k);
    // the pools: a slot takes the cue of its pool used least so far in this song (ties: in turn from a place set
    // by the song), so every cue plays once before any plays twice; the laser cathedral joins the peaks in a song
    // with no laser moment of its own
    const pools = {
        peak: [...of('peak'), ...(has('Peak · lasers') ? [] : of('lasers'))],
        groove: of('groove'),
        build: of('build'),
        quiet: [...of('calm'), ...of('breakdown')],
        lasers: of('lasers'),
    };
    const used = new Map();
    const start = cues.length;
    const pick = (pool) => {
        const list = pools[pool];
        let best = null;
        list.forEach((c, i) => {
            const n = used.get(c.kind) ?? 0;
            const turn = (i - start % list.length + list.length) % list.length;
            if (!best || n < best.n || (n === best.n && turn < best.turn)) best = { c, n, turn };
        });
        used.set(best.c.kind, best.n + 1);
        return best.c;
    };
    const plan = cues.map((cue, i) => {
        // (a circle is never replaced: it is the song's own circle)
        if ((cue.look?.circle ?? 0) > 0.5) return null;
        const kind = kinds[i];
        const phrase = phraseOf(cue.name);
        // a peak's landing (its first phrase) stays, unless one of the peak cues has not played yet in this song
        // (so each plays at least once); the rest of the peak is the mainstage's own
        if (kind === 'Peak') return phrase >= 2 || pools.peak.some((c) => !used.get(c.kind)) ? pick('peak') : null;
        if (kind === 'Peak · all in' || kind === 'Peak · chorus' || kind === 'Peak · hook' || kind === 'Peak · burst out') return pick('peak');
        if (kind === 'Peak · lasers') return pick('lasers');
        // (only the groove cues in a groove: a peak's look there would not fit the moment)
        if (kind === 'Groove' || kind === 'groove after solo' || kind === 'After focus' || kind === 'After vocal focus') return pick('groove');
        // builds: only their first and third phrase (sunrise and the pyramid hold the floor up: not every phrase)
        // (each at most twice a song)
        if (kind === 'Build') return (phrase === 1 || phrase === 3) && pools.build.some((c) => (used.get(c.kind) ?? 0) < 2) ? pick('build') : null;
        // the quiet parts: the silhouette and the lone sweeper in turn (an intro's or an outro's later phrases too)
        // (each at most three times a song)
        if ((kind === 'Calm' || kind === 'Breakdown' || kind === 'breakdown after solo' || ((kind === 'Intro' || kind === 'Outro') && phrase >= 2))
            && pools.quiet.some((c) => (used.get(c.kind) ?? 0) < 3)) return pick('quiet');
        if (PATCHES[kind]) return { kind: `${kind} (mainstage)`, look: PATCHES[kind] };
        return null;
    });
    return withCircle(cues, plan);
}

// The circle (every beam tracing a circle, all groups lit): a song that has none gets one at its biggest moment,
// on the stages that play it (the mainstage and the desert stage)
const CIRCLE = { kind: 'Circle · all beams', look: { beams: 1, sides: 1, floor: 1, wash: 1, circle: 1, alternate: 0, sparkle: 0 } };

/**
 * `plan` (one entry per cue, or null) with the circle added if the song has none: on its biggest peak's 'all in'
 * (the longest peak's), or failing that the second phrase of its longest peak, or its first peak.
 */
export function withCircle(cues, plan = cues.map(() => null)) {
    if (cues.some((c) => (c.look?.circle ?? 0) > 0.5)) return plan;
    const peaks = new Map(); // peak number -> its cues' indices
    cues.forEach((c, i) => {
        const m = /^Peak\s*(\d+)/.exec(c.name ?? '');
        if (m) peaks.set(m[1], [...(peaks.get(m[1]) ?? []), i]);
    });
    if (!peaks.size) return plan;
    const span = (list) => (cues[list.at(-1) + 1]?.t ?? cues[list.at(-1)].t + 10) - cues[list[0]].t;
    const longest = [...peaks.values()].sort((a, b) => span(b) - span(a))[0];
    const pick = longest.find((i) => cueKind(cues[i].name) === 'Peak · all in')
        ?? longest.find((i) => phraseOf(cues[i].name) === 2)
        ?? longest[0];
    const out = [...plan];
    out[pick] = CIRCLE;
    return out;
}

// the desert stage's two-colour focus: its colours meet further apart than on the live stage (a wider stage)
const DESERT_PATCHES = { 'Focus · two colours': { focusSplit: 2.4 } };

/** The desert stage's plan: the song's own cues (its two-colour focus wider apart), with the circle added if it has none. */
export const planDesertCues = (cues) => withCircle(cues, cues.map((c) => {
    const kind = cueKind(c.name);
    return DESERT_PATCHES[kind] ? { kind: `${kind} (desert)`, look: DESERT_PATCHES[kind] } : null;
}));

// which of the shows' cues each mainstage cue is laid over on the test page
const BASE = { peak: 'Peak · all in', lasers: 'Peak · lasers', groove: 'Groove', build: 'Build', calm: 'Calm', breakdown: 'Breakdown' };

/** The mainstage cues as complete looks for the cue tester, from the shows' collected cues. */
export function mainstageTestCues(collected) {
    return MAINSTAGE_CUES.map((cue) => {
        const base = collected.find((c) => c.kind === BASE[cue.fits]) ?? collected.find((c) => c.kind === 'Peak') ?? collected[0];
        return { kind: cue.kind, look: withOwn(base?.look ?? {}, cue), shot: base?.shot ?? null, song: 'mainstage only', t: 0 };
    });
}
