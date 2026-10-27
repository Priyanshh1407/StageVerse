// Analyse a song and program its light show.
//
//   npm run analyse:song -- "public/audio/A Sky Full of Stars.mp3" sky-full-of-stars "A Sky Full of Stars"
//
// Writes public/shows/<slug>.show.json: tempo, beats, downbeats, sections, loudness curve and the
// programmed cue sheet. That file is derived data (timings and numbers, not audio), so it can be
// committed; the song itself stays local (public/audio is gitignored).
import fs from 'node:fs';
import path from 'node:path';
import decode from 'audio-decode';
import { analyseSong } from '../lib/show/analysis.js';
import { programShow } from '../lib/show/program.js';

const [file, slugArg, titleArg] = process.argv.slice(2);
if (!file) {
    console.error('usage: npm run analyse:song -- <audio file> [slug] [title]');
    process.exit(1);
}
const title = titleArg || path.basename(file, path.extname(file));
const slug = slugArg || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const started = Date.now();
const { channelData, sampleRate } = await decode(fs.readFileSync(file));
const analysis = analyseSong(channelData, sampleRate);

// The browser loads the song from /audio/<file name> (only present where you put it)
const publicPath = path.relative('public', file).split(path.sep).join('/');
const audio = publicPath.startsWith('..') ? null : `/${publicPath}`;
const show = programShow(analysis, { title, audio });

fs.mkdirSync('public/shows', { recursive: true });
const out = `public/shows/${slug}.show.json`;
fs.writeFileSync(out, `${JSON.stringify(show)}\n`);

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
console.log(`${title}: ${fmt(analysis.duration)}, ${analysis.bpm} BPM, ${analysis.beats.length} beats, ${analysis.downbeats.length} bars`);
for (const s of analysis.sections) console.log(`  ${fmt(s.start)}-${fmt(s.end)}  ${s.kind.padEnd(6)} ${String(s.bars).padStart(3)} bars  energy ${s.energy.toFixed(2)}`);
console.log(`${show.cues.length} cues, ${show.hits.length} hits -> ${out} (${Date.now() - started} ms)`);
