import { describe, it, expect } from 'vitest';
import { DEFAULT_LOOK, mixHex, mixLooks } from '@/lib/show/look';
import { resolveCueSheet, sampleCueSheet, prepareSongShow, sampleSongShow, cueIndexAt } from '@/lib/show/timeline';
import { analyseSong, fft, estimateTempo, trackBeats, onsetEnvelope, frameFeatures } from '@/lib/show/analysis';
import { programShow } from '@/lib/show/program';
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

    it('a drop hit fires strobe and blinders that fade over its duration', () => {
        expect(sampleSongShow(show, 1).look.strobe).toBeCloseTo(1);
        expect(sampleSongShow(show, 1.25).look.blinder).toBeCloseTo(0.5);
        expect(sampleSongShow(show, 1.6).look.strobe).toBe(0);
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
        expect(show.cues.at(-1).look.master).toBe(0);
        const prepared = prepareSongShow(show);
        for (let t = 0; t <= 128; t += 0.25) {
            const { look } = sampleSongShow(prepared, t);
            expect(Number.isFinite(look.intensity)).toBe(true);
            expect(look.colorA).toMatch(/^#[0-9a-f]{6}$/);
        }
        expect(sampleSongShow(prepared, 127.9).look.master).toBeLessThan(0.1);
    });
});
