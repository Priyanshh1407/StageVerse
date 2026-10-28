// Analyses a visitor's song off the main thread (it takes a few seconds) and programs its light
// show: the same code as `npm run analyse:song`. The audio never leaves the visitor's device;
// only the decoded samples are passed in, and only the show (timings and numbers) comes back.
import { analyseSong } from '@/lib/show/analysis';
import { programShow } from '@/lib/show/program';

self.onmessage = (event) => {
    const { pcm, sampleRate, title } = event.data;
    try {
        const analysis = analyseSong([pcm], sampleRate);
        self.postMessage({ ok: true, show: programShow(analysis, { title }) });
    } catch (error) {
        self.postMessage({ ok: false, error: String(error?.message || error) });
    }
};
