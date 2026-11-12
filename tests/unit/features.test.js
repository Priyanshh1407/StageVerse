import { describe, expect, it } from 'vitest';
import { FEATURES, featureOn } from '@/lib/features';

describe('feature switches', () => {
    it('are on unless the environment says off', () => {
        for (const value of [undefined, '', 'on', '1', 'true', 'yes']) expect(featureOn(value)).toBe(true);
        for (const value of ['off', 'OFF', ' 0 ', 'false', 'No']) expect(featureOn(value)).toBe(false);
    });

    it('cover every new feature, all on by default', () => {
        expect(Object.keys(FEATURES).sort()).toEqual(['crowd', 'dmxMonitor', 'howItWorks', 'liveSections', 'liveStage', 'patchStage', 'performer', 'share']);
        expect(Object.values(FEATURES).every(Boolean)).toBe(true);
    });
});
