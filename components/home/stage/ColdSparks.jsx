'use client';

import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SPARK_LIFE, SPARK_UNITS, sparksActive } from '@/lib/show/sparks';
import { sparkLayout } from './rigLayout';
import { DECK_HEIGHT } from './trussGeometry';

// Cold spark machines (item 15): six machines on the stage's front lip (placed clear of the lights,
// lasers and CO2 nozzles by sparkLayout) shooting dense fountains of golden sparks 4-6 m up for as long as
// they're fired. Each spark flies on its own arc (a little air drag, then gravity), cooling from
// white-gold to orange as it falls back; when a machine stops, the sparks already in the air finish
// their fall.
//
// Cheap enough for integrated graphics:
// - one draw call for every spark of all six machines: thin streaks (instanced quads, additive)
//   stretched along each spark's velocity; launch, arc, colour and twinkle are all worked out in the
//   vertex shader from the machine's state and the spark's own random numbers;
// - nothing drawn while the machines are idle (zero instances); fewer sparks on integrated GPUs;
// - no real lights.
// The machines themselves are one merged mesh (one more draw call).

const SPARKS = { high: 620, low: 380 }; // per machine: a dense fountain
const GRAVITY = 9.81;
const DRAG = 0.35;

const VERTEX = /* glsl */ `
    attribute vec4 aSpark;     // machine index, launch offset (0..1), two random numbers
    uniform vec3 uUnit[${SPARK_UNITS}];
    uniform vec2 uState[${SPARK_UNITS}];  // per machine: seconds since it started firing (< 0 idle), how long it fires
    uniform float uTime;
    varying vec2 vUv;
    varying float vGlow;
    varying float vHeat;

    void main() {
        int j = int(aSpark.x + 0.5);
        vec3 unit = uUnit[0];
        vec2 st = uState[0];
        for (int k = 1; k < ${SPARK_UNITS}; k++) if (k == j) { unit = uUnit[k]; st = uState[k]; }
        float age = st.x;
        float len = st.y;
        float r1 = aSpark.z;
        float r2 = aSpark.w;
        vUv = uv;
        vGlow = 0.0;
        vHeat = 1.0;
        float L = ${SPARK_LIFE.toFixed(2)};
        // Sparks leave the machine continuously: this one relaunches every L seconds, offset by its
        // own share of L. It flies only if it launched while the machine was firing.
        float cycle = floor((age + aSpark.y * L) / L);
        float launched = cycle * L - aSpark.y * L;       // seconds after the machine started
        float t = age - launched;                        // this spark's flight time
        float life = L * (0.55 + 0.45 * r1);
        if (age < 0.0 || launched < 0.0 || launched > len || t > life) {
            gl_Position = vec4(0.0, 0.0, -2.0, 1.0);     // outside the view: nothing drawn
            return;
        }
        // Launch: a tight column straight up (9.5-12 m/s, so 4-6 m high), blooming out as it falls
        float up = 9.5 + 2.5 * fract(r2 * 7.13);
        float ang = r1 * 6.283 * 7.13;
        float spread = 0.8 * fract(r2 * 13.1);
        vec3 v0 = vec3(cos(ang) * spread, up, sin(ang) * spread * 0.7 + 0.15);
        // a little air drag, then gravity
        float k = ${DRAG.toFixed(2)};
        float slow = (1.0 - exp(-k * t)) / k;
        vec3 pos = unit + vec3(v0.x * slow, v0.y * slow - 0.5 * ${GRAVITY.toFixed(2)} * 0.9 * t * t, v0.z * slow);
        vec3 vel = vec3(v0.x * exp(-k * t), v0.y * exp(-k * t) - ${GRAVITY.toFixed(2)} * 0.9 * t, v0.z * exp(-k * t));
        // sparks die before they land back on the deck
        float above = smoothstep(-0.1, 0.4, pos.y - unit.y);

        // a streak along the velocity, facing the camera
        float speed = length(vel);
        vec3 axis = speed > 0.001 ? vel / speed : vec3(0.0, 1.0, 0.0);
        vec3 toCam = normalize(cameraPosition - pos);
        vec3 side = normalize(cross(axis, toCam) + vec3(1e-4, 0.0, 0.0));
        float streak = clamp(speed * 0.05, 0.06, 0.5);
        vec3 world = pos + axis * (position.y * streak) + side * (position.x * 0.05);
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);

        vHeat = t / life;
        // twinkle: each spark flickers on and off as it burns
        float twinkle = 0.55 + 0.45 * step(0.35, fract(sin(floor(uTime * 30.0) + r1 * 917.0) * 43758.5453));
        // white-hot as it leaves the machine
        float launch = 1.0 + 1.5 * exp(-t * 12.0);
        vGlow = pow(1.0 - vHeat, 1.2) * twinkle * above * launch;
    }
`;

const FRAGMENT = /* glsl */ `
    varying vec2 vUv;
    varying float vGlow;
    varying float vHeat;

    void main() {
        // soft across the streak, brightest at its head (the end it's flying toward)
        float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
        float glow = across * across * mix(0.35, 1.0, vUv.y) * vGlow;
        if (glow < 0.004) discard;
        // white-gold when it leaves the machine, gold, then orange as it cools
        vec3 c = mix(vec3(1.0, 0.93, 0.72), vec3(1.0, 0.72, 0.28), smoothstep(0.0, 0.35, vHeat));
        c = mix(c, vec3(1.0, 0.42, 0.1), smoothstep(0.35, 0.9, vHeat));
        gl_FragColor = vec4(c * glow * 5.0, 1.0);
    }
`;

/** The machines: a black box with a nozzle plate on top, all six merged into one geometry. */
function createMachines(units) {
    const parts = [];
    for (const { pos } of units) {
        const [x, , z] = pos;
        const box = new THREE.BoxGeometry(0.36, 0.26, 0.3);
        box.translate(x, DECK_HEIGHT + 0.13, z);
        const plate = new THREE.BoxGeometry(0.2, 0.04, 0.16);
        plate.translate(x, DECK_HEIGHT + 0.28, z);
        parts.push(box, plate);
    }
    const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()));
    parts.forEach((g) => g.dispose());
    return merged;
}

/** Each frame: the machines' state into the shader. */
function driveSparks(geometry, material, target, time, instances) {
    const state = target.sparks;
    const active = sparksActive(state);
    geometry.instanceCount = active ? instances : 0;
    if (!active) return;
    const u = material.uniforms;
    for (let j = 0; j < SPARK_UNITS; j++) u.uState.value[j].set(state[j * 2], state[j * 2 + 1]);
    u.uTime.value = time;
}

/** Puts the machines' positions into the shader. */
function placeMachines(material, units) {
    units.forEach((unit, i) => material.uniforms.uUnit.value[i].set(...unit.pos));
}

export default function ColdSparks({ look, count, quality = 'low' }) {
    const units = useMemo(() => sparkLayout(count), [count]);
    const machines = useMemo(() => createMachines(units), [units]);
    const perMachine = SPARKS[quality] ?? SPARKS.low;

    const geometry = useMemo(() => {
        const g = new THREE.InstancedBufferGeometry();
        const quad = new THREE.PlaneGeometry(1, 1);
        g.index = quad.index;
        g.setAttribute('position', quad.attributes.position);
        g.setAttribute('uv', quad.attributes.uv);
        const data = new Float32Array(SPARK_UNITS * perMachine * 4);
        let a = 0.1234567;
        let b = 0.7654321;
        for (let j = 0; j < SPARK_UNITS; j++) {
            for (let p = 0; p < perMachine; p++) {
                const i = (j * perMachine + p) * 4;
                a = (a + 0.6180339887) % 1;
                b = (b + 0.7548776662) % 1;
                data[i] = j;
                data[i + 1] = (p + 0.5) / perMachine; // launches spread evenly through each cycle
                data[i + 2] = a;
                data[i + 3] = b;
            }
        }
        g.setAttribute('aSpark', new THREE.InstancedBufferAttribute(data, 4));
        g.instanceCount = 0;
        return g;
    }, [perMachine]);

    const material = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uUnit: { value: Array.from({ length: SPARK_UNITS }, () => new THREE.Vector3()) },
            uState: { value: Array.from({ length: SPARK_UNITS }, () => new THREE.Vector2(-1, 0)) },
            uTime: { value: 0 },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    }), []);

    useEffect(() => placeMachines(material, units), [units, material]);
    useEffect(() => () => { geometry.dispose(); }, [geometry]);
    useEffect(() => () => { machines.dispose(); }, [machines]);
    useEffect(() => () => { material.dispose(); }, [material]);

    useFrame(({ clock }) => driveSparks(geometry, material, look.current, clock.elapsedTime, SPARK_UNITS * perMachine));

    return (
        <>
            <mesh geometry={machines}>
                <meshLambertMaterial color="#1d2026" emissive="#050608" />
            </mesh>
            <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={3} />
        </>
    );
}
