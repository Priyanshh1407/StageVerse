import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentState } from '@/components/home/show/director';
import { prepareSongShow } from '@/lib/show/timeline';
import { mergeStates } from '@/lib/show/effects';
import { CO2_JETS, CO2_TRUSS_JETS } from '@/lib/show/co2';
import { CONFETTI_UNITS } from '@/lib/show/confetti';

describe('mergeStates: a song\'s firings and the visitor\'s together', () => {
    it('per unit the newer firing wins; idle on either side keeps the other', () => {
        expect(mergeStates([-1, 0, 2, 1], [0.5, 1, -1, 0], 2)).toEqual([0.5, 1, 2, 1]);
        expect(mergeStates([3, 1, 0.2, 1], [0.5, 2, 1, 1], 2)).toEqual([0.5, 2, 0.2, 1]);
        expect(mergeStates(null, [0, 1], 1)).toEqual([0, 1]);
        expect(mergeStates([0, 1], null, 1)).toEqual([0, 1]);
    });
});

describe('live CO2 and confetti during a song: the show carries on', () => {
    afterEach(() => vi.restoreAllMocks());
    // a song with its own programmed CO2 blast at 10 s on every jet
    const song = prepareSongShow({
        title: 't', bpm: 120, duration: 60, beats: [0, 0.5], downbeats: [0], sections: [], energy: [],
        cues: [{ t: 0, name: 'Start', look: { beams: 1, intensity: 1 } }],
        hits: [{ t: 10, kind: 'co2', dur: 1, jets: 'all' }],
    });
    const control = (live) => ({ mode: 'song', song, audio: { paused: true, currentTime: 2 }, live });

    it('held: every floor and truss jet fires, while the song\'s own look stays on', () => {
        vi.spyOn(performance, 'now').mockReturnValue(5000);
        const held = (n) => Array.from({ length: n }, (_, unit) => ({ unit, at: 4000, len: null }));
        const look = currentState(control({ co2: held(CO2_JETS), co2Truss: held(CO2_TRUSS_JETS) })).look;
        expect(look.co2.filter((_, i) => i % 2 === 0).every((age) => age >= 0)).toBe(true);
        expect(look.co2Truss.filter((_, i) => i % 2 === 0).every((age) => age >= 0)).toBe(true);
        expect(look.beams).toBe(1); // the show's own cue still plays
        expect(look.confetti).toBeUndefined();
    });

    it('the song\'s programmed CO2 still fires on its own timing', () => {
        vi.spyOn(performance, 'now').mockReturnValue(5000);
        const c = { ...control({ confetti: [{ unit: 0, at: 4500, len: 0.4 }] }), audio: { paused: true, currentTime: 10.2 } };
        const look = currentState(c).look;
        expect(look.co2[0]).toBeCloseTo(0.2, 6);
        expect(look.confetti[0]).toBeCloseTo(0.5, 6);
        expect(look.confetti.length).toBe(CONFETTI_UNITS * 2);
    });

    it('once every live firing has faded, the list is cleared', () => {
        const c = control({ co2: [{ unit: 0, at: 0, len: 0.4 }] });
        vi.spyOn(performance, 'now').mockReturnValue(60000);
        expect(currentState(c).look.co2).toBeUndefined();
        expect(c.live.co2).toEqual([]);
    });
});
