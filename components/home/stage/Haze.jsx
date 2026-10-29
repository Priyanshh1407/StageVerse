'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { roomFlash } from './flash';

// Stage smoke: a few large planes at different depths with slowly drifting noise, tinted by the
// show's colours and lit more where the rig is brightest (low, centre-stage). Real haze is what
// makes a rig look like light in air instead of coloured shapes. 3 draw calls, additive.
const LAYERS = [
    // Bottom edges sit on the floor: a plane poking below it gets cut off in a hard line
    { z: -11, y: 11, w: 46, h: 22, seed: 1.3, strength: 1 },
    { z: -5, y: 9, w: 52, h: 18, seed: 4.7, strength: 0.8 },
    { z: 3, y: 7, w: 60, h: 14, seed: 9.1, strength: 0.55 },
];

function createHazeMaterial(seed) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uSeed: { value: seed },
            uColorA: { value: new THREE.Color('#19d9ff') },
            uColorB: { value: new THREE.Color('#ff3df2') },
            uLevel: { value: 0.5 },
            uHouse: { value: 0 },
            uFlash: { value: 0 },
        },
        vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform float uSeed;
            uniform vec3 uColorA;
            uniform vec3 uColorB;
            uniform float uLevel;
            uniform float uHouse;
            uniform float uFlash;
            varying vec2 vUv;

            float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed) * 43758.5453); }
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
            }
            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
                return v;
            }

            void main() {
                vec2 p = vUv * vec2(3.0, 1.6) + vec2(uTime * 0.02, uTime * 0.008);
                float smoke = fbm(p + fbm(p * 0.7 + uTime * 0.015));        // domain warp: billowing
                // Denser low down and toward centre stage; soft edges so the plane never shows
                float mask = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x)
                           * smoothstep(1.0, 0.25, vUv.y) * smoothstep(0.0, 0.08, vUv.y);
                vec3 color = mix(uColorA, uColorB, smoothstep(0.2, 0.8, vUv.x)) * 0.5 + 0.08;
                // House lights warm the smoke in the room
                color = mix(color, vec3(1.0, 0.68, 0.3), uHouse * 0.8);
                // A strobe or blinder hit lights the smoke white
                color = mix(color, vec3(1.0), min(1.0, uFlash));
                gl_FragColor = vec4(color, smoke * smoke * mask * (uLevel + uHouse * 0.11 + uFlash * 0.5));
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    });
}

export default function Haze({ look, blinders }) {
    const materials = useMemo(() => LAYERS.map((l) => createHazeMaterial(l.seed)), []);
    useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);
    const group = useRef();

    useFrame(({ clock }, delta) => {
        if (!group.current) return;
        const target = look.current;
        // Haze shows up where there's light in it: thicker smoke and a brighter rig both raise it
        const level = (target.master ?? 1) * (0.05 + 0.13 * (target.haze ?? 0.5)) * (0.4 + 0.6 * Math.min(target.intensity, 1.4) * (target.beams ?? 1));
        group.current.children.forEach((mesh, i) => {
            const u = mesh.material.uniforms;
            u.uTime.value += delta;
            u.uColorA.value.set(target.colorA);
            u.uColorB.value.set(target.colorB);
            u.uLevel.value += (level * LAYERS[i].strength - u.uLevel.value) * Math.min(1, delta * 2);
            u.uHouse.value += ((target.house ?? 0) - u.uHouse.value) * Math.min(1, delta * 1.5);
            u.uFlash.value = roomFlash(target, clock.elapsedTime, blinders).total;
        });
    });

    return (
        <group ref={group}>
            {LAYERS.map((l, i) => (
                <mesh key={l.z} position={[0, l.y, l.z]} material={materials[i]} renderOrder={5}>
                    <planeGeometry args={[l.w, l.h]} />
                </mesh>
            ))}
        </group>
    );
}
