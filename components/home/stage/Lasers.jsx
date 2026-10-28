'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MAX_LASERS = 60;
const LENGTH = 48;

// Two laser projectors on the front of the deck. Each throws a flat fan of beams out over the
// audience, angled up above head height; the whole fan scans up and down together, like a real
// laser sheet. One instanced draw call; every beam's angle is computed in the vertex shader.
// Each source is the aperture on the front of a projector standing on the deck (deck top y = 0.5)
const SOURCES = [[-6, 0.8, -0.38], [6, 0.8, -0.38]];
const PROJECTOR = { size: [0.75, 0.42, 0.62], center: (s) => [s[0], 0.5 + 0.21, s[2] - 0.31] };

function createLaserMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color('#39ff14') },
            uLevel: { value: 0 },
            uSpeed: { value: 1 },
            uPhase: { value: 0 },
            uChase: { value: 0 },
            uSpread: { value: 1 },
        },
        vertexShader: /* glsl */ `
            attribute float aFan;    // -1..1 position in the fan
            attribute float aSide;   // -1 left source, 1 right source
            uniform float uTime;
            uniform float uSpeed;
            uniform float uPhase;
            uniform float uChase;
            uniform float uSpread;
            varying float vAlong;
            varying float vOn;
            void main() {
                vAlong = position.z / ${LENGTH.toFixed(1)};
                // Chase: a window of beams runs across each fan, the rest switch off
                float slot = aFan * 0.5 + 0.5 + (aSide > 0.0 ? 0.5 : 0.0);
                float on = step(fract(uTime * 1.8 - slot), 0.3);
                vOn = mix(1.0, on, uChase);
                float t = uPhase; // accumulated in JS, so speed changes never make the fan leap
                // Fan spread over the audience, each source leaning in toward the centre of the room
                // (+0.1 turns the whole show slightly to the audience's right)
                float yaw = 0.1 + aFan * 0.38 * uSpread - aSide * 0.18 + sin(t * 0.35 + aSide) * 0.06;
                // The whole sheet rises well above head height and scans slowly up and down
                float pitch = 0.42 + sin(t * 0.7 + aSide * 1.3) * 0.14;
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
            varying float vOn;
            void main() {
                float fade = (1.0 - vAlong) * smoothstep(0.0, 0.02, vAlong);
                gl_FragColor = vec4(uColor * 1.6, fade * uLevel * vOn);
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
        // Alternate sources so any count is balanced; within a fan, light from the centre out,
        // so a small laserAmount gives the centre one or two beams
        const reach = Math.ceil((perSide - 1) / 2) || 1;
        for (let i = 0; i < MAX_LASERS; i++) {
            side[i] = i % 2 ? 1 : -1;
            const k = Math.floor(i / 2);
            const slot = k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2);
            fan[i] = slot / reach;
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
    // One material for both apertures, so both glow in the laser colour
    const apertureMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#39ff14', toneMapped: false }), []);
    useEffect(() => () => apertureMaterial.dispose(), [apertureMaterial]);
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
        u.uSpeed.value += (0.4 + (target.speed ?? 1) * 0.5 - u.uSpeed.value) * ease;
        u.uPhase.value += delta * u.uSpeed.value;
        u.uChase.value = target.laserChase ?? 0;
        u.uSpread.value += ((target.laserSpread ?? 1) - u.uSpread.value) * ease;
        u.uColor.value.lerp(color.current.target, ease);
        const wanted = (target.laser ?? 0) * (target.master ?? 1) * (1 + (target.pulse ?? 0) * 0.5);
        u.uLevel.value += (wanted - u.uLevel.value) * ease;
        // The projector's aperture glows in the laser colour while it fires
        apertureMaterial.color.copy(u.uColor.value).multiplyScalar(0.15 + u.uLevel.value * 2);
        // Skip the beams' draw call entirely while the lasers are off
        mesh.current.visible = u.uLevel.value > 0.01;
        const lit = Math.min(count, MAX_LASERS) * (target.laserAmount ?? 1);
        mesh.current.count = Math.max(2, Math.round(lit / 2) * 2); // whole pairs: one per projector
    });

    return (
        <group>
            <instancedMesh ref={mesh} args={[geometry, material, MAX_LASERS]} frustumCulled={false} />
            {/* The projectors themselves: a housing with a glowing aperture where the beams leave */}
            {SOURCES.map((src) => (
                <group key={src[0]}>
                    <mesh position={PROJECTOR.center(src)}>
                        <boxGeometry args={PROJECTOR.size} />
                        <meshLambertMaterial color="#1c1f27" />
                    </mesh>
                    <mesh position={[src[0], src[1], src[2] + 0.005]} material={apertureMaterial}>
                        <circleGeometry args={[0.07, 20]} />
                    </mesh>
                </group>
            ))}
        </group>
    );
}
