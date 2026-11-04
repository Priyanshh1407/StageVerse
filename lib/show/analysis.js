// Offline song analysis: tempo, beats, downbeats, loudness and sections, from raw PCM.
// Self-written (no AGPL/essentia): an FFT, spectral-flux onsets, autocorrelation tempo,
// dynamic-programming beat tracking (Ellis 2007), and novelty-based section boundaries.
// Per genre (genres.js): EDM runs the original analysis unchanged; pop, rap and Bollywood add
// repetition-based structure (structure.js), rhythm checks (rhythm.js) and their own tempo priors.
// Every genre also gets a rough vocal curve (vocals.js). Pure functions, no browser or Node APIs,
// so it runs in the worker, in Node scripts and in tests.
import { GENRES, normaliseGenre } from './genres.js';
import { chromaFrames, barChroma, selfSimilarity, footeNovelty, groupSections, sectionSimilarities, labelByRepetition, kindForLabel, mergeRuns } from './structure.js';
import { checkTempoOctave, tempoCurve, detectMeter, downbeatsFor, freeIntroEnd, silenceMoments, barPatterns, patternNovelty } from './rhythm.js';
import { vocalCurve, vocalsPerSecond } from './vocals.js';

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

/**
 * Beat times (in frames) by dynamic programming: strong onsets, spaced close to the period.
 * `periodCurve` (optional, frames per beat for every frame) lets the tempo change through the song.
 */
export function trackBeats(onset, fps, bpm, tightness = 100, periodCurve = null) {
    const n = onset.length;
    const fixed = (fps * 60) / bpm;
    const score = new Float64Array(n);
    const back = new Int32Array(n).fill(-1);
    for (let t = 0; t < n; t++) {
        const period = periodCurve ? periodCurve[t] : fixed;
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
    const lastPeriod = periodCurve ? periodCurve[n - 1] : fixed;
    for (let i = Math.max(0, Math.floor(n - lastPeriod)); i < n; i++) if (score[i] > score[t]) t = i;
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

/**
 * A novelty curve scaled so a clear change is about 1 (mean + 2 standard deviations), capped at 1.5:
 * scaling by the maximum would let one huge change (the singing starting) squash all the others.
 */
function unit(a) {
    const scale = mean(a) + 2 * std(a) || 1;
    return a.map((v) => Math.min(1.5, v / scale));
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
 * `extraNovelty` (a list of per-bar curves) adds other kinds of change (chords and melody, the
 * singing, the drum pattern): a boundary is then where any one of them clearly changes, each judged
 * against itself (in a pop song mastered equally loud throughout, the verse-to-chorus change is all
 * chords and melody, and a big change in the singing mustn't drown it out).
 * `forced` bars are always boundaries (e.g. where a beatless intro ends), with none before the
 * first of them (the free intro is one section); a lower
 * `sensitivity` (standard deviations above the mean change) finds more, weaker boundaries.
 */
export function findSections(bars, { window = 4, minBars = 4, extraNovelty = null, forced = [], sensitivity = 0.5 } = {}) {
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
    // Peaks of a curve: above its own mean (+ sensitivity standard deviations), and a local maximum
    const peaksOf = (curve) => {
        const threshold = mean(curve) + sensitivity * std(curve);
        const out = [];
        for (let b = 1; b < n - 1; b++) if (curve[b] > threshold && curve[b] >= curve[b - 1] && curve[b] >= curve[b + 1]) out.push(b);
        return out;
    };
    let peaks = peaksOf(novelty);
    if (extraNovelty) {
        const curves = [unit(novelty), ...extraNovelty.map((c) => Array.from({ length: n }, (_, b) => c[b] ?? 0))];
        peaks = [...new Set(curves.flatMap(peaksOf))];
        for (let b = 0; b < n; b++) novelty[b] = Math.max(...curves.map((c) => c[b]));
    }
    // Strongest boundaries first, keeping at least `minBars` between boundaries
    const chosen = forced.filter((b) => b > 0 && b < n);
    for (const b of [...peaks].sort((x, y) => novelty[y] - novelty[x])) {
        let at = b;
        if (at % 4 !== 0 && Math.abs(Math.round(at / 4) * 4 - at) <= 1) at = Math.round(at / 4) * 4;
        if (forced.length && at < Math.min(...forced)) continue;
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
 * Find build-ups bar by bar. Section boundaries are coarse, and a build usually lives in the last
 * 4-16 bars of a longer verse or groove, so judging whole sections misses it. Before each peak,
 * walk back while the bar intensity (loudness plus onset density, i.e. snare rolls and risers)
 * keeps rising; a climb of at least 4 bars becomes its own 'build' section.
 * `sections` are labelled { startBar, endBar, kind, ... }; returns a new list.
 */
export function markBuilds(sections, bars, { minBars = 4, maxBars = 16, minRise = 0.06 } = {}) {
    const raw = bars.map((b) => 0.4 * b.energy + 0.6 * b.density);
    // 3-bar smoothing that only looks back, so the bar before a peak doesn't borrow the peak's loudness
    const s = raw.map((_, i) => mean(raw.slice(Math.max(0, i - 2), i + 1)));
    const regions = [];
    sections.forEach((sec, k) => {
        if (sec.kind !== 'peak' || (k > 0 && sections[k - 1].kind === 'peak')) return;
        const p = sec.startBar;
        if (p < minBars + 1) return;
        // Walk back while bars actually climb (one flat bar allowed, for real-music wobble)
        let i = p - 1;
        let flat = 1;
        while (i > p - maxBars && i > 0) {
            if (s[i - 1] < s[i] - 0.004) i--;
            else if (flat > 0 && s[i - 1] <= s[i] + 0.01) { flat--; i--; }
            else break;
        }
        if (p - i >= minBars && s[p - 1] - s[i] > minRise) regions.push([i, p]);
    });
    if (!regions.length) return sections;
    const out = [];
    for (const sec of sections) {
        let cuts = [sec.startBar, sec.endBar];
        for (const [a, b] of regions) {
            if (a > sec.startBar && a < sec.endBar) cuts.push(a);
            if (b > sec.startBar && b < sec.endBar) cuts.push(b);
        }
        cuts = [...new Set(cuts)].sort((x, y) => x - y);
        for (let c = 0; c < cuts.length - 1; c++) {
            const [from, to] = [cuts[c], cuts[c + 1]];
            const inBuild = sec.kind !== 'peak' && regions.some(([a, b]) => from >= a && to <= b);
            out.push({ ...sec, startBar: from, endBar: to, kind: inBuild ? 'build' : sec.kind });
        }
    }
    // Merge neighbours of the same kind, and fold slivers (< 2 bars) into the section before
    const merged = [];
    for (const sec of out) {
        const prev = merged[merged.length - 1];
        if (prev && (prev.kind === sec.kind || sec.endBar - sec.startBar < 2)) prev.endBar = sec.endBar;
        else merged.push({ ...sec });
    }
    return merged;
}

/**
 * Structure for the repetition genres (pop, rap, Bollywood): boundaries from loudness plus chords
 * and melody (plus the drum pattern for rap), sections grouped by what repeats, labelled verse /
 * pre-chorus / chorus / bridge, and lit by those labels. Falls back to loudness labels when nothing
 * repeats.
 */
/**
 * The structure settings for the repetition genres, tuned against the test set
 * (npm run score:analysis); `analyseSong(..., { tuning })` overrides them for experiments.
 *   sensitivity  how readily a change becomes a boundary (standard deviations above the mean change)
 *   curves       'separate': a boundary where any one cue clearly changes; 'combined': one blended curve
 *   group        how much more alike than usual two sections must be to count as a repeat
 *   energyGap    sections further apart in loudness than this never count as repeats
 *   merge        join neighbouring pieces of the same part before labelling
 *   sung         only groups sung at least this share as much as the most-sung group can be chorus/verse
 *   bright/dense how much brightness and drum density add to loudness when picking the chorus
 *   climax       a one-off section this much louder than the chorus (or more) is a peak too
 */
export const TUNING = { sensitivity: 0.25, curves: 'combined', group: 0.9, energyGap: 0.2, merge: false, sung: 0.6, bright: 0.5, dense: 0.5, climax: 0.03 };

function repetitionSections(profile, { signal, sr, duration, bars, onset, beatFrames, downbeats, frames, introEnd, debug, tuning: T }) {
    const barTimes = bars.map((b) => b.start);
    const chroma = barChroma(chromaFrames(signal, sr), barTimes, duration);
    const S = selfSimilarity(chroma, bars);
    // Boundaries: where the chords and melody change, where the singing starts or stops, and (rap)
    // where the drum pattern switches
    const foote = unit(footeNovelty(S, 4));
    const voice = unit(bars.map((_, b) => (b < 4 || b > bars.length - 4 ? 0
        : Math.abs(mean(bars.slice(b, b + 4).map((x) => x.vocal)) - mean(bars.slice(b - 4, b).map((x) => x.vocal))))));
    const blend = foote.map((v, i) => 0.65 * v + 0.35 * voice[i]);
    const extra = T.curves === 'separate' ? [foote, voice] : T.curves === 'both' ? [blend, foote] : [blend];
    if (profile.rhythm) {
        const barFrames = downbeats.map((d) => beatFrames[d]).slice(0, bars.length);
        extra.push(unit(patternNovelty(barPatterns(onset, barFrames, frames))));
    }
    const introBar = introEnd > 0 ? barTimes.findIndex((t) => t >= introEnd - 0.01) : -1;
    // a boundary where the loudness or the chords, melody or singing change (each part its own section, so repeats can be found)
    let found = findSections(bars, { extraNovelty: extra, forced: introBar > 0 ? [introBar] : [], sensitivity: T.sensitivity })
        .map((x) => {
            const inside = bars.slice(x.startBar, x.endBar);
            return { ...x, vocal: mean(inside.map((b) => b.vocal)), brightness: mean(inside.map((b) => b.brightness)), density: mean(inside.map((b) => b.density)) };
        });
    const grouped = groupSections(S, found, { threshold: T.group, maxEnergyGap: T.energyGap });
    const runs = T.merge ? mergeRuns(found, grouped) : { sections: found, group: grouped };
    const group = runs.group;
    found = runs.sections;
    const labels = labelByRepetition(found, group, T);
    if (debug) Object.assign(debug, { novelty: extra.map((c) => c.map((v) => Math.round(v * 100) / 100)), found: found.map((x) => x.startBar), group, similarity: sectionSimilarities(S, found).map((r) => r.map((v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : null))) });
    const energies = found.map((x) => x.energy);
    const quiet = Math.min(percentile(energies, 0.3), 0.45);
    let sections;
    if (labels) {
        sections = found.map((x, i) => ({ ...x, label: labels[i], kind: kindForLabel(labels[i], x.energy, quiet) }));
    } else {
        sections = labelSections(found).map((x) => ({ ...x, label: x.kind === 'peak' ? 'chorus' : x.kind === 'build' ? 'pre-chorus' : x.kind }));
    }
    // A one-off section louder than the chorus (a final, biggest section) is a peak too
    const chorusEnergy = mean(sections.filter((x) => x.label === 'chorus').map((x) => x.energy));
    if (chorusEnergy > 0) {
        sections = sections.map((x, i) => (x.kind !== 'peak' && i > 0 && !['verse', 'pre-chorus'].includes(x.label) && x.endBar - x.startBar >= 8 && x.energy >= chorusEnergy + T.climax ? { ...x, kind: 'peak', label: 'climax' } : x));
    }
    // Bollywood: a dense, loud percussion passage is a peak even when it doesn't repeat
    if (profile.percussion) {
        const density = found.map((x) => mean(bars.slice(x.startBar, x.endBar).map((b) => b.density)));
        const busy = percentile(density, 0.8);
        const loud = percentile(energies, 0.5);
        sections = sections.map((x, i) => (x.kind !== 'peak' && density[i] >= busy && x.energy >= loud && i > 0 ? { ...x, kind: 'peak', label: 'climax' } : x));
    }
    // A section heading into a peak that climbs is a build; the ends are the intro and outro
    sections = sections.map((x, i) => {
        let kind = x.kind;
        if (kind !== 'peak' && kind !== 'build' && sections[i + 1]?.kind === 'peak' && (x.rise ?? 0) > 0.05) kind = 'build';
        if (i === 0 && kind !== 'peak') kind = 'intro';
        if (i === sections.length - 1 && kind !== 'peak') kind = 'outro';
        return { ...x, kind, free: i === 0 && introBar > 0 && x.endBar === introBar };
    });
    return markBuilds(sections, bars);
}

/**
 * The whole pipeline. `channels` are Float32Arrays of PCM in [-1, 1] (stereo helps the vocal
 * detection). `genre` is one of genres.js (default EDM: the original analysis). `debug`, an object,
 * is filled with the section grouping internals (for tuning and the test set).
 * Times in the result are seconds, rounded to milliseconds.
 */
export function analyseSong(channels, sampleRate, { genre, debug = null, tuning = null } = {}) {
    const genreKey = normaliseGenre(genre);
    const profile = GENRES[genreKey];
    const original = profile.structure === 'energy';
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
    let bpm;
    let beatFrames;
    let downbeats;
    let meter = 4;
    let tempoChanges = false;
    if (original) {
        bpm = estimateTempo(onset, fps);
        beatFrames = trackBeats(onset, fps, bpm);
        downbeats = findDownbeats(beatFrames, bassOnset);
    } else {
        bpm = estimateTempo(onset, fps, profile.tempo);
        if (profile.moments) bpm = checkTempoOctave(bpm, onset, fps, profile.tempo);
        const curve = profile.follow ? tempoCurve(onset, fps, bpm) : null;
        tempoChanges = Boolean(curve);
        beatFrames = trackBeats(onset, fps, bpm, 100, curve);
        if (curve) bpm = (fps * 60) / ((beatFrames.at(-1) - beatFrames[0]) / Math.max(1, beatFrames.length - 1));
        if (profile.meter) meter = detectMeter(beatFrames, onset);
        downbeats = downbeatsFor(beatFrames, bassOnset, meter);
    }
    const loudness = normalisedLoudness(feats.rms);
    const ms = (s) => Math.round(s * 1000) / 1000;
    // The vocal curve (from the separate channels, for the stereo cue)
    const voice = vocalCurve(channels.map((c) => decimate(c, factor)), sr);
    const vocalBetween = (t0, t1) => {
        const from = Math.max(0, Math.floor((t0 - voice.offset) * voice.fps));
        const to = Math.min(voice.curve.length, Math.max(from + 1, Math.floor((t1 - voice.offset) * voice.fps)));
        let s = 0;
        for (let i = from; i < to; i++) s += voice.curve[i];
        return s / Math.max(1, to - from);
    };

    // Per-bar features (a bar runs from each downbeat to the next)
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
            ...(original ? {} : { vocal: vocalBetween(from / fps + offset, to / fps + offset) }),
        });
    }
    const introEnd = !original && profile.freeIntro ? freeIntroEnd(onset, fps, bpm) : 0;
    const structured = original
        ? markBuilds(labelSections(findSections(bars)), bars)
        : repetitionSections(profile, { signal, sr, duration, bars, onset, beatFrames, downbeats, frames: feats.frames, introEnd, debug, tuning: { ...TUNING, ...tuning } });
    const sections = structured.map((s) => ({
        start: ms(bars[s.startBar].start),
        end: ms(s.endBar < bars.length ? bars[s.endBar].start : duration),
        bars: s.endBar - s.startBar,
        energy: ms(s.energy),
        kind: s.kind,
        ...(s.label ? { label: s.label } : {}),
        ...(s.free ? { free: true } : {}),
    }));
    // Rap: the beat cutting out and slamming back in, snapped to the beat it returns on
    const beatTimes = beatFrames.map((f) => f / fps + offset);
    const nearestBeat = (t) => beatTimes.reduce((best, b) => (Math.abs(b - t) < Math.abs(best - t) ? b : best), t);
    const moments = profile.moments
        ? silenceMoments(loudness, fps, offset, duration).map((m) => ({ start: ms(m.start), end: ms(nearestBeat(m.end)) }))
        : [];
    // The vocal curve at 2 points per second, for the show file
    const vocals = vocalsPerSecond(voice, duration);

    // Loudness curve at 2 points per second, for the timeline preview
    const step = Math.round(fps / 2);
    const energy = [];
    for (let f = 0; f < loudness.length; f += step) energy.push(ms(mean(loudness.slice(f, f + step))));

    return {
        genre: genreKey,
        duration: ms(duration),
        bpm: Math.round(bpm * 10) / 10,
        meter,
        ...(tempoChanges ? { tempoChanges: true } : {}),
        beats: beatTimes.map(ms),
        downbeats,
        sections,
        energy,
        vocals,
        moments,
    };
}
