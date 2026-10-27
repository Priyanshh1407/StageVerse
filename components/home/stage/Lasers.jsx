'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MAX_LASERS = 60;
const LENGTH = 48;

// Two laser sources on the deck fanning thin beams out over the crowd. One instanced draw call;
// every beam's fan angle and wobble is computed in the vertex shader.
const SOURCES = [[-5, 1.2, -8.5], [5, 1.2, -8.5]];

function createLaserMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color('#39ff14') },
            uLevel: { value: 0 },
            uSpeed: { value: 1 },
        },
        vertexShader: /* glsl */ `
            attribute float aFan;    // -1..1 position in the fan
            attribute float aSide;   // -1 left source, 1 right source
            uniform float uTime;
            uniform float uSpeed;
            varying float vAlong;
            void main() {
                vAlong = position.z / ${LENGTH.toFixed(1)};
                float t = uTime * uSpeed;
                float yaw = aFan * 0.75 + sin(t * 0.8 + aFan * 3.0 + aSide) * 0.18 - aSide * 0.12;
                float pitch = 0.1 + sin(t * 1.1 + aFan * 5.0) * 0.07;    // just above the crowd
                vec3 p = position;
                // pitch (around X) then yaw (around Y); beams start along +Z toward the audience
                p = vec3(p.x, p.y * cos(pitch) + p.z * sin(pitch), -p.y * sin(pitch) + p.z * cos(pitch));
                p = vec3(p.x * cos(yaw) + p.z * sin(yaw), p.y, -p.x * sin(yaw) + p.z * cos(yaw));
                gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(p, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform vec3 uColor;
            uniform float uLevel;
            varying float vAlong;
            void main() {
                float fade = (1.0 - vAlong) * smoothstep(0.0, 0.02, vAlong);
                gl_FragColor = vec4(uColor * 1.6, fade * uLevel);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    });
}

export default function Lasers({ look, count = 24 }) {
    const material = useMemo(() => createLaserMaterial(), []);
    const geometry = useMemo(() => {
        const g = new THREE.BoxGeometry(0.035, 0.035, LENGTH);
        g.translate(0, 0, LENGTH / 2);
        const fan = new Float32Array(MAX_LASERS);
        const side = new Float32Array(MAX_LASERS);
        const perSide = MAX_LASERS / 2;
        for (let i = 0; i < MAX_LASERS; i++) {
            side[i] = i % 2 ? 1 : -1;                       // alternate sources so any count is balanced
            const k = Math.floor(i / 2);
            fan[i] = perSide > 1 ? (k / (perSide - 1)) * 2 - 1 : 0;
        }
        g.setAttribute('aFan', new THREE.InstancedBufferAttribute(fan, 1));
        g.setAttribute('aSide', new THREE.InstancedBufferAttribute(side, 1));
        return g;
    }, []);
    useEffect(() => () => {
        geometry.dispose();
        material.dispose();
    }, [geometry, material]);

    const mesh = useRef();
    const color = useRef({ hex: null, target: new THREE.Color() });

    useEffect(() => {
        const m = new THREE.Matrix4();
        for (let i = 0; i < MAX_LASERS; i++) mesh.current.setMatrixAt(i, m.makeTranslation(...SOURCES[i % 2]));
        mesh.current.instanceMatrix.needsUpdate = true;
    }, []);

    useFrame((_, delta) => {
        if (!mesh.current) return;
        const target = look.current;
        const u = mesh.current.material.uniforms;
        const ease = 1 - Math.exp(-Math.min(delta, 0.1) * 5);
        if (target.laserColor !== color.current.hex) {
            color.current.hex = target.laserColor;
            color.current.target.set(target.laserColor);
        }
        u.uTime.value += delta;
        u.uSpeed.value = 0.4 + (target.speed ?? 1) * 0.5;
        u.uColor.value.lerp(color.current.target, ease);
        const wanted = (target.laser ?? 0) * (target.master ?? 1) * (1 + (target.pulse ?? 0) * 0.5);
        u.uLevel.value += (wanted - u.uLevel.value) * ease;
        // Skip the draw call entirely while the lasers are off
        mesh.current.visible = u.uLevel.value > 0.01;
        mesh.current.count = Math.min(count, MAX_LASERS);
    });

    return <instancedMesh ref={mesh} args={[geometry, material, MAX_LASERS]} frustumCulled={false} />;
}
