// The trial fixtures and effects: new kinds of lights and effects on the festival stages, each with its own on/off
// switch, so each can be judged (looks and frame rate) and kept or removed. The switches are saved in this browser
// (localStorage 'sv:extras') and read by the test pages and the homepage alike; NEXT_PUBLIC_FEATURE_EXTRAS=off turns
// them all off for the whole site.
//
//   tiltBars     tilting beam bars at the mainstage's fin feet: seven beams a bar, tilting and fanning together
//   hybridBeams  laser-hybrid beams on the mainstage's crown: very tight, very long rods sweeping over the sky
//   flames       flame jets on the mainstage's fin tips, on drops and on the beat in the finale
//   cryo         cryo jets along the deck front of every stage: fast white plumes on drops and blinder hits
//   drones       a drone show over the desert stage in its finale: lit points forming shapes in the sky
//   ledLines     continuous LED lines along the desert's roof edge and the warehouse's walls, chasing on the beat
//   kinetic      kinetic spheres on winches over the warehouse's crowd, rising and falling in waves

import { featureOn } from '../../features.js';

export const EXTRAS = [
    { key: 'tiltBars', label: 'Tilting beam bars (fin feet)', stages: ['mainstage'] },
    { key: 'hybridBeams', label: 'Laser-hybrid beams (crown)', stages: ['mainstage'] },
    { key: 'flames', label: 'Flame jets (fin tips)', stages: ['mainstage'], fire: true },
    { key: 'cryo', label: 'Cryo jets (deck front)', stages: ['mainstage', 'desert', 'warehouse'], fire: true },
    { key: 'drones', label: 'Drone show (finale)', stages: ['desert'], fire: true },
    { key: 'ledLines', label: 'Continuous LED lines', stages: ['desert', 'warehouse'] },
    { key: 'kinetic', label: 'Kinetic spheres (ceiling)', stages: ['warehouse'] },
];

export const EXTRAS_KEY = 'sv:extras';
export const EXTRAS_FIRE = 'sv:extras-fire';
const DEFAULTS = Object.fromEntries(EXTRAS.map((e) => [e.key, true]));

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

/** Fire one of the effects now (the test pages' preview buttons): 'flames' | 'cryo' | 'drones'. */
export function fireExtra(kind) {
    globalThis.dispatchEvent?.(new CustomEvent(EXTRAS_FIRE, { detail: kind }));
}
