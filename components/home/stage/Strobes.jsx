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
const BLINDER_WHITE = new THREE.Color('#ffeedd'); // blinder hits: warm white (strobe hits use look.strobeColor)
// The glow round each firing strobe: a big soft flood of light, so the room flash reads as coming
// from the boxes. Its total brightness matches the old separate blinder lamps (8 of them at 1.8x),
// shared across however many strobes there are.
const GLOW_SIZE = 1500;
const GLOW_TOTAL = 8 * 1.8;

function createGlowMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: { uLevel: { value: 0 }, uSize: { value: GLOW_SIZE }, uColor: { value: new THREE.Color('#ffeedd') } },
        vertexShader: /* glsl */ `
            uniform float uSize;
            void main() {
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = uSize / -mv.z;
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uLevel;
            uniform vec3 uColor;
            void main() {
                float d = length(gl_PointCoord - 0.5) * 2.0;
                // a wide soft flood with a hot centre over the panel
                float glow = pow(max(0.0, 1.0 - d), 2.6);
                float hot = smoothstep(0.22, 0.0, d);
                gl_FragColor = vec4(uColor, (glow * 0.8 + hot) * uLevel);
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

    // Face the flash panel toward +Z, whatever way the model was authored
    const normals = merged.attributes.normal;
    const flash = merged.attributes.aFlash;
    let facing = 0;
    for (let i = 0; i < flash.count; i++) if (flash.getX(i) > 0.5) facing += normals.getZ(i);
    if (facing < 0) merged.rotateY(Math.PI);

    merged.computeBoundingBox();
    const box = merged.boundingBox;
    const scale = WIDTH / (box.max.x - box.min.x);
    merged.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -box.max.z);
    merged.scale(scale, scale, scale);
    return merged;
}

function createStrobeMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: { uFlash: { value: 0 }, uTint: { value: new THREE.Color('#19d9ff') }, uFlashColor: { value: new THREE.Color('#fff8ee') } },
        vertexShader: /* glsl */ `
            attribute float aFlash;
            varying vec3 vColor;
            varying float vFlashFace;
            varying vec3 vNormalW;
            void main() {
                vColor = color;
                vFlashFace = aFlash;
                vNormalW = mat3(modelMatrix) * normal;
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
            void main() {
                float l = length(vNormalW);
                vec3 n = l > 1e-6 ? vNormalW / l : vec3(0.0, 0.0, 1.0); // the model has some zero normals
                // The model's housing is near-black: lift it to dark painted metal so it reads at night
                float fill = 0.25 + 0.75 * max(0.0, dot(n, normalize(vec3(0.15, 0.35, 1.0))));
                float edge = pow(clamp(1.0 - abs(n.z), 0.0, 1.0), 2.0);
                vec3 body = (max(vColor, vec3(0.09)) * fill + uTint * (max(0.0, -n.y) * 0.1 + edge * 0.08));
                // Off: grey frosted panel catching a little rig colour. Firing: blinding white.
                vec3 face = mix(vec3(0.16) + uTint * 0.08, uFlashColor * 7.0, uFlash);
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
    const glowMaterial = useMemo(() => createGlowMaterial(), []);
    const glowGeometry = useMemo(() => {
        // each glow sits just in front of its panel
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions.flatMap(([x, y, z]) => [x, y, z + 0.2])), 3));
        return g;
    }, [positions]);
    useLayoutEffect(() => () => {
        geometry.dispose();
        material.dispose();
        glowMaterial.dispose();
    }, [geometry, material, glowMaterial]);
    useLayoutEffect(() => () => glowGeometry.dispose(), [glowGeometry]);
    const glow = useRef();
    const flashColor = useRef(new THREE.Color());
    const strobeColor = useRef(new THREE.Color());

    const mesh = useRef();
    useLayoutEffect(() => {
        const m = new THREE.Matrix4();
        positions.forEach((p, i) => mesh.current.setMatrixAt(i, m.makeTranslation(...p)));
        mesh.current.instanceMatrix.needsUpdate = true;
    }, [positions]);

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
        // The flood of light round each panel
        if (glow.current) {
            const level = Math.max(Math.min(f.blinder, 1.5), f.strobe) * (GLOW_TOTAL / Math.max(8, positions.length));
            glow.current.material.uniforms.uLevel.value = level;
            glow.current.material.uniforms.uColor.value.copy(flashColor.current);
            glow.current.visible = level > 0.01;
        }
    });

    return (
        <>
            <instancedMesh key={positions.length} ref={mesh} args={[geometry, material, positions.length]} frustumCulled={false} />
            <points ref={glow} geometry={glowGeometry} material={glowMaterial} frustumCulled={false} renderOrder={6} />
        </>
    );
}

useGLTF.preload(STROBE_URL);
