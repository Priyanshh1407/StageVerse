// Genres for the song analysis (item 14). The analysis was built around EDM and judged every song
// by EDM rules (sections from loudness alone, a drop at every peak). Each genre gets its own
// settings for the analysis and its own lighting style. EDM keeps the original analysis exactly,
// so it's also the baseline the test set measures the others against.
//
//   tempo      prior for the tempo estimate
//   octaveCenter  rap: after the estimate, take half or double the tempo when that's nearer this
//   structure  'energy': sections from loudness, brightness and drum density only (the original);
//              'repetition': also the chords and melody, so repeated parts (the chorus) are found
//   moments    find "silence, then the beat comes back" moments (rap)
//   rhythm     section boundaries also where the drum pattern changes (beat switches, rap)
//   follow     follow tempo changes through the song (Bollywood)
//   meter      check for rhythms in 3s and 6s instead of assuming 4 beats to a bar (Bollywood)
//   freeIntro  recognise a beatless intro and light it free-flowing instead of on the beat
//   percussion dense, loud percussion passages count as peaks even when they don't repeat
//   drop       the lighting at the start of a peak: 'spool' (EDM: blackout, lasers spool up, slam),
//              'lift' (a chorus: the whole rig lifts in with a blinder hit, no blackout),
//              'slam' (rap: strobes on the hook, blackout and slam where the beat cuts out and returns)
export const GENRES = {
    edm: { label: 'EDM', tempo: { center: 120, octaveWidth: 1.0 }, structure: 'energy', drop: 'spool' },
    pop: { label: 'Pop', tempo: { center: 110, octaveWidth: 0.9 }, structure: 'repetition', drop: 'lift', freeIntro: true },
    // rap: the wide tempo search first (a narrow one near 88 BPM locked onto trap's triplet hi-hats,
    // reading 130-140 BPM songs at 2/3 speed), then only the half/double check pulls it toward 88
    rap: { label: 'Rap', tempo: { center: 120, octaveWidth: 1.0, min: 55, max: 180 }, octaveCenter: 88, structure: 'repetition', drop: 'slam', moments: true, rhythm: true },
    bollywood: { label: 'Bollywood', tempo: { center: 100, octaveWidth: 1.0 }, structure: 'repetition', drop: 'lift', follow: true, meter: true, freeIntro: true, percussion: true },
};
export const GENRE_KEYS = Object.keys(GENRES);
export const DEFAULT_GENRE = 'edm';

/** A known genre key, or the default. */
export function normaliseGenre(genre) {
    const key = String(genre ?? '').toLowerCase();
    return GENRES[key] ? key : DEFAULT_GENRE;
}

// For the help button: which artists go in which genre, for visitors who know the artist but not
// the genre. No fifth genre: everyone maps onto these four.
export const GENRE_HINTS = {
    edm: 'Big build-ups and drops, mostly electronic.',
    pop: 'Sung verses and a catchy chorus that comes back.',
    rap: 'Mostly rapped over a steady beat.',
    bollywood: 'Indian film songs, Punjabi and Indian pop.',
};
export const ARTISTS = {
    edm: ['The Chainsmokers', 'Martin Garrix', 'Avicii', 'Calvin Harris', 'David Guetta', 'Marshmello', 'Alan Walker', 'Zedd', 'Kygo',
        'Swedish House Mafia', 'Tiësto', 'Hardwell', 'Dom Dolla', 'Fred again..', 'Skrillex', 'Alesso', 'Armin van Buuren', 'Nucleya'],
    pop: ['Maroon 5', 'Shawn Mendes', 'Justin Bieber', 'Ed Sheeran', 'Taylor Swift', 'Dua Lipa', 'The Weeknd', 'Ariana Grande', 'Coldplay',
        'Harry Styles', 'Billie Eilish', 'Bruno Mars', 'Imagine Dragons', 'OneRepublic', 'Selena Gomez', 'Charlie Puth', 'Sabrina Carpenter', 'Olivia Rodrigo'],
    rap: ['Drake', 'Eminem', 'Kendrick Lamar', 'Travis Scott', 'Kanye West', 'J. Cole', 'Lil Wayne', 'Post Malone', 'Future', 'Nicki Minaj',
        '21 Savage', 'Lil Baby', 'DIVINE', 'Raftaar', 'KR$NA', 'Emiway Bantai', 'Seedhe Maut', 'MC Stan'],
    bollywood: ['Arijit Singh', 'Pritam', 'A. R. Rahman', 'Shreya Ghoshal', 'Vishal–Shekhar', 'Badshah', 'Neha Kakkar', 'Atif Aslam', 'Sonu Nigam',
        'Sunidhi Chauhan', 'Shankar–Ehsaan–Loy', 'Amit Trivedi', 'Diljit Dosanjh', 'Guru Randhawa', 'Jubin Nautiyal', 'Anirudh Ravichander', 'Honey Singh', 'Darshan Raval'],
};

const squash = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

/** Artists matching a search, with their genre (for the help list's search box). */
export function findArtists(query) {
    const q = squash(query ?? '');
    if (!q) return [];
    return GENRE_KEYS.flatMap((genre) => ARTISTS[genre].filter((a) => squash(a).includes(q)).map((artist) => ({ artist, genre })));
}
