import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createTrussGeometry, TRUSS_BARS, CENTRE_Z, SCREEN_Z, TOWER_FRONT_Z, TOWER_REAR_Z, ROWS } from '@/components/home/stage/trussGeometry';

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

    it('has a centre tower from the deck to the top, in front of the LED wall and tied into the rig', () => {
        const centre = TRUSS_BARS.find(([a, b]) => a[0] === 0 && b[0] === 0 && a[2] === CENTRE_Z && b[2] === CENTRE_Z && b[1] - a[1] > 15);
        expect(centre).toBeTruthy();
        expect(CENTRE_Z).toBeGreaterThan(SCREEN_Z);           // in front of the wall
        // tied to the lowest row and to the top row
        expect(TRUSS_BARS.some(([a, b]) => a[0] === 0 && a[2] === CENTRE_Z && b[2] === ROWS[3].z)).toBe(true);
        expect(TRUSS_BARS.some(([a, b]) => a[0] === 0 && a[2] === CENTRE_Z && b[2] === ROWS[0].z)).toBe(true);
    });

    it('gives the stage depth: rows spread between the front and rear columns, the wall behind', () => {
        expect(TOWER_REAR_Z - TOWER_FRONT_Z).toBeLessThanOrEqual(-10);
        const zs = ROWS.map((r) => r.z).sort((a, b) => a - b);
        for (let i = 1; i < zs.length; i++) expect(zs[i] - zs[i - 1]).toBeGreaterThanOrEqual(2.5);
        expect(SCREEN_Z).toBeLessThan(TOWER_REAR_Z);
    });
});
