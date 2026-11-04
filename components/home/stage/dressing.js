// Stage try-outs (item 3 in the change list): parts of the stage that can be switched on and off
// from the lighting desk at any time, even mid-song, to compare how the stage looks with and
// without them. The stage reads these every frame; the desk subscribes to redraw its switches.
const state = { skirt: true, glossy: true, barrier: true, fog: true, fade: true };
const listeners = new Set();

export const dressing = state;

export function setDressing(patch) {
    Object.assign(state, patch);
    listeners.forEach((fn) => fn());
}

export function subscribeDressing(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

// useSyncExternalStore needs a snapshot that only changes when the values do
let snapshot = { ...state };
subscribeDressing(() => { snapshot = { ...state }; });
export const getDressing = () => snapshot;
