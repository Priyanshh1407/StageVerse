'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom, SMAA } from '@react-three/postprocessing';
import Fixtures from './Fixtures';
import Strobes from './Strobes';
import LedWall from './LedWall';
import PixelBars from './PixelBars';
import Lasers from './Lasers';
import Haze from './Haze';
import HouseLights, { HOUSE_COLOR } from './HouseLights';
import Venue from './Venue';
import StageSkirt from './StageSkirt';
import CrowdBarrier from './CrowdBarrier';
import LowFog from './LowFog';
import PaSystem from './PaSystem';
import Co2Jets from './Co2Jets';
import Flames from './Flames';
import { createTrussGeometry, DECK_DEPTH, DECK_HEIGHT, SCREEN_Z } from './trussGeometry';
import { createBackdropMaterial, createFloorMaterial } from './stageMaterials';
import { FIRE_COLOR, roomFlash } from './flash';

/**
 * Everything on stage, for use inside a <Canvas>: backdrop, floor, deck, truss, the moving heads
 * (grouped by job: aerial, sides, floor, wash), strobes (also the blinders), LED screens, lasers, haze and
 * house lights. The camera and controls belong to whoever renders this (the lab uses orbit
 * controls; the homepage drives the camera from scroll).
 *
 * Draw calls: backdrop, floor, deck, truss (4) + 4 fixture groups x 5 (20) + strobes 1 + screens 3
 * + haze 3 + pixel bars 1 + strobe glow 1 + PA 3 + skirt 2 + barrier 1 + low fog 2 + CO2 nozzles 1 + flame units 1 (these a moment after the
 * first frames) = 43, plus lasers and house lights (1 each, skipped while off), the CO2 plumes and the flames (1 each,
 * zero instances while idle)
 * and bloom.
 */

/**
 * The only real lights: a dim front fill so the steel has detail, a coloured "bounce" from below
 * (beams hitting the floor) that tints the undersides the camera looks up at, and warm house light.
 */
function StageLights({ look, blinders }) {
    const bounce = useRef();
    const hemi = useRef();
    const colors = useRef({ a: new THREE.Color(), b: new THREE.Color(), cool: new THREE.Color('#5a6688'), warm: new THREE.Color(HOUSE_COLOR), white: new THREE.Color('#ffffff'), fire: new THREE.Color(FIRE_COLOR) });
    useFrame(({ clock }) => {
        if (!bounce.current) return;
        const target = look.current;
        const { a, b, cool, warm, white, fire: fireColor } = colors.current;
        const { total: flash, fire } = roomFlash(target, clock.elapsedTime, blinders);
        bounce.current.color.copy(a.set(target.colorA).lerp(b.set(target.colorB), 0.5)).lerp(fireColor, Math.min(1, fire * 1.2)).lerp(white, Math.min(1, flash));
        bounce.current.intensity = (target.master ?? 1) * Math.min(target.intensity, 1.4) * 1.4 + flash * 6 + fire * 5;
        const house = target.house ?? 0;
        hemi.current.color.copy(cool).lerp(warm, house).lerp(fireColor, Math.min(1, fire * 0.7)).lerp(white, Math.min(1, flash));
        hemi.current.intensity = 0.5 + house * 2.2 + flash * 5 + fire * 1.8; // a strobe hit lights every surface; so does the fire
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

/** Arena floor: glossy black reflecting the stage, fading to dark near the camera, warm when the house lights are up. */
function Floor({ look, blinders }) {
    const material = useMemo(() => createFloorMaterial(), []);
    const mesh = useRef();
    useFrame(({ clock }, delta) => {
        if (!mesh.current) return;
        const target = look.current;
        const u = mesh.current.material.uniforms;
        u.uColorA.value.set(target.colorA);
        u.uColorB.value.set(target.colorB);
        // Light only reaches the audience floor from the aerial moving heads, and only when they point
        // down toward the crowd: lifted into the sky (tiltShift > 0.4) or converging over the stage,
        // they don't. Floor fixtures, lasers, towers and washes never light it.
        const master = (target.master ?? 1) * Math.min(target.intensity, 1.4);
        const down = Math.min(1, Math.max(0, (0.4 - (target.tiltShift ?? 0)) / 0.6)) * (1 - Math.min(1, target.converge ?? 0));
        const wanted = master * (target.beams ?? 0) * down * (1 + (target.pulse ?? 0) * 0.4);
        u.uLight.value += (wanted - u.uLight.value) * Math.min(1, delta * 4);
        u.uWall.value = master * 0.25;
        u.uHouse.value += ((target.house ?? 0) - u.uHouse.value) * Math.min(1, delta * 1.5);
        const flash = roomFlash(target, clock.elapsedTime, blinders);
        u.uFlash.value = flash.total;
        u.uFire.value = flash.fire;
        u.uTime.value = clock.elapsedTime;
    });
    return (
        <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 24]} material={material}>
            <planeGeometry args={[100, 90]} />
        </mesh>
    );
}

/** The stage deck: dark, tinted by the washes that light it. */
const fireColor = new THREE.Color();

function Deck({ look }) {
    const mesh = useRef();
    const color = useRef(new THREE.Color());
    useFrame(() => {
        if (!mesh.current) return;
        const target = look.current;
        const level = (target.master ?? 1) * (target.wash ?? 0) * Math.min(target.intensity, 1.4);
        mesh.current.material.emissive.copy(color.current.set(target.washColor ?? '#3b5bff')).multiplyScalar(0.12 * level);
        const fire = roomFlash(target, 0).fire;
        if (fire > 0) mesh.current.material.emissive.lerp(fireColor.set(FIRE_COLOR).multiplyScalar(0.35), Math.min(1, fire));
    });
    return (
        <mesh ref={mesh} position={[0, DECK_HEIGHT / 2, -DECK_DEPTH / 2]}>
            <boxGeometry args={[30, DECK_HEIGHT, DECK_DEPTH]} />
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

/**
 * The stage dressing (skirt, crowd barrier, PA, low fog) comes in a moment after the rig's first
 * frames, when the browser is idle: the stage shows sooner, and building and compiling these
 * doesn't add to the freeze while the page starts.
 */
function useAfterFirstFrames(ms = 1200) {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        let idle;
        const timer = setTimeout(() => {
            if ('requestIdleCallback' in window) idle = window.requestIdleCallback(() => setReady(true), { timeout: 1500 });
            else setReady(true);
        }, ms);
        return () => {
            clearTimeout(timer);
            if (idle) window.cancelIdleCallback(idle);
        };
    }, [ms]);
    return ready;
}

/**
 * Shows its children only once their shaders are compiled. The GPU driver compiles in parallel
 * (KHR_parallel_shader_compile) while the group stays hidden, instead of the page freezing at the
 * first frame that draws them (over a second on integrated graphics). The lights stay outside, so
 * the lit materials compile for the lights the stage really has.
 */
function Warm({ children }) {
    const group = useRef();
    const { gl, camera, scene } = useThree();
    const [ready, setReady] = useState(false);
    useEffect(() => {
        let alive = true;
        const done = () => { if (alive) setReady(true); };
        let timer;
        if (group.current) {
            // Shaders differ when drawn into an offscreen buffer (bloom renders the stage into one:
            // no tone mapping, linear colour) and straight to the screen (bloom off after a quality
            // step-down). Start both compiles (they run in parallel, off the main thread), then poll
            // until they're linked. (three's compileAsync crashed when a material was replaced while
            // compiling, e.g. the LED wall redrawn once its fonts load, and then never resolved.)
            const offscreen = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
            const previous = gl.getRenderTarget();
            const materials = new Set();
            try {
                gl.setRenderTarget(offscreen);
                gl.compile(group.current, camera, scene).forEach((m) => materials.add(m));
                gl.setRenderTarget(previous);
                gl.compile(group.current, camera, scene).forEach((m) => materials.add(m));
            } catch {
                gl.setRenderTarget(previous);
            }
            offscreen.dispose();
            const started = performance.now();
            const poll = () => {
                if (!alive) return;
                let ready = true;
                for (const m of materials) {
                    const program = gl.properties.get(m)?.currentProgram;
                    if (program && !program.isReady()) { ready = false; break; }
                }
                // shown at the latest after 4 s, whatever the driver says
                if (ready || performance.now() - started > 4000) done();
                else timer = setTimeout(poll, 30);
            };
            poll();
        }
        return () => { alive = false; clearTimeout(timer); };
    }, [gl, camera, scene]);
    return <group ref={group} visible={ready}>{children}</group>;
}

export default function StageScene({ beams, bloom, look, events = [], lasers = 40, blinders = 8, screen, font, logoFonts, effects = 'low' }) {
    const dressed = useAfterFirstFrames();
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

            <Warm>
                <mesh position={[0, 12, SCREEN_Z - 2.8]} material={backdrop}>
                    <planeGeometry args={[80, 34]} />
                </mesh>
                <Floor look={look} blinders={blinders} />
                <Deck look={look} />
                <mesh geometry={truss}>
                    <meshLambertMaterial color="#565c69" emissive="#040507" />
                </mesh>
                <LedWall look={look} events={events} screen={screen} font={font} logoFonts={logoFonts} />
                <PixelBars look={look} />
                <Venue look={look} font={font} logoFonts={logoFonts} />
                <Lasers look={look} count={lasers} fixtures={beams} />
                <HouseLights look={look} />
                <Haze look={look} blinders={blinders} />
            </Warm>
            {/* Fixture models stream in; the rest of the stage shows meanwhile */}
            <Suspense fallback={null}>
                <Warm>
                    <Fixtures count={beams} look={look} />
                    <Strobes count={beams} look={look} blinders={blinders} />
                </Warm>
            </Suspense>
            {dressed && (
                <Warm>
                    <StageSkirt look={look} blinders={blinders} />
                    <CrowdBarrier />
                    <PaSystem />
                    <LowFog look={look} blinders={blinders} />
                    <Co2Jets look={look} count={beams} quality={effects} blinders={blinders} />
                    <Flames look={look} count={beams} quality={effects} />
                </Warm>
            )}
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
