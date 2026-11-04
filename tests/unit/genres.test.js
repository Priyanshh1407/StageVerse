import { describe, it, expect } from 'vitest';
import { analyseSong } from '@/lib/show/analysis';
import { programShow } from '@/lib/show/program';
import { normaliseGenre, findArtists, GENRE_KEYS, ARTISTS } from '@/lib/show/genres';
import { chromaFrames, labelByRepetition, groupSections } from '@/lib/show/structure';
import { checkTempoOctave } from '@/lib/show/rhythm';
import { scoreSong, boundaryScore, overlapScore, tempoScore } from '@/lib/show/score';

import { song, parts, SR } from '../helpers/synthSong';

const overlap = (sections, from, to, pred) => sections.filter(pred).reduce((s, x) => s + Math.max(0, Math.min(x.end, to) - Math.max(x.start, from)), 0) / (to - from);

describe('genres', () => {
    it('knows the four genres and falls back to EDM', () => {
        expect(GENRE_KEYS).toEqual(['edm', 'pop', 'rap', 'bollywood']);
        expect(normaliseGenre('POP')).toBe('pop');
        expect(normaliseGenre('jazz')).toBe('edm');
        expect(normaliseGenre(undefined)).toBe('edm');
    });
    it('the help list puts the artists where the change list says', () => {
        expect(findArtists('chainsmokers')).toEqual([{ artist: 'The Chainsmokers', genre: 'edm' }]);
        for (const name of ['Maroon 5', 'Shawn Mendes', 'Justin Bieber']) expect(findArtists(name)[0].genre).toBe('pop');
        expect(findArtists('arijit')[0].genre).toBe('bollywood');
        expect(findArtists('')).toEqual([]);
        // nobody is in two genres
        const all = Object.values(ARTISTS).flat();
        expect(new Set(all).size).toBe(all.length);
    });
});

describe('structure by repetition', () => {
    it('reads the pitch class of a tone', () => {
        const x = new Float32Array(SR).map((_, i) => Math.sin((2 * Math.PI * 440 * i) / SR));
        const ch = chromaFrames(x, SR);
        const sum = new Array(12).fill(0);
        for (let f = 0; f < ch.frames; f++) for (let p = 0; p < 12; p++) sum[p] += ch.chroma[f * 12 + p];
        expect(sum.indexOf(Math.max(...sum))).toBe(9); // A
    });

    it('labels verse, chorus and bridge from which sections repeat', () => {
        const sec = (startBar, endBar, energy) => ({ startBar, endBar, energy });
        const sections = [sec(0, 4, 0.2), sec(4, 12, 0.5), sec(12, 20, 0.7), sec(20, 28, 0.5), sec(28, 36, 0.7), sec(36, 44, 0.45), sec(44, 52, 0.72), sec(52, 56, 0.2)];
        const group = [0, 1, 2, 1, 2, 3, 2, 4];
        expect(labelByRepetition(sections, group)).toEqual(['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus', 'outro']);
        expect(labelByRepetition(sections, [0, 1, 2, 3, 4, 5, 6, 7])).toBeNull(); // nothing repeats
    });

    it('never groups a quiet section with a loud one, however alike the chords', () => {
        // four 8-bar sections: A, B, C, then A again
        const n = 32;
        const block = (i) => (i >= 24 ? 0 : Math.floor(i / 8));
        const S = Array.from({ length: n }, (_, i) => Float32Array.from({ length: n }, (_, j) => (block(i) === block(j) ? 0.95 : 0.3)));
        const sec = (k, energy) => ({ startBar: k * 8, endBar: k * 8 + 8, energy });
        expect(groupSections(S, [sec(0, 0.7), sec(1, 0.7), sec(2, 0.7), sec(3, 0.72)])).toEqual([0, 1, 2, 0]);
        expect(groupSections(S, [sec(0, 0.7), sec(1, 0.7), sec(2, 0.7), sec(3, 0.2)])).toEqual([0, 1, 2, 3]);
    });

    it('finds the chorus of a pop song that is equally loud throughout', () => {
        const verse = { bars: 8, chords: ['Am', 'F'], loud: 0.8, drums: true, vocal: true };
        const chorus = { bars: 8, chords: ['C', 'G'], loud: 0.85, drums: true, vocal: true };
        const bridge = { bars: 8, chords: ['Dm', 'E'], loud: 0.75, drums: true, vocal: false };
        const { channels, sampleRate } = song(parts([{ bars: 4, chords: ['Am'], loud: 0.3, drums: false }, verse, chorus, verse, chorus, bridge, chorus]));
        const a = analyseSong(channels, sampleRate, { genre: 'pop' });
        // scored the way the test set is (npm run score:analysis): where the chorus and the peaks are
        const marks = { end: 104, sections: [{ start: 0, label: 'intro' }, { start: 8, label: 'verse' }, { start: 24, label: 'chorus' }, { start: 40, label: 'verse' },
            { start: 56, label: 'chorus' }, { start: 72, label: 'bridge' }, { start: 88, label: 'chorus' }] };
        const score = scoreSong(marks, a);
        expect(score.chorus.f1).toBeGreaterThan(0.7);
        expect(score.peaks.f1).toBeGreaterThan(0.7);
        // the later choruses are found as such (the first verse and chorus, equally loud and both
        // sung, can merge when only their chords differ)
        expect(overlap(a.sections, 56, 72, (x) => x.label === 'chorus')).toBeGreaterThan(0.7);
        expect(overlap(a.sections, 88, 104, (x) => x.label === 'chorus')).toBeGreaterThan(0.7);
        // the bridge isn't
        expect(overlap(a.sections, 72, 88, (x) => x.label === 'chorus')).toBeLessThan(0.3);
        // a chorus is lit with a lift (blinder), not an EDM drop
        const show = programShow(a, { title: 'pop' });
        expect(show.genre).toBe('pop');
        expect(show.hits.some((h) => h.kind === 'drop')).toBe(false);
        expect(show.cues.some((c) => /chorus/.test(c.name))).toBe(true);
    }, 30000);
});

describe('rap', () => {
    it('finds the beat cutting out and coming back, and lights it', () => {
        const beat = { bars: 8, chords: ['Am'], loud: 0.9, drums: true, vocal: true };
        const list = parts([beat, beat, { ...beat, silence: [16, 3] }, beat, beat]);
        const { channels, sampleRate } = song(list, { bpm: 90 });
        const a = analyseSong(channels, sampleRate, { genre: 'rap' });
        const beatLen = 60 / 90;
        const back = (16 * 4 + 19) * beatLen; // the beat after the 3 silent ones
        expect(a.moments).toHaveLength(1);
        expect(Math.abs(a.moments[0].end - back)).toBeLessThan(0.25);
        const show = programShow(a, { title: 'rap' });
        expect(show.cues.some((c) => c.name === 'Beat slams back' && Math.abs(c.t - a.moments[0].end) < 0.01)).toBe(true);
        expect(show.hits.some((h) => h.kind === 'burst' && Math.abs(h.t - a.moments[0].end) < 0.01)).toBe(true);
        // EDM doesn't look for them
        expect(analyseSong(channels, sampleRate).moments).toEqual([]);
    }, 30000);

    it('takes half the tempo when trap hi-hats double it', () => {
        // onsets every 0.4 s (150 BPM), every other one strong (75 BPM)
        const fps = 86;
        const onset = new Float32Array(fps * 40);
        for (let k = 0; k * 0.4 * fps < onset.length; k++) onset[Math.round(k * 0.4 * fps)] = k % 2 ? 0.7 : 1;
        expect(checkTempoOctave(150, onset, fps, { center: 88 })).toBeCloseTo(75);
        // a genre centred higher keeps it
        expect(checkTempoOctave(150, onset, fps, { center: 140 })).toBe(150);
    });
});

describe('bollywood', () => {
    it('hears rhythms in 3s', () => {
        const waltz = { bars: 40, chords: ['C', 'G', 'Am', 'F'], loud: 0.8, drums: true };
        const three = song(parts([waltz], 3), { beatsPerBar: 3 });
        expect(analyseSong(three.channels, three.sampleRate, { genre: 'bollywood' }).meter).toBe(3);
        const four = song(parts([{ ...waltz, bars: 30 }]));
        expect(analyseSong(four.channels, four.sampleRate, { genre: 'bollywood' }).meter).toBe(4);
    }, 30000);

    it('follows a tempo that speeds up', () => {
        const { channels, sampleRate } = song(parts([{ bars: 44, chords: ['C', 'G'], loud: 0.8, drums: true }]), { bpm: 100, tempoTo: 125 });
        const a = analyseSong(channels, sampleRate, { genre: 'bollywood' });
        expect(a.tempoChanges).toBe(true);
        const gaps = a.beats.slice(1).map((t, i) => t - a.beats[i]);
        const avg = (x) => x.reduce((s, v) => s + v, 0) / x.length;
        expect(avg(gaps.slice(4, 12))).toBeGreaterThan(0.56);  // ~100 BPM at the start (0.6 s)
        expect(avg(gaps.slice(-12, -4))).toBeLessThan(0.51);   // ~125 BPM at the end (0.48 s)
        // EDM holds one tempo
        expect(analyseSong(channels, sampleRate).tempoChanges).toBeUndefined();
    }, 30000);

    it('lights a beatless intro free-flowing, off the beat', () => {
        const { channels, sampleRate } = song(parts([
            { bars: 10, chords: ['Am', 'F'], loud: 0.5, drums: false },
            { bars: 24, chords: ['Am', 'F', 'C', 'G'], loud: 0.85, drums: true },
        ]));
        const a = analyseSong(channels, sampleRate, { genre: 'bollywood' });
        expect(a.sections[0].free).toBe(true);
        expect(Math.abs(a.sections[0].end - 20)).toBeLessThan(4.1);
        const show = programShow(a, { title: 'alaap' });
        const intro = show.cues.find((c) => /free/.test(c.name));
        expect(intro.look.pulseAmount).toBe(0);
    }, 30000);
});

describe('vocals', () => {
    it('rises where someone sings', () => {
        const backing = { bars: 12, chords: ['Am', 'F', 'C', 'G'], loud: 0.8, drums: true };
        const { channels, sampleRate } = song(parts([backing, { ...backing, vocal: true }]));
        const { vocals } = analyseSong(channels, sampleRate, { genre: 'pop' });
        const avg = (x) => x.reduce((s, v) => s + v, 0) / x.length;
        const half = 24 * 2; // 24 s at 2 points per second
        expect(avg(vocals.slice(half + 4, half * 2 - 2))).toBeGreaterThan(avg(vocals.slice(4, half - 2)) + 0.2);
    }, 30000);
});

describe('EDM is unchanged', () => {
    it('is the default, and gives the same structure as asking for EDM', () => {
        const { channels, sampleRate } = song(parts([
            { bars: 8, chords: ['Am'], loud: 0.3, drums: true },
            { bars: 8, chords: ['Am', 'F'], loud: 0.9, drums: true },
        ]));
        const a = analyseSong(channels, sampleRate);
        const b = analyseSong(channels, sampleRate, { genre: 'edm' });
        expect(a.genre).toBe('edm');
        expect(a.sections).toEqual(b.sections);
        expect(a.beats).toEqual(b.beats);
        expect(a.sections.every((s) => s.label === undefined)).toBe(true);
    }, 30000);
});

describe('test set scoring', () => {
    it('matches boundaries within the tolerance, each once', () => {
        expect(boundaryScore([0, 10, 20, 30], [0, 11, 19.5, 50]).f1).toBeCloseTo(2 / 3);
        expect(boundaryScore([10], [9, 11]).precision).toBe(0.5); // one marked boundary can't be matched twice
    });
    it('compares stretches over time', () => {
        expect(overlapScore([{ start: 0, end: 10 }], [{ start: 0, end: 10 }], 20).f1).toBe(1);
        expect(overlapScore([{ start: 0, end: 10 }], [{ start: 5, end: 15 }], 20).f1).toBeCloseTo(0.5);
        expect(overlapScore([], [], 20).f1).toBe(1);
    });
    it('tells a wrong tempo from an octave error', () => {
        expect(tempoScore(90, 91)).toBe('ok');
        expect(tempoScore(90, 180)).toBe('octave');
        expect(tempoScore(90, 120)).toBe('wrong');
    });
});

describe('programming hand-marked songs', () => {
    // a plain 120 BPM song: 64 bars of 2 s
    const beats = Array.from({ length: 64 * 4 }, (_, i) => i * 0.5);
    const base = { bpm: 120, duration: 128, beats, downbeats: beats.map((_, i) => i).filter((i) => i % 4 === 0), energy: [], sections: [] };

    it('takes a hand-marked structure as written', () => {
        const extras = { sections: [{ fromBar: 0, kind: 'intro', free: true }, { fromBar: 8, kind: 'peak' }, { fromBar: 24, kind: 'groove' }, { fromBar: 40, kind: 'build' }, { fromBar: 48, kind: 'peak' }, { fromBar: 60, kind: 'outro' }] };
        const show = programShow(base, { title: 'marked', extras });
        // the groove after a peak isn't turned into a breakdown, the intro is free
        expect(show.sections.map((s) => s.kind)).toEqual(['intro', 'peak', 'groove', 'build', 'peak', 'outro']);
        expect(show.sections[0].free).toBe(true);
        expect(show.cues.some((c) => /free/.test(c.name))).toBe(true);
    });

    it('keeps a build after a peak a build in an automatic structure too', () => {
        const sections = [{ start: 0, end: 16, kind: 'intro' }, { start: 16, end: 48, kind: 'peak' }, { start: 48, end: 64, kind: 'build' }, { start: 64, end: 120, kind: 'peak' }, { start: 120, end: 128, kind: 'outro' }];
        const show = programShow({ ...base, sections }, { title: 'auto' });
        expect(show.sections.find((s) => s.start === 48).kind).toBe('build');
    });

    it('fires at most one burst per 8 bars in a peak, however often the loudness jumps', () => {
        // a jump in loudness every 2 seconds (every bar), as trap kicks make
        const energy = Array.from({ length: 256 }, (_, i) => (i % 4 === 0 ? 0.95 : 0.4));
        const sections = [{ start: 0, end: 8, kind: 'intro' }, { start: 8, end: 120, kind: 'peak' }, { start: 120, end: 128, kind: 'outro' }];
        const show = programShow({ ...base, energy, sections }, { title: 'jumpy' });
        const bursts = show.hits.filter((h) => h.kind === 'burst').map((h) => h.t).sort((a, b) => a - b);
        expect(bursts.length).toBeGreaterThan(0);
        expect(bursts.length).toBeLessThanOrEqual(Math.ceil(112 / 16) + 1);
        for (let i = 1; i < bursts.length; i++) expect(bursts[i] - bursts[i - 1]).toBeGreaterThanOrEqual(16 - 0.01);
    });
});
