// Build the homepage's demo songs from the genre folders.
//
//   npm run demos
//
// Every song in public/audio/<genre>/ (edm, pop, rap, bollywood) is analysed with that genre's
// settings and programmed into public/shows/<slug>.show.json, and public/shows/index.json lists them
// for the homepage, which loads a song's show only when it's picked (so more songs don't slow the
// page down). At most MAX_PER_GENRE songs per genre are listed (alphabetically by file name).
//
// <slug> is the file name in lower case with dashes ("Yellow.mp3" -> yellow). Per-song touches stay
// in public/shows/<slug>.extras.json: the "title" and "artist" shown on the site (without it, the
// file name is the title), colours, a hand-marked structure.
import fs from 'node:fs';
import path from 'node:path';
import decode from 'audio-decode';
import { analyseSong } from '../lib/show/analysis.js';
import { programShow } from '../lib/show/program.js';
import { GENRE_KEYS, GENRES } from '../lib/show/genres.js';

const MAX_PER_GENRE = 4;   // (rap has four: the two added on 26 Nov 2026)
const AUDIO = /\.(mp3|m4a|ogg|wav|flac)$/i;
const slugOf = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const demos = [];
for (const genre of GENRE_KEYS) {
    const dir = path.join('public', 'audio', genre);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => AUDIO.test(f)).sort();
    if (files.length > MAX_PER_GENRE) {
        console.warn(`${GENRES[genre].label}: ${files.length} songs, listing the first ${MAX_PER_GENRE} (${files.slice(MAX_PER_GENRE).join(', ')} left out)`);
    }
    for (const file of files.slice(0, MAX_PER_GENRE)) {
        const name = path.basename(file, path.extname(file));
        const slug = slugOf(name);
        const extrasFile = `public/shows/${slug}.extras.json`;
        const extras = fs.existsSync(extrasFile) ? JSON.parse(fs.readFileSync(extrasFile, 'utf8')) : null;
        const title = extras?.title ?? name;
        const artist = extras?.artist ?? null;

        const started = Date.now();
        const { channelData, sampleRate } = await decode(fs.readFileSync(path.join(dir, file)));
        const analysis = analyseSong(channelData, sampleRate, { genre });
        const audio = `/audio/${genre}/${file}`;
        const programmed = programShow(analysis, { title, audio, extras, genre });
        // (extras.doubleTime: the beat was found at half the song's pulse, so the lights hit every other kick; a beat
        // added halfway between each two, the bars and sections where they were. Love Dose: its kick lands halfway
        // nearly as hard as on the beats found, 74%, where a song read right, Ashke, has 45%)
        const show = extras?.doubleTime ? doubleTime(programmed) : programmed;
        fs.writeFileSync(`public/shows/${slug}.show.json`, `${JSON.stringify({ ...show, artist })}\n`);
        demos.push({ slug, title, artist, genre, show: `/shows/${slug}.show.json` });
        console.log(`${GENRES[genre].label.padEnd(9)} ${title}${artist ? ` (${artist})` : ''}: ${fmt(analysis.duration)}, ${show.bpm} BPM${extras?.doubleTime ? ' (double time)' : ''}, `
            + `${analysis.sections.length} sections${extras?.sections ? ' (hand-marked structure from extras)' : ''}, ${Date.now() - started} ms`);
    }
}
/** A show with a beat added halfway between each two (every kick hit), the downbeats where they were. */
function doubleTime(show) {
    const beats = show.beats.flatMap((t, i) => (i + 1 < show.beats.length ? [t, Math.round(((t + show.beats[i + 1]) / 2) * 1000) / 1000] : [t]));
    return { ...show, bpm: Math.round(show.bpm * 20) / 10, beats, downbeats: show.downbeats.map((i) => i * 2) };
}

fs.writeFileSync('public/shows/index.json', `${JSON.stringify({ maxPerGenre: MAX_PER_GENRE, demos }, null, 2)}\n`);
console.log(`\n${demos.length} demo songs -> public/shows/index.json`);
const empty = GENRE_KEYS.filter((g) => !demos.some((d) => d.genre === g));
if (empty.length) console.log(`No songs yet in: ${empty.map((g) => `public/audio/${g}/`).join(', ')}`);
