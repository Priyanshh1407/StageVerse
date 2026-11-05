import { flameGlow } from '@/lib/show/flames';

// Strobes and blinders light the whole room, not just themselves. Everything that reacts (the
// strobe panels, blinders, steel, floor, haze and the camera's exposure) reads the flash from here,
// on the same clock, so every surface flashes in sync.

const RATE = 12.5; // strobe flashes per second
const DUTY = 0.3;  // fraction of each cycle the flash is on
const REFERENCE_BLINDERS = 8;
// Overall brightness of strobe and blinder hits (1 was the original; toned down after feedback that
// they were too bright). Everything that flashes reads it from here: the strobe faces, the blinders,
// the room (steel, floor, haze) and the camera's white-out.
const FLASH_BRIGHTNESS = 0.75;
// How strongly burning flame units light the room (in their own warm colour, FIRE_COLOR); pyro
// isn't on the lighting desk's master, so a blackout doesn't put the fire's glow out
const FIRE_BRIGHTNESS = 0.9;
export const FIRE_COLOR = '#ff6b1a';

/** Is a strobe flash on at time t (seconds, the R3F clock)? */
export const strobeGate = (t) => ((t * RATE) % 1 < DUTY ? 1 : 0);

/**
 * How much white light strobes and blinders are throwing into the room right now (`total`), and how
 * much warm light the flames are (`fire`, 0..1, in FIRE_COLOR).
 * More blinders throw more light: 8 is the reference, 20 nearly triples their share.
 */
export function roomFlash(look, t, blinderCount = REFERENCE_BLINDERS) {
    const master = look.master ?? 1;
    const strobe = (look.strobe ?? 0) * strobeGate(t) * master * FLASH_BRIGHTNESS;
    const blinder = (look.blinder ?? 0) * master * Math.min(2.5, blinderCount / REFERENCE_BLINDERS) * FLASH_BRIGHTNESS;
    // fire light flickers fast, like the flames throwing it
    const fire = flameGlow(look.flames) * FIRE_BRIGHTNESS * (0.88 + 0.12 * Math.sin(t * 31) * Math.sin(t * 17.3));
    return { strobe, blinder, fire, total: Math.min(2.2, strobe + blinder * 0.8) };
}
