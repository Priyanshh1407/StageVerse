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
    // (crossed swords: the aerials and side towers alone, the floor off)
    { kind: 'Mainstage · crossed swords', fits: 'peak', look: { ...ALL, floor: 0, fan: -1, floorFan: -1, floorTilt: -0.3, floorSweep: 0.08, sweep: 0.08, tiltWave: 0, alternate: 0, sparkle: 0, sidesAim: 0.6 } },
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
    // (the pyramid: the aerials and side towers converging, the floor off)
    { kind: 'Mainstage · the pyramid', fits: 'build', phrase: 3, look: { floorSweep: 0.18, speed: 0.8, sparkle: 0.45, beams: 1, sides: 1, floor: 0, converge: 0.75, focusFloor: 0, fan: 1, floorFan: 0.5, floorTilt: 0, tiltWave: 0, alternate: 0, circle: 0, fanBreathe: 0 } },
    // --- quiet parts ---
    { kind: 'Mainstage · silhouette', fits: 'calm', look: { beams: 0.6, sides: 0, floor: 0, wash: 0.35, fan: 0.25, aerialTilt: 0.15, sweep: 0, tiltWave: 0, laser: 0, pixel: 0.3, pixelSparkle: 0, haze: 0.6, alternate: 0, sparkle: 0, converge: 0, circle: 0, fanBreathe: 0 } },
    // --- the focus ---
    // (the multi-colour focus: every beam one of six colours, each colour meeting on its own point along a line across
    // the stage, so every colour shows and none piles into a blob; no sparkle, so none blinks out)
    { kind: 'Mainstage · multi-colour focus', fits: 'focus', look: { floor: 0, focusMulti: 1, focusSplit: 0, sparkle: 0, alternate: 0, beams: 1, sides: 1 } },
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
    // the multi-colour focus: a focus's third phrase (or later odd ones), or its first when it has no third
    const MULTI = MAINSTAGE_CUES.find((c) => c.fits === 'focus');
    const focus = cues.map((c, i) => (kinds[i] === 'Focus' ? i : -1)).filter((i) => i >= 0);
    const later = focus.filter((i) => phraseOf(cues[i].name) >= 3);
    for (const i of later.length ? later : focus.slice(0, 1)) plan[i] = MULTI;
    // (the beam wipe and the side-tower cues too, as on the desert, where they leave its own cues alone: the wipe on
    // free groove and verse phrases (a verse's second, fourth...), the side cues on the side towers' solo and bridges;
    // every song gets at least one of each)
    const full = withCircle(cues, addRigCues(cues, plan, { wipe: (phrase) => phrase % 2 === 0, sideMoments: /^Bridge/, sideCues: DESERT_SIDE_ONLY_CUES }));
    return ensureEach(cues, holdCircle(cues, full), [...MAINSTAGE_CUES, BEAM_WIPE, ...DESERT_SIDE_ONLY_CUES]);
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

const ANGLED = new Set(['left', 'right']);

/**
 * A song's three-quarter shots (the shows' left and right shots) on a stage that plays each at most once a song:
 * the first time the show turns to an angle the camera turns left, the second time right, and after that it stays
 * in front (the dolly shot). A song that turns only once also turns right, on its next dolly shot. Returns the
 * shot for each cue, or null for the show's own. (A shot held over several cues counts as one turn.)
 */
export function planQuarterShots(cues) {
    const plan = cues.map(() => null);
    let turns = 0;
    let current = null;
    cues.forEach((cue, i) => {
        const shot = cue.shot ?? null;
        if (!ANGLED.has(shot)) { current = null; return; }
        // a new turn when the angle starts (not a cue that only holds it)
        if (cues[i - 1]?.shot !== shot || current === null) { current = turns === 0 ? 'left' : turns === 1 ? 'right' : 'dolly'; turns += 1; }
        plan[i] = current;
    });
    // (a song that turns fewer than twice borrows a front shot for the missing turn: its next dolly shot, or wide
    // shot, after the turn it has, or before it; so every song turns both ways)
    const borrow = (as, after) => {
        const free = (i) => !plan[i] && (cues[i].shot === 'dolly' || cues[i].shot === 'wide') && cues[i - 1]?.shot !== cues[i].shot;
        const order = [...cues.keys()].filter((i) => i > after).concat([...cues.keys()].filter((i) => i <= after).reverse());
        const j = [...order.filter((i) => free(i) && cues[i].shot === 'dolly'), ...order.filter((i) => free(i))][0];
        if (j === undefined) return;
        for (let k = j; k < cues.length && cues[k].shot === cues[j].shot && !plan[k]; k++) plan[k] = as;
    };
    if (turns === 0) borrow('left', Math.floor(cues.length / 4));
    if (turns <= 1) borrow('right', Math.max(plan.findLastIndex((x) => x === 'left'), 0));
    return plan;
}

// The desert's own cue: only the aerial and floor beams, on in a band that sweeps across the stage once a bar: left
// to right, right to left, then from both sides to the centre, in turn (look.beamWipe 4; 1, 2, 3 hold one way)
export const BEAM_WIPE = { kind: 'Beam wipe', look: { beams: 1, floor: 1, sides: 0, wash: 0.12, spots: 0, laser: 0, pixel: 0.15, beamWipe: 4, fan: 1, sweep: 0.08, tiltWave: 0, alternate: 0, sparkle: 0, circle: 0, fanBreathe: 0, converge: 0, strobeRandom: 0 } };
const WIPE_ON = /^(Groove|Verse)/;

// The desert's side-tower cues, made for its three ladders a side and the beam columns beside its screens:
//   ladder climb  the side lights come on up each ladder from the bottom, one sweep a bar (look.sideWipe 5)
//   depth chase   from the front ladders to the back ones, then back again, a bar each (sideWipe 6)
//   crossfire     both sides fire across the crowd, crossing in an X over the middle, mirror images sweeping
//   ping-pong     the towers and the screen columns take turns on the beat (look.pingPong)
// (bright, hazy: the side lights are the whole picture)
const SIDE_BASE = { sides: 1, screenColumns: 1, intensity: 1.35, haze: 0.75, master: 1, wash: 0.2, laser: 0, pixel: 0.2, alternate: 0, sparkle: 0, circle: 0, fanBreathe: 0, converge: 0, beamWipe: 0, strobeRandom: 0 };
export const DESERT_SIDE_CUES = [
    { kind: 'Side towers · ladder climb', look: { ...SIDE_BASE, beams: 0.15, floor: 0, sideWipe: 5, sidesAim: 0, sweep: 0.12, speed: 0.6 } },
    { kind: 'Side towers · depth chase', look: { ...SIDE_BASE, beams: 0.15, floor: 0.2, sideWipe: 6, sidesAim: 0.3, sweep: 0.2, speed: 0.7 } },
    { kind: 'Side towers · crossfire', look: { ...SIDE_BASE, beams: 0.3, floor: 0.3, sideWipe: 0, sidesAim: 0.6, sidesMirror: 1, sweep: 0.7, speed: 0.6 } },
    { kind: 'Side towers · ping-pong', look: { ...SIDE_BASE, beams: 0.2, floor: 0.2, sideWipe: 0, pingPong: 1, sidesAim: 0, sweep: 0.2, speed: 0.8 } },
];
// on the desert and the mainstage the side lights are the only lights: every other group, the spots, lasers, pixel bars, strobes and
// blinders off while a side-tower cue plays
const SIDE_ONLY = { beams: 0, floor: 0, wash: 0, spots: 0, pixel: 0, laser: 0, strobe: 0, blinder: 0, strobeRandom: 0 };
export const DESERT_SIDE_ONLY_CUES = DESERT_SIDE_CUES.map((cue) => ({ ...cue, look: { ...cue.look, ...SIDE_ONLY } }));
const SIDE_SOLO = /^Solo · side towers/;
const SIDE_MOMENT = /^(Bridge|Breakdown)/;

/**
 * The desert stage's plan: the song's own cues (its two-colour focus wider apart), the beam wipe on every second
 * groove or verse phrase (or the first one, in a song with only one), with the circle added if it has none.
 */
export const planDesertCues = (cues) => {
    const plan = cues.map((c) => {
        const kind = cueKind(c.name);
        return DESERT_PATCHES[kind] ? { kind: `${kind} (desert)`, look: DESERT_PATCHES[kind] } : null;
    });
    // (its side-tower cues with every other light off)
    const full = withCircle(cues, addRigCues(cues, plan, { wipe: (phrase) => phrase % 2 === 0, sideCues: DESERT_SIDE_ONLY_CUES }));
    return ensureEach(cues, holdCircle(cues, full), [BEAM_WIPE, ...DESERT_SIDE_ONLY_CUES]);
};

// The circle held long enough to be seen: it takes a few seconds to form, and on its own it lasted one cue (3-11 s).
// The cues after it in the same peak keep circling until it has played about 16 s.
const HELD_CIRCLE = { kind: 'Circle · all beams (held)', look: { circle: 1, alternate: 0, sparkle: 0, beams: 1, sides: 1, floor: 1, converge: 0 } };
const isCircle = (cue, p) => (cue.look?.circle ?? 0) > 0.5 || /^Circle · all beams/.test(p?.kind ?? '');
export function holdCircle(cues, plan, seconds = 16) {
    const held = holdFrom(cues, plan, seconds);
    // (a song whose circles all sit just before a quiet part or a solo gets one more, where it can run: a later
    // phrase of a peak, followed by more of it)
    if (longestCircle(cues, held) >= 8) return held;
    const loud = (j) => j < cues.length && !/^(Breakdown|breakdown|Outro|Calm|Intro|Build|Focus|Vocal focus|Solo|Riser)/.test(cues[j].name ?? '');
    // (of the places it could go, the one where it runs longest)
    let best = held;
    let length = longestCircle(cues, held);
    cues.forEach((c, i) => {
        if (!/^Peak/.test(c.name ?? '') || isCircle(c, held[i]) || !loud(i + 1) && (cues[i + 1]?.t ?? Infinity) - c.t < 8) return;
        const more = [...held];
        more[i] = CIRCLE;
        const tried = holdFrom(cues, more, seconds);
        const n = longestCircle(cues, tried);
        if (n > length) { best = tried; length = n; }
    });
    return best;
}
function longestCircle(cues, plan) {
    let best = 0;
    let start = null;
    cues.forEach((c, i) => {
        const on = isCircle(c, plan[i]);
        if (on && start === null) start = c.t;
        if (start !== null && (!on || i === cues.length - 1)) { best = Math.max(best, (on ? (cues[i + 1]?.t ?? c.t + 4) : c.t) - start); start = on ? start : null; }
    });
    return best;
}
function holdFrom(cues, plan, seconds) {
    const out = [...plan];
    cues.forEach((cue, i) => {
        if (!isCircle(cue, plan[i]) || (i > 0 && isCircle(cues[i - 1], out[i - 1]))) return;
        // (over the next cues while the song stays loud: not into a quiet part, a build, a focus or a solo)
        for (let j = i + 1; j < cues.length && cues[j].t - cue.t < seconds; j++) {
            if (/^(Breakdown|breakdown|Outro|Calm|Intro|Build|Focus|Vocal focus|Solo|Riser)/.test(cues[j].name ?? '')) break;
            if (!isCircle(cues[j], out[j])) out[j] = HELD_CIRCLE;
        }
    });
    return out;
}

/**
 * Every one of a stage's own cues (`own`) at least once in each song, demo or uploaded: a cue that never came up takes
 * the slot of a cue that played twice (its later turn), or a free slot of the song's own, where the moment fits it;
 * the circle, the multi-colour focus and a peak's landing are left alone.
 */
export function ensureEach(cues, plan, own) {
    const out = [...plan];
    const kindOf = (i) => cueKind(cues[i].name);
    // (tier 1: the moment the cue is made for; tier 2, when a song has no free one: a nearby kind of moment)
    const fitsNear = (i, cue) => {
        const k = kindOf(i);
        const phrase = phraseOf(cues[i].name);
        const fits = cue === BEAM_WIPE ? 'wipe' : isSideCue(cue) ? 'side' : cue.fits;
        if (/^Peak$/.test(k) && phrase === 1) return false;
        if (fits === 'peak' || fits === 'lasers' || fits === 'focus') return /^(Peak|Groove|Build)/.test(k) && phrase >= 2;
        if (fits === 'groove' || fits === 'wipe' || fits === 'side') return /^(Peak|Groove|Verse|Build|Bridge)/.test(k);
        if (fits === 'build') return /^(Build|Groove)/.test(k);
        return /^(Calm|Breakdown|Intro|Outro|Verse)/.test(k);
    };
    const fitsSlot = (i, cue) => {
        const k = kindOf(i);
        const phrase = phraseOf(cues[i].name);
        const fits = cue === BEAM_WIPE ? 'wipe' : isSideCue(cue) ? 'side' : cue.fits;
        if (fits === 'peak' || fits === 'lasers') return /^Peak/.test(k) && !(k === 'Peak' && phrase === 1);
        if (fits === 'groove' || fits === 'wipe') return /^(Groove|Verse|groove after|After (vocal )?focus)/i.test(k);
        if (fits === 'build') return /^Build/.test(k);
        if (fits === 'calm' || fits === 'breakdown') return /^(Calm|Breakdown|breakdown after)/i.test(k) || (/^(Intro|Outro)/.test(k) && phrase >= 2);
        if (fits === 'focus') return k === 'Focus';
        if (fits === 'side') return /^(Bridge|Breakdown|Groove|Verse|Solo · side)/i.test(k);
        return false;
    };
    const count = () => {
        const n = new Map();
        out.forEach((p) => p && n.set(p.kind, (n.get(p.kind) ?? 0) + 1));
        return n;
    };
    // (left alone: the circle, the focus cues and the stage's own patches of the song's cues, e.g. the two-colour focus)
    const locked = (i) => isCircle(cues[i], out[i]) || out[i]?.fits === 'focus' || /^Focus/.test(kindOf(i)) || /\((mainstage|desert)\)$/.test(out[i]?.kind ?? '');
    for (const cue of own) {
        const n = count();
        if (n.get(cue.kind)) continue;
        const ownKinds = new Set(own.map((c) => c.kind));
        let at;
        // (tier 3, the last resort: a cue played twice anywhere, or a later peak's landing; never the song's first peak)
        const firstPeak = cues.findIndex((c) => /^Peak/.test(c.name ?? ''));
        const anywhere = (i) => i !== firstPeak && (Boolean(out[i]) || /^Peak/.test(kindOf(i)));
        for (const fits of [fitsSlot, fitsNear, anywhere]) {
            const twice = out.map((p, i) => i).filter((i) => out[i] && ownKinds.has(out[i].kind) && n.get(out[i].kind) > 1 && !locked(i) && fits(i, cue)).reverse();
            const free = out.map((p, i) => i).filter((i) => (!out[i] || !ownKinds.has(out[i].kind)) && !locked(i) && fits(i, cue));
            at = twice[0] ?? free[Math.floor(free.length / 2)];
            if (at !== undefined) break;
        }
        if (at !== undefined) out[at] = cue;
    }
    return out;
}

const isSideCue = (p) => DESERT_SIDE_CUES.includes(p) || DESERT_SIDE_ONLY_CUES.includes(p);
const isRigCue = (p) => p === BEAM_WIPE || isSideCue(p);

/**
 * The beam wipe and the side-tower cues laid into a stage's plan (the desert's and the mainstage's), for every song,
 * a demo or an upload:
 * - the side-tower cues in turn: on the side towers' solo and the first phrase of each bridge or breakdown
 * - the beam wipe on the groove and verse phrases `wipe(phrase)` picks (on a free slot, or over the stage's own cue
 *   with `overWipe`)
 * - every song gets at least one of each: the wipe on its first groove or verse (or build, or calm part), a side cue on
 *   its first build (or groove, or calm part), over whatever was planned there
 */
export function addRigCues(cues, plan, { wipe, overWipe = false, sideMoments = SIDE_MOMENT, sideCues = DESERT_SIDE_CUES }) {
    const out = [...plan];
    let side = 0;
    const kinds = cues.map((c) => cueKind(c.name));
    cues.forEach((c, i) => {
        if (SIDE_SOLO.test(c.name ?? '') || (sideMoments.test(kinds[i]) && phraseOf(c.name) === 1)) out[i] = sideCues[side++ % sideCues.length];
        else if (WIPE_ON.test(kinds[i]) && wipe(phraseOf(c.name)) && (overWipe || !out[i])) out[i] = BEAM_WIPE;
    });
    const circle = (i) => (cues[i].look?.circle ?? 0) > 0.5;
    // (a free slot first, in order of the kinds asked for; only then over the stage's own cue there; never an intro, an
    // outro, a solo, a peak or the circle)
    const first = (patterns, over = patterns) => {
        for (const free of [true, false]) {
            for (const re of free ? patterns : over) {
                const i = kinds.findIndex((k, j) => re.test(k) && !isRigCue(out[j]) && !circle(j) && (!free || !out[j]));
                if (i >= 0) return i;
            }
        }
        return -1;
    };
    if (!out.includes(BEAM_WIPE)) {
        const i = first([WIPE_ON, /^Build/, /^(Calm|Breakdown)/]);
        if (i >= 0) out[i] = BEAM_WIPE;
    }
    if (!out.some(isSideCue)) {
        // (over a groove first, if it must replace one: a groove has the most cues to spare)
        const i = first([/^Build/, WIPE_ON, /^(Calm|Breakdown)/], [WIPE_ON, /^Build/, /^(Calm|Breakdown)/]);
        if (i >= 0) out[i] = sideCues[0];
    }
    return out;
}

/** The desert's cues for the cue tester: each way of the wipe, the three in turn, and the side-tower cues. */
// The warehouse's side chasers: the LED lines along both side walls light up in a band running from the stage to the
// back of the room and back again (look.pixelSweep), the rest of the LED lines dimmed. Played on the first phrase of
// every build, the third of every groove, and the second phrase of a peak.
export const SIDE_CHASERS = { kind: 'Warehouse · side chasers', look: { pixelSweep: 1, pixel: 1, pixelChase: 1 } };
export function planWarehouseCues(cues) {
    return cues.map(({ name = '' }) => {
        const phrase = phraseOf(name);
        if (/^Build/i.test(name) && phrase === 1) return SIDE_CHASERS;
        if (/^Groove/i.test(name) && phrase === 3) return SIDE_CHASERS;
        if (/^Peak/i.test(name) && phrase === 2) return SIDE_CHASERS;
        return null;
    });
}
/** The test page's own cue for the side chasers (on the first groove cue's look). */
export function warehouseTestCues(collected) {
    const base = collected.find((c) => c.kind === 'Groove') ?? collected[0];
    return [{ kind: SIDE_CHASERS.kind, look: withOwn(base?.look ?? {}, SIDE_CHASERS), shot: base?.shot ?? null, song: 'warehouse', t: 0 }];
}

export function desertTestCues(collected) {
    return rigTestCues(collected, 'mainstage and desert', DESERT_SIDE_ONLY_CUES);
}

function rigTestCues(collected, song, sideCues = DESERT_SIDE_CUES) {
    const base = collected.find((c) => c.kind === 'Groove') ?? collected[0];
    const wipes = [[4, ''], [1, ' · left to right'], [2, ' · right to left'], [3, ' · to the centre']].map(([mode, name]) => ({
        kind: `${BEAM_WIPE.kind}${name}`, look: withOwn(base?.look ?? {}, { look: { ...BEAM_WIPE.look, beamWipe: mode } }), shot: base?.shot ?? null, song, t: 0,
    }));
    const sides = sideCues.map((cue) => ({ kind: cue.kind, look: withOwn(base?.look ?? {}, cue), shot: base?.shot ?? null, song, t: 0 }));
    return [...wipes, ...sides];
}

// which of the shows' cues each mainstage cue is laid over on the test page
const BASE = { peak: 'Peak · all in', lasers: 'Peak · lasers', groove: 'Groove', build: 'Build', calm: 'Calm', breakdown: 'Breakdown', focus: 'Focus' };

/** The mainstage cues as complete looks for the cue tester, from the shows' collected cues. */
export function mainstageTestCues(collected) {
    const own = MAINSTAGE_CUES.map((cue) => {
        const base = collected.find((c) => c.kind === BASE[cue.fits]) ?? collected.find((c) => c.kind === 'Peak') ?? collected[0];
        return { kind: cue.kind, look: withOwn(base?.look ?? {}, cue), shot: base?.shot ?? null, song: 'mainstage only', t: 0 };
    });
    // (and the beam wipe and the side-tower cues it shares with the desert)
    return [...own, ...rigTestCues(collected, 'mainstage and desert', DESERT_SIDE_ONLY_CUES)];
}
