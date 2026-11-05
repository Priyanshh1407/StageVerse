import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentState } from '@/components/home/show/director';
import { prepareSongShow, songEffectsAt } from '@/lib/show/timeline';
import { STREAMER_LIFE } from '@/lib/show/confetti';
import { buildScrollSheet, ENCORE_CHOICES } from '@/components/home/show/scrollShow';

// A tiny show: streamers fired 2 s before the song's end, a shell 1 s before it
const show = prepareSongShow({
    title: 't', bpm: 120, duration: 20, beats: [0, 0.5, 1], downbeats: [0], sections: [], energy: [],
    cues: [{ t: 0, name: 'Start', look: {} }],
    hits: [
        { t: 18, kind: 'streamers', dur: 1.6, jets: 'all' },
        { t: 19, kind: 'firework', dur: 6, fw: { type: 'peony', x: 0 } },
    ],
});

describe('effects in the air when a song ends keep going to their end', () => {
    afterEach(() => vi.restoreAllMocks());

    it('past the song\'s end the effects keep ageing, then clear', () => {
        expect(songEffectsAt(show, 20).streamers).toBeTruthy();
        expect(songEffectsAt(show, 24).fireworks[0].age).toBeCloseTo(5, 6);
        expect(songEffectsAt(show, 26).fireworks).toBeUndefined();
        expect(songEffectsAt(show, 18 + 1.6 + STREAMER_LIFE + 1)).toEqual({});
    });

    it('after the song, over the house lights and the scroll show, the streamers keep moving until they land', () => {
        const now = vi.spyOn(performance, 'now');
        now.mockReturnValue(1000);
        const control = { mode: 'scroll', progress: 0, sheet: buildScrollSheet(ENCORE_CHOICES[0]), linger: { song: show, t: 20, at: 1000 } };
        const a = currentState(control).look.streamers;
        now.mockReturnValue(4000);
        const b = currentState(control).look.streamers;
        expect(b[0]).toBeCloseTo(a[0] + 3, 6); // still ageing: 3 s later, 3 s older
        now.mockReturnValue(1000 + (STREAMER_LIFE + 5) * 1000);
        expect(currentState(control).look.streamers).toBeUndefined();
        expect(control.linger).toBeNull(); // forgotten once everything has finished
    });
});
