'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createBeamGeometry, createBeamMaterial, createGlowMaterial, createRigUniforms } from './beamShader';
import { rigLayout } from './rigLayout';

/**
 * Every beam in the show: one draw call for the cones, one for the lens glows.
 * `look` is a ref to { sweep, converge, intensity, speed, haze, colorA, colorB } that the show,
 * the lighting desk or the song can change at any time. Values are eased toward it each frame,
 * without re-rendering React.
 */
export default function Beams({ count, look }) {
    const fixtures = useMemo(() => rigLayout(count), [count]);
    const uniforms = useMemo(() => createRigUniforms(), []);
    const beamMaterial = useMemo(() => createBeamMaterial(uniforms), [uniforms]);
    const glowMaterial = useMemo(() => createGlowMaterial(uniforms), [uniforms]);

    const beamGeometry = useMemo(() => {
        const g = createBeamGeometry();
        g.setAttribute('aBase', new THREE.InstancedBufferAttribute(new Float32Array(fixtures.flatMap((f) => [f.pan, f.tilt])), 2));
        g.setAttribute('aPhase', new THREE.InstancedBufferAttribute(new Float32Array(fixtures.map((f) => f.phase)), 1));
        g.setAttribute('aColorMix', new THREE.InstancedBufferAttribute(new Float32Array(fixtures.map((f) => f.colorMix)), 1));
        return g;
    }, [fixtures]);

    const glowGeometry = useMemo(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(fixtures.flatMap((f) => f.position)), 3));
        g.setAttribute('aColorMix', new THREE.BufferAttribute(new Float32Array(fixtures.map((f) => f.colorMix)), 1));
        return g;
    }, [fixtures]);

    const beams = useRef();
    useLayoutEffect(() => {
        const m = new THREE.Matrix4();
        fixtures.forEach((f, i) => beams.current.setMatrixAt(i, m.makeTranslation(...f.position)));
        beams.current.instanceMatrix.needsUpdate = true;
    }, [fixtures]);

    // Dispose GPU buffers when the rig changes size or unmounts
    useLayoutEffect(() => () => beamGeometry.dispose(), [beamGeometry]);
    useLayoutEffect(() => () => glowGeometry.dispose(), [glowGeometry]);

    // Target colours, parsed only when the colour strings change
    const colors = useRef({ a: null, b: null, ta: new THREE.Color(), tb: new THREE.Color() });

    // Animate by mutating the material through the mesh ref (the R3F way): React never re-renders
    useFrame((_, delta) => {
        if (!beams.current) return;
        const u = beams.current.material.uniforms; // shared with the glow points
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
        u.uIntensity.value += (target.intensity - u.uIntensity.value) * ease;
        u.uSpeed.value += (target.speed - u.uSpeed.value) * ease;
        u.uHaze.value += (target.haze - u.uHaze.value) * ease;
        u.uColorA.value.lerp(colors.current.ta, ease);
        u.uColorB.value.lerp(colors.current.tb, ease);
    });

    return (
        <group>
            <instancedMesh ref={beams} args={[beamGeometry, beamMaterial, fixtures.length]} frustumCulled={false} />
            <points geometry={glowGeometry} material={glowMaterial} frustumCulled={false} />
        </group>
    );
}
