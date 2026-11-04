// Score the song analysis against the hand-marked test set (item 14, part 6).
//
//   npm run score:analysis                 every song in tests/songs/ whose audio is on this machine
//   npm run score:analysis -- yellow       just the songs whose file name contains "yellow"
//   npm run score:analysis -- --out r.json also write the full results as JSON
//
// Each song is analysed twice: as EDM (the original analysis, the baseline) and as its own genre.
// The table shows how much the genre's analysis changed each score, for example
// "chorus 41% -> 78%". Songs whose audio isn't present are listed and skipped.
import fs from 'node:fs';
import path from 'node:path';
import decode from 'audio-decode';
import { analyseSong } from '../lib/show/analysis.js';
import { scoreSong, summarise } from '../lib/show/score.js';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const out = outIndex >= 0 ? args[outIndex + 1] : null;
const filters = args.filter((a, i) => !a.startsWith('--') && i !== outIndex + 1);

const dir = 'tests/songs';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && (!filters.length || filters.some((q) => f.includes(q))));
const pct = (v) => (v === null || v === undefined ? '  - ' : `${String(Math.round(v * 100)).padStart(3)}%`);
const rows = [];
const skipped = [];

for (const file of files) {
    const annotation = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    if (!annotation.audio || !fs.existsSync(annotation.audio)) {
        skipped.push(`${annotation.title} (no audio at ${annotation.audio})`);
        continue;
    }
    const { channelData, sampleRate } = await decode(fs.readFileSync(annotation.audio));
    const baseline = scoreSong(annotation, analyseSong(channelData, sampleRate, { genre: 'edm' }));
    const t0 = Date.now();
    const tuned = annotation.genre === 'edm' ? baseline : scoreSong(annotation, analyseSong(channelData, sampleRate, { genre: annotation.genre }));
    rows.push({ title: annotation.title, genre: annotation.genre, baseline, tuned, ms: Date.now() - t0 });
}

const line = (label, b, t) => `${label.padEnd(11)} ${pct(b)} -> ${pct(t)}`;
for (const r of rows) {
    console.log(`\n${r.title} (${r.genre}, analysed in ${r.ms} ms)        EDM  ->  ${r.genre}`);
    console.log(`  ${line('boundaries', r.baseline.boundaries.f1, r.tuned.boundaries.f1)}`);
    console.log(`  ${line('peaks', r.baseline.peaks.f1, r.tuned.peaks.f1)}`);
    console.log(`  ${line('chorus', r.baseline.chorus.f1, r.tuned.chorus.f1)}`);
    console.log(`  ${'tempo'.padEnd(11)} ${String(r.baseline.tempo).padStart(4)} -> ${r.tuned.tempo}`);
    if (r.tuned.meter !== null) console.log(`  ${'meter'.padEnd(11)} ${String(r.baseline.meter).padStart(4)} -> ${r.tuned.meter}`);
    if (r.tuned.moments !== undefined) console.log(`  ${line('moments', r.baseline.moments ?? 0, r.tuned.moments)}`);
}

const genres = [...new Set(rows.map((r) => r.genre))];
console.log('\nAverages                     EDM  ->  genre');
for (const g of [...genres, 'all']) {
    const set = rows.filter((r) => g === 'all' || r.genre === g);
    if (!set.length) continue;
    const b = summarise(set.map((r) => r.baseline));
    const t = summarise(set.map((r) => r.tuned));
    console.log(`  ${g} (${set.length} song${set.length > 1 ? 's' : ''})`);
    for (const k of ['boundaries', 'peaks', 'chorus', 'tempo', 'meter', 'moments']) if (t[k] !== null) console.log(`    ${line(k, b[k], t[k])}`);
}
if (skipped.length) console.log(`\nSkipped (audio not on this machine): ${skipped.join('; ')}`);
const perGenre = Object.fromEntries(['edm', 'pop', 'rap', 'bollywood'].map((g) => [g, rows.filter((r) => r.genre === g).length]));
const short = Object.entries(perGenre).filter(([, n]) => n < 3).map(([g, n]) => `${g} ${n}`);
if (short.length) console.log(`Test set is thin: ${short.join(', ')} (aim for 3-5 songs per genre).`);
if (out) {
    fs.writeFileSync(out, `${JSON.stringify({ date: new Date().toISOString(), rows }, null, 2)}\n`);
    console.log(`\nWrote ${out}`);
}
