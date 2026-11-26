// The festival stages' continuous LED lines (the pixel bars, joined into lines, and the trial LED lines): what they play,
// shared by both shaders. They follow the show: the cue's colours (one, the other, or bands of both), its chase,
// sparkle and alternate keys, and a move that changes every 8 bars, its direction too, so a song isn't one motion:
//   0  a run of light round the stage's outline        1  pulses running along each line
//   2  the whole line breathing on the beat (quiet parts)
//   3  segments swapping colour on the beat            4  pulses running in from both ends to the middle
// and the side chasers (look.pixelSweep, a cue of its own on the warehouse): the bars along the side walls light up in
// a band that runs from the stage to the back of the room and back again, the rest dimmed.

/** The uniforms (each shader adds them to its own). */
export const ledShowUniforms = () => ({
    uMove: { value: 0 }, uDir: { value: 1 }, uSweep: { value: 0 }, uSideX: { value: 1e6 }, uZRange: { value: { x: 0, y: 1 } },
});

/** GLSL: `ledShow(world, metresAlong, barNumber)` returns the brightness at this pixel (before the LED dot pattern). */
export const LED_SHOW = /* glsl */ `
    uniform float uMove; uniform float uDir; uniform float uSweep; uniform float uSideX; uniform vec2 uZRange;
    float ledHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float ledShow(vec3 w, float along, float bar, float chaseAmount, float sparkleAmount, float beat) {
        float f = fract(beat);
        float run;
        if (uMove < 0.5) run = fract((w.x * 0.05 + w.y * 0.08) * uDir - beat * 0.25);
        else if (uMove < 1.5) run = fract(along / 8.0 * uDir - beat * 0.5);
        else if (uMove < 2.5) run = 0.5 - 0.5 * exp(-f * 3.0);                       // (the breathing: see below)
        else if (uMove < 3.5) run = mod(floor(along / 2.0) + floor(beat), 2.0) * 0.5;
        else run = fract(abs(w.x) * 0.06 * uDir + beat * 0.25);
        float head = 0.25 + 1.6 * smoothstep(0.25, 0.0, abs(run - 0.5) - 0.2);
        if (uMove > 1.5 && uMove < 2.5) head = 0.35 + 1.2 * exp(-f * 4.0);
        float chase = mix(1.0, head, chaseAmount);
        float spark = step(1.0 - 0.25 * sparkleAmount, ledHash(vec2(bar, floor(along / 0.16)) + floor(beat * 2.0)));
        float level = chase + spark * 2.0;
        // the side chasers: along the side walls a band runs from the stage to the back and back again (8 beats)
        float side = step(uSideX, abs(w.x));
        float there = mix(uZRange.x, uZRange.y, 1.0 - abs(fract(beat / 8.0) * 2.0 - 1.0));
        float band = exp(-pow((w.z - there) / 3.5, 2.0));
        level = mix(level, side > 0.5 ? 0.08 + 2.6 * band : level * 0.35, uSweep);
        return level;
    }`;

/** Per frame: the move for this stretch of the song (every 8 bars), its direction, and the side chasers. */
export function driveLedShow(u, look, beat) {
    const quiet = (look.crowd ?? 0.4) < 0.2;
    const turn = Math.floor(beat / 32);
    u.uMove.value = quiet ? 2 : [0, 1, 3, 4][turn % 4];
    u.uDir.value = turn % 2 ? -1 : 1;
    u.uSweep.value += ((look.pixelSweep ?? 0) - u.uSweep.value) * 0.15;
}
