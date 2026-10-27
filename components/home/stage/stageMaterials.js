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
                float sparkle = step(0.999 - uStars * 0.012, hash(cell * 97.0 + floor(uTime * 6.0)));
                color += vec3(sparkle) * 0.8;

                if (uHasText > 0.5) {
                    vec4 text = texture2D(uText, uv);
                    color = mix(color, text.rgb * 1.6, text.a);
                }

                // Dark gaps between LED pixels
                vec2 f = fract(uv * uGrid);
                float pixel = smoothstep(0.0, 0.18, f.x) * smoothstep(1.0, 0.82, f.x) * smoothstep(0.0, 0.18, f.y) * smoothstep(1.0, 0.82, f.y);
                gl_FragColor = vec4(color * (0.35 + 0.65 * pixel) * uBrightness, 1.0);
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
            varying vec3 vWorld;
            void main() {
                float fromStage = max(0.0, vWorld.z);                    // stage front is at z = 0
                float spill = exp(-fromStage * 0.055) * smoothstep(30.0, 4.0, abs(vWorld.x));
                float streak = exp(-abs(vWorld.x) * 0.35) * exp(-fromStage * 0.05) * 0.5;
                vec3 tint = mix(uColorA, uColorB, smoothstep(-14.0, 14.0, vWorld.x));
                gl_FragColor = vec4(vec3(0.008, 0.009, 0.016) + tint * (spill + streak) * 0.22 * uLight, 1.0);
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
 * Text for the main screen: the StageVerse wordmark plus the next upcoming events.
 * Drawn once into a canvas (and again only when the events change).
 */
export function createScreenTextTexture(events = []) {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 910;
    const ctx = canvas.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';

    ctx.font = '900 220px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillText('STAGEVERSE', canvas.width / 2, 330);

    const upcoming = events.slice(0, 2);
    if (upcoming.length) {
        ctx.font = '700 64px system-ui, -apple-system, "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText('UP NEXT', canvas.width / 2, 560);
        ctx.font = '600 58px system-ui, -apple-system, "Segoe UI", sans-serif';
        upcoming.forEach((e, i) => {
            const line = [e.title, e.city, e.date].filter(Boolean).join('  ·  ');
            ctx.fillText(line.length > 52 ? `${line.slice(0, 51)}…` : line, canvas.width / 2, 660 + i * 90);
        });
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
}
