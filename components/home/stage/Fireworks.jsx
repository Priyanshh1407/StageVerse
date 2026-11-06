'use client';

import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BURN, CANDLES_X, CANDLE_STEP, CHASE_COUNT, CHASE_HALF_WIDTH, CHASE_STEP, COMET_STEP, RISE, SHELLS, SMOKE, TYPES } from '@/lib/show/fireworks';
import { fireworkBoom } from '../show/fireworkSound';
import { pyroLayout } from './rigLayout';

// Fireworks (item 16): aerial shells bursting in the sky behind the stage (peony, chrysanthemum,
// willow, palm, ring, crossette, glitter), and pyro on the stage (roof comets fanning up from the top
// truss, mines from the stage front, roman candles chasing along the truss).
//
// Each burst lights the sky (a soft glow where it bursts) and, through the stage's bounce light, the
// rig in its colour (fireworkLight, read by StageScene); its smoke lingers in the sky, lit by the
// bursts after it; booms and crackle play with each burst (fireworkSound).
//
// Cheap enough for integrated graphics: one draw call for all of it. A pool of SLOTS launches, each
// with PER_SLOT particles; every particle's role and motion (rising trail, the burst's pattern, arms,
// rings, splitting stars, comets, candles...) is worked out in the vertex shader from
// its slot's launch, so the CPU only fills a few uniforms per launch. Nothing drawn while the sky is
// empty; fewer slots and particles on integrated GPUs.

const POOL = { high: { slots: 40, perSlot: 320 }, low: { slots: 28, perSlot: 224 } };
const MAX_SLOTS = POOL.high.slots;
const BURNS = SHELLS.map((s) => BURN[s].toFixed(2));

const VERTEX = /* glsl */ `
    attribute vec4 aStar;          // slot, particle index in the slot, two random numbers
    uniform vec4 uA[${MAX_SLOTS}];  // where it leaves from (x, y, z), its age
    uniform vec4 uB[${MAX_SLOTS}];  // type, burst height, seed, seconds between shots (candles, comets)
    uniform vec4 uC[${MAX_SLOTS}];  // colour A, variant
    uniform vec4 uD[${MAX_SLOTS}];  // colour B
    uniform float uTime;
    uniform float uPerSlot;
    uniform float uSkyLight;       // how lit the sky is right now, for the smoke
    varying vec2 vUv;
    varying vec3 vColor;
    varying float vGlow;
    varying float vKind;           // 0 a star (a streak), 1 a burst's glow, 2 smoke
    varying float vHeat;           // a star: 0 fresh (white-hot) .. 1 burnt out

    const float RISE = ${RISE.toFixed(2)};
    float burnOf(int t) {
        ${BURNS.map((b, i) => `if (t == ${i}) return ${b};`).join(' ')}
        return 2.0;
    }
    float hash(float n) { return fract(sin(n) * 43758.5453); }
    vec3 sphereDir(float a, float b) {
        float z = 2.0 * a - 1.0;
        float r = sqrt(max(0.0, 1.0 - z * z));
        float p = 6.2831853 * b;
        return vec3(r * cos(p), z, r * sin(p));
    }
    // motion through air: launched at v along d, slowed by drag k, sinking toward v_fall
    vec3 flyPos(vec3 c, vec3 d, float v, float k, float fall, float t) {
        float s = (1.0 - exp(-k * t)) / k;
        return c + d * v * s - vec3(0.0, fall, 0.0) * (t - s);
    }
    vec3 flyVel(vec3 d, float v, float k, float fall, float t) {
        float e = exp(-k * t);
        return d * v * e - vec3(0.0, fall * (1.0 - e), 0.0);
    }

    void main() {
        int s = int(aStar.x + 0.5);
        float idx = aStar.y;
        float r1 = aStar.z;
        float r2 = aStar.w;
        vec4 A = uA[s];
        vec4 B = uB[s];
        vec3 origin = A.xyz;
        float age = A.w;
        int type = int(B.x + 0.5);
        float h = B.y;
        float seed = B.z;
        float shotStep = B.w;
        vec3 colA = uC[s].rgb;
        int variant = int(uC[s].w + 0.5);
        vec3 colB = uD[s].rgb;
        vUv = uv;
        vGlow = 0.0;
        vKind = 0.0;
        vHeat = 1.0;
        vColor = colA;
        gl_Position = vec4(0.0, 0.0, -2.0, 1.0); // hidden unless something below places it
        bool shell = type <= ${SHELLS.length - 1};
        vec3 burst = origin + vec3(sin(seed * 40.0) * 1.5, h, cos(seed * 31.0) * 1.5);
        float tb = age - RISE; // time since the shell burst
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

        // Particle 0: the glow of the burst, lighting the sky around it
        if (idx < 0.5) {
            vec3 c = burst;
            float size = 26.0 + 8.0 * seed;
            float level = 0.0;
            // (soft: in a finale many overlap, and bright glows added up to a white blob)
            if (shell && tb >= 0.0) level = exp(-tb * 3.5) * 0.14;
            if (type == ${TYPES.indexOf('mines')}) { c = origin + vec3(0.0, 3.0, 0.0); size = 9.0; level = exp(-age * 3.0) * 0.3; }
            if (level < 0.005) return;
            vKind = 1.0;
            vGlow = level;
            vColor = mix(colA, colB, 0.3);
            gl_Position = projectionMatrix * viewMatrix * vec4(c + (right * position.x + camUp * position.y) * size, 1.0);
            return;
        }
        // Particles 1-6: the shell's smoke, drifting and spreading in the sky, lit by the bursts
        if (idx < 6.5) {
            if (!shell || tb < 0.2) return;
            float k = idx - 1.0;
            float burn = burnOf(type);
            float level = smoothstep(0.2, 1.2, tb) * (1.0 - smoothstep(burn, burn + ${SMOKE.toFixed(2)}, tb));
            if (level < 0.005) return;
            vec3 c = burst + vec3(sin(k * 2.1 + seed * 9.0) * 5.0, cos(k * 1.7) * 3.0 - 0.4 * tb, cos(k * 2.9) * 3.0) + vec3(0.45, 0.15, 0.0) * tb;
            float size = 13.0 + 3.0 * tb;
            vKind = 2.0;
            // faint: a haze the bursts light up (in a finale dozens of puffs overlap, and brighter smoke summed to a white cloud)
            vGlow = level * (0.01 + 0.03 * uSkyLight);
            vColor = mix(vec3(0.55, 0.58, 0.66), colA, 0.25);
            gl_Position = projectionMatrix * viewMatrix * vec4(c + (right * position.x + camUp * position.y) * size, 1.0);
            return;
        }

        // The stars
        float u = (idx - 7.0) / (uPerSlot - 7.0);
        vec3 pos;
        vec3 vel;
        float bright = 0.0;
        float heat = 0.0;     // 0 fresh .. 1 burnt out
        // the tail: the path the star covered over the last moment (length per m/s of its speed),
        // as on a long-exposure photo of real fireworks; capped
        float streakK = 0.14;
        float streakMax = 2.0;
        vec3 col = colA;
        vec3 gold = vec3(1.0, 0.72, 0.3);

        if (shell && tb < 0.0) {
            // climbing: the first stars of the slot are its rising trail of sparks
            if (u > 0.12) return;
            float j = u / 0.12;
            float tr = age - j * 0.35;
            if (tr < 0.0) return;
            float q = clamp(tr / RISE, 0.0, 1.0);
            pos = origin + vec3(0.0, h * (1.0 - (1.0 - q) * (1.0 - q)), 0.0);
            vel = vec3(0.0, h * 2.0 * (1.0 - q) / RISE + 0.5, 0.0);
            bright = (1.0 - j) * 0.9;
            col = gold;
            streakK = 0.25;
            streakMax = 3.0;
        } else if (type == 0 || type == 6) {
            // peony: a ball of stars; glitter: the same, silver, crackling as it burns
            vec3 d = sphereDir(r1, r2);
            float v = (type == 0 ? 22.0 : 20.0) + 6.0 * hash(r1 * 7.3);
            float life = burnOf(type) * (0.75 + 0.25 * hash(r2 * 5.1));
            pos = flyPos(burst, d, v, 1.6, 2.4, tb);
            vel = flyVel(d, v, 1.6, 2.4, tb);
            heat = tb / life;
            if (heat > 1.0) return;
            bright = pow(1.0 - heat, 1.3) * 1.4;
            col = mix(colA, colB, step(0.5, hash(r1 * 3.7)));
            if (type == 6) { bright *= step(0.45, hash(floor(uTime * 26.0) + r1 * 91.0)) * 1.4; streakK = 0.1; streakMax = 1.2; }
        } else if (type == 1) {
            // chrysanthemum: long sparkling trails, turning gold as they burn
            vec3 d = sphereDir(r1, r2);
            float v = 24.0 + 5.0 * hash(r1 * 7.3);
            pos = flyPos(burst, d, v, 1.4, 2.2, tb);
            vel = flyVel(d, v, 1.4, 2.2, tb);
            heat = tb / burnOf(1);
            if (heat > 1.0) return;
            bright = pow(1.0 - heat, 1.1) * 1.3 * (heat > 0.7 ? 0.5 + step(0.5, hash(floor(uTime * 20.0) + r2 * 77.0)) : 1.0);
            col = mix(colA, gold, smoothstep(0.1, 0.6, heat));
            streakK = 0.6;
            streakMax = 7.0;
        } else if (type == 2) {
            // willow: slow golden stars whose long trails hang and droop
            vec3 d = sphereDir(r1, r2);
            float v = 15.0 + 3.0 * hash(r1 * 7.3);
            float life = burnOf(2) * (0.85 + 0.15 * hash(r2 * 3.1));
            pos = flyPos(burst, d, v, 1.0, 1.4, tb);
            vel = flyVel(d, v, 1.0, 1.4, tb);
            heat = tb / life;
            if (heat > 1.0) return;
            bright = pow(1.0 - heat, 0.8) * 1.2;
            col = mix(colA, colB, hash(r1 * 2.3));
            streakK = 1.4;
            streakMax = 9.0;
        } else if (type == 3) {
            // palm: a few thick arms, each a bright head with a trail behind it, mostly upward
            float arm = floor(u * 9.0);
            float j = fract(u * 9.0);
            vec3 d = sphereDir(hash(arm + seed * 13.0), hash(arm * 3.1 + seed * 7.0));
            d = normalize(vec3(d.x, abs(d.y) * 0.8 + 0.25, d.z));
            float tt = tb - j * 0.5;
            if (tt < 0.0) return;
            pos = flyPos(burst, d, 30.0, 1.2, 2.6, tt);
            vel = flyVel(d, 30.0, 1.2, 2.6, tt);
            heat = tt / burnOf(3);
            if (heat > 1.0) return;
            bright = (j < 0.08 ? 2.0 : (1.0 - j) * 0.9) * (1.0 - heat);
            col = j < 0.08 ? colA : gold;
            streakK = 0.35;
            streakMax = 5.0;
        } else if (type == 4) {
            // ring: a flat ring of stars, tilted its own way, with a sprinkle of the second colour inside
            vec3 n = normalize(vec3(sin(seed * 17.0) * 0.7, 0.6 + 0.4 * cos(seed * 11.0), cos(seed * 23.0) * 0.7));
            vec3 e1 = normalize(cross(n, vec3(0.0, 0.0, 1.0)) + vec3(1e-3));
            vec3 e2 = cross(n, e1);
            float a = u * 6.2831853;
            vec3 d = cos(a) * e1 + sin(a) * e2;
            float v = 22.0;
            if (hash(r1 * 9.0) < 0.15) { d = sphereDir(r1, r2); v = 9.0; col = colB; }
            pos = flyPos(burst, d, v, 1.7, 2.4, tb);
            vel = flyVel(d, v, 1.7, 2.4, tb);
            heat = tb / burnOf(4);
            if (heat > 1.0) return;
            bright = pow(1.0 - heat, 1.2) * 1.5;
        } else if (type == 5) {
            // crossette: stars that split into four mid-flight
            float p = floor(u * 24.0);
            int c = int(mod(floor(u * 96.0), 4.0));
            float dup = fract(u * 96.0);
            vec3 pd = sphereDir(hash(p + seed * 5.0), hash(p * 1.7 + seed * 3.0));
            float Ts = 0.75;
            float tt = tb - dup * 0.12;
            if (tt < 0.0) return;
            if (tt < Ts) {
                pos = flyPos(burst, pd, 20.0, 1.5, 2.4, tt);
                vel = flyVel(pd, 20.0, 1.5, 2.4, tt);
                col = colA;
            } else {
                vec3 e1 = normalize(cross(pd, vec3(0.0, 1.0, 0.0)) + vec3(1e-3));
                vec3 e2 = cross(pd, e1);
                vec3 cd = c == 0 ? e1 : (c == 1 ? -e1 : (c == 2 ? e2 : -e2));
                cd = normalize(cd * 0.8 + pd * 0.4);
                vec3 split = flyPos(burst, pd, 20.0, 1.5, 2.4, Ts);
                pos = flyPos(split, cd, 12.0, 2.0, 2.4, tt - Ts);
                vel = flyVel(cd, 12.0, 2.0, 2.4, tt - Ts);
                col = colB;
            }
            heat = tt / burnOf(5);
            if (heat > 1.0) return;
            bright = pow(1.0 - heat, 1.2) * 1.4 * (1.0 - dup * 0.6);
            streakK = 0.18;
            streakMax = 2.5;
        } else if (type == ${TYPES.indexOf('comets')}) {
            // roof comets: a fan cake firing eight comets one after another, in a V or a W
            float k8 = floor(u * 8.0);
            float j = fract(u * 8.0);
            float tt = age - k8 * (shotStep > 0.0 ? shotStep : ${COMET_STEP.toFixed(2)}) - j * 0.3;
            if (tt < 0.0) return;
            float ang = variant == 0 ? (k8 - 3.5) / 3.5 * 0.6 : (mod(k8, 2.0) < 0.5 ? -1.0 : 1.0) * (0.25 + 0.45 * floor(k8 / 2.0) / 3.0);
            vec3 d = normalize(vec3(sin(ang), cos(ang), 0.25));
            pos = flyPos(origin, d, 28.0, 0.9, 6.0, tt);
            vel = flyVel(d, 28.0, 0.9, 6.0, tt);
            heat = tt / 2.2;
            if (heat > 1.0) return;
            bright = (j < 0.06 ? 2.2 : (1.0 - j)) * (1.0 - heat);
            col = j < 0.06 ? colA : gold;
            streakK = 0.3;
            streakMax = 5.0;
        } else if (type == ${TYPES.indexOf('chase')}) {
            // comet chase: comets spread along the top of the truss, fired one after another, left to
            // right, each tilted so the trails draw a V (variant 0) or a W (variant 1: two Vs)
            float n = ${CHASE_COUNT.toFixed(1)};
            float k = floor(u * n);
            float j = fract(u * n);
            float tt = age - k * (shotStep > 0.0 ? shotStep : ${CHASE_STEP.toFixed(2)}) - j * 0.3;
            if (tt < 0.0) return;
            float halfN = n * 0.5;
            float m = variant == 0 ? (k - (n - 1.0) * 0.5) / ((n - 1.0) * 0.5) : (mod(k, halfN) - (halfN - 1.0) * 0.5) / ((halfN - 1.0) * 0.5);
            float ang = m * 0.6;
            vec3 o = origin + vec3(-${CHASE_HALF_WIDTH.toFixed(1)} + k * ${((2 * CHASE_HALF_WIDTH) / (CHASE_COUNT - 1)).toFixed(4)}, 0.0, 0.0);
            vec3 d = normalize(vec3(sin(ang), cos(ang), 0.25));
            pos = flyPos(o, d, 28.0, 0.9, 6.0, tt);
            vel = flyVel(d, 28.0, 0.9, 6.0, tt);
            heat = tt / 2.2;
            if (heat > 1.0) return;
            bright = (j < 0.06 ? 2.2 : (1.0 - j)) * (1.0 - heat);
            col = j < 0.06 ? colA : gold;
            streakK = 0.3;
            streakMax = 5.0;
        } else if (type == ${TYPES.indexOf('mines')}) {
            // mines: a low, wide spray of stars straight from the stage front
            float phi = 6.2831853 * r1;
            float y = 0.45 + 0.55 * hash(r2 * 3.3);
            float w = sqrt(1.0 - y * y);
            vec3 d = normalize(vec3(cos(phi) * w, y, sin(phi) * w * 0.6 + 0.15));
            float v = 12.0 + 5.0 * hash(r2 * 7.7);
            float life = 1.6 * (0.7 + 0.3 * hash(r1 * 5.5));
            pos = flyPos(origin, d, v, 1.9, 3.0, age);
            vel = flyVel(d, v, 1.9, 3.0, age);
            heat = age / life;
            if (heat > 1.0) return;
            bright = pow(1.0 - heat, 1.2) * 1.4;
            col = mix(colA, colB, step(0.5, hash(r1 * 2.9)));
            streakK = 0.16;
            streakMax = 2.2;
        } else if (type == ${TYPES.indexOf('candles')}) {
            // roman candles: six along the top of the truss, each firing four balls, in a chase (on the
            // song's beat when it gives one)
            float id = floor(u * 240.0);
            if (id >= 240.0) return;
            float c = floor(id / 40.0);
            float b = floor(mod(id, 40.0) / 10.0);
            float j = mod(id, 10.0) / 10.0;
            float tt = age - c * (shotStep > 0.0 ? shotStep : ${CANDLE_STEP.toFixed(2)}) - b * 0.55 - j * 0.06;
            if (tt < 0.0) return;
            vec3 o = vec3(${CANDLES_X[0].toFixed(1)} + c * ${(CANDLES_X[1] - CANDLES_X[0]).toFixed(1)}, origin.y, origin.z);
            vec3 d = normalize(vec3(0.05 * (c - 2.5) / 2.5, 1.0, 0.12));
            pos = flyPos(o, d, 21.0, 0.8, 8.0, tt);
            vel = flyVel(d, 21.0, 0.8, 8.0, tt);
            heat = tt / 1.6;
            if (heat > 1.0) return;
            bright = (j < 0.1 ? 2.2 : (1.0 - j) * 0.6) * (1.0 - heat * 0.7);
            col = b < 0.5 ? colA : (b < 1.5 ? colB : (b < 2.5 ? gold : vec3(1.0)));
            streakK = 0.25;
            streakMax = 3.0;
        } else {
            return;
        }
        if (bright < 0.003) return;
        // Like a real burst: the flash is the burst's glow, and the stars come out of it over the first
        // tenth of a second (all starting on one point, at full brightness they summed to a white blob)
        if (shell && tb >= 0.0) bright *= smoothstep(0.0, 0.2, tb);
        // and near the end they flicker and sputter out instead of fading evenly
        if (heat > 0.75) bright *= 0.35 + 0.65 * step(0.35, hash(floor(uTime * 18.0) + r1 * 31.0 + r2 * 7.0));

        // a streak along the star's flight, facing the camera
        float speed = length(vel);
        vec3 axis = speed > 0.001 ? vel / speed : vec3(0.0, 1.0, 0.0);
        vec3 toCam = normalize(cameraPosition - pos);
        vec3 side = normalize(cross(axis, toCam) + vec3(1e-4, 0.0, 0.0));
        float streak = clamp(speed * streakK, 0.12, streakMax);
        // shells burst 60-70 m from the audience: their stars need to be wider to read at that distance
        // fine stars (a real star is a small, intense point); the quad is a little wider than the star
        // to hold the glow around its head
        float width = (shell ? 0.22 : 0.07) * 1.8;
        gl_Position = projectionMatrix * viewMatrix * vec4(pos + axis * (position.y * streak) + side * (position.x * width), 1.0);
        vKind = 0.0;
        vGlow = bright;
        vColor = col;
        vHeat = clamp(heat, 0.0, 1.0);
    }
`;

const FRAGMENT = /* glsl */ `
    varying vec2 vUv;
    varying vec3 vColor;
    varying float vGlow;
    varying float vKind;
    varying float vHeat;

    void main() {
        vec3 c;
        if (vKind > 1.5) {
            // smoke: a soft, faint cloud
            float d = length(vUv - 0.5) * 2.0;
            c = vColor * (1.0 - smoothstep(0.2, 1.0, d)) * vGlow;
        } else if (vKind > 0.5) {
            // the glow around a burst
            float d = length(vUv - 0.5) * 2.0;
            c = vColor * exp(-d * d * 4.0) * vGlow;
        } else {
            // A star, like a real one: a white-hot head inside a soft halo (its aura), trailing a tail
            // that thins and cools toward the end, from the star's colour to ember orange
            float x = (vUv.x - 0.5) * 1.8;                       // across, in star widths
            float y = vUv.y;                                     // 0 the end of the tail .. 1 the head
            float tail = exp(-x * x * 7.0) * pow(y, 1.6);       // thin, fading toward its end
            vec2 h = vec2(x, (y - 0.94) * 10.0);
            float head = exp(-dot(h, h) * 3.0);                 // the burning star itself
            float halo = exp(-dot(h, h) * 0.8) * 0.25;          // a little glow around it
            vec3 ember = vColor * vec3(1.0, 0.62, 0.35);
            vec3 trail = mix(ember, vColor, y);                 // the tail cools toward ember orange
            vec3 core = mix(vColor, vec3(1.0, 0.97, 0.9), 0.75 * (1.0 - vHeat)); // white-hot while fresh
            c = (trail * tail * 0.9 + core * head * 1.6 + vColor * halo) * vGlow * 3.2;
        }
        // Guard the bloom buffer: one NaN or infinite pixel (a star at a degenerate moment, or dozens of
        // additive stars stacked at a burst) is blurred by bloom over the whole frame, which then
        // flashes black. A NaN fails every comparison, so it's dropped; brightness is capped well inside
        // what the half-float buffer holds.
        if (!(c.r >= 0.0 && c.g >= 0.0 && c.b >= 0.0)) discard;
        c = min(c, vec3(24.0));
        if (max(c.r, max(c.g, c.b)) < 0.002) discard;
        gl_FragColor = vec4(c, 1.0);
    }
`;

/**
 * The light the fireworks throw on the rig right now: StageScene's bounce and sky lights read it
 * (colour and level, 0..1).
 */
export const fireworkLight = { level: 0, color: new THREE.Color() };

const colour = new THREE.Color();
const glowColour = new THREE.Color();

/** Each frame: the launches in the air into the slots, the sky's light, and the booms. */
function driveFireworks(geometry, material, target, time, pool, spots) {
    const list = target.fireworks;
    const u = material.uniforms;
    if (!list?.length) {
        geometry.instanceCount = 0;
        fireworkLight.level = 0;
        u.uSkyLight.value = 0;
        return;
    }
    // the newest launches win the slots
    const live = [...list].sort((a, b) => a.age - b.age).slice(0, pool.slots);
    let light = 0;
    glowColour.setRGB(0, 0, 0);
    const heard = material.userData.heard ?? (material.userData.heard = new Map());
    const seen = new Set();
    live.forEach((f, s) => {
        const type = TYPES.indexOf(f.type);
        const at = f.type === 'mines' ? spots[f.unit % spots.length].pos : [f.x, f.y, f.z];
        u.uA.value[s].set(at[0], at[1], at[2], f.age);
        u.uB.value[s].set(type, f.h ?? 0, f.seed ?? 0, f.len ?? 0);
        colour.set(f.colorA);
        u.uC.value[s].set(colour.r, colour.g, colour.b, f.variant ?? 0);
        colour.set(f.colorB);
        u.uD.value[s].set(colour.r, colour.g, colour.b, 0);
        // the light each burst throws: a flash as it bursts, fading over half a second
        const shell = type < SHELLS.length;
        const since = shell ? f.age - RISE : f.age;
        if ((shell || f.type === 'mines') && since >= 0) {
            const l = Math.exp(-since * 2.2) * (shell ? 1 : 0.4);
            light += l;
            glowColour.add(colour.set(f.colorA).multiplyScalar(l));
        }
        // a boom (and crackle) as each one bursts or fires: once per launch
        seen.add(f.id);
        const last = heard.get(f.id);
        const moment = shell ? RISE : 0;
        if ((last === undefined || last < moment) && f.age >= moment && f.age < moment + 0.5) fireworkBoom(f.type);
        heard.set(f.id, f.age);
    });
    for (const id of heard.keys()) if (!seen.has(id)) heard.delete(id);
    geometry.instanceCount = live.length * pool.perSlot;
    u.uTime.value = time;
    u.uSkyLight.value = Math.min(1, light);
    fireworkLight.level = Math.min(1, light);
    if (light > 0) fireworkLight.color.copy(glowColour.multiplyScalar(1 / light));
}

export default function Fireworks({ look, count, quality = 'low' }) {
    const pool = POOL[quality] ?? POOL.low;
    const spots = useMemo(() => pyroLayout(count), [count]);

    const geometry = useMemo(() => {
        const g = new THREE.InstancedBufferGeometry();
        const quad = new THREE.PlaneGeometry(1, 1);
        g.index = quad.index;
        g.setAttribute('position', quad.attributes.position);
        g.setAttribute('uv', quad.attributes.uv);
        const data = new Float32Array(pool.slots * pool.perSlot * 4);
        let a = 0.3141592;
        let b = 0.6931471;
        for (let s = 0; s < pool.slots; s++) {
            for (let p = 0; p < pool.perSlot; p++) {
                const i = (s * pool.perSlot + p) * 4;
                a = (a + 0.6180339887) % 1;
                b = (b + 0.7548776662) % 1;
                data[i] = s;
                data[i + 1] = p;
                data[i + 2] = a;
                data[i + 3] = b;
            }
        }
        g.setAttribute('aStar', new THREE.InstancedBufferAttribute(data, 4));
        g.instanceCount = 0;
        return g;
    }, [pool]);

    const material = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uA: { value: Array.from({ length: MAX_SLOTS }, () => new THREE.Vector4()) },
            uB: { value: Array.from({ length: MAX_SLOTS }, () => new THREE.Vector4()) },
            uC: { value: Array.from({ length: MAX_SLOTS }, () => new THREE.Vector4()) },
            uD: { value: Array.from({ length: MAX_SLOTS }, () => new THREE.Vector4()) },
            uTime: { value: 0 },
            uPerSlot: { value: pool.perSlot },
            uSkyLight: { value: 0 },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    }), [pool]);

    useEffect(() => () => { geometry.dispose(); }, [geometry]);
    useEffect(() => () => { material.dispose(); }, [material]);

    useFrame(({ clock }) => driveFireworks(geometry, material, look.current, clock.elapsedTime, pool, spots));

    return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={4} />;
}
