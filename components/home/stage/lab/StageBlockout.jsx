'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { COLORS, GROUPS, TYPES } from './blockoutKit';
import mainstage from './mainstageLayout';
import desert from './desertLayout';
import warehouse from './warehouseLayout';

// The stage blockout pages: plain shapes at real size with every light and effect position marked,
// to agree each stage's structure and rig before anything is built. Not used by the homepage.

const LAYOUTS = { mainstage, desert, warehouse };
const UP = new THREE.Vector3(0, 1, 0);

function Piece({ item }) {
    const geometry = useMemo(() => {
        if (item.kind !== 'panel') return null;
        const shape = new THREE.Shape(item.outline.map(([x, y]) => new THREE.Vector2(x, y)));
        return new THREE.ExtrudeGeometry(shape, { depth: item.depth, bevelEnabled: false });
    }, [item]);
    const material = <meshStandardMaterial color={item.color} roughness={0.85} />;
    if (item.kind === 'panel') return <mesh geometry={geometry} position={[0, item.base, item.z - item.depth / 2]}>{material}</mesh>;
    if (item.kind === 'box') return <mesh position={item.position} rotation={item.rotation ?? [0, 0, 0]}><boxGeometry args={item.size} />{material}</mesh>;
    if (item.kind === 'cylinder') return <mesh position={item.position}><cylinderGeometry args={[item.radius[0], item.radius[1], item.height, 10]} />{material}</mesh>;
    if (item.kind === 'cone') return <mesh position={item.position}><coneGeometry args={[item.radius, item.height, 5]} />{material}</mesh>;
    if (item.kind === 'sphere') return <mesh position={item.position} scale={item.scale ?? [1, 1, 1]}><sphereGeometry args={[item.radius, 16, 12]} />{material}</mesh>;
    if (item.kind === 'torus') return <mesh position={item.position}><torusGeometry args={[item.radius, item.tube, 8, 40]} />{material}</mesh>;
    if (item.kind === 'truss' || item.kind === 'cable') {
        const a = new THREE.Vector3(...item.from);
        const b = new THREE.Vector3(...item.to);
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const q = new THREE.Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize());
        if (item.kind === 'cable') return <mesh position={mid} quaternion={q}><cylinderGeometry args={[0.05, 0.05, a.distanceTo(b), 5]} /><meshBasicMaterial color="#aab0c0" /></mesh>;
        const size = item.size ?? 0.5;
        return <mesh position={mid} quaternion={q}><boxGeometry args={[size, a.distanceTo(b), size, 1, Math.max(1, Math.round(a.distanceTo(b) / (size * 2))), 1]} /><meshStandardMaterial color={COLORS.truss} roughness={0.7} wireframe /></mesh>;
    }
    return null;
}

/** One fixture: a small coloured block, and (when previews are on) a cone showing its light. */
function Fixture({ f, beams, scale }) {
    const type = TYPES[f.type];
    const cone = useMemo(() => {
        if (!beams || !type.beam || !f.aim) return null;
        const reach = f.reach ?? type.beam[0];
        const [length, radius] = [reach * scale, type.beam[1] * Math.sqrt(scale) * Math.min(1, reach / type.beam[0] + 0.25)];
        const dir = new THREE.Vector3(...f.aim);
        return {
            length, radius,
            position: new THREE.Vector3(...f.pos).addScaledVector(dir, length / 2),
            quaternion: new THREE.Quaternion().setFromUnitVectors(UP, dir),
        };
    }, [beams, type, f, scale]);
    return (
        <>
            <mesh position={f.pos} rotation={f.rot ?? [0, 0, 0]}>
                <boxGeometry args={type.size} />
                <meshBasicMaterial color={type.color} />
            </mesh>
            {cone && (
                <mesh position={cone.position} quaternion={cone.quaternion}>
                    <cylinderGeometry args={[cone.radius, 0.06, cone.length, 10, 1, true]} />
                    <meshBasicMaterial color={type.color} transparent opacity={f.type === 'laser' ? 0.5 : 0.1} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
                </mesh>
            )}
        </>
    );
}

function ViewRig({ view, controls }) {
    const camera = useThree((s) => s.camera);
    useEffect(() => {
        if (!view) return;
        camera.position.set(...view.pos);
        controls.current?.target.set(...view.target);
        controls.current?.update();
    }, [view, camera, controls]);
    return null;
}

export default function StageBlockout({ stage = 'mainstage' }) {
    const layout = LAYOUTS[stage] ?? mainstage;
    const controls = useRef(null);
    const initial = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const [viewKey, setViewKey] = useState(layout.views[initial?.get('view')] ? initial.get('view') : 'audience');
    const [beams, setBeams] = useState(initial?.get('beams') === '1');
    const [hidden, setHidden] = useState({});
    const [panelOpen, setPanelOpen] = useState(initial?.get('panel') !== '0');
    const view = layout.views[viewKey];

    const counts = useMemo(() => layout.fixtures.reduce((acc, f) => ({ ...acc, [f.type]: (acc[f.type] ?? 0) + 1 }), {}), [layout]);
    const lights = GROUPS[0].types.reduce((n, t) => n + (counts[t] ?? 0), 0);
    const button = (on) => `rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${on ? 'bg-[#ff6a00] text-black' : 'bg-white/10 text-white hover:bg-white/20'}`;

    return (
        <div className="relative h-screen w-full bg-[#05060c]">
            <Canvas camera={{ position: view.pos, fov: 50, near: 0.3, far: 900 }} dpr={[1, 1.5]}>
                <color attach="background" args={['#05060c']} />
                <hemisphereLight args={['#dfe6ff', '#20222b', 1.1]} />
                <directionalLight position={[30, 60, 80]} intensity={1.5} />
                <directionalLight position={[-50, 30, -20]} intensity={0.5} />
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, layout.groundZ ?? 10]}>
                    <planeGeometry args={layout.ground} />
                    <meshStandardMaterial color={COLORS.ground} roughness={1} />
                </mesh>
                {layout.structure.map((item, i) => <Piece key={i} item={item} />)}
                {layout.fixtures.map((f, i) => (hidden[f.type] ? null : <Fixture key={i} f={f} beams={beams} scale={layout.beamScale ?? 1} />))}
                <OrbitControls ref={controls} makeDefault target={view.target} />
                <ViewRig view={view} controls={controls} />
            </Canvas>

            <div className="absolute left-3 top-3 max-h-[calc(100vh-1.5rem)] w-[19rem] overflow-y-auto rounded-xl border border-white/10 bg-black/75 p-3 text-white backdrop-blur">
                <div className="flex items-start justify-between gap-2">
                    <h1 className="text-sm font-bold">{layout.title} <span className="font-normal text-white/60">· {layout.subtitle}</span></h1>
                    <button type="button" className={button(false)} onClick={() => setPanelOpen((o) => !o)}>{panelOpen ? 'Hide' : 'Show'}</button>
                </div>
                {panelOpen && (
                    <>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {Object.keys(LAYOUTS).map((key) => (
                                <Link key={key} href={`/lab/${key}`} className={button(key === layout.key)}>{LAYOUTS[key].title}</Link>
                            ))}
                        </div>
                        <p className="mt-3 text-[11px] uppercase tracking-wider text-white/50">View</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                            {Object.entries(layout.views).map(([key, v]) => (
                                <button key={key} type="button" className={button(viewKey === key)} onClick={() => setViewKey(key)}>{v.label}</button>
                            ))}
                        </div>
                        <div className="mt-2">
                            <button type="button" className={button(beams)} onClick={() => setBeams((b) => !b)}>Preview the light beams</button>
                        </div>
                        {GROUPS.map((group) => (
                            <div key={group.label}>
                                <p className="mt-3 text-[11px] uppercase tracking-wider text-white/50">{group.label}{group.label === 'Lights' ? ` · ${lights} in all` : ''} (click to hide)</p>
                                <ul className="mt-1 space-y-0.5">
                                    {group.types.filter((t) => counts[t]).map((t) => (
                                        <li key={t}>
                                            <button type="button" onClick={() => setHidden((h) => ({ ...h, [t]: !h[t] }))}
                                                className={`flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-white/10 ${hidden[t] ? 'opacity-40' : ''}`}>
                                                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: TYPES[t].color }} />
                                                <span className="flex-1">{TYPES[t].label}</span>
                                                <span className="tabular-nums text-white/70">{counts[t]}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                        <ul className="mt-3 space-y-1 border-t border-white/10 pt-2 text-[11px] text-white/65">
                            {layout.notes.map((n) => <li key={n}>{n}</li>)}
                        </ul>
                    </>
                )}
            </div>
        </div>
    );
}
