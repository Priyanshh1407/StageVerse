import { describe, it, expect } from 'vitest';
import { buildScrollSheet, ROLES, roleAt, screenAt, phaseAt, PLAY_FROM } from '@/components/home/show/scrollShow';
import { sampleCueSheet, prepareSongShow } from '@/lib/show/timeline';
import { DEFAULT_LOOK, HOUSE_COLOR, venueLit } from '@/lib/show/look';
import { currentState, HOUSE_UP_MS } from '@/components/home/show/director';
import { buildIdleShow } from '@/lib/show/program';

describe('scroll show', () => {
    const sheet = buildScrollSheet();
    const at = (p) => sampleCueSheet(sheet, p);

    it('starts outside: warm house lights and white beams searching the sky, which go out inside', () => {
        const outside = at(0).look;
        expect(at(0).shot).toBe('outside');
        expect(outside.house).toBe(1);
        expect(outside.colorA).toBe('#ffffff');
        expect(outside.beams).toBe(1);
        expect(outside.tiltShift).toBeGreaterThan(0.5); // up into the sky
        const inside = at(0.15).look;
        expect(inside.beams).toBe(0);
        expect(inside.floor).toBe(0);
    });

    it('each role look arrives at its position and holds while you read it', () => {
        for (const role of ROLES) {
            const arrive = at(role.at).look;
            const leave = at(role.at + role.hold - 0.002).look;
            expect(arrive.colorA).toBe(role.colors[0]);
            expect(leave.colorA).toBe(role.colors[0]);
            expect(leave.fan).toBeCloseTo(role.look.fan);
            // and glides in: halfway through the approach it's still between the two looks
            const before = at(role.at - 0.015).look;
            expect(before.fan).not.toBeCloseTo(role.look.fan, 2);
        }
    });

    it('every role has its own position and colour', () => {
        const keys = ROLES.map((r) => `${r.look.fan}/${r.look.tiltShift}/${r.colors.join()}`);
        expect(new Set(keys).size).toBe(ROLES.length);
    });

    it('the LED wall shows the role during its section, the brand otherwise', () => {
        expect(screenAt(0.3)).toEqual({ kind: 'brand' });
        expect(screenAt(ROLES[1].at)).toMatchObject({ kind: 'role', key: 'Artist' });
        expect(roleAt(ROLES[0].at - 0.05)).toBeNull();
        expect(phaseAt(0.95)).toBe('play');
        expect(PLAY_FROM).toBeLessThan(0.95);
    });
});

describe('idle show (the playground before the visitor takes over)', () => {
    const show = buildIdleShow();

    it('loops without a blackout and changes something at least every 8 bars', () => {
        expect(show.cues.some((c) => c.look?.master === 0)).toBe(false);
        const bar = 240 / show.bpm;
        const times = show.cues.map((c) => c.t).sort((a, b) => a - b);
        for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeLessThanOrEqual(8 * bar + 0.01);
    });

    it('peaks change position every 4 bars and keep hitting', () => {
        const bar = 240 / show.bpm;
        const peakStart = 16 * bar;
        const peakPhrases = show.cues.filter((c) => c.t > peakStart && c.name.includes('phrase'));
        expect(peakPhrases.length).toBeGreaterThanOrEqual(3);
        const positions = new Set(peakPhrases.map((c) => `${c.look.fan}/${c.look.tiltShift}`));
        expect(positions.size).toBeGreaterThan(1);
        expect(show.hits.filter((h) => h.t >= peakStart).length).toBeGreaterThanOrEqual(3);
    });
});

describe('house lights light the venue (scroll show and lighting desk, never song shows)', () => {
    const control = (extra) => ({ mode: 'scroll', progress: 0, sheet: buildScrollSheet(), ...extra });

    it('venueLit: warm washes and steady strobes, every beam and laser off, nothing moving', () => {
        const lit = venueLit({ ...DEFAULT_LOOK, beams: 1, laser: 1, sweep: 0.5, washColor: '#3b5bff' }, 1);
        expect(lit).toMatchObject({ beams: 0, sides: 0, floor: 0, laser: 0, sweep: 0, wash: 1, strobeSteady: 1, strobe: 0 });
        expect([lit.washColor, lit.strobeColor, lit.colorA]).toEqual([HOUSE_COLOR, HOUSE_COLOR, HOUSE_COLOR]);
        expect(venueLit(DEFAULT_LOOK, 0)).toBe(DEFAULT_LOOK); // house lights off: untouched
    });

    it('inside the venue with the house lights up, the scroll show lights the venue', () => {
        const { look } = currentState(control({ progress: 0.17 })); // the "House lights" cue
        expect(look.house).toBeGreaterThan(0.9);
        expect(look.beams).toBeLessThan(0.05);
        expect(look.washColor).toBe(HOUSE_COLOR);
        expect(look.strobeSteady).toBeGreaterThan(0.9);
    });

    it('outside the gate the white sky beams keep running under the house lights', () => {
        const { look } = currentState(control({ progress: 0.02 }));
        expect(look.house).toBe(1);
        expect(look.beams).toBe(1);
        expect(look.strobeSteady).toBe(0);
    });

    it('the lighting desk: turning the house lights on lights the venue, turning them off restores the rig', () => {
        const desk = { ...DEFAULT_LOOK, beams: 1, laser: 1, house: 1 };
        expect(currentState({ mode: 'manual', desk }).look).toMatchObject({ beams: 0, laser: 0, wash: 1, washColor: HOUSE_COLOR });
        expect(currentState({ mode: 'manual', desk: { ...desk, house: 0 } }).look).toMatchObject({ beams: 1, laser: 1 });
    });

    it('song shows are never changed, even with house lights in the look', () => {
        const song = prepareSongShow({ cues: [{ t: 0, fade: 0, look: { house: 1, beams: 1, laser: 1 } }], beats: [], downbeats: [], hits: [] });
        const audio = { paused: true, currentTime: 1 };
        const { look } = currentState({ mode: 'song', song, audio });
        expect(look).toMatchObject({ house: 1, beams: 1, laser: 1 });
        expect(look.strobeSteady).toBe(0);
    });
    it('when a song ends, the house lights come up and light the venue', () => {
        const song = prepareSongShow({ cues: [{ t: 0, fade: 0, look: { beams: 1, laser: 1 } }, { t: 9, fade: 1, look: { master: 0 } }], beats: [], downbeats: [], hits: [] });
        const audio = { paused: true, currentTime: 10 }; // ended, in the final blackout
        const ending = currentState({ mode: 'song', song, audio, houseUpAt: performance.now() });
        expect(ending.look.master).toBeLessThan(0.05); // the blackout first
        const up = currentState({ mode: 'song', song, audio, houseUpAt: performance.now() - 2 * HOUSE_UP_MS });
        expect(up.look).toMatchObject({ master: 1, house: 1, beams: 0, laser: 0, wash: 1, washColor: HOUSE_COLOR, strobeSteady: 1 });
    });
});

