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
        uniforms: { uFlash: { value: 0 }, uTint: { value: new THREE.Color('#19d9ff') } },
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
                vec3 face = mix(vec3(0.16) + uTint * 0.08, vec3(1.0, 0.98, 0.95) * 7.0, uFlash);
                gl_FragColor = vec4(mix(body, face, vFlashFace), 1.0);
            }
        `,
        vertexColors: true,
        toneMapped: false,
    });
}

/**
 * Strobes between the moving heads. They fire only on strobe cues and hits (their one job):
 * the look's `strobe` (0..1) at ~12 flashes a second, plus a flash on drop/blinder hits.
 */
export default function Strobes({ count, look }) {
    const { scene } = useGLTF(STROBE_URL);
    const geometry = useMemo(() => bakeStrobe(scene), [scene]);
    const material = useMemo(() => createStrobeMaterial(), []);
    const positions = useMemo(() => strobeLayout(count), [count]);
    useLayoutEffect(() => () => {
        geometry.dispose();
        material.dispose();
    }, [geometry, material]);

    const mesh = useRef();
    useLayoutEffect(() => {
        const m = new THREE.Matrix4();
        positions.forEach((p, i) => mesh.current.setMatrixAt(i, m.makeTranslation(...p)));
        mesh.current.instanceMatrix.needsUpdate = true;
    }, [positions]);

    useFrame(({ clock }) => {
        if (!mesh.current) return;
        const u = mesh.current.material.uniforms;
        u.uFlash.value = Math.min(1, roomFlash(look.current, clock.elapsedTime).strobe);
        u.uTint.value.set(look.current.colorA);
    });

    return <instancedMesh key={positions.length} ref={mesh} args={[geometry, material, positions.length]} frustumCulled={false} />;
}

useGLTF.preload(STROBE_URL);
