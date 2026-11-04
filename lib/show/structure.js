// Song structure by repetition (item 14, part 2). Pop is mastered loud the whole way through, so a
// chorus is barely louder than a verse: what marks it is that it comes back. Chords and melody are
// summarised per bar as a chroma vector (how much of each of the 12 pitch classes sounds), bars are
// compared with each other (a self-similarity matrix), boundaries are where that similarity pattern
// changes (Foote's checkerboard novelty), and sections whose bars match are grouped. The group that
// repeats and is loudest is the chorus; the one leading into it the verse; a short different part
// right before a chorus the pre-chorus; a one-off part late in the song the bridge.
// Pure functions, no imports (beyond the FFT), so they run in the worker, in Node and in tests.
import { fft } from './analysis.js';

/**
 * Chroma per frame: energy per pitch class (C = 0 ... B = 11), from 100 Hz to 2.5 kHz where chords
 * and melody live. A 4096-point FFT, so semitones are resolved down to ~100 Hz at 22 kHz.
 */
export function chromaFrames(signal, sampleRate, { size = 4096, hop = 2048 } = {}) {
    const frames = Math.max(0, Math.floor((signal.length - size) / hop) + 1);
    const chroma = new Float32Array(frames * 12);
    const window = new Float32Array(size).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)));
    const re = new Float64Array(size);
    const im = new Float64Array(size);
    const mag = new Float64Array(size / 2);
    // Each FFT bin's pitch class (-1 outside the range)
    const pc = new Int8Array(size / 2).fill(-1);
    for (let k = 1; k < size / 2; k++) {
        const f = (k * sampleRate) / size;
        if (f < 100 || f > 2500) continue;
        pc[k] = ((Math.round(12 * Math.log2(f / 440) + 69) % 12) + 12) % 12;
    }
    for (let fr = 0; fr < frames; fr++) {
        const off = fr * hop;
        for (let i = 0; i < size; i++) {
            re[i] = signal[off + i] * window[i];
            im[i] = 0;
        }
        fft(re, im);
        const o = fr * 12;
        // Only spectral peaks count (actual notes): drum hits smear energy across every bin, which
        // would otherwise blur every chord into every other
        for (let k = 1; k < size / 2; k++) mag[k] = Math.hypot(re[k], im[k]);
        let top = 0;
        for (let k = 1; k < size / 2; k++) if (pc[k] >= 0 && mag[k] > top) top = mag[k];
        for (let k = 2; k < size / 2 - 1; k++) {
            if (pc[k] < 0 || mag[k] < top * 0.05 || mag[k] < mag[k - 1] || mag[k] < mag[k + 1]) continue;
            chroma[o + pc[k]] += mag[k];
        }
    }
    return { frames, fps: sampleRate / hop, offset: size / 2 / sampleRate, chroma };
}

const norm = (v) => {
    let s = 0;
    for (const x of v) s += x * x;
    s = Math.sqrt(s) || 1;
    return v.map((x) => x / s);
};
const dot = (a, b) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
};

/** One unit-length chroma vector per bar, averaged over the frames inside it (times in seconds). */
export function barChroma(ch, barTimes, duration) {
    return barTimes.map((start, b) => {
        const end = barTimes[b + 1] ?? duration;
        const v = new Array(12).fill(0);
        const from = Math.max(0, Math.floor((start - ch.offset) * ch.fps));
        const to = Math.min(ch.frames, Math.max(from + 1, Math.ceil((end - ch.offset) * ch.fps)));
        for (let f = from; f < to; f++) for (let p = 0; p < 12; p++) v[p] += ch.chroma[f * 12 + p];
        // Contrast: keep what stands out over the bar's floor, so a chord isn't drowned by noise
        const floor = Math.min(...v);
        return norm(v.map((x) => x - floor));
    });
}

/**
 * Bar-by-bar similarity, 0..1: chords and melody (chroma) mostly, plus how loud, bright and busy
 * the bars are and whether someone's singing, so the same chords as a riff and as a verse, or played
 * softly and loudly, still differ a little.
 */
export function selfSimilarity(chroma, bars) {
    const n = chroma.length;
    const S = Array.from({ length: n }, () => new Float32Array(n));
    for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
            const c = Math.max(0, dot(chroma[i], chroma[j]));
            const a = bars[i];
            const b = bars[j];
            const t = 1 - (Math.abs(a.energy - b.energy) + Math.abs(a.brightness - b.brightness) + Math.abs(a.density - b.density) + Math.abs((a.vocal ?? 0) - (b.vocal ?? 0))) / 4;
            S[i][j] = S[j][i] = 0.7 * c + 0.3 * t;
        }
    }
    return S;
}

/** Foote novelty: a checkerboard kernel slid down the diagonal; peaks are where the music changes. */
export function footeNovelty(S, half = 4) {
    const n = S.length;
    const out = new Array(n).fill(0);
    for (let b = half; b <= n - half; b++) {
        let within = 0;
        let across = 0;
        for (let i = -half; i < half; i++) {
            for (let j = -half; j < half; j++) {
                const v = S[b + i][b + j];
                if ((i < 0) === (j < 0)) within += v;
                else across += v;
            }
        }
        out[b] = Math.max(0, (within - across) / (2 * half * half));
    }
    return out;
}

/** How alike two sections are: their bars compared in step (the shorter slid along the longer). */
export function segmentSimilarity(S, a, b) {
    const la = a.endBar - a.startBar;
    const lb = b.endBar - b.startBar;
    const len = Math.min(la, lb);
    if (len <= 0) return 0;
    let best = 0;
    const slide = Math.abs(la - lb);
    for (let s = 0; s <= slide; s++) {
        let sum = 0;
        for (let k = 0; k < len; k++) {
            const i = a.startBar + k + (la > lb ? s : 0);
            const j = b.startBar + k + (lb > la ? s : 0);
            sum += S[i][j];
        }
        best = Math.max(best, sum / len);
    }
    return best;
}

/**
 * The similarity matrix with each row's own baseline taken out (z-scores): in a song that keeps the
 * same chords throughout, every bar looks alike in absolute terms; what matters is which bars are
 * more alike than usual.
 */
export function contrastSimilarity(S) {
    return S.map((row, i) => {
        const others = Array.from(row).filter((_, j) => j !== i);
        const m = others.reduce((s, v) => s + v, 0) / (others.length || 1);
        const sd = Math.sqrt(others.reduce((s, v) => s + (v - m) ** 2, 0) / (others.length || 1)) || 1;
        return row.map((v) => (v - m) / sd);
    });
}

/** Every pair of sections' similarity (on the contrast matrix). */
export function sectionSimilarities(S, sections) {
    const Z = contrastSimilarity(S);
    return sections.map((a, i) => sections.map((b, j) => (i === j ? Infinity : segmentSimilarity(Z, a, b))));
}

/**
 * Group sections that repeat: each section joins the most similar earlier group when its bars are
 * clearly more alike than this song's bars usually are (`threshold`, in standard deviations), else
 * starts a new one. Sections far apart in loudness never group: a quiet piano intro playing the
 * chorus chords isn't the chorus. Returns a group index per section (0, 1, 2 ... in order of first
 * appearance).
 */
export function groupSections(S, sections, { threshold = 0.9, maxEnergyGap = 0.2 } = {}) {
    const n = sections.length;
    const sim = sectionSimilarities(S, sections);
    const group = new Array(n).fill(-1);
    let next = 0;
    for (let i = 0; i < n; i++) {
        let best = -1;
        let bestSim = threshold;
        for (let j = 0; j < i; j++) {
            if (sim[i][j] > bestSim && Math.abs(sections[i].energy - sections[j].energy) <= maxEnergyGap) {
                bestSim = sim[i][j];
                best = group[j];
            }
        }
        group[i] = best >= 0 ? best : next++;
    }
    return group;
}

/**
 * Musical labels from the groups and the loudness: intro, verse, pre-chorus, chorus, bridge,
 * instrumental, outro. `sections` have { startBar, endBar, energy, vocal? }; returns a label per
 * section, or null when nothing repeats (the caller falls back to judging by loudness). With vocal
 * levels, only sung groups can be the chorus or the verse: a riff that comes back isn't the chorus.
 */
export function labelByRepetition(sections, group, { sung: sungShare = 0.6, bright = 0.5, dense = 0.5 } = {}) {
    const n = sections.length;
    const members = new Map();
    group.forEach((g, i) => members.set(g, [...(members.get(g) ?? []), i]));
    let repeated = [...members.entries()].filter(([, idx]) => idx.length >= 2);
    if (!repeated.length) return null;
    const bars0 = (i) => sections[i].endBar - sections[i].startBar;
    if (sections.every((x) => x.vocal !== undefined)) {
        const sung = (idx) => idx.reduce((s, i) => s + sections[i].vocal * bars0(i), 0) / Math.max(1, idx.reduce((s, i) => s + bars0(i), 0));
        const most = Math.max(...repeated.map(([, idx]) => sung(idx)));
        const singing = repeated.filter(([, idx]) => sung(idx) >= sungShare * most);
        if (singing.length) repeated = singing;
    }
    const bars = (i) => sections[i].endBar - sections[i].startBar;
    // weighted by length, so a short tail (a fade at the end) doesn't drag a group down
    const meanEnergy = (idx) => idx.reduce((s, i) => s + sections[i].energy * bars(i), 0) / Math.max(1, idx.reduce((s, i) => s + bars(i), 0));

    // Chorus: the repeated group that sounds biggest. In a pop song mastered loud throughout the
    // chorus is barely louder, but it adds layers: brighter and busier as well (ties: the one that
    // comes back more often)
    const lift = (i) => sections[i].energy + bright * (sections[i].brightness ?? 0) + dense * (sections[i].density ?? 0);
    const chorusScore = (idx) => idx.reduce((s, i) => s + lift(i) * bars(i), 0) / Math.max(1, idx.reduce((s, i) => s + bars(i), 0));
    const [chorusGroup] = repeated.reduce((a, b) => {
        const d = chorusScore(b[1]) - chorusScore(a[1]);
        return d > 0.01 || (Math.abs(d) <= 0.01 && b[1].length > a[1].length) ? b : a;
    });
    const labels = group.map((g) => (g === chorusGroup ? 'chorus' : null));
    const chorusAt = labels.map((l) => l === 'chorus');

    // Verse: the repeated group whose sections most often lead into a chorus (directly or one section before)
    let verseGroup = -1;
    let bestLead = 0;
    for (const [g, idx] of repeated) {
        if (g === chorusGroup) continue;
        const lead = idx.filter((i) => chorusAt[i + 1] || chorusAt[i + 2]).length;
        if (lead > bestLead || (lead === bestLead && verseGroup < 0)) {
            bestLead = lead;
            verseGroup = g;
        }
    }
    const firstChorus = chorusAt.indexOf(true);
    const secondChorus = chorusAt.indexOf(true, firstChorus + 1);
    for (let i = 0; i < n; i++) {
        if (labels[i]) continue;
        if (group[i] === verseGroup) labels[i] = 'verse';
        // A short, different part right before a chorus, after a verse: the pre-chorus
        else if (chorusAt[i + 1] && bars(i) <= 8 && i > 0 && labels[i - 1] !== 'chorus') labels[i] = 'pre-chorus';
    }
    for (let i = 0; i < n; i++) {
        if (labels[i]) continue;
        if (i === 0) labels[i] = 'intro';
        else if (i === n - 1) labels[i] = 'outro';
        // A one-off part after the second chorus: the bridge
        else if (secondChorus >= 0 && i > secondChorus && (members.get(group[i])?.length ?? 1) === 1) labels[i] = 'bridge';
        else labels[i] = 'instrumental';
    }
    // The first section is the intro unless it's already the chorus (some songs open on it)
    if (labels[0] === 'verse' && n > 2 && sections[0].energy < meanEnergy(members.get(verseGroup)) - 0.1) labels[0] = 'intro';
    return labels;
}

/**
 * Neighbouring sections in the same group are one part cut in pieces (a long verse with a change of
 * loudness halfway): join them, so a part counts once each time it comes back. `sections` carry
 * per-section numbers averaged by length; returns { sections, group }.
 */
export function mergeRuns(sections, group) {
    const out = [];
    const groups = [];
    const keys = ['energy', 'vocal', 'brightness', 'density'];
    sections.forEach((x, i) => {
        const prev = out[out.length - 1];
        if (prev && groups[groups.length - 1] === group[i]) {
            const a = prev.endBar - prev.startBar;
            const b = x.endBar - x.startBar;
            for (const k of keys) if (x[k] !== undefined) prev[k] = (prev[k] * a + x[k] * b) / (a + b);
            prev.rise = (prev.rise ?? 0) + (x.rise ?? 0);
            prev.endBar = x.endBar;
        } else {
            out.push({ ...x });
            groups.push(group[i]);
        }
    });
    return { sections: out, group: groups };
}

/** The lighting kind for each musical label (what program.js lights). */
export function kindForLabel(label, energy, quietLevel) {
    switch (label) {
        // a chorus is lit as a peak unless it's one of the song's quiet parts (a soft first chorus)
        case 'chorus': return energy <= quietLevel ? 'groove' : 'peak';
        case 'pre-chorus': return 'build';
        case 'intro': return 'intro';
        case 'outro': return 'outro';
        case 'bridge': return energy <= quietLevel ? 'calm' : 'groove';
        default: return energy <= quietLevel ? 'calm' : 'groove';
    }
}
