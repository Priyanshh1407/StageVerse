import { describe, it, expect } from 'vitest';
import { roomFlash, strobeGate } from '@/components/home/stage/flash';

describe('room flash (strobes and blinders light the whole room)', () => {
    it('strobes flash ~12 times a second, on for 30% of each cycle', () => {
        const samples = Array.from({ length: 1000 }, (_, i) => strobeGate(i / 1000));
        expect(samples.filter(Boolean).length / samples.length).toBeCloseTo(0.3, 1);
        let rises = 0;
        for (let i = 1; i < samples.length; i++) if (samples[i] && !samples[i - 1]) rises++;
        expect(rises).toBeGreaterThanOrEqual(12);
        expect(rises).toBeLessThanOrEqual(13);
    });

    it('nothing flashes without strobe or blinder, or on blackout', () => {
        expect(roomFlash({ strobe: 0, blinder: 0 }, 0).total).toBe(0);
        expect(roomFlash({ strobe: 1, blinder: 1, master: 0 }, 0).total).toBe(0);
    });

    it('more blinders throw more light into the room (capped)', () => {
        const look = { blinder: 1 };
        const few = roomFlash(look, 0, 4).total;
        const reference = roomFlash(look, 0, 8).total;
        const many = roomFlash(look, 0, 20).total;
        expect(few).toBeLessThan(reference);
        expect(many).toBeGreaterThan(reference * 2);
        expect(roomFlash(look, 0, 1000).total).toBeLessThanOrEqual(2.2);
    });
});
