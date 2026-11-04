'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { strobeLayout } from './rigLayout';
import { roomFlash } from './flash';

export const STROBE_URL = '/fixtures/strobe.glb';
const FLASH_MATERIALS = new Set(['laser_rojo', 'L201']); // the front panel and the lamp tube
const WIDTH = 1.5; // metres across, like a large LED strobe (scaled up to read from the audience)
const BLINDER_WHITE = new THREE.Color('#ffe2a6'); // blinder hits: warm, slightly yellowish white, like tungsten blinders (strobe hits use look.strobeColor)
// The light of each firing strobe, shaped like its panel: the whole rectangular face lit evenly,
// with a soft flood fading out from its edges, so the room flash reads as coming from the boxes.
// Its total brightness matches the old separate blinder lamps (8 of them at 1.8x), shared across
// however many strobes there are.
const GLOW_TOTAL = 8 * 1.8;
const GLOW_SPREAD = 0.9; // metres the flood reaches beyond the panel's edges

/** The panel's lit face (where aFlash = 1): its size and centre, in the baked model's units. */
function faceOf(geometry) {
    const pos = geometry.attributes.position;
    const flash = geometry.attributes.aFlash;
    const min = [Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.count; i++) {
        if (flash.getX(i) < 0.5) continue;
        min[0] = Math.min(min[0], pos.getX(i)); max[0] = Math.max(max[0], pos.getX(i));
        min[1] = Math.min(min[1], pos.getY(i)); max[1] = Math.max(max[1], pos.getY(i));
        max[2] = Math.max(max[2], pos.getZ(i));
    }
    const box = geometry.boundingBox;
    if (!Number.isFinite(min[0])) return { w: WIDTH * 0.9, h: WIDTH * 0.4, cx: 0, cy: 0, z: box.max.z };
    return { w: max[0] - min[0], h: max[1] - min[1], cx: (min[0] + max[0]) / 2, cy: (min[1] + max[1]) / 2, z: max[2] };
}

// Random strobes (look.strobeRandom): every change (strobeRandomRate per second) a random share of
// the panels lights up as a coloured box in one of the show's two colours. Same maths in the panel
// and its glow, keyed by each strobe's seed, so a panel and its glow always agree.
const RANDOM_GLSL = /* glsl */ `
    uniform float uTime;
    uniform float uRand;
    uniform float uRandRate;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    float randomLit(float seed) {
        float slot = floor(uTime * uRandRate);
        return step(fract(sin(seed * 91.7 + slot * 12.9898) * 43758.5453), uRand);
    }
    vec3 randomColor(float seed) {
        float slot = floor(uTime * uRandRate);
        return fract(sin(seed * 17.3 + slot * 4.1414) * 24634.6345) < 0.5 ? uColorA : uColorB;
    }
`;
const randomUniforms = () => ({
    uTime: { value: 0 },
    uRand: { value: 0 },
    uRandRate: { value: 2 },
    uColorA: { value: new THREE.Color('#19d9ff') },
    uColorB: { value: new THREE.Color('#ff3df2') },
});

function createGlowMaterial(face) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uLevel: { value: 0 },
            uColor: { value: new THREE.Color('#ffeedd') },
            uHalf: { value: new THREE.Vector2(face.w / 2, face.h / 2) },
            uQuad: { value: new THREE.Vector2(face.w / 2 + GLOW_SPREAD, face.h / 2 + GLOW_SPREAD) },
            ...randomUniforms(),
        },
        vertexShader: /* glsl */ `
            attribute float aSeed;
            varying vec2 vUv;
            varying float vSeed;
            void main() {
                vUv = uv;
                vSeed = aSeed;
                gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uLevel;
            uniform vec3 uColor;
            uniform vec2 uHalf;
            uniform vec2 uQuad;
            varying vec2 vUv;
            varying float vSeed;
            ${RANDOM_GLSL}
            void main() {
                vec2 p = (vUv - 0.5) * 2.0 * uQuad;                 // metres from the panel's centre
                float d = length(max(abs(p) - uHalf, 0.0));          // 0 on the face, distance outside it
                float face = 1.0 - smoothstep(0.0, 0.04, d);         // the whole face, evenly lit
                float flood = exp(-d * 3.2) * (1.0 - smoothstep(0.63, 0.9, d));
                // White flash (blinders, strobes), or a softer coloured glow from a random strobe
                float rnd = randomLit(vSeed) * 0.28 * (1.0 - min(uLevel, 1.0));
                vec3 color = uLevel + rnd > 0.0 ? (uColor * uLevel + randomColor(vSeed) * rnd) / (uLevel + rnd) : uColor;
                gl_FragColor = vec4(color, (face * 1.2 + flood * 0.7) * (uLevel + rnd));
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    });
}

/**
 * Bake the strobe model into one geometry: vertex colours from its materials, `aFlash` = 1 on
 * the flash face, centred, facing +Z (the audience), scaled to WIDTH.
 */
function bakeStrobe(scene) {
    scene.updateMatrixWorld(true);
    const parts = [];
    scene.traverse((o) => {
        if (!o.isMesh) return;
        const g = new THREE.BufferGeometry();
        const src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
        g.setAttribute('position', src.attributes.position.clone());
        g.setAttribute('normal', src.attributes.normal.clone());
        g.applyMatrix4(o.matrixWorld);
        const n = g.attributes.position.count;
        const c = o.material.color;
        g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).map((_, i) => [c.r, c.g, c.b][i % 3]), 3));
        g.setAttribute('aFlash', new THREE.BufferAttribute(new Float32Array(n).fill(FLASH_MATERIALS.has(o.material.name) ? 1 : 0), 1));
        parts.push(g);
    });
    const merged = mergeGeometries(parts);
    parts.forEach((p) => p.dispose());

    // Turn the flash panel to face the audience (+Z), however the model was authored (this one has it
    // facing down). The panel's thinnest dimension is the way it faces, and it sits on that side of
    // the housing, so that side is the direction to turn toward +Z.
    const pos = merged.attributes.position;
    const flash = merged.attributes.aFlash;
    const all = new THREE.Box3();
    const panel = new THREE.Box3();
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        all.expandByPoint(v);
        if (flash.getX(i) > 0.5) panel.expandByPoint(v);
    }
    if (!panel.isEmpty()) {
        const size = panel.getSize(new THREE.Vector3()).toArray();
        const axis = size.indexOf(Math.min(...size));
        const side = panel.getCenter(new THREE.Vector3()).getComponent(axis) - all.getCenter(new THREE.Vector3()).getComponent(axis);
        const facing = new THREE.Vector3().setComponent(axis, side < 0 ? -1 : 1);
        merged.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(facing, new THREE.Vector3(0, 0, 1)));
    }

    merged.computeBoundingBox();
    const box = merged.boundingBox;
    const scale = WIDTH / (box.max.x - box.min.x);
    // Centred on its own middle in every direction, so it hangs centred on the truss tube
    merged.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -(box.min.z + box.max.z) / 2);
    merged.scale(scale, scale, scale);
    merged.computeBoundingBox();
    return merged;
}

function createStrobeMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: { uFlash: { value: 0 }, uTint: { value: new THREE.Color('#19d9ff') }, uFlashColor: { value: new THREE.Color('#fff8ee') }, ...randomUniforms() },
        vertexShader: /* glsl */ `
            attribute float aFlash;
            attribute float aSeed;
            varying vec3 vColor;
            varying float vFlashFace;
            varying vec3 vNormalW;
            varying float vSeed;
            void main() {
                vColor = color;
                vFlashFace = aFlash;
                vSeed = aSeed;
                vNormalW = mat3(modelMatrix) * mat3(instanceMatrix) * normal;
                gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uFlash;
            uniform vec3 uTint;
            uniform vec3 uFlashColor;
            varying vec3 vColor;
            varying float vFlashFace;
            varying vec3 vNormalW;
            varying float vSeed;
            ${RANDOM_GLSL}
            void main() {
                float l = length(vNormalW);
                vec3 n = l > 1e-6 ? vNormalW / l : vec3(0.0, 0.0, 1.0); // the model has some zero normals
                // The model's housing is near-black: lift it to dark painted metal so it reads at night
                float fill = 0.25 + 0.75 * max(0.0, dot(n, normalize(vec3(0.15, 0.35, 1.0))));
                float edge = pow(clamp(1.0 - abs(n.z), 0.0, 1.0), 2.0);
                vec3 body = (max(vColor, vec3(0.09)) * fill + uTint * (max(0.0, -n.y) * 0.1 + edge * 0.08));
                // Off: grey frosted panel catching a little rig colour. Firing: blinding white.
                vec3 face = mix(vec3(0.16) + uTint * 0.08, uFlashColor * 7.0, uFlash);
                // A random strobe: a coloured box, far softer than the white flash
                face += randomColor(vSeed) * 2.2 * randomLit(vSeed) * (1.0 - uFlash);
                gl_FragColor = vec4(mix(body, face, vFlashFace), 1.0);
            }
        `,
        vertexColors: true,
        toneMapped: false,
    });
}

/**
 * Strobes between the moving heads on the trusses. They're the visible source of the strobe and
 * blinder light: on a strobe cue (the look's `strobe`, ~12 flashes a second) or a blinder hit the
 * panels blaze and throw a wide flood of light, and many of them firing together blind the room.
 * How bright the room gets is set in flash.js (unchanged); these show where the light comes from.
 */
export default function Strobes({ count, look, blinders = 8 }) {
    const { scene } = useGLTF(STROBE_URL);
    const geometry = useMemo(() => bakeStrobe(scene), [scene]);
    const material = useMemo(() => createStrobeMaterial(), []);
    const positions = useMemo(() => strobeLayout(count), [count]);
    const face = useMemo(() => faceOf(geometry), [geometry]);
    // Hang each strobe right under its truss tube: the layout assumes a 0.72 m tall strobe; use the
    // model's real height so its top sits the same small gap under the tube
    const lift = useMemo(() => 0.36 - (geometry.boundingBox.max.y - geometry.boundingBox.min.y) / 2, [geometry]);
    const glowMaterial = useMemo(() => createGlowMaterial(face), [face]);
    const glowGeometry = useMemo(() => new THREE.PlaneGeometry(face.w + 2 * GLOW_SPREAD, face.h + 2 * GLOW_SPREAD), [face]);
    useLayoutEffect(() => () => {
        geometry.dispose();
        material.dispose();
        glowMaterial.dispose();
        glowGeometry.dispose();
    }, [geometry, material, glowMaterial, glowGeometry]);
    // A random seed per strobe (for the random coloured strobes), on the panel and its glow
    useMemo(() => {
        const seeds = new Float32Array(positions.map((_, i) => (i * 0.6180339 + 0.137) % 1));
        geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
        glowGeometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds.slice(), 1));
    }, [positions, geometry, glowGeometry]);
    // Truss strobes hang under the tube (lifted to the model's real height); tower strobes stand on end
    const placement = useMemo(() => positions.map(([x, y, z, rot = 0]) => {
        const m = new THREE.Matrix4().makeRotationZ(rot);
        m.setPosition(x, rot ? y : y + lift, z);
        return m;
    }), [positions, lift]);
    const glow = useRef();
    // each panel's light sits just in front of its face
    useLayoutEffect(() => {
        if (!glow.current) return;
        const offset = new THREE.Matrix4().makeTranslation(face.cx, face.cy, face.z + 0.02);
        placement.forEach((m, i) => glow.current.setMatrixAt(i, m.clone().multiply(offset)));
        glow.current.instanceMatrix.needsUpdate = true;
    }, [placement, face]);
    const flashColor = useRef(new THREE.Color());
    const strobeColor = useRef(new THREE.Color());

    const mesh = useRef();
    useLayoutEffect(() => {
        placement.forEach((m, i) => mesh.current.setMatrixAt(i, m));
        mesh.current.instanceMatrix.needsUpdate = true;
    }, [placement]);
    const colors = useRef({ a: new THREE.Color(), b: new THREE.Color() });

    useFrame(({ clock }) => {
        if (!mesh.current) return;
        const target = look.current;
        const u = mesh.current.material.uniforms;
        const f = roomFlash(target, clock.elapsedTime, blinders);
        const blinder = Math.min(1, f.blinder);
        const strobe = Math.min(1, f.strobe);
        // The panels fire on strobes and on blinder hits, or glow steadily as work lights with the house lights
        u.uFlash.value = Math.max(strobe, blinder, (target.strobeSteady ?? 0) * 0.3);
        u.uTint.value.set(target.colorA);
        // Blinder hits are warm white, strobe hits the look's strobe colour; mixed by which is stronger
        strobeColor.current.set(target.strobeColor ?? '#fff8ee');
        const share = blinder + strobe > 0 ? blinder / (blinder + strobe) : 0;
        flashColor.current.copy(strobeColor.current).lerp(BLINDER_WHITE, share);
        u.uFlashColor.value.copy(flashColor.current);
        // Random coloured strobes: share lit, how often they change, in the show's two colours
        const rand = (target.strobeRandom ?? 0) * (target.master ?? 1);
        colors.current.a.set(target.colorA);
        colors.current.b.set(target.colorB);
        for (const uu of [u, glow.current?.material.uniforms].filter(Boolean)) {
            uu.uTime.value = clock.elapsedTime;
            uu.uRand.value = rand;
            uu.uRandRate.value = target.strobeRandomRate ?? 2;
            uu.uColorA.value.copy(colors.current.a);
            uu.uColorB.value.copy(colors.current.b);
        }
        // The flood of light round each panel
        if (glow.current) {
            const level = Math.max(Math.min(f.blinder, 1.5), f.strobe) * (GLOW_TOTAL / Math.max(8, positions.length));
            glow.current.material.uniforms.uLevel.value = level;
            glow.current.material.uniforms.uColor.value.copy(flashColor.current);
            glow.current.visible = level > 0.01 || rand > 0.01;
        }
    });

    return (
        <>
            <instancedMesh key={positions.length} ref={mesh} args={[geometry, material, positions.length]} frustumCulled={false} />
            <instancedMesh key={`glow-${positions.length}`} ref={glow} args={[glowGeometry, glowMaterial, positions.length]} frustumCulled={false} renderOrder={6} />
        </>
    );
}

useGLTF.preload(STROBE_URL);
