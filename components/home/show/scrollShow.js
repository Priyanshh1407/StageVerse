import { resolveCueSheet } from '@/lib/show/timeline';

// The homepage show: scrolling runs the cue stack. `t` is scroll progress through the section
// (0..1). Outside the venue (white beams searching the sky above it, like waiting at the gate),
// through the doors, house lights, then the rig comes up one group at a time, one designed look
// per role (shown on the LED wall), the drop, the encore, and finally the playground, where the
// visitor takes the desk.
//
// Each cue ARRIVES at its `t` and HOLDS for `hold`; it fades in over the gap since the previous
// cue's hold ended. So the rig glides into a look as you approach a section, sits in it while you
// read it, and glides on to the next as you scroll past.

export const ENCORE_CHOICES = [
    { label: 'Cyan', a: '#19d9ff', b: '#3b5bff' },
    { label: 'Magenta', a: '#ff3df2', b: '#a855f7' },
    { label: 'Gold', a: '#ffd400', b: '#ff8a00' },
    { label: 'Green', a: '#39ff14', b: '#19d9ff' },
    { label: 'Red', a: '#ff0055', b: '#ff8a00' },
    { label: 'White', a: '#ffffff', b: '#19d9ff' },
    { label: 'Blue', a: '#0066ff', b: '#3b2bff' },
    { label: 'Orange', a: '#ff6a00', b: '#ffb000' },
    { label: 'Pink', a: '#ff69b4', b: '#ff3df2' },
];

// Each role: when its look arrives, how long it holds, its colours, camera, position and line
export const ROLES = [
    { key: 'Fan', at: 0.45, hold: 0.045, colors: ['#19d9ff', '#ff3df2'], shot: 'left', line: 'Find shows near you, vote on the setlist live and get closer to the stage.',
        look: { fan: 1.3, tiltShift: 0.1, sweep: 0.3, speed: 0.45, phaseSpread: 1, washColor: '#3b5bff', laser: 0 } },        // wide fan, gentle wave
    { key: 'Artist', at: 0.54, hold: 0.045, colors: ['#ff0055', '#ffd400'], shot: 'right', line: 'Build setlists with AI insight and read the crowd in real time while you play.',
        look: { fan: 0.5, tiltShift: -0.28, sweep: 0, speed: 0.3, phaseSpread: 0, washColor: '#ff6a00', laser: 0 } },         // tight, straight into the audience, still
    { key: 'Organizer', at: 0.63, hold: 0.045, colors: ['#a855f7', '#ffffff'], shot: 'high', line: 'Plan the event, assemble the team and keep every department on one timeline.',
        look: { fan: -0.85, tiltShift: 0.35, sweep: 0.16, speed: 0.3, phaseSpread: 0, washColor: '#a855f7', laser: 0 } },     // crossed and lifted, slow unison drift
    { key: 'Crew', at: 0.72, hold: 0.03, colors: ['#39ff14', '#19d9ff'], shot: 'wide', line: 'Run production: tasks, cue calls and AI-assisted DMX patching in one place.',
        look: { fan: 1.1, tiltShift: 0, sweep: 0.35, speed: 0.9, phaseSpread: 0.5, washColor: '#19d9ff', laser: 0.4 } },       // faster wave, lasers in
];

// Where each overlay shows (scroll progress)
export const PHASES = {
    outside: [0, 0.08],
    cues: [0.2, 0.4],
    roles: [0.4, 0.76],
    drop: [0.76, 0.84],
    encore: [0.84, 0.91],
    play: [0.91, 1.01],
};
export const PLAY_FROM = PHASES.play[0];

export function phaseAt(progress) {
    for (const [name, [from, to]] of Object.entries(PHASES)) if (progress >= from && progress < to) return name;
    return 'walk';
}

/** The role whose section you're in (its look fading in or holding), for the LED wall. */
export function roleAt(progress) {
    return ROLES.find((r) => progress >= r.at - 0.03 && progress < r.at + r.hold) || null;
}

/** What the LED wall shows at this scroll position. */
export function screenAt(progress) {
    const role = roleAt(progress);
    return role ? { kind: 'role', key: role.key, line: role.line } : { kind: 'brand' };
}

export function buildScrollSheet(encore = ENCORE_CHOICES[0]) {
    const HOLD = { sweep: 0, speed: 0.3, phaseSpread: 0 };
    const cues = [
        // Outside the gate: warm light spilling from the doors, and white beams from the aerials
        // and floor fixtures searching the sky above the venue
        { t: 0, hold: 0.06, name: 'Outside', shot: 'outside', look: {
            house: 1, intensity: 0.9, beams: 1, floor: 1, sides: 0, wash: 0.25, washColor: '#3b5bff', laser: 0,
            colorA: '#ffffff', colorB: '#ffffff', fan: 0.6, tiltShift: 0.75, sweep: 0.18, speed: 0.25, phaseSpread: 0.6,
            converge: 0, haze: 0.9, stars: 0.1,
        } },
        // Walk through the doors into the arena; the sky beams go out behind you
        { t: 0.115, name: 'Through the doors', shot: 'doorway', look: { ...HOLD, beams: 0, floor: 0, intensity: 0.4, fan: 1, tiltShift: 0, colorA: '#3b5bff', colorB: '#a855f7' } },
        { t: 0.15, hold: 0.02, name: 'House lights', shot: 'house', look: {} },
        { t: 0.2, hold: 0.01, name: 'House lights down', look: { house: 0, wash: 0.15 } },
        // The rig comes up one group at a time, each doing its own job
        { t: 0.25, hold: 0.015, name: 'Cue 1 · Stage washes', shot: 'wide', look: { intensity: 0.6, wash: 1, washColor: '#3b5bff' } },
        { t: 0.3, hold: 0.015, name: 'Cue 2 · Side towers', shot: 'dolly', look: { ...HOLD, intensity: 0.75, sides: 1, colorA: '#19d9ff', colorB: '#3b5bff', stars: 0.3 } },
        { t: 0.36, hold: 0.015, name: 'Cue 3 · Aerials and floor', shot: 'high', look: { intensity: 0.9, beams: 1, floor: 1, fan: 1, tiltShift: 0, sweep: 0.12, speed: 0.35, phaseSpread: 0, colorB: '#ff3df2', washColor: '#a855f7' } },
        // One designed look per role
        ...ROLES.map((r) => ({ t: r.at, hold: r.hold, name: `${r.key} look`, shot: r.shot, look: { ...r.look, colorA: r.colors[0], colorB: r.colors[1], laserColor: r.colors[0] } })),
        // Riser, then the drop
        { t: 0.785, name: 'Riser', shot: 'dolly', look: { intensity: 1.2, fan: 0.6, tiltShift: 0, converge: 0.9, sweep: 0.06, speed: 1.6, phaseSpread: 0, laser: 0.8 } },
        { t: 0.8, snap: true, name: 'The drop', shot: 'drop', look: { intensity: 1.4, converge: 0.15, fan: 1.2, sweep: 0.4, speed: 1.6, phaseSpread: 1, laser: 1, stars: 1, strobe: 1, blinder: 1, dropFx: 1, laserChase: 1 } },
        { t: 0.805, snap: true, name: 'The drop', look: { blinder: 0 } },
        { t: 0.825, snap: true, name: 'The drop', look: { strobe: 0, dropFx: 0, laserChase: 0 } },
        // Encore in the visitor's colour
        { t: 0.86, hold: 0.03, name: 'Encore', shot: 'finale', look: { colorA: encore.a, colorB: encore.b, laserColor: encore.a, washColor: encore.b, intensity: 1.1, fan: 1.3, tiltShift: 0.1, sweep: 0.35, speed: 0.8, phaseSpread: 0.6, laser: 0.6, converge: 0 } },
        // Playground: from here the idle show (or the visitor) runs the lights
        { t: PLAY_FROM + 0.01, name: 'Playground', shot: 'finale', look: { intensity: 1, laser: 0.4 } },
    ];
    const withFades = cues.map((cue, i) => {
        if (i === 0) return { ...cue, fade: 0 };
        const prev = cues[i - 1];
        const start = cue.snap ? cue.t - 0.008 : prev.t + (prev.hold ?? 0);
        return { ...cue, t: start, fade: Math.max(0.004, cue.t - start), at: cue.t };
    });
    return resolveCueSheet(withFades);
}
