'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import { DECK_HEIGHT } from './trussGeometry';

// Who is on stage: a DJ behind a booth (EDM and rap, and when no song is playing) or a five-piece
// band (pop and Bollywood). Dark figures and gear, each set merged into one geometry (one draw call;
// only the set in use is drawn), tinted by the stage washes like the deck they stand on.

const BAND_GENRES = new Set(['pop', 'bollywood']);

function person(x, z, y = 0, armsUp = false) {
    const parts = [
        new THREE.CylinderGeometry(0.2, 0.16, 1.45, 8).translate(0, 0.725, 0),
        new THREE.SphereGeometry(0.125, 10, 8).translate(0, 1.6, 0),
    ];
    for (const side of [-1, 1]) {
        const arm = new THREE.BoxGeometry(0.075, 0.62, 0.075).translate(0, -0.31, 0);
        arm.rotateX(armsUp && side > 0 ? 2.6 : 0.9);          // forearms forward over the gear, or one hand in the air
        parts.push(arm.translate(side * 0.26, 1.38, 0));
    }
    return parts.map((g) => g.translate(x, DECK_HEIGHT + y, z));
}
const block = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, DECK_HEIGHT + y + h / 2, z);

function merged(parts) {
    for (const g of parts) g.deleteAttribute('uv');
    return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
}

function djGeometry() {
    return merged([
        block(5.2, 0.5, 2.6, 0, 0, -6.2),                    // riser
        block(3.6, 1.05, 0.9, 0, 0.5, -5.6),                 // the booth
        block(0.9, 0.08, 0.7, -1.0, 1.55, -5.6), block(0.9, 0.08, 0.7, 1.0, 1.55, -5.6), block(0.7, 0.1, 0.7, 0, 1.55, -5.6), // decks and mixer
        block(0.6, 1.1, 0.5, -2.2, 0.5, -6.6), block(0.6, 1.1, 0.5, 2.2, 0.5, -6.6),                                         // monitors
        ...person(0, -6.5, 0.5, true),
    ]);
}

function bandGeometry() {
    const drum = (r, h, x, y, z) => new THREE.CylinderGeometry(r, r, h, 12).translate(x, DECK_HEIGHT + y, z);
    return merged([
        // the singer at the front with a mic stand
        ...person(0, -3.2, 0, true), block(0.03, 1.45, 0.03, 0, 0, -2.8),
        // guitar left, bass right, each with an amp behind
        ...person(-4.2, -4.6), block(1.0, 1.2, 0.5, -4.6, 0, -7.2),
        ...person(4.2, -4.6), block(1.0, 1.2, 0.5, 4.6, 0, -7.2),
        // the drummer on a riser at the back, behind the kit
        block(3.6, 0.6, 3.0, 0, 0, -9.5), ...person(0, -10.2, 0.25),
        drum(0.38, 0.45, 0, 0.95, -9.0), drum(0.22, 0.2, -0.7, 1.25, -9.2), drum(0.22, 0.2, 0.7, 1.25, -9.2), drum(0.3, 0.4, 1.1, 0.9, -9.8),
        drum(0.28, 0.03, -1.2, 1.75, -9.6), drum(0.28, 0.03, 1.4, 1.8, -9.4),
        // keys on the other side
        block(2.6, 0.4, 2.0, -8, 0, -8), ...person(-8, -8.4, 0.4), block(1.6, 0.12, 0.5, -8, 1.35, -7.7),
    ]);
}

export default function Performer({ look, control }) {
    const dj = useMemo(() => djGeometry(), []);
    const band = useMemo(() => bandGeometry(), []);
    const material = useMemo(() => new THREE.MeshLambertMaterial({ color: '#0d0e13' }), []);
    const djMesh = useRef();
    const bandMesh = useRef();
    const tint = useRef(new THREE.Color());

    useFrame(() => {
        const target = look.current;
        const isBand = BAND_GENRES.has(control?.current?.song?.genre) && control?.current?.mode === 'song';
        if (djMesh.current) djMesh.current.visible = !isBand;
        if (bandMesh.current) bandMesh.current.visible = isBand;
        const level = (target.master ?? 1) * (target.wash ?? 0) * Math.min(target.intensity ?? 0, 1.4);
        djMesh.current?.material.emissive.copy(tint.current.set(target.washColor ?? '#3b5bff')).multiplyScalar(0.1 * level);
    });

    return (
        <>
            <mesh ref={djMesh} geometry={dj} material={material} />
            <mesh ref={bandMesh} geometry={band} material={material} visible={false} />
        </>
    );
}
