import * as THREE from 'three';

// Moving heads drawn from a real fixture model (public/fixtures/moving-head.glb) plus fake
// volumetric beams, with no real lights. Each fixture group (role) is a handful of instanced
// draw calls (base, yoke, head, beam, lens glow) sharing one uniforms object.
//
// All movement happens on the GPU. For each fixture the shader works out where it should point
// (sweep, convergence), solves the pan and tilt that aim the model's lens there, then:
//   base  stays put, yoke rotates by pan, head rotates by tilt then pan,
//   beam  starts at the lens and goes along the aim, lens glow flares when aimed at the camera.
//
// Model space (as authored): Z up, lens = +Z at rest, tilt axis = X, pan axis = Z, head pivot
// at z = 0.358. Per-instance attributes: aBase (pan, tilt at rest), aPhase, aColorMix, and the
// mounting basis aUp (world direction of the model's +Z) and aXAxis (of its +X);
// instanceMatrix holds only the mounting point.
export const BEAM_LENGTH = 30;
export const MODEL = { pivot: 0.358, lens: 0.13 };

export function createRoleUniforms({ scale = 2.3, spread = 1, opacity = 1 } = {}) {
    return {
        uTime: { value: 0 },
        uPhase: { value: 0 },           // movement position, accumulated from speed (never jumps)
        uSpeed: { value: 0.6 },
        uFan: { value: 1 },
        uTiltShift: { value: 0 },
        uPhaseSpread: { value: 0.25 },
        uSweep: { value: 0.3 },
        uConverge: { value: 0 },
        uIntensity: { value: 1 },
        uHaze: { value: 0.5 },
        uTarget: { value: new THREE.Vector3(0, 4.5, -6.5) }, // the centre of the stage (where the drop focuses)
        uSideways: { value: 0 },        // 1 = swing fully sideways (floor fixtures on the drop)
        uColorA: { value: new THREE.Color('#19d9ff') },
        uColorB: { value: new THREE.Color('#ff3df2') },
        uScale: { value: scale },       // model size (the model is authored ~0.55 m tall)
        uSpread: { value: spread },     // beam width multiplier (washes are wide)
        uOpacity: { value: opacity },   // beam density (washes are soft)
        uMap: { value: null },          // the model's texture
    };
}

export function createBeamGeometry() {
    // Narrow cone, apex at the origin pointing down -Y (rotated onto the aim in the shader)
    const geometry = new THREE.CylinderGeometry(0.1, 1.15, BEAM_LENGTH, 24, 1, true);
    geometry.translate(0, -BEAM_LENGTH / 2, 0);
    return geometry;
}

// Shared GLSL: aim, mounting and the pan/tilt solve
const RIG_GLSL = /* glsl */ `
    uniform float uTime;
    uniform float uPhase;
    uniform float uSpeed;
    uniform float uSweep;
    uniform float uFan;
    uniform float uTiltShift;
    uniform float uPhaseSpread;
    uniform float uConverge;
    uniform vec3 uTarget;
    uniform float uSideways;
    uniform float uScale;
    attribute vec2 aBase;
    attribute float aPhase;
    attribute vec3 aUp;
    attribute vec3 aXAxis;

    const float PIVOT = ${MODEL.pivot.toFixed(3)};
    const float LENS = ${MODEL.lens.toFixed(3)};

    // Where the beam should point (world space). The position comes from the cue (fan width,
    // tilt); movement is one coordinated effect: a pan sweep shared by the whole row, offset along
    // the row by phaseSpread (0 = unison, 1 = a wave). "phase" is the fixture's place in its row.
    vec3 aimDirection(vec3 from, vec2 base, float phase) {
        float t = uPhase + phase * uPhaseSpread * 6.2832;
        float pan = base.x * uFan + sin(t) * uSweep;
        float tilt = base.y + uTiltShift + sin(t * 2.0) * uSweep * 0.12;
        vec3 sweepDir = normalize(vec3(sin(tilt) * sin(pan), -cos(tilt), sin(tilt) * cos(pan)));
        vec3 dir = normalize(mix(sweepDir, normalize(uTarget - from), uConverge));
        // Full sideways: straight out toward this fixture's own side of the stage
        float side = from.x >= 0.0 ? 1.0 : -1.0;
        return normalize(mix(dir, normalize(vec3(side, 1.1, 0.15)), uSideways)); // out and up: a V
    }

    // Model (Z up) <-> world, through the fixture's mounting basis (standing, hanging or sideways)
    vec3 toWorld(vec3 p) { return p.x * aXAxis + p.y * cross(aUp, aXAxis) + p.z * aUp; }
    vec3 toModel(vec3 w) { return vec3(dot(w, aXAxis), dot(w, cross(aUp, aXAxis)), dot(w, aUp)); }
    vec3 rotX(vec3 p, float a) { float c = cos(a); float s = sin(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }
    vec3 rotZ(vec3 p, float a) { float c = cos(a); float s = sin(a); return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z); }

    // Pan and tilt that turn the lens (+Z at rest) onto model-space direction d:
    // rotZ(pan) * rotX(tilt) * (0,0,1) = (sin t sin p, -sin t cos p, cos t)
    // (atan(0, 0) is undefined in GLSL: when the aim is along the pan axis any pan works, so use 0)
    vec2 panTilt(vec3 d) {
        float pan = length(d.xy) > 1e-4 ? atan(d.x, -d.y) : 0.0;
        return vec2(pan, acos(clamp(d.z, -1.0, 1.0)));
    }

    // normalize() of a zero vector is NaN (some model normals are degenerate); NaN pixels get
    // smeared across the screen by bloom as flicker, so every normalize of model data goes through this
    vec3 safeNormalize(vec3 v) { float l = length(v); return l > 1e-6 ? v / l : vec3(0.0, 0.0, 1.0); }

    struct Rig { vec3 mountW; vec3 pivotW; vec3 dirW; vec2 pt; vec3 lensW; };

    Rig solveRig() {
        Rig r;
        #ifdef MOUNT_FROM_POSITION
        r.mountW = (modelMatrix * vec4(position, 1.0)).xyz;   // points can't be instanced
        #else
        r.mountW = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #endif
        r.pivotW = r.mountW + toWorld(vec3(0.0, 0.0, PIVOT * uScale));
        r.dirW = aimDirection(r.pivotW, aBase, aPhase);
        r.pt = panTilt(toModel(r.dirW));
        r.lensW = r.pivotW + r.dirW * LENS * uScale;
        return r;
    }

    // Rotating vector from (a) onto (b) (Rodrigues), for the beam cone
    vec3 rotateFromTo(vec3 v, vec3 a, vec3 b) {
        vec3 axis = cross(a, b);
        float s = length(axis);
        float c = dot(a, b);
        if (s < 1e-5) return c > 0.0 ? v : vec3(v.x, -v.y, -v.z);
        vec3 k = axis / s;
        return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
    }
`;

/**
 * One part of the fixture model ('base' | 'yoke' | 'head'), textured, with stage-style shading:
 * a dim front fill, a coloured edge light from the rig, and (head only) a lens that glows white
 * when the beam points at the camera and is dim tinted glass otherwise.
 */
export function createPartMaterial(uniforms, part) {
    const transform = {
        base: 'vec3 q = position; vec3 qn = normal;',
        yoke: 'vec3 q = rotZ(position, r.pt.x); vec3 qn = rotZ(normal, r.pt.x);',
        head: 'vec3 q = rotZ(rotX(position, r.pt.y) + vec3(0.0, 0.0, PIVOT), r.pt.x); vec3 qn = rotZ(rotX(normal, r.pt.y), r.pt.x);',
    }[part];
    return new THREE.ShaderMaterial({
        uniforms,
        defines: { IS_HEAD: part === 'head' ? 1 : 0 },
        vertexShader: /* glsl */ `
            ${RIG_GLSL}
            attribute float aColorMix;
            varying vec2 vUv;
            varying vec3 vNormalW;
            varying vec3 vViewDir;
            varying float vColorMix;
            varying float vFacing;
            varying float vLens;

            void main() {
                Rig r = solveRig();
                ${transform}
                vec3 world = r.mountW + toWorld(q * uScale);
                vNormalW = safeNormalize(toWorld(qn));
                vViewDir = normalize(cameraPosition - world);
                vUv = uv;
                vColorMix = aColorMix;
                vFacing = max(0.0, dot(r.dirW, normalize(cameraPosition - r.lensW)));
                // The lens: the round glass on the front (+Z) of the head
                vLens = IS_HEAD == 1 ? step(0.1, position.z) * step(length(position.xy), 0.095) : 0.0;
                gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform sampler2D uMap;
            uniform vec3 uColorA;
            uniform vec3 uColorB;
            uniform float uIntensity;
            varying vec2 vUv;
            varying vec3 vNormalW;
            varying vec3 vViewDir;
            varying float vColorMix;
            varying float vFacing;
            varying float vLens;

            vec3 safeNormalize(vec3 v) { float l = length(v); return l > 1e-6 ? v / l : vec3(0.0, 0.0, 1.0); }

            void main() {
                vec3 albedo = texture2D(uMap, vUv).rgb;
                vec3 n = safeNormalize(vNormalW);
                vec3 tint = mix(uColorA, uColorB, vColorMix);
                float level = min(uIntensity, 1.5);
                float fill = 0.12 + 0.5 * max(0.0, dot(n, normalize(vec3(0.15, 0.35, 1.0))));   // from front of house
                float edge = pow(clamp(1.0 - dot(n, vViewDir), 0.0, 1.0), 3.0);                // rim from the rig
                float under = max(0.0, -n.y);                                                  // bounce from below
                vec3 body = albedo * fill * 0.55 + tint * (edge * 0.35 + under * 0.12) * level;
                float flare = pow(clamp(vFacing, 0.0, 1.0), 10.0);
                vec3 lens = mix(tint * 0.18 + albedo * 0.15, mix(tint, vec3(1.0), 0.6) * 1.5, flare) * level;
                gl_FragColor = vec4(mix(body, lens, vLens), 1.0);
            }
        `,
        toneMapped: false,
    });
}

/** The beam: an additive cone from the lens along the aim, white-hot at the lens. */
export function createBeamMaterial(uniforms) {
    return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: /* glsl */ `
            ${RIG_GLSL}
            uniform float uSpread;
            attribute float aColorMix;
            varying float vAlong;
            varying float vColorMix;
            varying vec3 vNormalV;
            varying vec3 vViewDir;
            varying vec3 vWorld;

            void main() {
                Rig r = solveRig();
                vec3 down = vec3(0.0, -1.0, 0.0);
                vec3 local = position * vec3(uSpread, 1.0, uSpread);
                vec3 world = r.lensW + rotateFromTo(local, down, r.dirW);
                vec3 n = rotateFromTo(normal, down, r.dirW);
                vec4 mv = viewMatrix * vec4(world, 1.0);
                gl_Position = projectionMatrix * mv;
                vAlong = uv.y; // 1 at the lens, 0 at the far end
                vColorMix = aColorMix;
                vNormalV = normalize(mat3(viewMatrix) * n);
                vViewDir = normalize(-mv.xyz);
                vWorld = world;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform vec3 uColorA;
            uniform vec3 uColorB;
            uniform float uIntensity;
            uniform float uHaze;
            uniform float uTime;
            uniform float uOpacity;
            varying float vAlong;
            varying float vColorMix;
            varying vec3 vNormalV;
            varying vec3 vViewDir;
            varying vec3 vWorld;

            float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
            float noise(vec3 p) {
                vec3 i = floor(p);
                vec3 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
                    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
                    f.z);
            }

            void main() {
                float facing = clamp(abs(dot(normalize(vNormalV), normalize(vViewDir))), 0.0, 1.0);
                float core = pow(facing, 1.8);   // a fuller, denser cross-section
                float fade = pow(clamp(vAlong, 0.0, 1.0), 1.5);
                vec3 drift = vec3(0.0, uTime * 0.25, uTime * 0.12);
                float smoke = noise(vWorld * 0.22 + drift) * 0.65 + noise(vWorld * 0.9 + drift * 1.7) * 0.35;
                float haze = mix(1.0, 0.2 + smoke * 1.6, uHaze);
                float near = smoothstep(3.0, 16.0, length(cameraPosition - vWorld));
                float a = core * fade * haze * uIntensity * 0.75 * uOpacity * mix(0.25, 1.0, near);
                vec3 color = mix(mix(uColorA, uColorB, vColorMix), vec3(1.0), pow(clamp(vAlong, 0.0, 1.0), 8.0) * 0.55 * core);
                gl_FragColor = vec4(color, a);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
    });
}

/** Lens flare: a small white-hot point that only blooms while the beam points at the camera. */
export function createGlowMaterial(uniforms) {
    return new THREE.ShaderMaterial({
        uniforms: { ...uniforms, uSize: { value: 180 } },
        defines: { MOUNT_FROM_POSITION: 1 },
        vertexShader: /* glsl */ `
            ${RIG_GLSL}
            uniform float uSize;
            attribute float aColorMix;
            varying float vColorMix;
            varying float vFlare;
            void main() {
                Rig r = solveRig();
                vFlare = pow(clamp(dot(r.dirW, normalize(cameraPosition - r.lensW)), 0.0, 1.0), 10.0);
                vec4 mv = viewMatrix * vec4(r.lensW + r.dirW * 0.05, 1.0);
                gl_Position = projectionMatrix * mv;
                gl_PointSize = uSize * (0.04 + vFlare) / max(1.0, -mv.z);
                vColorMix = aColorMix;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform vec3 uColorA;
            uniform vec3 uColorB;
            uniform float uIntensity;
            varying float vColorMix;
            varying float vFlare;
            void main() {
                float d = length(gl_PointCoord - 0.5) * 2.0;
                float halo = pow(max(0.0, 1.0 - d), 4.0) * 0.6;
                float hot = smoothstep(0.18, 0.0, d);
                vec3 col = mix(mix(uColorA, uColorB, vColorMix), vec3(1.0), hot);
                gl_FragColor = vec4(col, (halo + hot) * min(uIntensity, 1.2) * vFlare * 0.8);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    });
}
