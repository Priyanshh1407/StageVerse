import { describe, expect, it } from 'vitest';
import { readSongLink, songLink } from '@/lib/show/share';

describe('links to a song and moment', () => {
    it('round-trip a song and a time', () => {
        const link = songLink('high-on-life-feat-bonn', 83.7, 'https://stage-verse.vercel.app');
        expect(link).toBe('https://stage-verse.vercel.app/?song=high-on-life-feat-bonn&t=83');
        expect(readSongLink(new URL(link).search)).toEqual({ slug: 'high-on-life-feat-bonn', t: 83 });
    });

    it('leave the time out at the very start', () => {
        expect(songLink('yellow', 0.4, 'https://x.test')).toBe('https://x.test/?song=yellow');
        expect(readSongLink('?song=yellow')).toEqual({ slug: 'yellow', t: 0 });
    });

    it('ignore anything that is not a plain slug or a sane time', () => {
        for (const bad of ['', '?t=30', '?song=', '?song=../etc/passwd', '?song=<script>', '?song=Yellow', `?song=${'a'.repeat(81)}`]) expect(readSongLink(bad)).toBeNull();
        expect(readSongLink('?song=yellow&t=abc')).toEqual({ slug: 'yellow', t: 0 });
        expect(readSongLink('?song=yellow&t=-5')).toEqual({ slug: 'yellow', t: 0 });
        expect(readSongLink('?song=yellow&t=999999')).toEqual({ slug: 'yellow', t: 3600 });
    });
});
