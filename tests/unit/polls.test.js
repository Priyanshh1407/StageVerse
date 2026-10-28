import { describe, it, expect } from 'vitest';
import { pickWinner } from '@/lib/polls';

const opt = (id, text, votes) => ({ _id: id, text, votes });

describe('pickWinner (BUG-04)', () => {
    it('picks the option with the most votes', () => {
        expect(pickWinner([opt('a', 'Song A', 3), opt('b', 'Song B', 7)])).toEqual({ optionId: 'b', text: 'Song B', votes: 7, tie: false });
    });

    it('breaks ties by listing order and flags the tie', () => {
        expect(pickWinner([opt('a', 'Song A', 5), opt('b', 'Song B', 5)])).toMatchObject({ text: 'Song A', tie: true });
    });

    it('a later higher count clears an earlier tie', () => {
        expect(pickWinner([opt('a', 'A', 2), opt('b', 'B', 2), opt('c', 'C', 9)])).toMatchObject({ text: 'C', tie: false });
    });

    it('returns null when nobody voted or there are no options', () => {
        expect(pickWinner([opt('a', 'A', 0), opt('b', 'B', 0)])).toBeNull();
        expect(pickWinner([])).toBeNull();
    });
});
