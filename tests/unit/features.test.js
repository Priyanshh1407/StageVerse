import { describe, expect, it } from 'vitest';
import { FEATURES, featureOn } from '@/lib/features';

describe('feature switches', () => {
    it('are on unless the environment says off', () => {
        for (const value of [undefined, '', 'on', '1', 'true', 'yes']) expect(featureOn(value)).toBe(true);
        for (const value of ['off', 'OFF', ' 0 ', 'false', 'No']) expect(featureOn(value)).toBe(false);
    });

    it('cover every new feature, on by default except bloom', () => {
        expect(Object.keys(FEATURES).sort()).toEqual(['bloom', 'crowd', 'dmxMonitor', 'festival', 'howItWorks', 'liveSections', 'liveStage', 'patchStage', 'performer', 'share']);
        // every feature is on by default, except bloom (off for now)
        expect(Object.entries(FEATURES).filter(([, v]) => !v).map(([k]) => k)).toEqual(['bloom']);
    });
});
