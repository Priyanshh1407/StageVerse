import { describe, it, expect } from 'vitest';
import { advanceClock, elapsedAt } from '@/lib/showClock';

const t0 = new Date('2026-11-04T15:00:00Z');
const at = (s) => new Date(t0.getTime() + s * 1000);

describe('show clock', () => {
    it('runs while Live and holds while Paused', () => {
        let clock = advanceClock(undefined, 'Standby', 'Live', t0);
        expect(elapsedAt(clock, 'Live', at(90))).toBe(90);
        clock = advanceClock(clock, 'Live', 'Paused', at(90));
        expect(elapsedAt(clock, 'Paused', at(500))).toBe(90); // emergency stop: the clock waits
        clock = advanceClock(clock, 'Paused', 'Live', at(500));
        expect(elapsedAt(clock, 'Live', at(530))).toBe(120); // resumes from where it stopped
    });

    it('a screen that comes back later reads where the show is now', () => {
        const clock = advanceClock(undefined, 'Standby', 'Live', t0);
        expect(elapsedAt(clock, 'Live', at(3725))).toBe(3725);
    });

    it("follows the artist's timer when one is sent", () => {
        let clock = advanceClock(undefined, 'Standby', 'Live', t0);
        clock = advanceClock(clock, 'Live', 'Paused', at(100), 97);
        expect(elapsedAt(clock, 'Paused', at(200))).toBe(97);
        clock = advanceClock(clock, 'Paused', 'Live', at(200), 97);
        expect(elapsedAt(clock, 'Live', at(210))).toBe(107);
        // nonsense times are ignored
        expect(advanceClock(clock, 'Live', 'Paused', at(210), -5).elapsed).toBe(107);
    });

    it('Standby resets, and starting again begins at zero', () => {
        let clock = advanceClock({ elapsed: 400, liveSince: null }, 'Paused', 'Standby', t0);
        expect(elapsedAt(clock, 'Standby', at(50))).toBe(0);
        clock = advanceClock({ elapsed: 400, liveSince: null }, 'Standby', 'Live', t0);
        expect(elapsedAt(clock, 'Live', at(5))).toBe(5);
    });

    it('a repeated Live does not restart the clock', () => {
        const clock = advanceClock(undefined, 'Standby', 'Live', t0);
        expect(elapsedAt(advanceClock(clock, 'Live', 'Live', at(60)), 'Live', at(60))).toBe(60);
    });
});
