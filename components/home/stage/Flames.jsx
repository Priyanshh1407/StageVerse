'use client';

import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FLAME_FADE, FLAME_UNITS, flamesActive } from '@/lib/show/flames';
import { flameLayout } from './rigLayout';
import { DECK_HEIGHT } from './trussGeometry';
import { createNoiseTexture } from './LowFog';

// Flame units (item 15): six units on the stage's front lip (placed clear of the lights, lasers and
// CO2 nozzles by flameLayout) that shoot narrow fire columns about 8 m up for as long as they're fired; the
// fire is gone a moment after they stop. The warm light they throw on the stage, floor, haze and
// fog goes through the flash system (flash.js, `fire`), with no real lights.
//
// Cheap enough for integrated graphics, like the CO2 jets:
// - one draw call for all six columns: flame "tongues" (instanced quads, additive) streaming up each
//   unit (partly additive), shaped and coloured in the shaders (white-yellow at the base, orange,
//   red at the tips),
//   ragged at the edges from the low fog's noise texture scrolling upward;
// - nothing drawn while the units are idle (zero instances); fewer tongues on integrated GPUs.
// The units themselves are one merged mesh (one more draw call).

// A real flame projector fires a narrow, fast jet: bright white-yellow through its lower half, then
// orange, rolling into a wider fireball at the top
const HEIGHT = 8.0;  // how high a column reaches, in metres above the unit
const FLOW = 4.4;    // stream speed: 4.4 column heights per second (about 35 m/s): a violent jet
const TONGUES = { high: 44, low: 28 };

const VERTEX = /* glsl */ `
    attribute vec3 aPuff;      // unit index, place in the stream (0..1), random
    uniform vec3 uUnit[${FLAME_UNITS}];
    uniform vec2 uState[${FLAME_UNITS}];  // per unit: seconds since it started firing (< 0 idle), how long it fires
    uniform float uTime;
    varying vec2 vUv;
    varying float vAlpha;
    varying float vHeat;
    varying float vSeed;

    void main() {
        int j = int(aPuff.x + 0.5);
        vec3 unit = uUnit[0];
        vec2 st = uState[0];
        for (int k = 1; k < ${FLAME_UNITS}; k++) if (k == j) { unit = uUnit[k]; st = uState[k]; }
        float age = st.x;
        float len = st.y;
        vUv = uv;
        vSeed = aPuff.z;
        vAlpha = 0.0;
        vHeat = 1.0;
        if (age < 0.0 || age > len + ${FLAME_FADE.toFixed(2)}) {
            gl_Position = vec4(0.0, 0.0, -2.0, 1.0); // outside the view: nothing drawn
            return;
        }
        float firing = min(age, len);
        float after = max(0.0, age - len);
        float fade = after / ${FLAME_FADE.toFixed(2)};
        // Fuel streams out while the unit fires; when it stops, the last of the column lifts off and
        // burns out on the way up
        float phase = fract(aPuff.y + firing * ${FLOW.toFixed(2)}) + 0.5 * (1.0 - exp(-after * 4.0));
        float front = 1.0 - exp(-age * 20.0); // the whoosh shooting up as it ignites
        float h = phase * ${HEIGHT.toFixed(1)};
        float top = smoothstep(0.72, 1.0, phase); // the fireball rolling out at the top
        // a tight jet (16 cm at the burner), widening only gently, then the fireball
        // as it ignites, a fireball leads the column up: the tongues at the front swell
        float lead = smoothstep(front - 0.18, front, phase) * exp(-age * 3.0);
        float r = (0.08 + 0.05 * h) * (1.0 + 0.9 * top) * (1.0 + 1.4 * lead) * (1.0 + 0.4 * fade);
        // turbulence: every tongue pulses in size many times a second
        float churn = 0.8 + 0.4 * fract(sin(floor(uTime * 24.0) * 12.9898 + aPuff.z * 78.233) * 43758.5453);
        float size = 1.9 * r * (0.8 + 0.4 * fract(aPuff.z * 7.31)) * churn;
        vec3 jitter = vec3(fract(aPuff.z * 13.7) - 0.5, 0.0, fract(aPuff.z * 29.3) - 0.5) * r * 0.5;
        // a stiff, powerful jet: only a slight flicker from side to side, more at the top
        float lick = sin(uTime * 17.0 + aPuff.z * 30.0) * 0.02 * h;
        vec3 centre = unit + vec3(jitter.x + lick, h + size * 0.3, jitter.z);

        vHeat = phase;
        vAlpha = (1.0 - smoothstep(front - 0.05, front + 0.02, phase))   // not above the column's front yet
            * (1.0 - smoothstep(0.82, 1.02, phase))                       // burning out at the top
            * smoothstep(0.0, 0.015, phase)
            * (1.0 - fade)
            * (1.0 + 0.9 * exp(-age * 7.0))                               // the ignition burst
            * (0.85 + 0.15 * sin(uTime * 37.0 + float(j) * 2.1));         // the whole column flickering

        // a quad facing the camera, taller than wide (flames stretch upward), turned a little per tongue
        float a = (aPuff.z - 0.5) * 0.3 + sin(uTime * 8.0 + aPuff.z * 20.0) * 0.05;
        // tongues stretched upward along the jet; rounder in the fireball
        vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * (position.xy * vec2(1.0, mix(2.4, 1.3, top))) * size;
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        gl_Position = projectionMatrix * viewMatrix * vec4(centre + right * q.x + up * q.y, 1.0);
    }
`;

const FRAGMENT = /* glsl */ `
    uniform sampler2D uNoise;
    uniform float uTime;
    varying vec2 vUv;
    varying float vAlpha;
    varying float vHeat;
    varying float vSeed;

    void main() {
        // noise racing upward through the flame, at two scales
        float n1 = texture2D(uNoise, vUv * vec2(0.7, 0.5) + vSeed * vec2(3.1, 7.7) + vec2(0.0, -uTime * 1.6)).r;
        float n2 = texture2D(uNoise, vUv * vec2(1.6, 1.1) + vSeed * vec2(5.3, 1.9) + vec2(uTime * 0.3, -uTime * 2.4)).r;
        // a teardrop-ish blob with a ragged edge
        vec2 p = vUv - vec2(0.5, 0.42);
        float d = length(p * vec2(1.0, 0.75)) * 2.0 + (n2 - 0.5) * 0.55;
        float shape = 1.0 - smoothstep(0.25, 1.0, d);
        // higher up, the fire breaks into tongues
        float density = shape * smoothstep(0.15 + 0.5 * vHeat, 0.65 + 0.3 * vHeat, 0.7 * n1 + 0.5 * n2);
        // a long white-yellow core through the lower half, orange, then deep red at the tips
        vec3 c = mix(vec3(1.0, 0.95, 0.75), vec3(1.0, 0.58, 0.12), smoothstep(0.05, 0.5, vHeat));
        c = mix(c, vec3(0.8, 0.16, 0.03), smoothstep(0.55, 0.95, vHeat));
        float glow = density * vAlpha * mix(2.4, 0.75, vHeat);
        if (glow < 0.003) discard;
        // premultiplied and partly additive (see the material): the fire also covers some of what is
        // behind it, so it stays orange in front of the bright LED wall and beams instead of going white
        gl_FragColor = vec4(c * glow, min(1.0, glow * 0.65));
    }
`;

/** The flame units: a steel box with a lighter top plate (the burner), all six merged into one geometry. */
function createUnits(units) {
    const parts = [];
    for (const { pos } of units) {
        const [x, , z] = pos;
        const box = new THREE.BoxGeometry(0.42, 0.26, 0.32);
        box.translate(x, DECK_HEIGHT + 0.13, z);
        const plate = new THREE.BoxGeometry(0.3, 0.04, 0.22);
        plate.translate(x, DECK_HEIGHT + 0.28, z);
        parts.push(box, plate);
    }
    const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()));
    parts.forEach((g) => g.dispose());
    return merged;
}

/** Each frame: the units' state into the shader. */
function driveFlames(geometry, material, target, time, instances) {
    const state = target.flames;
    const active = flamesActive(state);
    geometry.instanceCount = active ? instances : 0;
    if (!active) return;
    const u = material.uniforms;
    for (let j = 0; j < FLAME_UNITS; j++) u.uState.value[j].set(state[j * 2], state[j * 2 + 1]);
    u.uTime.value = time;
}

/** Puts the units' positions into the shader. */
function placeUnits(material, units) {
    units.forEach((unit, i) => material.uniforms.uUnit.value[i].set(...unit.pos));
}

export default function Flames({ look, count, quality = 'low' }) {
    const units = useMemo(() => flameLayout(count), [count]);
    const bodies = useMemo(() => createUnits(units), [units]);
    const noise = useMemo(() => createNoiseTexture(), []);
    const tongues = TONGUES[quality] ?? TONGUES.low;

    const geometry = useMemo(() => {
        const g = new THREE.InstancedBufferGeometry();
        const quad = new THREE.PlaneGeometry(1, 1);
        g.index = quad.index;
        g.setAttribute('position', quad.attributes.position);
        g.setAttribute('uv', quad.attributes.uv);
        const data = new Float32Array(FLAME_UNITS * tongues * 3);
        let seed = 0.3819660;
        for (let j = 0; j < FLAME_UNITS; j++) {
            for (let p = 0; p < tongues; p++) {
                const i = (j * tongues + p) * 3;
                seed = (seed + 0.6180339887) % 1;
                data[i] = j;
                data[i + 1] = (p + 0.5 * seed) / tongues; // spread evenly up the stream
                data[i + 2] = seed;
            }
        }
        g.setAttribute('aPuff', new THREE.InstancedBufferAttribute(data, 3));
        g.instanceCount = 0;
        return g;
    }, [tongues]);

    const material = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uUnit: { value: Array.from({ length: FLAME_UNITS }, () => new THREE.Vector3()) },
            uState: { value: Array.from({ length: FLAME_UNITS }, () => new THREE.Vector2(-1, 0)) },
            uTime: { value: 0 },
            uNoise: { value: noise },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        toneMapped: false,
    }), [noise]);

    useEffect(() => placeUnits(material, units), [units, material]);
    useEffect(() => () => { geometry.dispose(); }, [geometry]);
    useEffect(() => () => { bodies.dispose(); }, [bodies]);
    useEffect(() => () => { material.dispose(); noise.dispose(); }, [material, noise]);

    useFrame(({ clock }) => driveFlames(geometry, material, look.current, clock.elapsedTime, FLAME_UNITS * tongues));

    return (
        <>
            <mesh geometry={bodies}>
                <meshLambertMaterial color="#24272e" emissive="#060708" />
            </mesh>
            <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={3} />
        </>
    );
}
