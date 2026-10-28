import { mixHex } from './look.js';

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
        hold: { sweep: 0, speed: cycle(8), phaseSpread: 0 },
        drift: { sweep: 0.2, speed: cycle(8), phaseSpread: 0.3 },
        sway: { sweep: 0.16, speed: cycle(4), phaseSpread: 0 },
        wave: { sweep: 0.32, speed: cycle(2), phaseSpread: 1 },
        chase: { sweep: 0.4, speed: cycle(1), phaseSpread: 0.5 },
        ballyhoo: { sweep: 0.55, speed: cycle(1), phaseSpread: 0.15 },
        frenzy: { sweep: 0.6, speed: cycle(0.5), phaseSpread: 1 },
    };
}

const OFF = { beams: 0, sides: 0, floor: 0, wash: 0, laser: 0 };
const ALL = { beams: 1, sides: 1, floor: 1, wash: 0.8 };

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

export function programShow(analysis, { title, audio, blackout = true } = {}) {
    const { beats, downbeats } = analysis;
    const energy = analysis.energy || [];
    const barStarts = downbeats.map((i) => beats[i]);
    const beat = 60 / analysis.bpm;
    const bar = beat * 4;
    const moves = movesFor(analysis.bpm);
    const barsBetween = (from, to) => barStarts.filter((t) => t >= from - 0.01 && t < to - 0.01);
    const nearestBar = (t) => barStarts.reduce((best, b) => (Math.abs(b - t) < Math.abs(best - t) ? b : best), barStarts[0] ?? t);

    // Every song ends with an outro: without one, the last 5 seconds become it (fading to black)
    let raw = analysis.sections;
    if (blackout && raw.length && raw.at(-1).kind !== 'outro') {
        const cut = analysis.duration - 5;
        raw = raw.filter((s) => s.start < cut - 0.01).map((s) => (s.end > cut ? { ...s, end: cut } : s));
        raw.push({ start: cut, end: analysis.duration, kind: 'outro', bars: 0, energy: 0 });
    }
    // A non-peak section right after a peak is a breakdown
    const labelled = raw.map((s, i, all) => ({
        ...s,
        kind: s.kind !== 'peak' && i > 0 && all[i - 1].kind === 'peak' && i < all.length - 1 ? 'breakdown' : s.kind,
    }));
    // The energy should climb in steps: calm, then groove, then build. A quiet section leading
    // straight into a build or a peak grooves for its second half (a short one grooves throughout).
    const sections = [];
    labelled.forEach((s, i) => {
        const next = labelled[i + 1];
        const quiet = s.kind === 'calm' || s.kind === 'breakdown' || (s.kind === 'intro' && i > 0);
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
    const climax = peaks.length ? peaks.reduce((a, b) => (b.energy > a.energy ? b : a)) : null;
    if (climax) {
        const spike = energySpikes(energy, { threshold: 0.08 }).find((sp) => sp.t > climax.start + 2 * bar && sp.t < climax.end - 8 * bar);
        const bars = barsBetween(climax.start, climax.end);
        if (spike) {
            const start = nearestBar(spike.t);
            focus = { start, end: start + 8 * bar };
        } else if (bars.length >= 12) {
            const start = bars[Math.floor(bars.length / 2 / 4) * 4];
            focus = { start, end: start + 8 * bar };
        }
    }
    const inFocus = (t) => focus && t >= focus.start - 0.01 && t < focus.end - 0.01;

    const counters = { quiet: 0, groove: 0, peak: 0 };
    const palette = (kind) => {
        const set = kind === 'peak' || kind === 'focus' ? 'peak' : kind === 'groove' || kind === 'build' ? 'groove' : 'quiet';
        return PALETTES[set][counters[set]++ % PALETTES[set].length];
    };
    const lookFor = (kind, step, pair, extra = {}) => {
        const plan = PLAN[kind];
        const steps = plan.steps;
        // the intro's steps are progressive (stay on the last); the rest rotate
        const pick = kind === 'intro' ? steps[Math.min(step, steps.length - 1)] : steps[step % steps.length];
        return {
            ...plan.base, ...pick.levels, ...POSITIONS[pick.pos], ...moves[pick.move],
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

    sections.forEach((section, i) => {
        const kind = section.kind;
        const next = sections[i + 1];
        const bars = barsBetween(section.start, section.end);
        const name = `${kind[0].toUpperCase()}${kind.slice(1)} ${i + 1}`;
        const cycle = SHOT_CYCLE[kind] || ['wide'];
        let pair = palette(kind);
        let step = i % 3; // vary where each section starts in its rotation

        if (kind === 'intro') {
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
                    pair = b % 8 ? pair : palette('groove');
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
                    ? { ...base, ...OFF, laser: 1, laserAmount: 0.4 }                     // lasers alone
                    : { ...base, ...ALL, laser: 0.3 + 0.5 * p, laserAmount: 0.4 + 0.6 * p };
                cues.push({ t: round(bars[b]), fade: round(k === 0 ? 2 * beat : 2 * bar), name: k === 0 ? name : `${name} · phrase ${k + 1}`, look, shot: 'dolly' });
            }
        } else if (kind === 'peak') {
            const continues = sections[i - 1]?.kind === 'peak'; // the same chorus carrying on: no new drop
            if (continues) {
                cues.push({ t: round(section.start), fade: round(beat), name, look: lookFor('peak', step, pair), shot: cycle[0] });
            } else {
                // Drop: a blast, then everything goes dark while the lasers spool up from the centre
                // one or two to the full fan over 2 bars; then the whole rig slams in
                const spool = { ...lookFor('peak', step, pair), ...OFF, laser: 1, laserAmount: 0.08, laserSpread: 1.8, alternate: 0, sweep: 0.1 };
                cues.push({ t: round(section.start), fade: 0, name, look: spool, shot: cycle[0] });
                hits.push({ t: round(section.start), kind: 'drop', dur: round(beat) });
                cues.push({ t: round(section.start + beat / 2), fade: round(2 * bar - beat), name: `${name} · lasers`, look: { laserAmount: 1 } });
                if (bars[2]) {
                    cues.push({ t: round(bars[2]), fade: round(beat / 2), name: `${name} · all in`, look: lookFor('peak', ++step, pair) });
                    hits.push({ t: round(bars[2]), kind: 'blinder', dur: round(beat) });
                }
            }
            for (let b = 4, n = 1; b < bars.length; b += 4, n++) {
                const t = bars[b];
                if (inFocus(t)) continue;
                pair = palette('peak'); // a new colour pair every phrase
                cues.push({ t: round(t), fade: round(beat), name: `${name} · phrase ${n + 1}`, look: lookFor('peak', ++step, pair), shot: cycle[n % cycle.length] });
            }
            // Strobes and blinders every 2 bars, alternating
            for (let b = 2; b < bars.length; b += 2) {
                if (inFocus(bars[b])) continue;
                hits.push({ t: round(bars[b]), kind: (b / 2) % 2 ? 'strobe' : 'blinder', dur: round(beat) });
            }
            // ...and on every sudden jump in energy: everything full on, with a strobe burst
            for (const sp of spikes) {
                if (sp.t > section.start + bar && sp.t < section.end && !inFocus(sp.t)) {
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
        } else if (kind === 'outro' && sections[i - 1]?.kind !== 'breakdown') {
            // Every song ends the same way: with no breakdown before the outro, the outro itself runs
            // the side-tower ending, fading to black over its last 40%
            towerEnding(section.start, section.end, name, pair);
            const len = section.end - section.start;
            cues.push({ t: round(section.start + len * 0.6), fade: round(Math.max(1, len * 0.4)), name: 'Fade to black', look: { master: 0 } });
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
                if (kind === 'groove' && n % 2 === 0) pair = palette('groove');
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
            const pair = [c, c];
            cues.push({
                t: round(focus.start + k * 2 * bar), fade: round(k === 0 ? beat : bar), name: k === 0 ? 'Focus' : `Focus · phrase ${k + 1}`, shot: 'drop',
                look: { ...ALL, wash: 0, floor: 0, laser: 0, ...POSITIONS.centre, converge: 0.95, focusFloor: 1, sparkle: 1, alternate: 0, intensity: 1.4,
                    sweep: 0.12, speed: moves.chase.speed, phaseSpread: 1, colorA: pair[0], colorB: pair[1], washColor: pair[0], laserColor: pair[0], energyFollow: 0, pulseAmount: 1 },
            });
            hits.push({ t: round(focus.start + k * 2 * bar), kind: 'blinder', dur: round(beat) });
        }
        // back to the peak's movement afterwards
        cues.push({ t: round(focus.end), fade: round(beat), name: 'After focus', look: { sparkle: 0, converge: 0, focusFloor: 0, floor: 1, wash: 0.8, ...POSITIONS.vee, ...moves.ballyhoo } });
    }

    // Solos: every song gives each fixture type 4 bars alone in full focus (side towers, aerial
    // beams, floor, washes tilting and changing colour, lasers), nothing else firing meanwhile.
    // Slots are 4-bar phrases inside calm/groove/breakdown sections (at most two per section,
    // round-robin so they spread through the song), then peaks where they won't swallow a burst.
    const SOLOS = [
        { label: 'side towers', look: { ...OFF, sides: 1, sidesAim: 0, ...moves.sway, sweep: 0.8, phaseSpread: 0 } },
        { label: 'aerial beams', look: { ...OFF, beams: 1, ...POSITIONS.wide, ...moves.wave } },
        { label: 'floor', look: { ...OFF, floor: 1, ...POSITIONS.vee, ...moves.chase } },
        { label: 'washes', washes: true, look: { ...OFF, wash: 1, washSweep: 1, ...moves.sway, sweep: 0.5 } },
        { label: 'lasers', look: { ...OFF, laser: 1, laserAmount: 1, laserSpread: 1.8, laserChase: 0 } },
    ];
    // a slot can't hold a drop, a burst or the focus section
    const busy = (t0, t1) => hits.some((h) => h.t >= t0 - 0.01 && h.t < t1 - 0.01 && (h.kind === 'drop' || h.kind === 'burst'))
        || (focus && t1 > focus.start && t0 < focus.end);
    const pools = [];
    sections.forEach((sec, i) => {
        const finalBreakdown = sec.kind === 'breakdown' && sections[i + 1]?.kind === 'outro';
        if (!['calm', 'groove', 'breakdown', 'peak'].includes(sec.kind) || finalBreakdown) return;
        const bars = barsBetween(sec.start, sec.end);
        const slots = [];
        // never a section's opening phrase (nor a peak's laser spool)
        for (let b = 4; b + 4 <= bars.length; b += 4) {
            const t0 = bars[b];
            const t1 = t0 + 4 * bar;
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
    // two per section first; a third pass allows a third where a song has little room
    for (let pass = 0; pass < 3 && chosen.length < maxSolos; pass++) {
        const cap = pass < 2 ? 2 : 3;
        for (const pool of order) {
            if (chosen.length >= maxSolos) break;
            if (pool.used >= cap) continue;
            const t = pool.slots.find((x) => !chosen.some((c) => Math.abs(c - x) < 4 * bar - 0.01));
            if (t !== undefined) {
                chosen.push(t);
                pool.used++;
            }
        }
    }
    chosen.sort((a, b) => a - b).forEach((at, k) => {
        const solo = SOLOS[k];
        const end = at + 4 * bar;
        const host = sections.find((x) => at >= x.start - 0.01 && at < x.end - 0.01);
        for (let j = cues.length - 1; j >= 0; j--) if (cues[j].t >= at - 0.01 && cues[j].t < end - 0.01) cues.splice(j, 1);
        for (let j = hits.length - 1; j >= 0; j--) if (hits[j].t >= at - 0.01 && hits[j].t < end - 0.01) hits.splice(j, 1);
        const pair = palette('peak');
        cues.push({
            t: round(at), fade: round(beat / 2), name: `Solo · ${solo.label}`, shot: 'wide',
            look: { ...solo.look, intensity: 1.3, colorA: pair[0], colorB: pair[1], washColor: mixHex(pair[0], pair[1], 0.5), laserColor: pair[0],
                converge: 0, sparkle: 0, alternate: 0, energyFollow: 0, master: 1, sidesAim: solo.look.sidesAim ?? 0 },
        });
        if (solo.washes) {
            // the washes tilt up and down and change colour every bar
            for (let b = 1; b < 4; b++) {
                const next = palette('peak');
                cues.push({ t: round(at + b * bar), fade: round(bar), name: `Solo · washes · bar ${b + 1}`, look: { washColor: mixHex(next[0], next[1], 0.5), tiltShift: b % 2 ? 0.35 : -0.35 } });
            }
        }
        // the section picks up again afterwards
        if (host && end < host.end - 0.01) {
            cues.push({ t: round(end), fade: round(beat), name: `${host.kind} after solo`, look: { ...lookFor(host.kind, k + 1, palette(host.kind)), washSweep: 0.15 } });
        }
    });

    const lastKind = sections.at(-1)?.kind;
    if (blackout && lastKind !== 'outro') cues.push({ t: round(analysis.duration - 2), fade: 2, name: 'Blackout', look: { master: 0 }, shot: 'wide' });

    return {
        title,
        audio,
        duration: analysis.duration,
        bpm: analysis.bpm,
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
