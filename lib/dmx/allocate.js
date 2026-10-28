// Deterministic DMX address allocation.
//
// A DMX universe has 512 channels. A fixture occupies `channels` consecutive channels starting
// at `address` (1-based), so it covers [address, address + channels - 1]. Two fixtures in the
// same universe collide if those ranges overlap. Placing new fixtures is interval packing,
// which is exact and cheap in code and unreliable in an LLM, so the model never does it.

export const UNIVERSE_SIZE = 512;
export const MAX_UNIVERSES = 64;

// Footprints used when neither the request nor the profile says how many channels a type uses
const DEFAULT_CHANNELS = {
    beam: 16, spot: 24, profile: 32, wash: 14, strobe: 4, blinder: 4,
    par: 8, 'led par': 8, laser: 12, hazer: 2, fogger: 2, bar: 12, pixel: 48,
};

export function defaultChannels(type) {
    const t = String(type ?? '').toLowerCase();
    const key = Object.keys(DEFAULT_CHANNELS).sort((a, b) => b.length - a.length).find((k) => t.includes(k));
    return key ? DEFAULT_CHANNELS[key] : 16;
}

const end = (f) => f.address + f.channels - 1;

/** Fixtures whose range leaves the universe, and every overlapping pair (by index). */
export function findConflicts(fixtures) {
    const outOfRange = [];
    const overlaps = [];
    fixtures.forEach((f, i) => {
        if (!Number.isInteger(f.universe) || f.universe < 1 || !Number.isInteger(f.address) || f.address < 1 || end(f) > UNIVERSE_SIZE) {
            outOfRange.push(i);
        }
    });
    const byUniverse = new Map();
    fixtures.forEach((f, i) => {
        if (!byUniverse.has(f.universe)) byUniverse.set(f.universe, []);
        byUniverse.get(f.universe).push(i);
    });
    for (const indexes of byUniverse.values()) {
        const sorted = [...indexes].sort((a, b) => fixtures[a].address - fixtures[b].address);
        for (let x = 0; x < sorted.length; x++) {
            for (let y = x + 1; y < sorted.length; y++) {
                const a = fixtures[sorted[x]];
                const b = fixtures[sorted[y]];
                if (b.address > end(a)) break; // sorted: nothing later can overlap a
                overlaps.push([sorted[x], sorted[y]]);
            }
        }
    }
    return { outOfRange, overlaps, ok: outOfRange.length === 0 && overlaps.length === 0 };
}

/** Lowest (universe, address) where `channels` fit without touching occupied ranges. */
function firstFit(occupied, channels, startUniverse = 1) {
    for (let universe = startUniverse; universe <= MAX_UNIVERSES; universe++) {
        const ranges = (occupied.get(universe) || []).slice().sort((a, b) => a[0] - b[0]);
        let candidate = 1;
        for (const [start, stop] of ranges) {
            if (candidate + channels - 1 < start) break; // fits in the gap before this range
            candidate = Math.max(candidate, stop + 1);
        }
        if (candidate + channels - 1 <= UNIVERSE_SIZE) return { universe, address: candidate };
    }
    return null;
}

function occupy(occupied, f) {
    if (!occupied.has(f.universe)) occupied.set(f.universe, []);
    occupied.get(f.universe).push([f.address, end(f)]);
}

/**
 * Place new fixtures around an existing patch. Existing fixtures never move.
 * @param existing  [{ universe, address, channels }]
 * @param requests  [{ type, count, channels?, mode? }]
 * @returns placed fixtures [{ type, mode, channels, universe, address }]
 */
export function allocate(existing, requests) {
    const occupied = new Map();
    existing.forEach((f) => occupy(occupied, f));

    const placed = [];
    for (const r of requests) {
        const channels = r.channels ?? defaultChannels(r.type);
        if (channels < 1 || channels > UNIVERSE_SIZE) throw new RangeError(`${r.type}: ${channels} channels can't fit in a universe`);
        for (let i = 0; i < (r.count ?? 1); i++) {
            const spot = firstFit(occupied, channels);
            if (!spot) throw new RangeError(`Out of space: no room for ${r.type} in ${MAX_UNIVERSES} universes`);
            const fixture = { type: r.type, mode: r.mode ?? 'Standard', channels, ...spot };
            occupy(occupied, fixture);
            placed.push(fixture);
        }
    }
    return placed;
}

/**
 * Re-address a whole patch so nothing overlaps, keeping the fixtures' current order
 * (by universe, then address) and every other field (type, mode, channels...).
 */
export function repatch(fixtures) {
    const order = fixtures
        .map((f, i) => ({ f, i }))
        .sort((a, b) => (a.f.universe - b.f.universe) || (a.f.address - b.f.address) || (a.i - b.i));
    const occupied = new Map();
    let universe = 1;
    const result = new Array(fixtures.length);
    for (const { f, i } of order) {
        const spot = firstFit(occupied, f.channels, universe);
        if (!spot) throw new RangeError(`Out of space while repatching (${MAX_UNIVERSES} universes)`);
        universe = spot.universe; // pack forward; never go back to an earlier universe
        const moved = { ...f, ...spot };
        occupy(occupied, moved);
        result[i] = moved;
    }
    return result;
}
