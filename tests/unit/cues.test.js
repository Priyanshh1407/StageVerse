import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { HITS, collectCues, cueKind } from '@/lib/show/stages/cues';

describe('the cue tester', () => {
    it('names each kind of cue once, without numbers, phrases or bars', () => {
        expect(cueKind('Groove 3 · phrase 2')).toBe('Groove');
        expect(cueKind('Peak 5 · chorus')).toBe('Peak · chorus');
        expect(cueKind('Solo · washes · bar 3')).toBe('Solo · washes');
        expect(cueKind('Riser into peak 11')).toBe('Riser into peak');
        expect(cueKind('Focus')).toBe('Focus');
    });

    it('collects every distinct cue from the demo shows, each with a complete look', () => {
        const index = JSON.parse(fs.readFileSync('public/shows/index.json', 'utf8'));
        const shows = index.demos.map((d) => JSON.parse(fs.readFileSync(`public${d.show}`, 'utf8')));
        const cues = collectCues(shows);
        const kinds = cues.map((c) => c.kind);
        expect(new Set(kinds).size).toBe(kinds.length);
        for (const kind of ['Intro', 'Groove', 'Build', 'Peak · chorus', 'Breakdown', 'Solo · aerial beams', 'Solo · CO2', 'Solo · side towers', 'Solo · side towers · mirrored']) expect(kinds, kind).toContain(kind);
        expect(cues.find((c) => c.kind === 'Solo · side towers · mirrored').look.sidesMirror).toBe(1);
        expect(cues.find((c) => c.kind === 'Circle · all beams').look.circle).toBe(1);
        for (const cue of cues) expect(typeof cue.look.intensity, cue.kind).toBe('number');
    });

    it('applies each hit the way the shows do, fading out over its length', () => {
        expect(HITS.Drop.apply({}, 0)).toMatchObject({ strobe: 1, blinder: 1, dropFx: 1, laser: 1 });
        expect(HITS.Blinder.apply({}, 0.75).blinder).toBeCloseTo(0.25);
        expect(HITS.Burst.apply({ intensity: 0.5 }, 0).intensity).toBe(1.6);
    });
});
