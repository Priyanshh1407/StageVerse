// Synthetic stereo songs with a known structure, for the analysis tests (item 14).
export const SR = 22050;
const NOTE = { C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 392.0, A: 440.0, B: 493.88 };
const CHORDS = { Am: ['A', 'C', 'E'], F: ['F', 'A', 'C'], C: ['C', 'E', 'G'], G: ['G', 'B', 'D'], Dm: ['D', 'F', 'A'], E: ['E', 'G', 'B'] };

/**
 * A synthetic stereo song. `parts` run in order, each { bars, chords: ['Am', 'F'] (one per bar,
 * cycling), loud (0..1), drums (bool), vocal (bool), silence: [fromBeat, beats] }.
 * Pads are mixed wide (different notes louder on each side), drums and the voice to the centre.
 */
export function song(parts, { bpm = 120, beatsPerBar = 4, tempoTo = null } = {}) {
    const totalBeats = parts.reduce((s, p) => s + p.bars * beatsPerBar, 0);
    // beat times, optionally speeding up from bpm to tempoTo across the song
    const times = [0];
    for (let b = 1; b <= totalBeats; b++) {
        const tempo = tempoTo ? bpm + ((tempoTo - bpm) * b) / totalBeats : bpm;
        times.push(times[b - 1] + 60 / tempo);
    }
    const n = Math.ceil((times[totalBeats] + 0.5) * SR);
    const L = new Float32Array(n);
    const R = new Float32Array(n);
    let beat = 0;
    for (const part of parts) {
        for (let bar = 0; bar < part.bars; bar++) {
            const chord = CHORDS[part.chords[bar % part.chords.length]].map((k) => NOTE[k]);
            for (let k = 0; k < beatsPerBar; k++, beat++) {
                const from = Math.floor(times[beat] * SR);
                const to = Math.floor(times[beat + 1] * SR);
                const silent = part.silence && beat - part.firstBeat >= part.silence[0] && beat - part.firstBeat < part.silence[0] + part.silence[1];
                if (silent) continue;
                for (let i = from; i < to && i < n; i++) {
                    const t = i / SR;
                    const local = (i - from) / SR;
                    // pad: the chord, spread across left and right
                    const a = Math.sin(2 * Math.PI * chord[0] * t);
                    const b = Math.sin(2 * Math.PI * chord[1] * t);
                    const c = Math.sin(2 * Math.PI * chord[2] * t);
                    const pad = 0.12 * part.loud;
                    L[i] += pad * (a + 0.4 * b + 0.8 * c);
                    R[i] += pad * (0.4 * a + b + 0.8 * c * -1);
                    let mid = 0;
                    if (part.drums) {
                        const accent = k === 0 ? 1 : 0.5;
                        mid += Math.sin(2 * Math.PI * 60 * local) * Math.exp(-local * 30) * 0.7 * part.loud * accent;
                        const hat = local - (to - from) / SR / 2;
                        if (hat >= 0 && hat < 0.03) mid += Math.sin(i * 1.7) * Math.sin(i * 2.9) * Math.exp(-hat / 0.005) * 0.15 * part.loud;
                    }
                    if (part.vocal) {
                        // a sung line: a harmonic tone on A# (233 Hz: none of its harmonics land exactly on a pad
                        // note, which would make the voice beat against the chords) with vibrato, ~5 syllables a second
                        // (the phase of a 2% vibrato at 5.5 Hz, integrated so the depth stays constant)
                        const phase = 2 * Math.PI * 233.08 * (t - (0.02 / (2 * Math.PI * 5.5)) * Math.cos(2 * Math.PI * 5.5 * t));
                        let v = 0;
                        for (let h = 1; h <= 6; h++) v += Math.sin(h * phase) / h;
                        mid += v * 0.12 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 5 * t) ** 2);
                    }
                    L[i] += mid;
                    R[i] += mid;
                }
            }
        }
    }
    return { channels: [L, R], sampleRate: SR };
}
// number each part's first beat (for silences)
export const parts = (list, beatsPerBar = 4) => {
    let b = 0;
    return list.map((p) => {
        const out = { ...p, firstBeat: b };
        b += p.bars * beatsPerBar;
        return out;
    });
};
