// More colours on the festival stages: the shows' colour pairs (lib/show/program.js PALETTES) are kept in the
// show files (the homepage plays them as they are); on the festival stages every second change of colour in a
// song takes one of these pairs instead, chosen by the kind of moment it is. A song's own colours (a palette
// span, like Yellow's shades of yellow, and its tints) are never replaced: only the programme's pairs are.

import { PALETTES } from '../program.js';
import { cueKind } from './cues.js';

export const FESTIVAL_PALETTES = {
    quiet: [
        ['#7b2cff', '#00e5ff'], // ultraviolet and ice
        ['#00ffa3', '#7a00ff'], // aurora
        ['#ff8fd8', '#6a5cff'], // rose quartz and periwinkle
        ['#ffb36b', '#ff4f8b'], // desert sunset
        ['#9ffcff', '#2a3cff'], // glacier
        ['#ffd9a0', '#b04cff'], // champagne and amethyst
    ],
    groove: [
        ['#ff2e63', '#08d9d6'], // coral and lagoon
        ['#c400ff', '#ffea00'], // ultraviolet and gold
        ['#ff5e00', '#00ffd5'], // lava and teal
        ['#00ff6a', '#ff00c8'], // toxic
        ['#f9ff00', '#00b3ff'], // citrus and sky
        ['#ff007f', '#ff9e00'], // flamingo and amber
        ['#5dff00', '#00a2ff'], // lime and cobalt
    ],
    peak: [
        ['#ffd700', '#7b00ff'], // royal: gold and ultraviolet
        ['#ff7a00', '#00c2ff'], // fire and ice
        ['#00ff9c', '#ff3c00'], // acid and lava
        ['#ff1e1e', '#ffffff'], // blood red and white
        ['#ff00aa', '#00ff66'], // electric pink and toxic green
        ['#3d00ff', '#00e1ff'], // deep electric blue
        ['#e6ff00', '#ff006e'], // neon citrus and hot pink
        ['#00f0ff', '#ff2bd6'], // holographic
        ['#b8ff00', '#5d00ff'], // radioactive and indigo
        ['#ffffff', '#ffb000'], // white gold
    ],
};

const pairKey = (a, b) => `${String(a).toLowerCase()}|${String(b).toLowerCase()}`;
const PROGRAMME_PAIRS = new Set(Object.values(PALETTES).flat().map(([a, b]) => pairKey(a, b)));
const groupOf = (name) => {
    const head = cueKind(name).split(' · ')[0];
    return head === 'Peak' || head === 'Focus' || head === 'Circle' ? 'peak' : head === 'Groove' || head === 'Build' ? 'groove' : 'quiet';
};
const COLOUR_KEYS = ['colorA', 'colorB', 'washColor', 'laserColor'];

/** A look with its colours swapped by `map` (old hex -> new hex), or the look itself when nothing changes. */
function recolour(look, map) {
    if (!look || !map) return look;
    let out = look;
    for (const key of COLOUR_KEYS) {
        const to = map[String(look[key]).toLowerCase()];
        if (to) out = out === look ? { ...look, [key]: to } : Object.assign(out, { [key]: to });
    }
    return out;
}

/**
 * A resolved cue sheet (lib/show/timeline.js) with every second change of the programme's colours taken from
 * FESTIVAL_PALETTES. `seed` (any number, e.g. the song's length) starts each song at a different pair.
 */
export function festivalColours(sheet, seed = 0) {
    const at = { quiet: 0, groove: 0, peak: 0 };
    for (const group of Object.keys(at)) at[group] = Math.floor(Math.abs(seed)) % FESTIVAL_PALETTES[group].length;
    let changes = 0;
    let lastKey = null;
    let map = null;
    let prevMap = null;
    const cues = sheet.cues.map((cue) => {
        const key = pairKey(cue.look.colorA, cue.look.colorB);
        if (key !== lastKey) {
            lastKey = key;
            prevMap = map;
            if (PROGRAMME_PAIRS.has(key) && changes++ % 2 === 1) {
                const group = groupOf(cue.name);
                const [a, b] = FESTIVAL_PALETTES[group][at[group]++ % FESTIVAL_PALETTES[group].length];
                map = { [String(cue.look.colorA).toLowerCase()]: a, [String(cue.look.colorB).toLowerCase()]: b };
            } else map = null;
        } else prevMap = map;
        // (the cue fades in from how the last one looked: that one's colours, swapped the way it was)
        return { ...cue, look: recolour(cue.look, map), from: recolour(cue.from, prevMap) };
    });
    return { ...sheet, cues };
}
