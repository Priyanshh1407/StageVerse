'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// The venue entrance, where the homepage starts: a monumental gate (two concrete pillars, a
// rounded arch with layered steel frames, a neon STAGEVERSE sign on the lintel) set in long
// concrete walls with slanted buttress fins. Lit like a night shot: floods uplighting the
// pillars, coloured light pouring out of the doorway, the sign's glow. The camera starts low on
// the wet road outside and walks through the arch into the arena.
export const GATE = {
    z: 34,                   // centre of the wall line
    depth: 1.5,
    pillar: { x: 8.6, w: 3.4, h: 17, d: 3.4 },
    arch: { w: 9.5, h: 10, r: 2.4 },
    lintel: { y: 12.6, h: 4.6, d: 1.6 },
    wall: { h: 8, to: 48 },
};

/** A U-shaped outline: an outer rectangle with a round-topped opening cut up from the bottom edge. */
function archShape(outerW, outerH, openW, openH, r, outerR = 0) {
    const s = new THREE.Shape();
    const W = outerW / 2;
    const w = openW / 2;
    s.moveTo(-W, 0);
    if (outerR > 0) {
        s.lineTo(-W, outerH - outerR);
        s.absarc(-W + outerR, outerH - outerR, outerR, Math.PI, Math.PI / 2, true);
        s.lineTo(W - outerR, outerH);
        s.absarc(W - outerR, outerH - outerR, outerR, Math.PI / 2, 0, true);
    } else {
        s.lineTo(-W, outerH);
        s.lineTo(W, outerH);
    }
    s.lineTo(W, 0);
    s.lineTo(w, 0);
    s.lineTo(w, openH - r);
    s.absarc(w - r, openH - r, r, 0, Math.PI / 2, false);
    s.lineTo(-w + r, openH);
    s.absarc(-w + r, openH - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(-w, 0);
    s.closePath();
    return s;
}

const box = (w, h, d, x, y, z, rotX = 0) => {
    const g = new THREE.BoxGeometry(w, h, d);
    if (rotX) g.rotateX(rotX);
    g.translate(x, y, z);
    return g;
};
const nonIndexed = (g) => (g.index ? g.toNonIndexed() : g);
const onlyBasics = (g) => {
    const n = nonIndexed(g);
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
    return n;
};

/** Every concrete surface in one geometry (one draw call): walls, fins, pillars, arch wall, lintel. */
function createConcrete() {
    const { z, depth, pillar, arch, lintel, wall } = GATE;
    const parts = [];
    const innerX = pillar.x - pillar.w / 2;
    // Long walls either side of the gate, with slanted buttress fins along their faces
    for (const side of [-1, 1]) {
        const from = pillar.x + pillar.w / 2;
        const len = wall.to - from;
        parts.push(box(len, wall.h, depth, side * (from + len / 2), wall.h / 2, z));
        for (let x = from + 4; x < wall.to; x += 6.5) {
            parts.push(box(0.7, wall.h * 0.92, 2.2, side * x, wall.h * 0.42, z + depth / 2 + 0.7, -0.32));
        }
    }
    // Pillars
    for (const side of [-1, 1]) parts.push(box(pillar.w, pillar.h, pillar.d, side * pillar.x, pillar.h / 2, z + 0.3));
    // The wall between the pillars, with the arched opening
    const archWall = new THREE.ExtrudeGeometry(archShape(innerX * 2, lintel.y, arch.w + 1.6, arch.h + 0.8, arch.r + 0.8), { depth, bevelEnabled: false });
    archWall.translate(0, 0, z - depth / 2);
    parts.push(archWall);
    // Lintel carrying the sign
    parts.push(box(pillar.x * 2 + pillar.w, lintel.h, lintel.d, 0, lintel.y + lintel.h / 2, z + 0.5));
    const merged = mergeGeometries(parts.map(onlyBasics));
    parts.forEach((p) => p.dispose());
    return merged;
}

/** The layered steel frames lining the arch (a short tunnel you walk through). */
function createFrames() {
    const { z, depth, arch } = GATE;
    const outer = new THREE.ExtrudeGeometry(archShape(arch.w + 1.6, arch.h + 0.8, arch.w + 0.5, arch.h + 0.25, arch.r + 0.25, arch.r + 0.8), { depth: 0.6, bevelEnabled: false });
    outer.translate(0, 0, z + depth / 2);
    const inner = new THREE.ExtrudeGeometry(archShape(arch.w + 0.5, arch.h + 0.25, arch.w, arch.h, arch.r, arch.r + 0.25), { depth: 2.6, bevelEnabled: false });
    inner.translate(0, 0, z - depth / 2 - 1.1);
    const merged = mergeGeometries([outer, inner].map(onlyBasics));
    outer.dispose();
    inner.dispose();
    return merged;
}

// Shared lighting for the gate's surfaces: floods at the pillar feet, the doorway's glow, the sign
const GATE_LIGHTS = /* glsl */ `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uHouse;
    uniform float uLight;
    vec3 pointLight(vec3 p, vec3 n, vec3 lp, vec3 color, float range) {
        vec3 l = lp - p;
        float d = max(length(l), 1e-3);
        return color * max(0.0, dot(n, l / d)) / (1.0 + d * d / (range * range));
    }
    vec3 gateLight(vec3 p, vec3 n) {
        vec3 light = vec3(0.0);
        // Cool-white floods at the foot of each pillar, aimed up its face
        light += pointLight(p, n, vec3(-${GATE.pillar.x.toFixed(1)}, 0.4, 37.6), vec3(0.75, 0.82, 1.0) * 3.4, 3.6);
        light += pointLight(p, n, vec3(${GATE.pillar.x.toFixed(1)}, 0.4, 37.6), vec3(0.75, 0.82, 1.0) * 3.4, 3.6);
        // Light pouring out of the doorway: the show's colours, warm when the house lights are up
        vec3 door = mix(mix(uColorA, uColorB, 0.5) * (0.4 + 0.6 * uLight), vec3(1.0, 0.7, 0.35), uHouse * 0.5);
        light += pointLight(p, n, vec3(0.0, 4.0, 36.0), door * 1.6, 6.0);
        // The neon sign's spill
        light += pointLight(p, n, vec3(-3.5, 14.9, 37.0), vec3(0.1, 0.85, 1.0) * 0.9, 4.0);
        light += pointLight(p, n, vec3(3.5, 14.9, 37.0), vec3(0.75, 0.24, 1.0) * 0.9, 4.0);
        // A little skylight so nothing is pure black
        light += vec3(0.03, 0.04, 0.08) * (0.4 + 0.6 * max(0.0, n.y));
        return light;
    }
`;

const SURFACE_VERTEX = /* glsl */ `
    varying vec3 vWorld;
    varying vec3 vNormalW;
    void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
    }
`;
const gateUniforms = () => ({ uColorA: { value: new THREE.Color('#19d9ff') }, uColorB: { value: new THREE.Color('#a855f7') }, uHouse: { value: 1 }, uLight: { value: 0.5 } });

function createConcreteMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: gateUniforms(),
        vertexShader: SURFACE_VERTEX,
        fragmentShader: /* glsl */ `
            ${GATE_LIGHTS}
            varying vec3 vWorld;
            varying vec3 vNormalW;
            float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            void main() {
                vec3 n = normalize(vNormalW);
                // Cast concrete: big panels with seams, stains running down, fine grain
                vec2 uv = abs(n.z) > 0.5 ? vWorld.xy : vec2(vWorld.z, vWorld.y);
                vec2 cell = fract(uv / vec2(3.2, 2.6));
                float seam = smoothstep(0.985, 1.0, max(abs(cell.x - 0.5), abs(cell.y - 0.5)) * 2.0);
                float stain = hash(vec2(floor(uv.x * 2.0), 3.0)) * smoothstep(0.0, 8.0, uv.y) * 0.25;
                float grain = hash(floor(uv * 24.0)) * 0.08;
                vec3 albedo = vec3(0.11, 0.115, 0.13) * (1.0 - seam * 0.6 - stain + grain);
                vec3 view = normalize(cameraPosition - vWorld);
                float sheen = pow(clamp(1.0 - dot(n, view), 0.0, 1.0), 4.0) * 0.06; // wet sheen on edges
                gl_FragColor = vec4(albedo * gateLight(vWorld, n) + sheen, 1.0);
            }
        `,
    });
}

function createSteelMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: gateUniforms(),
        vertexShader: SURFACE_VERTEX,
        fragmentShader: /* glsl */ `
            ${GATE_LIGHTS}
            varying vec3 vWorld;
            varying vec3 vNormalW;
            void main() {
                vec3 n = normalize(vNormalW);
                vec3 view = normalize(cameraPosition - vWorld);
                // Dark brushed steel: strong edge reflections of the doorway's light
                float edge = pow(clamp(1.0 - abs(dot(n, view)), 0.0, 1.0), 3.0);
                vec3 door = mix(uColorA, uColorB, smoothstep(-4.0, 4.0, vWorld.x));
                vec3 col = vec3(0.1, 0.11, 0.14) * gateLight(vWorld, n) * 1.4 + door * edge * 0.35 * (0.5 + 0.5 * uLight);
                gl_FragColor = vec4(col, 1.0);
            }
        `,
    });
}

/** The neon sign: outline letters, STAGE in cyan and VERSE in magenta, with a doubled offset edge. */
function createSignTexture(font) {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const family = `${font ? `${font}, ` : ''}system-ui, sans-serif`;
    ctx.font = `900 300px ${family}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    const parts = [['STAGE', '#3fe6ff'], ['VERSE', '#d24dff']];
    const widths = parts.map(([t]) => ctx.measureText(t).width);
    const total = widths[0] + widths[1];
    const scale = Math.min(1, (canvas.width * 0.92) / total);
    ctx.font = `900 ${Math.floor(300 * scale)}px ${family}`;
    let x = (canvas.width - total * scale) / 2;
    const y = canvas.height / 2;
    parts.forEach(([text, color], i) => {
        // Offset second outline (the sign's depth), then glow, then the tube, then its hot core
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 5;
        ctx.strokeText(text, x + 10, y + 14);
        ctx.globalAlpha = 1;
        ctx.shadowColor = color;
        ctx.shadowBlur = 48;
        ctx.lineWidth = 12;
        ctx.strokeText(text, x, y);
        ctx.shadowBlur = 16;
        ctx.lineWidth = 6;
        ctx.strokeText(text, x, y);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeText(text, x, y);
        x += widths[i] * scale;
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
}

/** Follow the show: the doorway's light takes the rig's colours; house light warms it. */
function lightGate(materials, target) {
    for (const m of materials) {
        const u = m.uniforms;
        u.uColorA.value.set(target.colorA);
        u.uColorB.value.set(target.colorB);
        u.uHouse.value = target.house ?? 0;
        u.uLight.value = (target.master ?? 1) * Math.min(target.intensity, 1.4);
    }
}

/** Make the sign's tubes brighter than white, so bloom catches them. */
function signMaterialFor(texture) {
    const m = new THREE.MeshBasicMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    m.color.setScalar(1.8);
    return m;
}

export default function Venue({ look, font }) {
    const concrete = useMemo(() => createConcrete(), []);
    const frames = useMemo(() => createFrames(), []);
    const concreteMaterial = useMemo(() => createConcreteMaterial(), []);
    const steelMaterial = useMemo(() => createSteelMaterial(), []);
    const sign = useMemo(() => createSignTexture(font), [font]);
    const signMaterial = useMemo(() => signMaterialFor(sign), [sign]);
    useEffect(() => () => {
        concrete.dispose();
        frames.dispose();
        concreteMaterial.dispose();
        steelMaterial.dispose();
    }, [concrete, frames, concreteMaterial, steelMaterial]);
    useEffect(() => () => {
        sign.dispose();
        signMaterial.dispose();
    }, [sign, signMaterial]);

    const group = useRef();
    useFrame(() => {
        if (group.current) lightGate([concreteMaterial, steelMaterial], look.current);
    });

    const { z, lintel, pillar } = GATE;
    // The pillars stand proud of the lintel, so the sign fits in the gap between them
    const signWidth = (pillar.x - pillar.w / 2) * 2 * 0.94;
    return (
        <group ref={group}>
            <mesh geometry={concrete} material={concreteMaterial} />
            <mesh geometry={frames} material={steelMaterial} />
            {/* Neon sign on the lintel's face */}
            <mesh position={[0, lintel.y + lintel.h / 2, z + 0.5 + lintel.d / 2 + 0.02]} material={signMaterial}>
                <planeGeometry args={[signWidth, signWidth / 4]} />
            </mesh>
        </group>
    );
}
