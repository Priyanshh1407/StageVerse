// Deterministic setlist ordering, used when no AI provider is available.
// Classic live-show shape: a strong opener, energy easing down to the middle,
// building back up, and the highest-energy song last. BPM stands in for energy.

const bpmOf = (song) => {
    const n = parseInt(String(song?.bpm ?? '').replace(/[^\d]/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * @param songs [{ id, bpm }]  bpm may be a number or text like "128 BPM"; unknown BPMs sit mid-pack
 * @returns ids in the new order (every input id exactly once)
 */
export function energyCurve(songs) {
    const known = songs.map(bpmOf).filter((b) => b !== null).sort((a, b) => a - b);
    const median = known.length ? known[Math.floor(known.length / 2)] : 120;
    const byEnergy = songs
        .map((s, i) => ({ id: s.id, bpm: bpmOf(s) ?? median, i }))
        .sort((a, b) => (b.bpm - a.bpm) || (a.i - b.i)); // highest first; stable for ties

    if (byEnergy.length < 3) return byEnergy.map((s) => s.id);

    const [closer, opener, ...rest] = byEnergy;
    // Alternate the rest into a descending first half and an ascending second half (a "V")
    const down = rest.filter((_, k) => k % 2 === 0);
    const up = rest.filter((_, k) => k % 2 === 1).reverse();
    return [opener, ...down, ...up, closer].map((s) => s.id);
}
