// Vocal detection (item 14, part 3): a rough "someone is singing or rapping" curve, without a
// machine-learning model. Three cues, multiplied:
//   - centre: lead vocals are mixed to the middle, so the voice band is in L+R (mid) far more than in
//     L-R (side); with a mono file, the voice band's share of the sound instead;
//   - voice band: energy in 250 Hz-4 kHz with harmonic peaks (voiced sound), not flat noise;
//   - syllables: the voice band's loudness rises and falls 3-8 times a second.
// Synths and guitars share the voice band, and a centred guitar can fool it, so it's a lighting
// signal (for a vocal pulse), not a transcription. Pure functions, no imports beyond the FFT.
import { fft } from './analysis.js';

function movingAverage(x, half) {
    const n = x.length;
    const out = new Float32Array(n);
    let sum = 0;
    let count = 0;
    for (let i = 0; i < Math.min(n, half); i++) { sum += x[i]; count++; }
    for (let i = 0; i < n; i++) {
        if (i + half < n) { sum += x[i + half]; count++; }
        if (i - half - 1 >= 0) { sum -= x[i - half - 1]; count--; }
        out[i] = sum / count;
    }
    return out;
}

function scaleToUnit(x, lo = 0.1, hi = 0.95) {
    const sorted = Array.from(x).sort((a, b) => a - b);
    const a = sorted[Math.floor(lo * (sorted.length - 1))];
    const b = sorted[Math.floor(hi * (sorted.length - 1))];
    return x.map((v) => Math.min(1, Math.max(0, (v - a) / (b - a || 1))));
}

/**
 * The vocal curve. `channels` are PCM arrays (stereo gives the centre cue; mono works, a little
 * worse). Returns { fps, offset, curve } with curve values 0..1 per frame.
 */
export function vocalCurve(channels, sampleRate, { size = 2048, hop = 512 } = {}) {
    const left = channels[0];
    const right = channels[1] ?? null;
    const length = left.length;
    const frames = Math.max(0, Math.floor((length - size) / hop) + 1);
    const window = new Float32Array(size).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)));
    const mr = new Float64Array(size);
    const mi = new Float64Array(size);
    const sr = new Float64Array(size);
    const si = new Float64Array(size);
    const lo = Math.floor((250 * size) / sampleRate);
    const hi = Math.ceil((4000 * size) / sampleRate);
    const raw = new Float32Array(frames);
    const band = new Float32Array(frames);

    for (let f = 0; f < frames; f++) {
        const off = f * hop;
        for (let i = 0; i < size; i++) {
            const l = left[off + i];
            const r = right ? right[off + i] : l;
            mr[i] = ((l + r) / 2) * window[i];
            sr[i] = ((l - r) / 2) * window[i];
            mi[i] = 0;
            si[i] = 0;
        }
        fft(mr, mi);
        if (right) fft(sr, si);
        let total = 0;
        let mid = 0;
        let side = 0;
        let logSum = 0;
        for (let k = 1; k < size / 2; k++) {
            const p = mr[k] * mr[k] + mi[k] * mi[k];
            total += p;
            if (k >= lo && k <= hi) {
                mid += p;
                logSum += Math.log(p + 1e-12);
                if (right) side += sr[k] * sr[k] + si[k] * si[k];
            }
        }
        const bins = hi - lo + 1;
        // spectral flatness in the voice band: ~1 for noise, low for harmonic (voiced) sound
        const flatness = mid > 0 ? Math.exp(logSum / bins) / (mid / bins) : 1;
        const centre = right ? mid / (mid + side + 1e-12) : 1;
        // (flatness only damps: a real voice has vibrato and breath, so it is far from a pure tone)
        // stereo: how much more the voice band sits in the middle than at the sides; mono: its share of the sound
        const cue = right ? Math.max(0, 2 * centre - 1) : mid / (total + 1e-12);
        raw[f] = cue * (1 - 0.5 * Math.min(1, flatness * 1.5));
        band[f] = Math.log(mid + 1e-9);
    }
    const fps = sampleRate / hop;
    // Syllable rate: the voice band's loudness wobbling 3-8 times a second
    const env = movingAverage(band, Math.max(1, Math.round(fps * 0.03)));
    const slow = movingAverage(env, Math.round(fps * 0.17));
    const wobble = env.map((v, i) => (v - slow[i]) ** 2);
    const syllables = scaleToUnit(movingAverage(wobble, Math.round(fps * 0.5)));
    const presence = scaleToUnit(movingAverage(raw, Math.round(fps * 0.25)));
    const curve = presence.map((p, i) => Math.min(1, p * (0.4 + 0.6 * syllables[i])));
    return { fps, offset: size / 2 / sampleRate, curve: movingAverage(curve, Math.round(fps * 0.15)) };
}

/** The curve resampled to `perSecond` points per second, rounded, for the show file. */
export function vocalsPerSecond(v, duration, perSecond = 2) {
    const out = [];
    for (let t = 0; t < duration; t += 1 / perSecond) {
        const from = Math.max(0, Math.floor((t - v.offset) * v.fps));
        const to = Math.min(v.curve.length, Math.max(from + 1, Math.floor((t + 1 / perSecond - v.offset) * v.fps)));
        let s = 0;
        for (let i = from; i < to; i++) s += v.curve[i];
        out.push(Math.round((s / Math.max(1, to - from)) * 100) / 100);
    }
    return out;
}
