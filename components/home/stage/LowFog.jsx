'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { roomFlash } from './flash';
import { dressing } from './dressing';

// Item 3, option 4: low fog lying across the stage and the floor in front of it, catching the
// show's colours. Three flat layers just above the floor and the deck with slowly drifting noise,
// thinning toward the audience. Additive, 3 draw calls.
const LAYERS = [
    { y: 0.12, z: 7, depth: 18, seed: 2.1, strength: 1 },     // the floor in front of the stage
    { y: 0.32, z: 7, depth: 18, seed: 5.3, strength: 0.7 },
    { y: 0.62, z: -8, depth: 18, seed: 8.7, strength: 0.8 },  // on the stage deck
];
const WIDTH = 46;

function createFogMaterial(seed, strength) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uColorA: { value: new THREE.Color('#19d9ff') },
            uColorB: { value: new THREE.Color('#ff3df2') },
            uLevel: { value: 0 },
            uFlash: { value: 0 },
        },
        vertexShader: /* glsl */ `
            varying vec3 vWorld;
            varying vec2 vUv;
            void main() {
                vUv = uv;
                vec4 w = modelMatrix * vec4(position, 1.0);
                vWorld = w.xyz;
                gl_Position = projectionMatrix * viewMatrix * w;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform vec3 uColorA;
            uniform vec3 uColorB;
            uniform float uLevel;
            uniform float uFlash;
            varying vec3 vWorld;
            varying vec2 vUv;
            float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            float noise(vec2 p) {
                vec2 i = floor(p), f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
            }
            float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
            void main() {
                vec2 p = vWorld.xz * 0.22 + vec2(uTime * 0.05, uTime * 0.02) + ${seed.toFixed(1)};
                float d = fbm(p + fbm(p * 0.7 - uTime * 0.03));
                d = smoothstep(0.35, 0.85, d);
                // Soft edges all round, thinning toward the audience
                float edge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x) * smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
                float thin = exp(-max(0.0, vWorld.z) * 0.07);
                vec3 tint = mix(uColorA, uColorB, smoothstep(-16.0, 16.0, vWorld.x + sin(uTime * 0.1) * 6.0));
                vec3 c = (mix(tint, vec3(0.8), 0.25) * uLevel + vec3(0.6) * uFlash) * d * edge * thin * ${strength.toFixed(2)} * 0.5;
                gl_FragColor = vec4(c, 1.0);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    });
}

export default function LowFog({ look, blinders }) {
    const materials = useMemo(() => LAYERS.map((l) => createFogMaterial(l.seed, l.strength)), []);
    const group = useRef();
    useFrame(({ clock }) => {
        if (!group.current) return;
        group.current.visible = dressing.fog;
        if (!dressing.fog) return;
        const target = look.current;
        const t = clock.elapsedTime;
        const level = (target.master ?? 1) * Math.min(target.intensity, 1.4) * (0.6 + 0.4 * (target.haze ?? 0.5));
        const flash = Math.min(1, roomFlash(target, t, blinders).total);
        for (const child of group.current.children) {
            const u = child.material.uniforms;
            u.uTime.value = t;
            u.uColorA.value.set(target.colorA);
            u.uColorB.value.set(target.colorB);
            u.uLevel.value = level;
            u.uFlash.value = flash;
        }
    });
    return (
        <group ref={group}>
            {LAYERS.map((l, i) => (
                <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, l.y, l.z]} material={materials[i]} renderOrder={5}>
                    <planeGeometry args={[WIDTH, l.depth]} />
                </mesh>
            ))}
        </group>
    );
}
