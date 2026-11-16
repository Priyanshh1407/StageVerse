import { describe, expect, it } from 'vitest';
import { EFFECT_TYPES, LIGHT_TYPES, ROLES, STAGES, homeStageFor } from '@/lib/show/stages';

const count = (stage, type) => ({
    beam: stage.heads.filter((h) => h.type === 'beam').length,
    spot: stage.heads.filter((h) => h.type === 'spot').length,
    wash: stage.heads.filter((h) => h.type === 'wash').length,
    strobe: stage.strobes.length,
    blinder: stage.blinders.length,
    ledbar: stage.pixelBars.length,
    laser: stage.lasers.length,
}[type]);

describe.each(Object.values(STAGES))('the $key stage', (stage) => {
    it('has every role the shows drive', () => {
        for (const role of ROLES) expect(stage.heads.filter((h) => h.role === role).length, role).toBeGreaterThan(0);
    });

    it('carries every type of light', () => {
        for (const type of LIGHT_TYPES) expect(count(stage, type), type).toBeGreaterThan(0);
    });

    it('has the effect mounts it claims (fireworks only outdoors)', () => {
        for (const type of ['co2', 'haze']) expect(stage.effects[type].length, type).toBeGreaterThan(0);
        for (const type of ['confetti', 'streamer']) expect(stage.effects[type].length > 0, type).toBe(stage.confetti !== false);
        for (const type of ['pyro', 'shell']) expect(stage.effects[type].length > 0, type).toBe(stage.fireworks);
        expect(Object.keys(stage.effects).sort()).toEqual([...EFFECT_TYPES].sort());
    });

    it('never puts two fixtures in the same place', () => {
        const all = [...stage.heads, ...stage.strobes, ...stage.blinders, ...stage.lasers, ...stage.pixelBars, ...Object.values(stage.effects).flat()];
        const seen = new Map();
        for (const f of all) {
            const key = f.pos.map((v) => Math.round(v * 10)).join(',');
            expect(seen.has(key), `two fixtures at ${f.pos.join(', ')}`).toBe(false);
            seen.set(key, f);
        }
    });

    it('numbers each role 0..n-1 for beat effects', () => {
        for (const role of ROLES) {
            const indices = stage.heads.filter((h) => h.role === role).map((h) => h.index).sort((a, b) => a - b);
            expect(indices).toEqual(indices.map((_, i) => i));
        }
    });

    it('aims every moving head and laser with a unit vector', () => {
        for (const f of [...stage.heads, ...stage.lasers]) expect(Math.hypot(...f.aim)).toBeCloseTo(1, 2);
    });

    it('has every camera shot, all in front of the stage and above the ground', () => {
        if (stage.key === 'warehouse') expect(stage.shots.dj.pos[2]).toBeLessThan(0); // the DJ view (warehouse only) stands on the stage
        else expect(stage.shots.dj).toBeUndefined();
        // the desert keeps its logo sign; the warehouse and the mainstage have only the wordmark on their walls
        if (stage.key === 'desert') expect(stage.logo.size[0]).toBeGreaterThan(stage.logo.size[1]);
        else expect(stage.logo).toBeUndefined();
        for (const name of ['house', 'wide', 'dolly', 'high', 'left', 'right', 'drop', 'finale', 'sky']) {
            const shot = stage.shots[name];
            expect(shot, name).toBeTruthy();
            expect(shot.pos[1]).toBeGreaterThan(0.5);
            expect(shot.pos[2]).toBeGreaterThan(stage.crowd.z0);
        }
    });
});

describe('the festival', () => {
    it('gives every genre a home stage', () => {
        expect(homeStageFor('edm')).toBe('mainstage');
        expect(homeStageFor('pop')).toBe('desert');
        expect(homeStageFor('bollywood')).toBe('desert');
        expect(homeStageFor('rap')).toBe('warehouse');
        expect(homeStageFor('unknown')).toBe('mainstage');
    });

    it('builds the mainstage with the no-truss aerial design', () => {
        expect(STAGES.mainstage.structure.some((p) => p.kind === 'cable')).toBe(false);
        expect(STAGES.mainstage.heads.filter((h) => h.role === 'aerial').length).toBeGreaterThan(40);
    });

    it('keeps the warehouse indoors with no fireworks and no sky shot of its own', () => {
        expect(STAGES.warehouse.indoor).toBe(true);
        expect(STAGES.warehouse.shots.sky).toEqual(STAGES.warehouse.shots.finale);
    });
});

describe('the warehouse club looks', async () => {
    const { clubLook } = await import('@/lib/show/stages/club');
    const base = { intensity: 1, beams: 1, sides: 1, floor: 1, wash: 1, colorA: '#ff0000', colorB: '#0000ff' };

    it('turns a quiet part into a mirror-ball moment and a peak into everything on', () => {
        expect(clubLook({ ...base, crowd: 0.15 }).beams).toBe(0);
        const peak = clubLook({ ...base, crowd: 1, beatPos: 8.02 });
        expect([peak.beams, peak.sides, peak.floor]).toEqual([1, 1, 1]);
        expect(peak.strobe).toBeGreaterThan(0); // the start of a bar
        expect(peak.strobe).toBeLessThan(0.5); // softer than a festival's
        expect(peak.strobeColor).toBe('#ffe7a0');
        expect(clubLook({ ...base, crowd: 1, beatPos: 9.5 }).strobe ?? 0).toBe(0);
    });

    it('scans a groove in one colour and leaves the house lights alone', () => {
        expect(clubLook({ ...base, crowd: 0.4 }).colorB).toBe('#ff0000');
        const house = { ...base, house: 1 };
        expect(clubLook(house)).toBe(house);
    });

    it('keeps every view under the truss grid', () => {
        for (const shot of Object.values(STAGES.warehouse.shots)) expect(shot.pos[1]).toBeLessThan(7);
    });

    it('is a warehouse rule only', () => {
        expect(STAGES.warehouse.club).toBe(true);
        for (const key of ['desert', 'mainstage']) {
            expect(STAGES[key].club, key).toBeFalsy();
            expect(STAGES[key].laserPitch, key).toBeUndefined();
            expect(STAGES[key].orbit, key).toBeUndefined();
            expect(STAGES[key].confetti, key).not.toBe(false);
        }
    });
});

describe('the warehouse song camera', async () => {
    const { orbitShot, orbitLaps } = await import('@/lib/show/stages/orbit');
    const orbit = STAGES.warehouse.orbit;
    const room = STAGES.warehouse.shots;

    it('circles the room one way and ends where it began', () => {
        const start = orbitShot(orbit, 0, 240);
        const end = orbitShot(orbit, 240, 240);
        for (let i = 0; i < 3; i++) expect(end.pos[i]).toBeCloseTo(start.pos[i], 5);
        let last = -1;
        for (let t = 0; t <= 240; t += 1) { const a = orbitShot(orbit, t, 240).angle; expect(a).toBeGreaterThan(last); last = a; }
    });

    it('goes behind the DJ at most twice a song, and only once in a short one', () => {
        const passes = (duration) => {
            let n = 0; let was = false;
            for (let t = 0; t <= duration; t += 0.25) { const behind = orbitShot(orbit, t, duration).pos[2] < -7.5; if (behind && !was) n++; was = behind; }
            return n;
        };
        expect(passes(240)).toBe(2);
        expect(passes(420)).toBe(2);
        expect(passes(100)).toBe(1);
        expect(orbitLaps(orbit, 30)).toBe(1);
    });

    it('moves smoothly, inside the room and under the truss grid, looking at the crowd from behind the DJ', () => {
        let prev = orbitShot(orbit, 0, 240);
        for (let t = 0.5; t <= 240; t += 0.5) {
            const s = orbitShot(orbit, t, 240);
            expect(Math.hypot(...s.pos.map((v, i) => v - prev.pos[i]))).toBeLessThan(1); // under 2 m/s
            expect(Math.hypot(...s.target.map((v, i) => v - prev.target[i]))).toBeLessThan(1.5);
            expect(Math.abs(s.pos[0])).toBeLessThan(18);
            expect(s.pos[2]).toBeGreaterThan(-11);
            expect(s.pos[1]).toBeLessThan(7);
            prev = s;
        }
        const behind = orbitShot(orbit, 60, 240); // half a lap
        expect(behind.pos[2]).toBeLessThan(-8);
        expect(behind.target[2]).toBeGreaterThan(10);
        expect(room.dj).toBeTruthy();
    });
});

describe('the mainstage cues', async () => {
    const { MAINSTAGE_CUES, planMainstageCues, mainstageTestCues } = await import('@/lib/show/stages/mainstageCues');
    const names = ['Colours', 'Intro 1', 'Calm 2', 'Groove 3', 'Groove 3 · phrase 2', 'Build 4', 'Build 4 · phrase 2', 'Build 4 · phrase 3', 'Peak 5', 'Peak 5 · lasers', 'Peak 5 · all in',
        'Peak 5 · phrase 2', 'Solo · floor', 'Breakdown 6', 'Peak 7', 'Peak 7 · lasers', 'Peak 7 · all in', 'Peak 7 · hook', 'Peak 7 · phrase 3', 'Outro 8'];
    const plan = planMainstageCues(names.map((name) => ({ name })));

    it('adds at least 11 cues with names of their own, for the mainstage alone', () => {
        expect(MAINSTAGE_CUES.length).toBeGreaterThanOrEqual(11);
        expect(new Set(MAINSTAGE_CUES.map((c) => c.kind)).size).toBe(MAINSTAGE_CUES.length);
        expect(STAGES.mainstage.cuePlan).toBe(planMainstageCues);
        for (const key of ['desert', 'warehouse']) expect(STAGES[key].cuePlan, key).toBeUndefined();
    });

    it('swaps them in where they fit and leaves the landings, solos and named moments alone', () => {
        const kindAt = (name) => plan[names.indexOf(name)]?.kind ?? null;
        for (const kept of ['Colours', 'Intro 1', 'Groove 3', 'Peak 5', 'Peak 7', 'Solo · floor', 'Peak 7 · hook', 'Outro 8', 'Peak 7 · lasers', 'Peak 5 · all in']) expect(kindAt(kept), kept).toBeNull();
        expect(kindAt('Calm 2')).toBe('Mainstage · silhouette');
        expect(kindAt('Build 4')).toBe('Mainstage · sunrise');
        expect(kindAt('Build 4 · phrase 3')).toBe('Mainstage · the pyramid');
        expect(kindAt('Breakdown 6')).toBe('Mainstage · lone sweeper');
        expect(kindAt('Peak 5 · lasers')).toBe('Mainstage · laser cathedral');
        for (const peak of ['Peak 5 · phrase 2', 'Peak 7 · all in', 'Peak 7 · phrase 3']) expect(plan[names.indexOf(peak)].fits, peak).toBe('peak');
        expect(plan[names.indexOf('Groove 3 · phrase 2')].fits).toBe('groove');
        expect(new Set(['Peak 5 · phrase 2', 'Peak 7 · all in', 'Peak 7 · phrase 3'].map(kindAt)).size).toBe(3); // no repeats in a row
    });

    it('gives the cue tester a complete look for each', () => {
        const tested = mainstageTestCues([{ kind: 'Peak · all in', look: { intensity: 1.3, colorA: '#ff0000' } }]);
        expect(tested).toHaveLength(MAINSTAGE_CUES.length);
        expect(tested[0].look.colorA).toBe('#ff0000');
    });
});

describe('the mainstage changes', async () => {
    const { fitShot } = await import('@/lib/show/stages');
    const { stageMounts } = await import('@/lib/show/stages/rig');

    it('frames the whole stage and its PA in any window', () => {
        const frame = STAGES.mainstage.frame;
        for (const aspect of [1.2, 1.78, 4.7]) {
            const view = fitShot(STAGES.mainstage.shots.wide, frame, aspect, 55);
            const dist = Math.hypot(...view.pos.map((v, i) => v - frame.centre[i]));
            const tan = Math.tan((55 * Math.PI) / 360);
            expect(dist * tan).toBeGreaterThanOrEqual(frame.half[1]);
            expect(dist * tan * aspect).toBeGreaterThanOrEqual(frame.half[0]);
        }
        expect(frame.half[0]).toBeGreaterThan(48); // the PA (47.6) inside
    });

    it('points every wash at the stage and the floor row out at the crowd', () => {
        const st = STAGES.mainstage;
        for (const w of st.heads.filter((h) => h.type === 'wash')) expect(w.aim[1], `wash at ${w.pos}`).toBeLessThan(0.15); // level or down onto the stage, never into the sky
        for (const f of st.heads.filter((h) => h.role === 'floor')) expect(f.aim[2]).toBeGreaterThan(0.3);
    });

    it('fires every confetti cannon and streamer launcher, and has more CO2', () => {
        const m = stageMounts(STAGES.mainstage);
        expect(m.moreCannons.length).toBeGreaterThanOrEqual(1);
        expect(m.moreLaunchers.length).toBeGreaterThanOrEqual(1);
        expect(STAGES.mainstage.co2Extra.length).toBeGreaterThanOrEqual(5);
        // every cannon its own: no two sets share one, and every one fires
        const cannons = [m.cannons, ...m.moreCannons].flat().map((c) => c.base[0]);
        expect(new Set(cannons).size).toBe(cannons.length);
        expect(cannons.length).toBe(STAGES.mainstage.effects.confetti.length);
        const launchers = [m.launchers, ...m.moreLaunchers].flat().map((l) => l.base[0]);
        expect(new Set(launchers).size).toBe(launchers.length);
        expect(launchers.length).toBe(6); // two sets of three: twelve at once were too many
        expect(Math.min(...launchers)).toBeLessThan(-10); // still spread across the stage
        expect(Math.max(...launchers)).toBeGreaterThan(10);
    });

    it('changes nothing on the other stages', () => {
        for (const key of ['desert', 'warehouse']) {
            const st = STAGES[key];
            for (const k of ['frame', 'headTune', 'laserStrength', 'moreEffects']) expect(st[k], `${key}.${k}`).toBeUndefined();
            expect(stageMounts(st).moreCannons).toEqual([]);
        }
    });
});

describe('the mainstage screen visuals', async () => {
    const { mainstageVisualFor, MAINSTAGE_VISUALS } = await import('@/components/home/stage/festival/mainstageVisuals');
    const name = (look) => MAINSTAGE_VISUALS[mainstageVisualFor(look).index];

    it('picks visuals by the part of the song and changes them on the beat', () => {
        expect(['starfield', 'plasma']).toContain(name({ crowd: 0.12, beatPos: 4 }));
        expect(['plasma', 'kaleido']).toContain(name({ crowd: 0.15, beatPos: 4 }));
        expect(['chevrons', 'warp']).toContain(name({ crowd: 0.5, beatPos: 4 }));
        const peaks = new Set([0, 16, 32, 48, 64].map((beatPos) => name({ crowd: 1, beatPos })));
        expect(peaks.size).toBeGreaterThanOrEqual(4);
        expect(name({ crowd: 1, beatPos: 3, dropFx: 1 })).toBe('glitch');
        expect(name({ crowd: 1, screenVisual: 'horizon' })).toBe('horizon');
    });

    it('is the mainstage\'s alone', () => {
        expect(STAGES.mainstage.visuals).toBeTruthy();
        for (const key of ['desert', 'warehouse']) expect(STAGES[key].visuals, key).toBeUndefined();
    });
});

describe('the mainstage strobes on the subs', () => {
    it('stand on the sub stacks, none in front of a strobe on the deck lip or of each other', () => {
        const strobes = STAGES.mainstage.strobes;
        const onSubs = strobes.filter((s) => s.pos[2] > 0);
        const lip = strobes.filter((s) => Math.abs(s.pos[2] + 0.5) < 0.01);
        expect(onSubs.length).toBe(12);
        for (const s of onSubs) {
            for (const l of lip) expect(Math.abs(s.pos[0] - l.pos[0]), `${s.pos[0]} vs ${l.pos[0]}`).toBeGreaterThanOrEqual(2.2);
            expect(Math.abs((s.pos[0] / 2.4) % 1)).toBeCloseTo(0.5, 5); // centred on a stack
        }
        const xs = onSubs.map((s) => s.pos[0]).sort((a, b) => a - b);
        for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThan(1.6);
    });

    it('adds two roof CO2 nozzles and the finale twins on the mainstage alone', () => {
        expect(STAGES.mainstage.co2TrussExtra).toHaveLength(2);
        expect(STAGES.mainstage.finaleEcho).toBe(true);
        for (const key of ['desert', 'warehouse']) {
            expect(STAGES[key].co2TrussExtra, key).toBeUndefined();
            expect(STAGES[key].finaleEcho, key).toBeUndefined();
        }
    });
});

describe('the festival colours', async () => {
    const { festivalColours, FESTIVAL_PALETTES } = await import('@/lib/show/stages/palettes');
    const { PALETTES } = await import('@/lib/show/program');
    const cue = (name, a, b) => ({ name, t: 0, look: { colorA: a, colorB: b, washColor: a }, from: { colorA: a, colorB: b } });
    const [p1, p2, p3] = PALETTES.peak;

    it('takes every second change of the programme colours from the new pairs, and keeps a song\'s own colours', () => {
        const sheet = { cues: [cue('Peak 1', ...p1), cue('Peak 1 · lasers', ...p1), cue('Peak 2', ...p2), cue('Groove 3', '#ffd400', '#ffaa00'), cue('Peak 4', ...p3)] };
        const out = festivalColours(sheet, 0).cues;
        expect([out[0].look.colorA, out[0].look.colorB]).toEqual(p1);
        const fresh = FESTIVAL_PALETTES.peak.map(([a, b]) => `${a}|${b}`);
        expect(fresh).toContain(`${out[2].look.colorA}|${out[2].look.colorB}`);
        expect(out[2].look.washColor).toBe(out[2].look.colorA); // the wash swapped with it
        expect([out[3].look.colorA, out[3].look.colorB]).toEqual(['#ffd400', '#ffaa00']); // a song's own colours stay
        expect(sheet.cues[2].look.colorA).toBe(p2[0]); // the show itself is not changed
    });

    it('adds at least 20 new pairs', () => {
        expect(Object.values(FESTIVAL_PALETTES).flat().length).toBeGreaterThanOrEqual(20);
    });
});

describe('the mainstage cues in the songs', () => {
    it('plays every one of them somewhere in the demo songs', async () => {
        const fs = await import('node:fs');
        const { prepareSongShow } = await import('@/lib/show/timeline');
        const { planMainstageCues, MAINSTAGE_CUES } = await import('@/lib/show/stages/mainstageCues');
        const index = JSON.parse(fs.readFileSync('public/shows/index.json', 'utf8'));
        const used = new Set();
        for (const d of index.demos) {
            const show = prepareSongShow(JSON.parse(fs.readFileSync(`public${d.show}`, 'utf8')));
            for (const c of planMainstageCues(show.sheet.cues)) if (c) used.add(c.kind);
        }
        for (const c of MAINSTAGE_CUES) expect(used.has(c.kind), c.kind).toBe(true);
    });
});
