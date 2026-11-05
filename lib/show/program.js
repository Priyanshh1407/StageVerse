import { GENRES, normaliseGenre } from './genres.js';
import { mixHex } from './look.js';
import { CO2_BLAST } from './co2.js';
import { dropVolley, finale, fireworkDuration, rng as fwRng } from './fireworks.js';

// Turns a song analysis into a lighting show (a timecoded cue sheet), the way a lighting
// designer programs a concert. Each section kind has its own character, and movement follows the
// energy: an intro that starts in blackout and grows with the song; calm parts that sway slowly
// with only a group or two lit; grooves that move (waves, chases, alternating beams); builds that
// speed up every 2 bars; peaks that open on a drop with one or two lasers growing to the full fan,
// change colour every phrase, move the most and hit strobes/blinders every 2 bars and on every
// burst of energy; one "focus" section at the song's biggest spike (everything on, aimed at the
// centre, random beams flickering and changing colour); breakdowns that open on blinders alone,
// then washes alone, then slow down; and an outro that fades into blackout.

// Positions: how wide the rows fan out, and how high the beams point
export const POSITIONS = {
    wide: { fan: 1.3, tiltShift: 0.1 },
    tight: { fan: 0.55, tiltShift: -0.05 },
    audience: { fan: 0.9, tiltShift: -0.3 },   // straight out into the crowd
    sky: { fan: 1.05, tiltShift: 0.45 },
    cross: { fan: -0.85, tiltShift: 0.05 },     // mirrored: left beams go right and vice versa
    vee: { fan: 1.5, tiltShift: 0.25 },
    centre: { fan: 0.4, tiltShift: 0 },
};

// Movements, with cycle lengths in bars so they lock to the tempo
function movesFor(bpm) {
    const bar = 240 / bpm;
    const cycle = (bars) => (2 * Math.PI) / (bars * bar);
    return {
        hold: { sweep: 0, speed: cycle(8), phaseSpread: 0, tiltWave: 0 },
        drift: { sweep: 0.2, speed: cycle(8), phaseSpread: 0.3, tiltWave: 0.06 },
        sway: { sweep: 0.16, speed: cycle(4), phaseSpread: 0, tiltWave: 0 },
        // a wave rolls along each row: side to side and clearly up and down
        wave: { sweep: 0.24, speed: cycle(2), phaseSpread: 1, tiltWave: 0.3 },
        chase: { sweep: 0.42, speed: cycle(2), phaseSpread: 0.5, tiltWave: 0.1 },
        // peaks: big unified sweeps across the crowd, one per two bars (like a festival's main-stage
        // beams), with a gentle lift and dip; "frenzy" is the most energetic: one bar, a full wave
        ballyhoo: { sweep: 0.55, speed: cycle(2), phaseSpread: 0.15, tiltWave: 0.12 },
        frenzy: { sweep: 0.5, speed: cycle(1), phaseSpread: 0.6, tiltWave: 0.18 },
    };
}

const OFF = { beams: 0, sides: 0, floor: 0, wash: 0, laser: 0, pixel: 0, strobeRandom: 0 };
const ALL = { beams: 1, sides: 1, floor: 1, wash: 0.8, pixel: 1 };

// LED pixel bars along the trusses: their patterns, and how each section kind uses them. They're
// off whenever a single group of lights plays alone (solos, "washes alone", the lasers opening a
// build, the tower ending), so they never spoil a look built on one fixture type.
const PIXEL = {
    oneA: { pixelColor: 0, pixelChase: 0, pixelSparkle: 0, pixelAlt: 0 },      // steady, one colour
    oneB: { pixelColor: 1, pixelChase: 0, pixelSparkle: 0, pixelAlt: 0 },      // steady, the other colour
    chase: { pixelColor: 0, pixelChase: 1, pixelSparkle: 0, pixelAlt: 0 },     // a chase in one colour
    both: { pixelColor: 0.5, pixelChase: 1, pixelSparkle: 0, pixelAlt: 0 },    // both colours, chasing
    rows: { pixelColor: 0.5, pixelChase: 0, pixelSparkle: 0, pixelAlt: 1 },    // trusses alternate the two colours
    sparkle: { pixelColor: 0.5, pixelChase: 0, pixelSparkle: 1, pixelAlt: 0 }, // random pixels flashing
};
const PIXEL_PLAN = {
    intro: { level: 0.35, patterns: ['oneA'] },
    calm: { level: 0.45, patterns: ['oneA', 'oneB', 'chase'] },
    groove: { level: 0.8, patterns: ['both', 'rows', 'chase', 'oneB'] },
    build: { level: 1, patterns: ['both'] },
    peak: { level: 1, patterns: ['both', 'rows', 'sparkle', 'chase'] },
    breakdown: { level: 0.3, patterns: ['oneB', 'oneA'] },
    outro: { level: 0.25, patterns: ['oneA'] },
};
// Random strobes (truss strobes lighting up as coloured boxes): a few in calm parts, more in
// grooves, changing every 2 beats or every beat. Builds ramp them up themselves; peaks keep the
// white strobe and blinder hits instead.
const RANDOM_STROBES = { calm: { share: 0.12, perBeat: 0.5 }, groove: { share: 0.25, perBeat: 1 } };

// Lasers in peaks: each phrase picks which projectors play (all, the floor ones, the tower ones),
// sets the sheets a little lower or higher, and breathes the beam count in and out one beam at a
// time (the sheets sweep side to side; they never point down into the crowd)
const LASER_GROUPS = [{ laserFloor: 1, laserTower: 1 }, { laserFloor: 1, laserTower: 0 }, { laserFloor: 0, laserTower: 1 }];
/** The lasers for one look: every kind resets them; peaks rotate the groups. */
export function laserLook(kind, step) {
    const reset = { laserFloor: 1, laserTower: 1, laserSeq: 1, laserCount: 0, laserTilt: 0 };
    if (kind !== 'peak') return reset;
    return { ...reset, ...LASER_GROUPS[step % LASER_GROUPS.length], laserCount: 1, laserTilt: step % 2 ? -0.1 : 0.1 };
}

/** The LED bars for one look: off if only one group is lit, otherwise the kind's level and pattern. */
export function pixelLook(kind, step, levels) {
    const lit = ['beams', 'sides', 'floor', 'wash'].filter((k) => (levels[k] ?? 0) > 0.05).length;
    const plan = PIXEL_PLAN[kind] ?? PIXEL_PLAN.groove;
    if (lit < 2) return { pixel: 0 };
    return { pixel: plan.level, ...PIXEL[plan.patterns[step % plan.patterns.length]] };
}

// Each kind's looks: which groups are lit, position, movement, alternating, extras
const PLAN = {
    intro: {
        phrase: 4, energyFollow: 1, base: { haze: 0.9, stars: 0.5, pulseAmount: 0.15 },
        // progressive: groups join as the song grows (clamped at the last step)
        steps: [
            { levels: { ...OFF, wash: 0.6 }, pos: 'sky', move: 'sway' },
            { levels: { ...OFF, wash: 0.8, sides: 0.7 }, pos: 'wide', move: 'sway' },
            { levels: { ...OFF, wash: 1, sides: 1, beams: 0.6 }, pos: 'sky', move: 'drift', alt: 0.5 },
        ],
    },
    calm: {
        phrase: 8, energyFollow: 0.5, base: { haze: 0.85, stars: 0.5, pulseAmount: 0.2, intensity: 0.65 },
        steps: [
            { levels: { ...OFF, wash: 1, sides: 1 }, pos: 'cross', move: 'sway' },
            { levels: { ...OFF, wash: 1, beams: 1 }, pos: 'sky', move: 'drift', alt: 1 },
            { levels: { ...OFF, sides: 1 }, pos: 'wide', move: 'sway' },                 // one group alone
            { levels: { ...OFF, wash: 1 }, pos: 'sky', move: 'sway' },                    // washes alone
        ],
    },
    groove: {
        phrase: 4, energyFollow: 0.3, base: { haze: 0.6, stars: 0.3, pulseAmount: 0.5, intensity: 0.9 },
        steps: [
            { levels: { ...ALL, laser: 0 }, pos: 'wide', move: 'wave' },
            { levels: { ...ALL, floor: 0, laser: 0 }, pos: 'cross', move: 'chase', alt: 1 },
            { levels: { ...OFF, beams: 1, floor: 1, wash: 0.6 }, pos: 'audience', move: 'wave' },
            { levels: { ...OFF, sides: 1, floor: 1, wash: 0.6 }, pos: 'vee', move: 'ballyhoo', alt: 1 },
            { levels: { ...ALL, laser: 0 }, pos: 'sky', move: 'chase' },
            { levels: { ...ALL, laser: 0 }, pos: 'tight', move: 'sway', alt: 1 },
        ],
    },
    peak: {
        phrase: 4, energyFollow: 0.2, base: { haze: 0.3, stars: 1, pulseAmount: 1, intensity: 1.35, laser: 1, laserAmount: 1, laserSpread: 1.8 },
        steps: [
            { levels: { ...ALL }, pos: 'vee', move: 'ballyhoo' },
            { levels: { ...ALL }, pos: 'audience', move: 'chase', alt: 1 },
            { levels: { ...ALL }, pos: 'cross', move: 'frenzy' },
            { levels: { ...OFF, beams: 1, wash: 0.5, laser: 1 }, pos: 'tight', move: 'chase' },   // one group + lasers
            { levels: { ...ALL }, pos: 'wide', move: 'ballyhoo', alt: 1 },
            { levels: { ...ALL }, pos: 'sky', move: 'frenzy' },
        ],
    },
    breakdown: {
        phrase: 4, energyFollow: 0.6, base: { haze: 0.85, stars: 0.4, pulseAmount: 0.25, intensity: 0.7, laser: 0 },
        // slowing down phrase by phrase (speed scale below)
        steps: [
            { levels: { ...OFF, wash: 1 }, pos: 'sky', move: 'wave' },                    // washes alone
            { levels: { ...OFF, wash: 1, sides: 0.8 }, pos: 'wide', move: 'sway' },
            { levels: { ...OFF, wash: 0.8, sides: 0.8, beams: 0.6 }, pos: 'sky', move: 'drift' },
        ],
    },
    outro: {
        phrase: 8, energyFollow: 0.5, base: { haze: 0.9, stars: 0.6, pulseAmount: 0.1, intensity: 0.5, laser: 0 },
        steps: [{ levels: { ...OFF, wash: 1, sides: 0.6, beams: 0.4 }, pos: 'sky', move: 'drift' }],
    },
};
PLAN.build = { phrase: 2, energyFollow: 0.4, base: { haze: 0.5, stars: 0.4, pulseAmount: 0.6 } }; // generated step by step

// More colours: each kind rotates through its own palette
const PALETTES = {
    quiet: [['#3b5bff', '#a855f7'], ['#19d9ff', '#3b5bff'], ['#00ffc8', '#0066ff'], ['#a855f7', '#ff69b4'], ['#ffe8c8', '#3b5bff']],
    groove: [['#ff3df2', '#19d9ff'], ['#ffb000', '#ff3df2'], ['#00ff3c', '#00ffc8'], ['#ff6a00', '#a855f7'], ['#0066ff', '#ffe600'], ['#ff0055', '#19d9ff']],
    peak: [['#19d9ff', '#ff3df2'], ['#ffe600', '#ff0055'], ['#39ff14', '#0066ff'], ['#ff6a00', '#a855f7'], ['#ffffff', '#19d9ff'],
        ['#ff0055', '#ffd400'], ['#00ffc8', '#ff3df2'], ['#9dff00', '#ff6a00'], ['#3b2bff', '#ffffff'], ['#ff69b4', '#00ffc8']],
};
const SHOT_CYCLE = {
    intro: ['wide'], calm: ['wide', 'high'], groove: ['wide', 'dolly', 'left', 'right'], build: ['dolly'],
    peak: ['drop', 'left', 'high', 'right'], focus: ['drop'], breakdown: ['wide', 'high'], outro: ['wide'],
};

const round = (s) => Math.round(s * 1000) / 1000;

/** Moments where the energy jumps (a sudden burst), as times in seconds, strongest first. */
export function energySpikes(energy, { threshold = 0.18 } = {}) {
    const spikes = [];
    for (let i = 2; i < energy.length; i++) {
        const jump = energy[i] - Math.min(energy[i - 1], energy[i - 2]);
        if (jump > threshold) spikes.push({ t: i / 2, jump });
    }
    return spikes.sort((a, b) => b.jump - a.jump);
}

/**
 * `extras` are per-song touches (public/shows/<slug>.extras.json), e.g. for Yellow:
 *   { "tintAtDrops": { "color": "#ffd400", "beats": 8 },
 *     "tints": [{ "t": 41.5, "color": "#ffd400", "beats": 4 }] }
 * tintAtDrops turns every lit fixture that colour at each drop; tints do it at given moments.
 * `co2: true` gives the song the CO2 jets: a blast as each drop lands, and a CO2 solo
 * (`t` in seconds, or `bar`; `strobe: true` also fires the strobes in that colour); tintSpans hold a
 * colour over a whole stretch ({ fromBar, toBar?, color }); paletteSpans give a stretch its own colour
 * pairs ({ from, to?, palettes: [[a, b], ...] }, seconds). `sections` is a hand-annotated structure (taken as
 * written: it says 'breakdown' where it means one; `free: true` on an intro lights it off the beat) that replaces the
 * automatic one: [{ "fromBar": 0, "kind": "intro" }, { "fromBar": 8, "kind": "calm" }, ...], each
 * running until the next (bars are the analysis's own bar lines, so cues land exactly on them).
 *
 * `genre` (default: the analysis's own) picks the lighting style (genres.js): how a peak starts
 * ('spool' EDM drop, 'lift' for a chorus, 'slam' for a rap hook), and rap's blackout-and-slam where
 * the beat cuts out and comes back (analysis.moments). A beatless intro (section.free) is lit
 * free-flowing, off the beat.
 */
export function programShow(analysis, { title, audio, blackout = true, extras = null, genre } = {}) {
    const { beats, downbeats } = analysis;
    const energy = analysis.energy || [];
    const barStarts = downbeats.map((i) => beats[i]);
    const genreKey = normaliseGenre(genre ?? analysis.genre);
    const style = GENRES[genreKey].drop;
    const beat = 60 / analysis.bpm;
    const bar = beat * (analysis.meter ?? 4);
    const moves = movesFor(analysis.bpm);
    const barsBetween = (from, to) => barStarts.filter((t) => t >= from - 0.01 && t < to - 0.01);
    // CO2 jets (per song, from its extras): a blast of every jet unless a pattern is given
    const co2 = Boolean(extras?.co2);
    // (a blast of every floor jet on a drop brings the truss CO2 in with it)
    const blast = (t, jets = 'all', len = CO2_BLAST) => {
        if (!co2) return;
        hits.push({ t: round(t), kind: 'co2', dur: round(len), jets });
        if (jets === 'all' && len >= CO2_BLAST) hits.push({ t: round(t), kind: 'co2Truss', dur: round(len), jets: 'all' });
    };
    const nearestBar = (t) => barStarts.reduce((best, b) => (Math.abs(b - t) < Math.abs(best - t) ? b : best), barStarts[0] ?? t);

    // A curated structure (demo songs) replaces the automatic sections
    const barTime = (b) => barStarts[Math.max(0, Math.min(barStarts.length - 1, b))];
    const energyBetween = (from, to) => {
        const slice = energy.slice(Math.floor(from * 2), Math.ceil(to * 2));
        return slice.length ? slice.reduce((s, v) => s + v, 0) / slice.length : 0.5;
    };
    const curated = extras?.sections?.map((s, k, all) => {
        const start = round(barTime(s.fromBar));
        const end = round(all[k + 1] ? barTime(all[k + 1].fromBar) : analysis.duration);
        return {
            start, end, kind: s.kind, bars: (all[k + 1]?.fromBar ?? barStarts.length) - s.fromBar, energy: round(energyBetween(start, end)),
            ...(s.label ? { label: s.label } : {}), ...(s.free ? { free: true } : {}),
        };
    });

    // Every song ends with an outro: without one, the last 5 seconds become it (fading to black)
    let raw = curated ?? analysis.sections;
    if (blackout && raw.length && raw.at(-1).kind !== 'outro') {
        const cut = analysis.duration - 5;
        raw = raw.filter((s) => s.start < cut - 0.01).map((s) => (s.end > cut ? { ...s, end: cut } : s));
        raw.push({ start: cut, end: analysis.duration, kind: 'outro', bars: 0, energy: 0 });
    }
    // A non-peak section right after a peak is a breakdown (a build stays a build: it's climbing into
    // the next peak). A hand-marked structure is taken as written: it says 'breakdown' where it means one.
    const labelled = raw.map((s, i, all) => ({
        ...s,
        kind: !curated && s.kind !== 'peak' && s.kind !== 'build' && i > 0 && all[i - 1].kind === 'peak' && i < all.length - 1 ? 'breakdown' : s.kind,
    }));
    // The energy should climb in steps: calm, then groove, then build. A quiet section leading
    // straight into a build or a peak grooves for its second half (a short one grooves throughout).
    const sections = [];
    labelled.forEach((s, i) => {
        const next = labelled[i + 1];
        const quiet = s.kind === 'calm' || (s.kind === 'breakdown' && !curated) || (s.kind === 'intro' && i > 0);
        if (quiet && (next?.kind === 'build' || next?.kind === 'peak')) {
            const bars = barsBetween(s.start, s.end);
            if (bars.length >= 8) {
                const mid = bars[Math.floor(bars.length / 2 / 2) * 2];
                sections.push({ ...s, end: mid }, { ...s, start: mid, kind: 'groove' });
                return;
            }
            sections.push({ ...s, kind: 'groove' });
            return;
        }
        sections.push(s);
    });

    // The focus section: 8 bars from the biggest energy spike inside a peak (or the middle of the
    // longest peak when there's no clear spike)
    const spikes = energySpikes(energy);
    const peaks = sections.filter((s) => s.kind === 'peak');
    let focus = null;
    // It goes in the loudest peak (the song's climax): at its biggest burst of energy, or in its
    // middle if the energy there is steady
    // (the loudest of the peaks long enough to hold it, if any are; otherwise the loudest)
    const roomy = peaks.filter((p) => barsBetween(p.start, p.end).length >= 10);
    const climax = peaks.length ? (roomy.length ? roomy : peaks).reduce((a, b) => (b.energy > a.energy ? b : a)) : null;
    if (climax) {
        const spike = energySpikes(energy, { threshold: 0.08 }).find((sp) => sp.t > climax.start + 2 * bar && sp.t < climax.end - 8 * bar);
        const bars = barsBetween(climax.start, climax.end);
        if (spike) {
            const start = nearestBar(spike.t);
            focus = { start, end: start + 8 * bar };
        } else if (bars.length >= 10) {
            // in its middle; a shorter climax (10-11 bars) right after its 2-bar opening
            const start = bars.length >= 12 ? bars[Math.floor(bars.length / 2 / 4) * 4] : bars[2];
            focus = { start, end: start + 8 * bar };
        }
    }
    const inFocus = (t) => focus && t >= focus.start - 0.01 && t < focus.end - 0.01;

    const counters = { quiet: 0, groove: 0, peak: 0 };
    const spanCounters = new Map();
    const palette = (kind, t = -1) => {
        // a per-song palette span (e.g. Yellow's shades of yellow) wins inside its time range
        const span = (extras?.paletteSpans || []).find((p) => t >= p.from - 0.01 && t < (p.to ?? Infinity));
        if (span) {
            const n = spanCounters.get(span) ?? 0;
            spanCounters.set(span, n + 1);
            return span.palettes[n % span.palettes.length];
        }
        const set = kind === 'peak' || kind === 'focus' ? 'peak' : kind === 'groove' || kind === 'build' ? 'groove' : 'quiet';
        return PALETTES[set][counters[set]++ % PALETTES[set].length];
    };
    const lookFor = (kind, step, pair, extra = {}) => {
        const plan = PLAN[kind];
        const steps = plan.steps;
        // the intro's steps are progressive (stay on the last); the rest rotate
        const pick = kind === 'intro' ? steps[Math.min(step, steps.length - 1)] : steps[step % steps.length];
        return {
            ...plan.base, ...pick.levels, ...pixelLook(kind, step, pick.levels), ...laserLook(kind, step), ...POSITIONS[pick.pos], ...moves[pick.move],
            strobeRandom: RANDOM_STROBES[kind]?.share ?? 0, strobeRandomRate: (RANDOM_STROBES[kind]?.perBeat ?? 1) / beat,
            alternate: pick.alt ?? 0, sparkle: 0, converge: 0, energyFollow: plan.energyFollow, master: 1, sidesAim: 0, focusFloor: 0, laserSpread: plan.base.laserSpread ?? 1,
            colorA: pair[0], colorB: pair[1], washColor: mixHex(pair[0], pair[1], 0.5), laserColor: pair[1],
            ...extra,
        };
    };

    const cues = [];
    const hits = [];

    // The ending (every song): the side towers alone, every beam in a tower parallel (no sweep, no
    // wave), level, turning only horizontally: crossing (left beams on the right) -> flaring out
    // through ~100 degrees -> straight at the audience -> crossing again
    const towerEnding = (start, end, name, pair) => {
        const look = { ...lookFor('breakdown', 0, pair), ...OFF, sides: 1, sidesAim: 0, tiltShift: -0.15, sweep: 0, phaseSpread: 0, intensity: 0.8 };
        cues.push({ t: round(start), fade: round(Math.min(beat, (end - start) * 0.1)), name, look, shot: 'wide' });
        const from = start + Math.min(bar, (end - start) * 0.15);
        const span = Math.max(0.5, end - from);
        cues.push({ t: round(from), fade: round(span * 0.45), name: `${name} · flaring out`, look: { sidesAim: -2 } });
        cues.push({ t: round(from + span * 0.5), fade: round(span * 0.2), name: `${name} · to the audience`, look: { sidesAim: -1 } });
        cues.push({ t: round(from + span * 0.75), fade: round(span * 0.25), name: `${name} · crossing`, look: { sidesAim: 0 } });
    };

    // EDM-style drops rotate through three ways real shows land them (a song with one drop gets
    // the laser spool; the next drops differ):
    //   spool  everything dark, the lasers spool up from the centre, then the rig slams in
    //   slam   a full beat of total blackout (the pause before the drop), then everything at once
    //   burst  every beam pinched onto one point, exploding out over the crowd on the next beat
    const DROP_STYLES = ['spool', 'slam', 'burst'];
    let drops = 0;

    sections.forEach((section, i) => {
        const kind = section.kind;
        const next = sections[i + 1];
        const bars = barsBetween(section.start, section.end);
        const name = `${kind[0].toUpperCase()}${kind.slice(1)} ${i + 1}`;
        const cycle = SHOT_CYCLE[kind] || ['wide'];
        let pair = palette(kind, section.start);
        let step = i % 3; // vary where each section starts in its rotation

        if (kind === 'intro' && section.free) {
            // A beatless intro (an alaap, a piano opening): no pulse on the beat, washes and side
            // towers drifting slowly, swelling and fading with the music
            // (following the loudness only halfway: a soft vocal opening still glows instead of going dark)
            const free = { pulseAmount: 0, energyFollow: 0.5, laser: 0, strobeRandom: 0, ...moves.drift };
            const len = section.end - section.start;
            cues.push({ t: round(section.start), fade: round(Math.min(4, len / 3)), name: `${name} · free`, look: { ...lookFor('intro', 0, pair), ...free }, shot: 'wide' });
            cues.push({ t: round(section.start + len / 2), fade: round(len / 2), name: `${name} · free, opening up`, look: { ...lookFor('intro', 1, pair), ...free } });
        } else if (kind === 'intro') {
            // Blackout, then the groups come in as the song grows
            cues.push({ t: round(section.start), fade: 0, name, look: { ...lookFor('intro', 0, pair), master: 0 }, shot: 'wide' });
            bars.forEach((t, b) => {
                if (b === 0 || b % 2) return;
                cues.push({ t: round(t), fade: round(2 * bar), name: `${name} · phrase ${b / 2 + 1}`, look: lookFor('intro', b / 2 - 1, pair), shot: cycle[0] });
            });
        } else if (kind === 'build' || (kind === 'groove' && next?.kind === 'peak' && bars.length > 12)) {
            // A long build grooves first and only builds over its last 8 bars
            const longBuild = bars.length > 12;
            const buildFrom = longBuild ? bars.length - 8 : 0;
            if (longBuild) {
                cues.push({ t: round(section.start), fade: round(4 * beat), name: `Groove ${i + 1}`, look: lookFor('groove', step, pair), shot: 'wide' });
                for (let b = 4; b < buildFrom; b += 4) {
                    pair = b % 8 ? pair : palette('groove', bars[b]);
                    cues.push({ t: round(bars[b]), fade: round(2 * beat), name: `Groove ${i + 1} · phrase ${b / 4 + 1}`, look: lookFor('groove', ++step, pair), shot: SHOT_CYCLE.groove[(b / 4) % 4] });
                }
            }
            // Build: every 2 bars faster, wider, brighter; it opens with the lasers alone
            const n = Math.max(1, Math.ceil((bars.length - buildFrom) / 2));
            for (let k = 0; k < n; k++) {
                const b = buildFrom + k * 2;
                if (b >= bars.length) break;
                const p = n > 1 ? k / (n - 1) : 1;
                const base = { ...PLAN.build.base, ...POSITIONS[p < 0.5 ? 'tight' : 'wide'], energyFollow: PLAN.build.energyFollow, master: 1, sparkle: 0, converge: 0,
                    colorA: pair[0], colorB: pair[1], washColor: mixHex(pair[0], pair[1], 0.5), laserColor: pair[0],
                    sweep: 0.15 + 0.35 * p, speed: moves.sway.speed * (1 + 3 * p), phaseSpread: 0.6, alternate: p >= 0.5 ? 1 : 0, intensity: 0.55 + 0.35 * p };
                const look = k === 0
                    ? { ...base, ...OFF, ...laserLook('build', 0), laserTower: 0, laser: 1, laserAmount: 0.4 }  // the floor lasers alone, one by one
                    : { ...base, ...ALL, ...PIXEL.both, ...laserLook('build', k), laserTower: p >= 0.5 ? 1 : 0, pixelSparkle: p, laser: 0.3 + 0.5 * p, laserAmount: 0.4 + 0.6 * p,
                        // random strobes thicken and speed up toward the drop
                        strobeRandom: 0.2 + 0.7 * p, strobeRandomRate: (1 + 3 * p) / beat };
                cues.push({ t: round(bars[b]), fade: round(k === 0 ? 2 * beat : 2 * bar), name: k === 0 ? name : `${name} · phrase ${k + 1}`, look, shot: 'dolly' });
            }
        } else if (kind === 'peak') {
            const continues = sections[i - 1]?.kind === 'peak'; // the same chorus carrying on: no new drop
            if (continues) {
                cues.push({ t: round(section.start), fade: round(beat), name, look: lookFor('peak', step, pair), shot: cycle[0] });
            } else if (style === 'lift') {
                // A chorus: no blackout, the whole rig lifts in with a blinder hit
                cues.push({ t: round(section.start), fade: round(beat / 2), name: `${name} · chorus`, look: lookFor('peak', step, pair), shot: cycle[0] });
                hits.push({ t: round(section.start), kind: 'blinder', dur: round(beat) });
                blast(section.start);
            } else if (style === 'slam') {
                // A rap hook: everything slams in on the first beat with a strobe hit
                cues.push({ t: round(section.start), fade: 0, name: `${name} · hook`, look: lookFor('peak', step, pair), shot: cycle[0] });
                hits.push({ t: round(section.start), kind: 'strobe', dur: round(2 * beat) });
                hits.push({ t: round(section.start), kind: 'blinder', dur: round(beat) });
                blast(section.start);
            } else if (DROP_STYLES[drops % DROP_STYLES.length] === 'slam' && section.start > bar) {
                drops++;
                // The pause: one beat of total blackout, then everything slams in at once: every group
                // full, beams fanned wide over the crowd, all the lasers together, a burst and blinders
                cues.push({ t: round(section.start - beat), fade: 0, name: `${name} · the pause`, look: { master: 0 } });
                cues.push({
                    t: round(section.start), fade: 0, name: `${name} · slam`, shot: cycle[0],
                    look: { ...lookFor('peak', step, pair), ...ALL, ...POSITIONS.wide, tiltShift: -0.1, laser: 1, laserSeq: 0, laserAmount: 1, laserSpread: 1.8, master: 1 },
                });
                hits.push({ t: round(section.start), kind: 'burst', dur: round(4 * beat) });
                hits.push({ t: round(section.start), kind: 'blinder', dur: round(2 * beat) });
                blast(section.start);
                if (bars[2]) cues.push({ t: round(bars[2]), fade: round(beat), name: `${name} · all in`, look: lookFor('peak', ++step, pair) });
            } else if (DROP_STYLES[drops % DROP_STYLES.length] === 'burst') {
                drops++;
                // Pinched to one point with a strobe hit, then the beams explode out across the crowd
                cues.push({
                    t: round(section.start), fade: round(beat / 4), name: `${name} · pinch`, shot: cycle[0],
                    look: { ...lookFor('peak', step, pair), ...ALL, converge: 1, focusFloor: 0, sweep: 0.05, alternate: 0, sparkle: 0, laser: 0.6, laserAmount: 0.3, intensity: 1.45 },
                });
                hits.push({ t: round(section.start), kind: 'burst', dur: round(2 * beat) });
                cues.push({
                    t: round(section.start + beat), fade: round(beat), name: `${name} · burst out`,
                    look: { converge: 0, ...POSITIONS.vee, fan: 1.7, tiltShift: -0.05, laserAmount: 1, laserSpread: 1.8, sweep: 0.5 },
                });
                hits.push({ t: round(section.start + beat), kind: 'blinder', dur: round(beat) });
                blast(section.start + beat);
                if (bars[2]) cues.push({ t: round(bars[2]), fade: round(beat), name: `${name} · all in`, look: lookFor('peak', ++step, pair) });
            } else {
                drops++;
                // Drop: a blast, then everything goes dark while the lasers spool up from the centre
                // one or two to the full fan over 2 bars; then the whole rig slams in
                const spool = { ...lookFor('peak', step, pair), ...OFF, ...laserLook('build', 0), laser: 1, laserAmount: 0.08, laserSpread: 1.8, alternate: 0, sweep: 0.1 };
                cues.push({ t: round(section.start), fade: 0, name, look: spool, shot: cycle[0] });
                hits.push({ t: round(section.start), kind: 'drop', dur: round(beat) });
                cues.push({ t: round(section.start + beat / 2), fade: round(2 * bar - beat), name: `${name} · lasers`, look: { laserAmount: 1 } });
                if (bars[2]) {
                    cues.push({ t: round(bars[2]), fade: round(beat / 2), name: `${name} · all in`, look: lookFor('peak', ++step, pair) });
                    hits.push({ t: round(bars[2]), kind: 'blinder', dur: round(beat) });
                }
                // the jets fire as the whole rig slams in after the spool
                blast(bars[2] ?? section.start + 2 * bar);
            }
            for (let b = 4, n = 1; b < bars.length; b += 4, n++) {
                const t = bars[b];
                if (inFocus(t)) continue;
                pair = palette('peak', t); // a new colour pair every phrase
                cues.push({ t: round(t), fade: round(beat), name: `${name} · phrase ${n + 1}`, look: lookFor('peak', ++step, pair), shot: cycle[n % cycle.length] });
            }
            // Strobes and blinders every 2 bars, alternating
            for (let b = 2; b < bars.length; b += 2) {
                if (inFocus(bars[b])) continue;
                hits.push({ t: round(bars[b]), kind: (b / 2) % 2 ? 'strobe' : 'blinder', dur: round(beat) });
            }
            // ...and on every sudden jump in energy: everything full on, with a strobe burst
            // (spikes come strongest first: keep one per 8 bars)
            const burstAt = [];
            for (const sp of spikes) {
                if (burstAt.some((t) => Math.abs(t - sp.t) < 8 * bar)) continue;
                if (sp.t > section.start + bar && sp.t < section.end && !inFocus(sp.t)) {
                    burstAt.push(sp.t);
                    hits.push({ t: round(sp.t), kind: 'burst', dur: round(4 * beat) });
                    hits.push({ t: round(sp.t), kind: 'strobe', dur: round(2 * beat) });
                }
            }
        } else if (kind === 'breakdown' && next?.kind === 'outro') {
            // The last breakdown: the side towers alone, every beam in a tower parallel (no sweep, no
            // wave), level, turning only horizontally: from crossing (left beams on the right), slowly
            // flaring out through ~100 degrees, back to straight at the audience, crossing again;
            // the outro then fades them out
            towerEnding(section.start, section.end, name, pair);
        } else if (kind === 'breakdown') {
            // Blinders alone, then washes alone, then everything slows down
            cues.push({ t: round(section.start), fade: 0, name, look: { ...lookFor('breakdown', 0, pair), ...OFF, blinder: 0 }, shot: 'wide' });
            hits.push({ t: round(section.start), kind: 'blinder', dur: round(2 * beat) });
            for (let b = 1, n = 1; b < bars.length; b += 4, n++) {
                const slow = Math.max(0.3, 1 - n * 0.25);
                const look = lookFor('breakdown', n - 1, pair);
                cues.push({ t: round(bars[b]), fade: round(2 * bar), name: `${name} · phrase ${n + 1}`, look: { ...look, speed: look.speed * slow }, shot: cycle[n % cycle.length] });
            }
        } else if (kind === 'outro' && sections[i - 1]?.kind === 'peak') {
            // The song ends high: a big finish. The whole rig slams onto the centre with blinders,
            // strobes and lasers, then a quick fade to black
            const len = section.end - section.start;
            cues.push({
                t: round(section.start), fade: 0.1, name: `${name} · big finish`, shot: 'drop',
                look: { ...lookFor('peak', 0, pair), ...ALL, wash: 1, laser: 1, laserAmount: 1, laserSpread: 1.8, laserFloor: 1, laserTower: 1, laserSeq: 0, laserCount: 0, converge: 0.9, focusFloor: 0, sweep: 0.1, alternate: 0, intensity: 1.5, energyFollow: 0 },
            });
            hits.push({ t: round(section.start), kind: 'blinder', dur: round(2 * beat) });
            hits.push({ t: round(section.start), kind: 'strobe', dur: round(Math.min(2 * beat, len / 3)) });
            cues.push({ t: round(section.start + Math.min(2 * beat, len / 3)), fade: round(Math.max(1, Math.min(2 * bar, len - 2 * beat))), name: 'Fade to black', look: { master: 0 } });
        } else if (kind === 'outro' && sections[i - 1]?.kind !== 'breakdown') {
            // A quiet ending: washes and side towers drifting slowly into black
            const len = section.end - section.start;
            const look = { ...lookFor('outro', 0, pair), ...OFF, wash: 1, sides: 0.8, sidesAim: -1, tiltShift: 0, ...moves.drift, intensity: 0.6 };
            cues.push({ t: round(section.start), fade: round(Math.min(4 * beat, len / 3)), name: `${name} · soft fade`, look, shot: 'wide' });
            cues.push({ t: round(section.start + len * 0.3), fade: round(Math.max(1, len * 0.7)), name: 'Fade to black', look: { master: 0 } });
        } else if (kind === 'outro') {
            // Slowly into blackout over the whole outro
            const afterSides = sections[i - 1]?.kind === 'breakdown';
            const outroLook = afterSides ? { ...lookFor('outro', 0, pair), ...OFF, sides: 1, sidesAim: 0, tiltShift: -0.15, sweep: 0, phaseSpread: 0, intensity: 0.8 } : lookFor('outro', 0, pair);
            cues.push({ t: round(section.start), fade: round(4 * beat), name, look: outroLook, shot: 'wide' });
            cues.push({ t: round(section.start + 4 * beat), fade: round(Math.max(1, section.end - section.start - 4 * beat)), name: 'Fade to black', look: { master: 0 } });
        } else {
            // calm and groove: a new look every phrase
            const phrase = PLAN[kind].phrase;
            cues.push({ t: round(section.start), fade: round(Math.min(4 * beat, 2.5)), name, look: lookFor(kind, step, pair), shot: cycle[0] });
            for (let b = phrase, n = 1; b < bars.length; b += phrase, n++) {
                if (kind === 'groove' && n % 2 === 0) pair = palette('groove', bars[b]);
                cues.push({ t: round(bars[b]), fade: round(2 * beat), name: `${name} · phrase ${n + 1}`, look: lookFor(kind, ++step, pair), shot: cycle[n % cycle.length] });
            }
        }

        // Riser: the last 2 bars before a peak tighten and speed up (fade over those 2 bars)
        if (next?.kind === 'peak' && kind !== 'peak' && bars.length >= 3) {
            const riserStart = bars[bars.length - 2];
            cues.push({
                t: round(riserStart), fade: round(next.start - riserStart), name: `Riser into ${next.kind} ${i + 2}`, shot: 'dolly',
                look: { ...ALL, intensity: 1.2, fan: 0.5, tiltShift: 0, converge: 0.85, sweep: 0.08, speed: moves.chase.speed * 2, phaseSpread: 0, alternate: 0, laser: 0.8, laserAmount: 0.6, haze: 0.35, pulseAmount: 0.8 },
            });
        }
    });

    // Focus: aimed at the centre of the stage floor, random beams flicking on and off, one colour
    // at a time for the whole rig, crossfading smoothly every 2 bars
    if (focus) {
        const FOCUS_COLORS = ['#19d9ff', '#ff3df2', '#ffffff', '#a855f7', '#ffe600', '#00ff3c', '#ff0055', '#0066ff'];
        const first = counters.peak;
        for (let k = 0; k < 4; k++) {
            const c = FOCUS_COLORS[(first + k) % FOCUS_COLORS.length];
            // phrases 2 and 4: two colours, every other beam in each, all aimed at the centre
            const pair = k % 2 ? [c, FOCUS_COLORS[(first + k + 3) % FOCUS_COLORS.length]] : [c, c];
            cues.push({
                t: round(focus.start + k * 2 * bar), fade: round(k === 0 ? beat : bar), name: k === 0 ? 'Focus' : `Focus · phrase ${k + 1}${k % 2 ? ' · two colours' : ''}`, shot: 'drop',
                look: { ...ALL, ...PIXEL.sparkle, pixelColor: k % 2 ? 0.5 : 0, wash: 0, floor: 0, laser: 0, ...POSITIONS.centre, converge: 0.95, focusFloor: 1, sparkle: k % 2 ? 0.4 : 1, alternate: 0, intensity: 1.4,
                    sweep: 0.12, speed: moves.chase.speed, phaseSpread: 1, colorA: pair[0], colorB: pair[1], washColor: pair[0], laserColor: pair[0], energyFollow: 0, pulseAmount: 1 },
            });
            hits.push({ t: round(focus.start + k * 2 * bar), kind: 'blinder', dur: round(beat) });
        }
        // back to the peak's movement afterwards
        cues.push({ t: round(focus.end), fade: round(beat), name: 'After focus', look: { sparkle: 0, converge: 0, focusFloor: 0, floor: 1, wash: 0.8, ...PIXEL.both, ...POSITIONS.vee, ...moves.ballyhoo } });
    }

    // Rap: the beat cuts out (everything dark), then slams back in with a burst of everything and
    // strobes. Cues landing inside the gap stay dark until the slam.
    for (const m of analysis.moments || []) {
        if (m.end - m.start < 0.2 || inFocus(m.start)) continue;
        for (const cue of cues) if (cue.t > m.start && cue.t < m.end && cue.look) cue.look = { ...cue.look, master: 0 };
        cues.push({ t: round(m.start), fade: 0.05, name: 'Beat cuts out', look: { master: 0 } });
        cues.push({ t: round(m.end), fade: 0, name: 'Beat slams back', look: { master: 1 } });
        hits.push({ t: round(m.end), kind: 'burst', dur: round(4 * beat) });
        hits.push({ t: round(m.end), kind: 'strobe', dur: round(2 * beat) });
    }
    cues.sort((x, y) => x.t - y.t);

    // Vocal focus: the strongest sung phrases outside the peaks (verses, quiet parts) get the beams
    // gathered on centre stage, where the singer stands, pulsing on the beat: up to two per song,
    // 4 bars each, at least 16 bars apart
    const vocalSpots = [];
    const vocals = analysis.vocals || [];
    if (vocals.length && blackout) {
        const avg = (t0, t1) => {
            const x = vocals.slice(Math.floor(t0 * 2), Math.ceil(t1 * 2));
            return x.length ? x.reduce((a, v) => a + v, 0) / x.length : 0;
        };
        const sorted = [...vocals].sort((a, b) => a - b);
        const strong = Math.max(0.4, sorted[Math.floor(sorted.length * 0.75)] ?? 0);
        const candidates = [];
        sections.forEach((sec) => {
            if (!['calm', 'groove', 'breakdown'].includes(sec.kind)) return;
            const sb = barsBetween(sec.start, sec.end);
            for (let b = 4; b + 4 <= sb.length; b += 4) {
                const t0 = sb[b];
                const t1 = t0 + 4 * bar;
                const level = avg(t0, t1);
                const clear = !hits.some((h) => h.t >= t0 - 0.01 && h.t < t1 && (h.kind === 'drop' || h.kind === 'burst')) && !(focus && t1 > focus.start && t0 < focus.end);
                if (level >= strong && clear && t1 <= sec.end + bar / 4) candidates.push({ t0, t1, level, kind: sec.kind });
            }
        });
        for (const c of candidates.sort((a, b) => b.level - a.level)) {
            if (vocalSpots.length >= 2) break;
            if (vocalSpots.some((v) => Math.abs(v.t0 - c.t0) < 16 * bar)) continue;
            vocalSpots.push(c);
        }
        for (const v of vocalSpots) {
            for (let j = cues.length - 1; j >= 0; j--) if (cues[j].t >= v.t0 - 0.01 && cues[j].t < v.t1 - 0.01) cues.splice(j, 1);
            const pair = palette('groove', v.t0);
            cues.push({
                t: round(v.t0), fade: round(beat), name: 'Vocal focus', shot: 'dolly',
                look: { ...OFF, beams: 1, sides: 0.5, wash: 0.5, ...POSITIONS.centre, converge: 0.9, focusFloor: 0.7, sweep: 0.06, speed: moves.drift.speed, phaseSpread: 0,
                    tiltWave: 0, alternate: 0, sparkle: 0, pulseAmount: 1, energyFollow: 0.3, intensity: 1.15, master: 1,
                    colorA: pair[0], colorB: pair[1], washColor: mixHex(pair[0], pair[1], 0.5) },
            });
            cues.push({ t: round(v.t1), fade: round(beat), name: 'After vocal focus', look: { ...lookFor(v.kind, 1, palette(v.kind, v.t1)), converge: 0, focusFloor: 0 } });
        }
    }

    // Solos: every song gives each fixture type 4 bars alone in full focus (side towers, aerial
    // beams, floor, washes tilting and changing colour, floor lasers, tower lasers, random strobes),
    // nothing else firing meanwhile. (The LED bars have no solo: alone they looked plain.)
    // Slots are 4-bar phrases inside calm/groove/breakdown sections (at most two per section,
    // round-robin so they spread through the song), then peaks where they won't swallow a burst.
    const SOLO = bar > 3 ? 2 : 4; // bars per solo
    const SOLOS = [
        { label: 'side towers', look: { ...OFF, sides: 1, sidesAim: 0, ...moves.sway, sweep: 0.8, phaseSpread: 0 } },
        { label: 'aerial beams', look: { ...OFF, beams: 1, ...POSITIONS.wide, ...moves.wave } },
        { label: 'floor', look: { ...OFF, floor: 1, ...POSITIONS.vee, ...moves.chase } },
        { label: 'washes', washes: true, look: { ...OFF, wash: 1, washSweep: 1, ...moves.sway, sweep: 0.5 } },
        // every newer effect gets its own solo too: the floor lasers and the tower lasers separately,
        // the random coloured strobes, the LED bars
        { label: 'floor lasers', look: { ...OFF, ...laserLook('build', 0), laserTower: 0, laser: 1, laserAmount: 1, laserSpread: 1.8, laserChase: 0, laserCount: 1 } },
        { label: 'tower lasers', look: { ...OFF, ...laserLook('build', 0), laserFloor: 0, laser: 1, laserAmount: 1, laserSpread: 1.8, laserChase: 0, laserCount: 1 } },
        { label: 'strobes', look: { ...OFF, strobeRandom: 0.45, strobeRandomRate: 2 / beat } },
        // the CO2 jets, on a dimly washed stage so the plumes catch some colour
        ...(co2 ? [{ label: 'CO2', co2: true, look: { ...OFF, wash: 0.4, ...moves.hold } }] : []),
    ];
    // a slot can't hold a drop, a burst or the focus section
    const busy = (t0, t1) => hits.some((h) => h.t >= t0 - 0.01 && h.t < t1 - 0.01 && (h.kind === 'drop' || h.kind === 'burst'))
        || (focus && t1 > focus.start && t0 < focus.end)
        || vocalSpots.some((v) => t1 > v.t0 && t0 < v.t1);
    const pools = [];
    sections.forEach((sec, i) => {
        const finalBreakdown = sec.kind === 'breakdown' && sections[i + 1]?.kind === 'outro';
        if (!['calm', 'groove', 'breakdown', 'peak'].includes(sec.kind) || finalBreakdown) return;
        const bars = barsBetween(sec.start, sec.end);
        const slots = [];
        // never a section's opening phrase (nor a peak's laser spool)
        for (let b = 4; b + SOLO <= bars.length; b += SOLO) {
            const t0 = bars[b];
            const t1 = t0 + SOLO * bar;
            // (a quarter-bar of slack: the tempo drifts a little across a real song)
            if (t1 <= sec.end + bar / 4 && !busy(t0, t1)) slots.push(t0);
        }
        if (slots.length) {
            const mid = Math.floor(slots.length / 2);
            pools.push({ peak: sec.kind === 'peak', slots: [...slots.slice(mid), ...slots.slice(0, mid)], used: 0 });
        }
    });
    const order = [...pools.filter((p) => !p.peak), ...pools.filter((p) => p.peak)];
    // a full song gets all five; the short looping idle show just one, so it keeps moving
    const maxSolos = blackout ? SOLOS.length : 1;
    const chosen = [];
    // two per section first; later passes allow a third, then a fourth, where a song has little room
    // (every fixture type and effect gets its solo)
    for (let pass = 0; pass < 4 && chosen.length < maxSolos; pass++) {
        const cap = pass < 2 ? 2 : pass + 1;
        for (const pool of order) {
            if (chosen.length >= maxSolos) break;
            if (pool.used >= cap) continue;
            const t = pool.slots.find((x) => !chosen.some((c) => Math.abs(c - x) < SOLO * bar - 0.01));
            if (t !== undefined) {
                chosen.push(t);
                pool.used++;
            }
        }
    }
    // Still short (a song with few long calm, groove or peak sections): the last solos may take the
    // opening phrase of a groove (calm parts and breakdowns keep their own openings), so every
    // fixture type and effect gets one
    if (chosen.length < maxSolos) {
        sections.forEach((sec) => {
            if (chosen.length >= maxSolos || sec.kind !== 'groove') return;
            // a groove holding a solo already keeps its opening, so it still has a phrase of its own
            if (chosen.some((c) => c >= sec.start - 0.01 && c < sec.end - 0.01)) return;
            const t0 = sec.start;
            const t1 = t0 + SOLO * bar;
            if (t1 <= sec.end + bar / 4 && !busy(t0, t1) && !chosen.some((c) => Math.abs(c - t0) < SOLO * bar - 0.01)) chosen.push(t0);
        });
    }
    // A song short of room for every solo still gets its CO2 solo (the CO2 jets are a highlight):
    // it takes the last slot, in place of the solo that would have come last
    const assigned = co2 && chosen.length < SOLOS.length ? [...SOLOS.slice(0, Math.max(0, chosen.length - 1)), SOLOS.at(-1)] : SOLOS;
    chosen.sort((a, b) => a - b).forEach((at, k) => {
        const solo = assigned[k];
        const end = at + SOLO * bar;
        const host = sections.find((x) => at >= x.start - 0.01 && at < x.end - 0.01);
        for (let j = cues.length - 1; j >= 0; j--) if (cues[j].t >= at - 0.01 && cues[j].t < end - 0.01) cues.splice(j, 1);
        for (let j = hits.length - 1; j >= 0; j--) if (hits[j].t >= at - 0.01 && hits[j].t < end - 0.01) hits.splice(j, 1);
        const pair = palette('peak', at);
        cues.push({
            t: round(at), fade: round(beat / 2), name: `Solo · ${solo.label}`, shot: 'wide',
            look: { ...solo.look, intensity: 1.3, colorA: pair[0], colorB: pair[1], washColor: mixHex(pair[0], pair[1], 0.5), laserColor: pair[0],
                converge: 0, sparkle: 0, alternate: 0, energyFollow: 0, master: 1, sidesAim: solo.look.sidesAim ?? 0 },
        });
        if (solo.washes) {
            // the washes tilt up and down and change colour 4 times through the solo (every bar)
            const step = (SOLO * bar) / 4;
            for (let b = 1; b < 4; b++) {
                const next = palette('peak', at + b * step);
                cues.push({ t: round(at + b * step), fade: round(step), name: `Solo · washes · bar ${b + 1}`, look: { washColor: mixHex(next[0], next[1], 0.5), tiltShift: b % 2 ? 0.35 : -0.35 } });
            }
        }
        if (solo.co2) {
            // a pattern each bar: the outer pair, the middle pair, the inner pair, then all of them
            // together; the last bar ends on one long blast
            const n = Math.round((end - at) / bar);
            const short = Math.max(0.35, 0.8 * beat);
            for (let b = 0; b < n; b++) {
                const t0 = at + b * bar;
                if (b === n - 1) blast(t0, 'all', Math.max(CO2_BLAST, 2 * beat));
                else ['outer', 'middle', 'inner', 'all'].forEach((jets, k) => blast(t0 + k * beat, jets, short));
            }
        }
        // the section picks up again afterwards
        if (host && end < host.end - 0.01) {
            cues.push({ t: round(end), fade: round(beat), name: `${host.kind} after solo`, look: { ...lookFor(host.kind, k + 1, palette(host.kind, end)), washSweep: 0.15 } });
        }
    });

    // Per-song extras: colour tints at every drop and at chosen moments
    if (extras?.tintAtDrops) {
        for (const h of hits.filter((x) => x.kind === 'drop')) {
            hits.push({ t: h.t, kind: 'tint', color: extras.tintAtDrops.color, dur: round((extras.tintAtDrops.beats ?? 8) * beat) });
        }
    }
    for (const tint of extras?.tints || []) {
        const t = tint.bar !== undefined ? barTime(tint.bar) : tint.t;
        hits.push({ t: round(t), kind: 'tint', color: tint.color, dur: round((tint.beats ?? 4) * beat) });
        if (tint.blinder) hits.push({ t: round(t), kind: 'blinder', dur: round(2 * beat) });
        if (tint.strobe) hits.push({ t: round(t), kind: 'strobe', dur: round((tint.beats ?? 1) * beat), color: tint.color });
    }
    // A palette span re-colours the rig exactly where it starts (colours from an earlier cue
    // would otherwise carry into it)
    for (const span of extras?.paletteSpans || []) {
        const pair = palette('peak', span.from);
        cues.push({ t: round(span.from), fade: round(beat), name: 'Colours', look: { colorA: pair[0], colorB: pair[1], washColor: mixHex(pair[0], pair[1], 0.5), laserColor: pair[0] } });
    }
    // ...and every cue inside a span takes its colours from it (a section's pair may have been
    // chosen before the span began)
    for (const cue of cues) {
        const inSpan = (extras?.paletteSpans || []).some((sp) => cue.t >= sp.from - 0.01 && cue.t < (sp.to ?? Infinity));
        if (!inSpan || !cue.look || cue.look.colorA === undefined || cue.name === 'Colours') continue;
        const pair = palette('peak', cue.t);
        Object.assign(cue.look, { colorA: pair[0], colorB: pair[1], washColor: mixHex(pair[0], pair[1], 0.5), laserColor: pair[0] });
    }
    cues.sort((x, y) => x.t - y.t);

    // Whole stretches held in one colour: { fromBar, toBar? (default: the end), color }
    for (const span of extras?.tintSpans || []) {
        const from = barTime(span.fromBar);
        const to = span.toBar !== undefined ? barTime(span.toBar) : analysis.duration;
        hits.push({ t: round(from), kind: 'tint', color: span.color, dur: round(to - from), hold: true });
    }

    // The big special effects (full songs only, not the playground's looping house show):
    //   the biggest drop (the loudest peak): confetti pouring out, and a fireworks volley
    //   the big finish (the closing bars of the song's last loud section): the fireworks finale, and at its closing
    //   volley confetti, streamers and the truss CO2 all together
    const bigPeaks = sections.filter((x) => x.kind === 'peak');
    if (blackout && bigPeaks.length) {
        const random = fwRng((analysis.duration * 7.31 + analysis.bpm * 0.137) % 1);
        const fwOpts = (t) => ({ scheme: 'mixed', show: palette('peak', t) });
        const fire = (t, volley) => volley.forEach(({ delay, launch }) => {
            hits.push({ t: round(t + delay), kind: 'firework', dur: round(fireworkDuration(launch)), fw: launch });
        });
        const climax = bigPeaks.reduce((a, b) => (b.energy > a.energy ? b : a));
        // the moment the rig lands in the climax: its drop's CO2 blast if it has one, else its start
        const landing = hits.find((x) => x.kind === 'co2' && x.t >= climax.start - 0.01 && x.t <= climax.start + 3 * bar)?.t ?? climax.start;
        // the big finish: the last section (not the intro or outro) nearly as loud as the climax; usually
        // the last peak, but a song whose final stretch is marked a groove at peak loudness ends there
        const last = sections.filter((x) => x.kind !== 'intro' && x.kind !== 'outro' && x.energy >= climax.energy - 0.12).at(-1) ?? bigPeaks.at(-1);
        let finish = Math.max(last.start, last.end - 8 * bar);
        finish = Math.min(finish, Math.max(0, analysis.duration - 11)); // the finale (~9 s) ends before the song does
        if (Math.abs(finish - landing) > 12) {
            hits.push({ t: round(landing), kind: 'confetti', dur: 2.5, jets: 'all' });
            fire(landing, dropVolley(random, fwOpts(landing)));
        }
        fire(finish, finale(random, fwOpts(finish)));
        const closing = finish + 6.6;
        hits.push({ t: round(closing), kind: 'confetti', dur: 3, jets: 'all' });
        hits.push({ t: round(closing), kind: 'streamers', dur: 1.6, jets: 'all' });
        hits.push({ t: round(closing), kind: 'co2Truss', dur: 1.2, jets: 'all' });
    }
    hits.sort((a, b) => a.t - b.t);

    const lastKind = sections.at(-1)?.kind;
    if (blackout && lastKind !== 'outro') cues.push({ t: round(analysis.duration - 2), fade: 2, name: 'Blackout', look: { master: 0 }, shot: 'wide' });

    return {
        title,
        audio,
        genre: genreKey,
        duration: analysis.duration,
        bpm: analysis.bpm,
        meter: analysis.meter ?? 4,
        ...(analysis.vocals ? { vocals: analysis.vocals } : {}),
        beats: analysis.beats,
        downbeats: analysis.downbeats,
        sections,
        energy,
        cues: cues.sort((a, b) => a.t - b.t),
        hits: hits.sort((a, b) => a.t - b.t),
    };
}

/**
 * The show the rig runs by itself in the playground until the visitor takes over: 32 bars at
 * 124 BPM (groove, build, peak), looped, with no blackout at the end.
 */
export function buildIdleShow() {
    const bpm = 124;
    const beat = 60 / bpm;
    const bars = 32;
    const beats = Array.from({ length: bars * 4 }, (_, i) => round(i * beat));
    const at = (b) => round(b * 4 * beat);
    const analysis = {
        bpm,
        duration: at(bars),
        beats,
        downbeats: beats.map((_, i) => i).filter((i) => i % 4 === 0),
        energy: [],
        sections: [
            { start: 0, end: at(8), kind: 'groove', bars: 8, energy: 0.5 },
            { start: at(8), end: at(16), kind: 'build', bars: 8, energy: 0.6 },
            { start: at(16), end: at(bars), kind: 'peak', bars: 16, energy: 0.9 },
        ],
    };
    return programShow(analysis, { title: 'House show', blackout: false });
}
