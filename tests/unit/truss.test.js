import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createTrussGeometry, TRUSS_BARS } from '@/components/home/stage/trussGeometry';

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
});
