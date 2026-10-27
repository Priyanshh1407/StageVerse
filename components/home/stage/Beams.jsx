'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
    createBeamGeometry, createBeamMaterial, createGlowMaterial, createHeadGeometry,
    createHeadMaterial, createRigUniforms,
} from './beamShader';
import { rigLayout } from './rigLayout';

// Per-fixture attributes shared by the beams and the heads (read by the aiming shader code)
function withFixtureAttributes(geometry, fixtures) {
    geometry.setAttribute('aBase', new THREE.InstancedBufferAttribute(new Float32Array(fixtures.flatMap((f) => [f.pan, f.tilt])), 2));
    geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(new Float32Array(fixtures.map((f) => f.phase)), 1));
    geometry.setAttribute('aColorMix', new THREE.InstancedBufferAttribute(new Float32Array(fixtures.map((f) => f.colorMix)), 1));
    return geometry;
}

// Where each fixture's mounting clamp/base sits relative to its head
function baseOffset(f) {
    if (f.group === 'floor') return [0, -0.25, 0];                          // stands on the deck
    if (f.group === 'sideTowers') return [Math.sign(f.position[0]) * 0.45, 0, 0]; // clamped to the tower
    return [0, 0.55, 0];                                                     // hangs from the truss
}

/**
 * Every lighting fixture: beams (1 draw call), lens glows (1), moving-head housings (1)
 * and their clamps/bases (1), all sharing one set of uniforms.
 * `look` is a ref to the current look (lib/show/look.js) that the show, the lighting desk or the
 * song can change at any time. Values are eased toward it each frame, without re-rendering React;
 * beat pulses and the strobe are applied on top, unsmoothed, so they stay sharp.
 */
export default function Beams({ count, look }) {
    const fixtures = useMemo(() => rigLayout(count), [count]);
    const uniforms = useMemo(() => createRigUniforms(), []);
    const beamMaterial = useMemo(() => createBeamMaterial(uniforms), [uniforms]);
    const glowMaterial = useMemo(() => createGlowMaterial(uniforms), [uniforms]);
    const headMaterial = useMemo(() => createHeadMaterial(uniforms), [uniforms]);

    const beamGeometry = useMemo(() => withFixtureAttributes(createBeamGeometry(), fixtures), [fixtures]);
    const headGeometry = useMemo(() => withFixtureAttributes(createHeadGeometry(), fixtures), [fixtures]);

    const glowGeometry = useMemo(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(fixtures.flatMap((f) => f.position)), 3));
        g.setAttribute('aColorMix', new THREE.BufferAttribute(new Float32Array(fixtures.map((f) => f.colorMix)), 1));
        // Aim data too: a lens only flares while its beam points toward the camera
        g.setAttribute('aBase', new THREE.BufferAttribute(new Float32Array(fixtures.flatMap((f) => [f.pan, f.tilt])), 2));
        g.setAttribute('aPhase', new THREE.BufferAttribute(new Float32Array(fixtures.map((f) => f.phase)), 1));
        return g;
    }, [fixtures]);

    const beams = useRef();
    const heads = useRef();
    const bases = useRef();
    useLayoutEffect(() => {
        const m = new THREE.Matrix4();
        fixtures.forEach((f, i) => {
            m.makeTranslation(...f.position);
            beams.current.setMatrixAt(i, m);
            heads.current.setMatrixAt(i, m);
            const [ox, oy, oz] = baseOffset(f);
            bases.current.setMatrixAt(i, m.makeTranslation(f.position[0] + ox, f.position[1] + oy, f.position[2] + oz));
        });
        for (const mesh of [beams.current, heads.current, bases.current]) mesh.instanceMatrix.needsUpdate = true;
    }, [fixtures]);

    // Dispose GPU buffers when the rig changes size or unmounts
    useLayoutEffect(() => () => beamGeometry.dispose(), [beamGeometry]);
    useLayoutEffect(() => () => headGeometry.dispose(), [headGeometry]);
    useLayoutEffect(() => () => glowGeometry.dispose(), [glowGeometry]);

    // Target colours, parsed only when the colour strings change
    const colors = useRef({ a: null, b: null, ta: new THREE.Color(), tb: new THREE.Color() });
    const level = useRef(1); // eased beam brightness, before pulse and strobe

    // Animate by mutating the material through the mesh ref (the R3F way): React never re-renders
    useFrame((_, delta) => {
        if (!beams.current) return;
        const u = beams.current.material.uniforms; // shared with the glows and heads
        const target = look.current;
        const ease = 1 - Math.exp(-Math.min(delta, 0.1) * 4); // frame-rate independent smoothing
        if (target.colorA !== colors.current.a) {
            colors.current.a = target.colorA;
            colors.current.ta.set(target.colorA);
        }
        if (target.colorB !== colors.current.b) {
            colors.current.b = target.colorB;
            colors.current.tb.set(target.colorB);
        }

        u.uTime.value += delta;
        u.uSweep.value += (target.sweep - u.uSweep.value) * ease;
        u.uConverge.value += (target.converge - u.uConverge.value) * ease;
        const wanted = target.intensity * (target.master ?? 1) * (target.beams ?? 1);
        level.current += (wanted - level.current) * ease;
        const strobe = target.strobe ?? 0;
        const flash = (u.uTime.value * 12.5) % 1 < 0.3 ? 1.9 : 0.03; // ~12 flashes per second
        u.uIntensity.value = level.current * (1 + (target.pulse ?? 0) * 0.7) * (1 + (flash - 1) * strobe);
        u.uSpeed.value += (target.speed - u.uSpeed.value) * ease;
        u.uHaze.value += (target.haze - u.uHaze.value) * ease;
        u.uColorA.value.lerp(colors.current.ta, ease);
        u.uColorB.value.lerp(colors.current.tb, ease);
    });

    return (
        <group>
            <instancedMesh ref={heads} args={[headGeometry, headMaterial, fixtures.length]} frustumCulled={false} />
            <instancedMesh ref={bases} args={[undefined, undefined, fixtures.length]} frustumCulled={false}>
                <boxGeometry args={[0.55, 0.22, 0.45]} />
                <meshLambertMaterial color="#1b1e27" />
            </instancedMesh>
            <instancedMesh ref={beams} args={[beamGeometry, beamMaterial, fixtures.length]} frustumCulled={false} />
            <points geometry={glowGeometry} material={glowMaterial} frustumCulled={false} />
        </group>
    );
}
