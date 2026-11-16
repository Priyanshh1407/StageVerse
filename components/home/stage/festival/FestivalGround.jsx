'use client';

// The festival ground's camera travel (back, turn, forward), on a test page (/lab/festival): the four stages as rough builds (their
// structure and screens, a few plain beams), laid out like a festival site (a gate, a main avenue, the mainstage at its far end, the others off to the sides). Pick a user's stage and the camera backs
// away, turns to face it and moves forward to it; the stage it leaves goes dark first, then the new one lights up.
// The homepage does not use this yet: it is here to judge the motion.

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DEFAULT_LOOK } from '@/lib/show/look';
import { STAGES, fitShot } from '@/lib/show/stages';
import { COLORS } from '@/lib/show/stages/blockoutKit';
import { FESTIVAL, GROUNDS, LIVE_STAGE, groundShot, walkAt } from '@/lib/show/stages/festival';
import { StagePixelBars, StageScreens, StageStructure } from './StageBuild';

const stageOf = (stop) => (stop.stage === 'live' ? LIVE_STAGE : STAGES[stop.stage]);
/** Where the camera stands at a stop: the stage's wide view (fitted to the whole stage where it has a frame). */
function shotOf(stop, aspect) {
    const stage = stageOf(stop);
    const wide = stage.shots.wide;
    return groundShot(stop, stage.frame ? fitShot(wide, stage.frame, aspect, 55) : wide);
}

const STANDBY = 0.07; // how lit an unlit stage's screens stay

function showBeams(material, mesh, level) {
    material.opacity = 0.2 * level;
    mesh.visible = level > 0.01;
}

function tintWall(material, lit, level) {
    material.color.set('#05060a').lerp(lit, 0.55 * Math.max(STANDBY, level));
}

/** A few plain beams from the stage's own lights, so a lit stage reads as lit from across the grounds. */
function RoughBeams({ stage, level, colors }) {
    const heads = useMemo(() => {
        const beams = stage.heads.filter((h) => h.type === 'beam');
        const step = Math.max(1, Math.floor(beams.length / 26));
        return beams.filter((_, i) => i % step === 0);
    }, [stage]);
    const geometry = useMemo(() => new THREE.CylinderGeometry(1.6, 0.12, 34, 10, 1, true).translate(0, 17, 0), []);
    const material = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), []);
    const mesh = useRef();
    useEffect(() => {
        const m = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const up = new THREE.Vector3(0, 1, 0);
        const colour = new THREE.Color();
        heads.forEach((h, i) => {
            q.setFromUnitVectors(up, new THREE.Vector3(...h.aim).normalize());
            mesh.current.setMatrixAt(i, m.compose(new THREE.Vector3(...h.pos), q, new THREE.Vector3(1, 1, 1)));
            mesh.current.setColorAt(i, colour.set(colors[i % 2]));
        });
        mesh.current.instanceMatrix.needsUpdate = true;
        if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    }, [heads, colors]);
    useFrame(() => showBeams(material, mesh.current, level.current));
    return <instancedMesh ref={mesh} args={[geometry, material, heads.length]} frustumCulled={false} />;
}

/** The stage's main LED walls as plain glowing panels (the built stages draw the wordmark and visuals here). */
function RoughWalls({ stage, level, color }) {
    const walls = useMemo(() => stage.screens.filter((p) => p.ledWall && p.kind === 'box'), [stage]);
    const material = useMemo(() => new THREE.MeshBasicMaterial({ color: '#05060a', toneMapped: false }), []);
    const lit = useMemo(() => new THREE.Color(color), [color]);
    useFrame(() => tintWall(material, lit, level.current));
    return walls.map((p, i) => (
        <mesh key={i} position={[p.position[0], p.position[1], p.position[2] + p.size[2] / 2 + 0.02]} material={material}>
            <planeGeometry args={[p.size[0], p.size[1]]} />
        </mesh>
    ));
}

function RoughStage({ stop, levels }) {
    const stage = stageOf(stop);
    const look = useRef({ ...DEFAULT_LOOK, master: 0, colorA: stop.colors[0], colorB: stop.colors[1] });
    const level = useRef(0);
    useFrame(() => {
        level.current = levels.current[stop.key] ?? 0;
        // (a stage that is off keeps a faint standby glow on its screens, so the grounds read from the air)
        look.current = { ...DEFAULT_LOOK, master: Math.max(STANDBY, level.current), intensity: 1, pixel: 1, colorA: stop.colors[0], colorB: stop.colors[1] };
    });
    return (
        <group position={stop.position} rotation={[0, stop.turn, 0]}>
            <StageStructure stage={stage} />
            <StageScreens stage={stage} look={look} />
            {stage.pixelBars.length > 0 && <StagePixelBars stage={stage} look={look} />}
            <RoughWalls stage={stage} level={level} color={stop.colors[0]} />
            <RoughBeams stage={stage} level={level} colors={stop.colors} />
            {/* a person-high marker where the audience stands, for scale */}
            <mesh position={[0, 0.9, (stage.shots.wide.pos[2] ?? 30) * 0.5]}>
                <boxGeometry args={[0.5, 1.8, 0.3]} />
                <meshBasicMaterial color={COLORS.person} />
            </mesh>
        </group>
    );
}

/** Flies the camera: `flight.current` = { from, to, start, seconds, fromKey, toKey } or null (standing at a stop). */
const gaze = new THREE.Vector3();
/** One frame of the camera: standing at a stop, or somewhere along a flight (and each stage's light level). */
function pilot(camera, time, flight, levels, at, settings, onLanded) {
    // (the map: straight down on the whole site, every stage on standby, the one you are at lit)
    if (settings.current.map) {
        camera.position.set(0, 620, -15);
        camera.up.set(0, 0, -1);
        camera.lookAt(gaze.set(0, 0, -15));
        for (const s of FESTIVAL) levels.current[s.key] = s.key === at.current ? 1 : 0;
        return;
    }
    camera.up.set(0, 1, 0);
    const f = flight.current;
    if (!f) {
        const shot = shotOf(FESTIVAL.find((s) => s.key === at.current), camera.aspect);
        camera.position.set(...shot.pos);
        camera.lookAt(gaze.set(...shot.target));
        for (const s of FESTIVAL) levels.current[s.key] = s.key === at.current ? 1 : 0;
        return;
    }
    f.start ??= time;
    const t = Math.min(1, (time - f.start) / f.seconds);
    // (from a stop, or from a given view: walking in from the gate)
    const from = f.fromShot ?? shotOf(FESTIVAL.find((s) => s.key === f.fromKey), camera.aspect);
    const to = shotOf(FESTIVAL.find((s) => s.key === f.toKey), camera.aspect);
    const now = walkAt(from, to, t, { back: f.back ?? settings.current.back });
    camera.position.set(...now.pos);
    camera.lookAt(gaze.set(...now.target));
    for (const s of FESTIVAL) levels.current[s.key] = s.key === f.fromKey ? now.leaving : s.key === f.toKey ? now.arriving : 0;
    if (t >= 1) { at.current = f.toKey; flight.current = null; onLanded(f.toKey); }
}

/** Flies the camera: `flight.current` = { fromKey, toKey, seconds } or null (standing at a stop). */
function Pilot({ flight, levels, at, settings, onLanded }) {
    useFrame(({ camera, clock }) => pilot(camera, clock.elapsedTime, flight, levels, at, settings, onLanded));
    return null;
}

export default function FestivalGround() {
    const flight = useRef(null);
    const levels = useRef({});
    const at = useRef(FESTIVAL[0].key);
    const settings = useRef({ back: 45, map: false });
    const [map, setMap] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('map') === '1');
    const [here, setHere] = useState(FESTIVAL[0].key);
    const [flying, setFlying] = useState(null);
    const [seconds, setSeconds] = useState(8);
    const [back, setBack] = useState(45);
    const tour = useRef(null);

    const flyTo = (key) => {
        if (flight.current || key === at.current) return;
        flight.current = { fromKey: at.current, toKey: key, seconds };
        setFlying(key);
    };
    const landed = (key) => {
        setHere(key);
        setFlying(null);
        // the tour: on to the next stop after a pause
        if (tour.current) {
            const next = tour.current.shift();
            if (next) setTimeout(() => flyTo(next), 1800);
            else tour.current = null;
        }
    };
    // the whole visit: in through the gate to the live stage, the other three, and back to the live stage (the encore)
    const startTour = () => {
        if (flight.current) return;
        tour.current = [...FESTIVAL.slice(1).map((s) => s.key), FESTIVAL[0].key];
        enter();
    };
    const enter = () => {
        if (flight.current) return;
        flight.current = { fromShot: GROUNDS.entrance, toKey: FESTIVAL[0].key, seconds, back: 0 };
        setFlying(FESTIVAL[0].key);
    };
    useEffect(() => { settings.current.back = back; settings.current.map = map; }, [back, map]);

    const button = (on) => `rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${on ? 'bg-[#ff6a00] text-black' : 'bg-white/10 text-white hover:bg-white/20'}`;
    const current = FESTIVAL.find((s) => s.key === (flying ?? here));
    return (
        <div className="relative h-screen w-full bg-[#02030a]">
            <Canvas camera={{ position: [0, 40, 0], fov: 55, near: 0.5, far: 2500 }} dpr={[1, 1.5]}>
                <color attach="background" args={['#02030a']} />
                <fog attach="fog" args={['#02030a', 350, 1100]} />
                <hemisphereLight args={['#8f9cd0', '#10131c', 2.4]} />
                <directionalLight position={[80, 160, 120]} intensity={1.4} color="#c8d4ff" />
                {/* the grounds, and the plaza in the middle */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
                    <planeGeometry args={[2400, 2400]} />
                    <meshLambertMaterial color="#1a1e2b" />
                </mesh>
                {/* the paths: the main avenue from the gate, and one off it to each stage */}
                {GROUNDS.paths.map(([[x0, z0], [x1, z1]], i) => (
                    <mesh key={`path-${i}`} rotation={[-Math.PI / 2, 0, Math.atan2(x1 - x0, z1 - z0)]} position={[(x0 + x1) / 2, 0.01, (z0 + z1) / 2]}>
                        <planeGeometry args={[i === 0 ? 12 : 6, Math.hypot(x1 - x0, z1 - z0)]} />
                        <meshBasicMaterial color={i === 0 ? '#2f3a5c' : '#262f4a'} />
                    </mesh>
                ))}
                {/* the entrance gate: two towers and a beam across the avenue */}
                <group position={[GROUNDS.gate[0], 0, GROUNDS.gate[1]]}>
                    {[-1, 1].map((side) => (
                        <mesh key={side} position={[side * 11, 9, 0]}>
                            <boxGeometry args={[3, 18, 3]} />
                            <meshLambertMaterial color="#2a3350" />
                        </mesh>
                    ))}
                    <mesh position={[0, 16.5, 0]}>
                        <boxGeometry args={[25, 3, 2]} />
                        <meshBasicMaterial color="#ff6a00" />
                    </mesh>
                </group>
                {FESTIVAL.map((stop) => <RoughStage key={stop.key} stop={stop} levels={levels} />)}
                <Pilot flight={flight} levels={levels} at={at} settings={settings} onLanded={landed} />
            </Canvas>

            <div className="pointer-events-none absolute left-3 top-3 w-72 rounded-xl border border-white/10 bg-black/70 p-3 text-white backdrop-blur">
                <p className="text-sm font-bold">Festival ground <span className="font-normal text-white/50">· camera travel test</span></p>
                <p className="mt-1 text-[11px] leading-snug text-white/60">Rough stages. The homepage does not use this yet.</p>
                <p className="mt-3 text-[11px] uppercase tracking-wider text-white/50">Go to a user&apos;s stage</p>
                <div className="pointer-events-auto mt-1 flex flex-col gap-1.5">
                    {FESTIVAL.map((s) => (
                        <button key={s.key} type="button" disabled={Boolean(flying)} className={`${button(here === s.key && !flying)} text-left disabled:opacity-50`} onClick={() => flyTo(s.key)}>
                            {s.persona} <span className="font-normal opacity-70">· {s.title}</span>
                        </button>
                    ))}
                    <button type="button" disabled={Boolean(flying)} className={`${button(false)} disabled:opacity-50`} onClick={enter}>Walk in from the gate</button>
                    <button type="button" disabled={Boolean(flying)} className={`${button(false)} disabled:opacity-50`} onClick={startTour}>The whole visit (gate, four stages, encore)</button>
                    <button type="button" disabled={Boolean(flying)} className={`${button(map)} disabled:opacity-50`} onClick={() => setMap((m) => !m)}>Site map (from above)</button>
                </div>
                <p className="mt-3 text-[11px] uppercase tracking-wider text-white/50">Travel time: {seconds} s</p>
                <input className="pointer-events-auto w-full" type="range" min="4" max="14" step="0.5" value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} />
                <p className="mt-2 text-[11px] uppercase tracking-wider text-white/50">Steps back: {back} m</p>
                <input className="pointer-events-auto w-full" type="range" min="10" max="120" step="5" value={back} onChange={(e) => setBack(Number(e.target.value))} />
                <p className="mt-3 text-[11px] text-white/60">{flying ? `Going to the ${current.title}...` : `At the ${current.title} (${current.persona})`}</p>
                <div className="pointer-events-auto mt-2 flex gap-2 text-[11px]">
                    {['desert', 'mainstage', 'warehouse'].map((k) => <Link key={k} href={`/lab/${k}`} className="text-amber-300 hover:underline">{k}</Link>)}
                </div>
            </div>
        </div>
    );
}
