'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { roomFlash } from './flash';
import { DECK_HEIGHT } from './trussGeometry';

// Low fog lying across the floor in front of the stage and on the deck, catching the show's
// colours, thinning toward the audience. Two flat additive layers (2 draw calls, one shader).
// Light enough for integrated graphics: the drifting noise is a small tiling texture made once
// on the CPU and sampled twice per pixel (computing the noise per pixel cost Iris Xe ~40 fps
// from the high camera shots, which see the most floor).
const LAYERS = [
    // the floor in front of the stage, out to 9 m (further out it had thinned to almost nothing, but
    // reached nearly to the camera and covered half the screen: a third of a frame on Iris Xe):
    // lit only by the aerials pointing down at the audience
    { y: 0.18, z: 4, depth: 10, width: 38, seed: 0.13, strength: 1.2, lit: 'aerials' },
    // on the stage deck: lit by the washes, which light the stage
    { y: DECK_HEIGHT + 0.12, z: -8, depth: 18, width: 40, seed: 0.57, strength: 0.8, lit: 'washes' },
];
const SIZE = 128;

/** A tiling fractal noise texture (4 octaves of smooth value noise), 128 x 128, one channel. */
function createNoiseTexture() {
    const rand = (x, y, o) => {
        const s = Math.sin((x % o) * 127.1 + (y % o) * 311.7 + o * 74.7) * 43758.5453;
        return s - Math.floor(s);
    };
    const data = new Uint8Array(SIZE * SIZE * 4);
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            let v = 0;
            let a = 0.5;
            for (let o = 4; o <= 32; o *= 2) {                                  // grid cells per tile: 4, 8, 16, 32
                const fx = (x / SIZE) * o;
                const fy = (y / SIZE) * o;
                const ix = Math.floor(fx);
                const iy = Math.floor(fy);
                const tx = fx - ix;
                const ty = fy - iy;
                const sx = tx * tx * (3 - 2 * tx);
                const sy = ty * ty * (3 - 2 * ty);
                const n00 = rand(ix, iy, o);
                const n10 = rand(ix + 1, iy, o);
                const n01 = rand(ix, iy + 1, o);
                const n11 = rand(ix + 1, iy + 1, o);
                v += a * ((n00 * (1 - sx) + n10 * sx) * (1 - sy) + (n01 * (1 - sx) + n11 * sx) * sy);
                a *= 0.5;
            }
            const i = (y * SIZE + x) * 4;
            data[i] = data[i + 1] = data[i + 2] = Math.round(Math.min(1, v / 0.9375) * 255);
            data[i + 3] = 255;
        }
    }
    const texture = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return texture;
}

const VERTEX = /* glsl */ `
    varying vec3 vWorld;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
    }
`;
const FRAGMENT = /* glsl */ `
    uniform sampler2D uNoise;
    uniform float uTime;
    uniform float uSeed;
    uniform float uStrength;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uLevel;
    uniform float uFlash;
    varying vec3 vWorld;
    varying vec2 vUv;
    void main() {
        // two layers of the noise drifting at different speeds and scales, multiplied: wisps
        vec2 p = vWorld.xz * 0.035 + uSeed;
        float a = texture2D(uNoise, p + vec2(uTime * 0.008, uTime * 0.003)).r;
        float b = texture2D(uNoise, p * 1.7 - vec2(uTime * 0.005, -uTime * 0.004)).r;
        float d = smoothstep(0.3, 0.85, a * (0.55 + 0.9 * b));
        // soft edges all round, thinning toward the audience
        float edge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x) * smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
        float thin = exp(-max(0.0, vWorld.z) * 0.07);
        vec3 tint = mix(uColorA, uColorB, smoothstep(-16.0, 16.0, vWorld.x + sin(uTime * 0.1) * 6.0));
        vec3 c = (mix(tint, vec3(0.8), 0.25) * uLevel + vec3(0.6) * uFlash) * d * edge * thin * uStrength * 0.5;
        gl_FragColor = vec4(c, 1.0);
    }
`;

function createFogMaterial(noise, { seed, strength }) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uNoise: { value: noise },
            uTime: { value: 0 },
            uSeed: { value: seed },
            uStrength: { value: strength },
            uColorA: { value: new THREE.Color('#19d9ff') },
            uColorB: { value: new THREE.Color('#ff3df2') },
            uLevel: { value: 0 },
            uFlash: { value: 0 },
        },
        vertexShader: VERTEX,     // the same source for every layer: one shader program to compile
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    });
}

export default function LowFog({ look, blinders }) {
    const materials = useMemo(() => {
        const noise = createNoiseTexture();
        return LAYERS.map((l) => createFogMaterial(noise, l));
    }, []);
    const group = useRef();
    useFrame(({ clock }, delta) => {
        if (!group.current) return;
        const target = look.current;
        const t = clock.elapsedTime;
        const master = (target.master ?? 1) * Math.min(target.intensity, 1.4) * (0.6 + 0.4 * (target.haze ?? 0.5));
        const down = Math.min(1, Math.max(0, (0.4 - (target.tiltShift ?? 0)) / 0.6)) * (1 - Math.min(1, target.converge ?? 0));
        const wanted = { aerials: master * (target.beams ?? 0) * down, washes: master * (target.wash ?? 0) };
        const flash = Math.min(1, roomFlash(target, t, blinders).total);
        group.current.children.forEach((child, i) => {
            const u = child.material.uniforms;
            const level = wanted[LAYERS[i].lit];
            u.uTime.value = t;
            u.uColorA.value.set(target.colorA);
            u.uColorB.value.set(target.colorB);
            u.uLevel.value += (level - u.uLevel.value) * Math.min(1, delta * 4);
            u.uFlash.value = flash;
            // a dark layer isn't drawn at all (no GPU time spent on fog nobody can see)
            child.visible = u.uLevel.value > 0.005 || flash > 0.01;
        });
    });
    return (
        <group ref={group}>
            {LAYERS.map((l, i) => (
                <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, l.y, l.z]} material={materials[i]} renderOrder={5}>
                    <planeGeometry args={[l.width, l.depth]} />
                </mesh>
            ))}
        </group>
    );
}
