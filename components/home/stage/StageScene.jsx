'use client';

import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom, SMAA } from '@react-three/postprocessing';
import Fixtures from './Fixtures';
import Strobes from './Strobes';
import LedWall from './LedWall';
import Lasers from './Lasers';
import Blinders from './Blinders';
import Haze from './Haze';
import HouseLights, { HOUSE_COLOR } from './HouseLights';
import Venue from './Venue';
import Rain from './Rain';
import { createTrussGeometry } from './trussGeometry';
import { createBackdropMaterial, createFloorMaterial } from './stageMaterials';
import { roomFlash } from './flash';

/**
 * Everything on stage, for use inside a <Canvas>: backdrop, floor, deck, truss, the moving heads
 * (grouped by job: aerial, sides, floor, wash), strobes, LED screens, lasers, blinders, haze and
 * house lights. The camera and controls belong to whoever renders this (the lab uses orbit
 * controls; the homepage drives the camera from scroll).
 *
 * Draw calls: backdrop, floor, deck, truss (4) + 4 fixture groups x 5 (20) + strobes 1 + screens 3
 * + haze 3 = 31, plus lasers, blinders and house lights (1 each, skipped while off) and bloom.
 */

/**
 * The only real lights: a dim front fill so the steel has detail, a coloured "bounce" from below
 * (beams hitting the floor) that tints the undersides the camera looks up at, and warm house light.
 */
function StageLights({ look, blinders }) {
    const bounce = useRef();
    const hemi = useRef();
    const colors = useRef({ a: new THREE.Color(), b: new THREE.Color(), cool: new THREE.Color('#5a6688'), warm: new THREE.Color(HOUSE_COLOR), white: new THREE.Color('#ffffff') });
    useFrame(({ clock }) => {
        if (!bounce.current) return;
        const target = look.current;
        const { a, b, cool, warm, white } = colors.current;
        const flash = roomFlash(target, clock.elapsedTime, blinders).total;
        bounce.current.color.copy(a.set(target.colorA).lerp(b.set(target.colorB), 0.5)).lerp(white, Math.min(1, flash));
        bounce.current.intensity = (target.master ?? 1) * Math.min(target.intensity, 1.4) * 1.4 + flash * 6;
        const house = target.house ?? 0;
        hemi.current.color.copy(cool).lerp(warm, house).lerp(white, Math.min(1, flash));
        hemi.current.intensity = 0.5 + house * 1.2 + flash * 5; // a strobe hit lights every surface
    });
    return (
        <>
            <hemisphereLight ref={hemi} args={['#5a6688', '#05060a', 0.5]} />
            <directionalLight position={[0, 3, 30]} intensity={0.35} color="#c8d4ff" />
            <directionalLight ref={bounce} position={[0, -6, 10]} intensity={1} />
        </>
    );
}

const SKY_VERTEX = /* glsl */ `
    varying vec3 vDir;
    void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const SKY_FRAGMENT = /* glsl */ `
    varying vec3 vDir;
    void main() {
        float up = clamp(vDir.y, 0.0, 1.0);
        vec3 horizon = vec3(0.045, 0.06, 0.13);
        vec3 zenith = vec3(0.008, 0.01, 0.025);
        gl_FragColor = vec4(mix(horizon, zenith, pow(up, 0.45)), 1.0);
    }
`;

/** Arena floor: spill from the stage in the show's colours, warm when the house lights are up. */
function Floor({ look, blinders }) {
    const material = useMemo(() => createFloorMaterial(), []);
    const mesh = useRef();
    useFrame(({ clock }, delta) => {
        if (!mesh.current) return;
        const target = look.current;
        const u = mesh.current.material.uniforms;
        u.uColorA.value.set(target.colorA);
        u.uColorB.value.set(target.colorB);
        u.uLight.value = (target.master ?? 1) * Math.min(target.intensity, 1.4) * (1 + (target.pulse ?? 0) * 0.4);
        u.uHouse.value += ((target.house ?? 0) - u.uHouse.value) * Math.min(1, delta * 1.5);
        u.uFlash.value = roomFlash(target, clock.elapsedTime, blinders).total;
    });
    return (
        <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 24]} material={material}>
            <planeGeometry args={[100, 90]} />
        </mesh>
    );
}

/** The stage deck: dark, tinted by the washes that light it. */
function Deck({ look }) {
    const mesh = useRef();
    const color = useRef(new THREE.Color());
    useFrame(() => {
        if (!mesh.current) return;
        const target = look.current;
        const level = (target.master ?? 1) * (target.wash ?? 0) * Math.min(target.intensity, 1.4);
        mesh.current.material.emissive.copy(color.current.set(target.washColor ?? '#3b5bff')).multiplyScalar(0.12 * level);
    });
    return (
        <mesh ref={mesh} position={[0, 0.25, -7]}>
            <boxGeometry args={[30, 0.5, 14]} />
            <meshLambertMaterial color="#14161d" />
        </mesh>
    );
}

/**
 * The camera's exposure blowing out on a strobe or blinder hit: a white veil over the whole view,
 * like a phone filming a strobe. Rides in front of the camera; drawn last, no depth test.
 */
function CameraFlash({ look, blinders }) {
    const mesh = useRef();
    useFrame(({ camera, clock }) => {
        if (!mesh.current) return;
        const level = roomFlash(look.current, clock.elapsedTime, blinders).total;
        mesh.current.visible = level > 0.01;
        if (!mesh.current.visible) return;
        mesh.current.material.opacity = Math.min(0.9, level * 0.5);
        camera.updateMatrixWorld();
        mesh.current.position.set(0, 0, -1).applyMatrix4(camera.matrixWorld);
        mesh.current.quaternion.copy(camera.quaternion);
    });
    return (
        <mesh ref={mesh} renderOrder={1000} frustumCulled={false} visible={false}>
            <planeGeometry args={[4, 4]} />
            <meshBasicMaterial color="#fff8ee" transparent opacity={0} depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
    );
}

export default function StageScene({ beams, bloom, look, events = [], lasers = 24, blinders = 8, screen, font }) {
    const truss = useMemo(() => createTrussGeometry(), []);
    const backdrop = useMemo(() => createBackdropMaterial(), []);

    return (
        <>
            <color attach="background" args={['#010208']} />
            {/* Night sky: deep navy at the horizon, near-black overhead */}
            <mesh>
                <sphereGeometry args={[180, 24, 12]} />
                <shaderMaterial side={THREE.BackSide} depthWrite={false} vertexShader={SKY_VERTEX} fragmentShader={SKY_FRAGMENT} />
            </mesh>
            <StageLights look={look} blinders={blinders} />

            <mesh position={[0, 12, -16]} material={backdrop}>
                <planeGeometry args={[80, 34]} />
            </mesh>
            <Floor look={look} blinders={blinders} />
            <Deck look={look} />
            <mesh geometry={truss}>
                <meshLambertMaterial color="#565c69" emissive="#040507" />
            </mesh>

            <LedWall look={look} events={events} screen={screen} font={font} />
            <Venue look={look} font={font} />
            <Rain />
            {/* Fixture models stream in; the rest of the stage shows meanwhile */}
            <Suspense fallback={null}>
                <Fixtures count={beams} look={look} />
                <Strobes count={beams} look={look} />
            </Suspense>
            <Lasers look={look} count={lasers} />
            <Blinders look={look} count={blinders} />
            <HouseLights look={look} />
            <Haze look={look} blinders={blinders} />
            <CameraFlash look={look} blinders={blinders} />

            {bloom && (
                <EffectComposer multisampling={0}>
                    <Bloom mipmapBlur luminanceThreshold={0.3} luminanceSmoothing={0.2} intensity={0.9} radius={0.75} resolutionScale={0.5} />
                    {/* Edge anti-aliasing: without it thin truss bracing and fixture details sparkle */}
                    <SMAA />
                </EffectComposer>
            )}
        </>
    );
}
