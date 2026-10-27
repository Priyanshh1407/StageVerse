import { describe, it, expect } from 'vitest';
import { scorePrediction, rankByScore } from '@/lib/scoring';

const setlist = ['Opener', 'Hit Single', 'Ballad', 'Encore'].map((title, i) => ({ title, songId: `s${i}` }));
const p = (...titles) => titles.map((title) => ({ title }));

describe('scorePrediction', () => {
    it('scores 10 per correct song and +5 when the position matches', () => {
        expect(scorePrediction(p('Opener', 'Ballad'), setlist)).toBe(15 + 10);
    });

    it('matches each real song only once, however often it is predicted', () => {
        expect(scorePrediction(p('Opener', 'Opener', 'Opener', 'Opener'), setlist)).toBe(15);
    });

    it('matches by song id when present', () => {
        expect(scorePrediction([{ id: 's1', title: 'renamed' }], setlist)).toBe(10);
    });

    it('ignores blank titles instead of matching blank setlist entries', () => {
        expect(scorePrediction(p('', '  '), [{ title: '' }, { title: 'A' }])).toBe(0);
    });

    it('handles empty input', () => {
        expect(scorePrediction([], setlist)).toBe(0);
        expect(scorePrediction(p('Opener'), [])).toBe(0);
    });
});

describe('rankByScore', () => {
    it('uses standard competition ranking (1, 1, 3)', () => {
        const ranks = rankByScore([{ score: 30 }, { score: 30 }, { score: 10 }]).map((r) => r.rank);
        expect(ranks).toEqual([1, 1, 3]);
    });
});
