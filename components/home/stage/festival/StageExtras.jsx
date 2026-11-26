'use client';

// The trial fixtures and effects (lib/show/stages/extras.js): each one or two draw calls, hidden while idle, each with its
// own switch, read from the stage's look like every other light. Positions come from the stage (stage.extras).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EXTRAS_FIRE, EXTRAS_KEY, readExtras } from '@/lib/show/stages/extras';

const ADDITIVE = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false };
const beatOf = (look, clock) => look.beatPos ?? clock * 2;
const masterOf = (look) => (look.master ?? 1) * Math.min(1.4, look.intensity ?? 1);
// a manual firing from the test page's preview buttons: until when it runs (seconds of the R3F clock)
const fired = { flames: 0, cryo: 0, drones: 0 };
const firing = (kind) => performance.now() / 1000 < fired[kind];

// ---- beams: a cone per beam, its direction worked out in the shader (tilting bars, laser-hybrid rods) ----------------
const BEAM_VERTEX = (dirCode) => /* glsl */ `
    attribute vec3 aOrigin;
    attribute vec4 aInfo;          // x: the fixture's number, y: its place in its fan (-1..1), z: its side (-1, 1), w: spare
    uniform float uTime;
    uniform float uBeat;
    uniform float uLength;
    varying float vAlong;
    varying vec3 vWorld;
    varying vec3 vNormalW;
    varying float vParity;
    void main() {
        float id = aInfo.x;
        float k = aInfo.y;
        float side = aInfo.z;
        vec3 d;
        ${dirCode}
        d = normalize(d);
        vec3 t = normalize(abs(d.z) < 0.95 ? cross(d, vec3(0.0, 0.0, 1.0)) : cross(d, vec3(1.0, 0.0, 0.0)));
        vec3 b = cross(t, d);
        vec3 p = position;
        p.y *= uLength;
        vec3 world = aOrigin + t * p.x + d * p.y + b * p.z;
        vAlong = position.y;
        vWorld = (modelMatrix * vec4(world, 1.0)).xyz;
        vNormalW = normalize(mat3(modelMatrix) * (t * normal.x + d * normal.y + b * normal.z));
        vParity = mod(id + floor(uBeat), 2.0);
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
    }
`;
const BEAM_FRAGMENT = /* glsl */ `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uLevel;
    uniform float uWhite;
    varying float vAlong;
    varying vec3 vWorld;
    varying vec3 vNormalW;
    varying float vParity;
    void main() {
        float facing = abs(dot(normalize(vNormalW), normalize(cameraPosition - vWorld)));
        float core = pow(facing, 1.6);
        float fade = pow(clamp(1.0 - vAlong, 0.0, 1.0), 1.4);
        vec3 c = mix(mix(uColorA, uColorB, vParity), vec3(1.0), uWhite + 0.25 * pow(1.0 - vAlong, 16.0));
        gl_FragColor = vec4(c, core * fade * uLevel);
    }
`;

function beamMesh(points, { length, r0, r1, dirCode, fan = 1 }) {
    const cone = new THREE.CylinderGeometry(r0, r1, 1, 12, 1, true).translate(0, 0.5, 0);
    const geometry = new THREE.InstancedBufferGeometry().copy(cone);
    const origins = [];
    const info = [];
    points.forEach((pt, id) => {
        for (let j = 0; j < fan; j++) {
            origins.push(...pt.pos);
            info.push(id, fan > 1 ? (j / (fan - 1)) * 2 - 1 : 0, pt.s ?? Math.sign(pt.pos[0]) ?? 1, 0);
        }
    });
    geometry.setAttribute('aOrigin', new THREE.InstancedBufferAttribute(new Float32Array(origins), 3));
    geometry.setAttribute('aInfo', new THREE.InstancedBufferAttribute(new Float32Array(info), 4));
    geometry.instanceCount = origins.length / 3;
    const material = new THREE.ShaderMaterial({
        vertexShader: BEAM_VERTEX(dirCode), fragmentShader: BEAM_FRAGMENT, ...ADDITIVE,
        uniforms: { uTime: { value: 0 }, uBeat: { value: 0 }, uLength: { value: length }, uLevel: { value: 0 }, uWhite: { value: 0 }, uColorA: { value: new THREE.Color() }, uColorB: { value: new THREE.Color() } },
    });
    return { geometry, material };
}

function useBeams(points, opts, drive) {
    const { geometry, material } = useMemo(() => beamMesh(points, opts), [points, opts]);
    const mesh = useRef();
    useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
    useFrame(({ clock }) => {
        if (!mesh.current) return;
        const u = mesh.current.material.uniforms;
        const level = drive(u, clock.elapsedTime);
        u.uLevel.value = level;
        mesh.current.visible = level > 0.01;
    });
    return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} />;
}

/** Tilting beam bars at the fin feet: seven beams a bar, tilting together on the beat and fanning out; odd and even bars
 *  swapping the show's two colours (with the fin swap), at the floor beams' level. */
function TiltBars({ bars, look }) {
    const opts = useMemo(() => ({
        length: 34, r0: 0.04, r1: 0.42, fan: 7,
        dirCode: /* glsl */ `
            float swing = sin(uBeat * 1.5708 + id * 0.55) * 0.32;       // the bar tilts, a little behind the next
            float pitch = 0.32 + swing;                                  // from straight up towards the audience
            float yaw = k * (0.3 + 0.16 * sin(uBeat * 0.785)) + side * 0.06;   // the fan opens and closes
            d = vec3(sin(yaw), cos(pitch), sin(pitch));`,
    }), []);
    return useBeams(bars, opts, (u, clock) => {
        const l = look.current;
        u.uBeat.value = beatOf(l, clock);
        u.uColorA.value.set(l.colorA ?? '#19d9ff');
        u.uColorB.value.set(l.colorB ?? '#ff3df2');
        return (l.floor ?? 0) * masterOf(l) * 0.55;
    });
}

/** Laser-hybrid beams on the crown: five very tight, very long rods sweeping slowly over the sky in the peaks. */
function HybridBeams({ points, look }) {
    const pts = useMemo(() => points.map((pos) => ({ pos })), [points]);
    const opts = useMemo(() => ({
        length: 170, r0: 0.03, r1: 0.35,
        dirCode: /* glsl */ `
            float yaw = sin(uTime * 0.35 + id * 1.3) * 0.55;
            float rise = 0.22 + 0.12 * sin(uTime * 0.27 + id * 0.9);
            d = vec3(sin(yaw), rise, cos(yaw));`,
    }), []);
    const level = useRef(0);
    return useBeams(pts, opts, (u, clock) => {
        const l = look.current;
        u.uTime.value = clock;
        u.uBeat.value = beatOf(l, clock);
        u.uColorA.value.set(l.colorA ?? '#ffffff');
        u.uColorB.value.set(l.colorA ?? '#ffffff');
        u.uWhite.value = 0.55;
        // in the peaks (the crowd jumping) with the beams on
        const want = (l.crowd ?? 0) >= 1 && (l.beams ?? 0) > 0.3 ? masterOf(l) * 0.9 : 0;
        level.current += (want - level.current) * 0.05;
        return level.current;
    });
}

// ---- jets: flames and cryo, a soft column per jet that grows with its firing -------------------------------------
const JET_VERTEX = /* glsl */ `
    attribute vec3 aOrigin;
    attribute float aSeed;
    uniform float uTime;
    uniform float uHeight;
    uniform float uWidth;
    uniform vec3 uDir;
    uniform float uSweep;
    varying float vY;
    varying float vSeed;
    varying vec3 vWorld;
    varying float vFacing;
    void main() {
        float y = position.y;                                       // 0 at the nozzle, 1 at the top
        vec3 d = normalize(uDir + vec3(uSweep * sin(uTime * 2.0 + aSeed * 6.0), 0.0, 0.0));
        vec3 t = normalize(cross(d, vec3(0.0, 0.0, 1.0)));
        vec3 b = cross(t, d);
        float w = uWidth * (0.25 + 0.75 * y);
        float wobble = sin(uTime * 18.0 + aSeed * 9.0 + y * 5.0) * 0.12 * y;
        vec3 world = aOrigin + d * y * uHeight + t * (position.x * w + wobble) + b * position.z * w;
        vY = y;
        vSeed = aSeed;
        vWorld = (modelMatrix * vec4(world, 1.0)).xyz;
        // soft edges: the column fades where its side turns away from the camera, so it reads as a plume, not a tube
        vec3 n = normalize(t * position.x + b * position.z);
        vFacing = abs(dot(n, normalize(cameraPosition - vWorld)));
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
    }
`;
const JET_FRAGMENT = (colorCode) => /* glsl */ `
    uniform float uTime;
    uniform float uLevel;
    varying float vY;
    varying float vSeed;
    varying vec3 vWorld;
    varying float vFacing;
    float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float n(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
    void main() {
        float flicker = n(vec2(vWorld.x * 1.5 + vSeed * 7.0, vWorld.y * 1.2 - uTime * 6.0));
        float billow = n(vec2(vWorld.x * 0.6 - vSeed * 3.0, vWorld.y * 0.5 - uTime * 2.5));
        float a = pow(1.0 - vY, 1.2) * (0.35 + 0.6 * flicker + 0.4 * billow) * pow(vFacing, 1.3) * smoothstep(0.0, 0.08, vY + 0.02) * uLevel;
        vec3 c;
        ${colorCode}
        gl_FragColor = vec4(c, a);
    }
`;

function useJets(points, { colorCode, height, width, dir, sweep = 0 }, drive) {
    const { geometry, material } = useMemo(() => {
        const col = new THREE.CylinderGeometry(0.5, 0.5, 1, 10, 8, true).translate(0, 0.5, 0);
        const g = new THREE.InstancedBufferGeometry().copy(col);
        g.setAttribute('aOrigin', new THREE.InstancedBufferAttribute(new Float32Array(points.flat()), 3));
        g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(points.map((_, i) => (i * 0.618) % 1)), 1));
        g.instanceCount = points.length;
        const m = new THREE.ShaderMaterial({
            vertexShader: JET_VERTEX, fragmentShader: JET_FRAGMENT(colorCode), ...ADDITIVE,
            uniforms: { uTime: { value: 0 }, uHeight: { value: height }, uWidth: { value: width }, uDir: { value: new THREE.Vector3(...dir) }, uSweep: { value: sweep }, uLevel: { value: 0 } },
        });
        return { geometry: g, material: m };
    }, [points, colorCode, height, width, dir, sweep]);
    const mesh = useRef();
    useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
    useFrame(({ clock }, delta) => {
        if (!mesh.current) return;
        const u = mesh.current.material.uniforms;
        u.uTime.value = clock.elapsedTime;
        const level = drive(clock.elapsedTime, Math.min(delta, 0.1));
        u.uLevel.value = level;
        u.uHeight.value = height * (0.35 + 0.65 * Math.min(1, level));
        mesh.current.visible = level > 0.01;
    });
    return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} />;
}

/** Flame jets on the fin tips: a burst on every drop; in the finale, alternate fins on the beat. */
function Flames({ points, look }) {
    const opts = useMemo(() => ({
        height: 10, width: 1.7, dir: [0, 1, 0],
        colorCode: 'c = mix(vec3(1.0, 0.92, 0.55), vec3(1.0, 0.32, 0.04), smoothstep(0.0, 0.7, vY)) * 2.2;',
    }), []);
    const level = useRef(0);
    return useJets(points, opts, (clock, dt) => {
        const l = look.current;
        const finale = (l.fireworks?.filter((f) => f.type !== 'mines').length ?? 0) >= 6;
        const beat = beatOf(l, clock);
        const want = Math.max((l.dropFx ?? 0) > 0.3 ? 1 : 0, finale && beat % 1 < 0.35 ? 1 : 0, firing('flames') ? (clock * 2.5) % 1 < 0.6 ? 1 : 0 : 0);
        level.current = want > level.current ? want : Math.max(0, level.current - dt * 2.4);
        return level.current * (l.master ?? 1);
    });
}

/** Cryo jets along the deck front: a fast white plume on drops and blinder hits, swept side to side. */
function Cryo({ points, look }) {
    const opts = useMemo(() => ({
        height: 11, width: 4, dir: [0, 1, 0.4], sweep: 0.35,
        colorCode: 'c = vec3(0.85, 0.92, 1.0) * 2.4;',
    }), []);
    const level = useRef(0);
    return useJets(points, opts, (clock, dt) => {
        const l = look.current;
        const want = Math.max((l.dropFx ?? 0) > 0.3 ? 1 : 0, (l.blinder ?? 0) > 0.6 ? 0.8 : 0, firing('cryo') ? 1 : 0);
        level.current = want > level.current ? want : Math.max(0, level.current - dt * 0.9);
        return level.current;
    });
}

// ---- kinetic spheres: winched over the crowd, rising and falling in waves --------------------------------------------
function Kinetic({ rig, look }) {
    const { spheres, cables } = useMemo(() => {
        const cells = new Float32Array(rig.cells.flat());
        const make = (geo, material) => {
            const g = new THREE.InstancedBufferGeometry().copy(geo);
            g.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 2));
            g.instanceCount = rig.cells.length;
            return { g, material };
        };
        const uniforms = { uTop: { value: rig.top }, uBeat: { value: 0 }, uDrop: { value: 3 }, uLevel: { value: 0 }, uColorA: { value: new THREE.Color() }, uColorB: { value: new THREE.Color() } };
        const height = /* glsl */ `
            attribute vec2 aCell;
            uniform float uTop;
            uniform float uBeat;
            uniform float uDrop;
            float wave() { return 0.5 + 0.5 * sin(uBeat * 0.7854 + aCell.x * 0.22 + aCell.y * 0.17); }
            float sphereY() { return uTop - 1.0 - wave() * uDrop; }`;
        const sphere = new THREE.ShaderMaterial({
            uniforms, toneMapped: false,
            vertexShader: `${height}
                varying float vWave; varying vec3 vN; varying vec3 vW;
                void main() {
                    vWave = wave();
                    vec3 w = vec3(aCell.x, sphereY(), aCell.y) + position;
                    vN = normal; vW = w;
                    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(w, 1.0);
                }`,
            fragmentShader: /* glsl */ `
                uniform vec3 uColorA; uniform vec3 uColorB; uniform float uLevel;
                varying float vWave; varying vec3 vN; varying vec3 vW;
                void main() {
                    vec3 c = mix(uColorA, uColorB, vWave);
                    float rim = 0.55 + 0.45 * pow(1.0 - abs(dot(normalize(vN), normalize(cameraPosition - vW))), 2.0);
                    gl_FragColor = vec4(c * (0.06 + 1.15 * uLevel) * rim, 1.0);
                }`,
        });
        const cable = new THREE.ShaderMaterial({
            uniforms, toneMapped: false,
            vertexShader: `${height}
                void main() {
                    float y = mix(sphereY() + 0.3, uTop, position.y + 0.5);
                    vec3 w = vec3(aCell.x + position.x, y, aCell.y + position.z);
                    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(w, 1.0);
                }`,
            fragmentShader: 'void main() { gl_FragColor = vec4(0.05, 0.05, 0.06, 1.0); }',
        });
        return { spheres: make(new THREE.IcosahedronGeometry(0.3, 3), sphere), cables: make(new THREE.CylinderGeometry(0.02, 0.02, 1, 4), cable) };
    }, [rig]);
    const group = useRef();
    useEffect(() => () => { spheres.g.dispose(); cables.g.dispose(); spheres.material.dispose(); cables.material.dispose(); }, [spheres, cables]);
    useFrame(({ clock }) => {
        if (!group.current) return;
        const l = look.current;
        const u = group.current.children[0].material.uniforms;
        u.uBeat.value = beatOf(l, clock.elapsedTime);
        const energy = l.crowd ?? 0.3;
        u.uDrop.value += ((0.8 + 2.0 * energy) - u.uDrop.value) * 0.03;   // never below 4 m: over the crowd's raised hands
        u.uLevel.value = masterOf(l) * (0.35 + 0.65 * energy);
        u.uColorA.value.set(l.colorA ?? '#19d9ff');
        u.uColorB.value.set(l.colorB ?? '#ff3df2');
    });
    return (
        <group ref={group}>
            <mesh geometry={spheres.g} material={spheres.material} frustumCulled={false} />
            <mesh geometry={cables.g} material={cables.material} frustumCulled={false} />
        </group>
    );
}

// ---- continuous LED lines: one unbroken line of pixels, a chase running along it on the beat ------------------------
function LedLines({ lines, look }) {
    const { geometry, material } = useMemo(() => {
        const parts = lines.map(({ from, to }) => {
            const a = new THREE.Vector3(...from);
            const b = new THREE.Vector3(...to);
            const len = a.distanceTo(b);
            const g = new THREE.BoxGeometry(len, 0.14, 0.14);
            const pos = g.attributes.position;
            g.setAttribute('aU', new THREE.BufferAttribute(Float32Array.from({ length: pos.count }, (_, i) => pos.getX(i) / len + 0.5), 1));
            g.setAttribute('aLen', new THREE.BufferAttribute(new Float32Array(pos.count).fill(len), 1));
            const m = new THREE.Matrix4().lookAt(a, b, new THREE.Vector3(0, 1, 0));
            g.applyMatrix4(new THREE.Matrix4().makeRotationY(-Math.PI / 2)).applyMatrix4(m).translate(...a.clone().add(b).multiplyScalar(0.5).toArray());
            return g;
        });
        const mat = new THREE.ShaderMaterial({
            toneMapped: false,
            uniforms: { uBeat: { value: 0 }, uLevel: { value: 0 }, uColorA: { value: new THREE.Color() }, uColorB: { value: new THREE.Color() } },
            vertexShader: /* glsl */ `
                attribute float aU; attribute float aLen; varying float vU; varying float vLen;
                void main() { vU = aU; vLen = aLen; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: /* glsl */ `
                uniform float uBeat; uniform float uLevel; uniform vec3 uColorA; uniform vec3 uColorB;
                varying float vU; varying float vLen;
                void main() {
                    float m = vU * vLen;                                   // metres along the line
                    float pixel = smoothstep(0.5, 0.35, abs(fract(m / 0.1) - 0.5));
                    float chase = fract(m / 8.0 - uBeat * 0.5);            // a pulse every 8 m, half a period a beat
                    float on = smoothstep(0.0, 0.08, chase) * smoothstep(0.55, 0.2, chase);
                    vec3 c = mix(uColorA, uColorB, step(0.5, fract(m / 16.0 - uBeat * 0.25)));
                    gl_FragColor = vec4(c * (0.12 + 1.8 * on) * (0.6 + 0.4 * pixel) * uLevel, 1.0);
                }`,
        });
        return { geometry: mergeGeometries(parts), material: mat };
    }, [lines]);
    useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
    const mesh = useRef();
    useFrame(({ clock }) => {
        if (!mesh.current) return;
        const l = look.current;
        const u = mesh.current.material.uniforms;
        u.uBeat.value = beatOf(l, clock.elapsedTime);
        u.uLevel.value = masterOf(l) * Math.max(0.25, l.pixel ?? 0.6);
        u.uColorA.value.set(l.colorA ?? '#19d9ff');
        u.uColorB.value.set(l.colorB ?? '#ff3df2');
    });
    return <mesh ref={mesh} geometry={geometry} material={material} />;
}

// ---- the drone show: lit points forming shapes in the sky over the stage, in the finale -----------------------------
const DRONES = 196;
function shapes(width, height) {
    const ring = Array.from({ length: DRONES }, (_, i) => { const a = (i / DRONES) * Math.PI * 2; return [Math.cos(a) * height * 0.48, Math.sin(a) * height * 0.48]; });
    const heart = Array.from({ length: DRONES }, (_, i) => {
        const t = (i / DRONES) * Math.PI * 2;
        return [16 * Math.sin(t) ** 3 * (height / 34), (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * (height / 34)];
    });
    const star = Array.from({ length: DRONES }, (_, i) => {
        const t = i / DRONES; const k = Math.floor(t * 10); const f = t * 10 - k;
        const r = (j) => (j % 2 ? 0.22 : 0.5) * height; const a = (j) => (j / 10) * Math.PI * 2 + Math.PI / 2;
        const p = [Math.cos(a(k)) * r(k), Math.sin(a(k)) * r(k)]; const q = [Math.cos(a(k + 1)) * r(k + 1), Math.sin(a(k + 1)) * r(k + 1)];
        return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];
    });
    const grid = Array.from({ length: DRONES }, (_, i) => [((i % 14) / 13 - 0.5) * width, (Math.floor(i / 14) / 13 - 0.5) * height]);
    // the wordmark's initials, sampled from text drawn into a canvas (browser only; the grid without it)
    let letters = grid;
    if (typeof document !== 'undefined') {
        const c = document.createElement('canvas');
        c.width = 160; c.height = 60;
        const x = c.getContext('2d');
        x.fillStyle = '#fff'; x.font = '900 54px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('SV', 80, 32);
        const data = x.getImageData(0, 0, 160, 60).data;
        const on = [];
        for (let yy = 0; yy < 60; yy += 2) for (let xx = 0; xx < 160; xx += 2) if (data[(yy * 160 + xx) * 4 + 3] > 128) on.push([xx, yy]);
        if (on.length >= DRONES) letters = Array.from({ length: DRONES }, (_, i) => { const [xx, yy] = on[Math.floor((i * on.length) / DRONES)]; return [(xx / 160 - 0.5) * width * 0.8, (0.5 - yy / 60) * height]; });
    }
    return [grid, ring, heart, star, letters];
}
function Drones({ show, look }) {
    const { geometry, material, list } = useMemo(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DRONES * 3), 3));
        g.setAttribute('aSeed', new THREE.BufferAttribute(Float32Array.from({ length: DRONES }, (_, i) => (i * 0.618) % 1), 1));
        const m = new THREE.ShaderMaterial({
            ...ADDITIVE,
            uniforms: { uLevel: { value: 0 }, uTime: { value: 0 }, uColorA: { value: new THREE.Color() }, uColorB: { value: new THREE.Color() } },
            vertexShader: /* glsl */ `
                attribute float aSeed; uniform float uTime; varying float vSeed;
                void main() { vSeed = aSeed; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = 900.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
            fragmentShader: /* glsl */ `
                uniform float uLevel; uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB; varying float vSeed;
                void main() {
                    float r = length(gl_PointCoord - 0.5);
                    float dot = smoothstep(0.5, 0.0, r);
                    float twinkle = 0.75 + 0.25 * sin(uTime * 3.0 + vSeed * 40.0);
                    gl_FragColor = vec4(mix(uColorA, uColorB, vSeed) * 1.6 + vec3(0.3), dot * uLevel * twinkle);
                }`,
        });
        return { geometry: g, material: m, list: shapes(show.width, show.height) };
    }, [show]);
    useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
    const points = useRef();
    const state = useRef({ level: 0 });
    useFrame(({ clock }, delta) => {
        if (!points.current) return;
        const l = look.current;
        const t = clock.elapsedTime;
        const st = state.current;
        const finale = (l.fireworks?.filter((f) => f.type !== 'mines').length ?? 0) >= 4;
        const want = finale || firing('drones') ? 1 : 0;
        st.level += (want - st.level) * Math.min(1, delta * 0.8);
        points.current.visible = st.level > 0.01;
        if (!points.current.visible) return;
        // a new shape every 4 s, moving between them over the first 1.5 s
        const n = Math.floor(t / 4);
        const k = Math.min(1, (t % 4) / 1.5);
        const e = k * k * (3 - 2 * k);
        const from = list[n % list.length];
        const to = list[(n + 1) % list.length];
        const attr = points.current.geometry.attributes.position;
        const pos = attr.array;
        const [cx, cy, cz] = show.centre;
        for (let i = 0; i < DRONES; i++) {
            pos[i * 3] = cx + from[i][0] + (to[i][0] - from[i][0]) * e;
            pos[i * 3 + 1] = cy + from[i][1] + (to[i][1] - from[i][1]) * e + Math.sin(t * 0.8 + i) * 0.15;
            pos[i * 3 + 2] = cz;
        }
        attr.needsUpdate = true;
        const u = points.current.material.uniforms;
        u.uLevel.value = st.level;
        u.uTime.value = t;
        u.uColorA.value.set(l.colorA ?? '#19d9ff');
        u.uColorB.value.set(l.colorB ?? '#ff3df2');
    });
    return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}

/** Every trial fixture the stage has (stage.extras) whose switch is on. */
export default function StageExtras({ stage, look }) {
    const [on, setOn] = useState(readExtras);
    useEffect(() => {
        const update = () => setOn(readExtras());
        const fire = (e) => {
            const seconds = { flames: 6, cryo: 3, drones: 24 }[e.detail];
            if (seconds) fired[e.detail] = performance.now() / 1000 + seconds;
        };
        window.addEventListener(EXTRAS_KEY, update);
        window.addEventListener(EXTRAS_FIRE, fire);
        return () => { window.removeEventListener(EXTRAS_KEY, update); window.removeEventListener(EXTRAS_FIRE, fire); };
    }, []);
    const x = stage.extras;
    if (!x) return null;
    return (
        <>
            {on.tiltBars && x.tiltBars && <TiltBars bars={x.tiltBars} look={look} />}
            {on.hybridBeams && x.hybridBeams && <HybridBeams points={x.hybridBeams} look={look} />}
            {on.flames && x.flames && <Flames points={x.flames} look={look} />}
            {on.cryo && x.cryo && <Cryo points={x.cryo} look={look} />}
            {on.kinetic && x.kinetic && <Kinetic rig={x.kinetic} look={look} />}
            {on.ledLines && x.ledLines && <LedLines lines={x.ledLines} look={look} />}
            {on.drones && x.drones && <Drones show={x.drones} look={look} />}
        </>
    );
}
