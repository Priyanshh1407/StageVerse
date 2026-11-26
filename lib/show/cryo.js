// The cryo jets' cue: when they fire in a song, worked out from the song's sections, downbeats and hits (every stage
// with cryo jets plays the same plan). Kept for the drop's moments, so it stays special:
//   1. the end of a build: a short burst on each of the last two downbeats before the drop (the last beat silent)
//   2. the drop: one full blast from every nozzle, spreading out from the centre (2.4 s)
//   3. the first downbeat of the next phrase (8 bars after the drop), still in the peak: one burst
//   4. the finale (the fireworks): left and right in turn on its first 8 downbeats
// Never in quiet parts, breakdowns or the intro, and never on blinder hits.

/** The firings in a song: [{ t, dur, kind: 'burst' | 'blast' | 'alt', side: -1 | 0 | 1 }], in time order. */
export function planCryo(show) {
    const beats = show.beats ?? [];
    const downs = (show.downbeats ?? []).map((i) => beats[i]).filter(Number.isFinite).sort((a, b) => a - b);
    const sections = show.sections ?? [];
    const hits = show.hits ?? [];
    const peaks = sections.filter((s) => s.kind === 'peak');
    const drops = hits.filter((h) => h.kind === 'drop').map((h) => h.t);
    // (a song without a drop hit: the start of every peak that follows a build)
    const dropTimes = drops.length ? drops : peaks.filter((p) => sections.some((s) => s.kind === 'build' && Math.abs(s.end - p.start) < 0.5)).map((p) => p.start);
    const out = [];
    for (const d of dropTimes) {
        const build = sections.find((s) => s.kind === 'build' && Math.abs(s.end - d) < 2.5);
        if (build) for (const t of downs.filter((x) => x < d - 0.05 && x >= build.start).slice(-2)) out.push({ t, dur: 0.55, kind: 'burst', side: 0 });
        out.push({ t: d, dur: 2.4, kind: 'blast', side: 0 });
        const peak = peaks.find((p) => d >= p.start - 0.5 && d < p.end);
        const next = downs.filter((x) => x > d + 0.05)[7];
        if (peak && next !== undefined && next < peak.end) out.push({ t: next, dur: 0.8, kind: 'burst', side: 0 });
    }
    const fireworks = hits.filter((h) => h.kind === 'firework');
    if (fireworks.length) {
        const start = Math.min(...fireworks.map((h) => h.t));
        downs.filter((x) => x >= start - 0.05).slice(0, 8).forEach((t, i) => out.push({ t, dur: 0.7, kind: 'alt', side: i % 2 ? 1 : -1 }));
    }
    // one firing at a time: a later one that starts inside a blast is dropped
    out.sort((a, b) => a.t - b.t);
    return out.filter((f, i) => !out.slice(0, i).some((o) => o.kind === 'blast' && f.t > o.t && f.t < o.t + o.dur));
}

/** The jets at song time t: { level 0..1, side (-1 left only, 1 right only, 0 all), reveal (how far out from the
 *  centre the blast has spread, 0..1.3; 2 = all) }, or null while they're idle. */
export function cryoAt(plan, t) {
    let found = null;
    for (const f of plan ?? []) {
        if (f.t > t) break;
        const p = (t - f.t) / f.dur;
        if (p < 0 || p >= 1) continue;
        const level = f.kind === 'blast' ? (p < 0.7 ? 1 : (1 - p) / 0.3) : 1 - p * p;
        found = { level, side: f.side, reveal: f.kind === 'blast' ? Math.min(1.3, (t - f.t) / 0.45) : 2 };
    }
    return found;
}
