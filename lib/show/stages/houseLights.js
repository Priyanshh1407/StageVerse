// The festival stages' house lights (their test pages' "House lights" look, and the homepage's grounds after a song
// there): only the washes, full, warm yellow, pointed down (a stage that keeps its washes on the stage, the
// mainstage, keeps them there); every beam, laser, pixel bar and strobe off.

export const HOUSE_COLOR = '#ffb347';

export const STAGE_HOUSE_LIGHTS = {
    house: 1, intensity: 0.8, beams: 0, sides: 0, floor: 0, wash: 1, washColor: HOUSE_COLOR, washDown: 1, washSweep: 0, sweep: 0,
    laser: 0, pixel: 0, strobe: 0, strobeSteady: 0, strobeRandom: 0, blinder: 0, crowd: undefined,
};
