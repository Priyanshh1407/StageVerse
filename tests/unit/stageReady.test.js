import { describe, expect, it, vi } from 'vitest';
import { PARTS, getReady, markReady, resetReady, subscribeReady } from '@/components/home/show/stageReady';

describe('the loading screen waits for every part of the stage and the show', () => {
    it('is ready only once every part has reported, in any order', () => {
        resetReady();
        expect(getReady()).toMatchObject({ done: 0, total: PARTS.length, ready: false, next: 'tier' });
        markReady('songs', 'fonts');
        expect(getReady()).toMatchObject({ done: 2, ready: false, next: 'tier' });
        markReady('tier', 'stage', 'fixtures');
        expect(getReady()).toMatchObject({ ready: false, next: 'effects' });
        markReady('effects');
        expect(getReady()).toMatchObject({ done: PARTS.length, ready: true, next: null });
    });

    it('ignores repeats and unknown parts, and tells subscribers only about changes', () => {
        resetReady();
        const fn = vi.fn();
        const off = subscribeReady(fn);
        markReady('stage');
        markReady('stage');
        markReady('nonsense');
        expect(fn).toHaveBeenCalledTimes(1);
        expect(getReady().done).toBe(1);
        off();
    });

    it('starts over when the homepage mounts again', () => {
        markReady(...PARTS);
        expect(getReady().ready).toBe(true);
        resetReady();
        expect(getReady()).toMatchObject({ done: 0, ready: false });
    });
});
