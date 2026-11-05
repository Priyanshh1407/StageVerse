'use client';

import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CANNON_UNITS, STREAMER_LIFE, STREAMER_SHOTS, STREAMER_SHOT_GAP, streamersActive } from '@/lib/show/confetti';
import { cannonLayout } from './rigLayout';
import { roomFlash } from './flash';
import { createCannons } from './Confetti';

// Streamer cannons (item 15): a launcher at each wing of the stage front, just behind the confetti
// cannon (cannonLayout), firing long paper ribbons (5-8 m) up and out over the audience. In flight a
// ribbon trails along the path its head flew; as the air slows it, it settles into hanging below the
// head, waving as it floats down slowly, twisting so it flashes when it turns to the light, and
// lies on the floor where it lands. Metallic gold and silver plus the show's colours.
//
// Cheap enough for integrated graphics: one draw call for every ribbon of both launchers (thin strips
// of 24 segments, instanced), the whole shape worked out in the vertex shader from the launcher's
// state; nothing drawn while idle; fewer ribbons on integrated GPUs. A launcher's load is split
// into STREAMER_SHOTS shots: a tap fires one, holding fires more.

const RIBBONS = { high: 90, low: 54 };  // per launcher, the whole load
const SEGMENTS = 24;
const DRAG = 1.1;

const VERTEX = /* glsl */ `
    attribute vec4 aRibbon;    // launcher index, ribbon index within the load (0..1), two random numbers
    uniform vec3 uCannon[${CANNON_UNITS}];
    uniform vec3 uDir[${CANNON_UNITS}];
    uniform vec2 uState[${CANNON_UNITS}];
    uniform float uTime;
    varying float vColor;
    varying float vGlint;
    varying float vFade;

    // where the ribbon's head is t seconds after launch
    vec3 headAt(float t, vec3 cannon, vec3 aim, float speed, float fall) {
        float k = ${DRAG.toFixed(2)};
        float s = (1.0 - exp(-k * t)) / k;
        return cannon + aim * speed * s - vec3(0.0, fall, 0.0) * (t - s);
    }

    // a point u along the ribbon (0 = head, 1 = tail): trailing along the flight path at first,
    // hanging below the head and waving once the air has slowed it
    vec3 ribbonAt(float u, float t, vec3 cannon, vec3 aim, float speed, float fall, float len, float r1) {
        vec3 trail = headAt(max(t - u * 0.45, 0.0), cannon, aim, speed, fall);
        vec3 hang = headAt(t, cannon, aim, speed, fall)
            + vec3(sin(u * 7.0 - t * 1.6 + r1 * 20.0) * 0.35 * u, -u * len, cos(u * 5.0 - t * 1.3 + r1 * 9.0) * 0.2 * u);
        vec3 p = mix(trail, hang, smoothstep(0.5, 2.2, t));
        p.y = max(p.y, 0.02 + u * 0.002); // lying on the floor where it lands
        return p;
    }

    void main() {
        int j = int(aRibbon.x + 0.5);
        vec3 cannon = uCannon[0];
        vec3 dir = uDir[0];
        vec2 st = uState[0];
        for (int k = 1; k < ${CANNON_UNITS}; k++) if (k == j) { cannon = uCannon[k]; dir = uDir[k]; st = uState[k]; }
        float age = st.x;
        float len = st.y;
        float r1 = aRibbon.z;
        float r2 = aRibbon.w;
        vFade = 0.0;
        vColor = r1;
        vGlint = 0.0;
        float shot = floor(aRibbon.y * ${STREAMER_SHOTS.toFixed(1)});
        float shotAt = shot * ${STREAMER_SHOT_GAP.toFixed(2)};
        float launched = shotAt + fract(r2 * 5.3) * 0.25;
        float t = age - launched;
        float life = ${STREAMER_LIFE.toFixed(1)} * (0.75 + 0.25 * r1);
        if (age < 0.0 || shotAt > len || t < 0.0 || t > life) {
            gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
            return;
        }
        vec3 side1 = normalize(cross(dir, vec3(0.0, 1.0, 0.0)) + vec3(1e-4));
        vec3 side2 = cross(dir, side1);
        float ang = r1 * 6.283 * 9.17;
        float cone = 0.3 * sqrt(fract(r2 * 17.3));
        vec3 aim = normalize(dir + (side1 * cos(ang) + side2 * sin(ang)) * cone);
        float speed = 18.0 + 8.0 * fract(r2 * 3.7);
        float fall = 0.45 + 0.35 * fract(r1 * 11.3);
        float ribbon = 5.0 + 3.0 * fract(r2 * 29.0);

        float u = 0.5 - position.y; // 0 at the head, 1 at the tail
        vec3 p = ribbonAt(u, t, cannon, aim, speed, fall, ribbon, r1);
        vec3 next = ribbonAt(min(1.0, u + 0.03), t, cannon, aim, speed, fall, ribbon, r1);
        vec3 prev = ribbonAt(max(0.0, u - 0.03), t, cannon, aim, speed, fall, ribbon, r1);
        vec3 tangent = normalize(next - prev + vec3(0.0, -1e-4, 0.0));
        vec3 toCam = normalize(cameraPosition - p);
        vec3 side = normalize(cross(tangent, toCam) + vec3(1e-4, 0.0, 0.0));
        // the ribbon twists along its length: edge-on it narrows, face-on it flashes
        float twist = cos(u * 14.0 + t * 3.0 + r1 * 10.0);
        float width = 0.055 * (0.2 + 0.8 * abs(twist));
        gl_Position = projectionMatrix * viewMatrix * vec4(p + side * position.x * width, 1.0);

        vGlint = pow(abs(twist), 6.0);
        vFade = 1.0 - smoothstep(life - 1.5, life, t);
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
        int i = int(floor(fract(vColor * 7.0) * 4.0));
        vec3 c = uPalette[0];
        if (i == 1) c = uPalette[1];
        else if (i == 2) c = uPalette[2];
        else if (i == 3) c = uPalette[3];
        gl_FragColor = vec4(c * (uLevel + 1.8 * vGlint) * vFade, 1.0);
    }
`;

/** Each frame: the launchers' state, the colours and how lit the ribbons are. */
function driveStreamers(geometry, material, target, time, blinders, instances) {
    const state = target.streamers;
    const active = streamersActive(state);
    geometry.instanceCount = active ? instances : 0;
    if (!active) return;
    const u = material.uniforms;
    for (let j = 0; j < CANNON_UNITS; j++) u.uState.value[j].set(state[j * 2], state[j * 2 + 1]);
    u.uTime.value = time;
    u.uPalette.value[2].set(target.colorA ?? '#19d9ff');
    u.uPalette.value[3].set(target.colorB ?? '#ff3df2');
    const flash = Math.min(1, roomFlash(target, time, blinders).total);
    u.uLevel.value = 0.35 + 0.35 * Math.min(1, (target.master ?? 1) * Math.min(target.intensity ?? 1, 1.4)) + 0.6 * flash;
}

function placeLaunchers(material, launchers) {
    launchers.forEach((c, i) => {
        material.uniforms.uCannon.value[i].set(...c.pos);
        material.uniforms.uDir.value[i].set(...c.dir);
    });
}

export default function Streamers({ look, quality = 'low', blinders = 8 }) {
    const launchers = useMemo(() => cannonLayout('streamers'), []);
    const bodies = useMemo(() => createCannons(launchers, { radius: 0.1, length: 0.75 }), [launchers]);
    const perLauncher = RIBBONS[quality] ?? RIBBONS.low;

    const geometry = useMemo(() => {
        const g = new THREE.InstancedBufferGeometry();
        const strip = new THREE.PlaneGeometry(1, 1, 1, SEGMENTS);
        g.index = strip.index;
        g.setAttribute('position', strip.attributes.position);
        const data = new Float32Array(CANNON_UNITS * perLauncher * 4);
        let a = 0.1414213;
        let b = 0.8660254;
        for (let j = 0; j < CANNON_UNITS; j++) {
            for (let p = 0; p < perLauncher; p++) {
                const i = (j * perLauncher + p) * 4;
                a = (a + 0.6180339887) % 1;
                b = (b + 0.7548776662) % 1;
                data[i] = j;
                data[i + 1] = (p + 0.5) / perLauncher;
                data[i + 2] = a;
                data[i + 3] = b;
            }
        }
        g.setAttribute('aRibbon', new THREE.InstancedBufferAttribute(data, 4));
        g.instanceCount = 0;
        return g;
    }, [perLauncher]);

    const material = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uCannon: { value: Array.from({ length: CANNON_UNITS }, () => new THREE.Vector3()) },
            uDir: { value: Array.from({ length: CANNON_UNITS }, () => new THREE.Vector3(0, 1, 0)) },
            uState: { value: Array.from({ length: CANNON_UNITS }, () => new THREE.Vector2(-1, 0)) },
            uTime: { value: 0 },
            uLevel: { value: 0.5 },
            // metallic gold and silver, and the show's two colours (set each frame)
            uPalette: { value: [new THREE.Color('#ffc845'), new THREE.Color('#d8dde6'), new THREE.Color('#19d9ff'), new THREE.Color('#ff3df2')] },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        side: THREE.DoubleSide,
    }), []);

    useEffect(() => placeLaunchers(material, launchers), [launchers, material]);
    useEffect(() => () => { geometry.dispose(); }, [geometry]);
    useEffect(() => () => { bodies.dispose(); }, [bodies]);
    useEffect(() => () => { material.dispose(); }, [material]);

    useFrame(({ clock }) => driveStreamers(geometry, material, look.current, clock.elapsedTime, blinders, CANNON_UNITS * perLauncher));

    return (
        <>
            <mesh geometry={bodies}>
                <meshLambertMaterial color="#22252c" emissive="#050608" />
            </mesh>
            <mesh geometry={geometry} material={material} frustumCulled={false} />
        </>
    );
}
