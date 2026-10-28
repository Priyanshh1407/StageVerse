// Turns a song analysis into a lighting show (a timecoded cue sheet), the way a lighting
// designer programs a concert: each section brings in the groups it needs; each phrase (8 bars,
// 4 in peaks) changes the *position* (where the beams point) and the *movement* (one
// coordinated effect, its speed locked to the song's tempo); a riser tightens the beams before
// each peak; peaks open with a drop and keep hitting on phrase starts. Something changes at least
// every few bars, so the show never sits still.

// Positions: how wide the rows fan out, and how high the beams point
export const POSITIONS = {
    wide: { fan: 1.3, tiltShift: 0.1 },
    tight: { fan: 0.55, tiltShift: -0.05 },
    audience: { fan: 0.9, tiltShift: -0.3 },   // straight out into the crowd
    sky: { fan: 1.05, tiltShift: 0.45 },
    cross: { fan: -0.85, tiltShift: 0.05 },     // mirrored: left beams go right and vice versa
    vee: { fan: 1.5, tiltShift: 0.25 },
};

// Movements, with cycle lengths in bars so they lock to the tempo
function movesFor(bpm) {
    const bar = 240 / bpm;
    const cycle = (bars) => (2 * Math.PI) / (bars * bar); // radians per second for one sweep per `bars`
    return {
        hold: { sweep: 0, speed: cycle(8), phaseSpread: 0 },
        sway: { sweep: 0.14, speed: cycle(4), phaseSpread: 0 },
        wave: { sweep: 0.3, speed: cycle(2), phaseSpread: 1 },
        chase: { sweep: 0.38, speed: cycle(1), phaseSpread: 0.5 },
        ballyhoo: { sweep: 0.5, speed: cycle(1), phaseSpread: 0.15 },
    };
}

// Per section kind: phrase length, which groups are in, the base look, and the position/movement
// combinations it rotates through
const PLAN = {
    intro: { phrase: 8, levels: { beams: 0, sides: 0.7, floor: 0, wash: 1, laser: 0 }, base: { intensity: 0.5, haze: 0.9, stars: 0.5, pulseAmount: 0.15, converge: 0 }, combos: [['sky', 'hold'], ['wide', 'sway']] },
    calm: { phrase: 8, levels: { beams: 0.6, sides: 1, floor: 0, wash: 1, laser: 0 }, base: { intensity: 0.6, haze: 0.85, stars: 0.5, pulseAmount: 0.2, converge: 0 }, combos: [['sky', 'sway'], ['cross', 'hold'], ['wide', 'sway']] },
    groove: { phrase: 8, levels: { beams: 1, sides: 1, floor: 0.7, wash: 0.9, laser: 0.3 }, base: { intensity: 0.85, haze: 0.6, stars: 0.3, pulseAmount: 0.45, converge: 0 }, combos: [['wide', 'wave'], ['cross', 'sway'], ['audience', 'wave'], ['sky', 'sway']] },
    build: { phrase: 8, levels: { beams: 1, sides: 1, floor: 1, wash: 0.8, laser: 0.5 }, base: { intensity: 0.95, haze: 0.5, stars: 0.4, pulseAmount: 0.55, converge: 0 }, combos: [['tight', 'chase'], ['wide', 'wave']] },
    peak: { phrase: 4, levels: { beams: 1, sides: 1, floor: 1, wash: 0.7, laser: 1 }, base: { intensity: 1.35, haze: 0.3, stars: 1, pulseAmount: 1, converge: 0 }, combos: [['vee', 'ballyhoo'], ['audience', 'chase'], ['cross', 'wave'], ['wide', 'ballyhoo'], ['sky', 'chase']] },
    outro: { phrase: 8, levels: { beams: 0.5, sides: 0.6, floor: 0, wash: 1, laser: 0 }, base: { intensity: 0.4, haze: 0.9, stars: 0.7, pulseAmount: 0.1, converge: 0 }, combos: [['sky', 'hold']] },
};

// Colour pairs: quiet sections stay in deep blues; each peak gets a new pair
const QUIET_COLORS = [['#3b5bff', '#a855f7'], ['#19d9ff', '#3b5bff']];
const PEAK_COLORS = [
    ['#19d9ff', '#ff3df2'], ['#ffd400', '#ff3df2'], ['#39ff14', '#19d9ff'],
    ['#ff8a00', '#a855f7'], ['#ffffff', '#19d9ff'], ['#ff0055', '#ffd400'],
];
const SHOT_CYCLE = { peak: ['drop', 'left', 'high', 'right'], groove: ['wide', 'dolly'], build: ['dolly'] };

const round = (s) => Math.round(s * 1000) / 1000;

export function programShow(analysis, { title, audio, blackout = true } = {}) {
    const { beats, downbeats, sections } = analysis;
    const barStarts = downbeats.map((i) => beats[i]);
    const beatSeconds = 60 / analysis.bpm;
    const moves = movesFor(analysis.bpm);
    const barsBetween = (from, to) => barStarts.filter((t) => t >= from - 0.01 && t < to - 0.01);
    const lookFor = (kind, comboIndex, pair) => {
        const plan = PLAN[kind];
        const [position, move] = plan.combos[comboIndex % plan.combos.length];
        return {
            ...plan.levels, ...plan.base, ...POSITIONS[position], ...moves[move],
            colorA: pair[0], colorB: pair[1], washColor: kind === 'peak' ? '#3b2bff' : pair[1], laserColor: pair[1],
        };
    };

    const cues = [];
    const hits = [];
    let peakCount = 0;
    let quietCount = 0;

    sections.forEach((section, i) => {
        const kind = section.kind;
        const next = sections[i + 1];
        const pair = kind === 'peak' ? PEAK_COLORS[peakCount++ % PEAK_COLORS.length] : QUIET_COLORS[quietCount++ % QUIET_COLORS.length];
        const fade = kind === 'peak' ? 0.15 : Math.min(4 * beatSeconds, 2.5);
        const name = `${kind[0].toUpperCase()}${kind.slice(1)} ${i + 1}`;
        const bars = barsBetween(section.start, section.end);
        const plan = PLAN[kind];
        let comboIndex = i; // vary the starting combination from section to section

        // A long build grooves first and only builds over its last 8 bars
        const longBuild = kind === 'build' && bars.length > 12;
        if (longBuild) {
            cues.push({ t: round(section.start), fade: round(fade), name: `Groove ${i + 1}`, look: lookFor('groove', comboIndex, pair), shot: 'wide' });
            cues.push({ t: round(bars[bars.length - 8]), fade: round(8 * 4 * beatSeconds), name, look: lookFor('build', comboIndex, pair), shot: 'dolly' });
        } else {
            cues.push({ t: round(section.start), fade: round(fade), name, look: lookFor(kind, comboIndex, pair), shot: SHOT_CYCLE[kind]?.[0] || 'wide' });
        }
        if (kind === 'peak') hits.push({ t: round(section.start), kind: 'drop', dur: round(beatSeconds * 4) });

        // Each phrase: a new position and movement (and in peaks, swapped colours and a hit)
        const phraseBars = plan.phrase;
        for (let b = phraseBars, n = 1; b < bars.length; b += phraseBars, n++) {
            const t = round(bars[b]);
            if (cues.some((c) => c.t === t)) continue; // a section cue already fires here
            const inGroove = longBuild && b < bars.length - 8;
            const phraseKind = inGroove ? 'groove' : kind;
            comboIndex++;
            const cycle = SHOT_CYCLE[phraseKind];
            const swapped = kind === 'peak' && n % 2 ? [pair[1], pair[0]] : pair;
            cues.push({
                t, fade: round(kind === 'peak' ? beatSeconds : 2 * beatSeconds), name: `${name} · phrase ${n + 1}`,
                look: lookFor(phraseKind, comboIndex, swapped), shot: cycle ? cycle[n % cycle.length] : undefined,
            });
            if (kind === 'peak') {
                hits.push({ t, kind: n % 2 ? 'strobe' : 'blinder', dur: round(beatSeconds) });
            }
        }

        // Riser: the last 2 bars before a peak tighten and speed up (fade over those 2 bars)
        if (next?.kind === 'peak' && kind !== 'peak' && bars.length >= 3) {
            const riserStart = bars[bars.length - 2];
            cues.push({
                t: round(riserStart), fade: round(next.start - riserStart), name: `Riser into ${next.kind} ${i + 2}`, shot: 'dolly',
                look: { intensity: 1.2, fan: 0.5, tiltShift: 0, converge: 0.85, sweep: 0.08, speed: moves.chase.speed * 2, phaseSpread: 0, laser: 0.8, haze: 0.35, pulseAmount: 0.8 },
            });
        }
    });

    if (blackout) cues.push({ t: round(analysis.duration - 2), fade: 2, name: 'Blackout', look: { master: 0 }, shot: 'wide' });

    return {
        title,
        audio,
        duration: analysis.duration,
        bpm: analysis.bpm,
        beats: analysis.beats,
        downbeats: analysis.downbeats,
        sections: analysis.sections,
        energy: analysis.energy,
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
    const at = (bar) => round(bar * 4 * beat);
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
