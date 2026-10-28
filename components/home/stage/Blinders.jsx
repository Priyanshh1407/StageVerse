'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { roomFlash } from './flash';

const MAX_BLINDERS = 20;

// Audience blinders: warm-white flashes hanging under the front-most truss (row 2), facing the crowd. One draw call
// (screen-facing points); the strobe flickers them too.
function createBlinderMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: { uLevel: { value: 0 }, uSize: { value: 520 } },
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
            void main() {
                float d = length(gl_PointCoord - 0.5) * 2.0;
                float glow = pow(max(0.0, 1.0 - d), 2.2);
                float hot = smoothstep(0.3, 0.0, d);
                gl_FragColor = vec4(vec3(1.0, 0.93, 0.8), (glow + hot) * uLevel);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    });
}

/** Spread `count` blinders evenly along the front truss. */
function layoutBlinders(geometry, count) {
    const n = Math.min(count, MAX_BLINDERS);
    const pos = geometry.attributes.position;
    for (let i = 0; i < n; i++) pos.setXYZ(i, n > 1 ? -11 + (22 * i) / (n - 1) : 0, 15.8 - 0.55, -3.7);
    pos.needsUpdate = true;
    geometry.setDrawRange(0, n);
}

export default function Blinders({ look, count = 8 }) {
    const material = useMemo(() => createBlinderMaterial(), []);
    const geometry = useMemo(() => {
        const positions = new Float32Array(MAX_BLINDERS * 3);
        return new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3));
    }, []);
    useEffect(() => () => {
        geometry.dispose();
        material.dispose();
    }, [geometry, material]);

    useEffect(() => layoutBlinders(geometry, count), [count, geometry]);

    const points = useRef();
    useFrame(({ clock }) => {
        if (!points.current) return;
        const f = roomFlash(look.current, clock.elapsedTime, count);
        const level = Math.max(Math.min(f.blinder, 1.5), f.strobe) * 1.8; // blinders are meant to blind
        points.current.material.uniforms.uLevel.value = level;
        points.current.visible = level > 0.01;
    });

    return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}
