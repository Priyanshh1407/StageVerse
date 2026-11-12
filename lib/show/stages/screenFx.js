// Which animation the LED screens play (the fins, the walls, the crown, the side screens). A look can
// name one (look.screenFx); otherwise it follows the song: a strobe frame on a drop or a strobe hit,
// the sweep and the equaliser taking turns in the peaks, the chase up the screens in a build, the
// equaliser in a groove or a verse, sparkle in a breakdown, and a slow colour wipe in the quiet parts
// and when no song is playing.

export const SCREEN_FX = ['equaliser', 'sweep', 'chase', 'strobe', 'wipe', 'sparkle'];

/** The screen animation for a look, as an index into SCREEN_FX. */
export function screenFxFor(look) {
    if (look.screenFx !== undefined) {
        const named = typeof look.screenFx === 'number' ? look.screenFx : SCREEN_FX.indexOf(look.screenFx);
        if (named >= 0) return named;
    }
    if ((look.dropFx ?? 0) > 0.3 || (look.strobe ?? 0) > 0.5) return SCREEN_FX.indexOf('strobe');
    const crowd = look.crowd;
    if (crowd === undefined || look.beatPos === undefined) return SCREEN_FX.indexOf('wipe');
    if (crowd >= 1) return Math.floor(look.beatPos / 32) % 2 ? SCREEN_FX.indexOf('sweep') : SCREEN_FX.indexOf('equaliser');
    if (crowd >= 0.5) return SCREEN_FX.indexOf('chase');
    if (crowd >= 0.25) return SCREEN_FX.indexOf('equaliser');
    if (crowd >= 0.15) return SCREEN_FX.indexOf('sparkle');
    return SCREEN_FX.indexOf('wipe');
}
