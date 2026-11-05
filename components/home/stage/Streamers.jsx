'use client';

import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { STREAMER_LIFE, STREAMER_SHOTS, STREAMER_SHOT_GAP, STREAMER_UNITS, streamersActive } from '@/lib/show/confetti';
import { streamerLayout } from './rigLayout';
import { roomFlash } from './flash';
import { createCannons } from './Confetti';

// Streamer cannons (item 15): three launchers on top of the aerial truss (streamerLayout), left,
// centre and right, firing long paper ribbons (5-8 m) up and out over the audience from the stage. In flight a
// ribbon trails along the path its head flew; as the air slows it, it settles into hanging below the
// head, waving as it floats down slowly, twisting so it flashes when it turns to the light, and
// lies on the floor where it lands. Every colour of a party: pink, cyan, yellow, lime, purple,
// orange, red, blue, and metallic gold and silver.
//
// Cheap enough for integrated graphics: one draw call for every ribbon of all three launchers (thin strips
// of 24 segments, instanced), the whole shape worked out in the vertex shader from the launcher's
// state; nothing drawn while idle; fewer ribbons on integrated GPUs. A launcher's load is split
// into STREAMER_SHOTS shots: a tap fires one, holding fires more.

const RIBBONS = { high: 90, low: 54 };  // per launcher, the whole load
const SEGMENTS = 24;
const DRAG = 1.1;

const VERTEX = /* glsl */ `
    attribute vec4 aRibbon;    // launcher index, ribbon index within the load (0..1), two random numbers
    uniform vec3 uCannon[${STREAMER_UNITS}];
    uniform vec3 uDir[${STREAMER_UNITS}];
    uniform vec2 uState[${STREAMER_UNITS}];
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

    // the head's velocity t seconds after launch (the derivative of headAt)
    vec3 velocityAt(float t, vec3 aim, float speed, float fall) {
        float e = exp(-${DRAG.toFixed(2)} * t);
        return aim * speed * e - vec3(0.0, fall * (1.0 - e), 0.0);
    }

    // A ribbon has a fixed length and lies along the path its head has flown: the point \`back\` metres
    // behind the head is where the head was when it had flown \`back\` metres less. This finds that
    // moment by walking back along the path. (The head is never slower than now on the stretch
    // behind it, so steps sized by its current speed always reach the full length.) 0 means the
    // point hasn't left the launcher yet: the ribbon is still unspooling.
    float timeBehind(float back, float t, vec3 aim, float speed, float fall) {
        float now = max(length(velocityAt(t, aim, speed, fall)), 0.2);
        float dt = back / (36.0 * now) + 1e-4;
        float tt = t;
        float walked = 0.0;
        for (int i = 0; i < 48; i++) {
            if (walked >= back || tt <= 0.0) break;
            walked += length(velocityAt(max(tt - 0.5 * dt, 0.0), aim, speed, fall)) * dt;
            tt -= dt;
        }
        // step back the overshoot, so the point moves smoothly rather than in step-sized jumps
        if (walked > back) tt += (walked - back) / max(length(velocityAt(max(tt, 0.0), aim, speed, fall)), 0.05);
        return max(tt, 0.0);
    }

    void main() {
        int j = int(aRibbon.x + 0.5);
        vec3 cannon = uCannon[0];
        vec3 dir = uDir[0];
        vec2 st = uState[0];
        for (int k = 1; k < ${STREAMER_UNITS}; k++) if (k == j) { cannon = uCannon[k]; dir = uDir[k]; st = uState[k]; }
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
        vec3 side1 = normalize(cross(dir, vec3(0.0, 1.0, 0.0)) + vec3(1e-4));
        vec3 side2 = cross(dir, side1);
        float ang = r1 * 6.283 * 9.17;
        float cone = 0.3 * sqrt(fract(r2 * 17.3));
        vec3 aim = normalize(dir + (side1 * cos(ang) + side2 * sin(ang)) * cone);
        float speed = 10.0 + 7.0 * fract(r2 * 3.7);
        float fall = 1.0 + 0.5 * fract(r1 * 11.3);     // paper ribbons sink at 1-1.5 m/s
        float ribbon = 5.0 + 3.0 * fract(r2 * 29.0);
        // Each ribbon lives until it has come all the way down: its highest point (the launcher plus
        // how far it climbs before the air stops it), plus its own length, at its sinking speed;
        // then it lies on the floor a few seconds and fades. (A fixed lifetime made ribbons from the
        // top of the truss vanish halfway down.)
        float climb = max(aim.y, 0.0) * speed / ${DRAG.toFixed(2)};
        float life = (cannon.y + climb + ribbon) / fall + 1.0 / ${DRAG.toFixed(2)} + 3.0;
        if (age < 0.0 || shotAt > len || t < 0.0 || t > life) {
            gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
            return;
        }

        float u = 0.5 - position.y; // 0 at the head, 1 at the tail
        // where this point of the ribbon is: on the head's path, u x the ribbon's length behind it
        float tp = timeBehind(u * ribbon, t, aim, speed, fall);
        vec3 p = headAt(tp, cannon, aim, speed, fall);
        // which way the ribbon runs here (along the path; straight out of the launcher while unspooling)
        vec3 v = velocityAt(tp, aim, speed, fall);
        vec3 tangent = length(v) > 1e-3 ? normalize(v) : aim;
        // As the air slows it, the ribbon flutters: a wave running down it, side to side, growing
        // toward the tail; and the whole ribbon drifts a little, as paper does in the air
        float slow = smoothstep(0.6, 3.0, t);
        vec3 across = normalize(cross(tangent, vec3(0.0, 1.0, 0.0)) + vec3(0.25, 0.0, 0.1));
        p += across * (0.3 * slow) * sin(u * 8.0 - t * 2.4 + r1 * 20.0) * (0.35 + 0.65 * u);
        p.z += 0.15 * slow * cos(u * 5.0 - t * 1.7 + r2 * 9.0) * u;
        p += vec3(sin(t * 0.35 + r1 * 6.0), 0.0, cos(t * 0.28 + r2 * 6.0)) * 0.7 * smoothstep(1.0, 5.0, t);
        // landed: the part that reaches the floor lies down along it instead of piling up in one spot
        float under = 0.02 - p.y;
        if (under > 0.0) {
            float a = r1 * 40.0;
            p.xz += vec2(cos(a), sin(a)) * under;
            p.y = 0.02 + u * 0.002;
        }
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
    uniform vec3 uPalette[10];
    uniform float uLevel;
    varying float vColor;
    varying float vGlint;
    varying float vFade;

    void main() {
        if (vFade < 0.01) discard;
        int i = int(floor(fract(vColor * 7.0) * 10.0));
        vec3 c = uPalette[0];
        for (int k = 1; k < 10; k++) if (k == i) c = uPalette[k];
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
    for (let j = 0; j < STREAMER_UNITS; j++) u.uState.value[j].set(state[j * 2], state[j * 2 + 1]);
    u.uTime.value = time;
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
    const launchers = useMemo(() => streamerLayout(), []);
    const bodies = useMemo(() => createCannons(launchers, { radius: 0.1, length: 0.75 }), [launchers]);
    const perLauncher = RIBBONS[quality] ?? RIBBONS.low;

    const geometry = useMemo(() => {
        const g = new THREE.InstancedBufferGeometry();
        const strip = new THREE.PlaneGeometry(1, 1, 1, SEGMENTS);
        g.index = strip.index;
        g.setAttribute('position', strip.attributes.position);
        const data = new Float32Array(STREAMER_UNITS * perLauncher * 4);
        let a = 0.1414213;
        let b = 0.8660254;
        for (let j = 0; j < STREAMER_UNITS; j++) {
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
            uCannon: { value: Array.from({ length: STREAMER_UNITS }, () => new THREE.Vector3()) },
            uDir: { value: Array.from({ length: STREAMER_UNITS }, () => new THREE.Vector3(0, 1, 0)) },
            uState: { value: Array.from({ length: STREAMER_UNITS }, () => new THREE.Vector2(-1, 0)) },
            uTime: { value: 0 },
            uLevel: { value: 0.5 },
            // a party: vivid colours plus metallic gold and silver
            uPalette: { value: ['#ff2d95', '#19d9ff', '#ffe600', '#7dff3a', '#a855f7', '#ff7a1a', '#ff3b3b', '#3b6bff', '#ffc845', '#d8dde6'].map((c) => new THREE.Color(c)) },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        side: THREE.DoubleSide,
    }), []);

    useEffect(() => placeLaunchers(material, launchers), [launchers, material]);
    useEffect(() => () => { geometry.dispose(); }, [geometry]);
    useEffect(() => () => { bodies.dispose(); }, [bodies]);
    useEffect(() => () => { material.dispose(); }, [material]);

    useFrame(({ clock }) => driveStreamers(geometry, material, look.current, clock.elapsedTime, blinders, STREAMER_UNITS * perLauncher));

    return (
        <>
            <mesh geometry={bodies}>
                <meshLambertMaterial color="#22252c" emissive="#050608" />
            </mesh>
            <mesh geometry={geometry} material={material} frustumCulled={false} />
        </>
    );
}
