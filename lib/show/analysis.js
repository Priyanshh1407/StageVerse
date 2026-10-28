// Offline song analysis: tempo, beats, downbeats, loudness and sections, from raw PCM.
// Self-written (no AGPL/essentia): an FFT, spectral-flux onsets, autocorrelation tempo,
// dynamic-programming beat tracking (Ellis 2007), and novelty-based section boundaries.
// Pure functions with no imports, so it runs in Node scripts and in tests.

/** Average all channels into one. */
export function toMono(channels) {
    if (channels.length === 1) return channels[0];
    const out = new Float32Array(channels[0].length);
    for (const ch of channels) for (let i = 0; i < out.length; i++) out[i] += ch[i] / channels.length;
    return out;
}

/** Downsample by an integer factor, averaging each group (a crude but adequate low-pass). */
export function decimate(x, factor) {
    if (factor <= 1) return x;
    const out = new Float32Array(Math.floor(x.length / factor));
    for (let i = 0; i < out.length; i++) {
        let s = 0;
        for (let j = 0; j < factor; j++) s += x[i * factor + j];
        out[i] = s / factor;
    }
    return out;
}

/** In-place iterative radix-2 FFT (length must be a power of two). */
export function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) {
            [re[i], re[j]] = [re[j], re[i]];
            [im[i], im[j]] = [im[j], im[i]];
        }
    }
    for (let len = 2; len <= n; len <<= 1) {
        const ang = (-2 * Math.PI) / len;
        const wr = Math.cos(ang);
        const wi = Math.sin(ang);
        for (let i = 0; i < n; i += len) {
            let cr = 1;
            let ci = 0;
            for (let k = 0; k < len / 2; k++) {
                const a = i + k;
                const b = a + len / 2;
                const tr = re[b] * cr - im[b] * ci;
                const ti = re[b] * ci + im[b] * cr;
                re[b] = re[a] - tr;
                im[b] = im[a] - ti;
                re[a] += tr;
                im[a] += ti;
                const nr = cr * wr - ci * wi;
                ci = cr * wi + ci * wr;
                cr = nr;
            }
        }
    }
}

/** Per-frame features: spectral flux (all + bass), RMS loudness, spectral centroid. */
export function frameFeatures(signal, sampleRate, { size = 1024, hop = 256 } = {}) {
    const frames = Math.max(0, Math.floor((signal.length - size) / hop) + 1);
    const flux = new Float32Array(frames);
    const bassFlux = new Float32Array(frames);
    const rms = new Float32Array(frames);
    const centroid = new Float32Array(frames);
    const window = new Float32Array(size).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)));
    const re = new Float64Array(size);
    const im = new Float64Array(size);
    const bins = size / 2;
    let prev = new Float32Array(bins);
    let cur = new Float32Array(bins);
    const bassBin = Math.ceil((150 * size) / sampleRate);

    for (let f = 0; f < frames; f++) {
        const off = f * hop;
        let energy = 0;
        for (let i = 0; i < size; i++) {
            const s = signal[off + i];
            energy += s * s;
            re[i] = s * window[i];
            im[i] = 0;
        }
        rms[f] = Math.sqrt(energy / size);
        fft(re, im);
        let total = 0;
        let bass = 0;
        let weighted = 0;
        let magSum = 0;
        for (let k = 1; k < bins; k++) {
            const mag = Math.hypot(re[k], im[k]);
            cur[k] = Math.log1p(100 * mag);    // log compression, like the ear
            const d = cur[k] - prev[k];
            if (d > 0) {
                total += d;
                if (k <= bassBin) bass += d;
            }
            weighted += k * mag;
            magSum += mag;
        }
        flux[f] = total;
        bassFlux[f] = bass;
        centroid[f] = magSum > 0 ? ((weighted / magSum) * sampleRate) / size : 0;
        [prev, cur] = [cur, prev];
    }
    // An onset registers when it reaches the middle of the window, so frames are timed at their centre
    return { frames, fps: sampleRate / hop, offset: size / 2 / sampleRate, flux, bassFlux, rms, centroid };
}

function mean(a) {
    let s = 0;
    for (const v of a) s += v;
    return a.length ? s / a.length : 0;
}
function std(a) {
    const m = mean(a);
    let s = 0;
    for (const v of a) s += (v - m) ** 2;
    return Math.sqrt(s / Math.max(1, a.length));
}

/** Onset strength: flux minus its local average, half-wave rectified, unit variance. */
export function onsetEnvelope(flux, fps) {
    const n = flux.length;
    const half = Math.max(1, Math.round(fps * 0.2));
    const out = new Float32Array(n);
    let sum = 0;
    for (let i = 0; i < Math.min(n, half); i++) sum += flux[i];
    for (let i = 0; i < n; i++) {
        const lo = i - half - 1;
        const hi = i + half;
        if (hi < n) sum += flux[hi];
        if (lo >= 0) sum -= flux[lo];
        const count = Math.min(n - 1, hi) - Math.max(0, lo + 1) + 1;
        out[i] = Math.max(0, flux[i] - sum / count);
    }
    const s = std(out) || 1;
    for (let i = 0; i < n; i++) out[i] /= s;
    return out;
}

/** Tempo by autocorrelation of the onset envelope, weighted toward ~120 BPM (Ellis 2007). */
export function estimateTempo(onset, fps, { min = 60, max = 200, center = 120, octaveWidth = 1.0 } = {}) {
    const n = onset.length;
    let best = { bpm: center, score: -Infinity };
    const minLag = Math.floor((fps * 60) / max);
    const maxLag = Math.ceil((fps * 60) / min);
    const scores = [];
    for (let lag = minLag; lag <= maxLag; lag++) {
        let s = 0;
        for (let i = 0; i + lag < n; i++) s += onset[i] * onset[i + lag];
        s /= n - lag;
        const bpm = (fps * 60) / lag;
        const w = Math.exp(-0.5 * (Math.log2(bpm / center) / octaveWidth) ** 2);
        scores[lag] = s;
        if (s * w > best.score) best = { bpm, score: s * w, lag };
    }
    // Parabolic refinement around the best lag for sub-frame precision
    const { lag } = best;
    const a = scores[lag - 1];
    const b = scores[lag];
    const c = scores[lag + 1];
    if (a !== undefined && c !== undefined && a - 2 * b + c !== 0) {
        const shift = (0.5 * (a - c)) / (a - 2 * b + c);
        if (Math.abs(shift) < 1) best.bpm = (fps * 60) / (lag + shift);
    }
    return best.bpm;
}

/** Beat times (in frames) by dynamic programming: strong onsets, spaced close to the period. */
export function trackBeats(onset, fps, bpm, tightness = 100) {
    const n = onset.length;
    const period = (fps * 60) / bpm;
    const score = new Float64Array(n);
    const back = new Int32Array(n).fill(-1);
    for (let t = 0; t < n; t++) {
        let best = -Infinity;
        let arg = -1;
        const lo = Math.max(0, Math.round(t - 2 * period));
        const hi = Math.round(t - period / 2);
        for (let p = lo; p <= hi; p++) {
            const s = score[p] - tightness * Math.log((t - p) / period) ** 2;
            if (s > best) {
                best = s;
                arg = p;
            }
        }
        score[t] = onset[t] + (arg >= 0 ? Math.max(0, best) : 0);
        back[t] = arg >= 0 && best > 0 ? arg : -1;
    }
    // Start from the best-scoring frame in the last period and walk back
    let t = n - 1;
    for (let i = Math.max(0, Math.floor(n - period)); i < n; i++) if (score[i] > score[t]) t = i;
    const beats = [];
    while (t >= 0) {
        beats.push(t);
        t = back[t];
    }
    return beats.reverse();
}

/** Which beats start a bar (4/4): the phase whose beats carry the most bass onset energy. */
export function findDownbeats(beatFrames, bassOnset) {
    let bestPhase = 0;
    let bestScore = -Infinity;
    for (let phase = 0; phase < 4; phase++) {
        let s = 0;
        for (let i = phase; i < beatFrames.length; i += 4) s += bassOnset[beatFrames[i]] || 0;
        if (s > bestScore) {
            bestScore = s;
            bestPhase = phase;
        }
    }
    const downbeats = [];
    for (let i = bestPhase; i < beatFrames.length; i += 4) downbeats.push(i);
    return downbeats;
}

function percentile(values, p) {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

/** Loudness in dB per frame, normalised so the 5th..95th percentile maps to 0..1. */
export function normalisedLoudness(rms) {
    const db = Array.from(rms, (v) => 20 * Math.log10(v + 1e-6));
    const lo = percentile(db, 0.05);
    const hi = percentile(db, 0.95);
    return db.map((v) => Math.min(1, Math.max(0, (v - lo) / (hi - lo || 1))));
}

/**
 * Section boundaries from per-bar features: a boundary is where the 4 bars before and the 4 bars
 * after differ most (loudness, brightness, onset density). Snapped to 4-bar phrases when close.
 */
export function findSections(bars, { window = 4, minBars = 4 } = {}) {
    const n = bars.length;
    const keys = ['energy', 'brightness', 'density'];
    const novelty = new Array(n).fill(0);
    for (let b = window; b <= n - window; b++) {
        let d = 0;
        for (const k of keys) {
            const before = mean(bars.slice(b - window, b).map((x) => x[k]));
            const after = mean(bars.slice(b, b + window).map((x) => x[k]));
            d += (after - before) ** 2;
        }
        novelty[b] = Math.sqrt(d);
    }
    const threshold = mean(novelty) + 0.5 * std(novelty);
    const peaks = [];
    for (let b = 1; b < n - 1; b++) {
        if (novelty[b] > threshold && novelty[b] >= novelty[b - 1] && novelty[b] >= novelty[b + 1]) peaks.push(b);
    }
    // Strongest boundaries first, keeping at least `minBars` between boundaries
    const chosen = [];
    for (const b of [...peaks].sort((x, y) => novelty[y] - novelty[x])) {
        let at = b;
        if (at % 4 !== 0 && Math.abs(Math.round(at / 4) * 4 - at) <= 1) at = Math.round(at / 4) * 4;
        if (at >= minBars && at <= n - minBars && chosen.every((c) => Math.abs(c - at) >= minBars)) chosen.push(at);
    }
    chosen.sort((a, b) => a - b);
    const starts = [0, ...chosen];
    return starts.map((start, i) => {
        const end = i + 1 < starts.length ? starts[i + 1] : n;
        const e = bars.slice(start, end).map((x) => x.energy);
        const q = Math.max(1, Math.floor(e.length / 4));
        // rise: how much louder the last quarter is than the first (a build climbs; a verse doesn't)
        return { startBar: start, endBar: end, energy: mean(e), rise: mean(e.slice(-q)) - mean(e.slice(0, q)) };
    });
}

/** Name each section from its loudness relative to the whole song. */
export function labelSections(sections) {
    const energies = sections.map((s) => s.energy);
    const hi = percentile(energies, 0.6);
    const lo = percentile(energies, 0.3);
    const labels = sections.map((s) => (s.energy >= Math.max(hi, 0.55) ? 'peak' : s.energy <= Math.min(lo, 0.45) ? 'calm' : 'groove'));
    return sections.map((s, i) => {
        let kind = labels[i];
        // A build is the climb into a peak: only when its energy actually rises (a verse or chorus
        // that happens to come before a peak isn't one)
        if (kind !== 'peak' && labels[i + 1] === 'peak' && (s.rise ?? 1) > 0.05) kind = 'build';
        if (i === 0 && kind !== 'peak') kind = 'intro';
        if (i === sections.length - 1 && kind !== 'peak') kind = 'outro';
        return { ...s, kind };
    });
}

/**
 * The whole pipeline. `channels` are Float32Arrays of PCM in [-1, 1].
 * Times in the result are seconds, rounded to milliseconds.
 */
export function analyseSong(channels, sampleRate) {
    const factor = Math.max(1, Math.floor(sampleRate / 22050));
    const signal = decimate(toMono(channels), factor);
    const sr = sampleRate / factor;
    const duration = signal.length / sr;
    const feats = frameFeatures(signal, sr);
    const { fps, offset } = feats;
    // Summed over linear FFT bins, flux is dominated by the treble (hi-hats can pull the beat onto
    // the off-beat), so the bass onsets get equal weight, like the low-end emphasis of a mel spectrum
    const fullOnset = onsetEnvelope(feats.flux, fps);
    const bassOnset = onsetEnvelope(feats.bassFlux, fps);
    const onset = fullOnset.map((v, i) => (v + bassOnset[i]) / 2);
    const bpm = estimateTempo(onset, fps);
    const beatFrames = trackBeats(onset, fps, bpm);
    const downbeats = findDownbeats(beatFrames, bassOnset);
    const loudness = normalisedLoudness(feats.rms);
    const ms = (s) => Math.round(s * 1000) / 1000;

    // Per-bar features (bar = 4 beats from each downbeat)
    const bars = [];
    for (let d = 0; d < downbeats.length; d++) {
        const from = beatFrames[downbeats[d]];
        const to = d + 1 < downbeats.length ? beatFrames[downbeats[d + 1]] : feats.frames;
        if (to <= from) continue;
        const slice = (arr) => Array.from(arr.slice(from, to));
        bars.push({
            start: from / fps + offset,
            energy: mean(slice(loudness)),
            brightness: Math.min(1, mean(slice(feats.centroid)) / 4000),
            density: Math.min(1, mean(slice(onset)) / 2),
        });
    }
    const sections = labelSections(findSections(bars)).map((s) => ({
        start: ms(bars[s.startBar].start),
        end: ms(s.endBar < bars.length ? bars[s.endBar].start : duration),
        bars: s.endBar - s.startBar,
        energy: ms(s.energy),
        kind: s.kind,
    }));

    // Loudness curve at 2 points per second, for the timeline preview
    const step = Math.round(fps / 2);
    const energy = [];
    for (let f = 0; f < loudness.length; f += step) energy.push(ms(mean(loudness.slice(f, f + step))));

    return {
        duration: ms(duration),
        bpm: Math.round(bpm * 10) / 10,
        beats: beatFrames.map((f) => ms(f / fps + offset)),
        downbeats,
        sections,
        energy,
    };
}
