// The 3D stage outside the homepage:
//   liveLook   the look a fan sees while a real show runs: it follows the show's status set from the
//              crew's console (Standby / Live / Paused), a warning, and the encore vote (whichever
//              option leads colours the rig, live, and the winner keeps its colour)
//   patchRig   how many of each kind of fixture a crew's DMX patch holds, to size the stage's rig
// No browser or database code: the pages and the tests share this file.

import { DEFAULT_LOOK, venueLit } from './look.js';

// One colour pair per poll option, in order (the same nine the homepage's encore uses)
export const VOTE_COLORS = [
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

/** The option in front (the declared winner once the poll has closed), or null before any vote. */
export function leadingOption(poll) {
    if (!poll?.options?.length) return null;
    if (poll.winner?.text) {
        const index = poll.options.findIndex((o) => o.text === poll.winner.text);
        if (index >= 0) return { index, text: poll.winner.text, votes: poll.winner.votes ?? poll.options[index].votes, decided: true };
    }
    let index = -1;
    poll.options.forEach((o, i) => { if ((o.votes ?? 0) > 0 && (index < 0 || o.votes > poll.options[index].votes)) index = i; });
    return index < 0 ? null : { index, text: poll.options[index].text, votes: poll.options[index].votes, decided: false };
}

/**
 * The look for a live show at time t (seconds): { status: 'Standby' | 'Live' | 'Paused', warning, poll }.
 */
export function liveLook({ status = 'Standby', warning = false, poll = null } = {}, t = 0) {
    const lead = leadingOption(poll);
    const colors = lead ? VOTE_COLORS[lead.index % VOTE_COLORS.length] : VOTE_COLORS[0];
    const base = { ...DEFAULT_LOOK, colorA: colors.a, colorB: colors.b, washColor: colors.a, laserColor: colors.a };
    // a made-up beat (the real show's music isn't streamed): 120 a minute
    const beat = t * 2;
    const pulse = Math.exp(-(beat % 1) * 4.5);
    if (status === 'Live') {
        // an open vote makes the rig busier; a decided one brings the lasers in for the winner
        const voting = Boolean(poll?.isActive);
        return {
            ...base, intensity: 1.1, sweep: voting ? 0.75 : 0.5, speed: voting ? 1.8 : 1.2, phaseSpread: 0.6, tiltWave: 0.25, haze: 0.7,
            laser: lead?.decided ? 1 : 0, laserChase: 1, pixelChase: 1, pulse: pulse * 0.4, pulseAmount: 0.4, beatPos: beat,
            strobe: warning ? (Math.floor(t * 8) % 2 ? 1 : 0) : 0,
        };
    }
    if (status === 'Paused') {
        // held: one soft wash, nothing moving
        return { ...base, intensity: 0.5, beams: 0.25, sides: 0, floor: 0.2, wash: 0.6, pixel: 0.4, pixelChase: 0, sweep: 0, speed: 0.2, laser: 0, haze: 0.4 };
    }
    // Standby: the venue lit by the house lights, like the room before a show
    return venueLit({ ...base, house: 0.9, intensity: 0.6, sweep: 0, laser: 0 }, 0.9);
}

const MOVING = ['beam', 'spot', 'profile', 'wash', 'aura', 'mac', 'sharpy', 'moving', 'quantum', 'viper', 'robe'];
const kindOf = (fixture) => {
    const text = `${fixture.profile ?? ''} ${fixture.type ?? ''} ${fixture.mode ?? ''}`.toLowerCase();
    if (text.includes('laser')) return 'lasers';
    if (text.includes('strobe') || text.includes('atomic')) return 'strobes';
    if (text.includes('blinder') || text.includes('molefay')) return 'blinders';
    if (text.includes('haz') || text.includes('fog')) return 'hazers';
    if (text.includes('pixel') || text.includes('bar') || text.includes('batten')) return 'bars';
    if (MOVING.some((k) => text.includes(k))) return 'heads';
    return 'other';
};

/**
 * A patch as a rig: how many of each kind it holds, and the counts the 3D stage is built with (the
 * stage has between 12 and 140 moving heads and up to 60 laser beams, so a very small or very large
 * patch is shown at the nearest size it can draw; `exact` says whether the head count is the real one).
 */
export function patchRig(fixtures = []) {
    const counts = { heads: 0, lasers: 0, strobes: 0, blinders: 0, hazers: 0, bars: 0, other: 0 };
    for (const f of fixtures) counts[kindOf(f)]++;
    const universes = new Set(fixtures.map((f) => Number(f.universe)).filter(Number.isFinite)).size;
    const beams = Math.max(12, Math.min(140, counts.heads));
    return {
        counts,
        universes,
        total: fixtures.length,
        stage: { beams, lasers: Math.max(0, Math.min(60, counts.lasers * 8)), blinders: Math.max(4, Math.min(16, counts.blinders || 8)) },
        exact: beams === counts.heads,
    };
}
