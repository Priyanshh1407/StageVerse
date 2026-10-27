'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import Beams from './Beams';
import LedWall from './LedWall';
import Crowd from './Crowd';
import Lasers from './Lasers';
import Blinders from './Blinders';
import Haze from './Haze';
import { createTrussGeometry } from './trussGeometry';
import { createBackdropMaterial, createFloorMaterial } from './stageMaterials';

/**
 * Everything on stage, for use inside a <Canvas>: backdrop, deck, truss, fixtures and beams,
 * LED screens and the crowd. The camera and controls belong to whoever renders this (the lab
 * uses orbit controls; the homepage drives the camera from scroll).
 *
 * Draw calls: backdrop 1, floor 1, deck 1, truss 1, fixtures 4, screens 3, haze 3, crowd 1 = 15, plus
 * lasers and blinders (1 each, skipped while off) and the bloom passes.
 */

/**
 * The only real lights: a dim front fill so the steel has detail, and a coloured "bounce" from
 * below (beams hitting the floor and the crowd) that tints the undersides the camera looks up at.
 */
function StageLights({ look }) {
    const bounce = useRef();
    const colors = useRef({ a: new THREE.Color(), b: new THREE.Color() });
    useFrame(() => {
        if (!bounce.current) return;
        const target = look.current;
        const { a, b } = colors.current;
        bounce.current.color.copy(a.set(target.colorA).lerp(b.set(target.colorB), 0.5));
        bounce.current.intensity = (target.master ?? 1) * Math.min(target.intensity, 1.4) * 1.4 + (target.blinder ?? 0) * 2;
    });
    return (
        <>
            <hemisphereLight args={['#5a6688', '#05060a', 0.5]} />
            <directionalLight position={[0, 3, 30]} intensity={0.35} color="#c8d4ff" />
            <directionalLight ref={bounce} position={[0, -6, 10]} intensity={1} />
        </>
    );
}

/** Arena floor, lit by the stage's spill in the show's colours. */
function Floor({ look }) {
    const material = useMemo(() => createFloorMaterial(), []);
    const mesh = useRef();
    useFrame(() => {
        if (!mesh.current) return;
        const target = look.current;
        const u = mesh.current.material.uniforms;
        u.uColorA.value.set(target.colorA);
        u.uColorB.value.set(target.colorB);
        u.uLight.value = (target.master ?? 1) * Math.min(target.intensity, 1.4) * (1 + (target.pulse ?? 0) * 0.4) + (target.blinder ?? 0);
    });
    return (
        <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 4]} material={material}>
            <planeGeometry args={[90, 50]} />
        </mesh>
    );
}

export default function StageScene({ beams, bloom, look, events = [], crowdSeed = 7, lasers = 24, blinders = 8 }) {
    const truss = useMemo(() => createTrussGeometry(), []);
    const backdrop = useMemo(() => createBackdropMaterial(), []);

    return (
        <>
            <color attach="background" args={['#010208']} />
            <StageLights look={look} />

            <mesh position={[0, 12, -16]} material={backdrop}>
                <planeGeometry args={[80, 34]} />
            </mesh>
            <Floor look={look} />
            {/* Stage deck */}
            <mesh position={[0, 0.25, -7]}>
                <boxGeometry args={[30, 0.5, 14]} />
                <meshLambertMaterial color="#14161d" />
            </mesh>

            <mesh geometry={truss}>
                <meshLambertMaterial color="#565c69" emissive="#040507" />
            </mesh>

            <LedWall look={look} events={events} />
            <Beams count={beams} look={look} />
            <Lasers look={look} count={lasers} />
            <Blinders look={look} count={blinders} />
            <Haze look={look} />
            <Crowd seed={crowdSeed} look={look} />

            {bloom && (
                <EffectComposer multisampling={0}>
                    <Bloom mipmapBlur luminanceThreshold={0.3} luminanceSmoothing={0.2} intensity={0.9} radius={0.75} resolutionScale={0.5} />
                </EffectComposer>
            )}
        </>
    );
}
