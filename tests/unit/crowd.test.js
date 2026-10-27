import { describe, it, expect } from 'vitest';
import { seededRandom, crowdPeople, CROWD_CANVAS } from '@/components/home/stage/crowdTexture';

describe('crowd generation', () => {
    it('the same seed always gives the same crowd; a different seed a different one', () => {
        expect(crowdPeople(7)).toEqual(crowdPeople(7));
        expect(crowdPeople(8)).not.toEqual(crowdPeople(7));
    });

    it('seededRandom stays in [0, 1)', () => {
        const rand = seededRandom(42);
        for (let i = 0; i < 1000; i++) {
            const v = rand();
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });

    it('fills the width with three rows of heads, smaller and higher toward the back', () => {
        const people = crowdPeople(7);
        expect(new Set(people.map((p) => p.row)).size).toBe(3);
        const back = people.filter((p) => p.row === 0);
        const front = people.filter((p) => p.row === 2);
        expect(back.length).toBeGreaterThan(40);
        expect(front.length).toBeGreaterThan(25);
        const avg = (xs, k) => xs.reduce((s, p) => s + p[k], 0) / xs.length;
        expect(avg(back, 'r')).toBeLessThan(avg(front, 'r'));
        expect(avg(back, 'headY')).toBeLessThan(avg(front, 'headY'));
        expect(Math.min(...people.map((p) => p.x))).toBeLessThan(0);
        expect(Math.max(...people.map((p) => p.x))).toBeGreaterThan(CROWD_CANVAS.width - 60);
    });

    it('every head is inside the canvas', () => {
        for (const p of crowdPeople(3)) {
            expect(p.headY - p.r).toBeGreaterThan(0);
            expect(p.headY + p.r).toBeLessThan(CROWD_CANVAS.height);
        }
    });
});
