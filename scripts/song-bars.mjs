// Bar-by-bar features of a song (loudness, onset density, brightness, bass hits), for annotating
// its structure by hand in public/shows/<slug>.extras.json ("sections" by bar).
//   npm run song:bars -- "public/audio/Yellow.mp3"
import fs from 'node:fs';
import decode from 'audio-decode';
import { toMono, decimate, frameFeatures, onsetEnvelope, estimateTempo, trackBeats, findDownbeats, normalisedLoudness } from '../lib/show/analysis.js';

const file = process.argv[2];
const { channelData, sampleRate } = await decode(fs.readFileSync(file));
const factor = Math.max(1, Math.floor(sampleRate / 22050));
const signal = decimate(toMono(channelData), factor);
const sr = sampleRate / factor;
const feats = frameFeatures(signal, sr);
const { fps, offset } = feats;
const full = onsetEnvelope(feats.flux, fps);
const bass = onsetEnvelope(feats.bassFlux, fps);
const onset = full.map((v, i) => (v + bass[i]) / 2);
const bpm = estimateTempo(onset, fps);
const beats = trackBeats(onset, fps, bpm);
const downs = findDownbeats(beats, bass);
const loud = normalisedLoudness(feats.rms);
const mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
console.log(`bpm ${bpm.toFixed(1)}  bars ${downs.length}`);
console.log('bar  time   loud  dens  bright bassHit  |loudness bar');
for (let d = 0; d < downs.length; d++) {
    const from = beats[downs[d]];
    const to = d + 1 < downs.length ? beats[downs[d + 1]] : feats.frames;
    const sl = (arr) => Array.from(arr.slice(from, to));
    const l = mean(sl(loud));
    const dn = mean(sl(full));
    const br = mean(sl(feats.centroid)) / 4000;
    const bh = mean(sl(bass));
    console.log(`${String(d).padStart(3)}  ${fmt(from / fps + offset).padStart(5)}  ${l.toFixed(2)}  ${dn.toFixed(2)}  ${br.toFixed(2)}   ${bh.toFixed(2)}   |${'#'.repeat(Math.round(l * 30))}`);
}
