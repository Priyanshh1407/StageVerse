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
        for (const type of ['co2', 'confetti', 'streamer', 'haze']) expect(stage.effects[type].length, type).toBeGreaterThan(0);
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
        expect(STAGES.warehouse.shots.sky).toBe(STAGES.warehouse.shots.finale);
    });
});
