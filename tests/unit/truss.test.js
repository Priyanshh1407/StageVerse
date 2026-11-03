import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createTrussGeometry, TRUSS_BARS, SCREEN_Z, TOWER_FRONT_Z, TOWER_MID_Z, TOWER_REAR_Z, ROWS } from '@/components/home/stage/trussGeometry';

describe('truss geometry', () => {
    it('merges the whole rig into one geometry', () => {
        const g = createTrussGeometry();
        expect(g).toBeInstanceOf(THREE.BufferGeometry);
        const triangles = (g.index ? g.index.count : g.attributes.position.count) / 3;
        expect(triangles).toBeGreaterThan(1000);    // real bracing, not just boxes
        expect(triangles).toBeLessThan(60000);      // still cheap
    });

    it('spans the stage: towers at x = +/-15.6 reaching above the top truss', () => {
        const g = createTrussGeometry();
        g.computeBoundingBox();
        const { min, max } = g.boundingBox;
        expect(min.x).toBeLessThan(-15.6);
        expect(max.x).toBeGreaterThan(15.6);
        expect(min.y).toBeLessThanOrEqual(0);
        expect(max.y).toBeGreaterThan(16.6);
    });

    it('builds a bar exactly between its end points', () => {
        const g = createTrussGeometry([[[0, 0, 0], [0, 10, 0]]]); // one vertical bar
        g.computeBoundingBox();
        const { min, max } = g.boundingBox;
        expect(min.y).toBeCloseTo(-0.03, 1);
        expect(max.y).toBeCloseTo(10.03, 1);
        expect(max.x - min.x).toBeLessThan(0.6); // section width, not length
    });

    it('every bar has distinct end points', () => {
        for (const [a, b] of TRUSS_BARS) expect(a).not.toEqual(b);
    });

    it('gives each side tower three columns: front, middle and rear', () => {
        for (const x of [-15.6, 15.6]) {
            for (const z of [TOWER_FRONT_Z, TOWER_MID_Z, TOWER_REAR_Z]) {
                expect(TRUSS_BARS.some(([from, to]) => from[0] === x && to[0] === x && from[2] === z && to[2] === z && to[1] - from[1] > 15)).toBe(true);
            }
        }
        expect(TOWER_MID_Z).toBeLessThan(TOWER_FRONT_Z);
        expect(TOWER_MID_Z).toBeGreaterThan(TOWER_REAR_Z);
        // nothing stands in the middle of the stage, in front of the LED wall
        expect(TRUSS_BARS.some(([from, to]) => from[0] === 0 && to[0] === 0 && to[1] - from[1] > 5)).toBe(false);
    });

    it('gives the stage depth: rows spread between the front and rear columns, the wall behind', () => {
        expect(TOWER_REAR_Z - TOWER_FRONT_Z).toBeLessThanOrEqual(-10);
        const zs = ROWS.map((r) => r.z).sort((a, b) => a - b);
        for (let i = 1; i < zs.length; i++) expect(zs[i] - zs[i - 1]).toBeGreaterThanOrEqual(2.5);
        expect(SCREEN_Z).toBeLessThan(TOWER_REAR_Z);
    });

    it('steps the rows down like a ladder from the front to the back', () => {
        const byDepth = [...ROWS].sort((a, b) => b.z - a.z); // front first
        for (let i = 1; i < byDepth.length; i++) expect(byDepth[i].y).toBeLessThan(byDepth[i - 1].y);
        expect(byDepth[byDepth.length - 1].y).toBeGreaterThan(11.6); // still above the LED wall and its frame
    });
});
