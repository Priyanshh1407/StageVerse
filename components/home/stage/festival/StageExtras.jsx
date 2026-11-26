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
// (`solo`: the fixture the test page is showing on its own, the rest of the rig dark; a moment effect then runs nonstop)
const fired = { cryo: 0, solo: null };
const firing = (kind) => fired.solo === kind || performance.now() / 1000 < fired[kind];
// what a fixture shown on its own reads: the look at full, whatever the rig is doing
const SOLO_LOOK = { master: 1, intensity: 1, floor: 1, beams: 1, wash: 1, pixel: 1, crowd: 1 };

// ---- beams: a cone per beam, its direction worked out in the shader (laser-hybrid rods, uplight washes) ---------------
const BEAM_VERTEX = (dirCode) => /* glsl */ `
    attribute vec3 aOrigin;
    attribute vec3 aDir;           // the fixture's own aim (the uplight washes: up the face of their fin)
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
    const dirs = [];
    points.forEach((pt, id) => {
        for (let j = 0; j < fan; j++) {
            origins.push(...pt.pos);
            dirs.push(...(pt.dir ?? [0, 1, 0]));
            info.push(id, fan > 1 ? (j / (fan - 1)) * 2 - 1 : 0, pt.s ?? Math.sign(pt.pos[0]) ?? 1, 0);
        }
    });
    geometry.setAttribute('aOrigin', new THREE.InstancedBufferAttribute(new Float32Array(origins), 3));
    geometry.setAttribute('aInfo', new THREE.InstancedBufferAttribute(new Float32Array(info), 4));
    geometry.setAttribute('aDir', new THREE.InstancedBufferAttribute(new Float32Array(dirs), 3));
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

/** Tilting beam bars along the warehouse's stage front: seven beams a bar, tilting together on the beat and fanning out;
 *  odd and even bars swapping the show's two colours, at the floor's level (the stage has no other floor beams). */
function TiltBars({ bars, look }) {
    const opts = useMemo(() => ({
        length: 34, r0: 0.05, r1: 0.5, fan: 7,
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
        return (l.floor ?? 0) * masterOf(l) * 0.8;
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

// ---- jets: cryo, a soft column per jet that grows with its firing -------------------------------------
const JET_VERTEX = /* glsl */ `
    attribute vec3 aOrigin;
    attribute float aSeed;
    attribute float aSpread;       // the nozzle's place across the stage: -1 the far left, 0 the centre, 1 the far right
    uniform float uTime;
    uniform float uHeight;
    uniform float uWidth;
    uniform vec3 uDir;
    uniform float uSweep;
    varying float vY;
    varying float vSeed;
    varying float vSpread;
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
        vSpread = aSpread;
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
    uniform float uSide;           // -1 only the left nozzles, 1 only the right, 0 all
    uniform float uReveal;         // a blast spreading out from the centre: nozzles out to this far are firing
    varying float vY;
    varying float vSeed;
    varying float vSpread;
    varying vec3 vWorld;
    varying float vFacing;
    float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float n(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
    void main() {
        float side = uSide == 0.0 ? 1.0 : step(0.0, vSpread * uSide);
        float reveal = smoothstep(0.0, 0.2, uReveal - abs(vSpread));
        float flicker = n(vec2(vWorld.x * 1.5 + vSeed * 7.0, vWorld.y * 1.2 - uTime * 6.0));
        float billow = n(vec2(vWorld.x * 0.6 - vSeed * 3.0, vWorld.y * 0.5 - uTime * 2.5));
        float a = pow(1.0 - vY, 1.2) * (0.35 + 0.6 * flicker + 0.4 * billow) * pow(vFacing, 1.3) * smoothstep(0.0, 0.08, vY + 0.02) * uLevel * side * reveal;
        vec3 c;
        ${colorCode}
        gl_FragColor = vec4(c, a);
    }
`;

function useJets(points, { colorCode, height, width, dir, sweep = 0 }, drive) {
    const { geometry, material } = useMemo(() => {
        const col = new THREE.CylinderGeometry(0.5, 0.5, 1, 10, 8, true).translate(0, 0.5, 0);
        const g = new THREE.InstancedBufferGeometry().copy(col);
        const far = Math.max(...points.map((pt) => Math.abs(pt[0])), 1);
        g.setAttribute('aOrigin', new THREE.InstancedBufferAttribute(new Float32Array(points.flat()), 3));
        g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(points.map((_, i) => (i * 0.618) % 1)), 1));
        g.setAttribute('aSpread', new THREE.InstancedBufferAttribute(new Float32Array(points.map((pt) => pt[0] / far)), 1));
        g.instanceCount = points.length;
        const m = new THREE.ShaderMaterial({
            vertexShader: JET_VERTEX, fragmentShader: JET_FRAGMENT(colorCode), ...ADDITIVE,
            uniforms: {
                uTime: { value: 0 }, uHeight: { value: height }, uWidth: { value: width }, uDir: { value: new THREE.Vector3(...dir) }, uSweep: { value: sweep },
                uLevel: { value: 0 }, uSide: { value: 0 }, uReveal: { value: 2 },
            },
        });
        return { geometry: g, material: m };
    }, [points, colorCode, height, width, dir, sweep]);
    const mesh = useRef();
    useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
    useFrame(({ clock }, delta) => {
        if (!mesh.current) return;
        const u = mesh.current.material.uniforms;
        u.uTime.value = clock.elapsedTime;
        const level = drive(clock.elapsedTime, Math.min(delta, 0.1), u);
        u.uLevel.value = level;
        u.uHeight.value = height * (0.35 + 0.65 * Math.min(1, level));
        mesh.current.visible = level > 0.01;
    });
    return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} />;
}

/** Cryo jets along the deck front, swept side to side. In a song they follow the cryo cue (lib/show/cryo.js: bursts on
 *  the last two downbeats of a build, a blast spreading out from the centre on the drop, one burst a phrase later, left
 *  and right in turn in the finale); on the test page's looks (no song), on a drop. */
function Cryo({ points, look }) {
    const opts = useMemo(() => ({
        height: 11, width: 4, dir: [0, 1, 0.4], sweep: 0.35,
        colorCode: 'c = vec3(0.85, 0.92, 1.0) * 2.4;',
    }), []);
    const level = useRef(0);
    return useJets(points, opts, (clock, dt, u) => {
        const l = look.current;
        if (firing('cryo')) {
            u.uSide.value = 0;
            u.uReveal.value = 2;
            level.current = 1;
            return 1;
        }
        if (l.cryoCue) {
            // the song's cue: the jets snap on, and fade with the firing
            u.uSide.value = l.cryoSide ?? 0;
            u.uReveal.value = l.cryoReveal ?? 2;
            level.current = (l.cryo ?? 0) * (l.master ?? 1);
            return level.current;
        }
        u.uSide.value = 0;
        u.uReveal.value = 2;
        const want = (l.dropFx ?? 0) > 0.3 ? 1 : 0;
        level.current = want > level.current ? want : Math.max(0, level.current - dt * 0.9);
        return level.current;
    });
}

// ---- the kinetic LED sky (warehouse): see-through LED tiles on winches over the crowd, moving into shapes -----------
// (in the spirit of the kinetic LED ceilings of big indoor festival stages: an original StageVerse design.) Every tile
// hangs on a cable under the grid, in the gaps between the grid's fixtures (so the beams fire between the tiles); its
// height is one shape across the whole ceiling and it tilts with the slope of that shape, so the ceiling moves as one
// surface. The shape is the ceiling's own cue, by the part of the song:
//   quiet parts (intro, calm, verse, outro)  high and nearly flat, drifting slowly
//   groove                                   a wave rolling from the stage to the back of the room
//   build                                    the ceiling comes down over the crowd into a valley pointing at the DJ
//   the drop                                 it springs up into a dome, flashing white
//   peak                                     rings spreading from the middle of the room on the beat
//   breakdown                                low, still and dim, in one colour
//   finale (the fireworks)                   a chessboard: alternate tiles up and down on the beat
// A groove and a peak don't keep one move: every 8 bars they take the next of (SKY_TURNS) the wave or rings, the ceiling
// still and level, one line of tiles coming down and travelling to the back like a wave, random tiles dropping straight
// down, a wave widening from the middle out to both walls.
// and its picture with it, one picture across the whole ceiling: a starfield and a slow nebula in quiet parts and
// breakdowns (the closed hall opening onto a night sky), the show's two colours in bands in a groove, streaks of light
// rushing over the crowd towards the stage in a build, a white flash on the drop, rings on the beat in a peak, a
// chessboard in the two colours in the finale. LED dots
// with gaps between them (cut out), so the beams still pass through. One draw call for the tiles, one for the cables.
const SKY_SHAPE = /* glsl */ `
    attribute vec2 aCell;
    attribute vec2 aIdx;
    uniform float uBeat; uniform float uBase; uniform float uTop; uniform vec2 uCentre;
    uniform float uAmp; uniform float uOffset; uniform vec2 uSpan;
    uniform float uWave; uniform float uRipple; uniform float uFunnel; uniform float uDome; uniform float uChess;
    uniform float uLine; uniform float uWiden; uniform float uDrops;
    float hashT(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float shapeAt(vec2 q) {
        float wave = sin((q.y - uCentre.y) * 0.32 - uBeat * 0.785);                 // rolls from the stage back, 8 beats
        float ripple = sin(length(q - uCentre) * 0.45 - uBeat * 1.571);             // rings from the middle, 4 beats
        float funnel = clamp(abs(q.x) / 15.0, 0.0, 1.0) * 2.0 - 1.0;                  // a valley down the middle of the room
        float dome = 1.0 - 2.0 * pow(clamp(length(q - uCentre) / 19.0, 0.0, 1.0), 2.0);
        // one line of tiles comes down, the line travelling from the stage to the back of the room like a wave (2 bars)
        float lineZ = mix(uSpan.x - 3.0, uSpan.y + 3.0, fract(uBeat / 8.0));
        float line = -2.2 * exp(-pow((q.y - lineZ) / 2.0, 2.0));
        // a wave across the room that starts in the middle and widens out to both walls (4 bars), then starts again
        float reach = fract(uBeat / 16.0) * 30.0;
        float widen = sin(abs(q.x) * 0.55 - uBeat * 1.571) * smoothstep(reach, reach - 4.0, abs(q.x));
        return uAmp * (uWave * wave + uRipple * ripple + uFunnel * funnel + uDome * dome + uWiden * widen) + uLine * line + uOffset;
    }
    // moves of each tile as a whole (the tile stays flat): the chessboard, and random tiles dropping straight down
    float chess() {
        float board = uChess * 0.9 * (mod(aIdx.x + aIdx.y, 2.0) * 2.0 - 1.0) * cos(uBeat * 3.14159);
        // a new random set of tiles each 2 beats drops 2.4 m and comes back up
        float f = fract(uBeat / 2.0);
        float picked = step(0.8, hashT(aIdx + floor(uBeat / 2.0) * 1.37));
        float drop = -2.4 * picked * smoothstep(0.0, 0.25, f) * (1.0 - smoothstep(0.65, 1.0, f));
        return board + uDrops * drop;
    }`;
// what each part of a song asks of the ceiling: the shape's weights, how deep, how far up or down, and the picture
// (a groove and a peak change their move every 8 bars, so the ceiling isn't always waving: see SKY_TURNS)
// (stars: a starfield and a slow nebula, the ceiling opening onto a night sky; tunnel: streaks of light rushing over the
// crowd towards the stage; checks: the chessboard's tiles in the two colours)
const SKY_MODES = {
    quiet: { wave: 0.3, ripple: 0, funnel: 0, dome: 0, chess: 0, amp: 0.25, offset: 0.7, ring: 0, mono: 0, stars: 1, tunnel: 0, checks: 0 },
    groove: { wave: 1, ripple: 0, funnel: 0, dome: 0, chess: 0, amp: 0.8, offset: 0, ring: 0.2, mono: 0, stars: 0.25, tunnel: 0, checks: 0 },
    build: { wave: 0.15, ripple: 0, funnel: 1, dome: 0, chess: 0, amp: 0.9, offset: -0.6, ring: 0, mono: 0, stars: 0, tunnel: 1, checks: 0 },
    drop: { wave: 0, ripple: 0, funnel: 0, dome: 1, chess: 0, amp: 1, offset: 0.2, ring: 1, mono: 0, stars: 0, tunnel: 0, checks: 0 },
    peak: { wave: 0, ripple: 1, funnel: 0, dome: 0, chess: 0, amp: 0.95, offset: 0, ring: 1, mono: 0, stars: 0, tunnel: 0, checks: 0 },
    breakdown: { wave: 0.1, ripple: 0, funnel: 0, dome: 0, chess: 0, amp: 0.2, offset: -0.85, ring: 0, mono: 1, stars: 1, tunnel: 0, checks: 0 },
    finale: { wave: 0, ripple: 0.3, funnel: 0, dome: 0, chess: 1, amp: 0.5, offset: 0, ring: 0.6, mono: 0, stars: 0, tunnel: 0, checks: 1 },
    // random tiles dropping straight down on every other beat, the rest still and flat
    drops: { wave: 0, ripple: 0, funnel: 0, dome: 0, chess: 0, drops: 1, amp: 0, offset: 0.4, ring: 0.3, mono: 0, stars: 0.15, tunnel: 0, checks: 0 },
    // one line of tiles coming down and travelling from the stage to the back like a wave
    line: { wave: 0, ripple: 0, funnel: 0, dome: 0, chess: 0, line: 1, amp: 0, offset: 0.5, ring: 0.4, mono: 0, stars: 0, tunnel: 0, checks: 0 },
    // a wave across the room, starting narrow in the middle and widening out to both walls
    widen: { wave: 0, ripple: 0, funnel: 0, dome: 0, chess: 0, widen: 1, amp: 1, offset: 0, ring: 0.5, mono: 0, stars: 0, tunnel: 0, checks: 0 },
    // the whole ceiling still, level, high: the picture does the work
    still: { wave: 0, ripple: 0, funnel: 0, dome: 0, chess: 0, amp: 0, offset: 0.4, ring: 0.6, mono: 0, stars: 0, tunnel: 0, checks: 0 },
};
// the moves a groove and a peak take turns with, one every 8 bars (32 beats)
const SKY_TURNS = {
    groove: ['groove', 'still', 'line', 'drops', 'widen'],
    peak: ['peak', 'widen', 'drops', 'line', 'still'],
};
/** Which of SKY_MODES the look asks for: by the song's part, or (the test page's looks) by the crowd's energy. */
export function skyModeOf(l) {
    if ((l.dropFx ?? 0) > 0.3) return 'drop';
    if (l.finale || (l.fireworks?.length ?? 0) >= 4) return 'finale';
    const kind = l.sectionKind;
    const e = l.crowd ?? 0.3;
    const part = kind
        ? ({ peak: 'peak', build: 'build', groove: 'groove', breakdown: 'breakdown' }[kind] ?? 'quiet')
        : e >= 0.9 ? 'peak' : e >= 0.45 ? 'build' : e >= 0.3 ? 'groove' : 'quiet';
    const turns = SKY_TURNS[part];
    return turns ? turns[Math.floor((l.beatPos ?? 0) / 32) % turns.length] : part;
}
function KineticSky({ sky, look }) {
    const { tiles, frames, cables } = useMemo(() => {
        const cells = new Float32Array(sky.cells.flat());
        const idx = new Float32Array(sky.index.flat());
        const make = (geo, material) => {
            const g = new THREE.InstancedBufferGeometry().copy(geo);
            g.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 2));
            g.setAttribute('aIdx', new THREE.InstancedBufferAttribute(idx, 2));
            g.instanceCount = sky.cells.length;
            return { g, material };
        };
        const uniforms = {
            uBeat: { value: 0 }, uBase: { value: sky.base }, uTop: { value: sky.top }, uCentre: { value: new THREE.Vector2(...sky.centre) },
            uAmp: { value: 0.3 }, uOffset: { value: 0.5 },
            uWave: { value: 0.3 }, uRipple: { value: 0 }, uFunnel: { value: 0 }, uDome: { value: 0 }, uChess: { value: 0 },
            uLine: { value: 0 }, uWiden: { value: 0 }, uDrops: { value: 0 },
            uSpan: { value: new THREE.Vector2(Math.min(...sky.cells.map((c) => c[1])), Math.max(...sky.cells.map((c) => c[1]))) },
            uLevel: { value: 0 }, uRing: { value: 0 }, uMono: { value: 0 }, uFlash: { value: 0 }, uStars: { value: 1 }, uTunnel: { value: 0 }, uChecks: { value: 0 }, uColorA: { value: new THREE.Color() }, uColorB: { value: new THREE.Color() },
        };
        const tile = new THREE.ShaderMaterial({
            uniforms, ...ADDITIVE,
            vertexShader: `${SKY_SHAPE}
                varying vec2 vUv; varying vec3 vW; varying vec2 vIdx;
                void main() {
                    vIdx = aIdx;
                    float h = shapeAt(aCell);
                    float dx = shapeAt(aCell + vec2(0.5, 0.0)) - h;
                    float dz = shapeAt(aCell + vec2(0.0, 0.5)) - h;
                    vec3 t = normalize(vec3(0.5, dx, 0.0));                    // the tile tilts with the slope of the shape
                    vec3 b = normalize(vec3(0.0, dz, 0.5));
                    vec3 n = normalize(cross(b, t));
                    vec3 w = vec3(aCell.x, uBase + h + chess(), aCell.y) + t * position.x + n * position.y + b * position.z;
                    vUv = position.xz / ${sky.size.toFixed(2)} + 0.5;
                    vW = w;
                    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(w, 1.0);
                }`,
            fragmentShader: /* glsl */ `
                uniform float uBeat; uniform float uLevel; uniform float uRing; uniform float uMono; uniform float uFlash;
                uniform float uStars; uniform float uTunnel; uniform float uChecks;
                uniform vec3 uColorA; uniform vec3 uColorB; uniform vec2 uCentre;
                varying vec2 vUv; varying vec3 vW; varying vec2 vIdx;
                float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
                float noise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
                    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
                void main() {
                    vec2 edge = min(vUv, 1.0 - vUv);
                    if (min(edge.x, edge.y) < 0.02) discard;                     // (the frame: drawn dark by its own mesh)
                    // fine LEDs (24 a row, about 6 cm apart) on a see-through panel: light only, the room shows through
                    // between them; far away, where the LEDs are smaller than a screen pixel, their average glow (no
                    // shimmering patterns)
                    vec2 g = vUv * 24.0;
                    float fw = fwidth(g.x) + fwidth(g.y);
                    float dotMask = 1.0 - smoothstep(0.16, 0.16 + max(fw, 0.04) * 0.9, length(fract(g) - 0.5));
                    dotMask = mix(dotMask, 0.1, smoothstep(0.35, 1.0, fw));
                    // one picture across the whole ceiling
                    float band = 0.5 + 0.5 * sin(vW.z * 0.22 + vW.x * 0.08 - uBeat * 0.4);
                    vec3 c = mix(mix(uColorA, uColorB, band), uColorA, uMono);
                    float dist = length(vW.xz - uCentre);
                    float ring = exp(-abs(dist - fract(uBeat) * 22.0) * 0.7);
                    float beat = exp(-fract(uBeat) * 5.0);
                    vec3 lamp = c * (0.35 + 0.35 * beat + 1.4 * ring * uRing) * uLevel * 1.8;
                    // the starfield and the nebula: a night sky over the hall
                    vec2 dotId = floor(vW.xz * 8.0);
                    float star = step(0.985, hash(dotId)) * (0.5 + 0.5 * sin(uBeat * 1.3 + hash(dotId + 7.0) * 40.0));
                    float cloud = noise(vW.xz * 0.06 + vec2(uBeat * 0.01, 0.0)) * noise(vW.xz * 0.13 - vec2(0.0, uBeat * 0.015));
                    vec3 night = mix(uColorA, uColorB, noise(vW.xz * 0.04)) * cloud * 0.9 + vec3(0.9, 0.95, 1.0) * star * 2.2;
                    lamp = mix(lamp, night * uLevel * 1.6, uStars);
                    // the tunnel: streaks rushing over the crowd towards the stage, faster as the build goes on
                    float streak = smoothstep(0.85, 1.0, fract((vW.z - uCentre.y) * 0.07 + uBeat * 0.5 + hash(vec2(floor(vW.x * 1.2), 3.0)) * 0.6));
                    lamp = mix(lamp, mix(uColorA, vec3(1.0), streak * 0.6) * (0.1 + 2.4 * streak) * uLevel, uTunnel);
                    // the chessboard: alternate tiles in the two colours, swapping on the beat
                    float sq = mod(vIdx.x + vIdx.y + floor(uBeat), 2.0);
                    lamp = mix(lamp, mix(uColorA, uColorB, sq) * (0.4 + 1.2 * beat) * uLevel * 1.8, uChecks);
                    lamp = mix(lamp, vec3(1.0), uFlash);
                    gl_FragColor = vec4(lamp * dotMask * 2.4, 1.0);
                }`,
        });
        // the tiles' thin dark frames (the panels' only solid part)
        const frame = new THREE.ShaderMaterial({
            uniforms, toneMapped: false, side: THREE.DoubleSide,
            vertexShader: tile.vertexShader,
            fragmentShader: /* glsl */ `
                varying vec2 vUv;
                void main() {
                    vec2 edge = min(vUv, 1.0 - vUv);
                    if (min(edge.x, edge.y) >= 0.02) discard;
                    gl_FragColor = vec4(0.02, 0.02, 0.025, 1.0);
                }`,
        });
        const cable = new THREE.ShaderMaterial({
            uniforms, toneMapped: false,
            vertexShader: `${SKY_SHAPE}
                void main() {
                    float y = mix(uBase + shapeAt(aCell) + chess() + 0.05, uTop, position.y + 0.5);
                    vec3 w = vec3(aCell.x + position.x, y, aCell.y + position.z);
                    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(w, 1.0);
                }`,
            fragmentShader: 'void main() { gl_FragColor = vec4(0.05, 0.05, 0.06, 1.0); }',
        });
        const panel = new THREE.BoxGeometry(sky.size, 0.05, sky.size);
        return {
            tiles: make(panel, tile),
            frames: make(panel, frame),
            cables: make(new THREE.CylinderGeometry(0.015, 0.015, 1, 4), cable),
        };
    }, [sky]);
    const group = useRef();
    useEffect(() => () => { for (const p of [tiles, frames, cables]) { p.g.dispose(); p.material.dispose(); } }, [tiles, frames, cables]);
    useFrame(({ clock }, delta) => {
        if (!group.current) return;
        const l = look.current;
        const u = group.current.children[0].material.uniforms;
        const mode = SKY_MODES[skyModeOf(l)];
        // the winches move slowly; the drop is the one fast move (the ceiling springs up)
        const k = 1 - Math.exp(-Math.min(delta, 0.1) * (mode === SKY_MODES.drop ? 5 : 1.2));
        const ease = (key, to) => { u[key].value += (to - u[key].value) * k; };
        u.uBeat.value = beatOf(l, clock.elapsedTime);
        ease('uWave', mode.wave); ease('uRipple', mode.ripple); ease('uFunnel', mode.funnel); ease('uDome', mode.dome); ease('uChess', mode.chess);
        ease('uLine', mode.line ?? 0); ease('uWiden', mode.widen ?? 0); ease('uDrops', mode.drops ?? 0);
        ease('uAmp', mode.amp); ease('uOffset', mode.offset); ease('uRing', mode.ring); ease('uMono', mode.mono);
        ease('uStars', mode.stars); ease('uTunnel', mode.tunnel); ease('uChecks', mode.checks);
        u.uLevel.value = masterOf(l) * Math.max(0.3, l.pixel ?? 0.6) * (mode === SKY_MODES.breakdown ? 0.5 : 1);
        u.uFlash.value = Math.min(1, Math.max((l.dropFx ?? 0) > 0.3 ? l.dropFx : 0, (l.blinder ?? 0) * 0.6)) * (l.master ?? 1);
        u.uColorA.value.set(l.colorA ?? '#19d9ff');
        u.uColorB.value.set(l.colorB ?? '#ff3df2');
    });
    return (
        <group ref={group}>
            <mesh geometry={tiles.g} material={tiles.material} frustumCulled={false} />
            <mesh geometry={frames.g} material={frames.material} frustumCulled={false} />
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

/** Uplight washes at the fin feet: one wide soft cone per fin grazing up its face to the tip; alternate fins in the
 *  show's two colours, swapping every bar; at the washes' level. */
function FinWashes({ points, look }) {
    const opts = useMemo(() => ({ length: 24, r0: 0.25, r1: 3.2, dirCode: 'd = aDir;' }), []);
    return useBeams(points, opts, (u, clock) => {
        const l = look.current;
        u.uBeat.value = beatOf(l, clock) / 4;
        u.uColorA.value.set(l.colorA ?? '#19d9ff');
        u.uColorB.value.set(l.colorB ?? '#ff3df2');
        return (l.wash ?? 0.8) * masterOf(l) * 1.2;
    });
}

/** Every trial fixture the stage has (stage.extras) whose switch is on; with `solo`, only that one, at full. */
export default function StageExtras({ stage, look, solo = null }) {
    const [on, setOn] = useState(readExtras);
    const soloLook = useMemo(() => ({ get current() { return { ...look.current, ...SOLO_LOOK }; } }), [look]);
    useEffect(() => {
        fired.solo = solo;
        return () => { fired.solo = null; };
    }, [solo]);
    useEffect(() => {
        const update = () => setOn(readExtras());
        const fire = (e) => {
            const seconds = { cryo: 3 }[e.detail];
            if (seconds) fired[e.detail] = performance.now() / 1000 + seconds;
        };
        window.addEventListener(EXTRAS_KEY, update);
        window.addEventListener(EXTRAS_FIRE, fire);
        return () => { window.removeEventListener(EXTRAS_KEY, update); window.removeEventListener(EXTRAS_FIRE, fire); };
    }, []);
    const x = stage.extras;
    if (!x) return null;
    // shown: its switch is on (or it's the one shown on its own); a fixture on its own reads the look at full
    const show = (key) => Boolean(x[key]) && (solo ? solo === key : on[key]);
    const lk = solo ? soloLook : look;
    return (
        <>
            {show('tiltBars') && <TiltBars bars={x.tiltBars} look={lk} />}
            {show('finWashes') && <FinWashes points={x.finWashes} look={lk} />}
            {show('hybridBeams') && <HybridBeams points={x.hybridBeams} look={lk} />}
            {show('cryo') && <Cryo points={x.cryo} look={lk} />}
            {show('kineticSky') && <KineticSky sky={x.kineticSky} look={lk} />}
            {show('ledLines') && <LedLines lines={x.ledLines} look={lk} />}
        </>
    );
}
