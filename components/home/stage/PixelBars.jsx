'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ROWS } from './trussGeometry';

// LED pixel bars along the front of every truss row, on the top and bottom chords: thin strips of
// LED pixels that glow and chase in the show's two colours, so the trusses are part of the show
// instead of dark steel. A fixture type of their own (look.pixel, "LED bars" on the lighting desk).
// Eight bars, one instanced draw call; the chase is
// computed per pixel in the shader, so they cost nothing per frame on the CPU.
const SPAN = 31.2;          // the full width of a truss row (tower to tower)
const PIXELS = 160;         // LED pixels along each bar
const HALF = 0.225;         // truss half-section
const BARS = ROWS.flatMap((row, i) => [
    { y: row.y + HALF - 0.02, z: row.z + HALF + 0.04, phase: i * 2 },
    { y: row.y - HALF + 0.02, z: row.z + HALF + 0.04, phase: i * 2 + 1 },
]);

function createBarMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uColorA: { value: new THREE.Color('#19d9ff') },
            uColorB: { value: new THREE.Color('#ff3df2') },
            uLevel: { value: 0 },
            uSpeed: { value: 1 },
            uPulse: { value: 0 },
            // Patterns (see look.js): colour 0 = A, 1 = B, 0.5 = both; chase; sparkle; alternate trusses
            uColorMode: { value: 0.5 },
            uChase: { value: 1 },
            uSparkle: { value: 0 },
            uAlt: { value: 0 },
        },
        vertexShader: /* glsl */ `
            attribute float aPhase;
            varying float vX;
            varying float vPhase;
            void main() {
                vX = position.x / ${SPAN.toFixed(1)} + 0.5;    // 0..1 along the bar
                vPhase = aPhase;
                gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform vec3 uColorA;
            uniform vec3 uColorB;
            uniform float uLevel;
            uniform float uSpeed;
            uniform float uPulse;
            uniform float uColorMode;
            uniform float uChase;
            uniform float uSparkle;
            uniform float uAlt;
            varying float vX;
            varying float vPhase;
            void main() {
                // Snap to the LED pixels, with dark gaps between them
                float px = floor(vX * ${PIXELS.toFixed(1)}) / ${PIXELS.toFixed(1)};
                float lit = step(fract(vX * ${PIXELS.toFixed(1)}), 0.78);
                // A soft chase running along the bar (each bar offset, so they don't move in lockstep)
                // and the two show colours in long bands drifting the other way
                float t = uTime * (0.6 + 0.6 * uSpeed);
                float row = floor(vPhase / 2.0);                 // which truss (two bars each)
                float chase = 0.5 + 0.5 * sin(px * 22.0 - t * 2.4 + vPhase * 1.7);
                float band = smoothstep(0.35, 0.65, 0.5 + 0.5 * sin(px * 7.0 + t * 0.8 + vPhase));
                // Colour: one colour (A or B), both in drifting bands, or trusses alternating
                float both = 1.0 - abs(uColorMode * 2.0 - 1.0);
                vec3 color = mix(mix(uColorA, uColorB, uColorMode), mix(uColorA, uColorB, band), both);
                color = mix(color, mix(uColorA, uColorB, mod(row, 2.0)), uAlt);
                // Brightness: steady, or a chase; sparkle flashes random pixels a few times a second
                float brightness = mix(1.0, 0.25 + 0.75 * chase * chase, uChase);
                float flash = step(0.78, fract(sin(dot(vec2(px * 157.0 + row * 31.0, floor(uTime * 6.0)), vec2(12.9898, 78.233))) * 43758.5453));
                brightness = mix(brightness, brightness * 0.15 + flash * 1.4, uSparkle);
                brightness *= uLevel * (1.0 + uPulse * 0.6);
                vec3 body = vec3(0.025, 0.027, 0.035);           // the bar's housing when it's dark
                gl_FragColor = vec4(body + color * brightness * lit * 1.8, 1.0);
            }
        `,
        toneMapped: false,
    });
}

export default function PixelBars({ look }) {
    const mesh = useRef();
    const geometry = useMemo(() => {
        const g = new THREE.BoxGeometry(SPAN, 0.07, 0.05);
        g.setAttribute('aPhase', new THREE.InstancedBufferAttribute(new Float32Array(BARS.map((b) => b.phase)), 1));
        return g;
    }, []);
    const material = useMemo(() => createBarMaterial(), []);
    useEffect(() => () => {
        geometry.dispose();
        material.dispose();
    }, [geometry, material]);

    useEffect(() => {
        if (!mesh.current) return;
        const m = new THREE.Matrix4();
        BARS.forEach((b, i) => mesh.current.setMatrixAt(i, m.makeTranslation(0, b.y, b.z)));
        mesh.current.instanceMatrix.needsUpdate = true;
    }, []);

    const colors = useRef({ a: null, b: null, ta: new THREE.Color(), tb: new THREE.Color() });
    useFrame((_, delta) => {
        if (!mesh.current) return;
        const target = look.current;
        const u = mesh.current.material.uniforms;
        const ease = 1 - Math.exp(-Math.min(delta, 0.1) * 4);
        if (target.colorA !== colors.current.a) { colors.current.a = target.colorA; colors.current.ta.set(target.colorA); }
        if (target.colorB !== colors.current.b) { colors.current.b = target.colorB; colors.current.tb.set(target.colorB); }
        // Their own level (look.pixel), with the master and intensity; dark on a blackout
        const level = (target.master ?? 1) * Math.min(target.intensity ?? 1, 1.4) * (target.pixel ?? 1);
        u.uTime.value += delta;
        u.uColorA.value.lerp(colors.current.ta, ease);
        u.uColorB.value.lerp(colors.current.tb, ease);
        u.uLevel.value += (level - u.uLevel.value) * ease;
        u.uSpeed.value = target.speed ?? 1;
        u.uPulse.value = target.pulse ?? 0;
        // Patterns glide from one to the next with the cue's fade
        u.uColorMode.value += ((target.pixelColor ?? 0.5) - u.uColorMode.value) * ease;
        u.uChase.value += ((target.pixelChase ?? 1) - u.uChase.value) * ease;
        u.uSparkle.value += ((target.pixelSparkle ?? 0) - u.uSparkle.value) * ease;
        u.uAlt.value += ((target.pixelAlt ?? 0) - u.uAlt.value) * ease;
    });

    return <instancedMesh ref={mesh} args={[geometry, material, BARS.length]} frustumCulled={false} />;
}
