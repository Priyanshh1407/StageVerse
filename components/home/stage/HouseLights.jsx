'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HOUSE_COLOR } from '@/lib/show/look';

export { HOUSE_COLOR }; // warm tungsten (defined with the looks, so the rig can match it)

// The venue's own lights: a row of warm lamps across the ceiling above the front of the stage
// and down both side walls. On before the show and whenever a cue brings them up (look.house);
// the floor and haze pick up their warmth too (see StageScene / Haze).
function lampPositions() {
    const out = [];
    for (let i = 0; i < 9; i++) out.push([-24 + i * 6, 10.5, 8]);                // balcony-front row over the room (in frame below the navbar)
    for (const side of [-1, 1]) for (let i = 0; i < 5; i++) out.push([side * 20, 8.5, -14 + i * 5]); // side walls
    return out;
}

function createLampMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: { uLevel: { value: 0 }, uColor: { value: new THREE.Color(HOUSE_COLOR) }, uSize: { value: 1300 } },
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
            uniform vec3 uColor;
            void main() {
                float d = length(gl_PointCoord - 0.5) * 2.0;
                float halo = pow(max(0.0, 1.0 - d), 2.5) * 0.85;
                float bulb = smoothstep(0.2, 0.06, d) * 1.6;
                vec3 col = mix(uColor, vec3(1.0, 0.95, 0.85), bulb);
                gl_FragColor = vec4(col, (halo + bulb) * uLevel);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    });
}

export default function HouseLights({ look }) {
    const geometry = useMemo(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lampPositions().flat()), 3));
        return g;
    }, []);
    const material = useMemo(() => createLampMaterial(), []);
    useEffect(() => () => {
        geometry.dispose();
        material.dispose();
    }, [geometry, material]);

    const points = useRef();
    useFrame((_, delta) => {
        if (!points.current) return;
        const u = points.current.material.uniforms;
        const wanted = look.current.house ?? 0;
        u.uLevel.value += (wanted - u.uLevel.value) * Math.min(1, delta * 1.5); // house lights fade slowly
        points.current.visible = u.uLevel.value > 0.005;
    });

    return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}
