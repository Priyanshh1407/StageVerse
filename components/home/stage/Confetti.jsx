'use client';

import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONFETTI_BLAST_SHARE, CONFETTI_LIFE, CONFETTI_STREAM, CONFETTI_TAP, CONFETTI_UNITS, confettiActive } from '@/lib/show/confetti';
import { confettiLayout } from './rigLayout';
import { DECK_HEIGHT } from './trussGeometry';
import { roomFlash } from './flash';

// Confetti cannons (item 15): four on the ground in front of the stage (confettiLayout): two in the
// gaps between the middle sub stacks, one under each line array, blasting paper up and out over the
// whole audience. While a cannon fires it streams confetti
// continuously (a tap gives an instant burst; holding keeps it pouring, see lib/show/confetti.js), and
// its CO2 blasts the whole time (Co2Jets, mount "confetti"). The air stops the paper within a few
// seconds, then it flutters down for many seconds, filling the air over the crowd, tumbling, in the show's colours plus white and gold, glinting whenever
// a piece turns its face to the light.
//
// Cheap enough for integrated graphics: one draw call for every piece of both cannons (tiny opaque
// quads, no blending), each piece's flight, flutter and tumble worked out in the vertex shader from
// its cannon's state; nothing drawn while idle; fewer pieces on integrated GPUs.

const PIECES = { high: 2000, low: 1100 }; // per cannon, the whole load (four cannons)
const DRAG = 1.4;                         // paper: the air stops it within a few seconds, ~15 m up

const VERTEX = /* glsl */ `
    attribute vec4 aPiece;     // cannon index, piece index within the load (0..1), two random numbers
    uniform vec3 uCannon[${CONFETTI_UNITS}];
    uniform vec3 uDir[${CONFETTI_UNITS}];
    uniform vec2 uState[${CONFETTI_UNITS}];   // per cannon: seconds since it started firing (< 0 idle), how long it fires
    uniform float uTime;
    varying float vColor;
    varying float vGlint;
    varying float vFade;

    mat3 rotation(vec3 axis, float a) {
        float s = sin(a), c = cos(a), o = 1.0 - c;
        return mat3(o * axis.x * axis.x + c, o * axis.x * axis.y + axis.z * s, o * axis.z * axis.x - axis.y * s,
                    o * axis.x * axis.y - axis.z * s, o * axis.y * axis.y + c, o * axis.y * axis.z + axis.x * s,
                    o * axis.z * axis.x + axis.y * s, o * axis.y * axis.z - axis.x * s, o * axis.z * axis.z + c);
    }

    void main() {
        int j = int(aPiece.x + 0.5);
        vec3 cannon = uCannon[0];
        vec3 dir = uDir[0];
        vec2 st = uState[0];
        for (int k = 1; k < ${CONFETTI_UNITS}; k++) if (k == j) { cannon = uCannon[k]; dir = uDir[k]; st = uState[k]; }
        float age = st.x;
        float len = st.y;
        float r1 = aPiece.z;
        float r2 = aPiece.w;
        vFade = 0.0;
        vColor = r1;
        vGlint = 0.0;
        // when this piece leaves the barrel: the first share of the load in the instant burst, the rest
        // streaming evenly while the cannon keeps firing (confettiLaunchAt in lib/show/confetti.js)
        float u = aPiece.y;
        float launched = u < ${CONFETTI_BLAST_SHARE.toFixed(2)}
            ? u / ${CONFETTI_BLAST_SHARE.toFixed(2)} * ${CONFETTI_TAP.toFixed(2)}
            : ${CONFETTI_TAP.toFixed(2)} + (u - ${CONFETTI_BLAST_SHARE.toFixed(2)}) / ${(1 - CONFETTI_BLAST_SHARE).toFixed(2)} * ${(CONFETTI_STREAM - CONFETTI_TAP).toFixed(2)};
        float t = age - launched;
        float life = ${CONFETTI_LIFE.toFixed(1)} * (0.7 + 0.3 * r1);
        if (age < 0.0 || launched > len || t < 0.0 || t > life) {
            gl_Position = vec4(0.0, 0.0, -2.0, 1.0);    // outside the view: nothing drawn
            return;
        }
        // Launch along the barrel, in a cone; the air stops the paper quickly, then it sinks at its
        // own slow terminal speed (dv/dt = -k (v - v_fall)), fluttering from side to side
        vec3 side1 = normalize(cross(dir, vec3(0.0, 1.0, 0.0)) + vec3(1e-4));
        vec3 side2 = cross(dir, side1);
        float ang = r1 * 6.283 * 9.17;
        float cone = 0.75 * sqrt(fract(r2 * 17.3));
        vec3 aim = normalize(dir + (side1 * cos(ang) + side2 * sin(ang)) * cone);
        // a wide range of speeds: some pieces drop close to the stage, others carry far out
        float speed = 8.0 + 28.0 * fract(r2 * 3.7);
        float k = ${DRAG.toFixed(2)};
        float fall = 0.8 + 0.5 * fract(r1 * 11.3);
        float s = (1.0 - exp(-k * t)) / k;
        vec3 pos = cannon + aim * speed * s - vec3(0.0, fall, 0.0) * (t - s);
        float flutter = 1.0 - exp(-0.6 * t);
        pos += vec3(sin(t * 1.3 + r1 * 40.0) * 1.2 + sin(t * 3.1 + r2 * 17.0) * 0.25, 0.0, cos(t * 1.1 + r2 * 40.0) * 0.9) * flutter;
        // landed: it lies on the floor a moment, then is gone
        float ground = 0.03;
        float landed = step(pos.y, ground);
        pos.y = max(pos.y, ground);

        // a small paper rectangle tumbling about its own random axis
        vec3 axis = normalize(vec3(fract(r1 * 7.7) - 0.5, fract(r2 * 9.1) - 0.5, fract(r1 * r2 * 31.0) - 0.5) + vec3(1e-3));
        mat3 R = rotation(axis, t * (5.0 + 7.0 * fract(r2 * 23.0)) * (1.0 - landed) + r1 * 6.283);
        // (larger than real confetti, so it reads from the audience)
        vec3 corner = R * vec3(position.x * 0.14, position.y * 0.1, 0.0);
        vec3 normal = R * vec3(0.0, 0.0, 1.0);
        gl_Position = projectionMatrix * viewMatrix * vec4(pos + corner, 1.0);

        // glints when its face turns to the camera (the light comes from behind the viewer's shoulder)
        vec3 toCam = normalize(cameraPosition - pos);
        vGlint = pow(abs(dot(normal, toCam)), 8.0);
        vFade = (1.0 - smoothstep(life - 1.5, life, t)) * (1.0 - 0.4 * landed);
    }
`;

const FRAGMENT = /* glsl */ `
    uniform vec3 uPalette[4];
    uniform float uLevel;
    varying float vColor;
    varying float vGlint;
    varying float vFade;

    void main() {
        if (vFade < 0.01) discard;
        int i = int(floor(fract(vColor * 13.0) * 4.0));
        vec3 c = uPalette[0];
        if (i == 1) c = uPalette[1];
        else if (i == 2) c = uPalette[2];
        else if (i == 3) c = uPalette[3];
        gl_FragColor = vec4(c * (uLevel + 2.2 * vGlint) * vFade, 1.0);
    }
`;

/** A cannon: a base block with a fat barrel along its aim, ending at the muzzle. */
export function createCannons(cannons, { radius = 0.13, length = 0.9 } = {}) {
    const parts = [];
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    for (const { pos, dir, base: at } of cannons) {
        const [x, y, z] = pos;
        const d = new THREE.Vector3(...dir);
        const base = new THREE.BoxGeometry(0.5, 0.2, 0.4);
        base.translate(...(at ?? [x, DECK_HEIGHT + 0.1, z]));
        const barrel = new THREE.CylinderGeometry(radius, radius * 1.1, length, 14);
        barrel.applyQuaternion(q.setFromUnitVectors(up, d));
        barrel.translate(x - d.x * length * 0.5, y - d.y * length * 0.5, z - d.z * length * 0.5);
        parts.push(base, barrel);
    }
    const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()));
    parts.forEach((g) => g.dispose());
    return merged;
}

const white = new THREE.Color('#ffffff');

/** Each frame: the cannons' state, the colours and how lit the paper is. */
function driveConfetti(geometry, material, target, time, blinders, instances) {
    const state = target.confetti;
    const active = confettiActive(state);
    geometry.instanceCount = active ? instances : 0;
    if (!active) return;
    const u = material.uniforms;
    for (let j = 0; j < CONFETTI_UNITS; j++) u.uState.value[j].set(state[j * 2], state[j * 2 + 1]);
    u.uTime.value = time;
    u.uPalette.value[0].set(target.colorA ?? '#19d9ff');
    u.uPalette.value[1].set(target.colorB ?? '#ff3df2');
    // paper is lit by the rig; still visible on a dark stage; strobes flash it
    const flash = Math.min(1, roomFlash(target, time, blinders).total);
    u.uLevel.value = 0.5 + 0.35 * Math.min(1, (target.master ?? 1) * Math.min(target.intensity ?? 1, 1.4)) + 0.6 * flash;
}

function placeCannons(material, cannons) {
    cannons.forEach((c, i) => {
        material.uniforms.uCannon.value[i].set(...c.pos);
        material.uniforms.uDir.value[i].set(...c.dir);
    });
}

export default function Confetti({ look, quality = 'low', blinders = 8 }) {
    const cannons = useMemo(() => confettiLayout(), []);
    const bodies = useMemo(() => createCannons(cannons), [cannons]);
    const perCannon = PIECES[quality] ?? PIECES.low;

    const geometry = useMemo(() => {
        const g = new THREE.InstancedBufferGeometry();
        const quad = new THREE.PlaneGeometry(1, 1);
        g.index = quad.index;
        g.setAttribute('position', quad.attributes.position);
        const data = new Float32Array(CONFETTI_UNITS * perCannon * 4);
        let a = 0.2718281;
        let b = 0.5772156;
        for (let j = 0; j < CONFETTI_UNITS; j++) {
            for (let p = 0; p < perCannon; p++) {
                const i = (j * perCannon + p) * 4;
                a = (a + 0.6180339887) % 1;
                b = (b + 0.7548776662) % 1;
                data[i] = j;
                data[i + 1] = (p + 0.5) / perCannon;
                data[i + 2] = a;
                data[i + 3] = b;
            }
        }
        g.setAttribute('aPiece', new THREE.InstancedBufferAttribute(data, 4));
        g.instanceCount = 0;
        return g;
    }, [perCannon]);

    const material = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uCannon: { value: Array.from({ length: CONFETTI_UNITS }, () => new THREE.Vector3()) },
            uDir: { value: Array.from({ length: CONFETTI_UNITS }, () => new THREE.Vector3(0, 1, 0)) },
            uState: { value: Array.from({ length: CONFETTI_UNITS }, () => new THREE.Vector2(-1, 0)) },
            uTime: { value: 0 },
            uLevel: { value: 0.5 },
            // the show's two colours (set each frame), white and gold
            uPalette: { value: [new THREE.Color('#19d9ff'), new THREE.Color('#ff3df2'), white.clone(), new THREE.Color('#ffc845')] },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        side: THREE.DoubleSide,
    }), []);

    useEffect(() => placeCannons(material, cannons), [cannons, material]);
    useEffect(() => () => { geometry.dispose(); }, [geometry]);
    useEffect(() => () => { bodies.dispose(); }, [bodies]);
    useEffect(() => () => { material.dispose(); }, [material]);

    useFrame(({ clock }) => driveConfetti(geometry, material, look.current, clock.elapsedTime, blinders, CONFETTI_UNITS * perCannon));

    return (
        <>
            <mesh geometry={bodies}>
                <meshLambertMaterial color="#22252c" emissive="#050608" />
            </mesh>
            <mesh geometry={geometry} material={material} frustumCulled={false} />
        </>
    );
}
