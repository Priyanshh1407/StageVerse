import { describe, it, expect } from 'vitest';
import { buildScrollSheet, ROLES, roleAt, screenAt, phaseAt, PLAY_FROM } from '@/components/home/show/scrollShow';
import { sampleCueSheet } from '@/lib/show/timeline';
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
