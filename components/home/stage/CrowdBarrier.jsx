'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import { dressing } from './dressing';

// Item 3, option 3: the steel crowd barrier along the front of the stage with an empty photo pit
// behind it. 1 m high, sections 1 m wide: a solid kick plate at the bottom and open vertical slats
// above (so the stage edge still shows through from the audience), a round top rail, and the
// foot plate reaching toward the audience. Merged into one geometry: one draw call.
const PIT = 3;            // photo pit depth: the barrier stands 3 m in front of the stage
const HEIGHT = 1.0;
const SECTIONS = 32;      // 32 m wide, a little wider than the 30 m deck
const SECTION = 1;

function createBarrierGeometry() {
    const parts = [];
    const box = (w, h, d, x, y, z, rx = 0) => {
        const g = new THREE.BoxGeometry(w, h, d);
        if (rx) g.rotateX(rx);
        parts.push(g.translate(x, y, z));
    };
    for (let i = 0; i < SECTIONS; i++) {
        const x = (i - (SECTIONS - 1) / 2) * SECTION;
        const w = SECTION - 0.03;                                         // a small gap between sections
        box(w, 0.38, 0.04, x, 0.21, PIT);                                 // kick plate
        box(w, 0.04, 0.05, x, 0.42, PIT);                                 // mid rail
        for (let s = 0; s < 6; s++) box(0.025, HEIGHT - 0.44, 0.025, x - w / 2 + 0.08 + s * (w - 0.16) / 5, 0.42 + (HEIGHT - 0.44) / 2, PIT); // slats
        box(0.05, HEIGHT, 0.06, x - w / 2 + 0.025, HEIGHT / 2, PIT);      // section posts
        box(0.05, HEIGHT, 0.06, x + w / 2 - 0.025, HEIGHT / 2, PIT);
        box(w, 0.02, 0.8, x, 0.01, PIT + 0.42);                           // foot plate on the audience side
        box(0.04, 0.04, 0.95, x, 0.42, PIT + 0.38, -0.5);                 // brace down to the foot plate
    }
    const rail = new THREE.CylinderGeometry(0.04, 0.04, SECTIONS * SECTION, 10).rotateZ(Math.PI / 2).translate(0, HEIGHT, PIT);
    parts.push(rail);
    // Strip uvs so every part merges with the same attributes
    for (const g of parts) g.deleteAttribute('uv');
    return mergeGeometries(parts);
}

export default function CrowdBarrier() {
    const geometry = useMemo(() => createBarrierGeometry(), []);
    const mesh = useRef();
    useFrame(() => {
        if (mesh.current) mesh.current.visible = dressing.barrier;
    });
    return (
        <mesh ref={mesh} geometry={geometry}>
            <meshLambertMaterial color="#7d838f" emissive="#06070a" />
        </mesh>
    );
}
