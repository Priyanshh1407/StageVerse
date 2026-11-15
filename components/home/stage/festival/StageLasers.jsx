'use client';

// A copy of ../Lasers.jsx for the festival stages (the homepage keeps using the original, unchanged):
// the only difference is that the projectors stand where the stage definition puts them (`projectors`).

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Laser projectors, each throwing a flat fan of beams out over the audience that scans up and down,
// like a real laser sheet:
//   - 4 on the front of the deck, in the gaps between the floor moving heads
//   - 2 on each side tower, clamped on a short rod to the inner face of the front column (the side
//     moving heads hang on the rear columns, so they never overlap)
// Groups (look.laserFloor / laserTower) switch the floor and tower projectors on separately; with
// look.laserSeq they come on one by one, left to right; look.laserCount 1 picks a new number of beams
// per projector on every beat. One instanced draw call for every beam; each beam's angle is computed
// in the vertex shader. The housings, apertures and rods are three more instanced draw calls.
// (festival: more beams, longer, hotter, with a glow round each one: real lasers in haze, not lines)
const PER = 24;                    // most beams one projector throws
const LENGTH = 80;
const HALO = 0.45;                  // how wide each beam's glow is (m)
const HOUSING = [0.75, 0.42, 0.62];
// The lowest any laser sheet points: 0.14 rad above horizontal, so they never sweep down into the crowd
const LASER_MIN_PITCH = 0.14;
// The most beams on stage at once, across every projector: with all of them on, a full rig of
// ~100 beams felt overwhelming, so the fans share this (all 8 on: ~8 each; one group of 4: ~12 each)
const TOTAL_CAP = 110;
// Beam-count mode: the fans breathe. The count steps one beam at a time toward a target (twice a
// beat), and each target sits on the other side of the fan from the last: down to a few beams,
// back up to (nearly) the full fan, down again...
const LOW = [0.15, 0.3];   // share of the full fan for a 'down' target (12 beams: 2-4)
const HIGH = [0.75, 1];    // ...and for an 'up' target (12 beams: 9-12)

// `halo`: the soft glow drawn round every beam (it shares the core's uniforms, so they always match)
function createLaserMaterial(sources, halo = false, shared = null) {
    return new THREE.ShaderMaterial({
        defines: { HALO: halo ? 1 : 0 },
        uniforms: shared ?? {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color('#39ff14') },
            uLevel: { value: 0 },
            uOn: { value: new Array(sources).fill(0) },   // each projector's level (groups, one-by-one)
            uBeams: { value: PER },                       // beams lit per projector
            uPhase: { value: 0 },
            uChase: { value: 0 },
            uSpread: { value: 1 },
            uTilt: { value: 0 },
        },
        vertexShader: /* glsl */ `
            attribute float aFan;    // -1..1 position in the fan
            attribute float aRank;   // 0, 1, 2...: the order beams light from the centre out
            attribute float aSrc;    // which projector
            attribute float aTower;  // 1 on a side tower
            attribute float aLean;   // -1..1: where the projector is across the stage
            uniform float uTime;
            uniform float uOn[${'${SOURCES}'}];
            uniform float uBeams;
            uniform float uPhase;
            uniform float uChase;
            uniform float uSpread;
            uniform float uTilt;
            varying float vAlong;
            varying float vOn;
            varying vec2 vAcross;
            varying float vSideOn;
            void main() {
                vAlong = position.z / ${LENGTH.toFixed(1)};
                vAcross = position.xy;
                float on = 0.0;
                for (int i = 0; i < ${'${SOURCES}'}; i++) if (float(i) == aSrc) on = uOn[i];
                // Only the first uBeams beams of each fan (from the centre out)
                on *= step(aRank, uBeams - 0.5);
                // Chase: a window of beams runs across each fan, the rest switch off
                float slot = aFan * 0.5 + 0.5 + aSrc * 0.37;
                on *= mix(1.0, step(fract(uTime * 1.8 - slot), 0.3), uChase);
                // a beam that is off costs nothing: it collapses to a point and no pixel of it is drawn
                if (on < 0.01) { vOn = 0.0; gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
                vOn = on;
                float t = uPhase; // accumulated in JS, so speed changes never make the fan leap
                // Fan spread over the audience, each projector leaning in toward the middle of the room
                // (the tower ones more), +0.1 turns the whole show slightly to the audience's right.
                // The main movement is side to side: each sheet sweeps left and right across the room
                float yaw = 0.1 + aFan * 0.38 * uSpread - aLean * mix(0.18, 0.4, aTower) + sin(t * 0.5 + aSrc * 0.9) * 0.42 + sin(t * 1.7 + aFan * 2.0) * 0.05;
                // Up and down is only a gentle drift, and no sheet ever points lower than 0.14 rad above
                // horizontal (tilt can lift them, never take them below that)
                float centre = mix(0.3, 0.26, aTower) + uTilt * 0.5;
                float travel = mix(0.07, 0.1, aTower);
                float pitch = max(centre + sin(t * 0.45 + aSrc * 1.3) * travel, ${LASER_MIN_PITCH.toFixed(2)});
                vec3 p = position;
                // pitch (around X) then yaw (around Y); beams start along +Z toward the audience
                p = vec3(p.x, p.y * cos(pitch) + p.z * sin(pitch), -p.y * sin(pitch) + p.z * cos(pitch));
                p = vec3(p.x * cos(yaw) + p.z * sin(yaw), p.y, -p.x * sin(yaw) + p.z * cos(yaw));
                // how side-on the camera sees this beam (1 = from the side, 0 = straight down its length)
                vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
                vec3 along = normalize(mat3(modelMatrix * instanceMatrix) * vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch)));
                vSideOn = 1.0 - pow(abs(dot(along, normalize(cameraPosition - world.xyz))), 2.0);
                gl_Position = projectionMatrix * viewMatrix * world;
            }
        `.replaceAll('${SOURCES}', String(sources)),
        fragmentShader: /* glsl */ `
            uniform vec3 uColor;
            uniform float uLevel;
            uniform float uTime;
            uniform float uBeams;
            varying float vAlong;
            varying float vOn;
            varying vec2 vAcross;
            varying float vSideOn;
            float hash(float n) { return fract(sin(n) * 43758.5453); }
            void main() {
                if (vOn < 0.01) discard;
                float fade = (1.0 - vAlong) * smoothstep(0.0, 0.03, vAlong);
                // the beam catching the haze: it sparkles along its length
                float grain = floor(vAlong * 160.0);
                float sparkle = 0.75 + 0.5 * hash(grain + floor(uTime * 24.0) * 7.13);
            #if HALO
                // the glow round the beam: brightest at its centre line, soft to its edges
                vec2 a = abs(vAcross) / ${(0.5 / 2).toFixed(3)};
                float r = min(a.x, a.y);
                float glow = exp(-r * r * 4.0) * 0.22 / sqrt(max(1.0, uBeams / 4.0));
                // (it fades in over the first metres, so the glows of a whole fan never pile up at the projector)
                float away = smoothstep(0.05, 0.25, vAlong);
                gl_FragColor = vec4(uColor * 2.0, glow * away * vSideOn * fade * uLevel * vOn * sparkle);
            #else
                // the core: as bright as it goes while keeping its colour (pushing every channel past full
                // turned a green laser white): the strongest channel at full, the others in proportion
                vec3 hot = uColor / max(max(uColor.r, uColor.g), max(uColor.b, 0.001)) * 1.15 + 0.06;
                gl_FragColor = vec4(hot, fade * uLevel * vOn * sparkle);
            #endif
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    });
}

export default function StageLasers({ look, count = 40, projectors }) {
    const n = projectors.length;
    const material = useMemo(() => createLaserMaterial(n), [n]);
    const haloMaterial = useMemo(() => createLaserMaterial(n, true, material.uniforms), [n, material]);
    const geometry = useMemo(() => {
        const g = new THREE.BoxGeometry(0.05, 0.05, LENGTH);
        g.translate(0, 0, LENGTH / 2);
        const total = n * PER;
        const attr = { aFan: new Float32Array(total), aRank: new Float32Array(total), aSrc: new Float32Array(total), aTower: new Float32Array(total), aLean: new Float32Array(total) };
        // Within a fan, beams light from the centre out, so a few beams sit in the middle
        const reach = Math.ceil((PER - 1) / 2) || 1;
        for (let s = 0; s < n; s++) {
            for (let k = 0; k < PER; k++) {
                const i = s * PER + k;
                const slot = k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2);
                attr.aFan[i] = slot / reach;
                attr.aRank[i] = k;
                attr.aSrc[i] = s;
                attr.aTower[i] = projectors[s].tower;
                attr.aLean[i] = Math.max(-1, Math.min(1, projectors[s].pos[0] / 12));
            }
        }
        for (const [name, values] of Object.entries(attr)) g.setAttribute(name, new THREE.InstancedBufferAttribute(values, 1));
        return g;
    }, [n, projectors]);
    // the glow: the same beams, wider (the same per-beam data)
    const haloGeometry = useMemo(() => {
        const g = new THREE.BoxGeometry(HALO, HALO, LENGTH * 0.5);
        g.translate(0, 0, LENGTH * 0.25);
        for (const name of ['aFan', 'aRank', 'aSrc', 'aTower', 'aLean']) g.setAttribute(name, geometry.getAttribute(name));
        return g;
    }, [geometry]);
    useEffect(() => () => {
        geometry.dispose();
        material.dispose();
        haloGeometry.dispose();
        haloMaterial.dispose();
    }, [geometry, material, haloGeometry, haloMaterial]);

    // The projectors themselves: housings, glowing apertures, and the rods clamping the tower ones on
    const parts = useMemo(() => {
        const housing = new THREE.BoxGeometry(...HOUSING);
        const aperture = new THREE.CircleGeometry(0.07, 20);
        const rod = new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8).rotateZ(Math.PI / 2);
        const housingMat = new THREE.MeshLambertMaterial({ color: '#1c1f27' });
        const apertureMat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
        const rodMat = new THREE.MeshLambertMaterial({ color: '#565c69' });
        return { housing, aperture, rod, housingMat, apertureMat, rodMat };
    }, []);
    useEffect(() => () => Object.values(parts).forEach((p) => p.dispose()), [parts]);

    const mesh = useRef();
    const halo = useRef();
    const housings = useRef();
    const apertures = useRef();
    const rods = useRef();
    const towers = projectors.filter((p) => p.tower);
    useEffect(() => {
        const m = new THREE.Matrix4();
        projectors.forEach((p, s) => {
            for (let k = 0; k < PER; k++) mesh.current.setMatrixAt(s * PER + k, m.makeTranslation(...p.pos));
            // the housing sits behind its aperture (and on the deck for the floor ones)
            housings.current.setMatrixAt(s, m.makeTranslation(p.pos[0], p.tower ? p.pos[1] : p.pos[1] - 0.3 + HOUSING[1] / 2, p.pos[2] - HOUSING[2] / 2));
            apertures.current.setMatrixAt(s, m.makeTranslation(p.pos[0], p.pos[1], p.pos[2] + 0.005));
            apertures.current.setColorAt(s, new THREE.Color(0, 0, 0));
        });
        // each tower projector hangs off the column on a rod
        towers.forEach((p, i) => rods.current.setMatrixAt(i, m.makeTranslation(p.pos[0] + p.side * (HOUSING[0] / 2 + 0.2), p.pos[1], p.pos[2] - HOUSING[2] / 2)));
        for (const r of [mesh, housings, apertures, rods]) r.current.instanceMatrix.needsUpdate = true;
    }, [projectors, towers]);

    // Live state: each projector's on/off (with the one-by-one queue), and the beam count
    const state = useRef({ on: new Array(n).fill(false), at: new Array(n).fill(null), level: new Array(n).fill(0), beams: PER, goal: PER, lastPulse: 0, sinceBeat: 0, beatLength: 0.5, sinceStep: 0, hex: null, color: new THREE.Color() });
    const apertureColor = useRef(new THREE.Color());

    useFrame(({ clock }, delta) => {
        if (!mesh.current) return;
        const target = look.current;
        const st = state.current;
        const u = mesh.current.material.uniforms;
        const now = clock.elapsedTime;
        const ease = 1 - Math.exp(-Math.min(delta, 0.1) * 5);
        if (target.laserColor !== st.hex) { st.hex = target.laserColor; st.color.set(target.laserColor); }
        const master = target.master ?? 1;
        const laser = (target.laser ?? 0) * master;

        // Which projectors should be on; new ones join one by one, left to right
        const step = (target.laserSeq ?? 1) > 0.5 ? 0.14 : 0;
        let queued = 0;
        projectors.forEach((p, s) => {
            const want = laser > 0.02 && (p.tower ? target.laserTower ?? 1 : target.laserFloor ?? 1) > 0.5;
            if (!want) { st.on[s] = false; st.at[s] = null; return; }
            if (st.on[s]) return;
            if (st.at[s] === null) st.at[s] = now + (queued++) * step;
            if (now >= st.at[s]) st.on[s] = true;
        });
        // a quick ramp so each projector snaps on (and off) like the real thing
        const snap = 1 - Math.exp(-Math.min(delta, 0.1) * 25);
        for (let s = 0; s < n; s++) {
            st.level[s] += ((st.on[s] ? 1 : 0) - st.level[s]) * snap;
            u.uOn.value[s] = st.level[s];
        }

        // Beams per projector: follow laserAmount, or breathe in and out one beam at a time
        // Each projector's full fan: the desk count (40 by default) gives ~12 beams each, so with eight
        // projectors the sheets fill the room
        const active = Math.max(1, st.on.filter(Boolean).length);
        // look.laserMax: the share of each full fan a look may light (the peaks use about half)
        const most = Math.max(2, Math.round(Math.min(PER, Math.round(count * 0.3), Math.floor(TOTAL_CAP / active)) * Math.min(1, target.laserMax ?? 1)));
        if ((target.laserCount ?? 0) > 0.5) {
            const pulse = target.pulse ?? 0;
            st.sinceBeat += delta;
            st.sinceStep += delta;
            // Learn the beat length from the pulse (a beat is the pulse jumping up); the desk has no
            // pulse, so it keeps the default half second
            if (pulse > 0.6 && st.lastPulse < 0.4) {
                if (st.sinceBeat > 0.2 && st.sinceBeat < 2) st.beatLength = st.sinceBeat;
                st.sinceBeat = 0;
            }
            st.lastPulse = pulse;
            // One beam per step, two steps a beat
            if (st.sinceStep >= st.beatLength / 2) {
                st.sinceStep = 0;
                st.beams = Math.min(st.beams, most);
                if (st.beams === st.goal || st.goal > most) {
                    // arrived: the next goal is on the other side of the fan
                    const [a, b] = st.beams > most / 2 ? LOW : HIGH;
                    st.goal = Math.max(2, Math.min(most, Math.round(most * (a + Math.random() * (b - a)))));
                }
                st.beams += Math.sign(st.goal - st.beams);
            }
        } else {
            st.beams = Math.max(1, Math.round(most * (target.laserAmount ?? 1)));
        }
        u.uBeams.value = Math.min(st.beams, most);

        u.uTime.value = now;
        u.uPhase.value += delta * (0.4 + (target.speed ?? 1) * 0.5);
        u.uChase.value = target.laserChase ?? 0;
        u.uSpread.value += ((target.laserSpread ?? 1) - u.uSpread.value) * ease;
        u.uTilt.value += ((target.laserTilt ?? 0) - u.uTilt.value) * ease;
        u.uColor.value.lerp(st.color, ease);
        // a little dimmer when every projector is firing, so the full rig never turns harsh
        const wanted = laser * (1 + (target.pulse ?? 0) * 0.5) * (active > 4 ? 0.85 : 1);
        u.uLevel.value += (wanted - u.uLevel.value) * ease;
        // Each aperture glows in the laser colour while its projector fires
        const glow = apertureColor.current;
        projectors.forEach((_, s) => {
            glow.copy(u.uColor.value).multiplyScalar(0.15 + st.level[s] * u.uLevel.value * 2);
            apertures.current.setColorAt(s, glow);
        });
        if (apertures.current.instanceColor) apertures.current.instanceColor.needsUpdate = true;
        // Skip the beams' draw call entirely while every projector is off
        mesh.current.visible = u.uLevel.value > 0.01 && st.level.some((l) => l > 0.01);
        if (halo.current) halo.current.visible = mesh.current.visible;
    });

    return (
        <group>
            <instancedMesh ref={halo} args={[haloGeometry, haloMaterial, n * PER]} frustumCulled={false} />
            <instancedMesh ref={mesh} args={[geometry, material, n * PER]} frustumCulled={false} />
            <instancedMesh ref={housings} args={[parts.housing, parts.housingMat, n]} frustumCulled={false} />
            <instancedMesh ref={apertures} args={[parts.aperture, parts.apertureMat, n]} frustumCulled={false} />
            <instancedMesh ref={rods} args={[parts.rod, parts.rodMat, towers.length]} frustumCulled={false} />
        </group>
    );
}
