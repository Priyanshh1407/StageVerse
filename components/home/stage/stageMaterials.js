import * as THREE from 'three';
import { DECK_HEIGHT } from './trussGeometry';

// Materials for the parts of the stage that aren't fixtures: the LED screens and the backdrop.

/**
 * LED screen: procedural VJ visuals (flowing light streaks + soft colour waves in the show's
 * colours), an LED pixel grid, and an optional text texture (event names) on top.
 * `grid` is the panel's pixel resolution, so small screens don't get huge pixels.
 */
export function createLedMaterial({ textTexture = null, grid = [160, 70], seed = 0 } = {}) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uColorA: { value: new THREE.Color('#19d9ff') },
            uColorB: { value: new THREE.Color('#ff3df2') },
            uBrightness: { value: 1 },
            uText: { value: textTexture },
            uTextPrev: { value: textTexture },
            uTextMix: { value: 1 },
            uHasText: { value: textTexture ? 1 : 0 },
            uGrid: { value: new THREE.Vector2(...grid) },
            uSeed: { value: seed },
            uStars: { value: 0.2 },
        },
        vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform vec3 uColorA;
            uniform vec3 uColorB;
            uniform float uBrightness;
            uniform sampler2D uText;
            uniform sampler2D uTextPrev;
            uniform float uTextMix;
            uniform float uHasText;
            uniform vec2 uGrid;
            uniform float uSeed;
            uniform float uStars;
            varying vec2 vUv;

            float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed) * 43758.5453); }

            void main() {
                vec2 uv = vUv;
                // Snap to the LED pixel grid so visuals look like an LED panel
                vec2 cell = floor(uv * uGrid) / uGrid;

                // Rising light streaks in random columns
                float column = floor(cell.x * 64.0);
                float speed = 0.15 + hash(vec2(column, 1.0)) * 0.6;
                float y = fract(cell.y * 0.8 - uTime * speed + hash(vec2(column, 2.0)));
                float streak = smoothstep(0.0, 0.2, y) * smoothstep(0.42, 0.2, y) * step(0.6, hash(vec2(column, 3.0)));

                // Slow waves blending the two show colours
                float wave = 0.5 + 0.5 * sin(cell.x * 7.0 + uTime * 0.7 + sin(cell.y * 5.0 - uTime * 0.4) * 2.2);
                vec3 color = mix(uColorA, uColorB, wave) * (0.12 + 0.55 * streak);

                // Sparkle: "stars" on the panel; the song's peaks fill the screens with them
                float sparkle = step(0.999 - uStars * 0.012, hash(cell * 97.0 + floor(uTime * 2.0)));
                color += vec3(sparkle) * 0.8;

                if (uHasText > 0.5) {
                    // Content masks (see createScreenContent): R = headline, G = neon glow, B = small text.
                    // Crossfade from the previous content while the screen changes.
                    vec3 m = mix(texture2D(uTextPrev, uv).rgb, texture2D(uText, uv).rgb, uTextMix);
                    // Headline: the show's colours across the word, a white shine sweeping through it
                    float s = fract(uTime * 0.12) * 1.8 - 0.4;
                    float shine = smoothstep(0.07, 0.0, abs(uv.x - s + (uv.y - 0.5) * 0.35));
                    vec3 headline = mix(mix(uColorA, vec3(1.0), 0.3), mix(uColorB, vec3(1.0), 0.3), smoothstep(0.15, 0.85, uv.x)) * 1.9 + vec3(shine) * 1.6;
                    vec3 glow = mix(uColorB, uColorA, 0.35) * 1.5;
                    color *= 1.0 - clamp(m.r + m.g * 0.4 + m.b, 0.0, 0.85);   // darken the visuals behind the text
                    color += headline * m.r + glow * m.g * (1.0 - m.r) + vec3(1.5) * m.b;
                }

                // Dark gaps between LED pixels
                vec2 f = fract(uv * uGrid);
                float pixel = smoothstep(0.0, 0.18, f.x) * smoothstep(1.0, 0.82, f.x) * smoothstep(0.0, 0.18, f.y) * smoothstep(1.0, 0.82, f.y);
                // When an LED cell is smaller than ~3 screen pixels the grid can't be drawn without
                // aliasing (shimmering moire), so fade it to its average brightness instead
                vec2 cellPx = 1.0 / max(fwidth(uv * uGrid), vec2(1e-4));
                float visible = smoothstep(2.0, 4.0, min(cellPx.x, cellPx.y));
                float grid = mix(0.62, 0.35 + 0.65 * pixel, visible);
                gl_FragColor = vec4(color * grid * uBrightness, 1.0);
            }
        `,
        toneMapped: false,
    });
}

/**
 * Arena floor: glossy black (item 3, option 2). Instead of a broad colour smear it reflects what is
 * in front of it: the LED wall, the lit rig and the LED edge of the deck, found by tracing the
 * mirrored view ray in the shader (no extra render pass), blurred a little and stronger at grazing
 * angles. Where the beams land in front of the stage there are tighter pools of light.
 */
export function createFloorMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uColorA: { value: new THREE.Color('#19d9ff') },
            uColorB: { value: new THREE.Color('#ff3df2') },
            uLight: { value: 0 },    // the aerial beams reaching the audience floor (0 = none: the floor stays dark)
            uWall: { value: 0 },     // the LED wall's faint reflection
            uHouse: { value: 0 },
            uFlash: { value: 0 },
            uTime: { value: 0 },
        },
        vertexShader: /* glsl */ `
            varying vec3 vWorld;
            void main() {
                vec4 w = modelMatrix * vec4(position, 1.0);
                vWorld = w.xyz;
                gl_Position = projectionMatrix * viewMatrix * w;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform vec3 uColorA;
            uniform vec3 uColorB;
            uniform float uLight;
            uniform float uWall;
            uniform float uHouse;
            uniform float uFlash;
            uniform float uTime;
            varying vec3 vWorld;

            const float DECK_TOP = ${DECK_HEIGHT.toFixed(2)};
            // A soft-edged rectangle test: 1 inside, fading out over blur metres
            float softRect(vec2 p, vec2 lo, vec2 hi, float blur) {
                vec2 a = smoothstep(lo - blur, lo + blur, p) * (1.0 - smoothstep(hi - blur, hi + blur, p));
                return a.x * a.y;
            }
            // What the polished floor reflects at this point: trace the mirrored view ray back to the
            // planes of the LED wall (z = -17.2), the rig (z = -9) and the deck edge (z = 0)
            vec3 reflection(vec3 w, vec3 tint) {
                vec3 v = normalize(w - cameraPosition);
                vec3 r = vec3(v.x, -v.y, v.z);                        // mirrored in the floor
                if (r.z > -0.01 || w.z < 0.0) return vec3(0.0);       // only looking back toward the stage
                float dist = length(w - cameraPosition);
                float blur = 0.25 + (w.z) * 0.06;                     // rougher with distance from the stage
                vec3 c = vec3(0.0);
                // The deck's LED edge, a thin line right at the stage front
                float tE = (0.0 - w.z) / r.z;
                vec3 e = w + r * tE;
                c += tint * softRect(e.xy, vec2(-15.0, DECK_TOP - 0.06), vec2(15.0, DECK_TOP + 0.02), 0.05 + blur * 0.15) * 0.35 * uLight;
                // The rig: lit trusses and beam bases, a broad glow
                float tR = (-9.0 - w.z) / r.z;
                vec3 g = w + r * tR;
                c += tint * softRect(g.xy, vec2(-15.0, DECK_TOP), vec2(15.0, 18.0), 2.5 + blur) * 0.08 * uLight;
                // The LED wall, hidden below the deck top
                float tW = (-17.2 - w.z) / r.z;
                vec3 s = w + r * tW;
                float wall = softRect(s.xy, vec2(-13.0, DECK_TOP), vec2(13.0, 13.0), 0.6 + blur);
                c += mix(tint, vec3(1.0), 0.25) * wall * 0.3 * uWall;
                float fresnel = 0.25 + 0.75 * pow(1.0 - abs(v.y), 4.0);
                return c * fresnel * smoothstep(80.0, 20.0, dist);
            }
            // Tighter pools where the beams land: soft ellipses in front of the stage that drift
            // slowly side to side, alternating the two colours
            vec3 pools(vec3 w) {
                vec3 c = vec3(0.0);
                for (int i = 0; i < 4; i++) {
                    float fi = float(i);
                    float x = (fi - 1.5) * 7.0 + sin(uTime * 0.35 + fi * 1.7) * 1.4;
                    float z = 3.5 + mod(fi, 2.0) * 3.0 + sin(uTime * 0.27 + fi) * 0.8;
                    vec2 d = (w.xz - vec2(x, z)) / vec2(1.3, 2.0);
                    float pool = exp(-dot(d, d) * 1.6);
                    c += mix(uColorA, uColorB, mod(fi, 2.0)) * pool;
                }
                return c;
            }

            // Outside the venue (beyond the gate wall at z = 34.75): wet asphalt. Bright things in
            // the scene smear into long vertical streaks on a wet road, so the reflections are
            // drawn as streaks under each light: the doorway, the pillar floods, the neon sign.
            float rnoise(vec2 p) { return fract(sin(dot(floor(p), vec2(127.1, 311.7))) * 43758.5453); }
            vec3 wetRoad(vec3 w) {
                float outside = smoothstep(34.8, 35.6, w.z);
                if (outside <= 0.0) return vec3(0.0);
                float d = w.z - 34.8;
                float ripple = 0.75 + 0.5 * rnoise(w.xz * vec2(6.0, 1.5));
                float fade = exp(-d * 0.07);
                vec3 refl = vec3(0.0);
                refl += vec3(0.25, 0.75, 1.0) * exp(-abs(w.x + 2.4) * 0.9) * 0.55;   // doorway (cyan side)
                refl += vec3(0.75, 0.3, 1.0) * exp(-abs(w.x - 2.4) * 0.9) * 0.55;    // doorway (magenta side)
                refl += vec3(0.8, 0.85, 1.0) * exp(-abs(abs(w.x) - 8.6) * 1.4) * 0.5; // pillar floods
                refl += vec3(0.1, 0.8, 1.0) * exp(-abs(w.x + 4.0) * 0.5) * 0.18 + vec3(0.8, 0.25, 1.0) * exp(-abs(w.x - 4.0) * 0.5) * 0.18; // sign
                // Lane markings and a kerb line
                float dash = step(0.5, fract(w.x / 5.0)) * smoothstep(0.12, 0.0, abs(w.z - 48.0));
                float solid = smoothstep(0.1, 0.0, abs(w.z - 58.0)) + smoothstep(0.15, 0.0, abs(w.z - 37.2));
                vec3 asphalt = vec3(0.012, 0.014, 0.022) + vec3(0.18) * (dash + solid) * (0.35 + 0.65 * fade);
                return (asphalt + refl * fade * ripple) * outside;
            }
            void main() {
                // House lights: the whole room in warm, even light
                vec3 house = vec3(1.0, 0.7, 0.28) * uHouse * (0.16 + 0.09 * smoothstep(40.0, 0.0, abs(vWorld.x))) * step(vWorld.z, 33.4);
                float fromStage = max(0.0, vWorld.z);                    // stage front is at z = 0
                vec3 tint = mix(uColorA, uColorB, smoothstep(-14.0, 14.0, vWorld.x));
                float inside = step(vWorld.z, 33.4);
                // A faint bounce right at the stage edge, so the stage still sits on the floor
                float spill = exp(-fromStage * 0.18) * smoothstep(20.0, 8.0, abs(vWorld.x)) * 0.35;
                vec3 lit = ((tint * spill * 0.22 + pools(vWorld) * 0.1) * uLight + reflection(vWorld, tint)) * inside;
                vec3 base = vec3(0.004, 0.0045, 0.008);
                // Inside the venue the floor nearest the camera fades to black, keeping the eye on the stage
                float near = smoothstep(3.0, 14.0, length(vWorld.xz - cameraPosition.xz));
                float fade = mix(1.0, near, step(vWorld.z, 33.4));
                gl_FragColor = vec4((base + lit + house + vec3(0.55) * uFlash) * fade + wetRoad(vWorld), 1.0);
            }
        `,
    });
}

/** Backdrop: a vertical gradient, a faint glow near the stage floor fading to black above. */
export function createBackdropMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uBottom: { value: new THREE.Color('#1a0b3a') },
            uTop: { value: new THREE.Color('#010208') },
        },
        vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
            uniform vec3 uBottom;
            uniform vec3 uTop;
            varying vec2 vUv;
            void main() {
                float t = smoothstep(0.0, 0.7, vUv.y);
                float centre = 1.0 - smoothstep(0.0, 0.6, abs(vUv.x - 0.5));
                gl_FragColor = vec4(mix(uBottom * (0.6 + 0.6 * centre), uTop, t), 1.0);
            }
        `,
        depthWrite: false,
    });
}

/**
 * Content for the main LED wall, drawn once per change as masks in three channels, which the LED
 * shader colours live: R = the headline (filled with the show's colours and a moving shine),
 * G = its neon glow and outline, B = small text in white.
 *   { kind: 'brand' }                    the STAGEVERSE wordmark, tagline and the next events
 *   { kind: 'role', key, line }          "FOR THE" + the role name + its line
 * `font` is a loaded display font family (falls back to the system font).
 */
export function createScreenContent(content = { kind: 'brand' }, { events = [], font } = {}) {
    const W = 2048;
    const H = 910;
    const family = font ? `${font}, system-ui, sans-serif` : 'system-ui, -apple-system, "Segoe UI", sans-serif';
    const layer = () => {
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const ctx = c.getContext('2d');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#fff';
        return { c, ctx };
    };
    const head = layer();
    const glow = layer();
    const small = layer();
    const spacing = (ctx, px) => { if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`; };

    // Headline, with its glow: a wide blurred stroke plus a crisp thin outline
    const headline = (text, y, size) => {
        let px = size;
        head.ctx.font = `900 ${px}px ${family}`;
        spacing(head.ctx, px * 0.08);
        while (head.ctx.measureText(text).width > W * 0.9 && px > 60) { px -= 8; head.ctx.font = `900 ${px}px ${family}`; spacing(head.ctx, px * 0.08); }
        head.ctx.fillText(text, W / 2, y);
        glow.ctx.font = head.ctx.font;
        spacing(glow.ctx, px * 0.08);
        glow.ctx.filter = 'blur(18px)';
        glow.ctx.lineWidth = px * 0.09;
        glow.ctx.strokeText(text, W / 2, y);
        glow.ctx.filter = 'none';
        glow.ctx.lineWidth = Math.max(2, px * 0.012);
        glow.ctx.strokeText(text, W / 2, y);
        return px;
    };
    const line = (text, y, size, weight = 600, track = 0.2) => {
        small.ctx.font = `${weight} ${size}px ${family}`;
        spacing(small.ctx, size * track);
        small.ctx.fillText(text, W / 2, y);
    };

    if (content.kind === 'role') {
        line('FOR THE', 230, 54, 700, 0.5);
        headline(content.key.toUpperCase(), 410, 300);
        // Wrap the role's line onto at most two lines
        small.ctx.font = `500 50px ${family}`;
        const words = (content.line || '').split(' ');
        const rows = [''];
        for (const w of words) {
            const next = rows[rows.length - 1] ? `${rows[rows.length - 1]} ${w}` : w;
            if (small.ctx.measureText(next).width > W * 0.78 && rows.length < 2) rows.push(w);
            else rows[rows.length - 1] = next;
        }
        rows.forEach((r, i) => line(r, 610 + i * 72, 50, 500, 0.04));
        small.ctx.fillRect(W / 2 - 160, 690 + rows.length * 30, 320, 6);
    } else {
        const px = headline('STAGEVERSE', 330, 250);
        small.ctx.fillRect(W / 2 - px * 2.6, 470, px * 5.2, 5);
        line('THE ENTIRE CONCERT ECOSYSTEM', 530, 46, 700, 0.35);
        const upcoming = events.slice(0, 2);
        if (upcoming.length) {
            line('UP NEXT', 660, 40, 800, 0.5);
            // Title, city (left out when the title already names it) and date. The line shrinks to fit;
            // if it still doesn't, only the title is shortened, so the city and date always show.
            const maxWidth = W * 0.86;
            const width = (text, size) => {
                small.ctx.font = `500 ${size}px ${family}`;
                spacing(small.ctx, size * 0.04);
                return small.ctx.measureText(text).width;
            };
            upcoming.forEach((e, i) => {
                const title = e.title || '';
                const city = e.city && !title.toLowerCase().includes(e.city.toLowerCase()) ? e.city : '';
                const join = (t) => [t, city, e.date].filter(Boolean).join('  ·  ');
                let size = 46;
                while (size > 32 && width(join(title), size) > maxWidth) size -= 2;
                let text = join(title);
                for (let short = title; width(text, size) > maxWidth && short.length > 8;) {
                    short = short.slice(0, -1).trimEnd();
                    text = join(`${short}…`);
                }
                line(text, 740 + i * 70, size, 500, 0.04);
            });
        }
    }

    // Pack the three masks into the colour channels of one texture, on the canvas itself: each layer
    // is recoloured to its channel (keeping its alpha), then added onto black. Reading the pixels
    // back and packing them in a 7-million-step loop froze the page for up to a second, at load
    // and at every change of the LED wall while scrolling.
    const out = layer();
    out.ctx.fillStyle = '#000';
    out.ctx.fillRect(0, 0, W, H);
    out.ctx.globalCompositeOperation = 'lighter';
    for (const [l, channel] of [[head, '#ff0000'], [glow, '#00ff00'], [small, '#0000ff']]) {
        l.ctx.filter = 'none';
        l.ctx.globalCompositeOperation = 'source-in';
        l.ctx.fillStyle = channel;
        l.ctx.fillRect(0, 0, W, H);
        out.ctx.drawImage(l.c, 0, 0);
    }
    const texture = new THREE.CanvasTexture(out.c);
    texture.anisotropy = 4; // linear data (masks), so no sRGB conversion
    return texture;
}
