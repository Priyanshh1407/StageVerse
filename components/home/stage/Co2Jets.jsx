'use client';

import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CO2_FADE, CO2_JETS, CO2_TRUSS_JETS } from '@/lib/show/co2';
import { stateActive } from '@/lib/show/effects';
import { CANNON_UNITS, CONFETTI_SHOTS, CONFETTI_SHOT_GAP, blastsFromShots } from '@/lib/show/confetti';
import { cannonLayout, co2Layout, co2TrussLayout } from './rigLayout';
import { DECK_HEIGHT, ROWS } from './trussGeometry';
import { roomFlash } from './flash';
import { createNoiseTexture } from './LowFog';

// CO2 jets (item 15). Two mounts, the same plume:
// - floor: six nozzles on the stage front (placed clear of the lights by co2Layout) blasting white
//   plumes about 8.5 m straight up, leaning a little toward the audience;
// - truss: four nozzles on the front face of the top truss (co2TrussLayout) blasting out over the
//   audience and down, carrying ~14 m, well past the barrier; the plume sags as it slows (CO2 is
//   heavier than air).
// - confetti: the confetti cannons are CO2-powered, so each confetti shot leaves the muzzle in a
//   short white CO2 blast along the barrel (driven by the confetti state: one blast per shot).
// A jet blasts for as long as its valve is open; when it closes the plume detaches from the nozzle,
// billows out and fades over CO2_FADE seconds.
//
// Cheap enough for integrated graphics:
// - one draw call per mount for all its plumes: soft, camera-facing smoke puffs (instanced quads)
//   streaming along each jet; everything about a puff (where it is, width, drift, fade) is worked out
//   in the vertex shader from its jet's state, so the CPU only updates a few numbers a frame;
// - nothing is drawn while the jets are idle (zero instances);
// - no real lights, no new files: the smoke texture is the low fog's noise, made in code;
// - fewer puffs per jet on integrated GPUs.
// The nozzles themselves are one merged mesh per mount (one more draw call).

const FLOW = 1.5;    // stream speed: 1.5 plume lengths per second (about 11-13 m/s)
const PUFFS = { high: 32, low: 20 };
const up = new THREE.Vector3(0, 1, 0);
const lean = new THREE.Vector3(0, 1, 0.05).normalize(); // floor jets: a little toward the audience

const MOUNTS = {
    floor: { count: CO2_JETS, key: 'co2', reach: 8.5, sag: 0, layout: (n) => co2Layout(n).map((j) => ({ pos: j.pos, dir: lean.toArray() })) },
    truss: { count: CO2_TRUSS_JETS, key: 'co2Truss', reach: 14.0, sag: 0.015, layout: co2TrussLayout },
    // the confetti cannons' own CO2 (no nozzles of their own: the cannons are drawn by Confetti)
    confetti: {
        count: CANNON_UNITS, key: 'confetti', reach: 7.0, sag: 0.01, layout: () => cannonLayout('confetti'), nozzles: false,
        shots: { count: CONFETTI_SHOTS, gap: CONFETTI_SHOT_GAP, blast: 0.35 },
    },
};

const vertexFor = (n) => /* glsl */ `
    attribute vec3 aPuff;      // jet index, place in the stream (0..1), random
    uniform vec3 uNozzle[${n}];
    uniform vec3 uDir[${n}];      // which way each jet points (unit length)
    uniform vec2 uState[${n}];    // per jet: seconds since it started firing (< 0 idle), how long it fires
    uniform float uTime;
    uniform float uReach;         // how far a blast reaches, in metres
    uniform float uSag;           // how much the plume drops as it travels (truss jets)
    varying vec2 vUv;
    varying float vAlpha;
    varying float vSeed;

    void main() {
        int j = int(aPuff.x + 0.5);
        vec3 nozzle = uNozzle[0];
        vec3 dir = uDir[0];
        vec2 st = uState[0];
        for (int k = 1; k < ${n}; k++) if (k == j) { nozzle = uNozzle[k]; dir = uDir[k]; st = uState[k]; }
        float age = st.x;
        float len = st.y;
        vUv = uv;
        vSeed = aPuff.z;
        vAlpha = 0.0;
        if (age < 0.0 || age > len + ${CO2_FADE.toFixed(2)}) {
            gl_Position = vec4(0.0, 0.0, -2.0, 1.0); // outside the view: nothing drawn
            return;
        }
        float firing = min(age, len);
        float after = max(0.0, age - len);
        float fade = after / ${CO2_FADE.toFixed(2)};
        // Where this puff is in the stream: gas leaves the nozzle continuously while the valve is
        // open; when it closes, the whole plume detaches and drifts on, slowing
        float phase = fract(aPuff.y + firing * ${FLOW.toFixed(2)}) + 0.3 * (1.0 - exp(-after * 2.0));
        float front = 1.0 - exp(-age * 7.0); // the blast shooting out in the first moments
        float h = phase * uReach;
        // a tight jet at the nozzle, widening as it goes; it billows out as it dissipates
        float r = (0.16 + 0.15 * h) * (1.0 + 1.1 * fade);
        float size = 2.4 * r * (0.75 + 0.5 * fract(aPuff.z * 7.31));
        vec3 jitter = (vec3(fract(aPuff.z * 13.7), fract(aPuff.z * 41.9), fract(aPuff.z * 29.3)) - 0.5) * r * 0.7;
        float sway = sin(uTime * 1.7 + aPuff.z * 40.0) * 0.012 * h * h;
        vec3 centre = nozzle + dir * h + jitter + vec3(sway, -uSag * h * h, 0.0);

        vAlpha = (1.0 - smoothstep(front - 0.04, front + 0.03, phase)) // not past the blast's front yet
            * (1.0 - smoothstep(0.78, 1.02, phase))                   // thinning out at the end
            * smoothstep(0.0, 0.03, phase)                            // straight out of the nozzle
            * mix(1.0, 0.5, phase)                                    // densest near the nozzle
            * (1.0 - fade) * (1.0 - fade);                            // dissipating

        // a quad facing the camera, turned a little per puff so the texture never repeats
        float a = aPuff.z * 6.283 + uTime * 0.4 * (aPuff.z - 0.5);
        vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * position.xy * size;
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        gl_Position = projectionMatrix * viewMatrix * vec4(centre + right * q.x + camUp * q.y, 1.0);
    }
`;

const FRAGMENT = /* glsl */ `
    uniform sampler2D uNoise;
    uniform vec3 uColor;
    uniform float uTime;
    varying vec2 vUv;
    varying float vAlpha;
    varying float vSeed;

    void main() {
        float d = length(vUv - 0.5) * 2.0;
        float disc = 1.0 - smoothstep(0.3, 1.0, d);
        // two layers of swirling noise, drifting at different speeds
        float n1 = texture2D(uNoise, vUv * 0.6 + vSeed * vec2(3.1, 7.7) + vec2(0.0, -uTime * 0.18)).r;
        float n2 = texture2D(uNoise, vUv * 1.4 + vSeed * vec2(5.3, 1.9) + vec2(uTime * 0.07, 0.0)).r;
        float density = disc * smoothstep(0.2, 0.75, 0.6 * n1 + 0.55 * n2);
        float alpha = density * vAlpha * 0.85;
        if (alpha < 0.004) discard;
        // premultiplied and partly additive (see the material): lit gas brightens whatever is behind
        // it, so it still reads in front of the bright LED wall
        gl_FragColor = vec4(uColor * alpha, alpha * 0.75);
    }
`;

/**
 * The nozzles, merged into one geometry: on the floor a low base plate with an upright barrel; on
 * the truss a clamp on the truss's front face with a barrel along the jet.
 */
function createNozzles(jets, mount) {
    if (MOUNTS[mount]?.nozzles === false) return null;
    const parts = [];
    const q = new THREE.Quaternion();
    for (const { pos, dir } of jets) {
        const [x, y, z] = pos;
        if (mount === 'truss') {
            const face = ROWS[0].z + 0.225;
            const clamp = new THREE.BoxGeometry(0.16, 0.2, 0.12);
            clamp.translate(x, y, face + 0.06);
            const d = new THREE.Vector3(...dir);
            const barrel = new THREE.CylinderGeometry(0.045, 0.06, 0.28, 12);
            barrel.applyQuaternion(q.setFromUnitVectors(up, d));
            barrel.translate(x - d.x * 0.14, y - d.y * 0.14, z - d.z * 0.14);
            parts.push(clamp, barrel);
        } else {
            const base = new THREE.BoxGeometry(0.3, 0.1, 0.26);
            base.translate(x, DECK_HEIGHT + 0.05, z);
            const barrel = new THREE.CylinderGeometry(0.055, 0.075, 0.26, 12);
            barrel.translate(x, DECK_HEIGHT + 0.23, z);
            parts.push(base, barrel);
        }
    }
    const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()));
    parts.forEach((g) => g.dispose());
    return merged;
}

const tintA = new THREE.Color();
const tintB = new THREE.Color();

/** Each frame: the jets' state into the shader, and the smoke's colour from the rig. */
function driveCo2(geometry, material, target, time, blinders, key, count, instances, shots) {
    const state = shots ? blastsFromShots(target[key], count, shots) : target[key];
    const active = stateActive(state, count, CO2_FADE);
    geometry.instanceCount = active ? instances : 0;
    if (!active) return;
    const u = material.uniforms;
    for (let j = 0; j < count; j++) u.uState.value[j].set(state[j * 2], state[j * 2 + 1]);
    u.uTime.value = time;
    // White gas, lit by the rig: it takes a little of the show's colour, brightens with the stage
    // light and flares with the strobes and blinders; still visible on a dark stage
    const flash = roomFlash(target, time, blinders).total;
    // (capped: under the drop's strobes and blinders, plus bloom, more blew the plumes out into a white wall)
    const level = Math.min(1.05, 0.62 + 0.3 * Math.min(1, (target.master ?? 1) * Math.min(target.intensity ?? 1, 1.4)) + 0.25 * Math.min(1, flash));
    tintA.set(target.colorA ?? '#ffffff').lerp(tintB.set(target.colorB ?? '#ffffff'), 0.5);
    u.uColor.value.setRGB(1, 1, 1).lerp(tintA, 0.18).multiplyScalar(level);
}

/** Puts the nozzles' positions and directions into the shader. */
function placeNozzles(material, jets) {
    jets.forEach((jet, i) => {
        material.uniforms.uNozzle.value[i].set(...jet.pos);
        material.uniforms.uDir.value[i].set(...jet.dir);
    });
}

export default function Co2Jets({ look, count, quality = 'low', blinders = 8, mount = 'floor' }) {
    const m = MOUNTS[mount] ?? MOUNTS.floor;
    const jets = useMemo(() => m.layout(count), [m, count]);
    const nozzles = useMemo(() => createNozzles(jets, mount), [jets, mount]);
    const noise = useMemo(() => createNoiseTexture(), []);
    const puffs = PUFFS[quality] ?? PUFFS.low;
    const n = m.count;

    const geometry = useMemo(() => {
        const g = new THREE.InstancedBufferGeometry();
        const quad = new THREE.PlaneGeometry(1, 1);
        g.index = quad.index;
        g.setAttribute('position', quad.attributes.position);
        g.setAttribute('uv', quad.attributes.uv);
        const data = new Float32Array(n * puffs * 3);
        let seed = 0.6180339;
        for (let j = 0; j < n; j++) {
            for (let p = 0; p < puffs; p++) {
                const i = (j * puffs + p) * 3;
                seed = (seed + 0.6180339887) % 1;
                data[i] = j;
                data[i + 1] = (p + 0.5 * seed) / puffs; // spread evenly along the stream
                data[i + 2] = seed;
            }
        }
        g.setAttribute('aPuff', new THREE.InstancedBufferAttribute(data, 3));
        g.instanceCount = 0;
        return g;
    }, [puffs, n]);

    const material = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uNozzle: { value: Array.from({ length: n }, () => new THREE.Vector3()) },
            uDir: { value: Array.from({ length: n }, () => new THREE.Vector3(0, 1, 0)) },
            uState: { value: Array.from({ length: n }, () => new THREE.Vector2(-1, 0)) },
            uTime: { value: 0 },
            uReach: { value: m.reach },
            uSag: { value: m.sag },
            uNoise: { value: noise },
            uColor: { value: new THREE.Color(1, 1, 1) },
        },
        vertexShader: vertexFor(n),
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
    }), [noise, n, m]);

    useEffect(() => placeNozzles(material, jets), [jets, material]);
    useEffect(() => () => { geometry.dispose(); }, [geometry]);
    useEffect(() => () => { nozzles?.dispose(); }, [nozzles]);
    useEffect(() => () => { material.dispose(); noise.dispose(); }, [material, noise]);

    useFrame(({ clock }) => driveCo2(geometry, material, look.current, clock.elapsedTime, blinders, m.key, n, n * puffs, m.shots));

    return (
        <>
            {nozzles && (
                <mesh geometry={nozzles}>
                    <meshLambertMaterial color="#2a2e37" emissive="#050608" />
                </mesh>
            )}
            <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />
        </>
    );
}
