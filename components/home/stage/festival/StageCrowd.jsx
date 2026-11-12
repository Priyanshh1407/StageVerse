'use client';

// A copy of ../Crowd.jsx for the festival stages (the homepage keeps using the original, unchanged):
// the only difference is that the audience stands where the stage definition says (`area`).

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import { roomFlash } from '../flash';

// The audience: dark figures from the barrier back towards the camera, each with an LED wristband.
// One instanced mesh, one draw call; every movement is worked out on the graphics card from a few
// numbers the show already has:
//   the beat      everyone moves exactly on it: a sway in quiet parts, a bounce in a groove or a build,
//                 a full jump only in the peaks
//   the peaks     hands go up (and on a drop); the arms pump on the beat
//   wristbands    the show's two colours, flashing on the beat in a pattern that changes every 16
//                 beats (all together, a wave across the crowd, a random sparkle)
//   quiet moments a share of the crowd holds up a phone torch
//   house lights  the bands go dark and the crowd stands in the warm light

const PEOPLE = { high: 2000, low: 1100 };

function personGeometry() {
    const parts = [];
    const add = (g, part, side = 0) => {
        const n = g.attributes.position.count;
        g.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(n).fill(part), 1));
        g.setAttribute('aSide', new THREE.BufferAttribute(new Float32Array(n).fill(side), 1));
        g.deleteAttribute('uv');
        parts.push(g);
    };
    add(new THREE.CylinderGeometry(0.2, 0.16, 1.45, 6).translate(0, 0.725, 0), 0);        // body
    add(new THREE.SphereGeometry(0.125, 7, 5).translate(0, 1.6, 0), 0);                   // head
    for (const side of [-1, 1]) {
        // an arm, modelled hanging from the shoulder (the shader swings it up); positions are from the shoulder
        add(new THREE.BoxGeometry(0.075, 0.62, 0.075).translate(0, -0.31, 0), 1, side);
        add(new THREE.BoxGeometry(0.1, 0.07, 0.1).translate(0, -0.56, 0), 2, side);       // the wristband
    }
    return mergeGeometries(parts);
}

const VERTEX = /* glsl */ `
    attribute float aPart;
    attribute float aSide;
    attribute vec3 aSpot;     // x, height scale, z
    attribute vec2 aSeed;
    uniform float uBeat;      // beats since the song began (fractional)
    uniform float uPulse;     // the beat's hit, decaying
    uniform float uEnergy;    // how loud the show is, 0..1
    uniform float uHands;     // 0 = arms down, 1 = hands up
    uniform float uTorch;
    varying float vPart;
    varying vec2 vSeed;
    varying vec3 vNormal;
    varying float vX;
    varying float vLit;       // 1 on a raised phone

    void main() {
        vPart = aPart;
        vSeed = aSeed;
        vX = aSpot.x;
        vec3 p = position;
        vec3 n = normal;
        // who has a phone torch up in the quiet parts (about one in six)
        float torch = step(aSeed.y, 0.17) * uTorch;
        if (aPart > 0.5) {
            // this person's arms: up with the crowd's hands (not everyone, not all at once), pumping on the beat
            float joins = smoothstep(aSeed.x - 0.15, aSeed.x + 0.15, uHands * 1.15);
            float raise = joins * (2.55 + 0.35 * uPulse) + (1.0 - joins) * 0.12 * uPulse;
            // a torch is held up in one hand
            raise = max(raise, torch * step(0.0, aSide) * 2.7);
            float c = cos(raise), s = sin(raise);
            p = vec3(p.x, p.y * c + p.z * s, -p.y * s + p.z * c);
            n = vec3(n.x, n.y * c + n.z * s, -n.y * s + n.z * c);
            p += vec3(aSide * 0.26, 1.38, 0.0);
            vLit = torch * step(0.0, aSide);
        } else {
            vLit = 0.0;
        }
        // the bounce: up exactly on each beat of the song (a hair apart from person to person, like a
        // real crowd); a sway most of the time, a bounce in a groove, a full jump only in the peaks
        float hop = pow(abs(cos(3.14159 * (uBeat + (aSeed.x - 0.5) * 0.06))), 1.6);
        float jump = 0.02 + 0.07 * uEnergy + 0.3 * smoothstep(0.7, 1.0, uEnergy);
        p.y = p.y * aSpot.y + jump * hop * (0.65 + 0.35 * aSeed.y);
        p.x += aSpot.x;
        p.z += aSpot.z;
        vNormal = n;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
`;

const FRAGMENT = /* glsl */ `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uBeat;
    uniform float uPulse;
    uniform float uBands;     // wristband level
    uniform float uStage;     // light spilling off the stage
    uniform float uHouse;
    uniform float uFlash;
    uniform float uTorch;
    varying float vPart;
    varying vec2 vSeed;
    varying vec3 vNormal;
    varying float vX;
    varying float vLit;

    void main() {
        vec3 n = normalize(vNormal);
        vec3 show = mix(uColorA, uColorB, 0.5);
        // a dark figure: lit from the stage side by the show, from above by the house lights
        vec3 c = vec3(0.012, 0.014, 0.02);
        c += show * uStage * (0.05 + 0.3 * max(0.0, -n.z));
        c += vec3(1.0, 0.72, 0.42) * uHouse * (0.035 + 0.11 * max(0.0, n.y));
        c += vec3(1.0, 0.97, 0.9) * uFlash * (0.2 + 0.5 * max(0.0, -n.z));
        if (vPart > 1.5) {
            // the wristband: one of the show's two colours, in the pattern of the moment
            float pattern = mod(floor(uBeat / 16.0), 3.0);
            float together = 0.25 + 0.75 * uPulse;
            float wave = pow(0.5 + 0.5 * sin(vX * 0.42 - uBeat * 3.14159), 4.0);
            float sparkle = step(0.62, fract(sin(dot(vSeed + floor(uBeat * 2.0), vec2(12.9898, 78.233))) * 43758.5453));
            float level = pattern < 0.5 ? together : (pattern < 1.5 ? wave : sparkle);
            vec3 band = (vSeed.x > 0.5 ? uColorA : uColorB) * uBands * level * 3.2;
            // a phone torch: warm white, steady, where the band would be
            c = mix(c + band, vec3(3.0, 2.8, 2.4), vLit);
        }
        gl_FragColor = vec4(c, 1.0);
    }
`;

export default function StageCrowd({ look, area, quality = 'low', blinders = 8 }) {
    const AREA = area;
    // as dense as the homepage's crowd (its area is about 34 x 9.4 m), on a bigger floor up to three times as many
    const count = Math.round((PEOPLE[quality] ?? PEOPLE.low) * Math.min(3, (2 * AREA.x * (AREA.z1 - AREA.z0)) / (34 * 9.4)));
    const mesh = useRef();
    const state = useRef({ hands: 0, torch: 0, bands: 0, energy: 0, beat: 0 });

    const geometry = useMemo(() => {
        const g = new THREE.InstancedBufferGeometry().copy(personGeometry());
        const spot = new Float32Array(count * 3);
        const seed = new Float32Array(count * 2);
        // a steady pseudo-random stream, so the crowd is the same on every visit
        let s = 12345;
        const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        const rows = Math.round(Math.sqrt(count * (AREA.z1 - AREA.z0) / (2 * AREA.x)));
        const perRow = Math.ceil(count / rows);
        for (let i = 0; i < count; i++) {
            const row = Math.floor(i / perRow);
            const col = i % perRow;
            // rows and columns with a little disorder; packed tighter at the barrier
            const t = (row + rand() * 0.8) / rows;
            spot[i * 3] = (((col + 0.5 + (row % 2) * 0.5) / perRow) * 2 - 1) * AREA.x + (rand() - 0.5) * 0.35;
            spot[i * 3 + 1] = 0.72 + rand() * 0.19;
            spot[i * 3 + 2] = AREA.z0 + Math.pow(t, 1.15) * (AREA.z1 - AREA.z0);
            seed[i * 2] = rand();
            seed[i * 2 + 1] = rand();
        }
        g.setAttribute('aSpot', new THREE.InstancedBufferAttribute(spot, 3));
        g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 2));
        g.instanceCount = count;
        return g;
    }, [count]);

    const material = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        toneMapped: false,
        uniforms: {
            uBeat: { value: 0 }, uPulse: { value: 0 }, uEnergy: { value: 0 }, uHands: { value: 0 }, uTorch: { value: 0 },
            uBands: { value: 0 }, uStage: { value: 0 }, uHouse: { value: 0 }, uFlash: { value: 0 },
            uColorA: { value: new THREE.Color() }, uColorB: { value: new THREE.Color() },
        },
    }), []);

    useFrame(({ clock }, delta) => {
        if (!mesh.current) return;
        const target = look.current;
        const u = mesh.current.material.uniforms;
        const st = state.current;
        const k = Math.min(1, delta * 3);
        const master = target.master ?? 1;
        const level = master * Math.min(target.intensity ?? 0, 1.4);
        const house = target.house ?? 0;
        const playing = target.beatPos !== undefined;
        // hands up when the show is at full strength or the drop lands; torches when it is quiet and dark
        // (a song says how hard its crowd moves, section by section: look.crowd; without it, the light level decides)
        const crowd = target.crowd;
        const loud = crowd !== undefined ? (crowd >= 1 ? 1 : (target.dropFx ?? 0)) : Math.max(target.dropFx ?? 0, Math.min(1, Math.max(0, (level - 0.95) / 0.3)));
        const quiet = playing && house < 0.2 ? Math.min(1, Math.max(0, (0.62 - level) / 0.2)) * master : 0;
        st.hands += ((playing ? loud : 0) - st.hands) * k;
        st.torch += (quiet - st.torch) * Math.min(1, delta * 1.2);
        st.bands += ((1 - Math.min(1, house * 1.5)) * master - st.bands) * k;
        st.energy += ((playing ? (crowd ?? Math.min(1, level / 1.2)) : 0.1) - st.energy) * Math.min(1, delta * 2.5);
        // with no song the crowd sways slowly on its own
        st.beat = playing ? target.beatPos : st.beat + delta * 0.8;
        u.uBeat.value = st.beat;
        u.uPulse.value = playing ? Math.min(1, (target.pulse ?? 0) / Math.max(0.15, target.pulseAmount ?? 0.4)) : 0.35;
        u.uEnergy.value = st.energy;
        u.uHands.value = st.hands;
        u.uTorch.value = st.torch;
        u.uBands.value = st.bands;
        u.uStage.value = level * (0.4 + 0.6 * Math.max(target.beams ?? 0, target.wash ?? 0));
        u.uHouse.value = house;
        u.uFlash.value = roomFlash(target, clock.elapsedTime, blinders).total;
        u.uColorA.value.set(target.colorA);
        u.uColorB.value.set(target.colorB);
    });

    return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} />;
}
