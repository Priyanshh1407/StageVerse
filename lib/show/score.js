// Scoring the song analysis against hand-marked structures (item 14, part 6: the test set).
// Pure functions: the script (scripts/score-analysis.mjs) reads the files and prints the table.
//
//   boundaries  section starts found within `tolerance` seconds of a marked one (precision, recall, F1)
//   peaks       how well the stretches lit as peaks match the marked peaks (F1 over half-second steps)
//   chorus      the same for the chorus (the EDM analysis has no labels: its peaks are its chorus guess)
//   tempo       within 4% of the marked tempo; half or double counts as an octave error
//   meter       beats per bar, when marked
//   moments     rap: marked "beat cuts out and comes back" moments found within a second

const PEAK_LABELS = new Set(['chorus', 'drop', 'climax']);

const f1 = (p, r) => (p + r > 0 ? (2 * p * r) / (p + r) : 0);

/** The marked sections as spans { start, end, label, peak }. */
export function spans(annotation) {
    const list = annotation.sections;
    return list.map((s, i) => ({
        start: s.start,
        end: list[i + 1]?.start ?? annotation.end,
        label: s.label,
        peak: s.peak ?? PEAK_LABELS.has(s.label),
    }));
}

/** Boundary precision, recall and F1: each marked boundary can be matched once, within `tolerance` s. */
export function boundaryScore(marked, found, tolerance = 3) {
    const ref = marked.filter((t) => t > 1);
    const est = found.filter((t) => t > 1);
    const used = new Set();
    let hits = 0;
    for (const t of est) {
        let best = -1;
        let bestGap = tolerance;
        ref.forEach((r, i) => {
            const gap = Math.abs(r - t);
            if (!used.has(i) && gap <= bestGap) {
                best = i;
                bestGap = gap;
            }
        });
        if (best >= 0) {
            used.add(best);
            hits++;
        }
    }
    const precision = est.length ? hits / est.length : ref.length ? 0 : 1;
    const recall = ref.length ? hits / ref.length : 1;
    return { precision, recall, f1: f1(precision, recall) };
}

/** F1 of two sets of time spans, compared every `step` seconds over [0, duration). */
export function overlapScore(markedSpans, foundSpans, duration, step = 0.5) {
    const inside = (list, t) => list.some((s) => t >= s.start && t < s.end);
    let tp = 0;
    let fp = 0;
    let fn = 0;
    for (let t = 0; t < duration; t += step) {
        const a = inside(markedSpans, t);
        const b = inside(foundSpans, t);
        if (a && b) tp++;
        else if (b) fp++;
        else if (a) fn++;
    }
    // nothing marked and nothing found is a perfect match
    if (tp + fp + fn === 0) return { precision: 1, recall: 1, f1: 1 };
    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    return { precision, recall, f1: f1(precision, recall) };
}

/** Tempo check: right (within 4%), an octave off (half or double), or wrong. */
export function tempoScore(marked, found) {
    const close = (a, b) => Math.abs(a / b - 1) <= 0.04;
    if (close(found, marked)) return 'ok';
    if (close(found, marked * 2) || close(found, marked / 2)) return 'octave';
    return 'wrong';
}

/** Everything for one song: `analysis` is analyseSong's result. */
export function scoreSong(annotation, analysis) {
    const marked = spans(annotation);
    const duration = annotation.end;
    const found = analysis.sections;
    const chorusOf = (s) => s.label ?? (s.kind === 'peak' ? 'chorus' : s.kind);
    const result = {
        boundaries: boundaryScore(marked.map((s) => s.start), found.map((s) => s.start)),
        peaks: overlapScore(marked.filter((s) => s.peak), found.filter((s) => s.kind === 'peak'), duration),
        chorus: overlapScore(marked.filter((s) => s.label === 'chorus'), found.filter((s) => chorusOf(s) === 'chorus'), duration),
        tempo: annotation.bpm ? tempoScore(annotation.bpm, analysis.bpm) : null,
        meter: annotation.meter ? analysis.meter === annotation.meter : null,
    };
    if (annotation.moments?.length) {
        const hits = annotation.moments.filter((m) => (analysis.moments || []).some((x) => Math.abs(x.end - m.t) <= 1)).length;
        result.moments = hits / annotation.moments.length;
    }
    return result;
}

/** Averages over songs (tempo and meter as the share right). */
export function summarise(results) {
    const avg = (pick) => {
        const vals = results.map(pick).filter((v) => v !== null && v !== undefined);
        return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    };
    return {
        songs: results.length,
        boundaries: avg((r) => r.boundaries.f1),
        peaks: avg((r) => r.peaks.f1),
        chorus: avg((r) => r.chorus.f1),
        tempo: avg((r) => (r.tempo === null ? null : r.tempo === 'ok' ? 1 : 0)),
        meter: avg((r) => (r.meter === null ? null : r.meter ? 1 : 0)),
        moments: avg((r) => r.moments ?? null),
    };
}
