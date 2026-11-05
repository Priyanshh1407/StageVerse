import { describe, expect, it } from 'vitest';
import {
    BURN, CANDLES_X, COMETS_X, MINES, RISE, SHELLS, SMOKE, STAGE_PYRO, TRUSS_TOP, TRUSS_Y, TRUSS_Z, WATERFALL_X, WATERFALL_Y, WATERFALL_Z,
    activeFireworks, dropVolley, finale, fireOne, fireworkDuration, makeShell, makeStagePyro, rng, shellColours,
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

    it('the waterfall pours from just in front of the top truss, so it falls in front of the hanging lights', () => {
        const w = makeStagePyro('waterfall', rng(0.1));
        expect(w).toHaveLength(WATERFALL_X.length);
        for (const f of w) {
            expect(f.z).toBeCloseTo(WATERFALL_Z, 6);
            expect(f.z).toBeGreaterThan(TRUSS_Z + 0.3 + 0.2); // ahead of the heads hanging under the truss
            expect(f.y).toBeCloseTo(WATERFALL_Y, 6);
            expect(f.y).toBeLessThan(TRUSS_Y);
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
        expect(fireworkDuration({ type: 'waterfall', len: 8 })).toBeGreaterThan(fireworkDuration({ type: 'waterfall', len: 3 }));
    });

    it('one desk press fires one shell, or a piece of stage pyro', () => {
        expect(fireOne('palm', rng(0.5))).toHaveLength(1);
        expect(fireOne('waterfall', rng(0.5)).length).toBe(WATERFALL_X.length);
    });

    it('colours: classic firework colours, the show\'s colours, or both; willows gold, glitter silver', () => {
        const show = ['#123456', '#abcdef'];
        const r = rng(0.6);
        for (let i = 0; i < 10; i++) expect(show).toContain(shellColours('peony', r, { scheme: 'show', show })[0]);
        for (let i = 0; i < 10; i++) expect(show).not.toContain(shellColours('peony', r, { scheme: 'classic', show })[0]);
        expect(shellColours('willow', r)[0]).toBe('#ffb43a');
        expect(shellColours('glitter', r)[0]).toBe('#f4f7ff');
    });

    it('the finale: candles and comets open it, the waterfall pours, shells come faster and faster, a closing volley', () => {
        const f = finale(rng(0.7));
        const delays = f.map((x) => x.delay);
        expect([...delays].sort((a, b) => a - b)).toEqual(delays);
        expect(f[0].launch.type).toBe('candles');
        const types = new Set(f.map((x) => x.launch.type));
        for (const t of ['candles', 'comets', 'waterfall', 'mines', ...SHELLS]) expect(types.has(t)).toBe(true);
        const shellTimes = f.filter((x) => SHELLS.includes(x.launch.type) && x.delay < 6.5).map((x) => x.delay);
        const gaps = shellTimes.slice(1).map((d, i) => d - shellTimes[i]);
        expect(gaps.at(-1)).toBeLessThan(gaps[0]); // the build accelerates
        expect(f.filter((x) => x.delay >= 6.6 && SHELLS.includes(x.launch.type)).length).toBeGreaterThanOrEqual(5);
        expect(Math.max(...delays)).toBeLessThan(8);
    });

    it('only the launches in the air are shown, each with its age', () => {
        const list = [{ type: 'peony', at: 10 }, { type: 'mines', at: 30 }];
        expect(activeFireworks(list, 9)).toHaveLength(0);
        const live = activeFireworks(list, 11);
        expect(live).toHaveLength(1);
        expect(live[0].age).toBeCloseTo(1, 6);
        expect(activeFireworks(list, 10 + fireworkDuration(list[0]) + 0.1)).toHaveLength(0);
    });

    it('a drop volley: mines on the beat, then shells', () => {
        const v = dropVolley(rng(0.8));
        expect(v.filter((x) => x.delay === 0).every((x) => x.launch.type === 'mines')).toBe(true);
        expect(v.some((x) => SHELLS.includes(x.launch.type))).toBe(true);
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
        const late = fireworks.filter((h) => h.t >= at(80) - 0.01);
        expect(late.length).toBeGreaterThan(20);
        expect(Math.max(...late.map((h) => h.t))).toBeLessThan(analysis.duration);
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
