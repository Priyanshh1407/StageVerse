import { describe, expect, it } from 'vitest';
import { CO2_BLAST, CO2_FADE, CO2_JETS, co2Active, co2At, co2FromFirings, co2Pattern, jetsFor } from '@/lib/show/co2';
import { CO2_CLEAR, CO2_FRONT_Z, CO2_LASER_CLEAR, CO2_ROW_Z, co2Layout, laserLayout, rigLayout } from '@/components/home/stage/rigLayout';
import { programShow } from '@/lib/show/program';
import { prepareSongShow, sampleSongShow } from '@/lib/show/timeline';

describe('CO2 jets: where the nozzles stand', () => {
    for (const count of [64, 96, 140]) {
        it(`${count} moving heads: 6 nozzles, left to right, clear of every floor head and laser`, () => {
            const jets = co2Layout(count);
            expect(jets).toHaveLength(CO2_JETS);
            const xs = jets.map((j) => j.pos[0]);
            expect([...xs].sort((a, b) => a - b)).toEqual(xs);
            const heads = rigLayout(count).filter((f) => f.group === 'floor').map((f) => f.position[0]);
            const lasers = laserLayout(count).filter((l) => !l.tower).map((l) => l.pos[0]);
            for (const j of jets) {
                const [x, , z] = j.pos;
                // never in a laser's way, in the row or in front of it
                expect(Math.min(...lasers.map((l) => Math.abs(l - x)))).toBeGreaterThanOrEqual(CO2_LASER_CLEAR - 0.001);
                if (j.front) {
                    // moved in front of the lights, onto the deck's front lip
                    expect(z).toBe(CO2_FRONT_Z);
                    expect(z).toBeGreaterThan(CO2_ROW_Z + 0.4);
                    expect(z).toBeLessThan(0);
                } else {
                    expect(z).toBe(CO2_ROW_Z);
                    expect(Math.min(...heads.map((h) => Math.abs(h - x)))).toBeGreaterThanOrEqual(CO2_CLEAR - 0.001);
                }
            }
        });
    }

    it('packed rigs move every nozzle in front of the lights; the default rig keeps most in the row', () => {
        expect(co2Layout(140).every((j) => j.front)).toBe(true);
        expect(co2Layout(64).filter((j) => !j.front).length).toBeGreaterThanOrEqual(4);
    });

    it('the default rig is mirrored left and right', () => {
        const xs = co2Layout(64).map((j) => j.pos[0]);
        xs.forEach((x, i) => expect(x).toBeCloseTo(-xs[CO2_JETS - 1 - i], 5));
    });
});

describe('CO2 jets: state', () => {
    it('patterns pick the right jets', () => {
        expect(jetsFor('all')).toEqual([0, 1, 2, 3, 4, 5]);
        expect(jetsFor('outer')).toEqual([0, 5]);
        expect(jetsFor('middle')).toEqual([1, 4]);
        expect(jetsFor('inner')).toEqual([2, 3]);
        expect(jetsFor(3)).toEqual([3]);
    });

    it('a blast fires, then dissipates, then the jet is idle', () => {
        const hits = [{ t: 10, kind: 'co2', dur: CO2_BLAST, jets: 'outer' }];
        expect(co2At(hits, 9.9)).toBeNull();
        const firing = co2At(hits, 10.5);
        expect(firing[0]).toBeCloseTo(0.5);
        expect(firing[1]).toBe(CO2_BLAST);
        expect(firing[2]).toBe(-1); // jet 1 isn't in the pattern
        expect(firing[10]).toBeCloseTo(0.5);
        expect(co2Active(firing)).toBe(true);
        expect(co2Active(co2At(hits, 10 + CO2_BLAST + CO2_FADE - 0.1))).toBe(true);
        expect(co2At(hits, 10 + CO2_BLAST + CO2_FADE + 0.1)).toBeNull();
    });

    it('a newer blast on a jet replaces the older one', () => {
        const hits = [{ t: 10, kind: 'co2', dur: 1, jets: 'all' }, { t: 10.5, kind: 'co2', dur: 0.4, jets: 'inner' }];
        const s = co2At(hits, 10.6);
        expect(s[2 * 2]).toBeCloseTo(0.1);  // jet 2: the newer, short one
        expect(s[2 * 2 + 1]).toBe(0.4);
        expect(s[0]).toBeCloseTo(0.6);      // jet 0: still the first blast
    });

    it('desk: held jets fire for as long as they are held', () => {
        const held = [{ jet: 0, at: 1000, len: null }];
        expect(co2FromFirings(held, 3000).slice(0, 2)).toEqual([2, 2]);
        const released = [{ jet: 0, at: 1000, len: 2 }];
        expect(co2FromFirings(released, 3000 + (CO2_FADE + 0.1) * 1000)).toBeNull();
        // a pattern's later steps haven't started yet
        expect(co2FromFirings([{ jet: 1, at: 5000, len: 0.3 }], 4000)).toBeNull();
    });

    it('desk patterns: the chase runs left to right and back; outside-in goes outer, middle, inner', () => {
        expect(co2Pattern('chase').map((f) => f.jet)).toEqual([0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0]);
        const oi = co2Pattern('outside-in');
        expect(oi.filter((f) => f.delay === 0).map((f) => f.jet)).toEqual([0, 5]);
        expect(oi.at(-1).delay).toBeGreaterThan(oi[0].delay);
        expect(co2Pattern('blast')).toHaveLength(CO2_JETS);
    });
});

describe('CO2 jets in a song', () => {
    // 64 bars at 120 BPM: calm, build, peak (a drop), groove, peak (another drop), groove, outro
    const beat = 0.5;
    const beats = Array.from({ length: 64 * 4 }, (_, i) => i * beat);
    const at = (bar) => bar * 4 * beat;
    const analysis = {
        bpm: 120, duration: at(64), beats, downbeats: beats.map((_, i) => i).filter((i) => i % 4 === 0), energy: [],
        sections: [
            { start: 0, end: at(8), kind: 'intro', bars: 8, energy: 0.2 },
            { start: at(8), end: at(16), kind: 'build', bars: 8, energy: 0.5 },
            { start: at(16), end: at(28), kind: 'peak', bars: 12, energy: 0.9 },
            { start: at(28), end: at(40), kind: 'groove', bars: 12, energy: 0.5 },
            { start: at(40), end: at(52), kind: 'peak', bars: 12, energy: 0.95 },
            { start: at(52), end: at(60), kind: 'groove', bars: 8, energy: 0.5 },
            { start: at(60), end: at(64), kind: 'outro', bars: 4, energy: 0.2 },
        ],
    };

    it('only songs whose extras ask for it get CO2', () => {
        expect(programShow(analysis).hits.some((h) => h.kind === 'co2')).toBe(false);
        expect(programShow(analysis, { extras: { co2: true } }).hits.some((h) => h.kind === 'co2')).toBe(true);
    });

    it('every drop lands with a blast of all six jets', () => {
        const show = programShow(analysis, { extras: { co2: true } });
        const blasts = show.hits.filter((h) => h.kind === 'co2' && h.jets === 'all' && h.dur === CO2_BLAST);
        for (const peakStart of [at(16), at(40)]) {
            // within the peak's first 2 bars (the spool lands on bar 3; a slam on the downbeat)
            expect(blasts.some((h) => h.t >= peakStart - 0.01 && h.t <= peakStart + at(2) + 0.01)).toBe(true);
        }
    });

    it('a song with CO2 always gets its CO2 solo, even when it has room for only a few solos', () => {
        const solos = (extras) => programShow(analysis, { extras }).cues.filter((c) => /^Solo · [^·]+$/.test(c.name)).map((c) => c.name.slice(7));
        const plain = solos(null);
        const withCo2 = solos({ co2: true });
        expect(withCo2).toContain('CO2');
        // the same number of solos: CO2 takes the last slot rather than adding one
        expect(withCo2.length).toBe(plain.length);
        const solo = programShow(analysis, { extras: { co2: true } }).cues.find((c) => c.name === 'Solo · CO2');
        expect(solo.look.beams).toBe(0);
    });

    it('playback puts the jets on the look while they fire', () => {
        const show = prepareSongShow(programShow(analysis, { extras: { co2: true } }));
        const blast = show.hits.find((h) => h.kind === 'co2');
        const look = sampleSongShow(show, blast.t + 0.2).look;
        expect(co2Active(look.co2)).toBe(true);
    });
});
