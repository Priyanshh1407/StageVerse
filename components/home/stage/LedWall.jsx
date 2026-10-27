'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createLedMaterial, createScreenTextTexture } from './stageMaterials';

// Main wall plus two angled side screens (positions line up with the truss frame)
const SCREENS = [
    { key: 'main', position: [0, 6.6, -12.5], rotation: [0, 0, 0], size: [20, 10.4], grid: [180, 94], text: true, seed: 0 },
    { key: 'left', position: [-12.6, 6.5, -8.5], rotation: [0, 0.38, 0], size: [5.6, 10], grid: [52, 94], text: false, seed: 3 },
    { key: 'right', position: [12.6, 6.5, -8.5], rotation: [0, -0.38, 0], size: [5.6, 10], grid: [52, 94], text: false, seed: 7 },
];

/** The LED screens: one draw call each. Colours and brightness follow the show's `look`. */
export default function LedWall({ look, events = [] }) {
    const textTexture = useMemo(() => createScreenTextTexture(events), [events]);
    useEffect(() => () => textTexture.dispose(), [textTexture]);

    const materials = useMemo(
        () => SCREENS.map((s) => createLedMaterial({ textTexture: s.text ? textTexture : null, grid: s.grid, seed: s.seed })),
        [textTexture],
    );
    useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

    const group = useRef();
    const colors = useRef({ a: null, b: null, ta: new THREE.Color(), tb: new THREE.Color() });

    useFrame((_, delta) => {
        if (!group.current) return;
        const target = look.current;
        const ease = 1 - Math.exp(-Math.min(delta, 0.1) * 3);
        if (target.colorA !== colors.current.a) { colors.current.a = target.colorA; colors.current.ta.set(target.colorA); }
        if (target.colorB !== colors.current.b) { colors.current.b = target.colorB; colors.current.tb.set(target.colorB); }
        // Screens dim with the rig but never go fully dark (they're the stage's backdrop), except on blackout
        const brightness = (target.master ?? 1) * (0.35 + 0.5 * Math.min(target.intensity, 1.4)) * (1 + (target.pulse ?? 0) * 0.35);
        for (const mesh of group.current.children) {
            const u = mesh.material.uniforms;
            u.uTime.value += delta;
            u.uColorA.value.lerp(colors.current.ta, ease);
            u.uColorB.value.lerp(colors.current.tb, ease);
            u.uBrightness.value += (brightness - u.uBrightness.value) * ease;
            u.uStars.value += ((target.stars ?? 0.2) - u.uStars.value) * ease;
        }
    });

    return (
        <group ref={group}>
            {SCREENS.map((s, i) => (
                <mesh key={s.key} position={s.position} rotation={s.rotation} material={materials[i]}>
                    <planeGeometry args={s.size} />
                </mesh>
            ))}
        </group>
    );
}
