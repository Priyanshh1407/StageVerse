import * as THREE from 'three';

// The mainstage's screen content: the LED wall, the twelve fins and the crown play one picture together,
// centred on the DJ (positions in metres on the stage, so the whole structure is one canvas), the way an EDM
// main stage's video content is mapped across its whole set. Eleven visuals in the manner of real main-stage
// content, each locked to the beat:
//   0 tunnel      neon frames rushing out of the centre, the classic EDM tunnel
//   1 kaleido     a rotating kaleidoscope, mirrored left to right
//   2 warp        hyperspace light streaks flying out from the centre
//   3 horizon     a retro sun over a perspective grid, the grid running toward the crowd
//   4 spectrum    a mirrored spectrum analyser, bars jumping on the beat out across the fins
//   5 plasma      slow liquid colour
//   6 hexes       a honeycomb lighting in rings from the centre on the beat
//   7 shockwave   rings bursting out of the DJ on every kick, with light rays
//   8 glitch      sliced and displaced bands with a colour split (drops)
//   9 chevrons    arrows racing out along the fins from the centre
//  10 starfield   twinkling stars drifting in the dark (intros, outros)
// Added for more variety (any song, a demo or an upload, gets them: they are chosen from the music):
//  11 fire        flames and embers rising from the floor of the canvas (peaks, drops)
//  12 rain        streaks of light falling down the fins (breakdowns, quiet parts)
//  13 lasergrid   thin moving lines crossing like a laser grid
//  14 heartbeat   a double pulse spreading from the crown on every beat (builds)
//  15 countdown   4, 3, 2, 1 on the beats of each bar with a ring filling round it (not played: the developer removed it)
//  16 liquid      a liquid-metal ripple in the show's colours
//  17 finswap     the fins (columns 4.6 m apart) swapping the show's two colours on every beat
// The desert stage's own (pop and Bollywood; the song title is drawn on its wall as text, StageLedWall):
//  18 sunset      a desert sun setting over the dunes, the sky in the show's colours
//  19 palms       palm silhouettes against a sun that pulses on the beat
//  20 paint       a hand-painted colour wash, flowing
//  21 mandala     a rangoli / mandala turning out from the centre (Bollywood)
//  22 rays        slow rays of light from above (quiet parts)
//  23 livefeed    the side screens as a live camera feed: the singer backlit, scan lines, a REC dot
// Which one plays is chosen from the music (visualFor): by the stage's set, the song's genre and the part of the
// song, changing on the beat every few bars.

export const MAINSTAGE_VISUALS = ['tunnel', 'kaleido', 'warp', 'horizon', 'spectrum', 'plasma', 'hexes', 'shockwave', 'glitch', 'chevrons', 'starfield',
    'fire', 'rain', 'lasergrid', 'heartbeat', 'countdown', 'liquid', 'finswap',
    'sunset', 'palms', 'paint', 'mandala', 'rays', 'livefeed'];

const V = Object.fromEntries(MAINSTAGE_VISUALS.map((name, i) => [name, i]));
const set = (list, every) => ({ list: list.map((n) => V[n]), every });
// The visuals each part of a song takes turns with (a new one every `every` beats), by stage and genre. The
// mainstage's EDM set is the default for any genre it has no set of its own for.
const SETS = {
    mainstage: {
        edm: {
            // (the fin swap every other turn in a peak, and in grooves: it was too rare to be seen)
            peak: set(['tunnel', 'finswap', 'shockwave', 'fire', 'finswap', 'kaleido', 'spectrum', 'finswap', 'warp', 'lasergrid'], 16),
            build: set(['chevrons', 'warp', 'heartbeat'], 16),
            groove: set(['horizon', 'finswap', 'hexes', 'lasergrid', 'spectrum', 'finswap', 'liquid', 'kaleido'], 32),
            breakdown: set(['plasma', 'liquid', 'kaleido', 'rain'], 32),
            quiet: set(['starfield', 'rain', 'plasma'], 64),
        },
        rap: {
            peak: set(['shockwave', 'finswap', 'fire', 'spectrum', 'finswap', 'lasergrid'], 16),
            build: set(['chevrons', 'heartbeat', 'warp'], 16),
            groove: set(['hexes', 'lasergrid', 'liquid', 'spectrum'], 32),
            breakdown: set(['rain', 'liquid'], 32),
            quiet: set(['starfield', 'rain'], 64),
        },
        pop: {
            peak: set(['kaleido', 'finswap', 'tunnel', 'shockwave', 'finswap', 'spectrum'], 16),
            build: set(['heartbeat', 'chevrons', 'warp'], 16),
            groove: set(['horizon', 'liquid', 'kaleido', 'hexes'], 32),
            breakdown: set(['plasma', 'rain'], 32),
            quiet: set(['starfield', 'plasma'], 64),
        },
        bollywood: {
            peak: set(['mandala', 'finswap', 'kaleido', 'shockwave', 'finswap', 'fire'], 16),
            build: set(['heartbeat', 'chevrons', 'mandala'], 16),
            groove: set(['mandala', 'kaleido', 'liquid', 'horizon'], 32),
            breakdown: set(['mandala', 'plasma'], 32),
            quiet: set(['starfield', 'rays'], 64),
        },
    },
    desert: {
        pop: {
            peak: set(['paint', 'kaleido', 'shockwave', 'palms'], 16),
            build: set(['rays', 'heartbeat', 'sunset'], 16),
            groove: set(['sunset', 'livefeed', 'palms', 'paint'], 32),
            breakdown: set(['rays', 'livefeed', 'plasma'], 32),
            quiet: set(['rays', 'starfield'], 64),
        },
        bollywood: {
            peak: set(['mandala', 'paint', 'kaleido', 'shockwave'], 16),
            build: set(['mandala', 'rays', 'heartbeat'], 16),
            groove: set(['mandala', 'sunset', 'livefeed', 'paint'], 32),
            breakdown: set(['rays', 'mandala', 'livefeed'], 32),
            quiet: set(['rays', 'starfield'], 64),
        },
        edm: {
            peak: set(['shockwave', 'paint', 'kaleido', 'palms'], 16),
            build: set(['heartbeat', 'rays', 'sunset'], 16),
            groove: set(['sunset', 'palms', 'livefeed', 'paint'], 32),
            breakdown: set(['rays', 'plasma'], 32),
            quiet: set(['rays', 'starfield'], 64),
        },
    },
};
// (a desert song in a genre without a set of its own: pop's; the mainstage's: EDM's)
const FALLBACK = { mainstage: 'edm', desert: 'pop' };

/**
 * The visual to play for a look (an index into MAINSTAGE_VISUALS), and how energetic it should move (0..1), on a
 * stage's set ('mainstage' or 'desert') for the song's genre (look.songGenre).
 */
export function visualFor(look, stageSet = 'mainstage') {
    if (look.screenVisual !== undefined) return { index: V[look.screenVisual] ?? look.screenVisual, energy: look.crowd ?? 0.5 };
    // (the drop: the glitch on the mainstage, the paint wash bursting on the desert)
    if ((look.dropFx ?? 0) > 0.3) return { index: stageSet === 'desert' ? V.paint : V.glitch, energy: 1 };
    const crowd = look.crowd ?? ((look.intensity ?? 1) >= 1.2 ? 1 : (look.intensity ?? 1) >= 0.8 ? 0.4 : 0.12);
    const part = crowd >= 1 ? 'peak' : crowd >= 0.5 ? 'build' : crowd >= 0.25 ? 'groove' : crowd >= 0.15 ? 'breakdown' : 'quiet';
    const stage = SETS[stageSet] ?? SETS.mainstage;
    const sets = stage[look.songGenre] ?? stage[FALLBACK[stageSet] ?? 'edm'];
    const chosen = sets[part];
    const beat = look.beatPos ?? 0;
    return { index: chosen.list[Math.floor(beat / chosen.every) % chosen.list.length], energy: crowd };
}
/** The mainstage's choice (kept for the callers that name it). */
export const mainstageVisualFor = (look) => visualFor(look, 'mainstage');

export const VISUALS_GLSL = /* glsl */ `
    uniform float uTime;
    uniform float uBeat;
    uniform float uPulse;
    uniform float uStrobe;
    uniform float uEnergy;
    uniform int uVis;
    uniform vec2 uCentre;
    uniform float uScale;
    uniform vec3 uColorA;
    uniform vec3 uColorB;

    float vh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(vh(i), vh(i + vec2(1.0, 0.0)), f.x), mix(vh(i + vec2(0.0, 1.0)), vh(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    float fbm(vec2 p) {
        float s = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 4; i++) { s += amp * vn(p); p *= 2.03; amp *= 0.5; }
        return s;
    }
    // a thin bright line at every whole value of v (w: its half-width, as a share of the spacing)
    float thinLine(float v, float w) { return smoothstep(w, 0.0, 0.5 - abs(fract(v) - 0.5)); }
    float segDist(vec2 q, vec2 a, vec2 b) {
        vec2 pa = q - a;
        vec2 ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h);
    }
    vec3 vpal(float t) { return mix(uColorA, uColorB, 0.5 + 0.5 * sin(6.2832 * t)); }
    float band(float v, float width) { return smoothstep(width, 0.0, abs(fract(v) - 0.5) - (0.5 - width)); }

    vec3 tunnel(vec2 p, float kick) {
        float d = max(abs(p.x) * 0.5, abs(p.y));
        // (rings no closer than the LED pixels can show: densest at the centre, they blurred to a flat colour)
        float z = 0.5 / (d + 0.16) + uTime * (0.9 + 1.4 * uEnergy);
        float ring = smoothstep(0.12, 0.0, abs(fract(z) - 0.5) - 0.32);
        return vpal(floor(z) * 0.17) * ring * smoothstep(0.0, 0.12, d) * (0.75 + 0.7 * kick) * 1.5;
    }
    vec3 kaleido(vec2 p, float r, float a, float kick) {
        float n = 8.0;
        float seg = 6.2832 / n;
        float aa = abs(mod(a + uTime * (0.08 + 0.25 * uEnergy), seg) - seg * 0.5);
        vec2 q = r * vec2(cos(aa), sin(aa));
        q.x -= uTime * 0.25;
        float pat = sin(q.x * 7.0) * cos(q.y * 9.0 + uTime * 0.7);
        float lines = smoothstep(0.18, 0.0, abs(pat));
        return mix(uColorA, uColorB, smoothstep(0.1, 1.6, r)) * (lines * 1.3 + 0.06) * (0.8 + 0.6 * kick);
    }
    vec3 warp(float r, float a) {
        float rays = 64.0;
        float sector = floor(a * rays / 6.2832);
        float rnd = vh(vec2(sector, 1.0));
        float s = fract(r * 0.45 - uTime * (0.6 + rnd * 1.4) * (0.6 + uEnergy) - rnd);
        float streak = smoothstep(0.0, 0.04, s) * smoothstep(0.35, 0.04, s) * step(0.3, rnd);
        float thin = smoothstep(0.5, 0.0, abs(fract(a * rays / 6.2832) - 0.5) - 0.15);
        return mix(vec3(1.0), vpal(rnd), 0.55) * streak * thin * smoothstep(0.05, 0.6, r) * 1.8;
    }
    vec3 horizon(vec2 p, float kick) {
        float h = -0.12;
        if (p.y < h) {
            float y = h - p.y;
            float z = 0.5 / y;
            float gx = band(p.x * z * 0.9, 0.06);
            float gz = band(z * 0.7 - uTime * (0.6 + uEnergy), 0.08);
            return uColorB * min(1.0, gx + gz) * smoothstep(0.0, 0.25, y) * (1.1 + 0.4 * kick);
        }
        vec2 s = p - vec2(0.0, 0.32);
        float sun = smoothstep(0.6, 0.57, length(s));
        float cut = s.y < 0.0 ? step(0.0, sin(s.y * 55.0 + uTime * 3.0)) : 1.0;
        vec3 sky = mix(uColorB, uColorA, smoothstep(-0.1, 1.0, p.y)) * 0.12;
        return sky + mix(uColorA * 1.4, mix(uColorB, vec3(1.0), 0.3), smoothstep(0.55, -0.4, s.y)) * sun * cut;
    }
    vec3 spectrum(vec2 p, float kick) {
        float x = abs(p.x) * 9.0;
        float col = floor(x);
        float h = (0.12 + 0.88 * vh(vec2(col, floor(uBeat * 2.0)))) * (0.5 + 0.5 * kick) * (1.0 - abs(p.x) * 0.12);
        float y = abs(p.y + 0.1);
        float bar = step(y, h) * smoothstep(0.5, 0.36, abs(fract(x) - 0.5));
        float seg = smoothstep(0.5, 0.3, abs(fract(y * 14.0) - 0.5));
        float peak = smoothstep(0.03, 0.0, abs(y - h - 0.04)) * smoothstep(0.5, 0.36, abs(fract(x) - 0.5));
        return mix(uColorA, uColorB, smoothstep(0.0, 0.9, y)) * bar * seg * 1.4 + vec3(peak) * 1.2;
    }
    vec3 plasma(vec2 p) {
        vec2 q = p * 1.3;
        float t = uTime * (0.35 + 0.4 * uEnergy);
        float v = sin(q.x * 2.1 + t) + sin(q.y * 3.0 - t * 0.8) + sin((q.x + q.y) * 1.7 + t * 0.6) + sin(length(q * 2.2) - t * 1.3);
        return mix(uColorA, uColorB, 0.5 + 0.5 * sin(v * 1.5)) * (0.3 + 0.28 * sin(v * 3.0 + t));
    }
    vec3 hexes(vec2 p, float kick) {
        vec2 q = p * 5.0;
        vec2 s = vec2(1.0, 1.7320508);
        vec2 a = mod(q, s) - s * 0.5;
        vec2 b = mod(q - s * 0.5, s) - s * 0.5;
        vec2 g = dot(a, a) < dot(b, b) ? a : b;
        vec2 id = q - g;
        float edge = max(abs(g.x) * 0.866 + abs(g.y) * 0.5, abs(g.y));
        float rim = smoothstep(0.42, 0.47, edge);
        float wave = band(length(id) * 0.12 - uBeat * 0.5, 0.18);
        float fill = (1.0 - rim) * (0.06 + 0.9 * wave * (0.6 + 0.6 * kick));
        return vpal(length(id) * 0.04 + uTime * 0.05) * (fill + rim * 0.25) * 1.3;
    }
    vec3 shockwave(float r, float a, float kick) {
        float t = fract(uBeat);
        float ring1 = smoothstep(0.07, 0.0, abs(r - t * 3.4)) * (1.0 - t);
        float t2 = fract(uBeat + 0.5);
        float ring2 = smoothstep(0.05, 0.0, abs(r - t2 * 3.4)) * (1.0 - t2) * 0.5;
        float rays = pow(max(0.0, sin(a * 12.0 + uTime * 0.6)), 24.0) * exp(-r * 0.7) * (0.4 + kick);
        float core = exp(-r * 4.0) * (0.5 + kick);
        return uColorA * ring1 * 1.8 + uColorB * ring2 * 1.5 + mix(uColorB, vec3(1.0), 0.4) * rays + vec3(1.0) * core * 0.6;
    }
    vec3 glitch(vec2 p, vec2 w) {
        float slice = floor(w.y * 1.4);
        float tick = floor(uTime * 14.0);
        float shift = (vh(vec2(slice, tick)) - 0.5) * 1.2 * step(0.55, vh(vec2(slice, tick + 7.0)));
        vec2 q = vec2(p.x + shift, p.y);
        float barsA = band(q.x * 3.0 + uTime * 2.0, 0.2);
        float barsB = band((q.x + 0.06) * 3.0 + uTime * 2.0, 0.2);
        float noiseRow = step(0.93, vh(vec2(floor(w.y * 6.0), tick)));
        return uColorA * barsA * 1.4 + uColorB * barsB * 1.2 + vec3(noiseRow) * 0.8;
    }
    vec3 chevrons(vec2 p, float kick) {
        float v = (abs(p.x) - abs(p.y) * 0.7) * 2.2 - uTime * (1.2 + 2.0 * uEnergy) - uBeat * 0.25;
        float arrow = band(v, 0.12);
        return mix(uColorA, uColorB, step(0.5, fract(v * 0.5))) * arrow * (0.8 + 0.6 * kick) * 1.4 * smoothstep(0.0, 0.4, abs(p.x));
    }
    vec3 starfield(vec2 w) {
        vec2 cell = floor(w * 1.6 + vec2(uTime * 0.15, 0.0));
        float star = step(0.93, vh(cell));
        float tw = 0.5 + 0.5 * sin(uTime * 2.0 + vh(cell + 3.0) * 30.0);
        vec3 haze = mix(uColorA, uColorB, 0.5 + 0.5 * sin(w.x * 0.05 + uTime * 0.1)) * 0.05;
        return haze + mix(vec3(1.0), uColorA, 0.3) * star * tw * 0.9;
    }

    vec3 fire(vec2 p, float kick) {
        float y = p.y + 1.0;
        float n = fbm(vec2(p.x * 2.2, y * 1.7 - uTime * (1.3 + uEnergy)));
        float flame = clamp(n * 1.7 - y * 0.55 + 0.3 + 0.3 * kick, 0.0, 1.0);
        vec3 hot = mix(mix(vec3(1.0, 0.42, 0.06), uColorA, 0.3), vec3(1.0, 0.93, 0.7), flame * flame);
        float ember = step(0.985, vh(floor(vec2(p.x * 28.0, p.y * 28.0 - uTime * 7.0)))) * smoothstep(1.4, -0.4, p.y);
        return hot * flame * flame * 1.9 + vec3(1.0, 0.6, 0.2) * ember * 1.3;
    }
    vec3 rain(vec2 w) {
        float col = floor(w.x / 0.45);
        float rnd = vh(vec2(col, 3.0));
        float s = fract(w.y * 0.11 + uTime * (0.5 + rnd * 0.9) * (0.6 + uEnergy) + rnd * 7.0);
        float drop = exp(-s * 11.0) * step(0.35, rnd);
        return mix(uColorA, vec3(1.0), 0.35) * drop * 1.5 + uColorB * 0.03;
    }
    vec3 lasergrid(vec2 p) {
        float t = uTime * (0.4 + uEnergy);
        float l1 = thinLine(p.x * 4.0 + p.y * 1.5 + t, 0.035);
        float l2 = thinLine(p.x * 4.0 - p.y * 1.5 - t * 0.7, 0.035);
        float l3 = thinLine(p.y * 5.0 + sin(p.x * 2.0 + t) * 0.3 - t * 0.5, 0.03);
        return uColorA * (l1 + l2) * 1.8 + uColorB * l3 * 1.4;
    }
    vec3 heartbeat(vec2 p, float kick) {
        vec2 q = (p - vec2(0.0, 0.85)) * vec2(0.8, 1.0);
        float r = length(q);
        float b = fract(uBeat);
        float b2 = b - 0.22;
        float ring1 = smoothstep(0.08, 0.0, abs(r - b * 3.0)) * (1.0 - b);
        float ring2 = b2 > 0.0 ? smoothstep(0.06, 0.0, abs(r - b2 * 3.0)) * (1.0 - b2) * 0.7 : 0.0;
        float core = exp(-r * 3.0) * (exp(-b * 6.0) + 0.6 * exp(-abs(b2) * 14.0));
        vec3 c = mix(uColorB, vec3(1.0, 0.2, 0.3), 0.3);
        return c * (ring1 * 1.8 + ring2 * 1.4) + mix(c, vec3(1.0), 0.4) * core * 1.6;
    }
    vec3 countdown(vec2 p, float kick) {
        // 4, 3, 2, 1 on the four beats of the bar, as seven-segment digits, a ring filling round them
        float digit = 4.0 - floor(fract(uBeat / 4.0) * 4.0);
        vec2 q = p / 0.5;
        vec2 TL = vec2(-0.5, 1.0); vec2 TR = vec2(0.5, 1.0); vec2 ML = vec2(-0.5, 0.0); vec2 MR = vec2(0.5, 0.0);
        vec2 BL = vec2(-0.5, -1.0); vec2 BR = vec2(0.5, -1.0);
        float d = 1e3;
        if (digit != 1.0 && digit != 4.0) d = min(d, segDist(q, TL, TR));
        d = min(d, segDist(q, TR, MR));
        if (digit != 2.0) d = min(d, segDist(q, MR, BR));
        if (digit != 1.0 && digit != 4.0) d = min(d, segDist(q, BL, BR));
        if (digit == 2.0) d = min(d, segDist(q, ML, BL));
        if (digit == 4.0) d = min(d, segDist(q, TL, ML));
        if (digit != 1.0) d = min(d, segDist(q, ML, MR));
        float figure = smoothstep(0.16, 0.08, d) * (0.7 + 0.6 * kick);
        float r = length(q);
        float ang = fract(atan(q.x, q.y) / 6.2832 + 1.0);
        float ring = smoothstep(0.12, 0.0, abs(r - 1.55)) * step(ang, fract(uBeat));
        return mix(uColorA, vec3(1.0), 0.5) * figure * 1.8 + uColorB * ring * 1.5 + uColorB * 0.04;
    }
    vec3 liquid(vec2 p) {
        float t = uTime * (0.3 + 0.5 * uEnergy);
        vec2 c1 = vec2(sin(t * 0.7) * 1.2, cos(t * 0.5) * 0.5);
        vec2 c2 = vec2(cos(t * 0.6) * 1.4, sin(t * 0.8) * 0.6);
        float v = sin(length(p - c1) * 9.0 - t * 3.0) + sin(length(p - c2) * 7.0 - t * 2.4) + sin(p.x * 3.0 + t);
        float spec = pow(0.5 + 0.5 * sin(v * 1.7), 12.0);
        vec3 metal = mix(vec3(0.25, 0.27, 0.32), vec3(0.9), 0.5 + 0.5 * sin(v));
        return metal * 0.35 * mix(vec3(1.0), uColorA, 0.5) + mix(uColorA, uColorB, 0.5 + 0.5 * sin(v * 0.7)) * 0.35 + vec3(spec) * 1.2;
    }
    vec3 finswap(vec2 w, float kick) {
        // columns 4.6 m apart, as the fins stand (the first centred 16.5 m out), odd and even swapping on the beat
        float id = floor((abs(w.x) - 14.2) / 4.6);
        float swap = mod(id + floor(uBeat), 2.0);
        vec3 c = swap > 0.5 ? uColorA : uColorB;
        return abs(w.x) < 14.2 ? mix(uColorA, uColorB, 0.5) * 0.22 * (0.6 + kick) : c * (1.0 + 0.6 * kick);
    }
    vec3 desertSky(vec2 p) { return mix(mix(vec3(1.0, 0.45, 0.15), uColorA, 0.35), uColorB * 0.6, smoothstep(-0.4, 1.0, p.y)); }
    vec3 sunset(vec2 p, float kick) {
        vec3 c = desertSky(p) * 0.55;
        vec2 s = p - vec2(0.0, -0.05 + 0.08 * sin(uTime * 0.08));
        float sun = smoothstep(0.47, 0.44, length(s)) * (s.y < 0.0 ? step(0.0, sin(s.y * 48.0 + uTime * 2.0)) : 1.0);
        c += mix(vec3(1.0, 0.75, 0.35), vec3(1.0), 0.3) * sun * (1.2 + 0.3 * kick);
        float dune = -0.4 + 0.08 * sin(p.x * 2.3 + 0.5) + 0.05 * sin(p.x * 5.1 + 1.0);
        return p.y < dune ? uColorB * 0.05 : c;
    }
    float palm(vec2 p, vec2 base, float h) {
        vec2 top = base + vec2(0.12 * h, h);
        float trunk = smoothstep(0.035, 0.02, segDist(p, base, top));
        vec2 q = p - top;
        float fr = 0.0;
        for (int k = 0; k < 7; k++) {
            float ang = -0.4 + float(k) * 0.85 + 0.05 * sin(uTime * 0.8 + float(k));
            vec2 dir = vec2(cos(ang), sin(ang));
            float s = clamp(dot(q, dir), 0.0, 0.6);
            float d = length(q - (dir * s - vec2(0.0, 0.6 * s * s)));
            fr = max(fr, smoothstep(0.035 * (1.0 - s / 0.6) + 0.006, 0.0, d));
        }
        return max(trunk, fr);
    }
    vec3 palms(vec2 p, float kick) {
        vec3 c = desertSky(p) * 0.45;
        float sun = smoothstep(0.5 * (1.0 + 0.1 * kick), 0.46, length(p - vec2(0.0, 0.1)));
        c += vec3(1.0, 0.8, 0.45) * sun * 1.2;
        float trees = max(max(palm(p, vec2(-1.7, -1.0), 1.25), palm(p, vec2(1.6, -1.0), 1.05)), max(palm(p, vec2(-2.7, -1.0), 0.9), palm(p, vec2(2.8, -1.0), 1.2)));
        return mix(c, vec3(0.01, 0.008, 0.012), trees);
    }
    vec3 paint(vec2 p, float kick) {
        vec2 q = p * 1.2;
        float t = uTime * 0.15 * (1.0 + uEnergy);
        vec2 warp2 = vec2(fbm(q + vec2(t, 0.0)), fbm(q + vec2(5.2, 1.3) - t));
        float f = fbm(q + 2.0 * warp2);
        vec3 c = mix(uColorA, uColorB, smoothstep(0.3, 0.7, f));
        float stroke = smoothstep(0.06, 0.0, abs(fract(f * 6.0) - 0.5) - 0.38);
        return c * (0.45 + 0.8 * f) * (0.8 + 0.4 * kick) + mix(c, vec3(1.0), 0.5) * stroke * 0.5;
    }
    vec3 mandala(float r, float a, float kick) {
        float rr = r * (1.0 - 0.06 * kick);
        float k1 = smoothstep(0.03, 0.0, abs(rr - 0.35 - 0.12 * cos(a * 12.0 + uTime * 0.4)));
        float k2 = smoothstep(0.03, 0.0, abs(rr - 0.75 - 0.10 * cos(a * 16.0 - uTime * 0.3)));
        float k3 = smoothstep(0.025, 0.0, abs(rr - 1.15 - 0.08 * cos(a * 24.0 + uTime * 0.2)));
        float dots = step(0.9, cos(a * 24.0 + uTime * 0.2)) * smoothstep(0.05, 0.0, abs(rr - 1.42));
        float core = exp(-rr * 5.0) * (0.5 + kick);
        return uColorA * k1 * 1.6 + uColorB * k2 * 1.5 + vec3(1.0, 0.75, 0.3) * k3 * 1.4 + vec3(1.0) * (dots + core) * 1.2;
    }
    vec3 rays(vec2 p) {
        vec2 q = p - vec2(0.0, 1.3);
        float a = atan(q.x, -q.y);
        float ray = pow(max(0.0, sin(a * 9.0 + uTime * 0.15)), 6.0) * smoothstep(3.0, 0.0, length(q));
        return mix(uColorA, vec3(1.0, 0.9, 0.7), 0.4) * ray * 1.9 + uColorB * 0.05;
    }
    vec3 livefeed(vec2 p, vec2 w, float kick) {
        // the main wall keeps the rays; each side screen (11 x 18 m, centred 35.5 m out, 12 m up) a live feed of the singer
        vec2 q = vec2(abs(w.x) - 35.5, w.y - 12.0) / 9.0;
        vec3 back = mix(uColorB, mix(uColorA, vec3(1.0), 0.3), smoothstep(-1.0, 0.8, q.y)) * (0.6 + 0.4 * kick);
        float head = smoothstep(0.17, 0.15, length(q - vec2(0.0, 0.42)));
        float body = smoothstep(0.02, 0.0, max(abs(q.x) - 0.32 + q.y * 0.08, q.y - 0.24));
        float mic = smoothstep(0.02, 0.0, segDist(q, vec2(0.18, -1.0), vec2(0.06, 0.32)));
        float figure = max(max(head, body), mic);
        float scan = 0.85 + 0.15 * sin(w.y * 36.0 + uTime * 4.0);
        float rec = smoothstep(0.06, 0.04, length(q - vec2(-0.5, 0.88))) * step(0.5, fract(uTime * 0.8));
        vec3 feed = mix(back, vec3(0.01), figure) * scan + vec3(1.0, 0.05, 0.05) * rec * 1.5;
        return abs(w.x) < 28.0 ? rays(p) : feed;
    }

    /** The content at a point on the stage (metres): the visual playing now, and white on a strobe frame. */
    vec3 visual(vec2 w) {
        vec2 p = (w - uCentre) / uScale;
        float r = length(p);
        float a = atan(p.y, p.x);
        float kick = exp(-fract(uBeat) * 5.0) * 0.6 + uPulse * 0.6;
        vec3 c;
        if (uVis == 0) c = tunnel(p, kick);
        else if (uVis == 1) c = kaleido(p, r, a, kick);
        else if (uVis == 2) c = warp(r, a);
        else if (uVis == 3) c = horizon(p, kick);
        else if (uVis == 4) c = spectrum(p, kick);
        else if (uVis == 5) c = plasma(p);
        else if (uVis == 6) c = hexes(p, kick);
        else if (uVis == 7) c = shockwave(r, a, kick);
        else if (uVis == 8) c = glitch(p, w);
        else if (uVis == 9) c = chevrons(p, kick);
        else if (uVis == 10) c = starfield(w);
        else if (uVis == 11) c = fire(p, kick);
        else if (uVis == 12) c = rain(w);
        else if (uVis == 13) c = lasergrid(p);
        else if (uVis == 14) c = heartbeat(p, kick);
        else if (uVis == 15) c = countdown(p, kick);
        else if (uVis == 16) c = liquid(p);
        else if (uVis == 17) c = finswap(w, kick);
        else if (uVis == 18) c = sunset(p, kick);
        else if (uVis == 19) c = palms(p, kick);
        else if (uVis == 20) c = paint(p, kick);
        else if (uVis == 21) c = mandala(r, a, kick);
        else if (uVis == 22) c = rays(p);
        else c = livefeed(p, w, kick);
        return mix(c, vec3(1.6), uStrobe);
    }
`;

/** The uniforms the visuals read, for a canvas centred on `centre` ([x, y] metres) and `scale` metres high (half). */
export function visualsUniforms(centre, scale) {
    return {
        uTime: { value: 0 }, uBeat: { value: 0 }, uPulse: { value: 0 }, uStrobe: { value: 0 }, uEnergy: { value: 0.5 },
        uVis: { value: V.plasma }, uCentre: { value: new THREE.Vector2(...centre) }, uScale: { value: scale },
        uColorA: { value: new THREE.Color('#19d9ff') }, uColorB: { value: new THREE.Color('#ff3df2') },
    };
}

/** Each frame: the visual, the beat and the strobe frame from the look (the colours and time are set by the caller). */
export function driveVisuals(u, target, clock, stageSet = 'mainstage') {
    const { index, energy } = visualFor(target, stageSet);
    u.uVis.value = index;
    u.uEnergy.value += (energy - u.uEnergy.value) * 0.05;
    u.uBeat.value = target.beatPos ?? clock * 2;
    u.uPulse.value = target.pulse ?? 0;
    // the wordmark (the wall only): 4 bars in every 8 of a song, always in its quiet parts and when no song plays,
    // never on a drop; fading in and out
    if (u.uLogo) {
        const beat = target.beatPos;
        const want = (target.dropFx ?? 0) > 0.3 ? 0 : beat === undefined || energy < 0.25 || Math.floor(beat / 16) % 2 === 0 ? 1 : 0;
        u.uLogo.value += (want - u.uLogo.value) * 0.06;
    }
    u.uStrobe.value = (target.strobe ?? 0) > 0.5 || (target.dropFx ?? 0) > 0.6 ? ((clock * 12.5) % 1 < 0.3 ? 0.85 : 0) : Math.max(0, Math.min(0.8, (target.blinder ?? 0) * 0.6));
}

/**
 * The main LED wall with the mainstage's visuals, the wordmark laid over them (the same content masks and
 * uniforms as ../stageMaterials.js createLedMaterial, so the wall's own updates still apply).
 */
export function createVisualsWallMaterial({ textTexture = null, grid = [300, 180], centre, scale }) {
    return new THREE.ShaderMaterial({
        uniforms: {
            ...visualsUniforms(centre, scale),
            uBrightness: { value: 1 },
            uText: { value: textTexture },
            uTextPrev: { value: textTexture },
            uTextMix: { value: 1 },
            uHasText: { value: textTexture ? 1 : 0 },
            uGrid: { value: new THREE.Vector2(...grid) },
            uStars: { value: 0.2 },
            uLogo: { value: 1 },
            // the wall's place within its stage (its mesh's own matrix): the visuals are laid out in the stage's own
            // metres, so they line up with the fins whether or not the stage is turned
            uLocal: { value: new THREE.Matrix4() },
        },
        vertexShader: /* glsl */ `
            uniform mat4 uLocal;
            varying vec2 vUv;
            varying vec3 vWorld;
            void main() {
                vUv = uv;
                vWorld = (uLocal * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            ${VISUALS_GLSL}
            uniform float uBrightness;
            uniform sampler2D uText;
            uniform sampler2D uTextPrev;
            uniform float uTextMix;
            uniform float uHasText;
            uniform vec2 uGrid;
            uniform float uLogo;
            varying vec2 vUv;
            varying vec3 vWorld;
            void main() {
                vec2 uv = vUv;
                // the content sampled at the centre of each LED pixel
                vec2 cellUv = (floor(uv * uGrid) + 0.5) / uGrid;
                vec2 w = vWorld.xy + (cellUv - uv) * (fwidth(vWorld.xy) / max(fwidth(uv), vec2(1e-6)));
                vec3 color = visual(w) * 1.35;
                if (uHasText > 0.5) {
                    // (the wordmark takes turns with the visuals: uLogo 1 = shown, the visuals behind it dark so it reads)
                    vec3 m = mix(texture2D(uTextPrev, uv).rgb, texture2D(uText, uv).rgb, uTextMix) * uLogo;
                    float s = fract(uTime * 0.12) * 1.8 - 0.4;
                    float shine = smoothstep(0.07, 0.0, abs(uv.x - s + (uv.y - 0.5) * 0.35));
                    vec3 headline = mix(mix(uColorA, vec3(1.0), 0.3), mix(uColorB, vec3(1.0), 0.3), smoothstep(0.15, 0.85, uv.x)) * 1.9 + vec3(shine) * 1.6;
                    vec3 glow = mix(uColorB, uColorA, 0.35) * 1.5;
                    color *= 1.0 - clamp(m.r + m.g * 0.8 + m.b, 0.0, 0.97);
                    color *= 1.0 - 0.45 * uLogo;
                    color += (headline * m.r + glow * m.g * (1.0 - m.r) + vec3(1.5) * m.b) * 1.25;
                }
                vec2 f = fract(uv * uGrid);
                float pixel = smoothstep(0.0, 0.18, f.x) * smoothstep(1.0, 0.82, f.x) * smoothstep(0.0, 0.18, f.y) * smoothstep(1.0, 0.82, f.y);
                vec2 cellPx = 1.0 / max(fwidth(uv * uGrid), vec2(1e-4));
                float visible = smoothstep(2.0, 4.0, min(cellPx.x, cellPx.y));
                float grid = mix(0.62, 0.35 + 0.65 * pixel, visible);
                gl_FragColor = vec4(color * grid * uBrightness, 1.0);
            }
        `,
        toneMapped: false,
    });
}

/** The fins' and crown's fragment shader (StageScreens' vertex shader: vWorld = world position, vNormal). */
export const VISUALS_SCREEN_FRAGMENT = /* glsl */ `
    ${VISUALS_GLSL}
    uniform float uLevel;
    uniform float uPitch;
    varying vec3 vWorld;
    varying vec3 vNormal;
    void main() {
        float front = smoothstep(0.4, 0.7, vNormal.z);
        vec2 cell = floor(vWorld.xy / uPitch);
        vec2 inCell = fract(vWorld.xy / uPitch);
        float led = smoothstep(0.5, 0.18, length(inCell - 0.5));
        vec3 c = visual((cell + 0.5) * uPitch);
        vec3 base = vec3(0.015, 0.017, 0.024) * (0.4 + 0.6 * led);
        gl_FragColor = vec4(base + c * led * uLevel * front * 2.6, 1.0);
    }
`;
