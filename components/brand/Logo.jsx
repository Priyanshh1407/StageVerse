import { Sedgwick_Ave_Display, Yellowtail } from 'next/font/google';

// The StageVerse logo (change 11, option 23a): "Stage" sprayed as a tag, in white with a magenta and
// a cyan offset, and "Verse" in a sunset brush script. Both fonts are open-licence Google Fonts,
// bundled with the site by next/font (no request to Google at runtime).
// Exported so the 3D stage can draw the same logo on the LED wall and the gate sign.
export const logoTag = Sedgwick_Ave_Display({ weight: '400', subsets: ['latin'], display: 'swap' });
export const logoScript = Yellowtail({ weight: '400', subsets: ['latin'], display: 'swap' });

// font sizes of "Stage" and "Verse" (the script runs a little larger to match the tag's height)
const SIZES = {
    sm: { stage: 20, verse: 23, offset: 1.5 },
    md: { stage: 27, verse: 30, offset: 2 },
    lg: { stage: 38, verse: 42, offset: 2.5 },
    xl: { stage: 52, verse: 58, offset: 3 },
};

/**
 * `size`: sm (dashboard sidebars and bars), md (the site navbar), lg (sign-in pages), xl.
 * `theme`: "dark" for dark backgrounds (white "Stage"); "auto" follows the page's light/dark theme
 * (dark ink "Stage" and a deeper sunset on a light page).
 */
export default function Logo({ size = 'md', theme = 'dark', className = '' }) {
    const s = SIZES[size] ?? SIZES.md;
    const offsets = `${s.offset}px ${s.offset}px 0 #ff3df2, -${s.offset / 2}px -${s.offset / 2}px 0 #19d9ff`;
    return (
        <span role="img" aria-label="StageVerse" className={`inline-flex items-center gap-[0.12em] leading-none select-none ${theme === 'auto' ? 'sv-logo-auto' : ''} ${className}`}>
            <span aria-hidden="true" className={`${logoTag.className} inline-block -rotate-[4deg] ${theme === 'auto' ? 'text-[#0b0d16] dark:text-white' : 'text-white'}`}
                style={{ fontSize: s.stage, lineHeight: 0.9, textShadow: offsets }}>
                Stage
            </span>
            <span aria-hidden="true" className={`${logoScript.className} sv-logo-verse inline-block px-[0.12em]`} style={{ fontSize: s.verse, lineHeight: 1 }}>
                Verse
            </span>
        </span>
    );
}
