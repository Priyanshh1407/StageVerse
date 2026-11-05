// Analyses a visitor's song off the main thread (it takes a few seconds) and programs its light
// show: the same code as `npm run analyse:song`. The audio never leaves the visitor's device;
// only the decoded samples (left and right, for the vocal detection) and the chosen genre are
// passed in, and only the show (timings and numbers) comes back.
import { analyseSong } from '@/lib/show/analysis';
import { programShow } from '@/lib/show/program';

self.onmessage = (event) => {
    const { channels, sampleRate, title, genre } = event.data;
    try {
        const analysis = analyseSong(channels, sampleRate, { genre });
        // a visitor's song gets the CO2 jets too (a blast on each drop or chorus, and a CO2 solo)
        self.postMessage({ ok: true, show: programShow(analysis, { title, genre, extras: { co2: true } }) });
    } catch (error) {
        self.postMessage({ ok: false, error: String(error?.message || error) });
    }
};
