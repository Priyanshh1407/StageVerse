'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import { driveVisuals, visualsUniforms, VISUALS_SCREEN_FRAGMENT } from './mainstageVisuals';
import { COLORS } from '@/lib/show/stages/blockoutKit';
import { screenFxFor } from '@/lib/show/stages/screenFx';
import { continuousBars } from '@/lib/show/stages/pixelLines';
import { LED_SHOW, driveLedShow, ledShowUniforms } from './ledShow';

// A festival stage's structure, LED screens and pixel bars, from its definition (lib/show/stages).
// Draw calls: one per structure colour (about six), one for every LED surface together, one for
// every pixel bar together.

const UP = new THREE.Vector3(0, 1, 0);

// ---- geometry from the layout's pieces -----------------------------------------------------------

/** A lattice truss between two points: four chords and zig-zag bracing on every face. */
function trussGeometry(from, to, size) {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const length = a.distanceTo(b);
    const half = size / 2;
    const chord = Math.max(0.035, size * 0.09);
    const parts = [];
    for (const [x, z] of [[-half, -half], [half, -half], [half, half], [-half, half]]) parts.push(new THREE.BoxGeometry(chord, length, chord).translate(x, 0, z));
    // zig-zag bracing on all four faces, one diagonal per bay
    const n = Math.max(1, Math.round(length / (size * 1.4)));
    const bay = length / n;
    const diagonal = Math.hypot(size, bay);
    const lean = Math.atan2(size, bay);
    for (let i = 0; i < n; i++) {
        const y = -length / 2 + (i + 0.5) * bay;
        const sign = i % 2 ? 1 : -1;
        for (const z of [-half, half]) parts.push(new THREE.BoxGeometry(chord * 0.7, diagonal, chord * 0.7).rotateZ(sign * lean).translate(0, y, z));
        for (const x of [-half, half]) parts.push(new THREE.BoxGeometry(chord * 0.7, diagonal, chord * 0.7).rotateX(sign * lean).translate(x, y, 0));
    }
    const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()));
    merged.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize()));
    return merged.translate(...a.clone().add(b).multiplyScalar(0.5).toArray());
}

/** One piece of the layout as a geometry in stage space (null for the ones drawn elsewhere). */
function pieceGeometry(p) {
    let g = null;
    if (p.kind === 'panel') {
        const shape = new THREE.Shape(p.outline.map(([x, y]) => new THREE.Vector2(x, y)));
        g = new THREE.ExtrudeGeometry(shape, { depth: p.depth, bevelEnabled: false }).translate(0, p.base, p.z - p.depth / 2);
    } else if (p.kind === 'box') {
        g = new THREE.BoxGeometry(...p.size);
        if (p.rotation) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...p.rotation)));
        g.translate(...p.position);
    } else if (p.kind === 'cylinder') {
        g = new THREE.CylinderGeometry(p.radius[0], p.radius[1], p.height, 10).translate(...p.position);
    } else if (p.kind === 'cone') {
        g = new THREE.ConeGeometry(p.radius, p.height, 7).translate(...p.position);
    } else if (p.kind === 'sphere') {
        g = new THREE.SphereGeometry(p.radius, 16, 10).scale(...(p.scale ?? [1, 1, 1])).translate(...p.position);
    } else if (p.kind === 'torus') {
        g = new THREE.TorusGeometry(p.radius, p.tube, 8, 48).translate(...p.position);
    } else if (p.kind === 'truss') {
        g = trussGeometry(p.from, p.to, p.size ?? 0.5);
    } else if (p.kind === 'cable' || p.kind === 'rod') {
        const a = new THREE.Vector3(...p.from);
        const b = new THREE.Vector3(...p.to);
        const [r0, r1] = p.kind === 'rod' ? p.radius : [0.04, 0.04];
        g = new THREE.CylinderGeometry(r1, r0, a.distanceTo(b), 6)
            .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize()))
            .translate(...a.clone().add(b).multiplyScalar(0.5).toArray());
    }
    if (!g) return null;
    const flat = g.index ? g.toNonIndexed() : g;
    for (const name of Object.keys(flat.attributes)) if (name !== 'position' && name !== 'normal') flat.deleteAttribute(name);
    if (!flat.attributes.normal) flat.computeVertexNormals();
    return flat;
}

// The look of each structure colour in the built stage (the layout's colours are for the blockout)
const FINISH = {
    [COLORS.deck]: { color: '#14161d' },
    [COLORS.structure]: { color: '#2a2e38' },
    [COLORS.dark]: { color: '#0b0c10' },
    [COLORS.booth]: { color: '#1c1f27' },
    [COLORS.scenery]: { color: '#06070b' },
    truss: { color: '#4c5260', emissive: '#040507' },
};
const SKIP = new Set([COLORS.person, COLORS.screen, COLORS.logo]); // people are the performer's job; screens and the logo glow

/** The stage's steel, deck and scenery, merged by finish. */
export function StageStructure({ stage }) {
    const groups = useMemo(() => {
        const byFinish = new Map();
        for (const p of stage.structure) {
            if (SKIP.has(p.color) || p.drawnBy) continue;
            const key = (p.kind === 'truss' || p.kind === 'cable') && !SKIP.has(p.color) ? 'truss' : FINISH[p.color] ? p.color : COLORS.structure;
            const g = pieceGeometry(p);
            if (g) byFinish.set(key, [...(byFinish.get(key) ?? []), g]);
        }
        return [...byFinish.entries()].map(([key, list]) => ({ key, geometry: mergeGeometries(list), finish: FINISH[key] }));
    }, [stage]);
    // scenery (palms, mountains, the ferris wheel) is a flat silhouette against the sky: no stage light on it
    return groups.map(({ key, geometry, finish }) => (
        <mesh key={key} geometry={geometry}>
            {key === COLORS.scenery
                ? <meshBasicMaterial color={finish.color} />
                : <meshLambertMaterial color={finish.color} emissive={finish.emissive ?? '#000000'} />}
        </mesh>
    ));
}

// ---- the LED screens -------------------------------------------------------------------------------

const SCREEN_VERTEX = /* glsl */ `
    varying vec3 vWorld;
    varying vec3 vNormal;
    void main() {
        vWorld = position;
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const SCREEN_FRAGMENT = /* glsl */ `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uLevel;
    uniform float uBeat;
    uniform float uPulse;
    uniform float uStrobe;
    uniform float uTime;
    uniform int uPattern;
    uniform vec3 uMin;
    uniform vec3 uMax;
    uniform float uPitch;
    varying vec3 vWorld;
    varying vec3 vNormal;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    void main() {
        // only the faces towards the crowd are screens; the backs and edges are dark frames
        float front = smoothstep(0.4, 0.7, vNormal.z);
        vec2 cell = floor(vWorld.xy / uPitch);
        vec2 inCell = fract(vWorld.xy / uPitch);
        // the LED pixel grid: a soft dot in every cell
        float led = smoothstep(0.5, 0.18, length(inCell - 0.5));
        vec3 span = max(uMax - uMin, vec3(0.001));
        float x = (vWorld.x - uMin.x) / span.x;          // 0..1 across the stage
        float y = (vWorld.y - uMin.y) / span.y;          // 0..1 up the screens
        float ax = abs(vWorld.x) / max(abs(uMin.x), abs(uMax.x));
        float beat = uBeat;
        vec3 c = mix(uColorA, uColorB, x);
        float lit = 0.0;
        if (uPattern == 0) {
            // equaliser: columns rising from the floor, each its own height, jumping on the beat
            float col = floor(vWorld.x / (uPitch * 4.0));
            float h = 0.25 + 0.6 * hash(vec2(col, floor(beat))) * (0.6 + 0.4 * uPulse);
            lit = step(y, h);
            c = mix(uColorA, uColorB, smoothstep(0.0, h, y));
        } else if (uPattern == 1) {
            // a sweep from the centre out along the fins, one beat each way
            float edge = fract(beat * 0.5) * 1.2;
            lit = smoothstep(0.18, 0.0, abs(ax - edge));
            c = mix(uColorA, uColorB, step(0.5, fract(beat * 0.25)));
        } else if (uPattern == 2) {
            // a chase up every screen, columns a little out of step, faster than the beat
            float off = hash(vec2(floor(vWorld.x / (uPitch * 6.0)), 3.0)) * 0.3;
            lit = smoothstep(0.12, 0.0, abs(fract(y - beat * 0.5 - off) - 0.5) - 0.32);
            c = mix(uColorA, uColorB, y);
        } else if (uPattern == 3) {
            // strobe frames: the whole surface flashing white
            lit = uStrobe;
            c = mix(c, vec3(1.0), 0.85);
        } else if (uPattern == 4) {
            // a slow diagonal colour wipe
            float w = fract((x + y * 0.6) * 0.8 - uTime * 0.05);
            lit = 0.55;
            c = mix(uColorA, uColorB, smoothstep(0.35, 0.65, w));
        } else {
            // sparkle: random pixels flashing, a new set twice a beat
            lit = step(0.86, hash(cell + floor(beat * 2.0)));
            c = mix(uColorA, uColorB, hash(cell));
        }
        vec3 glow = c * lit * led * uLevel * front * 2.2;
        // a faint base so the screens read as screens when dark
        vec3 base = vec3(0.015, 0.017, 0.024) * (0.4 + 0.6 * led);
        gl_FragColor = vec4(base + glow, 1.0);
    }
`;

/** Every LED surface (fins, walls, crown, side screens, strips): one draw call. */
export function StageScreens({ stage, look }) {
    // (the screens that carry the wordmark are drawn by StageLedWall instead)
    const pieces = useMemo(() => stage.screens.filter((p) => !p.ledWall).map(pieceGeometry).filter(Boolean), [stage]);
    const geometry = useMemo(() => (pieces.length ? mergeGeometries(pieces) : new THREE.BufferGeometry()), [pieces]);
    const material = useMemo(() => {
        geometry.computeBoundingBox();
        const { min, max } = geometry.boundingBox;
        // (a stage with visuals of its own plays them across all its screens as one canvas: the mainstage)
        if (stage.visuals) {
            return new THREE.ShaderMaterial({
                vertexShader: SCREEN_VERTEX,
                fragmentShader: VISUALS_SCREEN_FRAGMENT,
                toneMapped: false,
                uniforms: { ...visualsUniforms(stage.visuals.centre, stage.visuals.scale), uLevel: { value: 0 }, uPitch: { value: 0.22 } },
            });
        }
        return new THREE.ShaderMaterial({
            vertexShader: SCREEN_VERTEX,
            fragmentShader: SCREEN_FRAGMENT,
            toneMapped: false,
            uniforms: {
                uColorA: { value: new THREE.Color() }, uColorB: { value: new THREE.Color() },
                uLevel: { value: 0 }, uBeat: { value: 0 }, uPulse: { value: 0 }, uStrobe: { value: 0 }, uTime: { value: 0 },
                uPattern: { value: 4 }, uMin: { value: min.clone() }, uMax: { value: max.clone() }, uPitch: { value: stage.indoor ? 0.12 : 0.22 },
            },
        });
    }, [geometry, stage]);
    const mesh = useRef();
    const clock = useRef(0);
    useFrame((_, delta) => {
        if (!mesh.current) return;
        const target = look.current;
        const u = mesh.current.material.uniforms;
        clock.current += delta;
        u.uTime.value = clock.current;
        if (stage.visuals) driveVisuals(u, target, clock.current, stage.visuals.set);
        else {
            u.uBeat.value = target.beatPos ?? clock.current * 2;
            u.uPulse.value = target.pulse ?? 0;
            u.uStrobe.value = (target.strobe ?? 0) > 0.05 ? ((clock.current * 12.5) % 1 < 0.35 ? 1 : 0) : Math.max(0, target.blinder ?? 0);
            u.uPattern.value = screenFxFor(target);
        }
        const house = target.house ?? 0;
        u.uLevel.value += ((target.master ?? 1) * Math.min(1.3, target.intensity ?? 1) * (1 - 0.7 * house) - u.uLevel.value) * Math.min(1, delta * 6);
        u.uColorA.value.set(target.colorA);
        u.uColorB.value.set(target.colorB);
    });
    return pieces.length ? <mesh ref={mesh} geometry={geometry} material={material} /> : null;
}

// ---- pixel bars ------------------------------------------------------------------------------------

const BAR_VERTEX = /* glsl */ `
    attribute float aBar;
    varying float vAlong;
    varying float vBar;
    varying vec3 vWorld;
    void main() {
        vBar = aBar;
        vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        // metres along the line (the bars are stretched to meet their neighbours: one continuous line of pixels)
        vAlong = dot(world.xyz, normalize((modelMatrix * instanceMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz));
        gl_Position = projectionMatrix * viewMatrix * world;
    }
`;

const BAR_FRAGMENT = /* glsl */ `
    ${LED_SHOW}
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uLevel;
    uniform float uColorMix;   // look.pixelColor: 0 = colour A, 1 = colour B, 0.5 = both in bands
    uniform float uChase;
    uniform float uSparkle;
    uniform float uAlt;
    uniform float uBeat;
    uniform float uTime;
    varying float vAlong;
    varying float vBar;
    varying vec3 vWorld;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
        float pixel = floor(vAlong / 0.16);
        float led = smoothstep(0.5, 0.15, abs(fract(vAlong / 0.16) - 0.5));
        // colour: one, the other, or bands of both running round the stage
        float band = step(0.5, fract((vWorld.x + vWorld.y) * 0.08 + uTime * 0.1));
        float which = uColorMix < 0.33 ? 0.0 : uColorMix > 0.66 ? 1.0 : band;
        which = mix(which, mod(vBar, 2.0), uAlt);
        vec3 c = mix(uColorA, uColorB, which);
        // what the line plays: the show's chase, sparkle and move (lib: ./ledShow.js), the side chasers
        float level = uLevel * ledShow(vWorld, vAlong, vBar, uChase, uSparkle, uBeat) * (0.35 + 0.65 * led);
        gl_FragColor = vec4(c * level * 2.0, 1.0);
    }
`;

/** Every pixel bar on the stage, each at its own angle, stretched to meet the next bar in line with it, so each row
 *  of bars is one continuous LED line: one draw call. */
export function StagePixelBars({ stage, look }) {
    const bars = useMemo(() => continuousBars(stage.pixelBars), [stage.pixelBars]);
    const geometry = useMemo(() => {
        const g = new THREE.BoxGeometry(0.16, 1.6, 0.12);
        g.setAttribute('aBar', new THREE.InstancedBufferAttribute(new Float32Array(bars.map((_, i) => i)), 1));
        return g;
    }, [bars]);
    const material = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: BAR_VERTEX,
        fragmentShader: BAR_FRAGMENT,
        toneMapped: false,
        uniforms: {
            uColorA: { value: new THREE.Color() }, uColorB: { value: new THREE.Color() }, uLevel: { value: 0 }, uColorMix: { value: 0.5 },
            uChase: { value: 1 }, uSparkle: { value: 0 }, uAlt: { value: 0 }, uBeat: { value: 0 }, uTime: { value: 0 },
            ...ledShowUniforms(),
        },
    }), []);
    const mesh = useRef();
    const placed = useRef(null);
    const clock = useRef(0);
    useFrame((_, delta) => {
        const m = mesh.current;
        if (!m) return;
        if (placed.current !== bars) {
            const matrix = new THREE.Matrix4();
            const q = new THREE.Quaternion();
            bars.forEach((b, i) => {
                q.setFromEuler(new THREE.Euler(...(b.rot ?? [0, 0, 0])));
                m.setMatrixAt(i, matrix.compose(new THREE.Vector3(...b.pos), q, new THREE.Vector3(1, b.length / 1.6, 1)));
            });
            m.instanceMatrix.needsUpdate = true;
            placed.current = bars;
        }
        const target = look.current;
        const u = m.material.uniforms;
        clock.current += delta;
        u.uTime.value = clock.current;
        u.uBeat.value = target.beatPos ?? clock.current * 2;
        u.uLevel.value = (target.master ?? 1) * (target.pixel ?? 1) * Math.min(1.3, target.intensity ?? 1) * (1 + (target.pulse ?? 0) * 0.6);
        u.uColorMix.value = target.pixelColor ?? 0.5;
        u.uChase.value = target.pixelChase ?? 1;
        u.uSparkle.value = target.pixelSparkle ?? 0;
        u.uAlt.value = target.pixelAlt ?? 0;
        driveLedShow(u, target, u.uBeat.value);
        if (u.uSideX.value === 1e6) {
            // the side chasers' bars: those along the sides (beyond 85% of the widest), from the front to the back
            const far = Math.max(...bars.map((b) => Math.abs(b.pos[0])));
            const side = bars.filter((b) => Math.abs(b.pos[0]) >= far * 0.85);
            u.uSideX.value = far * 0.85;
            u.uZRange.value = { x: Math.min(...side.map((b) => b.pos[2])), y: Math.max(...side.map((b) => b.pos[2])) };
        }
        u.uColorA.value.set(target.colorA);
        u.uColorB.value.set(target.colorB);
    });
    return <instancedMesh ref={mesh} args={[geometry, material, bars.length]} frustumCulled={false} />;
}
