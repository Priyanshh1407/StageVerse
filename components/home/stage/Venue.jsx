'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// The venue's front wall, where the homepage starts: a dark facade with a doorway, a neon frame,
// a sign above the doors, and warm light spilling out onto the ground. The camera walks through
// the doorway into the arena (see the 'outside' and 'doorway' shots). The facade is 10 m tall so
// the white beams searching the sky above the arena show over it.
export const WALL = { z: 34, width: 80, height: 10, door: { width: 9, height: 6.5 }, depth: 1.2 };

function createWallGeometry() {
    const { width, height, door } = WALL;
    const w = width / 2;
    const d = door.width / 2;
    // The outline with the doorway notched out of the bottom edge
    const shape = new THREE.Shape();
    shape.moveTo(-w, 0);
    shape.lineTo(-d, 0);
    shape.lineTo(-d, door.height);
    shape.lineTo(d, door.height);
    shape.lineTo(d, 0);
    shape.lineTo(w, 0);
    shape.lineTo(w, height);
    shape.lineTo(-w, height);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: WALL.depth, bevelEnabled: false });
    geometry.translate(0, 0, WALL.z - WALL.depth / 2);
    return geometry;
}

// Dark concrete panels, lit around the doorway by the warm house light and the show's colour
function createWallMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: { uHouse: { value: 1 }, uColor: { value: new THREE.Color('#19d9ff') }, uLight: { value: 0.5 } },
        vertexShader: /* glsl */ `
            varying vec3 vWorld;
            varying vec3 vNormalW;
            void main() {
                vec4 w = modelMatrix * vec4(position, 1.0);
                vWorld = w.xyz;
                vNormalW = normalize(mat3(modelMatrix) * normal);
                gl_Position = projectionMatrix * viewMatrix * w;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uHouse;
            uniform vec3 uColor;
            uniform float uLight;
            varying vec3 vWorld;
            varying vec3 vNormalW;
            float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            void main() {
                // Panel seams every 4 m, a little grain
                vec2 panel = abs(fract(vWorld.xy / vec2(4.0, 3.5)) - 0.5);
                float seam = smoothstep(0.49, 0.5, max(panel.x, panel.y));
                float grain = hash(floor(vWorld.xy * 8.0)) * 0.012;
                vec3 base = vec3(0.028, 0.03, 0.036) + grain - seam * 0.015;
                // Light spilling from the doorway, on the outside face
                float toDoor = length(vWorld.xy - vec2(0.0, 3.0));
                float spill = exp(-toDoor * 0.4) * step(0.5, vNormalW.z);
                vec3 lit = vec3(1.0, 0.68, 0.32) * uHouse * 0.22 + uColor * uLight * 0.1;
                gl_FragColor = vec4(base + lit * spill, 1.0);
            }
        `,
    });
}

// A sign over the doors, drawn once
function createSignTexture(font) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 110px ${font ? `${font}, ` : ''}system-ui, sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '14px';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('STAGEVERSE', 512, 100);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/** Follow the show: house light and the rig's colour on the wall, the neon frame and the light pool. */
function lightVenue(wall, neon, pool, target, color) {
    const house = target.house ?? 0;
    color.set(target.colorA);
    const u = wall.material.uniforms;
    u.uHouse.value = house;
    u.uColor.value.copy(color);
    u.uLight.value = (target.master ?? 1) * Math.min(target.intensity, 1.4);
    neon.color.copy(color).multiplyScalar(1.6);
    pool.uniforms.uHouse.value = house;
    pool.uniforms.uColor.value.copy(color);
}

export default function Venue({ look, font }) {
    const geometry = useMemo(() => createWallGeometry(), []);
    const material = useMemo(() => createWallMaterial(), []);
    const sign = useMemo(() => createSignTexture(font), [font]);
    const neon = useMemo(() => new THREE.MeshBasicMaterial({ color: '#19d9ff', toneMapped: false }), []);
    const pool = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uHouse: { value: 1 }, uColor: { value: new THREE.Color('#19d9ff') } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: /* glsl */ `
            uniform float uHouse;
            uniform vec3 uColor;
            varying vec2 vUv;
            void main() {
                // Brightest at the threshold (top of the plane), fanning out onto the ground
                vec2 p = vUv - vec2(0.5, 1.0);
                float pool = exp(-length(p * vec2(1.6, 1.0)) * 3.2);
                gl_FragColor = vec4(vec3(1.0, 0.7, 0.35) * uHouse * 0.55 + uColor * 0.08, pool);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    }), []);
    useEffect(() => () => {
        geometry.dispose();
        material.dispose();
        sign.dispose();
        neon.dispose();
        pool.dispose();
    }, [geometry, material, sign, neon, pool]);

    const wall = useRef();
    const color = useRef(new THREE.Color());
    useFrame(() => {
        if (wall.current) lightVenue(wall.current, neon, pool, look.current, color.current);
    });

    const { door, z, depth } = WALL;
    const front = z + depth / 2 + 0.02;
    const bar = 0.12;
    return (
        <group>
            <mesh ref={wall} geometry={geometry} material={material} />
            {/* Neon frame around the doorway (outside face) */}
            <mesh position={[-door.width / 2 - bar / 2, door.height / 2, front]} material={neon}><boxGeometry args={[bar, door.height, 0.05]} /></mesh>
            <mesh position={[door.width / 2 + bar / 2, door.height / 2, front]} material={neon}><boxGeometry args={[bar, door.height, 0.05]} /></mesh>
            <mesh position={[0, door.height + bar / 2, front]} material={neon}><boxGeometry args={[door.width + bar * 2, bar, 0.05]} /></mesh>
            {/* Sign over the doors */}
            <mesh position={[0, door.height + 2.2, front]}>
                <planeGeometry args={[12, 2.25]} />
                <meshBasicMaterial map={sign} transparent toneMapped={false} />
            </mesh>
            {/* Warm light pooling on the ground outside the doors */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, front + 6]} material={pool}>
                <planeGeometry args={[18, 12]} />
            </mesh>
        </group>
    );
}
