// The trial fixtures and effects: new kinds of lights and effects on the festival stages, each with its own on/off
// switch, so each can be judged (looks and frame rate) and kept or removed. The switches are saved in this browser
// (localStorage 'sv:extras') and read by the test pages and the homepage alike; NEXT_PUBLIC_FEATURE_EXTRAS=off turns
// them all off for the whole site.
//
//   finWashes    uplight washes at the mainstage's fin feet: a wide soft cone grazing up each fin's face
//   hybridBeams  laser-hybrid beams on the mainstage's crown: very tight, very long rods sweeping over the sky
//   cryo         cryo jets along the deck front of every stage: fast white plumes on drops and blinder hits
//   ledLines     continuous LED lines along the desert's roof edge and the warehouse's walls, chasing on the beat
//   kineticSky   the warehouse's kinetic LED sky: see-through LED tiles on winches over the crowd, moving into shapes
//   tiltBars     tilting beam bars along the warehouse's stage front: seven beams a bar, tilting and fanning together
// (Tried and removed at the developer's choice: flame jets, a drone show, kinetic spheres, tilting beam bars and pixel
// blinders at the fin feet.)

import { featureOn } from '../../features.js';

export const EXTRAS = [
    { key: 'finWashes', label: 'Uplight washes (fin feet)', stages: ['mainstage'] },
    { key: 'hybridBeams', label: 'Laser-hybrid beams (crown)', stages: ['mainstage'] },
    { key: 'cryo', label: 'Cryo jets (deck front)', stages: ['mainstage', 'desert', 'warehouse'], fire: true },
    { key: 'ledLines', label: 'Continuous LED lines', stages: ['desert', 'warehouse'] },
    { key: 'kineticSky', label: 'Kinetic LED sky (ceiling)', stages: ['warehouse'] },
    { key: 'tiltBars', label: 'Tilting beam bars (stage front)', stages: ['warehouse'] },
];

// (v2: the switches saved before the fixtures were kept start over, every one on)
export const EXTRAS_KEY = 'sv:extras:v2';
export const EXTRAS_FIRE = 'sv:extras-fire';
const DEFAULTS = Object.fromEntries(EXTRAS.map((e) => [e.key, !e.off]));

/** Whether the trial fixtures can be on at all on this build (the site-wide switch). */
export const extrasAllowed = () => featureOn(process.env.NEXT_PUBLIC_FEATURE_EXTRAS);

/** The switches as saved in this browser (every one on unless switched off). */
export function readExtras() {
    if (!extrasAllowed()) return Object.fromEntries(EXTRAS.map((e) => [e.key, false]));
    try {
        return { ...DEFAULTS, ...JSON.parse(globalThis.localStorage?.getItem(EXTRAS_KEY) || '{}') };
    } catch {
        return { ...DEFAULTS };
    }
}

/** Save the switches and tell every stage on the page. */
export function writeExtras(next) {
    try { globalThis.localStorage?.setItem(EXTRAS_KEY, JSON.stringify(next)); } catch { /* private mode */ }
    globalThis.dispatchEvent?.(new Event(EXTRAS_KEY));
}

/** Fire one of the effects now (the test pages' preview buttons): 'cryo'. */
export function fireExtra(kind) {
    globalThis.dispatchEvent?.(new CustomEvent(EXTRAS_FIRE, { detail: kind }));
}
