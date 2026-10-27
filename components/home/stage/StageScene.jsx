'use client';

import { useMemo } from 'react';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import Beams from './Beams';
import LedWall from './LedWall';
import Crowd from './Crowd';
import Lasers from './Lasers';
import Blinders from './Blinders';
import { createTrussGeometry } from './trussGeometry';
import { createBackdropMaterial } from './stageMaterials';

/**
 * Everything on stage, for use inside a <Canvas>: backdrop, deck, truss, fixtures and beams,
 * LED screens and the crowd. The camera and controls belong to whoever renders this (the lab
 * uses orbit controls; the homepage drives the camera from scroll).
 *
 * Draw calls: backdrop 1, floor 1, deck 1, truss 1, fixtures 4, screens 3, crowd 1 = 12, plus lasers
 * and blinders (1 each, skipped while off) and the bloom passes.
 */
export default function StageScene({ beams, bloom, look, events = [], crowdSeed = 7, lasers = 24, blinders = 8 }) {
    const truss = useMemo(() => createTrussGeometry(), []);
    const backdrop = useMemo(() => createBackdropMaterial(), []);

    return (
        <>
            <color attach="background" args={['#010208']} />
            {/* One cheap light for the Lambert surfaces (truss, deck, fixture bases) */}
            <hemisphereLight args={['#8090ff', '#101220', 1.6]} />

            <mesh position={[0, 12, -16]} material={backdrop}>
                <planeGeometry args={[80, 34]} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 4]}>
                <planeGeometry args={[90, 50]} />
                <meshBasicMaterial color="#03040a" />
            </mesh>
            {/* Stage deck */}
            <mesh position={[0, 0.25, -7]}>
                <boxGeometry args={[30, 0.5, 14]} />
                <meshLambertMaterial color="#0d0f16" />
            </mesh>

            <mesh geometry={truss}>
                <meshLambertMaterial color="#7d8597" emissive="#141824" />
            </mesh>

            <LedWall look={look} events={events} />
            <Beams count={beams} look={look} />
            <Lasers look={look} count={lasers} />
            <Blinders look={look} count={blinders} />
            <Crowd seed={crowdSeed} look={look} />

            {bloom && (
                <EffectComposer multisampling={0}>
                    <Bloom mipmapBlur luminanceThreshold={0.2} intensity={1.1} resolutionScale={0.5} />
                </EffectComposer>
            )}
        </>
    );
}
