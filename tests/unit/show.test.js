import { describe, it, expect } from 'vitest';
import { DEFAULT_LOOK, mixHex, mixLooks } from '@/lib/show/look';
import { resolveCueSheet, sampleCueSheet, prepareSongShow, sampleSongShow, cueIndexAt } from '@/lib/show/timeline';
import { analyseSong, fft, estimateTempo, trackBeats, onsetEnvelope, frameFeatures } from '@/lib/show/analysis';
import { programShow, buildIdleShow } from '@/lib/show/program';
import { SHOTS } from '@/lib/show/shots';

// A synthetic track: a kick on every beat (louder on beat 1 of each bar), a hi-hat on the
// off-beats, quiet for the first `quietBars` bars and loud afterwards.
function clickTrack({ bpm = 120, seconds = 64, sampleRate = 22050, quietBars = 8 } = {}) {
    const n = Math.floor(seconds * sampleRate);
    const x = new Float32Array(n);
    const beat = 60 / bpm;
    for (let b = 0; b * beat < seconds; b++) {
        const start = Math.floor(b * beat * sampleRate);
        const loud = b >= quietBars * 4 ? 1 : 0.15;
        const accent = b % 4 === 0 ? 1 : 0.55;
        for (let i = 0; i < 0.12 * sampleRate && start + i < n; i++) {
            const t = i / sampleRate;
            x[start + i] += Math.sin(2 * Math.PI * 60 * t) * Math.exp(-t * 30) * 0.8 * loud * accent; // kick
        }
        const hat = Math.floor((b + 0.5) * beat * sampleRate);
        for (let i = 0; i < 0.03 * sampleRate && hat + i < n; i++) {
            x[hat + i] += (Math.sin(i * 1.7) * Math.sin(i * 2.9)) * Math.exp(-i / (0.005 * sampleRate)) * 0.2 * loud;
        }
    }
    return { channels: [x], sampleRate };
}

describe('looks', () => {
    it('mixes colours and numbers', () => {
        expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
        expect(mixHex('#19d9ff', '#ff3df2', 0)).toBe('#19d9ff');
        const m = mixLooks({ ...DEFAULT_LOOK, intensity: 0 }, { ...DEFAULT_LOOK, intensity: 1 }, 0.25);
        expect(m.intensity).toBeCloseTo(0.25);
    });
});

describe('cue sheets', () => {
    const sheet = resolveCueSheet([
        { t: 0, fade: 0, look: { intensity: 0.2 }, shot: 'house', name: 'one' },
        { t: 10, fade: 2, look: { intensity: 1, colorA: '#ffffff' }, name: 'two' },
        { t: 20, fade: 0, look: { sweep: 0.9 }, shot: 'drop' },
    ]);

    it('tracks: a cue only changes what it names', () => {
        expect(sheet.cues[2].look.intensity).toBe(1);
        expect(sheet.cues[2].look.colorA).toBe('#ffffff');
        expect(sheet.cues[1].shot).toBe('house');
    });

    it('fades from what was showing to the cue look', () => {
        expect(sampleCueSheet(sheet, 5).look.intensity).toBeCloseTo(0.2);
        expect(sampleCueSheet(sheet, 11).look.intensity).toBeCloseTo(0.6); // smoothstep(0.5) = 0.5
        expect(sampleCueSheet(sheet, 12.5).look.intensity).toBeCloseTo(1);
        expect(sampleCueSheet(sheet, 21).shot).toBe('drop');
        expect(sampleCueSheet(sheet, 11).name).toBe('two');
    });

    it('a cue that interrupts a fade starts from the half-faded look, not a jump', () => {
        const s = resolveCueSheet([
            { t: 0, fade: 0, look: { intensity: 0 } },
            { t: 1, fade: 4, look: { intensity: 1 } },
            { t: 3, fade: 1, look: { sweep: 0.1 } },
        ]);
        expect(s.cues[2].from.intensity).toBeCloseTo(0.5);
        expect(sampleCueSheet(s, 3).look.intensity).toBeCloseTo(0.5);
    });

    it('binary search finds the last cue at or before t', () => {
        expect(cueIndexAt([1, 2, 3], 2.5, null)).toBe(1);
        expect(cueIndexAt([1, 2, 3], 0.5, null)).toBe(-1);
        expect(cueIndexAt([1, 2, 3], 9, null)).toBe(2);
    });
});

describe('song show', () => {
    const show = prepareSongShow({
        cues: [{ t: 0, fade: 0, look: { pulseAmount: 1 } }],
        beats: [0, 0.5, 1, 1.5, 2],
        downbeats: [0, 4],
        hits: [{ t: 1, kind: 'drop', dur: 0.5 }],
    });

    it('pulses on beats, harder on downbeats, decaying between them', () => {
        expect(sampleSongShow(show, 0).look.pulse).toBeCloseTo(1);
        expect(sampleSongShow(show, 0.5).look.pulse).toBeCloseTo(0.6);
        expect(sampleSongShow(show, 0.9).look.pulse).toBeLessThan(0.05);
    });

    it('a drop hit: white blast, hard strobing, beams focused, lasers chasing, then release', () => {
        const start = sampleSongShow(show, 1).look;
        expect(start.blinder).toBeCloseTo(1);           // the blast
        expect(start.strobe).toBe(1);
        expect(start.dropFx).toBeCloseTo(1);
        expect(start.laserChase).toBe(1);
        const mid = sampleSongShow(show, 1.25).look;   // halfway through the hit
        expect(mid.blinder).toBe(0);                    // the blast is short
        expect(mid.strobe).toBe(1);                     // the strobing keeps going
        expect(mid.dropFx).toBeCloseTo(0.5);            // releasing
        const after = sampleSongShow(show, 1.6).look;
        expect(after.strobe).toBe(0);
        expect(after.dropFx ?? 0).toBe(0);
    });
});

describe('analysis', () => {
    it('FFT finds a pure tone in the right bin', () => {
        const n = 256;
        const re = new Float64Array(n).map((_, i) => Math.sin((2 * Math.PI * 8 * i) / n));
        const im = new Float64Array(n);
        fft(re, im);
        const mags = Array.from(re, (r, i) => Math.hypot(r, im[i]));
        expect(mags.indexOf(Math.max(...mags.slice(0, n / 2)))).toBe(8);
    });

    it('finds the tempo, beats and bar lines of a 120 BPM click track', () => {
        const { channels, sampleRate } = clickTrack({ bpm: 120 });
        const result = analyseSong(channels, sampleRate);
        expect(result.bpm).toBeGreaterThan(118);
        expect(result.bpm).toBeLessThan(122);
        // Beats every 0.5 s, aligned with the clicks (within ~25 ms)
        const gaps = result.beats.slice(1).map((b, i) => b - result.beats[i]);
        expect(gaps.filter((g) => Math.abs(g - 0.5) < 0.03).length / gaps.length).toBeGreaterThan(0.9);
        const offBy = result.beats.slice(4, 40).map((b) => Math.abs(b - Math.round(b * 2) / 2));
        expect(Math.max(...offBy)).toBeLessThan(0.035);
        // Downbeats land on the accented kicks (every 2 s)
        const firstBar = result.beats[result.downbeats[1]];
        expect(Math.abs(firstBar / 2 - Math.round(firstBar / 2))).toBeLessThan(0.05);
    });

    it('splits quiet from loud: a section boundary where the track gets loud', () => {
        const { channels, sampleRate } = clickTrack({ bpm: 120, seconds: 64, quietBars: 16 });
        const result = analyseSong(channels, sampleRate);
        const boundary = result.sections.find((s) => Math.abs(s.start - 32) < 2.5);
        expect(boundary).toBeDefined();
        expect(boundary.energy).toBeGreaterThan(result.sections[0].energy);
    });

    it('tempo estimate prefers the beat rate over half/double', () => {
        const fps = 100;
        const onset = new Float32Array(3000).map((_, i) => (i % 50 === 0 ? 5 : 0)); // 120 BPM
        expect(Math.round(estimateTempo(onset, fps))).toBe(120);
        const beats = trackBeats(onset, fps, 120);
        expect(beats.every((b) => b % 50 === 0)).toBe(true);
    });

    it('onset envelope is non-negative', () => {
        const { channels, sampleRate } = clickTrack({ seconds: 8 });
        const { flux, fps } = frameFeatures(channels[0], sampleRate);
        expect(Math.min(...onsetEnvelope(flux, fps))).toBeGreaterThanOrEqual(0);
    });
});

describe('programming a show', () => {
    const beats = Array.from({ length: 256 }, (_, i) => i * 0.5); // 120 BPM, 128 s
    const downbeats = beats.map((_, i) => i).filter((i) => i % 4 === 0);
    const analysis = {
        duration: 128, bpm: 120, beats, downbeats, energy: [],
        sections: [
            { start: 0, end: 16, kind: 'intro', energy: 0.2, bars: 8 },
            { start: 16, end: 48, kind: 'build', energy: 0.5, bars: 16 },
            { start: 48, end: 112, kind: 'peak', energy: 0.9, bars: 32 },
            { start: 112, end: 128, kind: 'outro', energy: 0.1, bars: 8 },
        ],
    };
    const show = programShow(analysis, { title: 'Test', audio: '/audio/test.mp3' });

    it('drops on the first beat of each peak and rises into it', () => {
        expect(show.hits.find((h) => h.kind === 'drop').t).toBe(48);
        const riser = show.cues.find((c) => c.name.startsWith('Riser'));
        expect(riser.t).toBe(44);                     // 2 bars (4 s) before the peak
        expect(riser.t + riser.fade).toBeCloseTo(48);
        expect(riser.look.converge).toBeGreaterThan(0.5);
    });

    it('long builds groove first and only build over their last 8 bars', () => {
        expect(show.cues.find((c) => c.name === 'Groove 2').t).toBe(16);
        expect(show.cues.find((c) => c.name === 'Build 2').t).toBe(32);
    });

    it('cuts the camera on 8-bar phrases and only to known shots', () => {
        const phrases = show.cues.filter((c) => c.name.includes('phrase'));
        expect(phrases.map((c) => c.t)).toContain(64);   // 8 bars into the peak
        for (const c of show.cues) if (c.shot) expect(SHOTS[c.shot]).toBeDefined();
    });

    it('ends in a blackout, and plays without errors from start to end', () => {
        expect(show.cues.some((c) => c.look?.master === 0)).toBe(true);
        const prepared = prepareSongShow(show);
        for (let t = 0; t <= 128; t += 0.25) {
            const { look } = sampleSongShow(prepared, t);
            expect(Number.isFinite(look.intensity)).toBe(true);
            expect(look.colorA).toMatch(/^#[0-9a-f]{6}$/);
        }
        expect(sampleSongShow(prepared, 127.9).look.master).toBeLessThan(0.1);
    });
});

describe('programming rules (concert-style)', () => {
    // 120 BPM, 2 s bars: intro 8 bars, calm 8, groove 8, build 8, peak 24, breakdown 8, outro 8
    const beats = Array.from({ length: 72 * 4 }, (_, i) => i * 0.5);
    const downbeats = beats.map((_, i) => i).filter((i) => i % 4 === 0);
    const sec = (start, bars, kind) => ({ start, end: start + bars * 2, kind, bars, energy: 0.5 });
    // energy at 2 points/s: the peak (64-112 s) jumps at 72 s, then jumps harder at 84 s
    const energy = Array.from({ length: 288 }, (_, i) => {
        const t = i / 2;
        if (t < 64 || t >= 112) return 0.3;
        return t >= 84 ? 0.98 : t >= 72 ? 0.72 : 0.5;
    });
    const analysis = {
        duration: 144, bpm: 120, beats, downbeats, energy,
        sections: [sec(0, 8, 'intro'), sec(16, 8, 'calm'), sec(32, 8, 'groove'), sec(48, 8, 'build'), sec(64, 24, 'peak'), sec(112, 8, 'groove'), sec(128, 8, 'outro')],
    };
    const show = programShow(analysis, { title: 'Rules' });
    const prepared = prepareSongShow(show);
    const at = (t) => sampleSongShow(prepared, t).look;

    it('the intro starts in blackout and the lights grow with the energy', () => {
        expect(at(0.1).master).toBe(0);
        expect(at(12).master).toBeGreaterThan(0.9);
        expect(show.cues.filter((c) => c.t < 16 && c.name.startsWith('Intro')).length).toBeGreaterThan(2);
    });

    it('calm parts still move, and grooves move more than calm parts', () => {
        expect(at(20).sweep).toBeGreaterThan(0);
        const calm = show.cues.filter((c) => c.name.startsWith('Calm'));
        const groove = show.cues.filter((c) => c.name.startsWith('Groove 3'));
        const avg = (cs, k) => cs.reduce((s, c) => s + (c.look[k] ?? 0), 0) / cs.length;
        expect(avg(groove, 'speed')).toBeGreaterThan(avg(calm, 'speed'));
    });

    it('a build opens with the lasers alone and speeds up every 2 bars', () => {
        const build = show.cues.filter((c) => c.name.startsWith('Build')).sort((a, b) => a.t - b.t);
        expect(build[0].look.beams).toBe(0);
        expect(build[0].look.laser).toBe(1);
        for (let i = 2; i < build.length; i++) expect(build[i].look.speed).toBeGreaterThan(build[i - 1].look.speed);
    });

    it('a peak opens with one or two lasers that grow while everything else is dark, then the rig slams in', () => {
        expect(at(64.5).laserAmount).toBeLessThan(0.2);
        const spool = at(66);
        expect(spool.beams + spool.sides + spool.floor + spool.wash).toBe(0);
        expect(spool.laser).toBe(1);
        expect(at(69).beams).toBe(1);
        expect(at(69).laserSpread).toBeGreaterThan(1.5);
    });

    it('peaks hit strobes/blinders every 2 bars, and bursts of energy go full on', () => {
        expect(at(72.5).laserAmount).toBeGreaterThan(0.9);
        const peakHits = show.hits.filter((h) => h.t >= 64 && h.t < 112);
        expect(peakHits.filter((h) => h.kind === 'strobe' || h.kind === 'blinder').length).toBeGreaterThanOrEqual(8);
        // the smaller burst gets a strobe burst (the biggest becomes the focus section)
        expect(show.hits.some((h) => h.kind === 'strobe' && Math.abs(h.t - 72) < 1.1 && h.dur > 0.6)).toBe(true);
        expect(show.hits.some((h) => h.kind === 'burst' && Math.abs(h.t - 72) < 1.1)).toBe(true);
        expect(at(72.3).intensity).toBeGreaterThanOrEqual(1.6);
    });

    it('a focus section at the biggest spike: aimed at the centre of the stage floor, beams sparkling', () => {
        const focus = show.cues.find((c) => c.name === 'Focus');
        expect(focus).toBeDefined();
        expect(Math.abs(focus.t - 84)).toBeLessThanOrEqual(2);
        const look = at(focus.t + 1);
        expect(look.sparkle).toBeGreaterThan(0.9);
        expect(look.converge).toBeGreaterThan(0.8);
        expect(look.beams + look.sides).toBe(2);
        expect(look.floor).toBe(0);
        expect(look.wash).toBe(0);
        expect(look.focusFloor).toBe(1);
        expect(look.laser).toBe(0);
        // one colour for the whole rig, changing smoothly (over a bar) every 2 bars
        const phrases = show.cues.filter((c) => c.name.startsWith('Focus'));
        for (const c of phrases) expect(c.look.colorA).toBe(c.look.colorB);
        expect(new Set(phrases.map((c) => c.look.colorA)).size).toBeGreaterThan(1);
        for (const c of phrases.slice(1)) expect(c.fade).toBeGreaterThanOrEqual(1.9);
    });

    it('the final breakdown: side towers alone, from crossing inside to out at the audience', () => {
        expect(show.sections.find((s) => s.start === 112).kind).toBe('breakdown');
        const open = at(113);
        expect(open.beams + open.floor + open.wash + open.laser).toBe(0);
        expect(open.sides).toBe(1);
        // one line, no wiggle, level; turning only horizontally:
        // crossing -> flared outside (~100 deg) -> straight at the audience -> crossing
        expect(open.sweep).toBe(0);
        expect(Math.abs(open.sidesAim)).toBeLessThan(0.05);
        expect(at(120.6).sidesAim).toBeLessThan(-1.8);
        expect(Math.abs(at(123.9).sidesAim + 1)).toBeLessThan(0.1);
        expect(Math.abs(at(127.95).sidesAim)).toBeLessThan(0.1);
        for (const t of [113, 118, 122, 126]) expect(Math.abs(at(t).tiltShift + 0.15)).toBeLessThan(0.01);
    });

    it('a breakdown between peaks: blinders alone, then washes alone, then slowing down', () => {
        const mid = programShow({ ...analysis, sections: [sec(0, 8, 'intro'), sec(16, 8, 'build'), sec(32, 8, 'peak'), sec(48, 8, 'groove'), sec(64, 24, 'peak'), sec(112, 16, 'outro')] });
        expect(mid.sections.find((s) => s.start === 48).kind).toBe('breakdown');
        expect(mid.hits.some((h) => h.t === 48 && h.kind === 'blinder')).toBe(true);
        const washes = mid.cues.find((c) => c.name.startsWith('Breakdown') && c.name.includes('phrase 2'));
        expect(washes.look.wash).toBe(1);
        expect(washes.look.beams + washes.look.sides).toBe(0);
    });

    it('every song gives each fixture type a solo: side towers, aerial beams, floor, washes, lasers', () => {
        const beats240 = Array.from({ length: 120 * 4 }, (_, i) => i * 0.5);
        const long = programShow({ ...analysis, beats: beats240, downbeats: beats240.map((_, i) => i).filter((i) => i % 4 === 0), duration: 240, sections: [sec(0, 8, 'intro'), sec(16, 16, 'calm'), sec(48, 16, 'groove'), sec(80, 8, 'build'), sec(96, 32, 'peak'), sec(160, 16, 'groove'), sec(192, 16, 'peak'), sec(224, 8, 'outro')] });
        const solos = long.cues.filter((c) => c.name.startsWith('Solo') && !c.name.includes(' · bar '));
        expect(solos.map((c) => c.name.replace('Solo · ', '')).sort()).toEqual(['aerial beams', 'floor', 'lasers', 'side towers', 'washes']);
        for (const solo of solos) {
            const lit = ['beams', 'sides', 'floor', 'wash', 'laser'].filter((k) => (solo.look[k] ?? 0) > 0);
            expect(lit).toHaveLength(1);
            expect(solo.look.intensity).toBeGreaterThanOrEqual(1.3);
            // nothing but the washes' own bar changes fires during its 4 bars (8 s here)
            const inside = long.cues.filter((c) => c.t > solo.t && c.t < solo.t + 8 - 0.01);
            expect(inside.every((c) => c.name.startsWith('Solo · washes'))).toBe(true);
        }
        // the washes tilt and change colour
        const washBars = long.cues.filter((c) => c.name.startsWith('Solo · washes · bar'));
        expect(washBars.length).toBe(3);
        expect(new Set(washBars.map((c) => c.look.tiltShift)).size).toBe(2);
        expect(new Set(washBars.map((c) => c.look.washColor)).size).toBe(3);
        expect(buildIdleShow().cues.some((c) => c.name.startsWith('Solo'))).toBe(true);
    });

    it('washes stay in the beams\' colour family', () => {
        for (const c of show.cues.filter((x) => x.look?.washColor && x.look?.colorA && x.look.colorA !== x.look.colorB)) {
            const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
            const [a, b, w] = [c.look.colorA, c.look.colorB, c.look.washColor].map(hex);
            // the wash sits between the two beam colours, channel by channel
            for (let k = 0; k < 3; k++) {
                expect(w[k]).toBeGreaterThanOrEqual(Math.min(a[k], b[k]) - 1);
                expect(w[k]).toBeLessThanOrEqual(Math.max(a[k], b[k]) + 1);
            }
        }
    });

    it('alternating beams (odd/even fully swapping on the beat) in calm, groove, build and peak', () => {
        const beats240 = Array.from({ length: 120 * 4 }, (_, i) => i * 0.5);
        const song = programShow({ ...analysis, beats: beats240, downbeats: beats240.map((_, i) => i).filter((i) => i % 4 === 0), duration: 240, sections: [sec(0, 8, 'intro'), sec(16, 24, 'calm'), sec(64, 24, 'groove'), sec(112, 8, 'build'), sec(128, 40, 'peak'), sec(208, 16, 'outro')] });
        const alternating = (prefix) => song.cues.filter((c) => c.name.startsWith(prefix) && c.look?.alternate === 1);
        expect(alternating('Groove').length).toBeGreaterThan(0);
        expect(alternating('Build').length).toBeGreaterThan(0);
        expect(alternating('Calm').length).toBeGreaterThan(0);
        expect(alternating('Peak').length).toBeGreaterThan(0);
    });

    it('grooves have no lasers', () => {
        for (const c of show.cues.filter((x) => x.name.startsWith('Groove'))) expect(c.look.laser ?? 0).toBe(0);
    });

    it('a song without an outro gets one: the last 5 seconds fade to black', () => {
        const noOutro = programShow({ ...analysis, sections: analysis.sections.slice(0, -1).map((s, i, a) => (i === a.length - 1 ? { ...s, end: 144 } : s)) });
        expect(noOutro.sections.at(-1)).toMatchObject({ kind: 'outro', start: 139, end: 144 });
        const p = prepareSongShow(noOutro);
        expect(sampleSongShow(p, 143.95).look.master).toBeLessThan(0.05);
        expect(sampleSongShow(p, 138).look.master).toBe(1);
    });

    it('the outro matches how the song ends: big finish after a peak, soft fade after a quiet part', () => {
        const fromPeak = programShow({ ...analysis, sections: [sec(0, 8, 'intro'), sec(16, 8, 'build'), sec(32, 48, 'peak'), sec(128, 8, 'outro')] });
        const p = prepareSongShow(fromPeak);
        const hit = sampleSongShow(p, 128.3).look;
        expect(hit.beams + hit.sides + hit.floor).toBe(3);
        expect(hit.blinder).toBeGreaterThan(0.5);
        expect(fromPeak.cues.some((c) => c.name.includes('flaring out'))).toBe(false);
        expect(sampleSongShow(p, 143.95).look.master).toBeLessThan(0.05);

        const calm = programShow({ ...analysis, sections: [sec(0, 8, 'intro'), sec(16, 56, 'calm'), sec(128, 8, 'outro')] });
        const q = prepareSongShow(calm);
        const soft = sampleSongShow(q, 131).look;
        expect(soft.wash).toBe(1);
        expect(soft.beams + soft.floor + soft.laser).toBe(0);
        expect(calm.cues.some((c) => c.name.includes('flaring out'))).toBe(false);
        expect(sampleSongShow(q, 143.95).look.master).toBeLessThan(0.05);
    });

    it('a song that winds down through a breakdown keeps the side-tower ending', () => {
        expect(show.cues.some((c) => c.name.includes('flaring out'))).toBe(true);
    });

    it('the outro fades slowly into blackout', () => {
        expect(at(130).master).toBeGreaterThan(0.5);
        expect(at(143.9).master).toBeLessThan(0.05);
    });

    it('uses many colours across the song', () => {
        const colours = new Set(show.cues.map((c) => c.look?.colorA).filter(Boolean));
        expect(colours.size).toBeGreaterThanOrEqual(8);
    });

    it('a peak straight after a peak carries on: no second drop', () => {
        const two = programShow({ ...analysis, sections: [sec(0, 8, 'intro'), sec(16, 8, 'build'), sec(32, 8, 'peak'), sec(48, 8, 'peak'), sec(64, 40, 'outro')] });
        expect(two.hits.filter((h) => h.kind === 'drop').map((h) => h.t)).toEqual([32]);
        expect(two.cues.some((c) => c.name.startsWith('Riser') && c.t > 40)).toBe(false);
    });

    it('beat position and energy follow reach the rig', () => {
        expect(at(10.25).beatPos).toBeCloseTo(20.5, 1);
        expect(at(140).intensity).toBeLessThan(at(90).intensity);
    });
});

describe('section labels', () => {
    it('only calls a section a build when its energy rises into the peak', async () => {
        const { labelSections } = await import('@/lib/show/analysis');
        const flat = labelSections([{ energy: 0.3, rise: 0 }, { energy: 0.45, rise: 0.01 }, { energy: 0.9, rise: 0 }, { energy: 0.2, rise: 0 }]);
        expect(flat[1].kind).not.toBe('build');
        const rising = labelSections([{ energy: 0.3, rise: 0 }, { energy: 0.45, rise: 0.2 }, { energy: 0.9, rise: 0 }, { energy: 0.2, rise: 0 }]);
        expect(rising[1].kind).toBe('build');
    });
});

describe('energy climbs in steps', () => {
    it('calm goes to groove before a build, so the energy rises', () => {
        const beats = Array.from({ length: 48 * 4 }, (_, i) => i * 0.5);
        const downbeats = beats.map((_, i) => i).filter((i) => i % 4 === 0);
        const sec = (start, bars, kind) => ({ start, end: start + bars * 2, kind, bars, energy: 0.5 });
        const show = programShow({ duration: 96, bpm: 120, beats, downbeats, energy: [],
            sections: [sec(0, 8, 'intro'), sec(16, 8, 'calm'), sec(32, 8, 'build'), sec(48, 16, 'peak'), sec(80, 8, 'outro')] });
        const kinds = show.sections.map((s) => s.kind);
        const calm = kinds.indexOf('calm');
        expect(kinds.slice(calm, calm + 3)).toEqual(['calm', 'groove', 'build']);
    });
});

describe('build-up detection', () => {
    it('carves a build out of the bars climbing into a peak, even inside a longer section', async () => {
        const { markBuilds } = await import('@/lib/show/analysis');
        // 24 bars of steady groove, the last 8 climbing (louder, busier), then a peak
        const bars = Array.from({ length: 40 }, (_, i) => {
            if (i >= 24) return { energy: 0.9, density: 0.8 };
            const climb = i >= 16 ? (i - 15) / 8 : 0;
            return { energy: 0.4 + 0.3 * climb, density: 0.3 + 0.4 * climb };
        });
        const sections = [{ startBar: 0, endBar: 24, kind: 'groove' }, { startBar: 24, endBar: 40, kind: 'peak' }];
        const out = markBuilds(sections, bars);
        const build = out.find((s) => s.kind === 'build');
        expect(build).toBeDefined();
        expect(build.endBar).toBe(24);
        expect(build.startBar).toBeGreaterThanOrEqual(14);
        expect(build.startBar).toBeLessThanOrEqual(18);
        expect(out[0]).toMatchObject({ kind: 'groove', startBar: 0 });
    });

    it('leaves a flat run into a peak alone', async () => {
        const { markBuilds } = await import('@/lib/show/analysis');
        const bars = Array.from({ length: 32 }, (_, i) => (i >= 16 ? { energy: 0.9, density: 0.8 } : { energy: 0.4, density: 0.3 }));
        const sections = [{ startBar: 0, endBar: 16, kind: 'groove' }, { startBar: 16, endBar: 32, kind: 'peak' }];
        expect(markBuilds(sections, bars).some((s) => s.kind === 'build')).toBe(false);
    });
});
