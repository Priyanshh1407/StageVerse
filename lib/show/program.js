// Turns a song analysis into a lighting show (a timecoded cue sheet), the way a lighting
// designer would program it: calm, wide looks for quiet parts; movement speeding up through a
// build; a riser that tightens the beams in the last bars before a peak; a drop hit (strobe +
// blinders) on the first beat of each peak; colour changes and camera cuts on 8-bar phrases.

const LOOKS = {
    intro: { intensity: 0.45, beams: 1, sweep: 0.12, speed: 0.25, converge: 0, haze: 0.9, laser: 0, stars: 0.6, pulseAmount: 0.15 },
    calm: { intensity: 0.55, beams: 1, sweep: 0.18, speed: 0.35, converge: 0, haze: 0.85, laser: 0, stars: 0.5, pulseAmount: 0.2 },
    groove: { intensity: 0.85, beams: 1, sweep: 0.4, speed: 0.9, converge: 0, haze: 0.6, laser: 0.35, stars: 0.3, pulseAmount: 0.45 },
    build: { intensity: 0.9, beams: 1, sweep: 0.5, speed: 1.4, converge: 0, haze: 0.5, laser: 0.5, stars: 0.4, pulseAmount: 0.55 },
    riser: { intensity: 1.2, sweep: 0.15, speed: 2.6, converge: 0.85, haze: 0.35, laser: 0.8, pulseAmount: 0.8 },
    peak: { intensity: 1.35, beams: 1, sweep: 0.55, speed: 2.0, converge: 0.15, haze: 0.3, laser: 1, stars: 1, pulseAmount: 1 },
    outro: { intensity: 0.4, beams: 1, sweep: 0.1, speed: 0.2, converge: 0, haze: 0.9, laser: 0, stars: 0.7, pulseAmount: 0.1 },
};

// Colour pairs: quiet sections stay in deep blues; each peak gets a new pair ("a sky full of
// stars": the peaks run through the rainbow).
const QUIET_COLORS = [['#3b5bff', '#a855f7'], ['#19d9ff', '#3b5bff']];
const PEAK_COLORS = [
    ['#19d9ff', '#ff3df2'], ['#ffd400', '#ff3df2'], ['#39ff14', '#19d9ff'],
    ['#ff8a00', '#a855f7'], ['#ffffff', '#19d9ff'], ['#ff0055', '#ffd400'],
];
const SHOT_CYCLE = { peak: ['drop', 'left', 'high', 'right'], groove: ['wide', 'dolly'], build: ['dolly'] };

const round = (s) => Math.round(s * 1000) / 1000;

export function programShow(analysis, { title, audio } = {}) {
    const { beats, downbeats, sections } = analysis;
    const barStarts = downbeats.map((i) => beats[i]);
    const beatSeconds = 60 / analysis.bpm;
    const barsBetween = (from, to) => barStarts.filter((t) => t >= from - 0.01 && t < to - 0.01);

    const cues = [];
    const hits = [];
    let peakCount = 0;
    let quietCount = 0;

    sections.forEach((section, i) => {
        const kind = section.kind;
        const next = sections[i + 1];
        const look = { ...LOOKS[kind] };
        let pair;
        if (kind === 'peak') pair = PEAK_COLORS[peakCount++ % PEAK_COLORS.length];
        else pair = QUIET_COLORS[quietCount++ % QUIET_COLORS.length];
        [look.colorA, look.colorB] = pair;
        if (kind === 'peak') look.laserColor = pair[1];

        const fade = kind === 'peak' ? 0.15 : Math.min(4 * beatSeconds, 2.5);
        const name = `${kind[0].toUpperCase()}${kind.slice(1)} ${i + 1}`;
        const bars = barsBetween(section.start, section.end);

        // A long build only builds in its last 8 bars; before that it grooves
        if (kind === 'build' && bars.length > 12) {
            cues.push({ t: round(section.start), fade: round(fade), name: `Groove ${i + 1}`, look: { ...LOOKS.groove, colorA: pair[0], colorB: pair[1] }, shot: 'wide' });
            cues.push({ t: round(bars[bars.length - 8]), fade: round(8 * 4 * beatSeconds), name, look, shot: 'dolly' });
        } else {
            cues.push({ t: round(section.start), fade: round(fade), name, look, shot: SHOT_CYCLE[kind]?.[0] || 'wide' });
        }

        if (kind === 'peak') hits.push({ t: round(section.start), kind: 'drop', dur: round(beatSeconds * 2) });

        // Phrase changes every 8 bars inside a section: new camera shot; peaks also swap colours
        const longBuild = kind === 'build' && bars.length > 12;
        for (let b = 8, n = 1; b < bars.length; b += 8, n++) {
            const t = round(bars[b]);
            if (cues.some((c) => c.t === t)) continue; // a section cue already fires here
            const cycle = longBuild && b < bars.length - 8 ? SHOT_CYCLE.groove : SHOT_CYCLE[kind];
            const cue = { t, fade: round(beatSeconds), name: `${name} · phrase ${n + 1}` };
            if (cycle) cue.shot = cycle[n % cycle.length];
            if (kind === 'peak') {
                cue.look = n % 2 ? { colorA: pair[1], colorB: pair[0] } : { colorA: pair[0], colorB: pair[1] };
                hits.push({ t: round(bars[b]), kind: 'blinder', dur: round(beatSeconds) });
            }
            if (cue.shot || cue.look) cues.push(cue);
        }

        // Riser: the last 2 bars before a peak tighten and speed up (fade over those 2 bars)
        if (next?.kind === 'peak' && kind !== 'peak' && bars.length >= 3) {
            const riserStart = bars[bars.length - 2];
            cues.push({ t: round(riserStart), fade: round(next.start - riserStart), name: `Riser into ${next.kind} ${i + 2}`, look: LOOKS.riser, shot: 'dolly' });
        }
    });

    // Final blackout as the song ends
    cues.push({ t: round(analysis.duration - 2), fade: 2, name: 'Blackout', look: { master: 0 }, shot: 'wide' });

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
