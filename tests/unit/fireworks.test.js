import { describe, expect, it } from 'vitest';
import {
    BURN, CANDLES_X, COMETS_X, MINES, RISE, SHELLS, SMOKE, STAGE_PYRO, TRUSS_TOP, TRUSS_Y, TRUSS_Z,
    activeFireworks, defaultGrid, dropVolley, FINALE_OPENINGS, finale, fireOne, fireworkDuration, makeShell, makeStagePyro, rng, shellColours,
} from '@/lib/show/fireworks';
import { ROWS } from '@/components/home/stage/trussGeometry';
import { SHOTS } from '@/lib/show/shots';
import { programShow } from '@/lib/show/program';
import { prepareSongShow, sampleSongShow } from '@/lib/show/timeline';

describe('fireworks: where they go', () => {
    it('the stage numbers match the truss', () => {
        expect(TRUSS_Y).toBe(ROWS[0].y);
        expect(TRUSS_Z).toBe(ROWS[0].z);
    });

    it('shells launch behind the LED wall and burst where the sky shot sees them', () => {
        const random = rng(0.42);
        for (const type of SHELLS) {
            for (let i = 0; i < 20; i++) {
                const s = makeShell(type, random);
                expect(s.z).toBeLessThanOrEqual(-32);          // well behind the LED wall (z -17.2)
                expect(s.z).toBeGreaterThanOrEqual(-42);
                expect(Math.abs(s.x)).toBeLessThanOrEqual(16);
                expect(s.h).toBeGreaterThanOrEqual(40);
                expect(s.h).toBeLessThanOrEqual(50);
                const [cx, cy, cz] = SHOTS.sky.pos;
                const [tx, ty, tz] = SHOTS.sky.target;
                const pitch = Math.atan2(ty - cy, Math.hypot(tx - cx, tz - cz));
                // the burst (up to ~18 m out from its centre) stays inside the sky shot's view...
                const top = Math.atan2(s.h + 18 - cy, cz - s.z);
                expect(top).toBeLessThan(pitch + (55 / 2) * (Math.PI / 180));
                // ...and its centre shows above the top truss, which is much nearer the audience
                const truss = Math.atan2(TRUSS_TOP + 0.5 - cy, cz - TRUSS_Z);
                expect(Math.atan2(s.h - cy, cz - s.z)).toBeGreaterThan(truss);
            }
        }
    });

    it('roof comets and roman candles fire from the top of the truss; mines from the stage-front pyro spots', () => {
        const comets = makeStagePyro('comets', rng(0.2));
        expect(comets.map((c) => c.x)).toEqual(COMETS_X);
        for (const c of comets) expect(c.y).toBeCloseTo(TRUSS_TOP, 6);
        expect(makeStagePyro('candles', rng(0.3))[0].y).toBeCloseTo(TRUSS_TOP, 6);
        expect(CANDLES_X).toHaveLength(6);
        const mines = makeStagePyro('mines', rng(0.4));
        expect(mines.map((m) => m.unit)).toEqual(Array.from({ length: MINES }, (_, i) => i));
    });
});

describe('fireworks: timing and colour', () => {
    it('every kind has a lifetime: shells climb, burn and leave smoke', () => {
        for (const type of SHELLS) expect(fireworkDuration({ type })).toBeCloseTo(RISE + BURN[type] + SMOKE, 6);
        for (const type of STAGE_PYRO) expect(fireworkDuration({ type, len: 5 })).toBeGreaterThan(1);
        // candles and comets on a slower beat take longer
        expect(fireworkDuration({ type: 'candles', len: 0.5 })).toBeGreaterThan(fireworkDuration({ type: 'candles' }));
    });

    it('one desk press fires one shell, or a piece of stage pyro', () => {
        expect(fireOne('palm', rng(0.5))).toHaveLength(1);
        expect(fireOne('mines', rng(0.5)).length).toBe(MINES);
        expect(SHELLS).not.toContain('shape');
        expect(STAGE_PYRO).not.toContain('waterfall');
    });

    it('colours: classic firework colours, the show\'s colours, or both; willows gold, glitter silver', () => {
        const show = ['#123456', '#abcdef'];
        const r = rng(0.6);
        for (let i = 0; i < 10; i++) expect(show).toContain(shellColours('peony', r, { scheme: 'show', show })[0]);
        for (let i = 0; i < 10; i++) expect(show).not.toContain(shellColours('peony', r, { scheme: 'classic', show })[0]);
        expect(shellColours('willow', r)[0]).toBe('#ffb43a');
        expect(shellColours('glitter', r)[0]).toBe('#f4f7ff');
    });

    it('only the launches in the air are shown, each with its age', () => {
        const list = [{ type: 'peony', at: 10 }, { type: 'mines', at: 30 }];
        expect(activeFireworks(list, 9)).toHaveLength(0);
        const live = activeFireworks(list, 11);
        expect(live).toHaveLength(1);
        expect(live[0].age).toBeCloseTo(1, 6);
        expect(activeFireworks(list, 10 + fireworkDuration(list[0]) + 0.1)).toHaveLength(0);
    });

    it('a drop volley: stage pyro only (mines and candles on the drop, roof comet fans on the beats after it)', () => {
        const beats = [0.5, 1.0, 1.5, 2.0, 2.5];
        const v = dropVolley(rng(0.8), {}, beats, { genre: 'pop', beat: 0.5 });
        const onDrop = v.filter((x) => x.at === 0).map((x) => x.launch.type);
        expect(onDrop).toContain('mines');
        expect(onDrop).toContain('candles');
        expect(v.some((x) => SHELLS.includes(x.launch.type))).toBe(false); // the shells are kept for the finale
        const comets = v.filter((x) => x.launch.type === 'comets');
        expect([...new Set(comets.map((x) => x.at))]).toEqual([0.5, 1.5]);
        expect(new Set(comets.map((x) => x.launch.variant)).size).toBe(2); // a V and a W
    });

    it('every genre\'s finale has stage pyro: roman candles, roof comets and mines', () => {
        for (const genre of ['edm', 'pop', 'rap', 'bollywood']) {
            const types = new Set(finale(rng(0.9), {}, { bars: Array.from({ length: 9 }, (_, i) => 10 + i * 2) }, { genre, bpm: 120, energy: new Array(8).fill(0.8) }).map((x) => x.launch.type));
            for (const t of ['candles', 'comets', 'mines', 'chase']) expect(types.has(t)).toBe(true);
        }
    });
});

describe('the finale follows the song', () => {
    // a 120 BPM song: 2 s bars
    const grid = { bars: Array.from({ length: 9 }, (_, i) => 10 + i * 2) };
    const beatTimes = Array.from({ length: 8 * 8 + 1 }, (_, i) => 10 + i * 0.25); // every half-beat
    const shellsOf = (f) => f.filter((x) => SHELLS.includes(x.launch.type));

    it('every shell bursts on the beat (or a half-beat), launched RISE s ahead', () => {
        const f = finale(rng(0.1), {}, grid, { genre: 'edm', bpm: 120 });
        for (const x of shellsOf(f)) {
            const burst = x.at + RISE;
            expect(Math.min(...beatTimes.map((b) => Math.abs(b - burst)))).toBeLessThan(1e-6);
        }
        for (const x of f.filter((y) => !SHELLS.includes(y.launch.type))) expect(Math.min(...beatTimes.map((b) => Math.abs(b - x.at)))).toBeLessThan(1e-6);
    });

    it('some fire together, some in sequence, and the closing volley lands together on the final hit', () => {
        const f = finale(rng(0.2), {}, grid, { genre: 'edm', bpm: 120 });
        const bursts = shellsOf(f).map((x) => Math.round((x.at + RISE) * 1000) / 1000);
        const counts = bursts.reduce((m, t) => m.set(t, (m.get(t) ?? 0) + 1), new Map());
        expect([...counts.values()].some((n) => n === 2)).toBe(true);       // pairs together
        expect([...counts.values()].filter((n) => n === 1).length).toBeGreaterThan(6); // single shells in sequence
        expect(counts.get(grid.bars[8])).toBeGreaterThanOrEqual(5);           // the closing volley
        expect(Math.max(...bursts)).toBeCloseTo(grid.bars[8], 6);             // nothing after the final hit
    });

    it('the genre picks the shells: pop leans on peonies and rings, rap on crossettes and glitter', () => {
        const types = (genre) => shellsOf(finale(rng(0.3), {}, grid, { genre, bpm: 120 })).map((x) => x.launch.type);
        const share = (list, wanted) => list.filter((t) => wanted.includes(t)).length / list.length;
        expect(share(types('pop'), ['peony', 'ring', 'chrysanthemum', 'willow'])).toBeGreaterThan(share(types('rap'), ['peony', 'ring', 'chrysanthemum', 'willow']));
        expect(share(types('rap'), ['crossette', 'glitter'])).toBeGreaterThan(share(types('pop'), ['crossette', 'glitter']));
    });

    it('the song\'s loudness picks each bar\'s pattern: louder bars carry more shells', () => {
        const quietThenLoud = [0.2, 0.25, 0.3, 0.8, 0.9, 1.0, 0.8, 0.9];
        const f = finale(rng(0.4), {}, grid, { genre: 'edm', bpm: 120, energy: quietThenLoud });
        const inBar = (i) => shellsOf(f).filter((x) => x.at + RISE >= grid.bars[i] - 1e-6 && x.at + RISE < grid.bars[i + 1] - 1e-6).length;
        expect(inBar(0)).toBeLessThan(inBar(5));
        expect(inBar(1)).toBeLessThan(inBar(4));
    });

    it('tempo picks the pace: only fast songs rush every half-beat; a harder ending means a bigger closing volley', () => {
        const halfBeats = (bpm) => shellsOf(finale(rng(0.5), {}, grid, { genre: 'pop', bpm, energy: new Array(8).fill(0.95) }))
            .filter((x) => Math.abs(((x.at + RISE - 10) / 0.5) % 1 - 0.5) < 1e-6).length;
        expect(halfBeats(128)).toBeGreaterThan(0);
        expect(halfBeats(80)).toBe(0);
        const closing = (end) => shellsOf(finale(rng(0.6), {}, grid, { genre: 'edm', bpm: 120, energy: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, end] }))
            .filter((x) => Math.abs(x.at + RISE - grid.bars[8]) < 1e-6).length;
        expect(closing(1)).toBeGreaterThan(closing(0.1));
    });

    it('the desk finale runs on a steady 128 BPM grid, starting after its own first launch', () => {
        const f = finale(rng(0.7), {}, defaultGrid(128));
        expect(Math.min(...f.map((x) => x.at))).toBeGreaterThanOrEqual(0);
    });
});

describe('special effects in a song', () => {
    // 64 bars at 120 BPM: intro, build, peak (a drop), groove, peak (the loudest), groove, peak, outro
    const beat = 0.5;
    const beats = Array.from({ length: 96 * 4 }, (_, i) => i * beat);
    const at = (bar) => bar * 4 * beat;
    const analysis = {
        bpm: 120, duration: at(96), beats, downbeats: beats.map((_, i) => i).filter((i) => i % 4 === 0), energy: [],
        sections: [
            { start: 0, end: at(8), kind: 'intro', bars: 8, energy: 0.2 },
            { start: at(8), end: at(16), kind: 'build', bars: 8, energy: 0.5 },
            { start: at(16), end: at(28), kind: 'peak', bars: 12, energy: 0.8 },
            { start: at(28), end: at(40), kind: 'groove', bars: 12, energy: 0.5 },
            { start: at(40), end: at(56), kind: 'peak', bars: 16, energy: 0.95 },
            { start: at(56), end: at(68), kind: 'groove', bars: 12, energy: 0.5 },
            { start: at(68), end: at(88), kind: 'peak', bars: 20, energy: 0.85 },
            { start: at(88), end: at(96), kind: 'outro', bars: 8, energy: 0.2 },
        ],
    };
    const show = programShow(analysis, { extras: { co2: true } });
    const kinds = (k) => show.hits.filter((h) => h.kind === k);

    it('the biggest drop gets confetti and a fireworks volley; the big finish the finale', () => {
        const confetti = kinds('confetti');
        expect(confetti.some((h) => h.t >= at(40) - 0.01 && h.t <= at(43))).toBe(true);
        const fireworks = kinds('firework');
        expect(fireworks.some((h) => h.t >= at(40) - 0.01 && h.t <= at(44))).toBe(true);
        // the finale lands in the last peak's closing bars and ends before the song does
        const late = fireworks.filter((h) => h.t >= at(78) - 0.01);
        expect(late.length).toBeGreaterThan(20);
        expect(Math.max(...late.map((h) => h.t))).toBeLessThan(analysis.duration);
        // its shells burst on the song's beats (or, in the fast rushes, half-beats)
        const grid = beats.flatMap((b) => [b, b + 0.25]);
        for (const h of late.filter((x) => SHELLS.includes(x.fw.type))) {
            const burst = h.t + RISE;
            expect(Math.min(...grid.map((b) => Math.abs(b - burst)))).toBeLessThan(0.002);
        }
    });

    it('the finale\'s closing volley brings confetti, streamers and the truss CO2 in together', () => {
        const closing = kinds('streamers')[0];
        expect(closing).toBeDefined();
        expect(kinds('confetti').some((h) => Math.abs(h.t - closing.t) < 0.01)).toBe(true);
        expect(kinds('co2Truss').some((h) => Math.abs(h.t - closing.t) < 0.01)).toBe(true);
    });

    it('every full CO2 blast on a drop brings the truss CO2 in with it', () => {
        const drops = kinds('co2').filter((h) => h.jets === 'all' && h.dur >= 1.2);
        for (const d of drops) expect(kinds('co2Truss').some((h) => Math.abs(h.t - d.t) < 0.01)).toBe(true);
    });

    it('playback shows them: fireworks in the air, confetti and streamers flying', () => {
        const prepared = prepareSongShow(show);
        const closing = kinds('streamers')[0].t;
        const look = sampleSongShow(prepared, closing + 0.5).look;
        expect(look.fireworks?.length).toBeGreaterThan(0);
        expect(look.confetti).toBeDefined();
        expect(look.streamers).toBeDefined();
        expect(look.co2Truss).toBeDefined();
    });

    it('the playground\'s looping house show has none of it', () => {
        const idle = programShow(analysis, { blackout: false });
        expect(idle.hits.some((h) => ['firework', 'confetti', 'streamers'].includes(h.kind))).toBe(false);
    });
});

describe('fireworks outside the finale stay small', () => {
    const beat = 0.5;
    const beats = Array.from({ length: 120 * 4 }, (_, i) => i * beat);
    const at = (bar) => bar * 4 * beat;
    const sec = (start, bars, kind, energy = 0.5) => ({ start: at(start), end: at(start + bars), kind, bars, energy });
    // a long song with room for every solo: two earlier peaks, the loudest in the middle, a last one at the end
    const show = programShow({
        bpm: 120, duration: 240, beats, downbeats: beats.map((_, i) => i).filter((i) => i % 4 === 0), energy: [],
        sections: [sec(0, 8, 'intro', 0.2), sec(8, 8, 'build', 0.5), sec(16, 12, 'peak', 0.8), sec(28, 20, 'calm', 0.3), sec(48, 16, 'groove'),
            sec(64, 8, 'build'), sec(72, 24, 'peak', 0.95), sec(96, 16, 'groove'), sec(112, 8, 'outro', 0.2)],
    }, { extras: { co2: true } });
    const shells = show.hits.filter((h) => h.kind === 'firework' && SHELLS.includes(h.fw.type));

    it('the fireworks solo is a taste: the candles and at most one shell, of one kind', () => {
        const solo = show.cues.find((c) => c.name === 'Solo · fireworks');
        if (!solo) return; // only songs with a free slot get it
        const inSolo = shells.filter((h) => h.t + RISE >= solo.t - 0.01 && h.t + RISE < solo.t + 4 * 4 * beat);
        expect(inSolo.length).toBeLessThanOrEqual(1);
        expect(show.hits.some((h) => h.kind === 'firework' && h.fw.type === 'candles' && Math.abs(h.t - solo.t) < 0.01)).toBe(true);
    });

    it('an earlier drop lands with the mines and stage pyro leading in, no shells', () => {
        // the drop lands where its CO2 blast fires (an EDM spool lands two bars into the peak)
        const drop = show.hits.find((h) => h.kind === 'co2' && h.jets === 'all' && h.t >= at(16) - 0.01 && h.t <= at(19)).t;
        const near = show.hits.filter((h) => h.kind === 'firework' && h.t > drop - 3 && h.t < drop + 1);
        expect(near.some((h) => SHELLS.includes(h.fw.type))).toBe(false);
        expect(near.filter((h) => h.fw.type === 'mines')).toHaveLength(MINES);
        // stage pyro leading in: the comet chase (every other accent) or the roman candles after a build
        expect(show.hits.some((h) => h.kind === 'firework' && ['candles', 'chase'].includes(h.fw.type) && h.t < drop && h.t > drop - 4)).toBe(true);
    });

    it('accents never crowd the finale: the finale keeps its variety for the end', () => {
        // the finale starts where the confetti pours (5-8 s) and its opening candles and comets fire
        const finaleStart = show.hits.find((h) => h.kind === 'confetti' && h.dur >= 5).t;
        const before = shells.filter((h) => h.t < finaleStart - 1);
        const kindsBefore = new Set(before.map((h) => h.fw.type));
        const kindsInFinale = new Set(shells.filter((h) => h.t >= finaleStart - 1.5).map((h) => h.fw.type));
        expect(kindsInFinale.size).toBeGreaterThan(kindsBefore.size);
    });
});

describe('every song gets every special effect', () => {
    const beat = 0.5;
    const beats = Array.from({ length: 100 * 4 }, (_, i) => i * beat);
    const at = (bar) => bar * 4 * beat;
    const sec = (start, bars, kind, energy = 0.5) => ({ start: at(start), end: at(start + bars), kind, bars, energy });
    const song = (sections) => ({ bpm: 120, duration: at(100), beats, downbeats: beats.map((_, i) => i).filter((i) => i % 4 === 0), energy: [], sections });
    const kindsIn = (show) => new Set(show.hits.map((h) => (h.kind === 'firework' ? (SHELLS.includes(h.fw.type) ? 'shell' : 'pyro') : h.kind)));
    const EVERY = ['co2', 'co2Truss', 'confetti', 'streamers', 'shell', 'pyro'];

    it('a song with peaks', () => {
        const show = programShow(song([sec(0, 8, 'intro', 0.2), sec(8, 8, 'build'), sec(16, 24, 'peak', 0.9), sec(40, 24, 'groove'), sec(64, 24, 'peak', 0.85), sec(88, 12, 'outro', 0.2)]), { extras: { co2: true } });
        for (const k of EVERY) expect(kindsIn(show).has(k)).toBe(true);
    });

    it('a song with no peak at all still gets every effect (its loudest section is the climax)', () => {
        const show = programShow(song([sec(0, 8, 'intro', 0.2), sec(8, 30, 'calm', 0.3), sec(38, 40, 'groove', 0.55), sec(78, 22, 'outro', 0.2)]), { extras: { co2: true } });
        for (const k of EVERY) expect(kindsIn(show).has(k)).toBe(true);
    });

    it('a visitor\'s uploaded song too (the browser programs it with the same options)', () => {
        const show = programShow(song([sec(0, 8, 'intro', 0.2), sec(8, 30, 'groove'), sec(38, 30, 'peak', 0.9), sec(68, 32, 'outro', 0.2)]), { title: 'My song', genre: 'pop', extras: { co2: true } });
        for (const k of EVERY) expect(kindsIn(show).has(k)).toBe(true);
    });

    it('no solo ever lands in the finale', () => {
        const show = programShow(song([sec(0, 8, 'intro', 0.2), sec(8, 8, 'build'), sec(16, 24, 'peak', 0.9), sec(40, 24, 'groove'), sec(64, 24, 'peak', 0.85), sec(88, 12, 'outro', 0.2)]), { extras: { co2: true } });
        // the finale: 8 bars (16 s at 120 BPM) up to its closing hit, where the streamers fire
        const to = show.hits.find((h) => h.kind === 'streamers').t;
        const from = to - 16;
        for (const c of show.cues.filter((x) => /^Solo · [^·]+$/.test(x.name))) expect(c.t < from - 1 || c.t > to).toBe(true);
    });
});

describe('the finale opens with the stage pyro alone', () => {
    it('bars 1 and 2: the roman candles, roof comets and comet chase, no shell bursting over them', () => {
        const bars = Array.from({ length: 9 }, (_, i) => 10 + i * 2);
        for (const genre of ['edm', 'pop', 'rap', 'bollywood']) {
            const v = finale(rng(0.4), {}, { bars }, { genre, bpm: 120, energy: new Array(8).fill(0.9) });
            const inBar1 = v.filter((x) => (SHELLS.includes(x.launch.type) ? x.at + RISE : x.at) < bars[1] - 0.01);
            expect(inBar1.length).toBeGreaterThan(0);
            expect(inBar1.every((x) => ['candles', 'comets', 'chase'].includes(x.launch.type))).toBe(true);
            // bar 2 too: stage pyro only; nothing of it later, where shells would hide it
            const inBar2 = v.filter((x) => { const t = SHELLS.includes(x.launch.type) ? x.at + RISE : x.at; return t >= bars[1] - 0.01 && t < bars[2] - 0.01; });
            expect(inBar2.every((x) => ['candles', 'comets', 'chase'].includes(x.launch.type))).toBe(true);
            expect(v.some((x) => ['candles', 'comets', 'chase'].includes(x.launch.type) && x.at >= bars[2] - 0.01)).toBe(false);
        }
    });
});

describe('each song\'s finale opens its own way', () => {
    const bars = Array.from({ length: 9 }, (_, i) => 10 + i * 2);
    const openingOf = (style) => finale(rng(0.4), {}, { bars }, { genre: 'pop', bpm: 120, energy: new Array(8).fill(0.8), ...style })
        .filter((x) => x.at < bars[2] - 0.01 && !SHELLS.includes(x.launch.type))
        .map((x) => `${x.launch.type}${x.launch.variant ?? ''}@${(x.at - bars[0]).toFixed(2)}`).join(' ');

    it('every opening is different, and each uses the candles, the roof comets and the comet chase', () => {
        const all = Array.from({ length: FINALE_OPENINGS }, (_, opening) => openingOf({ opening }));
        expect(new Set(all).size).toBe(FINALE_OPENINGS);
        for (const o of all) for (const type of ['candles', 'comets', 'chase']) expect(o).toContain(type);
    });

    it('the demo songs open in different ways', () => {
        const kinds = new Set();
        for (const seed of [0.11, 0.27, 0.43, 0.59, 0.75, 0.91]) {
            kinds.add(finale(rng(seed), {}, { bars }, { genre: 'edm', bpm: 128 }).filter((x) => x.at < bars[2] - 0.01).map((x) => `${x.launch.type}@${(x.at - bars[0]).toFixed(2)}`).join(' '));
        }
        expect(kinds.size).toBeGreaterThan(2);
    });
});

describe('the shells are kept for the finale', () => {
    it('in every demo-like song, no shell bursts before the finale starts', () => {
        const beat = 0.5;
        const beats = Array.from({ length: 120 * 4 }, (_, i) => i * beat);
        const at = (bar) => bar * 4 * beat;
        const sec = (start, bars, kind, energy = 0.5) => ({ start: at(start), end: at(start + bars), kind, bars, energy });
        const show = programShow({
            bpm: 120, duration: 240, beats, downbeats: beats.map((_, i) => i).filter((i) => i % 4 === 0), energy: [],
            sections: [sec(0, 8, 'intro', 0.2), sec(8, 8, 'build', 0.5), sec(16, 12, 'peak', 0.8), sec(28, 20, 'calm', 0.3), sec(48, 16, 'groove'),
                sec(64, 8, 'build'), sec(72, 24, 'peak', 0.95), sec(96, 16, 'groove'), sec(112, 8, 'outro', 0.2)],
        }, { extras: { co2: true } });
        const finaleStart = show.hits.find((h) => h.kind === 'confetti' && h.dur >= 5).t;
        const early = show.hits.filter((h) => h.kind === 'firework' && SHELLS.includes(h.fw.type) && h.t + RISE < finaleStart - 0.01);
        expect(early).toEqual([]);
        // but stage pyro does fire through the song
        expect(show.hits.some((h) => h.kind === 'firework' && !SHELLS.includes(h.fw.type) && h.t < finaleStart - 10)).toBe(true);
    });
});
