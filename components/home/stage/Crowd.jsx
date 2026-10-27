'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createCrowdTexture, CROWD_CANVAS } from './crowdTexture';

// Silhouettes are near-black; the top edge of each head catches the stage light (rim light)
function createCrowdMaterial(texture) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uMap: { value: texture },
            uColorA: { value: new THREE.Color('#19d9ff') },
            uColorB: { value: new THREE.Color('#ff3df2') },
            uLight: { value: 0.5 },
        },
        vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
            uniform sampler2D uMap;
            uniform vec3 uColorA;
            uniform vec3 uColorB;
            uniform float uLight;
            varying vec2 vUv;
            void main() {
                float a = texture2D(uMap, vUv).a;
                if (a < 0.5) discard;
                // Rim: inside the silhouette, but with empty space just above (toward the stage)
                float above = texture2D(uMap, vUv + vec2(0.0, 0.01)).a;
                float rim = (1.0 - above) * smoothstep(0.2, 1.0, vUv.y);
                vec3 tint = mix(uColorA, uColorB, vUv.x);
                // Heads further back (higher up the strip) sit in haze: slightly lifted, tinted
                float far = smoothstep(0.35, 1.0, vUv.y);
                vec3 base = vec3(0.004, 0.005, 0.01) + tint * far * 0.035 * uLight;
                gl_FragColor = vec4(base + tint * rim * uLight * 0.6, 1.0);
            }
        `,
        toneMapped: false,
    });
}

// Fraction of the screen height the crowd's top edge reaches (only heads at the very bottom)
const TOP = 0.2;
const DISTANCE = 4;

/** Place the crowd strip along the bottom of the camera's view, whatever the shot. */
function placeCrowd(mesh, camera, bob) {
    camera.updateMatrixWorld(); // the director may have just moved it this frame
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * DISTANCE;
    const width = halfH * camera.aspect * 2 * 1.08;
    const height = (width * CROWD_CANVAS.height) / CROWD_CANVAS.width;
    mesh.scale.set(width, height, 1);
    mesh.position.set(0, -halfH + TOP * 2 * halfH - height / 2 + bob, -DISTANCE).applyMatrix4(camera.matrixWorld);
    mesh.quaternion.copy(camera.quaternion);
}

/**
 * The audience: a strip of heads along the bottom of the frame, rim-lit in the show's colours,
 * nodding on the beat. One alpha-tested plane that moves with the camera.
 */
export default function Crowd({ seed = 7, look }) {
    const texture = useMemo(() => createCrowdTexture(seed), [seed]);
    const material = useMemo(() => createCrowdMaterial(texture), [texture]);
    useEffect(() => () => {
        texture.dispose();
        material.dispose();
    }, [texture, material]);
    const mesh = useRef();
    const time = useRef(0);

    useFrame(({ camera }, delta) => {
        if (!mesh.current) return;
        time.current += delta;
        const target = look?.current;
        const u = mesh.current.material.uniforms;
        if (target) {
            u.uColorA.value.set(target.colorA);
            u.uColorB.value.set(target.colorB);
            u.uLight.value = (target.master ?? 1) * Math.min(target.intensity, 1.4) * 0.55 + (target.blinder ?? 0) * 0.8;
        }
        const bob = Math.abs(Math.sin(time.current * 2.2)) * 0.006 + (target?.pulse ?? 0) * 0.025;
        placeCrowd(mesh.current, camera, bob);
    });

    return (
        <mesh ref={mesh} material={material} renderOrder={10} frustumCulled={false}>
            <planeGeometry args={[1, 1]} />
        </mesh>
    );
}
