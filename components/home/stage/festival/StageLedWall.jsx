'use client';

// A copy of ../LedWall.jsx for the festival stages (the homepage keeps the original, unchanged): the screens (`screens`: position, rotation, size, grid, text, seed) come from the stage.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createLedMaterial, createScreenContent } from '../stageMaterials';
import { createVisualsWallMaterial, driveVisuals } from './mainstageVisuals';

// Main wall plus two angled side screens, behind the truss. The wall fills the frame the structure
// gives it: from the stage floor (deck top) up to just under the lowest truss row (y = 13),
// and 26 m wide; the side screens fill the rest of the width, up to the towers. LED pixels stay the
// same size as before (about 11 cm), so the grids grow with the screens.
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
export default function StageLedWall({ screens: SCREENS, look, events = [], screen = { kind: 'brand' }, font, logoFonts, visuals = null }) {
    // (`visuals`: the stage's own content on its walls, centred and scaled as one canvas with its other screens)
    const materials = useMemo(
        () => SCREENS.map((s) => (visuals
            ? createVisualsWallMaterial({ textTexture: s.text ? blankTexture() : null, grid: s.grid, centre: visuals.centre, scale: visuals.scale })
            : createLedMaterial({ textTexture: s.text ? blankTexture() : null, grid: s.grid, seed: s.seed }))),
        [SCREENS, visuals],
    );
    useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);
    const slots = useRef({ current: null, prev: null });

    // (a stage whose visuals show titles, the desert: during a song its title and artist take the wordmark's turns on
    // the wall; between songs the wordmark, or the persona, as given)
    const [song, setSong] = useState(null);
    const songNow = useRef(null);
    const shown = song && visuals?.titles && screen.kind === 'brand' ? { kind: 'title', key: song.title, line: song.artist ?? '' } : screen;

    // Redraw the content when it changes (once the display font and the logo's faces have loaded)
    const key = JSON.stringify({ shown, events, font, logoFonts });
    useEffect(() => {
        let cancelled = false;
        const draw = () => {
            if (!cancelled) showContent(materials[0], createScreenContent(shown, { events, font, logoFonts }), slots.current);
        };
        const faces = [font && `900 100px ${font}`, logoFonts?.tag && `400 100px ${logoFonts.tag}`, logoFonts?.script && `400 100px ${logoFonts.script}`].filter(Boolean);
        if (faces.length && document.fonts?.load) Promise.all(faces.map((f) => document.fonts.load(f))).then(draw, draw);
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
        // (the song playing here, if any: a state change only when it changes)
        const title = visuals?.titles && target.beatPos !== undefined ? target.songTitle ?? null : null;
        if (title !== songNow.current) { songNow.current = title; setSong(title ? { title, artist: target.songArtist } : null); }
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
            u.uTextMix.value = Math.min(1, u.uTextMix.value + delta * 1.6); // ~0.6 s crossfade
            if (visuals) {
                driveVisuals(u, target, u.uTime.value, visuals.set);
                u.uLocal?.value.copy(mesh.matrix);
            }
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
