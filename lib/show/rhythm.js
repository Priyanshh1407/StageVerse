// Rhythm tools for the genres the original analysis misread (item 14, parts 4 and 5):
// - rap: "silence, then the beat comes back" moments, the double/half tempo check, beat switches
//   (the drum pattern changing), heavy 808 bass;
// - Bollywood: tempo that changes through the song, rhythms in 3s and 6s, beatless intros.
// Pure functions, no imports, so they run in the worker, in Node and in tests.

const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const median = (a) => {
    const s = [...a].sort((x, y) => x - y);
    return s.length ? s[Math.floor(s.length / 2)] : 0;
};

/** Autocorrelation of `x` at `lag`, over frames [from, to). */
function autocorr(x, lag, from = 0, to = x.length) {
    let s = 0;
    let n = 0;
    for (let i = from; i + lag < to; i++) {
        s += x[i] * x[i + lag];
        n++;
    }
    return n ? s / n : 0;
}

/**
 * Double/half tempo check (rap): trap hi-hats make a 75 BPM song look like 150. If half the tempo
 * is close to the genre's centre and the beat is about as strong there, take it; the same for double.
 */
export function checkTempoOctave(bpm, onset, fps, { center = 90, min = 55, max = 180 } = {}) {
    const strength = (b) => {
        const lag = Math.round((fps * 60) / b);
        return lag > 1 && lag < onset.length / 2 ? autocorr(onset, lag) : 0;
    };
    const here = strength(bpm);
    const dist = (b) => Math.abs(Math.log2(b / center));
    let best = bpm;
    for (const cand of [bpm / 2, bpm * 2]) {
        if (cand < min || cand > max) continue;
        // closer to where this genre's beat usually sits, and still a clear pulse there
        if (dist(cand) + 0.25 < dist(best) && strength(cand) > 0.6 * here) best = cand;
    }
    return best;
}

/**
 * Local tempo through the song (Bollywood tempo changes): 8-second windows every 2 seconds, each
 * searched within +-25% of the overall tempo. Returns the beat period in frames for every frame,
 * or null when the tempo holds steady (then the original fixed-tempo tracking is used).
 */
export function tempoCurve(onset, fps, bpm, { window = 8, hop = 2, range = 0.25, minChange = 0.05 } = {}) {
    const n = onset.length;
    const w = Math.round(window * fps);
    const h = Math.round(hop * fps);
    if (n < w * 2) return null;
    const centres = [];
    const tempi = [];
    for (let start = 0; start + w <= n; start += h) {
        let best = bpm;
        let bestScore = -Infinity;
        for (let b = bpm * (1 - range); b <= bpm * (1 + range); b += bpm * 0.005) {
            const lag = (fps * 60) / b;
            const l0 = Math.floor(lag);
            const frac = lag - l0;
            const s = (1 - frac) * autocorr(onset, l0, start, start + w) + frac * autocorr(onset, l0 + 1, start, start + w);
            // a light pull toward the overall tempo, so a weak window doesn't wander
            const score = s * Math.exp(-0.5 * (Math.log2(b / bpm) / 0.15) ** 2);
            if (score > bestScore) {
                bestScore = score;
                best = b;
            }
        }
        centres.push(start + w / 2);
        tempi.push(best);
    }
    // 5-window median smoothing
    const smooth = tempi.map((_, i) => median(tempi.slice(Math.max(0, i - 2), i + 3)));
    const lo = Math.min(...smooth);
    const hi = Math.max(...smooth);
    if (hi / lo < 1 + minChange) return null;
    const period = new Float32Array(n);
    for (let f = 0, k = 0; f < n; f++) {
        while (k < centres.length - 2 && f > centres[k + 1]) k++;
        const a = centres[k];
        const b = centres[Math.min(k + 1, centres.length - 1)];
        const t = b > a ? Math.min(1, Math.max(0, (f - a) / (b - a))) : 0;
        const tempo = smooth[k] + (smooth[Math.min(k + 1, smooth.length - 1)] - smooth[k]) * t;
        period[f] = (fps * 60) / tempo;
    }
    return period;
}

/**
 * Beats in 3s or 4s (Bollywood: rhythms in 3s and 6s). The onset strength at each beat is compared
 * with itself 3 and 6 beats later versus 4 and 8 beats later: a waltz-like song repeats every 3.
 * Telling them apart is hard, so 3 is only chosen when it clearly wins.
 */
export function detectMeter(beatFrames, onset) {
    const s = beatFrames.map((f) => onset[f] || 0);
    if (s.length < 32) return 4;
    const m = mean(s);
    const c = s.map((v) => v - m);
    const ac = (lag) => autocorr(c, lag);
    const three = ac(3) + ac(6);
    const four = ac(4) + ac(8);
    return three > 0 && three > four * 1.3 + 0.02 ? 3 : 4;
}

/** Which beats start a bar: the phase whose beats carry the most bass, for any number of beats per bar. */
export function downbeatsFor(beatFrames, bassOnset, meter = 4) {
    let bestPhase = 0;
    let bestScore = -Infinity;
    for (let phase = 0; phase < meter; phase++) {
        let s = 0;
        for (let i = phase; i < beatFrames.length; i += meter) s += bassOnset[beatFrames[i]] || 0;
        if (s > bestScore) {
            bestScore = s;
            bestPhase = phase;
        }
    }
    const out = [];
    for (let i = bestPhase; i < beatFrames.length; i += meter) out.push(i);
    return out;
}

/**
 * A beatless opening (Bollywood alaap, a pop piano intro): how clearly the beat pulses, in 4-second
 * windows; the intro is free when its windows pulse far less than the rest of the song. Returns the
 * time the beat starts (seconds), or 0 when the song starts on the beat.
 */
export function freeIntroEnd(onset, fps, bpm, { window = 4, minLength = 6 } = {}) {
    const w = Math.round(window * fps);
    const lag = Math.round((fps * 60) / bpm);
    const clarity = [];
    for (let start = 0; start + w <= onset.length; start += w) {
        const zero = autocorr(onset, 0, start, start + w) || 1e-9;
        const beat = Math.max(autocorr(onset, lag, start, start + w), autocorr(onset, lag * 2, start, start + w));
        let energy = 0;
        for (let i = start; i < start + w; i++) energy += onset[i];
        clarity.push((beat / zero) * Math.min(1, energy / w));
    }
    if (clarity.length < 6) return 0;
    const typical = median(clarity.slice(Math.floor(clarity.length / 4)));
    let k = 0;
    while (k < clarity.length && clarity[k] < typical * 0.35) k++;
    const end = k * window;
    return end >= minLength ? end : 0;
}

/**
 * "Silence, then the beat comes back" (rap): the music drops near-silent (or loses its bass) for a
 * quarter second to 4 seconds mid-song, then returns loud. `loudness` is the normalised curve per
 * frame. Returns [{ start, end }] in seconds (end = the moment the beat returns).
 */
export function silenceMoments(loudness, fps, offset, duration, { quiet = 0.12, loud = 0.3, minGap = 0.25, maxGap = 4 } = {}) {
    const out = [];
    const n = loudness.length;
    let i = Math.round(fps * 2); // not the very start of the song
    while (i < n - fps * 2) {
        if (loudness[i] < quiet) {
            let j = i;
            while (j < n && loudness[j] < quiet) j++;
            const gap = (j - i) / fps;
            const after = mean(Array.from(loudness.slice(j, Math.min(n, j + Math.round(fps)))));
            const before = mean(Array.from(loudness.slice(Math.max(0, i - Math.round(fps * 2)), i)));
            if (gap >= minGap && gap <= maxGap && after > loud && before > loud * 0.8) {
                const end = j / fps + offset;
                if (end < duration - 4) out.push({ start: i / fps + offset, end });
            }
            i = j;
        } else i++;
    }
    return out;
}

/** The drum pattern of each bar: onset strength at 16 evenly spaced steps, unit length. */
export function barPatterns(onset, barFrames, endFrame) {
    return barFrames.map((from, b) => {
        const to = barFrames[b + 1] ?? endFrame;
        const v = new Array(16).fill(0);
        for (let s = 0; s < 16; s++) {
            const f = Math.round(from + ((to - from) * s) / 16);
            v[s] = Math.max(onset[f] || 0, onset[f + 1] || 0, onset[f - 1] || 0);
        }
        const len = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
        return v.map((x) => x / len);
    });
}

/** Beat switches: where the drum pattern of the 4 bars after differs from the 4 bars before. */
export function patternNovelty(patterns, window = 4) {
    const n = patterns.length;
    const out = new Array(n).fill(0);
    const avg = (from, to) => {
        const v = new Array(16).fill(0);
        for (let b = from; b < to; b++) for (let s = 0; s < 16; s++) v[s] += patterns[b][s] / (to - from);
        return v;
    };
    for (let b = window; b <= n - window; b++) {
        const x = avg(b - window, b);
        const y = avg(b, b + window);
        const d = Math.sqrt(x.reduce((s, v) => s + v * v, 0) * y.reduce((s, v) => s + v * v, 0)) || 1;
        out[b] = 1 - x.reduce((s, v, k) => s + v * y[k], 0) / d;
    }
    return out;
}
