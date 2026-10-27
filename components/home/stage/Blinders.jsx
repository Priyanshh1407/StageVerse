'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MAX_BLINDERS = 20;

// Audience blinders: warm-white flashes along the front truss, facing the crowd. One draw call
// (screen-facing points); the strobe flickers them too.
function createBlinderMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: { uLevel: { value: 0 }, uSize: { value: 300 } },
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
    for (let i = 0; i < n; i++) pos.setXYZ(i, n > 1 ? -11 + (22 * i) / (n - 1) : 0, 12.55, -2.6);
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
    const time = useRef(0);
    useFrame((_, delta) => {
        if (!points.current) return;
        time.current += delta;
        const target = look.current;
        const strobe = target.strobe ?? 0;
        const flash = (time.current * 12.5) % 1 < 0.3 ? 1 : 0;
        const level = Math.max(target.blinder ?? 0, strobe * flash) * (target.master ?? 1);
        points.current.material.uniforms.uLevel.value = level;
        points.current.visible = level > 0.01;
    });

    return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}
