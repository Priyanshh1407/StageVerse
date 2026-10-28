import { resolveCueSheet } from '@/lib/show/timeline';

// The homepage show: scrolling runs the cue stack. `t` is scroll progress through the section
// (0..1). Each cue fades into the next over the scroll distance between them, so scrolling
// scrubs the show back and forth like a timeline.

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

export const ROLES = [
    { key: 'Fan', at: 0.36, colors: ['#19d9ff', '#ff3df2'], shot: 'left', line: 'Find shows near you, vote on the setlist live and get closer to the stage.' },
    { key: 'Artist', at: 0.425, colors: ['#ff0055', '#ffd400'], shot: 'right', line: 'Build setlists with AI insight and read the crowd in real time while you play.' },
    { key: 'Organizer', at: 0.49, colors: ['#a855f7', '#ffffff'], shot: 'high', line: 'Plan the event, assemble the team and keep every department on one timeline.' },
    { key: 'Crew', at: 0.555, colors: ['#39ff14', '#19d9ff'], shot: 'wide', line: 'Run production: tasks, cue calls and AI-assisted DMX patching in one place.' },
];

// Where each overlay is shown (scroll progress ranges)
export const PHASES = {
    intro: [0, 0.1],
    cues: [0.1, 0.35],
    roles: [0.36, 0.62],
    drop: [0.62, 0.78],
    encore: [0.78, 1.01],
};

export function phaseAt(progress) {
    for (const [name, [from, to]] of Object.entries(PHASES)) if (progress >= from && progress < to) return name;
    return 'cues';
}

export function roleAt(progress) {
    let current = null;
    for (const role of ROLES) if (progress >= role.at) current = role;
    return current;
}

export function buildScrollSheet(encore = ENCORE_CHOICES[0]) {
    // Programmed like a concert: each cue is a position (where the beams point: fan width, lift)
    // plus at most one coordinated movement effect (unison sway or a wave along the row). Groups
    // come in one at a time, each doing its own job.
    const HOLD = { sweep: 0, speed: 0.3, phaseSpread: 0 };
    const cues = [
        // Doors open: warm house lights, the rig dark, the stage barely washed
        { t: 0, name: 'House lights', shot: 'house', look: { ...HOLD, house: 1, intensity: 0.4, beams: 0, sides: 0, floor: 0, wash: 0.25, washColor: '#3b5bff', fan: 1, tiltShift: 0, converge: 0, haze: 0.9, laser: 0, stars: 0.1, colorA: '#3b5bff', colorB: '#a855f7' } },
        { t: 0.06, name: 'House lights down', look: { house: 0, wash: 0.15 } },
        // Cue 1: the washes colour the stage; no beams yet
        { t: 0.1, name: 'Cue 1 · Stage washes', shot: 'wide', look: { intensity: 0.6, wash: 1, washColor: '#3b5bff' } },
        // Cue 2: side towers cross over the stage and hold
        { t: 0.18, name: 'Cue 2 · Side towers', shot: 'dolly', look: { ...HOLD, intensity: 0.75, sides: 1, colorA: '#19d9ff', colorB: '#3b5bff', stars: 0.3 } },
        // Cue 3: aerials fan out over the audience with a slow unison sway; the floor makes a V
        { t: 0.27, name: 'Cue 3 · Aerials and floor', shot: 'high', look: { intensity: 0.9, beams: 1, floor: 1, fan: 1, tiltShift: 0, sweep: 0.12, speed: 0.35, phaseSpread: 0, colorB: '#ff3df2', washColor: '#a855f7' } },
        // One position and colour per role
        { t: ROLES[0].at, name: 'Fan look', shot: ROLES[0].shot, look: { colorA: ROLES[0].colors[0], colorB: ROLES[0].colors[1], fan: 1.25, tiltShift: 0.1, sweep: 0.3, speed: 0.45, phaseSpread: 1 } },                     // wide fan, gentle wave
        { t: ROLES[1].at, name: 'Artist look', shot: ROLES[1].shot, look: { colorA: ROLES[1].colors[0], colorB: ROLES[1].colors[1], fan: 0.5, tiltShift: -0.25, sweep: 0, speed: 0.3, phaseSpread: 0, washColor: '#ff6a00' } }, // tight, straight into the audience, still
        { t: ROLES[2].at, name: 'Organizer look', shot: ROLES[2].shot, look: { colorA: ROLES[2].colors[0], colorB: ROLES[2].colors[1], fan: 1, tiltShift: 0.4, sweep: 0.18, speed: 0.3, phaseSpread: 0, washColor: '#a855f7' } }, // lifted high, slow unison drift
        { t: ROLES[3].at, name: 'Crew look', shot: ROLES[3].shot, look: { colorA: ROLES[3].colors[0], colorB: ROLES[3].colors[1], fan: 1.1, tiltShift: 0, sweep: 0.35, speed: 0.9, phaseSpread: 0.5, laser: 0.4, laserColor: ROLES[3].colors[0], washColor: '#19d9ff' } }, // faster wave, lasers in
        // Riser: beams tighten toward the centre and the movement speeds up, in unison
        { t: 0.62, name: 'Riser', shot: 'dolly', look: { intensity: 1.2, fan: 0.6, tiltShift: 0, converge: 0.9, sweep: 0.06, speed: 1.6, phaseSpread: 0, laser: 0.8 } },
        { t: 0.7, name: 'The drop', snap: true, shot: 'drop', look: { intensity: 1.4, converge: 0.15, fan: 1.2, sweep: 0.4, speed: 1.6, phaseSpread: 1, laser: 1, stars: 1, strobe: 1, blinder: 1, dropFx: 1, laserChase: 1 } },
        { t: 0.705, name: 'The drop', snap: true, look: { blinder: 0 } },
        { t: 0.725, name: 'The drop', snap: true, look: { strobe: 0, dropFx: 0, laserChase: 0 } },
        // Encore: wide fan, a broad coordinated sweep in the visitor's colour
        { t: 0.78, name: 'Encore', shot: 'wide', look: { colorA: encore.a, colorB: encore.b, laserColor: encore.a, washColor: encore.b, intensity: 1.1, fan: 1.3, tiltShift: 0.1, sweep: 0.35, speed: 0.8, phaseSpread: 0.6, laser: 0.6, converge: 0 } },
        { t: 0.98, fadeFrom: 0.93, name: 'Afterglow', look: { intensity: 0.55, laser: 0, sweep: 0.1, speed: 0.25, stars: 0.4 } },
    ];
    // A cue is fully on AT its scroll position: it fades in over the gap from the previous cue
    // (the first cue is on from the top of the page; the drop snaps in). The sheet engine fades
    // a cue over `fade` after it starts, so each cue starts where the previous one was reached.
    const withFades = cues.map((cue, i) => {
        if (i === 0) return { ...cue, fade: 0 };
        const start = cue.snap ? cue.t - 0.008 : cue.fadeFrom ?? cues[i - 1].t;
        return { ...cue, t: start, fade: cue.t - start, at: cue.t };
    });
    return resolveCueSheet(withFades);
}
