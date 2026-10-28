'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { createBeamGeometry, createBeamMaterial, createGlowMaterial, createPartMaterial, createRoleUniforms } from './fixtureShader';
import { rigLayout } from './rigLayout';

export const MOVING_HEAD_URL = '/fixtures/moving-head.glb';

// One job per group, like a real rig. `level` is the look key that switches the group on,
// colours come from the look, and each job moves in its own way.
export const ROLES = {
    aerial: { level: 'beams', colors: ['colorA', 'colorB'], sweep: 1, speed: 1, converge: 1, spread: 1, opacity: 1 },
    sides: { level: 'sides', colors: ['colorB', 'colorA'], sweep: 0.55, speed: 0.7, converge: 1, spread: 1.1, opacity: 1 },
    // On the drop the floor fixtures don't focus: they swing fully sideways
    floor: { level: 'floor', colors: ['colorA', 'colorB'], sweep: 0.8, speed: 1.3, converge: 0.8, spread: 0.9, opacity: 0.9, sideways: true },
    // Washes colour the stage: wide, soft, barely moving, never part of the drop's convergence
    wash: { level: 'wash', colors: ['washColor', 'washColor'], sweep: 0.15, speed: 0.35, converge: 0, spread: 4.5, opacity: 0.22 },
};

function withFixtureAttributes(geometry, fixtures) {
    const attr = (values, size) => new THREE.InstancedBufferAttribute(new Float32Array(values), size);
    geometry.setAttribute('aBase', attr(fixtures.flatMap((f) => [f.pan, f.tilt]), 2));
    geometry.setAttribute('aPhase', attr(fixtures.map((f) => f.phase), 1));
    geometry.setAttribute('aColorMix', attr(fixtures.map((f) => f.colorMix), 1));
    geometry.setAttribute('aUp', attr(fixtures.flatMap((f) => f.up), 3));
    geometry.setAttribute('aXAxis', attr(fixtures.flatMap((f) => f.xAxis), 3));
    geometry.setAttribute('aIndex', attr(fixtures.map((_, i) => i), 1));
    return geometry;
}

/** Lens glows are points (not instanced), so the same data goes in as plain attributes. */
function createGlowGeometry(fixtures) {
    const attr = (values, size) => new THREE.BufferAttribute(new Float32Array(values), size);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', attr(fixtures.flatMap((f) => f.position), 3));
    g.setAttribute('aBase', attr(fixtures.flatMap((f) => [f.pan, f.tilt]), 2));
    g.setAttribute('aPhase', attr(fixtures.map((f) => f.phase), 1));
    g.setAttribute('aColorMix', attr(fixtures.map((f) => f.colorMix), 1));
    g.setAttribute('aUp', attr(fixtures.flatMap((f) => f.up), 3));
    g.setAttribute('aXAxis', attr(fixtures.flatMap((f) => f.xAxis), 3));
    g.setAttribute('aIndex', attr(fixtures.map((_, i) => i), 1));
    return g;
}

/** Ease one role's uniforms toward the look; pulse and strobe applied on top, unsmoothed. */
function driveRole(u, role, target, state, delta) {
    const ease = 1 - Math.exp(-Math.min(delta, 0.1) * 4);
    const { a, b, ta, tb } = state.colors;
    const hexA = target[role.colors[0]] ?? target.colorA;
    const hexB = target[role.colors[1]] ?? target.colorB;
    if (hexA !== a.hex) { a.hex = hexA; ta.set(hexA); }
    if (hexB !== b.hex) { b.hex = hexB; tb.set(hexB); }

    u.uTime.value += delta;
    u.uSweep.value += (target.sweep * role.sweep - u.uSweep.value) * ease;
    // The drop focuses every beam on the stage centre at once (no easing: it hits on the beat)
    const drop = target.dropFx ?? 0;
    const converge = Math.max(target.converge, role.sideways ? 0 : drop) * role.converge;
    u.uConverge.value = drop > 0.5 ? converge : u.uConverge.value + (converge - u.uConverge.value) * ease;
    u.uSideways.value = role.sideways ? drop : 0;
    // Beat-locked effects: the song's beat when one is playing, otherwise 120 BPM
    state.clock += delta;
    u.uBeat.value = target.beatPos ?? state.clock * 2;
    u.uAlternate.value += ((target.alternate ?? 0) - u.uAlternate.value) * ease;
    u.uSparkle.value += ((target.sparkle ?? 0) - u.uSparkle.value) * ease;
    u.uSpeed.value += (target.speed * role.speed - u.uSpeed.value) * ease;
    // Accumulate the movement position: a speed change alters how fast it moves from where it is
    // (computing sin(time * speed) made beams leap whenever a cue changed the speed)
    state.phase += delta * u.uSpeed.value;
    u.uPhase.value = state.phase;
    u.uFan.value += ((target.fan ?? 1) - u.uFan.value) * ease;
    u.uTiltShift.value += ((target.tiltShift ?? 0) - u.uTiltShift.value) * ease;
    u.uPhaseSpread.value += ((target.phaseSpread ?? 0.25) - u.uPhaseSpread.value) * ease;
    u.uHaze.value += (target.haze - u.uHaze.value) * ease;
    u.uColorA.value.lerp(ta, ease);
    u.uColorB.value.lerp(tb, ease);

    const wanted = target.intensity * (target.master ?? 1) * (target[role.level] ?? 1);
    state.level += (wanted - state.level) * ease;
    const strobe = role === ROLES.wash ? 0 : target.strobe ?? 0; // strobing is the strobes' job; beams flicker with them
    const flash = (u.uTime.value * 12.5) % 1 < 0.3 ? 1.6 : 0.15;
    u.uIntensity.value = state.level * (1 + (target.pulse ?? 0) * 0.7) * (1 + (flash - 1) * strobe * 0.5);
}

function RoleGroup({ roleName, fixtures, parts, map, look }) {
    const role = ROLES[roleName];
    const uniforms = useMemo(() => {
        const u = createRoleUniforms({ spread: role.spread, opacity: role.opacity });
        u.uMap.value = map;
        return u;
    }, [role, map]);
    const materials = useMemo(() => ({
        base: createPartMaterial(uniforms, 'base'),
        yoke: createPartMaterial(uniforms, 'yoke'),
        head: createPartMaterial(uniforms, 'head'),
        beam: createBeamMaterial(uniforms),
        glow: createGlowMaterial(uniforms),
    }), [uniforms]);
    const geometries = useMemo(() => ({
        base: withFixtureAttributes(parts.base.clone(), fixtures),
        yoke: withFixtureAttributes(parts.yoke.clone(), fixtures),
        head: withFixtureAttributes(parts.head.clone(), fixtures),
        beam: withFixtureAttributes(createBeamGeometry(), fixtures),
        glow: createGlowGeometry(fixtures),
    }), [parts, fixtures]);
    useLayoutEffect(() => () => {
        Object.values(geometries).forEach((g) => g.dispose());
        Object.values(materials).forEach((m) => m.dispose());
    }, [geometries, materials]);

    const group = useRef();
    useLayoutEffect(() => {
        const m = new THREE.Matrix4();
        group.current.children.forEach((mesh) => {
            if (!mesh.isInstancedMesh) return;
            fixtures.forEach((f, i) => mesh.setMatrixAt(i, m.makeTranslation(...f.position)));
            mesh.instanceMatrix.needsUpdate = true;
        });
    }, [fixtures]);

    const state = useRef({ level: 1, phase: 0, clock: 0, colors: { a: {}, b: {}, ta: new THREE.Color(), tb: new THREE.Color() } });
    useFrame((_, delta) => {
        const mesh = group.current?.children[0];
        if (mesh) driveRole(mesh.material.uniforms, role, look.current, state.current, delta);
    });

    const n = fixtures.length;
    return (
        <group ref={group}>
            <instancedMesh args={[geometries.base, materials.base, n]} frustumCulled={false} />
            <instancedMesh args={[geometries.yoke, materials.yoke, n]} frustumCulled={false} />
            <instancedMesh args={[geometries.head, materials.head, n]} frustumCulled={false} />
            <instancedMesh args={[geometries.beam, materials.beam, n]} frustumCulled={false} />
            <points geometry={geometries.glow} material={materials.glow} frustumCulled={false} />
        </group>
    );
}

/**
 * Every moving head on the rig, grouped by job. Five draw calls per group (base, yoke, head,
 * beam, lens glow), whatever the fixture count.
 */
export default function Fixtures({ count, look }) {
    const { nodes, materials } = useGLTF(MOVING_HEAD_URL);
    const parts = useMemo(() => ({ base: nodes.Base_0.geometry, yoke: nodes.Support_0.geometry, head: nodes.Head_0.geometry }), [nodes]);
    const map = Object.values(materials)[0].map;
    const byRole = useMemo(() => {
        const all = rigLayout(count);
        return Object.keys(ROLES).map((r) => [r, all.filter((f) => f.role === r)]).filter(([, list]) => list.length);
    }, [count]);

    return byRole.map(([roleName, fixtures]) => (
        <RoleGroup key={`${roleName}-${fixtures.length}`} roleName={roleName} fixtures={fixtures} parts={parts} map={map} look={look} />
    ));
}

useGLTF.preload(MOVING_HEAD_URL);
