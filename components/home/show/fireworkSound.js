// Firework sound (item 16): booms, crackle and pops, synthesised with the Web Audio API (no sound
// files). A shell bursts with a deep boom (glitter and chrysanthemums crackle after it); mines,
// roof comets and roman candles pop. Mixed under the music. It can be switched off on the desk.
//
// Browsers only allow sound after the visitor has clicked something, so primeFireworkSound() is
// called from a click (a desk button, playing a song); until then the booms stay silent.

let ctx = null;
let noise = null;
let enabled = true;
const VOLUME = 0.35;

export function setFireworkSound(on) {
    enabled = Boolean(on);
}

/** Create (or wake) the audio context: call from a click. */
export function primeFireworkSound() {
    if (typeof window === 'undefined') return;
    try {
        if (!ctx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            ctx = new Ctx();
            // two seconds of white noise, the raw material of every boom and crackle
            noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
            const d = noise.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        if (ctx.state === 'suspended') ctx.resume();
    } catch {
        ctx = null;
    }
}

/** A burst of filtered noise: `type` lowpass/highpass at `freq`, peaking at `gain`, decaying over `decay` s. */
function burst(when, { type = 'lowpass', freq = 300, gain = 1, decay = 1.2, rate = 1 }) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = rate;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain * VOLUME, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    src.connect(filter).connect(g).connect(ctx.destination);
    src.start(when, Math.random() * 0.5);
    src.stop(when + decay + 0.05);
}

/** The sound of one firework bursting or firing (`type`: a firework type name). */
export function fireworkBoom(type) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime + 0.02;
    if (type === 'mines' || type === 'comets' || type === 'candles' || type === 'chase') {
        burst(now, { type: 'bandpass', freq: 900, gain: 0.45, decay: 0.25, rate: 1.4 });
        return;
    }
    if (type === 'waterfall') {
        burst(now, { type: 'highpass', freq: 3000, gain: 0.25, decay: 2.5 }); // the hiss of pouring sparks
        return;
    }
    // a shell: a deep boom with a sharp crack on top
    burst(now, { type: 'lowpass', freq: 220, gain: 1.0, decay: 1.6, rate: 0.6 });
    burst(now, { type: 'highpass', freq: 1800, gain: 0.35, decay: 0.18 });
    if (type === 'glitter' || type === 'chrysanthemum') {
        // crackle: dozens of tiny pops over a second and a half
        for (let i = 0; i < 28; i++) {
            burst(now + 0.25 + Math.random() * 1.5, { type: 'highpass', freq: 2500 + Math.random() * 2500, gain: 0.12 + Math.random() * 0.1, decay: 0.03 });
        }
    }
}
