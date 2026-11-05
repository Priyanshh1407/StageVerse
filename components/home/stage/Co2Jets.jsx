'use client';

import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CO2_FADE, CO2_JETS, co2Active } from '@/lib/show/co2';
import { co2Layout } from './rigLayout';
import { DECK_HEIGHT } from './trussGeometry';
import { roomFlash } from './flash';
import { createNoiseTexture } from './LowFog';

// CO2 jets (item 15): six nozzles on the stage front (placed clear of the lights by co2Layout) that
// blast white plumes about 7.5 m up for as long as the valve is open; when it closes the plume
// detaches from the nozzle, billows out and fades over CO2_FADE seconds.
//
// Cheap enough for integrated graphics:
// - one draw call for all six plumes: soft, camera-facing smoke puffs (instanced quads) streaming up
//   each jet; everything about a puff (height, width, drift, fade) is worked out in the vertex shader
//   from its jet's state, so the CPU only updates 12 numbers a frame;
// - nothing is drawn while the jets are idle (zero instances);
// - no real lights, no new files: the smoke texture is the low fog's noise, made in code;
// - fewer puffs per jet on integrated GPUs.
// The nozzles themselves are one merged mesh (one more draw call).

const HEIGHT = 8.5;  // how high a blast reaches, in metres above the nozzle
const FLOW = 1.5;    // stream speed: 1.5 column heights per second (about 11 m/s)
const PUFFS = { high: 32, low: 20 };

const VERTEX = /* glsl */ `
    attribute vec3 aPuff;      // jet index, place in the stream (0..1), random
    uniform vec3 uNozzle[${CO2_JETS}];
    uniform vec2 uState[${CO2_JETS}];   // per jet: seconds since it started firing (< 0 idle), how long it fires
    uniform float uTime;
    varying vec2 vUv;
    varying float vAlpha;
    varying float vSeed;

    void main() {
        int j = int(aPuff.x + 0.5);
        vec3 nozzle = uNozzle[0];
        vec2 st = uState[0];
        for (int k = 1; k < ${CO2_JETS}; k++) if (k == j) { nozzle = uNozzle[k]; st = uState[k]; }
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
        // open; when it closes, the whole column detaches and drifts up, slowing
        float phase = fract(aPuff.y + firing * ${FLOW.toFixed(2)}) + 0.3 * (1.0 - exp(-after * 2.0));
        float front = 1.0 - exp(-age * 7.0); // the blast shooting up in the first moments
        float h = phase * ${HEIGHT.toFixed(1)};
        // a tight jet at the nozzle, widening as it rises; it billows out as it dissipates
        float r = (0.16 + 0.15 * h) * (1.0 + 1.1 * fade);
        float size = 2.4 * r * (0.75 + 0.5 * fract(aPuff.z * 7.31));
        vec3 jitter = vec3(fract(aPuff.z * 13.7) - 0.5, 0.0, fract(aPuff.z * 29.3) - 0.5) * r * 0.7;
        float sway = sin(uTime * 1.7 + aPuff.z * 40.0) * 0.012 * h * h;
        // leaning a little toward the audience, away from the lights behind
        vec3 centre = nozzle + vec3(jitter.x + sway, h, jitter.z + 0.05 * h);

        vAlpha = (1.0 - smoothstep(front - 0.04, front + 0.03, phase)) // not above the blast's front yet
            * (1.0 - smoothstep(0.78, 1.02, phase))                   // thinning out at the top
            * smoothstep(0.0, 0.03, phase)                            // straight out of the nozzle
            * mix(1.0, 0.5, phase)                                    // densest low down
            * (1.0 - fade) * (1.0 - fade);                            // dissipating

        // a quad facing the camera, turned a little per puff so the texture never repeats
        float a = aPuff.z * 6.283 + uTime * 0.4 * (aPuff.z - 0.5);
        vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * position.xy * size;
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        gl_Position = projectionMatrix * viewMatrix * vec4(centre + right * q.x + up * q.y, 1.0);
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

/** The nozzles: a low base plate with an upright barrel, all six merged into one geometry. */
function createNozzles(jets) {
    const parts = [];
    for (const { pos } of jets) {
        const [x, , z] = pos;
        const base = new THREE.BoxGeometry(0.3, 0.1, 0.26);
        base.translate(x, DECK_HEIGHT + 0.05, z);
        const barrel = new THREE.CylinderGeometry(0.055, 0.075, 0.26, 12);
        barrel.translate(x, DECK_HEIGHT + 0.23, z);
        parts.push(base, barrel);
    }
    const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()));
    parts.forEach((g) => g.dispose());
    return merged;
}

const tintA = new THREE.Color();
const tintB = new THREE.Color();

/** Each frame: the jets' state into the shader, and the smoke's colour from the rig. */
function driveCo2(geometry, material, target, time, blinders, instances) {
    const state = target.co2;
    const active = co2Active(state);
    geometry.instanceCount = active ? instances : 0;
    if (!active) return;
    const u = material.uniforms;
    for (let j = 0; j < CO2_JETS; j++) u.uState.value[j].set(state[j * 2], state[j * 2 + 1]);
    u.uTime.value = time;
    // White gas, lit by the rig: it takes a little of the show's colour, brightens with the stage
    // light and flares with the strobes and blinders; still visible on a dark stage
    const flash = roomFlash(target, time, blinders).total;
    // (capped: under the drop's strobes and blinders, plus bloom, more blew the plumes out into a white wall)
    const level = Math.min(1.05, 0.62 + 0.3 * Math.min(1, (target.master ?? 1) * Math.min(target.intensity ?? 1, 1.4)) + 0.25 * Math.min(1, flash));
    tintA.set(target.colorA ?? '#ffffff').lerp(tintB.set(target.colorB ?? '#ffffff'), 0.5);
    u.uColor.value.setRGB(1, 1, 1).lerp(tintA, 0.18).multiplyScalar(level);
}

/** Puts the nozzles' positions into the shader. */
function placeNozzles(material, jets) {
    jets.forEach((jet, i) => material.uniforms.uNozzle.value[i].set(...jet.pos));
}

export default function Co2Jets({ look, count, quality = 'low', blinders = 8 }) {
    const jets = useMemo(() => co2Layout(count), [count]);
    const nozzles = useMemo(() => createNozzles(jets), [jets]);
    const noise = useMemo(() => createNoiseTexture(), []);
    const puffs = PUFFS[quality] ?? PUFFS.low;

    const geometry = useMemo(() => {
        const g = new THREE.InstancedBufferGeometry();
        const quad = new THREE.PlaneGeometry(1, 1);
        g.index = quad.index;
        g.setAttribute('position', quad.attributes.position);
        g.setAttribute('uv', quad.attributes.uv);
        const data = new Float32Array(CO2_JETS * puffs * 3);
        let seed = 0.6180339;
        for (let j = 0; j < CO2_JETS; j++) {
            for (let p = 0; p < puffs; p++) {
                const i = (j * puffs + p) * 3;
                seed = (seed + 0.6180339887) % 1;
                data[i] = j;
                data[i + 1] = (p + 0.5 * seed) / puffs; // spread evenly up the stream
                data[i + 2] = seed;
            }
        }
        g.setAttribute('aPuff', new THREE.InstancedBufferAttribute(data, 3));
        g.instanceCount = 0;
        return g;
    }, [puffs]);

    const material = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uNozzle: { value: Array.from({ length: CO2_JETS }, () => new THREE.Vector3()) },
            uState: { value: Array.from({ length: CO2_JETS }, () => new THREE.Vector2(-1, 0)) },
            uTime: { value: 0 },
            uNoise: { value: noise },
            uColor: { value: new THREE.Color(1, 1, 1) },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
    }), [noise]);

    useEffect(() => placeNozzles(material, jets), [jets, material]);
    useEffect(() => () => { geometry.dispose(); }, [geometry]);
    useEffect(() => () => { nozzles.dispose(); }, [nozzles]);
    useEffect(() => () => { material.dispose(); noise.dispose(); }, [material, noise]);

    useFrame(({ clock }) => driveCo2(geometry, material, look.current, clock.elapsedTime, blinders, CO2_JETS * puffs));

    return (
        <>
            <mesh geometry={nozzles}>
                <meshLambertMaterial color="#2a2e37" emissive="#050608" />
            </mesh>
            <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />
        </>
    );
}
