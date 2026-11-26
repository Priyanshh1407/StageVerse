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
        // no logo signs: every stage has only the wordmark on its wall
        expect(stage.logo).toBeUndefined();
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

    it('keeps every view under the truss grid (and the LED sky under it)', () => {
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
            expect(Math.abs(s.pos[0])).toBeLessThan(STAGES.warehouse.meta?.room?.width / 2 - 1 || 21);
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
    const { MAINSTAGE_CUES, planMainstageCues, planDesertCues, mainstageTestCues, withCircle } = await import('@/lib/show/stages/mainstageCues');
    const names = ['Colours', 'Intro 1', 'Calm 2', 'Groove 3', 'Groove 3 · phrase 2', 'Build 4', 'Build 4 · phrase 2', 'Build 4 · phrase 3', 'Peak 5', 'Peak 5 · lasers', 'Peak 5 · all in',
        'Peak 5 · phrase 2', 'Solo · floor', 'Breakdown 6', 'Peak 7', 'Peak 7 · lasers', 'Peak 7 · all in', 'Peak 7 · hook', 'Peak 7 · phrase 3', 'Outro 8'];
    // (the song has its own circle on Peak 7 · all in)
    const cues = names.map((name, i) => ({ name, t: i * 10, look: name === 'Peak 7 · all in' ? { circle: 1 } : {} }));
    const plan = planMainstageCues(cues);
    const kindAt = (name) => plan[names.indexOf(name)]?.kind ?? null;

    it('adds at least 11 cues with names of their own; the desert only adds the circle; the warehouse nothing', () => {
        expect(MAINSTAGE_CUES.length).toBeGreaterThanOrEqual(11);
        expect(new Set(MAINSTAGE_CUES.map((c) => c.kind)).size).toBe(MAINSTAGE_CUES.length);
        expect(STAGES.mainstage.cuePlan).toBe(planMainstageCues);
        expect(STAGES.desert.cuePlan).toBe(planDesertCues);
        expect(STAGES.warehouse.cuePlan).toBeUndefined();
    });

    it('plays them often: every groove, build, all-in, hook and laser moment; the landings, solos, outro and circle stay', () => {
        for (const kept of ['Colours', 'Intro 1', 'Solo · floor', 'Outro 8', 'Peak 7 · all in']) expect(kindAt(kept), kept).toBeNull();
        // a landing takes a peak cue only while one has not played yet in the song
        expect(plan[names.indexOf('Peak 5')]?.fits).toBe('peak');
        expect(kindAt('Calm 2')).toBe('Mainstage · silhouette');
        // builds: their first and third phrase, sunrise and the pyramid in turn (the second keeps the song's own look)
        expect(new Set([kindAt('Build 4'), kindAt('Build 4 · phrase 3')])).toEqual(new Set(['Mainstage · sunrise', 'Mainstage · the pyramid']));
        // (the second keeps the song's own look, unless it is the free slot the song's one beam wipe takes)
        expect([null, 'Beam wipe']).toContain(kindAt('Build 4 · phrase 2'));
        expect(kindAt('Breakdown 6')).toBe('Mainstage · lone sweeper');
        expect(kindAt('Peak 5 · lasers')).toBe('Mainstage · laser cathedral');
        expect(kindAt('Peak 7 · lasers')).toBe('Mainstage · laser cathedral');
        for (const peak of ['Peak 5 · all in', 'Peak 5 · phrase 2', 'Peak 7 · hook', 'Peak 7 · phrase 3']) expect(plan[names.indexOf(peak)].fits, peak).toBe('peak');
        // (a groove phrase is the mainstage's own groove cue, or the song's one side-tower cue when it has no free slot for it)
        for (const groove of ['Groove 3', 'Groove 3 · phrase 2']) {
            const c = plan[names.indexOf(groove)];
            expect(c.fits === 'groove' || /^(Beam wipe|Side towers · )/.test(c.kind), groove).toBe(true);
        }
        expect(plan.filter(Boolean).length).toBeGreaterThan(names.length / 2);
    });

    it('gives a song without a circle one at its biggest peak, on the mainstage and the desert', () => {
        const without = cues.map((c) => ({ ...c, look: {} }));
        for (const p of [planMainstageCues(without), planDesertCues(without)]) {
            const circles = p.map((c, i) => (c?.look?.circle ? names[i] : null)).filter(Boolean);
            expect(circles).toHaveLength(1);
            expect(circles[0]).toMatch(/^Peak \d+ · all in$/);
        }
        expect(withCircle(cues).every((c) => c === null)).toBe(true); // it has one: nothing added
    });

    it('plays every cue it can before any repeats, in any song (a demo or an upload)', () => {
        // a song with many peaks and grooves: every peak and groove cue plays, and the landings stay once they all have
        const song = [];
        for (let p = 1; p <= 6; p++) for (const n of [`Peak ${p}`, `Peak ${p} · all in`, `Peak ${p} · phrase 2`, `Groove ${p}`, `Groove ${p} · phrase 2`]) song.push({ name: n, t: song.length * 8, look: {} });
        const own = planMainstageCues(song);
        const played = new Set(own.filter(Boolean).map((c) => c.kind));
        for (const c of MAINSTAGE_CUES.filter((m) => m.fits === 'peak' || m.fits === 'groove')) expect(played.has(c.kind), c.kind).toBe(true);
        expect(own[song.findIndex((c) => c.name === 'Peak 6')]).toBeNull();
    });

    it('keeps the movement of a cue to the tempo of the song', async () => {
        const { withOwn } = await import('@/lib/show/stages/mainstageCues');
        const scissors = MAINSTAGE_CUES.find((c) => c.kind === 'Mainstage · scissors');
        const slow = withOwn({ speed: 0.4 }, scissors).speed;
        const fast = withOwn({ speed: 0.8 }, scissors).speed;
        expect(fast).toBeCloseTo(slow * 2, 6); // a song twice as fast moves the cue twice as fast
        expect(withOwn({ speed: 0.5, colorA: '#ff0000' }, null)).toEqual({ speed: 0.5, colorA: '#ff0000' });
    });

    it('gives the cue tester a complete look for each', () => {
        const tested = mainstageTestCues([{ kind: 'Peak · all in', look: { intensity: 1.3, colorA: '#ff0000' } }]);
        expect(tested).toHaveLength(MAINSTAGE_CUES.length + 8); // its own, then the 4 beam wipes and 4 side-tower cues
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

    it('changes nothing on the other stages (the desert has more confetti and CO2 of its own, below)', () => {
        expect(STAGES.warehouse.frame).toBeUndefined();
        // (the warehouse's own realism pass: thinner beams, stronger lasers)
        expect(STAGES.warehouse.headTune.aerial.spread).toBeLessThan(1);
        expect(STAGES.warehouse.laserStrength.boost).toBeGreaterThan(1);
        expect(STAGES.desert.frame).toBeUndefined();
        expect(STAGES.warehouse.moreEffects).toBeUndefined();
        expect(stageMounts(STAGES.warehouse).moreCannons).toEqual([]);
    });

    it('gives the desert more confetti cannons and CO2 nozzles, its streamers unchanged', () => {
        const m = stageMounts(STAGES.desert);
        const cannons = [...m.cannons, ...m.moreCannons.flat()];
        expect(cannons).toHaveLength(8); // two sets of four, every one its own
        expect(new Set(cannons.map((c) => c.base[0])).size).toBe(8);
        expect(m.moreLaunchers).toEqual([]); // still one set of three streamers
        expect(m.launchers).toHaveLength(3);
        expect(STAGES.desert.co2Extra.length).toBeGreaterThanOrEqual(7);
        expect(STAGES.desert.co2TrussExtra).toHaveLength(2);
        for (const n of STAGES.desert.co2Extra) expect(n.follow).toBeLessThan(6); // each fires with a floor jet
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

    it('plays on every festival stage: the mainstage and the warehouse the mainstage set, the desert its own', () => {
        expect(STAGES.mainstage.visuals.set).toBe('mainstage');
        expect(STAGES.desert.visuals.set).toBe('desert');
        expect(STAGES.desert.visuals.titles).toBe(true);
        expect(STAGES.warehouse.visuals.set).toBe('mainstage');
    });

    it('picks by stage and genre, any song (an upload too) getting the set of its genre', async () => {
        const { visualFor } = await import('@/components/home/stage/festival/mainstageVisuals');
        const on = (set, look) => MAINSTAGE_VISUALS[visualFor(look, set).index];
        const desertOnly = new Set(['sunset', 'palms', 'paint', 'mandala', 'rays', 'livefeed']);
        // every visual a set can pick exists, and over a song's beats the desert plays desert visuals
        const peaks = (set, genre) => new Set(Array.from({ length: 12 }, (_, i) => on(set, { crowd: 1, beatPos: i * 16, songGenre: genre })));
        expect([...peaks('desert', 'bollywood')]).toContain('mandala');
        expect([...peaks('desert', 'pop')].some((v) => desertOnly.has(v))).toBe(true);
        expect([...peaks('mainstage', 'edm')]).toContain('fire');
        expect([...peaks('mainstage', 'bollywood')]).toContain('mandala');
        // a genre with no set of its own (or none at all, an upload before analysis) falls back: pop on the desert, EDM on the mainstage
        expect(on('desert', { crowd: 1, beatPos: 0, songGenre: 'rap' })).toBe(on('desert', { crowd: 1, beatPos: 0, songGenre: 'pop' }));
        expect(on('mainstage', { crowd: 1, beatPos: 0 })).toBe(on('mainstage', { crowd: 1, beatPos: 0, songGenre: 'edm' }));
        // the drop: the glitch on the mainstage, the paint wash on the desert
        expect(on('desert', { crowd: 1, beatPos: 0, dropFx: 1 })).toBe('paint');
        expect(on('mainstage', { crowd: 1, beatPos: 0, dropFx: 1 })).toBe('glitch');
    });
});

describe('the mainstage strobes on the subs', () => {
    it('stand in one line on top of the sub stacks, centred on a stack, evenly spaced and mirrored, none left on the deck lip', () => {
        const strobes = STAGES.mainstage.strobes;
        const front = strobes.filter((s) => s.pos[2] > -1);
        const onSubs = front.filter((s) => s.pos[2] > 0);
        expect(front).toEqual(onSubs); // none on the deck lip behind the subs
        expect(onSubs.length).toBe(16);
        expect(new Set(onSubs.map((s) => s.pos[1])).size).toBe(1); // one height
        expect(new Set(onSubs.map((s) => s.pos[2])).size).toBe(1); // one line
        for (const s of onSubs) expect(Math.abs((s.pos[0] / 2.4) % 1)).toBeCloseTo(0.5, 5); // centred on a stack
        const xs = onSubs.map((s) => s.pos[0]).sort((a, b) => a - b);
        for (let i = 1; i < xs.length; i++) if (i !== 8) expect(xs[i] - xs[i - 1]).toBeCloseTo(4.8, 5);
        xs.forEach((x, i) => expect(x).toBeCloseTo(-xs[xs.length - 1 - i], 5)); // matched left and right
    });

    it('adds two roof CO2 nozzles on the mainstage (and the desert), the finale twins on the mainstage alone', () => {
        expect(STAGES.mainstage.co2TrussExtra).toHaveLength(2);
        expect(STAGES.mainstage.finaleEcho).toBe(true);
        expect(STAGES.warehouse.co2TrussExtra).toBeUndefined();
        for (const key of ['desert', 'warehouse']) expect(STAGES[key].finaleEcho, key).toBeUndefined();
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

describe('the mainstage streamers', () => {
    it('fire at most twice a song: the first moment and the finale', async () => {
        const { limitStreamers } = await import('@/lib/show/stages/rig');
        const hits = [10, 80, 150, 220].flatMap((t) => [{ t, kind: 'streamers' }, { t, kind: 'confetti' }]);
        const out = limitStreamers(hits, STAGES.mainstage.maxStreamers);
        expect(out.filter((h) => h.kind === 'streamers').map((h) => h.t)).toEqual([10, 220]);
        expect(out.filter((h) => h.kind === 'confetti')).toHaveLength(4);
        expect(limitStreamers(hits, STAGES.desert.maxStreamers)).toBe(hits); // the other stages keep theirs
    });
});

describe('the festival ground', async () => {
    const { FESTIVAL, walkAt, groundShot, toGround } = await import('@/lib/show/stages/festival');
    const a = { pos: [-200, 4, 0], target: [-240, 9, 0] };
    const b = { pos: [0, 5, -170], target: [0, 15, -250] };

    it('gives each kind of user a stage of their own, laid out like a festival site', async () => {
        const { GROUNDS } = await import('@/lib/show/stages/festival');
        // the live stage first (the homepage walks in through it), then the other three
        expect(FESTIVAL.map((s) => `${s.persona}:${s.stage}`)).toEqual(['Crew:live', 'Organizer:warehouse', 'Fan:desert', 'Artist:mainstage']);
        const by = Object.fromEntries(FESTIVAL.map((s) => [s.key, s]));
        // the mainstage across the far end of the avenue, facing back down it toward the gate
        expect(by.artist.position[0]).toBe(0);
        expect(by.artist.turn).toBe(0);
        expect(GROUNDS.gate[1]).toBeGreaterThan(200);
        for (const s of FESTIVAL) if (s.key !== 'artist') expect(s.position[2]).toBeGreaterThan(by.artist.position[2] + 100);
        // stages on both sides of the avenue, each turned toward it, none of them in a cross
        expect(by.fan.position[0]).toBeLessThan(-100);
        expect(by.crew.position[0]).toBeGreaterThan(100);
        // the live stage is the nearest to the gate
        const toGate = (s) => Math.hypot(s.position[0] - GROUNDS.gate[0], s.position[2] - GROUNDS.gate[1]);
        for (const s of FESTIVAL) if (s.key !== 'crew') expect(toGate(by.crew)).toBeLessThan(toGate(s));
        for (const s of FESTIVAL) {
            const front = toGround(s, [0, 0, 50]); // 50 m in front of the stage
            expect(Math.abs(front[0]), s.key).toBeLessThanOrEqual(Math.abs(s.position[0])); // toward the avenue
        }
        expect(new Set(FESTIVAL.map((s) => Math.round(s.turn * 100))).size).toBe(4);
        // no two stages close enough to overlap
        for (const p of FESTIVAL) for (const q of FESTIVAL) if (p !== q) expect(Math.hypot(p.position[0] - q.position[0], p.position[2] - q.position[2])).toBeGreaterThan(150);
        expect(groundShot(by.artist, { pos: [0, 2, 60], target: [0, 9, 0] }).pos).toEqual([0, 2, -240]);
    });

    it('backs away, turns to the next stage, then moves forward to it, at eye level and smoothly', () => {
        const start = walkAt(a, b, 0);
        const end = walkAt(a, b, 1);
        for (let i = 0; i < 3; i++) { expect(start.pos[i]).toBeCloseTo(a.pos[i], 5); expect(end.pos[i]).toBeCloseTo(b.pos[i], 5); expect(end.target[i]).toBeCloseTo(b.target[i], 5); }
        // 1: further from the old stage, still looking at it
        const backed = walkAt(a, b, 0.28);
        expect(backed.step).toBe('back');
        expect(backed.pos[0] - a.pos[0]).toBeCloseTo(45, 3);
        expect(backed.target).toEqual(a.target);
        // 2: standing still while the gaze swings round
        const turning = walkAt(a, b, 0.4);
        expect(turning.step).toBe('turn');
        expect(turning.pos).toEqual(backed.pos);
        // 3: on the way, looking at the new stage
        expect(walkAt(a, b, 0.7).step).toBe('forward');
        expect(walkAt(a, b, 0.7).target).toEqual(b.target);
        let prev = start;
        const steps = [];
        for (let t = 0.005; t <= 1.0001; t += 0.005) {
            const now = walkAt(a, b, t);
            expect(Math.hypot(...now.pos.map((v, k) => v - prev.pos[k]))).toBeLessThan(6); // no jumps
            expect(Math.hypot(...now.target.map((v, k) => v - prev.target[k]))).toBeLessThan(30); // the gaze swings, never snaps
            expect(Math.min(now.leaving, now.arriving)).toBeLessThan(0.001); // never both lit
            expect(now.pos[1]).toBeLessThan(6); // eye level: no flying
            if (steps.at(-1) !== now.step) steps.push(now.step);
            prev = now;
        }
        expect(steps).toEqual(['back', 'turn', 'forward']);
        expect(start.leaving).toBeCloseTo(1, 6);
        expect(end.arriving).toBeCloseTo(1, 6);
    });
});

describe('the floor row', () => {
    it('is never thinned: every floor beam is drawn, however few lights the page draws', async () => {
        const { rigHeads } = await import('@/lib/show/stages/rig');
        for (const stage of Object.values(STAGES)) {
            const all = stage.heads.filter((h) => h.role === 'floor' && h.type !== 'spot').length;
            for (const n of [64, 96, 160]) expect(rigHeads(stage, n).filter((h) => h.role === 'floor').length, `${stage.key} at ${n}`).toBe(all);
        }
        // the mainstage's beam in front of its right fins, at 14.8 m, is there
        const xs = rigHeads(STAGES.mainstage, 160).filter((h) => h.role === 'floor').map((h) => Math.round(h.position[0] * 10) / 10);
        expect(xs).toContain(14.8);
    });
});

describe('the audience and artist views', () => {
    it('are on every stage: eye level in the crowd, and from the stage out over it', async () => {
        const { stageCamera } = await import('@/lib/show/stages/camera');
        for (const stage of Object.values(STAGES)) {
            const { audience, artist } = stage.shots;
            expect(audience.pos[1], stage.key).toBeCloseTo(1.7, 5);
            expect(audience.pos[2], stage.key).toBeGreaterThan(stage.crowd.z0);
            expect(artist.pos[2], stage.key).toBeLessThan(0); // on the stage
            expect(artist.target[2], stage.key).toBeGreaterThan(artist.pos[2]); // looking out at the crowd
            // a held view holds, whatever the show calls (fireworks, the circling camera, the framing)
            const held = stageCamera(stage, { look: { fireworks: [{ type: 'peony' }] }, shot: 'drop', t: 30, duration: 200, view: 'artist' });
            expect(held.pos).toEqual(artist.pos);
        }
    });

    it('put the artist camera in front of the performers or above their heads on every stage, so no figure stands in it', () => {
        // the performer set's frontmost point (the singer's mic stand, 2.8 m in front of the homepage's riser line) and
        // the top of their heads (3.6 m up in the set), placed and scaled as FestivalScene places them
        for (const stage of Object.values(STAGES)) {
            const ps = stage.performerScale ?? 1;
            const front = stage.performerAt[2] + ps * -2.8;
            const heads = stage.performerAt[1] + 1.8 - 1.8 * ps + ps * 3.6;
            const [, y, z] = stage.shots.artist.pos;
            expect(z > front || y > heads, `${stage.key}: camera at height ${y}, ${z}`).toBe(true);
        }
    });

    it('keep the whole stage in the audience view, at eye level, on every stage and screen shape', async () => {
        const { stageCamera } = await import('@/lib/show/stages/camera');
        const tan = Math.tan((55 * Math.PI) / 360);
        // (the mainstage keeps its own audience view, in the crowd close to the stage)
        for (const stage of Object.values(STAGES).filter((s) => s.audienceFrame)) {
            for (const aspect of [1.33, 1.78, 2.4]) {
                const cam = stageCamera(stage, { look: {}, shot: 'wide', aspect, view: 'audience' });
                const { centre, half } = stage.audienceFrame;
                const d = cam.pos[2] - centre[2];
                expect(cam.pos[1], stage.key).toBeCloseTo(1.7, 5);
                expect(half[0], `${stage.key} ${aspect}`).toBeLessThanOrEqual(d * tan * aspect); // side to side
                expect(half[1], `${stage.key} ${aspect}`).toBeLessThanOrEqual(d * tan); // top to bottom
            }
        }
    });

    it('film the mainstage like the live stage: close song shots at head height, the whole stage only in the wide ones', async () => {
        const { stageCamera } = await import('@/lib/show/stages/camera');
        const ms = STAGES.mainstage;
        for (const shot of ['dolly', 'drop', 'left', 'right']) {
            const cam = stageCamera(ms, { look: {}, shot, aspect: 1.78 });
            expect(cam.pos, shot).toEqual(ms.shots[shot].pos); // not fitted to the whole stage
            expect(cam.pos[1], shot).toBeLessThan(3); // head height
            expect(cam.pos[2], shot).toBeGreaterThan(ms.crowd.z1); // just behind the crowd
        }
        const wide = stageCamera(ms, { look: {}, shot: 'wide', aspect: 1.78 });
        expect(wide.target).toEqual(ms.frame.centre); // fitted
        // the tower lasers alone: the side laser shot, left and right in turn
        const lasers = { laser: 1, laserFloor: 0, laserTower: 1 };
        expect(stageCamera(ms, { look: lasers, shot: 'dolly', t: 2, duration: 200 }).pos).toEqual(ms.shots.laserLeft.pos);
        expect(stageCamera(ms, { look: lasers, shot: 'dolly', t: 18, duration: 200 }).pos).toEqual(ms.shots.laserRight.pos);
        // not with the floor lasers on, and never on the other stages
        expect(stageCamera(ms, { look: { ...lasers, laserFloor: 1 }, shot: 'dolly', t: 2, duration: 200 }).pos).toEqual(ms.shots.dolly.pos);
        expect(STAGES.desert.laserShots).toBeUndefined();
    });

    it('glide calmly between shots on the mainstage and in the warehouse only (a speed limit), the desert unchanged', async () => {
        const { stageCamera } = await import('@/lib/show/stages/camera');
        expect(stageCamera(STAGES.mainstage, { look: {}, shot: 'dolly' })).toMatchObject({ ease: 1.8 * 1.7, maxSpeed: 9 });
        expect(stageCamera(STAGES.warehouse, { look: {}, shot: 'wide', t: 10, duration: 200 }).maxSpeed).toBe(3.5);
        const desert = stageCamera(STAGES.desert, { look: {}, shot: 'dolly' });
        expect(desert.ease).toBe(1.8);
        expect(desert.maxSpeed).toBeUndefined();
    });

    it('keep the warehouse camera just over the crowd, never through its heads, and no higher than 3.4 m', async () => {
        const { orbitShot } = await import('@/lib/show/stages/orbit');
        const { orbit, crowd } = STAGES.warehouse;
        for (let t = 0; t <= 200; t += 2) {
            const { pos } = orbitShot(orbit, t, 200);
            // (the room is too narrow for the circle to clear the crowd's corners: there it passes over raised hands)
            const overCrowd = Math.abs(pos[0]) < crowd.x && pos[2] > crowd.z0 && pos[2] < crowd.z1;
            if (overCrowd) expect(pos[1], `t ${t}: ${pos}`).toBeGreaterThanOrEqual(2.9);
            expect(pos[1]).toBeLessThanOrEqual(3.4);
        }
    });

    it('stand the mainstage default view nearer than before, with room for the PA at the sides', () => {
        expect(STAGES.mainstage.frame.margin).toBeLessThan(1.38);
        expect(STAGES.mainstage.frame.margin).toBeGreaterThan(1.15);
        expect(STAGES.mainstage.songFrame).toBeUndefined();
    });
});

describe('the two-colour focus', () => {
    it('meets side by side on every stage, for every song', async () => {
        const { prepareSongShow, FOCUS_SPLIT } = await import('@/lib/show/timeline');
        const { planDesertCues, PATCHES } = await import('@/lib/show/stages/mainstageCues');
        const cues = [
            { t: 0, name: 'Focus', look: { converge: 0.95, focusFloor: 1 } },
            { t: 4, name: 'Focus \u00b7 phrase 2 \u00b7 two colours', look: { converge: 0.95, colorA: '#19d9ff', colorB: '#ff3df2' } },
            { t: 8, name: 'Focus \u00b7 phrase 3', look: { converge: 0.95 } },
            { t: 12, name: 'After focus', look: { converge: 0 } },
        ];
        const song = prepareSongShow({ cues, beats: [], hits: [] });
        expect(song.sheet.cues.map((c) => c.look.focusSplit)).toEqual([0, FOCUS_SPLIT, 0, 0]);
        // the desert stage and the mainstage: further apart
        expect(planDesertCues(cues)[1]?.look.focusSplit).toBeGreaterThan(FOCUS_SPLIT);
        expect(PATCHES['Focus \u00b7 two colours'].focusSplit).toBeGreaterThan(FOCUS_SPLIT);
    });
});

describe('the three-quarter shots on the desert stage', () => {
    it('turn left once and right once a song, never more', async () => {
        const { planQuarterShots } = await import('@/lib/show/stages/mainstageCues');
        const shots = ['wide', 'left', 'left', 'dolly', 'left', 'drop', 'right', 'dolly', 'left'];
        const plan = planQuarterShots(shots.map((shot) => ({ shot })));
        const played = shots.map((s, i) => plan[i] ?? s);
        expect(played).toEqual(['wide', 'left', 'left', 'dolly', 'right', 'drop', 'dolly', 'dolly', 'dolly']);
        // a song that turns only once also turns right, on its next dolly shot
        const once = planQuarterShots(['wide', 'left', 'wide', 'dolly', 'dolly', 'drop'].map((shot) => ({ shot })));
        expect(once).toEqual([null, 'left', null, 'right', 'right', null]);
        expect(STAGES.desert.shotPlan).toBe(planQuarterShots);
    });
});

describe('the desert stage, mounted and tuned', () => {
    const st = STAGES.desert;
    const deck = st.deck;
    it('stands every floor fixture on the deck (or its plinth), not above it', () => {
        for (const h of st.heads.filter((x) => x.role === 'floor')) {
            const onDeck = Math.abs(h.pos[1] - deck) < 0.01;
            const onPlinth = Math.abs(Math.abs(h.pos[0]) - 35.5) < 6 && Math.abs(h.pos[1] - 2.4) < 0.01;
            expect(onDeck || onPlinth, `${h.pos}`).toBe(true);
        }
    });
    it('hangs every roof fixture right under a truss', () => {
        const trusses = st.structure.filter((p) => p.kind === 'truss' && p.from[1] === p.to[1]);
        for (const h of st.heads.filter((x) => x.role === 'aerial')) {
            const under = trusses.some((t) => Math.abs(t.from[1] - 0.25 - h.pos[1]) < 0.01
                && (t.from[2] === t.to[2] ? Math.abs(t.from[2] - h.pos[2]) < 0.01 : Math.abs(t.from[0] - h.pos[0]) < 0.01));
            expect(under, `${h.pos}`).toBe(true);
        }
    });
    it('puts a CO2 nozzle between the two lasers on each front leg, which stand further apart, firing at the audience', () => {
        const [lo, hi] = st.meta.towerLasers;
        expect(hi - lo).toBeGreaterThan(2.5);
        const tower = st.co2Extra.filter((n) => n.dir);
        expect(tower).toHaveLength(2);
        for (const n of tower) {
            expect(n.pos[1]).toBeGreaterThan(deck + lo);
            expect(n.pos[1]).toBeLessThan(deck + hi);
            expect(n.dir[2]).toBeGreaterThan(Math.abs(n.dir[1])); // out at the audience
            expect(n.dir[1]).toBeLessThan(0); // and down
        }
        expect(st.co2Extra.some((n) => Math.abs(n.pos[0]) > 30)).toBe(false); // none left under the screens
    });
    it('adds beam columns up both edges of each side screen', () => {
        const columns = st.heads.filter((h) => Math.abs(Math.abs(h.pos[0]) - 35.5) > 6 && Math.abs(Math.abs(h.pos[0]) - 35.5) < 7 && h.pos[1] > 4 && h.pos[2] < 5);
        for (const h of columns) expect(h.role).toBe('sides');
        expect(columns).toHaveLength(24);
    });
    it('turns the outer confetti cannons further towards the audience', async () => {
        const { stageMounts } = await import('@/lib/show/stages/rig');
        const m = stageMounts(st);
        const all = [...m.cannons, ...m.moreCannons.flat()];
        const outer = all.filter((c) => Math.abs(c.base[0]) > 20);
        const inner = all.filter((c) => Math.abs(c.base[0]) < 20);
        for (const c of outer) expect(c.dir[2] / c.dir[1]).toBeGreaterThan(inner[0].dir[2] / inner[0].dir[1]);
    });
    it('plays the beam wipe, only the aerial and floor beams on, in some grooves and verses', async () => {
        const { planDesertCues, BEAM_WIPE } = await import('@/lib/show/stages/mainstageCues');
        const cues = ['Intro', 'Groove', 'Groove · phrase 2', 'Verse', 'Verse · phrase 2', 'Peak · all in'].map((name) => ({ name }));
        const plan = planDesertCues(cues);
        expect(plan.filter((p) => p === BEAM_WIPE).length).toBeGreaterThanOrEqual(2);
        expect(BEAM_WIPE.look).toMatchObject({ beams: 1, floor: 1, sides: 0, laser: 0, spots: 0 });
        // a song with a single groove still gets one
        expect(planDesertCues([{ name: 'Groove' }, { name: 'Peak · all in' }]).includes(BEAM_WIPE)).toBe(true);
    });

    it('plays its side-tower cues in turn: the side towers solo, bridges and breakdowns, or the first build', async () => {
        const { planDesertCues, DESERT_SIDE_CUES } = await import('@/lib/show/stages/mainstageCues');
        expect(DESERT_SIDE_CUES.map((c) => c.kind)).toEqual(['Side towers · ladder climb', 'Side towers · depth chase', 'Side towers · crossfire', 'Side towers · ping-pong']);
        const plan = planDesertCues(['Intro', 'Solo · side towers', 'Bridge', 'Breakdown', 'Peak · all in'].map((name) => ({ name })));
        expect(plan.slice(1, 4).map((c) => c.kind)).toEqual(DESERT_SIDE_CUES.slice(0, 3).map((c) => c.kind));
        // only the side lights and a little of the rest: the towers are the point
        for (const c of DESERT_SIDE_CUES) expect(c.look.sides).toBe(1);
        const none = planDesertCues([{ name: 'Groove' }, { name: 'Build' }, { name: 'Peak · all in' }]);
        expect(none[1].kind).toBe(DESERT_SIDE_CUES[0].kind);
        // on the desert they are the only lights; the beam wipe has the spots off
        for (const c of plan.slice(1, 4)) for (const k of ['beams', 'floor', 'wash', 'spots', 'laser', 'pixel', 'strobe', 'blinder']) expect(c.look[k], `${c.kind} ${k}`).toBe(0);
    });

    it('plays the beam wipe and the side-tower cues on the mainstage too, in every song, and nowhere else', async () => {
        const { planMainstageCues, BEAM_WIPE, DESERT_SIDE_CUES } = await import('@/lib/show/stages/mainstageCues');
        const fs = await import('node:fs');
        const index = JSON.parse(fs.readFileSync('public/shows/index.json', 'utf8'));
        const list = Array.isArray(index) ? index : index.demos ?? index.songs ?? Object.values(index);
        expect(list.length).toBeGreaterThan(0);
        for (const demo of list) {
            const file = (demo.show ?? `/shows/${demo.slug}.show.json`).replace(/^\//, 'public/');
            const show = JSON.parse(fs.readFileSync(file, 'utf8'));
            for (const plan of [planMainstageCues(show.cues), STAGES.desert.cuePlan(show.cues)]) {
                expect(plan.includes(BEAM_WIPE), demo.slug ?? file).toBe(true);
                expect(plan.some((p) => DESERT_SIDE_CUES.some((c) => c.kind === p?.kind)), demo.slug ?? file).toBe(true);
                // (the side lights alone: every other light off)
                for (const p of plan.filter((x) => DESERT_SIDE_CUES.some((c) => c.kind === x?.kind))) expect([p.look.beams, p.look.floor, p.look.wash, p.look.laser]).toEqual([0, 0, 0, 0]);
            }
        }
        expect(STAGES.warehouse.cuePlan).toBeUndefined();
    });
});

describe('the mainstage, attached and symmetric', () => {
    it('attaches every fixture to its structure (a bracket where one stands off a surface)', async () => {
        const { nearestStructure } = await import('@/lib/show/stages/brackets');
        const st = STAGES.mainstage;
        const all = [...st.heads, ...st.strobes, ...st.blinders, ...st.lasers, ...Object.entries(st.effects).filter(([k]) => k !== 'shell' && k !== 'haze').flatMap(([, l]) => l)];
        // (the PA's own sub stacks are drawn from stage.pa: the floor row stands on the riser above them)
        for (const f of all) expect(nearestStructure(f.pos, st.structure).distance, `${f.type ?? ''} ${f.pos}`).toBeLessThanOrEqual(0.31);
        // no lone beam under the crown's point
        expect(st.heads.some((h) => Math.abs(h.pos[0]) < 0.01 && h.type === 'beam' && h.pos[1] < 23)).toBe(false);
    });

    it('thins every stage as mirror images: as many heads on the left as on the right in every group', async () => {
        const { rigHeads } = await import('@/lib/show/stages/rig');
        for (const key of ['mainstage', 'desert', 'warehouse']) {
            for (const count of [64, 96, 160]) {
                const heads = rigHeads(STAGES[key], count);
                for (const role of ['aerial', 'sides', 'floor', 'wash', 'spot']) {
                    // (the desert's follow spots stand on the front-of-house tower, off to one side of the crowd on purpose)
                    const mine = heads.filter((h) => h.role === role && !(key === 'desert' && h.position[2] > 20));
                    const left = mine.filter((h) => h.position[0] < -0.05).length;
                    const right = mine.filter((h) => h.position[0] > 0.05).length;
                    expect(left, `${key} ${count} ${role}`).toBe(right);
                }
            }
        }
    });

    it('lowers the floor beams in every cue, turns them off in crossed swords and the pyramid, and has a multi-colour focus', async () => {
        const { MAINSTAGE_CUES, planMainstageCues } = await import('@/lib/show/stages/mainstageCues');
        expect(STAGES.mainstage.headTune.floorLower).toBeGreaterThan(0);
        for (const kind of ['Mainstage · crossed swords', 'Mainstage · the pyramid']) expect(MAINSTAGE_CUES.find((c) => c.kind === kind).look.floor).toBe(0);
        const multi = MAINSTAGE_CUES.find((c) => c.kind === 'Mainstage · multi-colour focus');
        expect(multi.look).toMatchObject({ focusMulti: 1, sparkle: 0 });
        const plan = planMainstageCues(['Focus', 'Focus · phrase 2 · two colours', 'Focus · phrase 3', 'Peak · all in'].map((name) => ({ name })));
        expect(plan[2]).toBe(multi);
        expect(planMainstageCues([{ name: 'Focus' }, { name: 'Peak · all in' }])[0]).toBe(multi);
    });
});

describe('trial fixtures (stage.extras)', () => {
    const mirrored = (points) => {
        const xs = points.map((p) => p[0]).sort((a, b) => a - b);
        return xs.every((x, i) => Math.abs(x + xs[xs.length - 1 - i]) < 0.01);
    };
    it('each stage has only the trial fixtures listed for it, every one mirrored left and right', async () => {
        const { EXTRAS } = await import('@/lib/show/stages/extras');
        for (const [key, stage] of Object.entries(STAGES)) {
            const x = stage.extras ?? {};
            for (const name of Object.keys(x)) expect(EXTRAS.find((e) => e.key === name)?.stages).toContain(key);
            for (const list of [x.finWashes?.map((b) => b.pos), x.hybridBeams, x.cryo, x.kineticSky?.cells]) {
                if (list) expect(mirrored(list)).toBe(true);
            }
        }
    });
    it('the uplight washes stand at the fin feet (where the fin-foot beams were), each aimed up its own fin', () => {
        const m = STAGES.mainstage;
        expect(m.extras.finWashes).toHaveLength(12);
        expect(m.heads.some((h) => h.type === 'beam' && m.extras.finWashes.some((b) => Math.hypot(h.pos[0] - b.pos[0], h.pos[2] - b.pos[2]) < 0.5))).toBe(false);
        for (const w of m.extras.finWashes) { expect(w.pos[1]).toBeCloseTo(1.8); expect(w.dir[1]).toBeGreaterThan(0.7); expect(Math.sign(w.dir[0])).toBe(w.s); }
    });
    it('the removed trial fixtures are gone (flames, drones, spheres, beam bars, pixel blinders)', () => {
        for (const stage of Object.values(STAGES)) for (const k of ['flames', 'drones', 'kinetic', 'tiltBars', 'finBlinders']) expect(stage.extras?.[k]).toBeUndefined();
    });
    it('the kinetic LED sky hangs under the grid and over the crowd: never lower than 4.5 m, inside the room', () => {
        const sky = STAGES.warehouse.extras.kineticSky;
        expect(sky.base - 1 - 0.05).toBeGreaterThanOrEqual(4.5);
        expect(sky.base + 1).toBeLessThan(sky.top - 0.5);
        for (const [x, z] of sky.cells) { expect(Math.abs(x) + sky.size / 2).toBeLessThan(STAGES.warehouse.meta.room.width / 2 - 2); expect(z - sky.size / 2).toBeGreaterThan(-6); }   // (over the crowd and the stage front, in front of the LED walls)
        // the grid's fixtures hang over the sky's highest tiles, each over a gap between tiles (its beam fires between them)
        for (const h of STAGES.warehouse.heads.filter((f) => f.pos[1] > sky.top - 1)) {
            expect(h.pos[1] - 0.6).toBeGreaterThan(sky.base + 1.3);
            for (const [x, z] of sky.cells) expect(Math.abs(h.pos[0] - x) < sky.size / 2 && Math.abs(h.pos[2] - z) < sky.size / 2, `${h.pos} over the tile at ${x}, ${z}`).toBe(false);
        }
    });
});

describe('the cryo cue (lib/show/cryo.js)', async () => {
    const { planCryo, cryoAt } = await import('@/lib/show/cryo');
    const beats = Array.from({ length: 400 }, (_, i) => i * 0.5);
    const downbeats = beats.map((_, i) => i).filter((i) => i % 4 === 0);
    const show = {
        beats, downbeats,
        sections: [{ start: 0, end: 32, kind: 'groove' }, { start: 32, end: 48, kind: 'build' }, { start: 48, end: 96, kind: 'peak' }, { start: 96, end: 120, kind: 'breakdown' }, { start: 120, end: 200, kind: 'peak' }],
        hits: [{ t: 48, kind: 'drop', dur: 2 }, { t: 30, kind: 'blinder', dur: 1 }, ...[180, 181, 182, 183].map((t) => ({ t, kind: 'firework', dur: 4 }))],
    };
    const plan = planCryo(show);
    it('fires on the last two downbeats of the build, the drop, a phrase later and the finale only', () => {
        expect(plan.filter((f) => f.kind === 'burst' && f.t < 48).map((f) => f.t)).toEqual([44, 46]);
        expect(plan.find((f) => f.kind === 'blast').t).toBe(48);
        expect(plan.some((f) => f.kind === 'burst' && f.t === 64)).toBe(true);           // 8 bars after the drop
        expect(plan.filter((f) => f.kind === 'alt').map((f) => f.side)).toEqual([-1, 1, -1, 1, -1, 1, -1, 1]);
        expect(plan.every((f) => f.t < 32 || f.t >= 44)).toBe(true);                     // nothing in the groove or on the blinder
        expect(plan.some((f) => f.t >= 96 && f.t < 120)).toBe(false);                    // nothing in the breakdown
    });
    it('a blast spreads out from the centre, then fades', () => {
        expect(cryoAt(plan, 48.1).reveal).toBeLessThan(0.5);
        expect(cryoAt(plan, 48.6).reveal).toBeGreaterThan(1);
        expect(cryoAt(plan, 48.5).level).toBe(1);
        expect(cryoAt(plan, 20)).toBeNull();
    });
});

describe('continuous LED lines from the pixel bars', async () => {
    const { continuousBars } = await import('@/lib/show/stages/pixelLines');
    it('stretches each bar to meet the next one in line, so a row is one unbroken line', () => {
        const row = [0, 3, 6].map((x) => ({ pos: [x, 5, 0], rot: [0, 0, Math.PI / 2] }));
        const out = continuousBars(row);
        // the row runs from -0.8 to 6.8 with no gaps
        const ends = out.map((b) => [b.pos[0] - b.length / 2, b.pos[0] + b.length / 2]).sort((a, b) => a[0] - b[0]);
        expect(ends[0][0]).toBeCloseTo(-0.8);
        expect(ends.at(-1)[1]).toBeCloseTo(6.8);
        for (let i = 1; i < ends.length; i++) expect(ends[i][0]).toBeCloseTo(ends[i - 1][1]);
    });
    it('leaves a lone bar, and bars side by side (not in line), as they were', () => {
        const out = continuousBars([{ pos: [0, 0, 0] }, { pos: [1, 0, 0] }]);
        for (const b of out) expect(b.length).toBeCloseTo(1.6);
    });
});

describe('the warehouse, attached', () => {
    it('attaches every fixture to a truss, a wall or the deck (a bracket where one stands off), no mirror ball', async () => {
        const { nearestStructure } = await import('@/lib/show/stages/brackets');
        const st = STAGES.warehouse;
        const all = [...st.heads, ...st.strobes, ...st.blinders, ...st.lasers, ...st.pixelBars, ...Object.entries(st.effects).filter(([k]) => k !== 'shell' && k !== 'haze').flatMap(([, l]) => l)];
        for (const f of all) expect(nearestStructure(f.pos, st.structure).distance, `${f.type ?? ''} ${f.pos}`).toBeLessThanOrEqual(0.31);
        expect(st.structure.some((p) => p.kind === 'sphere')).toBe(false);
    });
    it('has a PA for its size: main hangs and two rows of delays each side, two stacks each side, subs across the stage', () => {
        const pa = STAGES.warehouse.pa;
        expect(pa.HANGS.length).toBe(3);
        expect(pa.STACKS.length).toBe(2);
        expect(pa.SUB_COUNT * pa.SUB_PITCH).toBeGreaterThan(STAGES.warehouse.meta.stageWidth - 2);
    });
});
