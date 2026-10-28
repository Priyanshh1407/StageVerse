import { DEFAULT_LOOK, mixLooks, mixHex, smoothstep } from './look.js';

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
        // Beat position (beats since the start, with fraction) for beat-locked effects
        const len = (show.beats[b + 1] ?? show.beats[b] + 0.5) - show.beats[b];
        look.beatPos = b + Math.min(1, since / len);
    }

    // Brightness follows the song's loudness, as much as the cue asks
    if (look.energyFollow > 0 && show.energy?.length) {
        const x = Math.min(show.energy.length - 1, Math.max(0, t * 2));
        const i = Math.floor(x);
        const e = show.energy[i] + ((show.energy[i + 1] ?? show.energy[i]) - show.energy[i]) * (x - i);
        look.intensity *= 1 - look.energyFollow + look.energyFollow * (0.15 + 1.0 * e);
    }

    // Every hit still running applies (several can land on the same beat: a burst, a strobe, a blinder)
    for (let h = cueIndexAt(show.hits, t); h >= 0 && t - show.hits[h].t < 8; h--) {
        const hit = show.hits[h];
        const p = (t - hit.t) / hit.dur;
        if (p >= 1) continue;
        if (hit.kind === 'drop') {
            // A real drop: a white blast, hard strobing, beams slammed onto the stage centre,
            // floor fixtures thrown out and the lasers chasing, then release
            look.strobe = Math.max(look.strobe, p < 0.7 ? 1 : (1 - p) / 0.3);
            look.blinder = Math.max(look.blinder, Math.max(0, 1 - p * 4));
            look.dropFx = Math.max(look.dropFx ?? 0, 1 - p);
            look.laserChase = 1;
            look.laser = Math.max(look.laser, 1);
        } else if (hit.kind === 'blinder') {
            look.blinder = Math.max(look.blinder, 1 - p);
        } else if (hit.kind === 'strobe') {
            look.strobe = Math.max(look.strobe, 1);
        } else if (hit.kind === 'tint') {
            // Every lit fixture takes one colour: in fast, hold, ease back out over the last 30%
            const k = Math.min(smoothstep(p / 0.08), smoothstep((1 - p) / 0.3));
            for (const key of ['colorA', 'colorB', 'washColor', 'laserColor']) look[key] = mixHex(look[key], hit.color, k);
        } else if (hit.kind === 'burst') {
            // A burst of energy: every group to full, as bright as the rig goes
            look.intensity = Math.max(look.intensity, 1.6);
            look.beams = Math.max(look.beams, 1);
            look.sides = Math.max(look.sides, 1);
            look.floor = Math.max(look.floor, 1);
            look.strobe = Math.max(look.strobe, 1 - p);
        }
    }
    return { ...sample, look };
}
