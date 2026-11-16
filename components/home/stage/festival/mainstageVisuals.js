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
// Which one plays is chosen from the music (mainstageVisualFor) and changes on the beat every few bars.

export const MAINSTAGE_VISUALS = ['tunnel', 'kaleido', 'warp', 'horizon', 'spectrum', 'plasma', 'hexes', 'shockwave', 'glitch', 'chevrons', 'starfield'];

const V = Object.fromEntries(MAINSTAGE_VISUALS.map((name, i) => [name, i]));
// the visuals each part of a song takes turns with (a new one every `every` beats)
const SETS = {
    peak: { list: [V.tunnel, V.shockwave, V.kaleido, V.spectrum, V.warp], every: 16 },
    build: { list: [V.chevrons, V.warp], every: 16 },
    groove: { list: [V.horizon, V.hexes, V.spectrum, V.kaleido], every: 32 },
    breakdown: { list: [V.plasma, V.kaleido], every: 32 },
    quiet: { list: [V.starfield, V.plasma], every: 64 },
};

/** The visual to play for a look (an index into MAINSTAGE_VISUALS), and how energetic it should move (0..1). */
export function mainstageVisualFor(look) {
    if (look.screenVisual !== undefined) return { index: V[look.screenVisual] ?? look.screenVisual, energy: look.crowd ?? 0.5 };
    if ((look.dropFx ?? 0) > 0.3) return { index: V.glitch, energy: 1 };
    const crowd = look.crowd ?? ((look.intensity ?? 1) >= 1.2 ? 1 : (look.intensity ?? 1) >= 0.8 ? 0.4 : 0.12);
    const part = crowd >= 1 ? 'peak' : crowd >= 0.5 ? 'build' : crowd >= 0.25 ? 'groove' : crowd >= 0.15 ? 'breakdown' : 'quiet';
    const set = SETS[part];
    const beat = look.beatPos ?? 0;
    return { index: set.list[Math.floor(beat / set.every) % set.list.length], energy: crowd };
}

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
        else c = starfield(w);
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
export function driveVisuals(u, target, clock) {
    const { index, energy } = mainstageVisualFor(target);
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
        },
        vertexShader: /* glsl */ `
            varying vec2 vUv;
            varying vec3 vWorld;
            void main() {
                vUv = uv;
                vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
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
