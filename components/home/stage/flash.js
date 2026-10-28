// Strobes and blinders light the whole room, not just themselves. Everything that reacts (the
// strobe panels, blinders, steel, floor, haze and the camera's exposure) reads the flash from here,
// on the same clock, so every surface flashes in sync.

const RATE = 12.5; // strobe flashes per second
const DUTY = 0.3;  // fraction of each cycle the flash is on
const REFERENCE_BLINDERS = 8;

/** Is a strobe flash on at time t (seconds, the R3F clock)? */
export const strobeGate = (t) => ((t * RATE) % 1 < DUTY ? 1 : 0);

/**
 * How much white light strobes and blinders are throwing into the room right now.
 * More blinders throw more light: 8 is the reference, 20 nearly triples their share.
 */
export function roomFlash(look, t, blinderCount = REFERENCE_BLINDERS) {
    const master = look.master ?? 1;
    const strobe = (look.strobe ?? 0) * strobeGate(t) * master;
    const blinder = (look.blinder ?? 0) * master * Math.min(2.5, blinderCount / REFERENCE_BLINDERS);
    return { strobe, blinder, total: Math.min(2.2, strobe + blinder * 0.8) };
}
