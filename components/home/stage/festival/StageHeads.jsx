'use client';

// A copy of ../Fixtures.jsx for the festival stages (the homepage keeps using the original, unchanged):
// the only difference is that the heads come from the stage definition (`heads`, from lib/show/stages/rig.js) and the drop focuses on the stage's own centre (`focus`).

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { easing } from 'maath';
import { createBeamGeometry, createBeamMaterial, createGlowMaterial, createPartMaterial, createRoleUniforms } from './fixtureShader';

export const MOVING_HEAD_URL = '/fixtures/moving-head.glb';

// One job per group, like a real rig. `level` is the look key that switches the group on,
// colours come from the look, and each job moves in its own way.
export const ROLES = {
    // the aerial beams are the rig's centrepiece: denser and brighter than the rest, with more smoke in them
    // (festival: stronger than the homepage's, since the stages are bigger and bloom is off; the aerials
    // sweep half as far, so they stay pointed out at the audience)
    aerial: { level: 'beams', colors: ['colorA', 'colorB'], sweep: 0.5, speed: 1, converge: 1, spread: 1, opacity: 1.8, haze: 0.2 },
    // Side towers keep to their own aim (sidesAim), so wide or mirrored positions never throw them
    // outside the towers; they sweep only a little
    sides: { level: 'sides', colors: ['colorB', 'colorA'], sweep: 0.3, speed: 0.7, converge: 1, spread: 1.1, opacity: 1.5, ownAim: true },
    // On the drop the floor fixtures don't focus: they swing fully sideways
    // (the floor fixtures' bodies are smaller, so the performers stand out; the light is the same)
    // (steady: every cue keeps the floor beams close to the direction of 'Peak · hook', out at the crowd and a
    // little down: see FLOOR below; they take no part in the focus or the drop's sideways throw)
    floor: { level: 'floor', colors: ['colorA', 'colorB'], sweep: 0.6, speed: 1.3, converge: 0, spread: 0.9, opacity: 1.6, scale: 1.6, noWave: true, steady: true },
    // Washes colour the stage: wide, soft, barely moving, never part of the drop's convergence
    wash: { level: 'wash', colors: ['washColor', 'washColor'], sweep: 0.15, speed: 0.35, converge: 0, spread: 4.5, opacity: 0.3 },
    // spots: hard, medium-width beams on the performers, in the show's colours, barely moving
    // (they stay on the performers: a look's lift and wave never move them, so the follow spots from the
    // front-of-house tower never end up in the sky)
    spot: { level: 'wash', colors: ['colorA', 'colorB'], sweep: 0.08, speed: 0.4, converge: 0, spread: 1.7, opacity: 0.9, onPerformer: true },
};

function withFixtureAttributes(geometry, fixtures) {
    const attr = (values, size) => new THREE.InstancedBufferAttribute(new Float32Array(values), size);
    geometry.setAttribute('aBase', attr(fixtures.flatMap((f) => [f.pan, f.tilt]), 2));
    geometry.setAttribute('aPhase', attr(fixtures.map((f) => f.phase), 1));
    geometry.setAttribute('aColorMix', attr(fixtures.map((f) => f.colorMix), 1));
    geometry.setAttribute('aUp', attr(fixtures.flatMap((f) => f.up), 3));
    geometry.setAttribute('aXAxis', attr(fixtures.flatMap((f) => f.xAxis), 3));
    geometry.setAttribute('aIndex', attr(fixtures.map((f, i) => f.beatIndex ?? i), 1));
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
    g.setAttribute('aIndex', attr(fixtures.map((f, i) => f.beatIndex ?? i), 1));
    return g;
}

// How the beams move toward a new position, sweep or speed: a critically damped spring (like the
// camera's), so every move speeds up and slows down smoothly. Easing straight toward the target
// started each change at full speed (from standing still in one frame), which read as jerky
// whenever a cue snapped (a solo, a slam, a new phrase's look).
const MOVE_TIME = 0.3; // seconds
// The floor beams' limits in every cue, around 'Peak · hook' (fan 0.9, tilt shift -0.3): how far a cue may fan
// them (never mirrored: a crossing fan threw them outwards), raise or lower them, and swing them side to side
const FLOOR = { fan: [0.8, 1.0], tiltShift: [-0.4, -0.2], sweep: 0.25 };
const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));
// The aerial beams' wave (radians): it may swing up and down by up to AERIAL_MAX_WAVE, but the top of the
// swing never rises more than AERIAL_MAX_LIFT above where the beams rest, so they never go over the truss:
// a bigger wave swings further down into the crowd instead
const AERIAL_MAX_WAVE = 0.4;
const AERIAL_MAX_LIFT = 0.12;
const glide = (uniform, target, dt) => easing.damp(uniform, 'value', target, MOVE_TIME, dt);

/** Ease one role's uniforms toward the look; pulse and strobe applied on top, unsmoothed. */
function driveRole(u, role, target, state, delta) {
    const dt = Math.min(delta, 0.1);
    const ease = 1 - Math.exp(-dt * 4);
    const { a, b, ta, tb } = state.colors;
    const hexA = target[role.colors[0]] ?? target.colorA;
    const hexB = target[role.colors[1]] ?? target.colorB;
    if (hexA !== a.hex) { a.hex = hexA; ta.set(hexA); }
    if (hexB !== b.hex) { b.hex = hexB; tb.set(hexB); }

    u.uTime.value += delta;
    // washes barely move, except when a cue lifts them (the washes solo)
    const sweepScale = role === ROLES.wash ? (target.washSweep ?? role.sweep) : role.sweep;
    const mirrored = state.mirror && (target.sidesMirror ?? 0) > 0.5 ? -1 : 1;
    // The circle (look.circle): every beam traces a circle of radius look.circleSize (side to side and up
    // and down together), each a little behind the last, so the whole rig rolls round like a ring. Spots
    // stay on the performers; the washes circle smaller.
    const circle = (target.circle ?? 0) > 0.5 && !role.onPerformer;
    const radius = (target.circleSize ?? 0.35) * (role === ROLES.wash ? 0.4 : 1);
    const breathing = (target.fanBreathe ?? 0) > 0.5 && (role === ROLES.aerial || role === ROLES.floor);
    // (a cue with floor keys of its own, floorFan / floorTilt / floorSweep, moves the floor beams outside their
    // usual limits, and aerialTilt lifts or lowers the aerial beams freely: the mainstage's own cues)
    const sweepWanted = role.steady ? (target.floorSweep ?? Math.min(FLOOR.sweep, target.sweep * sweepScale)) : target.sweep * sweepScale;
    // (washes that light the stage (state.tune.washOnStage) barely move: they never swing off it)
    const washCap = role === ROLES.wash && state.tune.washOnStage ? 0.1 : Infinity;
    glide(u.uSweep, Math.min(washCap, circle ? radius * mirrored : breathing ? 0.04 : sweepWanted * mirrored), dt);
    // scissors (look.mirrorSweep): the right side sweeps the opposite way to the left
    glide(u.uMirrorSweep, circle ? 0 : target.mirrorSweep ?? 0, dt);
    // a focus in two colours (look.focusSplit, metres): the two colours meet side by side, not on one white point
    glide(u.uSplit, target.focusSplit ?? 0, dt);
    // The drop focuses every beam on the stage centre at once (no easing: it hits on the beat)
    const drop = target.dropFx ?? 0;
    const converge = Math.max(target.converge, role.sideways ? 0 : drop) * role.converge;
    if (drop > 0.5) u.uConverge.value += (converge - u.uConverge.value) * Math.min(1, delta * 9); // the drop hits on the beat
    else glide(u.uConverge, converge, dt);
    u.uSideways.value = role.sideways ? drop : 0;
    // (washes that light the stage keep to it with the house lights up too, not turned straight down)
    glide(u.uDown, role === ROLES.wash && !state.tune.washOnStage ? target.washDown ?? 0 : 0, dt);
    // Converging beams meet mid-air over the stage, or (focus) on the centre of the stage floor
    const ff = target.focusFloor ?? 0;
    u.uTarget.value.set(state.focus[0], state.focus[1] + 4 - 4 * ff, state.focus[2] - 0.5 * ff);
    // Beat-locked effects: the song's beat when one is playing, otherwise 120 BPM
    state.clock += delta;
    u.uBeat.value = target.beatPos ?? state.clock * 2;
    // (in a circle every beam stays on: alternate and sparkle switched half of them off on every beat)
    u.uAlternate.value += ((circle ? 0 : target.alternate ?? 0) - u.uAlternate.value) * ease;
    u.uSparkle.value += ((circle ? 0 : target.sparkle ?? 0) - u.uSparkle.value) * ease;
    glide(u.uSpeed, target.speed * role.speed, dt);
    // Accumulate the movement position: a speed change alters how fast it moves from where it is
    // (computing sin(time * speed) made beams leap whenever a cue changed the speed)
    state.phase += delta * u.uSpeed.value;
    // (look.floorWave: the floor beams ride the aerials' wave in step with them, one ripple through the rig)
    const rippling = role.steady && (target.floorWave ?? 0) > 0.5;
    if (role === ROLES.aerial) state.shared.phase = state.phase;
    u.uPhase.value = rippling ? state.shared.phase : state.phase;
    // Side towers: their pan is their crossing angle times (1 + sidesAim): 0 = crossing (rest),
    // -1 = straight at the audience, -2 = flared outside, +0.6 = further across
    const fan = role === ROLES.wash || role === ROLES.spot ? 1 : role.ownAim ? 1 + (target.sidesAim ?? 0)
        : role.steady ? (target.floorFan ?? clamp(Math.abs(target.fan ?? 1), FLOOR.fan)) : target.fan ?? 1;
    // Fan breathe (look.fanBreathe): the aerial and floor rows open out and close in again, in time with the
    // song (open on one beat, closed two beats later), the beams held otherwise: the classic fan-in, fan-out
    // of a festival main stage's rows
    const breathe = (target.fanBreathe ?? 0) > 0.5 && (role === ROLES.aerial || role === ROLES.floor);
    if (breathe) u.uFan.value = fan * (0.3 + 1.1 * (0.5 - 0.5 * Math.cos(((target.beatPos ?? state.clock * 2) * Math.PI) / 2)));
    else glide(u.uFan, fan, dt);
    // the side towers rest a little above level, aimed across at the audience: they take a look's
    // tilt only downward (a "sky" position lifting them into the sky looked wrong)
    // (in a circle the aerials swing up and down 1.5 times as far as side to side: they point out at the crowd, so
    // from the audience their up-and-down is foreshortened, and an even circle read as a flat ellipse)
    const aerialWave = circle ? Math.min(0.6, radius * 1.5) : Math.min(AERIAL_MAX_WAVE, target.tiltWave ?? 0);
    // (in a circle the aerials and side towers ignore the cue's lift: the circle alone sets their height,
    // its top just under where they rest, so they stay below the truss and draw whole circles over the crowd)
    const shift = role.onPerformer ? 0
        : circle && role.ownAim ? -radius * 0.85
        : circle && role === ROLES.aerial ? -Math.max(0, aerialWave - AERIAL_MAX_LIFT)
        : role.ownAim ? Math.max(-0.3, Math.min(0, target.tiltShift ?? 0))
        // (in a circle the floor beams circle round a centre a little up from where they lean, so the whole circle stays
        // in the air over the crowd: from their lean the bottom of the circle came down flat over the heads)
        : role.steady && circle ? (state.tune.floorCircleLift ?? 0)
        : role.steady ? (target.floorTilt ?? clamp(target.tiltShift ?? 0, FLOOR.tiltShift))
        : role === ROLES.aerial && target.aerialTilt !== undefined && !circle ? target.aerialTilt
        : role === ROLES.aerial ? Math.min(0, target.tiltShift ?? 0) - Math.max(0, aerialWave - AERIAL_MAX_LIFT)
            : target.tiltShift ?? 0;
    glide(u.uTiltShift, role === ROLES.wash && state.tune.washOnStage ? Math.min(0, shift) : shift, dt);
    const tiltWave = circle ? (role === ROLES.aerial ? aerialWave : radius)
        : rippling ? target.tiltWave ?? 0
        : role === ROLES.wash && state.tune.washOnStage ? 0
        : role.ownAim || role.noWave || role.onPerformer ? 0 : role === ROLES.aerial ? aerialWave : (target.tiltWave ?? 0) * (role === ROLES.wash ? 0.3 : 1);
    glide(u.uTiltWave, tiltWave, dt);
    glide(u.uPhaseSpread, circle ? 1 : target.phaseSpread ?? 0.25, dt);
    u.uHaze.value += (Math.min(1, target.haze + (role.haze ?? 0)) - u.uHaze.value) * ease;
    u.uColorA.value.lerp(ta, ease);
    u.uColorB.value.lerp(tb, ease);

    // (the spots follow the washes' level but are show lights: off when the house lights are up)
    const houseOff = role.onPerformer ? 1 - Math.min(1, (target.house ?? 0) * 1.5) : 1;
    // (the floor beams are never dim: whenever a cue has them on at all, at 85% or more of a nearly full intensity;
    // off and blackout stay off)
    const groupLevel = target[role.level] ?? 1;
    const level = role.steady && groupLevel > 0.05 ? Math.max(0.85, groupLevel) : groupLevel;
    const intensity = role.steady ? Math.max(0.95, target.intensity) : target.intensity;
    const wanted = intensity * (target.master ?? 1) * level * (state.extraLevel ? target[state.extraLevel] ?? 1 : 1) * houseOff;
    state.level += (wanted - state.level) * ease;
    const strobe = role === ROLES.wash ? 0 : target.strobe ?? 0; // strobing is the strobes' job; beams flicker with them
    const flash = (u.uTime.value * 12.5) % 1 < 0.3 ? 1.6 : 0.15;
    // the beat pulse, per role: a look can make the aerial beams pulse harder (pulseBeams) or hold the
    // washes steady (pulseWash 0)
    const pulseGain = role === ROLES.wash ? target.pulseWash ?? 1 : role === ROLES.aerial ? target.pulseBeams ?? 1 : 1;
    u.uIntensity.value = state.level * (1 + (target.pulse ?? 0) * 0.7 * pulseGain) * (1 + (flash - 1) * strobe * 0.12);
}

function RoleGroup({ roleName, fixtures, parts, map, look, focus, mirror = false, extraLevel = null, tune = {}, shared }) {
    const role = ROLES[roleName];
    // (a stage may tune a group: tune[role] = { opacity, length, spread } multipliers, e.g. the mainstage's bigger beams)
    const own = tune[roleName] ?? {};
    const uniforms = useMemo(() => {
        const u = createRoleUniforms({ spread: role.spread * (own.spread ?? 1), opacity: role.opacity * (own.opacity ?? 1), scale: role.scale ?? 2.3 });
        u.uMap.value = map;
        u.uLength.value = own.length ?? 1;
        return u;
    }, [role, map, own.spread, own.opacity, own.length]);
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

    const state = useRef({ focus, mirror, extraLevel, tune, shared, level: 1, phase: 0, clock: 0, colors: { a: {}, b: {}, ta: new THREE.Color(), tb: new THREE.Color() } });
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
export default function StageHeads({ heads, look, focus = [0, 1.8, -8], screenBeamsX = null, tune = {} }) {
    // the aerials' movement position, shared so the floor can ride their wave in step (look.floorWave)
    const shared = useMemo(() => ({ phase: 0 }), []);
    const { nodes, materials } = useGLTF(MOVING_HEAD_URL);
    const parts = useMemo(() => ({ base: nodes.Base_0.geometry, yoke: nodes.Support_0.geometry, head: nodes.Head_0.geometry }), [nodes]);
    const map = Object.values(materials)[0].map;
    // every role is one group, except the side towers: left and right are separate groups, so the
    // right one can sweep the opposite way (look.sidesMirror)
    const groups = useMemo(() => Object.keys(ROLES).flatMap((r) => {
        const list = heads.filter((f) => f.role === r);
        if (!list.length) return [];
        // the floor heads under the side screens (beyond screenBeamsX) are their own group: look.sideScreenBeams switches them
        if (r === 'floor' && screenBeamsX) {
            const under = list.filter((f) => Math.abs(f.position[0]) >= screenBeamsX);
            const rest = list.filter((f) => Math.abs(f.position[0]) < screenBeamsX);
            return [{ key: 'floor', role: r, list: rest }, { key: 'floor-screens', role: r, list: under, extraLevel: 'sideScreenBeams' }].filter((g) => g.list.length);
        }
        if (r !== 'sides') return [{ key: r, role: r, list }];
        const left = list.filter((f) => f.position[0] < 0);
        const right = list.filter((f) => f.position[0] >= 0);
        return [{ key: 'sides-left', role: r, list: left }, { key: 'sides-right', role: r, list: right, mirror: true }].filter((g) => g.list.length);
    }), [heads, screenBeamsX]);

    return groups.map((g) => (
        <RoleGroup key={`${g.key}-${g.list.length}`} roleName={g.role} fixtures={g.list} parts={parts} map={map} look={look} focus={focus} mirror={g.mirror} extraLevel={g.extraLevel} tune={tune} shared={shared} />
    ));
}

useGLTF.preload(MOVING_HEAD_URL);
