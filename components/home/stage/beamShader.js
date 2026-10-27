import * as THREE from 'three';

// Fake volumetric light: an open cone drawn with additive blending, no real light at all.
// One InstancedMesh draws every beam; each instance only stores where its fixture hangs
// (instanceMatrix translation) plus a few attributes. All movement happens here, on the GPU,
// so the CPU cost per frame is the same for 8 beams or 80.
//
// Per-instance attributes:
//   aBase      (pan, tilt) resting direction; tilt is measured from straight down (0 = down, PI = up)
//   aPhase     offset so beams don't move in lockstep
//   aColorMix  0 = colour A, 1 = colour B
// Uniforms (driven by the show's cues, the lighting desk, or later the song):
//   uSweep     how far beams swing (radians)
//   uConverge  0 = free sweep, 1 = every beam aims at uTarget (the "drop")
//   uIntensity overall brightness
//   uHaze      0 = clean air, 1 = thick smoke (grain inside the beams)
export const BEAM_LENGTH = 30;

const sharedUniforms = () => ({
    uTime: { value: 0 },
    uSpeed: { value: 0.6 },
    uSweep: { value: 0.3 },
    uConverge: { value: 0 },
    uIntensity: { value: 1 },
    uHaze: { value: 0.5 },
    uTarget: { value: new THREE.Vector3(0, 6, 14) },
    uColorA: { value: new THREE.Color('#19d9ff') },
    uColorB: { value: new THREE.Color('#ff3df2') },
});

/** One uniforms object shared by the beams and the glows, so they always agree. */
export function createRigUniforms() {
    return sharedUniforms();
}

export function createBeamGeometry() {
    // Thin at the lens, modest at the far end (the reference look has tight beams);
    // apex at the origin pointing down -Y
    const geometry = new THREE.CylinderGeometry(0.05, 0.85, BEAM_LENGTH, 20, 1, true);
    geometry.translate(0, -BEAM_LENGTH / 2, 0);
    return geometry;
}

// Shared GLSL: where a fixture points right now
const AIM_GLSL = /* glsl */ `
    uniform float uTime;
    uniform float uSpeed;
    uniform float uSweep;
    uniform float uConverge;
    uniform vec3 uTarget;

    vec3 aimDirection(vec3 fixture, vec2 base, float phase) {
        float t = uTime * uSpeed + phase;
        float pan = base.x + sin(t) * uSweep;
        float tilt = base.y + cos(t * 1.37) * uSweep * 0.45;
        vec3 sweepDir = normalize(vec3(sin(tilt) * sin(pan), -cos(tilt), sin(tilt) * cos(pan)));
        vec3 aimDir = normalize(uTarget - fixture);
        return normalize(mix(sweepDir, aimDir, uConverge));
    }

    // Rotate v by the rotation that takes unit vector a onto unit vector b (Rodrigues)
    vec3 rotateFromTo(vec3 v, vec3 a, vec3 b) {
        vec3 axis = cross(a, b);
        float s = length(axis);
        float c = dot(a, b);
        if (s < 1e-5) return c > 0.0 ? v : vec3(v.x, -v.y, -v.z);
        vec3 k = axis / s;
        return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
    }
`;

export function createBeamMaterial(uniforms) {
    return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: /* glsl */ `
            ${AIM_GLSL}
            attribute vec2 aBase;
            attribute float aPhase;
            attribute float aColorMix;
            varying float vAlong;
            varying float vColorMix;
            varying vec3 vNormalV;
            varying vec3 vViewDir;
            varying vec3 vWorld;

            void main() {
                // instanceMatrix holds only the fixture's position
                vec3 fixture = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
                vec3 dir = aimDirection(fixture, aBase, aPhase);

                vec3 down = vec3(0.0, -1.0, 0.0);
                vec3 p = rotateFromTo(position, down, dir);
                vec3 n = rotateFromTo(normal, down, dir);

                vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
                vec4 mv = viewMatrix * world;
                gl_Position = projectionMatrix * mv;

                vAlong = uv.y; // 1 at the lens, 0 at the far end
                vColorMix = aColorMix;
                vNormalV = normalize(mat3(viewMatrix) * mat3(modelMatrix) * n);
                vViewDir = normalize(-mv.xyz);
                vWorld = world.xyz;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform vec3 uColorA;
            uniform vec3 uColorB;
            uniform float uIntensity;
            uniform float uHaze;
            uniform float uTime;
            varying float vAlong;
            varying float vColorMix;
            varying vec3 vNormalV;
            varying vec3 vViewDir;
            varying vec3 vWorld;

            // Cheap value noise for the haze grain
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
                // Brightest where the cone faces the camera (the beam's core), soft at the
                // silhouette edges, fading with distance from the lens
                float facing = abs(dot(normalize(vNormalV), normalize(vViewDir)));
                float core = pow(facing, 2.6);
                float fade = pow(vAlong, 1.5);
                // Smoke drifting through the beam: grain that moves slowly in world space
                float smoke = noise(vWorld * 0.55 + vec3(0.0, uTime * 0.25, uTime * 0.12));
                float haze = mix(1.0, 0.45 + smoke * 1.1, uHaze);
                float a = core * fade * haze * uIntensity * 0.6;
                gl_FragColor = vec4(mix(uColorA, uColorB, vColorMix), a);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
    });
}

/** A moving-head body: lens at the origin, housing extending back along +Y (opposite the beam). */
export function createHeadGeometry() {
    const geometry = new THREE.CylinderGeometry(0.26, 0.32, 0.75, 14, 1, false);
    geometry.translate(0, 0.375, 0);
    return geometry;
}

/**
 * Moving-head housings, rotated in the vertex shader with the SAME aiming code as the beams,
 * so every head always points exactly where its beam goes. Opaque, with cheap fixed-direction
 * shading and a lens ring that glows in the beam colour.
 */
export function createHeadMaterial(uniforms) {
    return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: /* glsl */ `
            ${AIM_GLSL}
            attribute vec2 aBase;
            attribute float aPhase;
            attribute float aColorMix;
            varying float vAlongBody;
            varying float vColorMix;
            varying vec3 vNormalW;

            void main() {
                vec3 fixture = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
                vec3 dir = aimDirection(fixture, aBase, aPhase);
                vec3 down = vec3(0.0, -1.0, 0.0);
                vec3 p = rotateFromTo(position, down, dir);
                vNormalW = normalize(mat3(modelMatrix) * rotateFromTo(normal, down, dir));
                vAlongBody = position.y / 0.75; // 0 at the lens, 1 at the back
                vColorMix = aColorMix;
                gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(p, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform vec3 uColorA;
            uniform vec3 uColorB;
            uniform float uIntensity;
            varying float vAlongBody;
            varying float vColorMix;
            varying vec3 vNormalW;

            void main() {
                float light = 0.1 + 0.3 * max(0.0, dot(normalize(vNormalW), normalize(vec3(0.3, 0.8, 0.5))));
                vec3 body = vec3(0.09, 0.1, 0.13) * light * 3.0;
                float ring = smoothstep(0.12, 0.0, vAlongBody); // the lens end glows
                vec3 lens = mix(uColorA, uColorB, vColorMix) * ring * min(uIntensity, 1.5) * 1.6;
                gl_FragColor = vec4(body + lens, 1.0);
            }
        `,
        toneMapped: false,
    });
}

/** Hot glow at each fixture's lens: screen-facing points with a soft radial falloff. */
export function createGlowMaterial(uniforms) {
    return new THREE.ShaderMaterial({
        uniforms: { ...uniforms, uSize: { value: 140 } },
        vertexShader: /* glsl */ `
            uniform float uSize;
            attribute float aColorMix;
            varying float vColorMix;
            void main() {
                vec4 mv = viewMatrix * modelMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * mv;
                gl_PointSize = uSize / max(1.0, -mv.z); // shrink with distance
                vColorMix = aColorMix;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform vec3 uColorA;
            uniform vec3 uColorB;
            uniform float uIntensity;
            varying float vColorMix;
            void main() {
                float d = length(gl_PointCoord - 0.5) * 2.0;     // 0 centre, 1 edge
                float glow = pow(max(0.0, 1.0 - d), 3.0);
                float hot = smoothstep(0.35, 0.0, d);            // white-hot centre
                vec3 col = mix(mix(uColorA, uColorB, vColorMix), vec3(1.0), hot * 0.8);
                gl_FragColor = vec4(col, (glow + hot) * uIntensity);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    });
}
