import { DEFAULT_LOOK, mixLooks, smoothstep } from './look.js';

// One engine plays both shows:
//  - the scroll show, where `t` is scroll progress 0..1, and
//  - the song show, where `t` is seconds into the song.
// A cue sheet is a list of { t, fade, name?, look?: partial look, shot? }. Each cue changes only
// what it names; everything else carries over from the cues before it (like a lighting console's
// tracking mode). A cue fades from whatever was showing when it fired to its look over `fade`.

/** Precompute every cue's full look, starting look and shot, so sampling is cheap. */
export function resolveCueSheet(cues, base = DEFAULT_LOOK) {
    const sorted = [...cues].sort((a, b) => a.t - b.t);
    const resolved = [];
    let full = { ...DEFAULT_LOOK, ...base };
    let shown = full;           // what was on stage when the next cue fires
    let shot = 'wide';
    sorted.forEach((cue, i) => {
        if (i > 0) {
            const prev = resolved[i - 1];
            const k = prev.fade > 0 ? smoothstep((cue.t - prev.t) / prev.fade) : 1;
            shown = mixLooks(prev.from, prev.look, k);
        }
        full = { ...full, ...(cue.look || {}) };
        shot = cue.shot || shot;
        resolved.push({ t: cue.t, fade: cue.fade ?? 0, name: cue.name, look: full, from: shown, shot });
    });
    return { cues: resolved, base: { ...DEFAULT_LOOK, ...base } };
}

/** Index of the last cue at or before t (binary search), or -1. */
export function cueIndexAt(list, t, key = 't') {
    let lo = 0;
    let hi = list.length - 1;
    let found = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const v = key ? list[mid][key] : list[mid];
        if (v <= t) {
            found = mid;
            lo = mid + 1;
        } else hi = mid - 1;
    }
    return found;
}

/** The look and camera shot at time t. */
export function sampleCueSheet(sheet, t) {
    const i = cueIndexAt(sheet.cues, t);
    if (i < 0) return { look: sheet.base, shot: sheet.cues[0]?.shot || 'wide', index: -1, name: null };
    const cue = sheet.cues[i];
    const k = cue.fade > 0 ? smoothstep((t - cue.t) / cue.fade) : 1;
    return { look: mixLooks(cue.from, cue.look, k), shot: cue.shot, index: i, name: cue.name };
}

/**
 * Song show: the cue sheet plus effects locked to the music.
 * `show` = { cues, beats: [s], downbeats: [beat index], hits: [{ t, kind, dur }] }.
 */
export function prepareSongShow(show) {
    return {
        ...show,
        sheet: resolveCueSheet(show.cues),
        downbeatSet: new Set(show.downbeats || []),
        hits: [...(show.hits || [])].sort((a, b) => a.t - b.t),
    };
}

export function sampleSongShow(show, t) {
    const sample = sampleCueSheet(show.sheet, t);
    const look = { ...sample.look };

    // Beat pulse: a sharp hit on every beat that decays quickly; downbeats hit harder
    const b = cueIndexAt(show.beats, t, null);
    if (b >= 0) {
        const since = t - show.beats[b];
        const strength = show.downbeatSet.has(b) ? 1 : 0.6;
        look.pulse = Math.exp(-since * 9) * strength * look.pulseAmount;
    }

    // Hits: a drop fires strobe + blinders for a moment, a blinder hit just flashes the audience
    const h = cueIndexAt(show.hits, t);
    if (h >= 0) {
        const hit = show.hits[h];
        const p = (t - hit.t) / hit.dur;
        if (p < 1) {
            if (hit.kind === 'drop') {
                look.strobe = Math.max(look.strobe, 1 - p);
                look.blinder = Math.max(look.blinder, 1 - p);
            } else if (hit.kind === 'blinder') {
                look.blinder = Math.max(look.blinder, 1 - p);
            } else if (hit.kind === 'strobe') {
                look.strobe = Math.max(look.strobe, 1);
            }
        }
    }
    return { ...sample, look };
}
