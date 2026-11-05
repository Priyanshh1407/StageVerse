/**
 * What the homepage waits for before it reveals itself: a small store the 3D stage and the show
 * report into as each part becomes ready, read by the loading screen (useSyncExternalStore).
 *
 *   tier      the quality tier is chosen (3D, or the poster for weak devices)
 *   stage     the venue, truss, LED wall, lasers and haze: shaders compiled
 *   fixtures  the moving heads and strobes: models loaded, shaders compiled
 *   effects   CO2, confetti, streamers and fireworks: shaders compiled
 *   fonts     the display and logo faces (the LED wall and the venue sign are drawn with them)
 *   songs     the demo song list
 */
export const PARTS = ['tier', 'stage', 'fixtures', 'effects', 'fonts', 'songs'];

// What the loading screen says while a part is still on its way
export const PART_LABELS = {
    tier: 'Checking your graphics',
    stage: 'Rigging the stage',
    fixtures: 'Focusing the fixtures',
    effects: 'Loading the pyro',
    fonts: 'Programming the LED wall',
    songs: 'Loading the songs',
};

let done = new Set();
let snapshot = { done: 0, total: PARTS.length, next: PARTS[0], ready: false };
const listeners = new Set();

function publish() {
    const next = PARTS.find((p) => !done.has(p)) ?? null;
    snapshot = { done: done.size, total: PARTS.length, next, ready: next === null };
    listeners.forEach((fn) => fn());
}

/** A part is ready (again reporting the same part does nothing). */
export function markReady(...parts) {
    let changed = false;
    for (const p of parts) {
        if (PARTS.includes(p) && !done.has(p)) {
            done.add(p);
            changed = true;
        }
    }
    if (changed) publish();
}

/** Start over (the homepage mounting again after a visit to another page). */
export function resetReady() {
    done = new Set();
    publish();
}

export function subscribeReady(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export const getReady = () => snapshot;
