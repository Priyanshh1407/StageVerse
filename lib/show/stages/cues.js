// Every kind of cue the shows use, collected from the programmed demo songs, so each one can be held
// on a stage and looked at on its own. A cue's name in a show is like "Groove 3 · phrase 2" or
// "Solo · aerial beams · bar 2": the numbers and the phrase or bar are dropped, so each kind appears
// once (the first time any song uses it). A cue in a show only lists what it changes, so each one is
// resolved into its complete look the way the timeline does it.

import { resolveCueSheet } from '../timeline.js';

/** "Peak 5 · chorus" -> "Peak · chorus"; "Solo · washes · bar 3" -> "Solo · washes"; "Build 4 · phrase 2" -> "Build". */
export function cueKind(name = '') {
    const parts = String(name).split(/\s*·\s*/).map((p) => p.trim()).filter(Boolean);
    const head = (parts[0] ?? '').replace(/\s*\d+$/, '');
    const detail = parts.slice(1).filter((p) => !/^(phrase|bar)\s*\d+$/i.test(p));
    return [head, ...detail].join(' · ');
}

/** The distinct cues across shows: [{ kind, look, shot, song, t }] in the order they first appear. */
export function collectCues(shows) {
    const seen = new Map();
    for (const show of shows) {
        for (const cue of resolveCueSheet(show.cues ?? []).cues) {
            const kind = cueKind(cue.name);
            if (!kind || seen.has(kind)) continue;
            seen.set(kind, { kind, look: cue.look, shot: cue.shot ?? null, song: show.title, t: cue.t });
        }
    }
    // the side towers' solo in both its types, whichever one the songs happen to use
    const sides = seen.get('Solo · side towers');
    if (sides) {
        seen.set('Solo · side towers', { ...sides, look: { ...sides.look, sidesMirror: 0 } });
        seen.set('Solo · side towers · mirrored', { ...sides, kind: 'Solo · side towers · mirrored', look: { ...sides.look, sidesMirror: 1 } });
    }
    // the circle (festival stages): every group lit, every beam tracing a circle
    const allIn = seen.get('Peak · all in') ?? seen.get('Peak');
    if (allIn) seen.set('Circle · all beams', { ...allIn, kind: 'Circle · all beams', look: { ...allIn.look, beams: 1, sides: 1, floor: 1, wash: 1, circle: 1, speed: Math.max(1.2, allIn.look.speed ?? 1) } });
    return [...seen.values()];
}

/**
 * The hits a show fires on top of its cues, as the timeline applies them (lib/show/timeline.js),
 * `p` going from 0 to 1 over the hit's length: each returns the keys it changes.
 */
export const HITS = {
    // every floor CO2 jet together, a 3-second blast (the test pages; in songs the shows fire them)
    CO2: { dur: 4.2, apply: (look, p) => ({ co2: Array.from({ length: 12 }, (_, i) => (i % 2 ? 3 : p * 4.2)) }) },
    Drop: { dur: 1.6, apply: (look, p) => ({ strobe: Math.max(look.strobe ?? 0, p < 0.7 ? 1 : (1 - p) / 0.3), blinder: Math.max(look.blinder ?? 0, Math.max(0, 1 - p * 4)), dropFx: 1 - p, laserChase: 1, laser: 1 }) },
    Strobe: { dur: 0.5, apply: () => ({ strobe: 1 }) },
    Blinder: { dur: 0.9, apply: (look, p) => ({ blinder: Math.max(look.blinder ?? 0, 1 - p) }) },
    Burst: { dur: 1.2, apply: (look, p) => ({ intensity: Math.max(look.intensity ?? 0, 1.6), beams: 1, sides: 1, floor: 1, strobe: Math.max(look.strobe ?? 0, 1 - p) }) },
};
