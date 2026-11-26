'use client';

// The trial fixtures and effects (lib/show/stages/extras.js): each one or two draw calls, hidden while idle, each with its
// own switch, read from the stage's look like every other light. Positions come from the stage (stage.extras).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EXTRAS_FIRE, EXTRAS_KEY, barsPlay, readExtras } from '@/lib/show/stages/extras';
import { LED_SHOW, driveLedShow, ledShowUniforms } from './ledShow';

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
const BEAM_VERTEX = (dirCode, head = '') => /* glsl */ `
    ${head}
    attribute vec3 aOrigin;
    attribute vec3 aDir;           // the fixture's own aim (the uplight washes: up the face of their fin)
    attribute vec4 aInfo;          // x: the fixture's number, y: its place in its fan (-1..1), z: its side (-1, 1), w: spare
    uniform float uTime;
    uniform float uBeat;
    uniform float uLength;
    uniform float uChase;          // (the beam bars: a chase along their cells)
    varying float vAlong;
    varying vec3 vWorld;
    varying vec3 vNormalW;
    varying float vParity;
    varying float vGate;
    void main() {
        float id = aInfo.x;
        float k = aInfo.y;
        float side = aInfo.z;
        float gate = 1.0;          // (the direction code may switch a beam off: the bars' chase along their cells)
        float parity = mod(id + floor(uBeat), 2.0);   // (and pick its colour: odd and even swapping on the beat)
        vec3 d;
        ${dirCode}
        vGate = gate;
        d = normalize(d);
        vec3 t = normalize(abs(d.z) < 0.95 ? cross(d, vec3(0.0, 0.0, 1.0)) : cross(d, vec3(1.0, 0.0, 0.0)));
        vec3 b = cross(t, d);
        vec3 p = position;
        p.y *= uLength;
        vec3 world = aOrigin + t * p.x + d * p.y + b * p.z;
        vAlong = position.y;
        vWorld = (modelMatrix * vec4(world, 1.0)).xyz;
        vNormalW = normalize(mat3(modelMatrix) * (t * normal.x + d * normal.y + b * normal.z));
        vParity = parity;
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
    }
`;
const BEAM_FRAGMENT = /* glsl */ `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uLevel;
    uniform float uWhite;
    uniform float uHot;            // how white the beam is at its source (0: its colour all the way)
    varying float vAlong;
    varying vec3 vWorld;
    varying vec3 vNormalW;
    varying float vParity;
    varying float vGate;
    void main() {
        float facing = abs(dot(normalize(vNormalW), normalize(cameraPosition - vWorld)));
        float core = pow(facing, 1.6);
        float fade = pow(clamp(1.0 - vAlong, 0.0, 1.0), 1.4);
        vec3 c = mix(mix(uColorA, uColorB, vParity), vec3(1.0), uWhite + uHot * pow(1.0 - vAlong, 16.0));
        gl_FragColor = vec4(c, core * fade * uLevel * vGate);
    }
`;

function beamMesh(points, { length, r0, r1, dirCode, fan = 1, span = 0, head = '' }) {
    const cone = new THREE.CylinderGeometry(r0, r1, 1, 12, 1, true).translate(0, 0.5, 0);
    const geometry = new THREE.InstancedBufferGeometry().copy(cone);
    const origins = [];
    const info = [];
    const dirs = [];
    points.forEach((pt, id) => {
        for (let j = 0; j < fan; j++) {
            // (span: the beams of one fixture side by side along x, a batten's cells; otherwise all from one point)
            const k = fan > 1 ? (j / (fan - 1)) * 2 - 1 : 0;
            origins.push(pt.pos[0] + (k * span) / 2, pt.pos[1], pt.pos[2]);
            dirs.push(...(pt.dir ?? [0, 1, 0]));
            info.push(id, fan > 1 ? (j / (fan - 1)) * 2 - 1 : 0, pt.s ?? Math.sign(pt.pos[0]) ?? 1, 0);
        }
    });
    geometry.setAttribute('aOrigin', new THREE.InstancedBufferAttribute(new Float32Array(origins), 3));
    geometry.setAttribute('aInfo', new THREE.InstancedBufferAttribute(new Float32Array(info), 4));
    geometry.setAttribute('aDir', new THREE.InstancedBufferAttribute(new Float32Array(dirs), 3));
    geometry.instanceCount = origins.length / 3;
    const material = new THREE.ShaderMaterial({
        vertexShader: BEAM_VERTEX(dirCode, head), fragmentShader: BEAM_FRAGMENT, ...ADDITIVE,
        uniforms: { uTime: { value: 0 }, uBeat: { value: 0 }, uLength: { value: length }, uLevel: { value: 0 }, uWhite: { value: 0 }, uHot: { value: 0.25 }, uChase: { value: 0 }, uMid: { value: 0 }, uColorA: { value: new THREE.Color() }, uColorB: { value: new THREE.Color() } },
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

/** Pixel beam bars along the warehouse's stage front, like the real thing: a fixed bar of five heads 48 cm apart, each
 *  head moving on its own and firing its own beam, a thin rod of light like the mainstage's laser-hybrid beams (no
 *  widening cone, no white at the source: only its colour), apart from the others right from the source. The bars stand
 *  end to end across the whole stage (no gaps). Their move changes every 8 bars of the song:
 *    sheet    every head parallel, the bars tilting in a wave across the stage
 *    fan      each bar's heads spread out into a fan that opens and closes on the beat
 *    arches   neighbouring bars fan the opposite ways, so their beams cross into arches over the stage
 *    ripple   a wave running along the heads of each bar, the beams curling like a ribbon
 *    tornado  every head spinning its beam round in a circle, each a little behind the next (a vortex)
 *    split    odd and even bars tilting opposite ways
 *    sweep    every head swinging left and right together; mirror sweep: out from the middle and back
 *    odd/even the odd and even heads, or the odd and even bars, switching on the beat
 *  Every move is mirrored about the middle of the stage (the criss-cross crosses the same beams on both sides).
 *  Colours: odd and even bars in the show's two colours, or (fan, ripple, tornado) head by head along the bar; in
 *  quieter parts a chase runs along the heads across the stage, in a peak every head is on. At the floor's level (the
 *  stage has no other floor beams). One draw call for the beams, one for the bars. */
export const TILT_BAR = { cells: 5, pitch: 0.48, length: 2.4 };
const TILT_GLSL = /* glsl */ `
    uniform float uMid;            // the middle bar's number: every move is mirrored about the middle of the stage
    float barHash(float id, float s) { return fract((id * 7.0 + s * 13.0) * 0.6180339); }
    // the move, a new one every 8 bars:
    //  0 sheet  1 fan  2 criss-cross  3 ripple  4 tornado  5 split  6 sweep  7 mirror sweep  8 odd/even heads  9 odd/even bars
    float barMove(float beat) { return mod(floor(beat / 32.0), 10.0); }
    vec3 headAim(float id, float k, float beat) {
        float move = barMove(beat);
        float b = beat * 1.5708;                                     // a quarter turn a beat
        float c = id - uMid;                                         // the bar's place from the middle (mirrored moves)
        float side = sign(c);
        float far = abs(c);
        float km = side == 0.0 ? k : k * side;                      // the head's place, mirrored on the left half
        float pitch = 1.32;                                          // low, out over the audience (from straight up)
        float yaw = 0.0;                                             // across the stage (+ to the right)
        if (move < 0.5) pitch += sin(b - far * 0.35) * 0.18;                                  // sheets: a wave out from the middle
        else if (move < 1.5) { yaw = k * (0.25 + 0.45 * (0.5 + 0.5 * sin(b))); pitch += sin(b * 0.5 - far * 0.2) * 0.1; }
        else if (move < 2.5) {
            // criss-cross: neighbouring bars lean towards each other so their beams cross, mirrored about the middle (the
            // middle bar fans out both ways): the same number of beams cross on each side
            float lean = mod(far, 2.0) * 2.0 - 1.0;
            yaw = side == 0.0 ? k * 0.45 : side * lean * (0.42 + 0.18 * km) * (0.75 + 0.25 * sin(b * 0.5));
            pitch += 0.06 * sin(b * 0.5);
        }
        else if (move < 3.5) { pitch += sin(b + km * 2.2 - far * 0.3) * 0.18; yaw = k * 0.08; }   // ripple along each bar
        else if (move < 4.5) { float a = b * 0.75 + (km + 1.0) * 0.9 + far * 0.25; yaw = side * cos(a) * 0.38 + (side == 0.0 ? cos(a) * 0.38 : 0.0); pitch += sin(a) * 0.16; }
        else if (move < 5.5) pitch += (mod(far, 2.0) * 2.0 - 1.0) * sin(b) * 0.18;               // split
        else if (move < 6.5) yaw = sin(b * 0.5 - far * 0.08 * side) * 0.6;                       // sweep: all left and right together
        else if (move < 7.5) yaw = side * (0.5 + 0.5 * sin(b * 0.5)) * 0.65;                     // mirror sweep: out from the middle and back
        else if (move < 8.5) { pitch += sin(b * 0.5) * 0.1; }                                     // odd/even heads (see headGate)
        else { yaw = side * 0.15; }                                                               // odd/even bars (see headGate)
        // (between about 15 degrees above level and just under it: always out over the crowd, never at the sky)
        pitch = clamp(pitch, 1.15, 1.62);
        return vec3(sin(yaw), cos(yaw) * cos(pitch), cos(yaw) * sin(pitch));
    }
    // odd and even heads (move 8), or odd and even bars (move 9), switching on the beat
    float headGate(float id, float k, float beat) {
        float move = barMove(beat);
        float cell = floor((k + 1.0) * 2.0 + 0.5);
        float on = 1.0;
        if (move > 7.5 && move < 8.5) on = mod(cell + floor(beat), 2.0);
        else if (move > 8.5) on = mod(abs(id - uMid) + floor(beat), 2.0);
        return on;
    }
    // colour by head along the bar (in the fan, the ripple and the tornado) rather than by bar
    float headColour(float id, float k, float beat) {
        float move = barMove(beat);
        float cell = floor((k + 1.0) * 2.0 + 0.5);
        bool byHead = (move > 0.5 && move < 1.5) || (move > 2.5 && move < 4.5) || (move > 7.5 && move < 8.5);
        return mod((byHead ? cell : abs(id - uMid)) + floor(beat), 2.0);
    }`;
function TiltBars({ bars, look }) {
    const barLevel = useRef(0);
    const opts = useMemo(() => ({
        length: 38, r0: 0.08, r1: 0.16, fan: TILT_BAR.cells, span: (TILT_BAR.cells - 1) * TILT_BAR.pitch,
        dirCode: /* glsl */ `
            d = headAim(id, k, uBeat);
            parity = headColour(id, k, uBeat);
            // the chase: a run of light out from the middle of the stage to both ends, twice a bar
            float run = fract(abs(aOrigin.x) / 12.0 - uBeat * 0.5);
            gate = mix(1.0, smoothstep(0.3, 0.0, abs(run - 0.5) - 0.1) * 0.9 + 0.1, uChase) * headGate(id, k, uBeat);`,
        head: TILT_GLSL,
    }), []);
    const beams = useBeams(bars, opts, (u, clock) => {
        const l = look.current;
        u.uBeat.value = beatOf(l, clock);
        u.uChase.value += (((l.crowd ?? 0) >= 0.9 ? 0 : 0.8) - u.uChase.value) * 0.05;
        u.uColorA.value.set(l.colorA ?? '#19d9ff');
        u.uColorB.value.set(l.colorB ?? '#ff3df2');
        // only the colour: no white anywhere, and each rod faint enough that where rods cross they stay their colour
        u.uWhite.value = 0;
        u.uHot.value = 0;
        u.uMid.value = (bars.length - 1) / 2;
        // only in the peaks (not on every drop, not all the time); they fade in and out over a second or two
        barLevel.current += ((barsPlay(l) ? (l.floor ?? 0) * masterOf(l) * 1.15 : 0) - barLevel.current) * 0.04;
        return barLevel.current;
    });
    // the bars themselves: fixed, end to end (the heads move, the bar doesn't)
    const geometry = useMemo(() => {
        const one = new THREE.BoxGeometry(TILT_BAR.length - 0.03, 0.2, 0.3).translate(0, -0.1, 0);
        return mergeGeometries(bars.map((b) => one.clone().translate(...b.pos)));
    }, [bars]);
    const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#15171c', roughness: 0.6, metalness: 0.4 }), []);
    useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
    return (
        <>
            {beams}
            <mesh geometry={geometry} material={material} />
        </>
    );
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
// down, a wave widening from the middle out to both walls; and from the indoor arena's photos: one picture of fire
// across every tile, the tiles sloping into a valley; a mosaic of a colour per tile, the ceiling in steps; the tiles dark
// and in steps while the beams below do the work.
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
    uniform float uLine; uniform float uWiden; uniform float uDrops; uniform float uStairs;
    float hashT(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float shapeAt(vec2 q) {
        float wave = sin((q.y - uCentre.y) * 0.32 - uBeat * 0.39);                  // rolls from the stage back, 16 beats
        float ripple = sin(length(q - uCentre) * 0.45 - uBeat * 0.785);             // rings from the middle, 8 beats
        float funnel = clamp(abs(q.x) / 15.0, 0.0, 1.0) * 2.0 - 1.0;                  // a valley down the middle of the room
        float dome = 1.0 - 2.0 * pow(clamp(length(q - uCentre) / 19.0, 0.0, 1.0), 2.0);
        // one line of tiles comes down, the line travelling from the stage to the back of the room like a wave (2 bars)
        float lineZ = mix(uSpan.x - 3.0, uSpan.y + 3.0, fract(uBeat / 16.0));
        float line = -2.2 * exp(-pow((q.y - lineZ) / 2.0, 2.0));
        // a wave across the room that starts in the middle and widens out to both walls (4 bars), then starts again
        float reach = fract(uBeat / 32.0) * 30.0;
        float widen = sin(abs(q.x) * 0.55 - uBeat * 0.785) * smoothstep(reach, reach - 4.0, abs(q.x));
        // steps: the columns of tiles at stepped heights, rising from the middle out to the walls (each tile level)
        float stairs = floor(abs(q.x) / 4.9 + 0.5) / 5.0 * 2.0 - 1.0;
        return uAmp * (uWave * wave + uRipple * ripple + uFunnel * funnel + uDome * dome + uWiden * widen + uStairs * stairs) + uLine * line + uOffset;
    }
    // moves of each tile as a whole (the tile stays flat): the chessboard, and random tiles dropping straight down
    float chess() {
        float board = uChess * 0.9 * (mod(aIdx.x + aIdx.y, 2.0) * 2.0 - 1.0) * cos(uBeat * 0.785);
        // a new random set of tiles each 2 beats drops 2.4 m and comes back up
        float f = fract(uBeat / 8.0);
        float picked = step(0.8, hashT(aIdx + floor(uBeat / 8.0) * 1.37));
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
    // (from the indoor arena's photos) one picture of fire across every tile, the tiles sloping down into a valley
    fire: { wave: 0, ripple: 0, funnel: 0.6, dome: 0, chess: 0, amp: 0.7, offset: 0, ring: 0, mono: 0, stars: 0, tunnel: 0, checks: 0, fire: 1 },
    // every tile its own colour, the ceiling in steps rising out to the walls
    mosaic: { wave: 0, ripple: 0, funnel: 0, dome: 0, chess: 0, stairs: 1, amp: 0.8, offset: 0, ring: 0, mono: 0, stars: 0, tunnel: 0, checks: 0, mosaic: 1 },
    // the tiles dark and in steps, the beams in the haze below them doing the work
    dark: { wave: 0, ripple: 0, funnel: 0, dome: 0, chess: 0, stairs: 1, amp: 0.9, offset: 0.2, ring: 0, mono: 0, stars: 0, tunnel: 0, checks: 0, dark: 1 },
    // steps, in the show's colours
    stairs: { wave: 0, ripple: 0, funnel: 0, dome: 0, chess: 0, stairs: 1, amp: 0.9, offset: 0, ring: 0.6, mono: 0, stars: 0, tunnel: 0, checks: 0 },
};
// the moves a groove and a peak take turns with, one every 8 bars (32 beats)
const SKY_TURNS = {
    // (still between moves: the ceiling moving is a moment, not all the time)
    groove: ['still', 'groove', 'still', 'mosaic', 'still', 'line', 'still', 'stairs'],
    peak: ['still', 'peak', 'still', 'fire', 'still', 'widen', 'still', 'drops'],
};
/** Which of SKY_MODES the look asks for: by the song's part, or (the test page's looks) by the crowd's energy. */
export function skyModeOf(l) {
    // (the drop only flashes the tiles white: the ceiling doesn't jump into a new shape on every drop)
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
            uLine: { value: 0 }, uWiden: { value: 0 }, uDrops: { value: 0 }, uStairs: { value: 0 }, uFire: { value: 0 }, uMosaic: { value: 0 }, uDark: { value: 0 },
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
                uniform float uStars; uniform float uTunnel; uniform float uChecks; uniform float uFire; uniform float uMosaic; uniform float uDark;
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
                    // fire: one picture of flames across the whole ceiling, in the show's first colour
                    float flame = noise(vec2(vW.x * 0.18, vW.z * 0.12 + uBeat * 0.35)) * noise(vec2(vW.x * 0.45 - uBeat * 0.2, vW.z * 0.3 + uBeat * 0.6));
                    vec3 fire = mix(uColorA * 0.6, mix(uColorA, vec3(1.0, 0.85, 0.5), 0.5), smoothstep(0.25, 0.7, flame)) * (0.2 + 1.8 * flame);
                    lamp = mix(lamp, fire * uLevel * 1.6, uFire);
                    // mosaic: every tile its own colour, a new set each bar
                    vec3 tint = 0.55 + 0.45 * cos(6.2832 * (hash(vIdx + floor(uBeat / 4.0)) + vec3(0.0, 0.33, 0.67)));
                    lamp = mix(lamp, tint * (0.6 + 0.6 * beat) * uLevel * 1.4, uMosaic);
                    // dark: the tiles off, the beams in the haze below doing the work
                    lamp *= 1.0 - 0.95 * uDark;
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
    const sched = useRef({ name: null, since: 0, settled: true });
    useEffect(() => () => { for (const p of [tiles, frames, cables]) { p.g.dispose(); p.material.dispose(); } }, [tiles, frames, cables]);
    useFrame(({ clock }, delta) => {
        if (!group.current) return;
        const l = look.current;
        const u = group.current.children[0].material.uniforms;
        // a move holds until it is done: a new one starts only after the last has settled and played at least 24 s
        const now = clock.elapsedTime;
        const st = sched.current;
        const wanted = skyModeOf(l);
        if (st.name === null || (wanted !== st.name && st.settled && now - st.since >= 24)) { st.name = wanted; st.since = now; st.settled = false; }
        const mode = SKY_MODES[st.name];
        // the winches move slowly: about 7 s to reach a new shape
        const k = 1 - Math.exp(-Math.min(delta, 0.1) * 0.45);
        let gap = 0;
        const ease = (key, to) => { gap = Math.max(gap, Math.abs(to - u[key].value)); u[key].value += (to - u[key].value) * k; };
        u.uBeat.value = beatOf(l, clock.elapsedTime);
        ease('uWave', mode.wave); ease('uRipple', mode.ripple); ease('uFunnel', mode.funnel); ease('uDome', mode.dome); ease('uChess', mode.chess);
        ease('uLine', mode.line ?? 0); ease('uWiden', mode.widen ?? 0); ease('uDrops', mode.drops ?? 0); ease('uStairs', mode.stairs ?? 0);
        ease('uFire', mode.fire ?? 0); ease('uMosaic', mode.mosaic ?? 0); ease('uDark', mode.dark ?? 0);
        ease('uAmp', mode.amp); ease('uOffset', mode.offset); ease('uRing', mode.ring); ease('uMono', mode.mono);
        ease('uStars', mode.stars); ease('uTunnel', mode.tunnel); ease('uChecks', mode.checks);
        if (gap < 0.03) st.settled = true;
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

// ---- continuous LED lines: one unbroken line of pixels, playing the show like the stage's own LED lines (./ledShow.js) --
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
            uniforms: {
                uBeat: { value: 0 }, uLevel: { value: 0 }, uChase: { value: 1 }, uSparkle: { value: 0 }, uColorMix: { value: 0.5 },
                uColorA: { value: new THREE.Color() }, uColorB: { value: new THREE.Color() }, ...ledShowUniforms(),
            },
            vertexShader: /* glsl */ `
                attribute float aU; attribute float aLen; varying float vU; varying float vLen; varying vec3 vW;
                void main() { vU = aU; vLen = aLen; vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: /* glsl */ `
                ${LED_SHOW}
                uniform float uBeat; uniform float uLevel; uniform float uChase; uniform float uSparkle; uniform float uColorMix;
                uniform vec3 uColorA; uniform vec3 uColorB;
                varying float vU; varying float vLen; varying vec3 vW;
                void main() {
                    float m = vU * vLen;                                   // metres along the line
                    float pixel = smoothstep(0.5, 0.35, abs(fract(m / 0.1) - 0.5));
                    float band = step(0.5, fract(m / 16.0 - uBeat * 0.25));
                    vec3 c = mix(uColorA, uColorB, uColorMix < 0.33 ? 0.0 : uColorMix > 0.66 ? 1.0 : band);
                    float level = ledShow(vW, m, floor(m / 2.0), uChase, uSparkle, uBeat);
                    gl_FragColor = vec4(c * level * (0.6 + 0.4 * pixel) * uLevel, 1.0);
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
        u.uChase.value = l.pixelChase ?? 1;
        u.uSparkle.value = l.pixelSparkle ?? 0;
        u.uColorMix.value = l.pixelColor ?? 0.5;
        driveLedShow(u, l, u.uBeat.value);
        // (the side chasers: the lines along the walls are the side lines)
        const far = Math.max(...lines.flatMap((ln) => [Math.abs(ln.from[0]), Math.abs(ln.to[0])]));
        u.uSideX.value = far * 0.85;
        u.uZRange.value = { x: Math.min(...lines.map((ln) => Math.min(ln.from[2], ln.to[2]))), y: Math.max(...lines.map((ln) => Math.max(ln.from[2], ln.to[2]))) };
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
