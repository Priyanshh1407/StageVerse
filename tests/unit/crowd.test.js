import { describe, it, expect } from 'vitest';
import { seededRandom, crowdPeople } from '@/components/home/stage/crowdTexture';

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

    it('fills the width with two rows, about a third with arms up and a few phones', () => {
        const people = crowdPeople(7);
        expect(people.length).toBeGreaterThan(40);
        const rows = new Set(people.map((p) => p.baseline));
        expect(rows.size).toBe(2);
        const armsUp = people.filter((p) => p.armsUp).length / people.length;
        expect(armsUp).toBeGreaterThan(0.15);
        expect(armsUp).toBeLessThan(0.55);
        expect(people.some((p) => p.phone)).toBe(true);
        expect(people.every((p) => !p.phone || p.armsUp)).toBe(true);
    });
});
