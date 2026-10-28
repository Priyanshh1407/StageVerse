'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Rain outside the venue: streaks falling through the floodlight in front of the gate. One draw
// call (line segments); each drop's fall is computed in the vertex shader. Only outside the wall,
// so it stops when you walk in.
const DROPS = 1600;
const AREA = { x: 34, yTop: 26, zFrom: 36, zTo: 66 };

function createRainGeometry() {
    const positions = new Float32Array(DROPS * 2 * 3);
    const seeds = new Float32Array(DROPS * 2);
    const ends = new Float32Array(DROPS * 2);
    for (let i = 0; i < DROPS; i++) {
        const x = (Math.random() * 2 - 1) * AREA.x;
        const y = Math.random() * AREA.yTop;
        const z = AREA.zFrom + Math.random() * (AREA.zTo - AREA.zFrom);
        for (let e = 0; e < 2; e++) {
            const k = i * 2 + e;
            positions.set([x, y, z], k * 3);
            seeds[k] = Math.random();
            ends[k] = e;
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    g.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1));
    return g;
}

function createRainMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `
            uniform float uTime;
            attribute float aSeed;
            attribute float aEnd;
            varying float vEnd;
            varying float vLit;
            void main() {
                vec3 p = position;
                float speed = 14.0 + aSeed * 6.0;
                p.y = mod(p.y - uTime * speed, ${AREA.yTop.toFixed(1)});
                // Streak length (motion blur) and a slight slant from the wind
                p.y += aEnd * 0.55;
                p.x += aEnd * 0.08;
                vEnd = aEnd;
                // Drops catch the light near the gate's floods and the doorway
                vLit = 0.35 + 0.65 * exp(-abs(p.x) * 0.06) * exp(-(p.z - 36.0) * 0.05);
                gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            varying float vEnd;
            varying float vLit;
            void main() {
                gl_FragColor = vec4(vec3(0.7, 0.8, 1.0), (0.12 + 0.18 * vEnd) * vLit);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    });
}

export default function Rain() {
    const geometry = useMemo(() => createRainGeometry(), []);
    const material = useMemo(() => createRainMaterial(), []);
    useEffect(() => () => {
        geometry.dispose();
        material.dispose();
    }, [geometry, material]);
    const lines = useRef();
    useFrame((_, delta) => {
        if (lines.current) lines.current.material.uniforms.uTime.value += delta;
    });
    return <lineSegments ref={lines} geometry={geometry} material={material} frustumCulled={false} />;
}
