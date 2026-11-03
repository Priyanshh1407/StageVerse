'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createLedMaterial, createScreenContent } from './stageMaterials';
import { CENTRE_GAP, SCREEN_Z } from './trussGeometry';

// The screens' looks: the main wall (with the content) and the two angled side screens
const MATERIALS = [
    { grid: [180, 88], text: true, seed: 0 },
    { grid: [52, 88], text: false, seed: 3 },
    { grid: [52, 88], text: false, seed: 7 },
];
// The main wall is 20 m wide, split in two around the centre truss tower. Like a real split LED wall,
// the picture runs on from one half to the other with nothing lost behind the tower (each half shows
// half of it), and the content is laid out to break around the tower (see createScreenContent).
// Side screens stand angled in front, between the wall and the towers.
const MAIN_W = 20;
const HALF_W = (MAIN_W - CENTRE_GAP) / 2;
const SCREENS = [
    { key: 'mainLeft', material: 0, position: [-(CENTRE_GAP + HALF_W) / 2, 6.3, SCREEN_Z], rotation: [0, 0, 0], size: [HALF_W, 9.8], uv: [0, 0.5] },
    { key: 'mainRight', material: 0, position: [(CENTRE_GAP + HALF_W) / 2, 6.3, SCREEN_Z], rotation: [0, 0, 0], size: [HALF_W, 9.8], uv: [0.5, 1] },
    { key: 'left', material: 1, position: [-12.3, 6.2, SCREEN_Z + 1.7], rotation: [0, 0.38, 0], size: [5.6, 9.4] },
    { key: 'right', material: 2, position: [12.3, 6.2, SCREEN_Z + 1.7], rotation: [0, -0.38, 0], size: [5.6, 9.4] },
];

/** A screen's plane, showing only its slice [u0, u1] of the picture across (the main wall's halves). */
function screenGeometry({ size, uv: [u0, u1] = [0, 1] }) {
    const g = new THREE.PlaneGeometry(...size);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * (u1 - u0));
    return g;
}

// A 1x1 blank texture so the main screen's samplers are valid before the first content is drawn
function blankTexture() {
    const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    t.needsUpdate = true;
    return t;
}

/** Put new content on the main screen, crossfading from what was showing. */
function showContent(material, texture, slots) {
    const u = material.uniforms;
    if (slots.prev && slots.prev !== slots.current) slots.prev.dispose();
    slots.prev = slots.current;
    slots.current = texture;
    u.uTextPrev.value = slots.prev;
    u.uText.value = texture;
    u.uTextMix.value = 0;
    u.uHasText.value = 1;
}

/**
 * The LED screens. Colours and brightness follow the show's look; the main wall shows the
 * StageVerse wordmark or the current role (`screen`), in the `font` display face.
 */
export default function LedWall({ look, events = [], screen = { kind: 'brand' }, font }) {
    const materials = useMemo(
        () => MATERIALS.map((s) => createLedMaterial({ textTexture: s.text ? blankTexture() : null, grid: s.grid, seed: s.seed })),
        [],
    );
    const geometries = useMemo(() => SCREENS.map(screenGeometry), []);
    useEffect(() => () => {
        materials.forEach((m) => m.dispose());
        geometries.forEach((g) => g.dispose());
    }, [materials, geometries]);
    const slots = useRef({ current: null, prev: null });

    // Redraw the content when it changes (once the display font has loaded)
    const key = JSON.stringify({ screen, events, font });
    useEffect(() => {
        let cancelled = false;
        const draw = () => {
            if (!cancelled) showContent(materials[0], createScreenContent(screen, { events, font }), slots.current);
        };
        if (font && document.fonts?.load) document.fonts.load(`900 100px ${font}`).then(draw, draw);
        else draw();
        return () => { cancelled = true; };
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => () => {
        slots.current.current?.dispose();
        slots.current.prev?.dispose();
    }, []);

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
        // Once per material: the wall's two halves share one
        for (const material of new Set(group.current.children.map((mesh) => mesh.material))) {
            const u = material.uniforms;
            u.uTime.value += delta;
            u.uColorA.value.lerp(colors.current.ta, ease);
            u.uColorB.value.lerp(colors.current.tb, ease);
            u.uBrightness.value += (brightness - u.uBrightness.value) * ease;
            u.uStars.value += ((target.stars ?? 0.2) - u.uStars.value) * ease;
            u.uTextMix.value = Math.min(1, u.uTextMix.value + delta * 1.6); // ~0.6 s crossfade
        }
    });

    return (
        <group ref={group}>
            {SCREENS.map((s, i) => (
                <mesh key={s.key} position={s.position} rotation={s.rotation} material={materials[s.material]} geometry={geometries[i]} />
            ))}
        </group>
    );
}
