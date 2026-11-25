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

/** Is a strobe flash on at time t (seconds, the R3F clock)? */
export const strobeGate = (t) => ((t * RATE) % 1 < DUTY ? 1 : 0);

/**
 * How much white light strobes and blinders are throwing into the room right now.
 * More blinders throw more light: 8 is the reference, 20 nearly triples their share.
 */
export function roomFlash(look, t, blinderCount = REFERENCE_BLINDERS) {
    const master = look.master ?? 1;
    const strobe = (look.strobe ?? 0) * strobeGate(t) * master * FLASH_BRIGHTNESS;
    const blinder = (look.blinder ?? 0) * master * Math.min(2.5, blinderCount / REFERENCE_BLINDERS) * FLASH_BRIGHTNESS;
    return { strobe, blinder, total: Math.min(2.2, strobe + blinder * 0.8) };
}

/**
 * The flash in the homepage's whole scene: its own stage's, or (on the festival grounds) the flash of the stage
 * the playground is at, whose look the grounds keep in control.stageLooks. The scene's room light and the
 * camera's white-out follow whichever stage is flashing, so a strobe on the warehouse, the desert or the
 * mainstage lights the room as it does on the live stage.
 */
export function sceneFlash(look, control, t, blinderCount = REFERENCE_BLINDERS) {
    const own = roomFlash(look, t, blinderCount);
    const c = control?.current;
    const site = c?.siteKey && c.stageLooks?.[c.siteKey];
    if (!site) return own;
    const there = roomFlash(site, t, c.stageBlinders?.[c.siteKey] ?? REFERENCE_BLINDERS);
    return there.total > own.total ? there : own;
}
