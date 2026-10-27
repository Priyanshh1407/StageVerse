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
    const cues = [
        { t: 0, name: 'House lights down', shot: 'house', look: { intensity: 0.12, sweep: 0.05, speed: 0.2, haze: 0.9, laser: 0, stars: 0.15, colorA: '#3b5bff', colorB: '#a855f7' } },
        { t: 0.1, name: 'Cue 1 · Back truss', shot: 'wide', look: { intensity: 0.45, sweep: 0.12, speed: 0.3 } },
        { t: 0.18, name: 'Cue 2 · Colour wash', shot: 'dolly', look: { intensity: 0.7, sweep: 0.25, speed: 0.6, colorA: '#19d9ff', colorB: '#ff3df2', stars: 0.3 } },
        { t: 0.27, name: 'Cue 3 · Movement', shot: 'high', look: { intensity: 0.9, sweep: 0.45, speed: 1.1, laser: 0.3, laserColor: '#39ff14' } },
        ...ROLES.map((r) => ({ t: r.at, name: `${r.key} look`, shot: r.shot, look: { colorA: r.colors[0], colorB: r.colors[1], laserColor: r.colors[0] } })),
        { t: 0.62, name: 'Riser', shot: 'dolly', look: { intensity: 1.2, sweep: 0.12, speed: 2.6, converge: 0.9, laser: 0.8 } },
        { t: 0.7, name: 'The drop', shot: 'drop', look: { intensity: 1.4, converge: 0.15, sweep: 0.55, speed: 2.1, laser: 1, stars: 1, strobe: 1, blinder: 1 } },
        { t: 0.725, name: 'The drop', look: { strobe: 0, blinder: 0 } },
        { t: 0.78, name: 'Encore', shot: 'wide', look: { colorA: encore.a, colorB: encore.b, laserColor: encore.a, intensity: 1.1, sweep: 0.5, speed: 1.4, laser: 0.6, converge: 0 } },
        { t: 0.96, name: 'House lights up', look: { intensity: 0.55, laser: 0, speed: 0.5, stars: 0.4 } },
    ];
    // Each cue fades over the scroll distance to the next one (the drop snaps in)
    const withFades = cues.map((cue, i) => ({ ...cue, fade: cue.name === 'The drop' ? 0.008 : (cues[i + 1]?.t ?? 1.02) - cue.t }));
    return resolveCueSheet(withFades);
}
