// The cryo jets' cue: when they fire in a song, worked out from the song's sections, downbeats and hits, so every song
// gets it, the demo songs and the ones uploaded (every stage with cryo jets plays the same plan). More of it (the
// developer liked it, 2026-11-26), still kept to the song's big moments:
//   1. a build into a drop: a burst on each of its last four downbeats, each a little longer (the last beat silent)
//   2. the drop: one full blast from every nozzle, spreading out from the centre (2.4 s)
//   3. a peak: a burst on the first downbeat of every 8-bar phrase after the drop, the nozzles taking turns (all, the
//      left, the right); a peak with no drop opens with a blast
//   4. a groove: one short burst on its first downbeat
//   5. the finale (the fireworks): left and right in turn on its first 8 downbeats, then one last blast
// Never in quiet parts, breakdowns, the intro or the outro, and never on blinder hits.

const SIDES = [0, -1, 1];

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
    const fireworks = hits.filter((h) => h.kind === 'firework');
    const finale = fireworks.length ? Math.min(...fireworks.map((h) => h.t)) : Infinity;
    // (the finale has its own pattern: the other firings stop where it starts)
    const within = (s, from = s.start) => downs.filter((x) => x >= from - 0.05 && x < s.end - 0.05 && x < finale - 0.05);
    const out = [];
    // 1-2. builds and drops
    for (const d of dropTimes) {
        const build = sections.find((s) => s.kind === 'build' && Math.abs(s.end - d) < 2.5);
        if (build) {
            const last = downs.filter((x) => x < d - 0.05 && x >= build.start).slice(-4);
            last.forEach((t, i) => out.push({ t, dur: 0.4 + 0.1 * (i + 4 - last.length), kind: 'burst', side: 0 }));
        }
        out.push({ t: d, dur: 2.4, kind: 'blast', side: 0 });
    }
    // 3. peaks: a burst every 8 bars after the drop (or a blast to open a peak without one)
    for (const p of peaks) {
        const drop = dropTimes.find((d) => d >= p.start - 0.5 && d < p.end);
        if (drop === undefined) {
            const first = within(p)[0];
            if (first !== undefined) out.push({ t: first, dur: 1.6, kind: 'blast', side: 0 });
        }
        const from = drop ?? p.start;
        within(p, from + 0.1).filter((_, i) => (i + 1) % 8 === 0).forEach((t, i) => out.push({ t, dur: 0.8, kind: 'burst', side: SIDES[i % SIDES.length] }));
    }
    // 4. grooves: one short burst as each starts
    for (const g of sections.filter((s) => s.kind === 'groove')) {
        const first = within(g)[0];
        if (first !== undefined) out.push({ t: first, dur: 0.6, kind: 'burst', side: 0 });
    }
    // 5. the finale
    if (fireworks.length) {
        const run = downs.filter((x) => x >= finale - 0.05).slice(0, 9);
        run.slice(0, 8).forEach((t, i) => out.push({ t, dur: 0.7, kind: 'alt', side: i % 2 ? 1 : -1 }));
        if (run[8] !== undefined) out.push({ t: run[8], dur: 2.4, kind: 'blast', side: 0 });
    }
    // only in the song's big parts: nothing in quiet parts, breakdowns, the intro or the outro
    const quiet = sections.filter((s) => ['calm', 'verse', 'breakdown', 'intro', 'outro'].includes(s.kind));
    const loud = out.filter((f) => f.kind === 'blast' || !quiet.some((s) => f.t >= s.start && f.t < s.end - 0.05));
    // one firing at a time: a later one that starts inside a blast, or on top of another, is dropped
    loud.sort((a, b) => a.t - b.t || (b.kind === 'blast') - (a.kind === 'blast'));
    const kept = [];
    for (const f of loud) {
        const last = kept.at(-1);
        if (last && (f.t < last.t + 0.3 || (last.kind === 'blast' && f.t < last.t + last.dur))) continue;
        kept.push(f);
    }
    return kept;
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
