import * as THREE from 'three';

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
 * Arena floor: dark, catching coloured light spilling off the front of the stage, strongest at
 * the stage edge and fading toward the audience (plus a faint glossy streak under the centre).
 */
export function createFloorMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uColorA: { value: new THREE.Color('#19d9ff') },
            uColorB: { value: new THREE.Color('#ff3df2') },
            uLight: { value: 0.5 },
            uHouse: { value: 0 },
            uFlash: { value: 0 },
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
            uniform float uHouse;
            uniform float uFlash;
            varying vec3 vWorld;
            void main() {
                // House lights: the whole room in warm, even light
                vec3 house = vec3(1.0, 0.7, 0.28) * uHouse * (0.09 + 0.05 * smoothstep(40.0, 0.0, abs(vWorld.x))) * step(vWorld.z, 33.4);
                float fromStage = max(0.0, vWorld.z);                    // stage front is at z = 0
                float spill = exp(-fromStage * 0.055) * smoothstep(30.0, 4.0, abs(vWorld.x));
                float streak = exp(-abs(vWorld.x) * 0.35) * exp(-fromStage * 0.05) * 0.5;
                vec3 tint = mix(uColorA, uColorB, smoothstep(-14.0, 14.0, vWorld.x));
                gl_FragColor = vec4(vec3(0.008, 0.009, 0.016) + tint * (spill + streak) * 0.22 * uLight + house + vec3(0.55) * uFlash, 1.0);
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
            upcoming.forEach((e, i) => {
                const text = [e.title, e.city, e.date].filter(Boolean).join('  ·  ');
                line(text.length > 52 ? `${text.slice(0, 51)}…` : text, 740 + i * 70, 46, 500, 0.04);
            });
        }
    }

    // Pack the three masks into the colour channels of one texture
    const out = layer();
    const img = out.ctx.createImageData(W, H);
    const [r, g, b] = [head, glow, small].map((l) => l.ctx.getImageData(0, 0, W, H).data);
    for (let i = 0; i < img.data.length; i += 4) {
        img.data[i] = r[i + 3];
        img.data[i + 1] = g[i + 3];
        img.data[i + 2] = b[i + 3];
        img.data[i + 3] = 255;
    }
    out.ctx.putImageData(img, 0, 0);
    const texture = new THREE.CanvasTexture(out.c);
    texture.anisotropy = 4; // linear data (masks), so no sRGB conversion
    return texture;
}
