'use client';

import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, SMAA } from '@react-three/postprocessing';
import { Orbitron } from 'next/font/google';
import * as THREE from 'three';
import Haze from '../Haze';
import Performer from '../Performer';
import LowFog from '../LowFog';
import { createFloorMaterial } from '../stageMaterials';
import { logoTag, logoScript } from '@/components/brand/Logo';
import { roomFlash } from '../flash';
import { placeFirework, rigHeads, stageMounts } from '@/lib/show/stages/rig';
import { widthOf } from '@/lib/show/stages';
import { StagePixelBars, StageScreens, StageStructure } from './StageBuild';
import StageHeads from './StageHeads';
import StageStrobes from './StageStrobes';
import StageLasers from './StageLasers';
import StageCo2 from './StageCo2';
import StageConfetti from './StageConfetti';
import StageStreamers from './StageStreamers';
import StageFireworks from './StageFireworks';
import StageCrowd from './StageCrowd';
import StagePa from './StagePa';
import StageBarrier from './StageBarrier';
import StageLedWall from './StageLedWall';
import StageLogo from './StageLogo';
import { clubLook, onlyGroup } from '@/lib/show/stages/club';

// One festival stage, lit and running, for use inside a <Canvas>: built entirely from its definition
// (lib/show/stages). The homepage does not use this yet: it renders on the /lab stage pages only.

// The wall's wordmark is drawn in the logo's faces (as on the homepage's LED wall)
const orbitron = Orbitron({ subsets: ['latin'], weight: ['700', '900'], display: 'swap' });
const LOGO_FONTS = { tag: logoTag.style.fontFamily, script: logoScript.style.fontFamily };
const PIXEL = 0.11; // LED pixel pitch on the walls (m), as on the homepage

/** The stage's LED walls that carry the wordmark and visuals (the homepage's wall shader), from its pieces. */
function ledWalls(stage) {
    return stage.screens.filter((p) => p.ledWall && p.kind === 'box').map((p, i) => ({
        key: p.ledWall,
        position: [p.position[0], p.position[1], p.position[2] + p.size[2] / 2 + 0.01],
        rotation: [0, 0, 0],
        size: [p.size[0], p.size[1]],
        grid: [Math.round(p.size[0] / PIXEL), Math.round(p.size[1] / PIXEL)],
        text: p.ledWall === 'main',
        seed: i * 3,
    }));
}

const NIGHT = [new THREE.Color('#0b0f21'), new THREE.Color('#020309')];
const DUSK = [new THREE.Color('#ff8a4a'), new THREE.Color('#3d1a5c')];

const SKY_VERTEX = /* glsl */ `
    varying vec3 vDir;
    void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const SKY_FRAGMENT = /* glsl */ `
    uniform vec3 uHorizon;
    uniform vec3 uZenith;
    varying vec3 vDir;
    void main() {
        float up = clamp(vDir.y, 0.0, 1.0);
        gl_FragColor = vec4(mix(uHorizon, uZenith, pow(up, 0.45)), 1.0);
    }
`;

/**
 * The sky: night, or (the desert stage) a sunset that darkens to night as a song builds: sunset at
 * the start, night by the first peak, and it stays night for the rest of the song.
 */
function Sky({ kind, look }) {
    const material = useMemo(() => new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT,
        uniforms: { uHorizon: { value: NIGHT[0].clone() }, uZenith: { value: NIGHT[1].clone() } },
    }), []);
    const mesh = useRef();
    const dusk = useRef(1);
    useFrame((_, delta) => {
        if (!mesh.current) return;
        const target = look.current;
        let want = 0;
        if (kind === 'dusk') {
            const playing = target.beatPos !== undefined;
            // during a song the sky only ever gets darker; without one it rests at a deep sunset
            want = playing ? Math.min(dusk.current, 1 - Math.min(1, (target.crowd ?? 0) * 1.2)) : 0.75;
            if (!playing && dusk.current < 0.75) want = 0.75;
        }
        dusk.current += (want - dusk.current) * Math.min(1, delta * 0.5);
        const u = mesh.current.material.uniforms;
        u.uHorizon.value.copy(NIGHT[0]).lerp(DUSK[0], dusk.current);
        u.uZenith.value.copy(NIGHT[1]).lerp(DUSK[1], dusk.current * 0.7);
    });
    return <mesh ref={mesh} material={material}><sphereGeometry args={[400, 24, 12]} /></mesh>;
}

/** A dim front fill, a coloured bounce from below, and the flash of strobes and blinders. */
function Lights({ look, blinders }) {
    const bounce = useRef();
    const hemi = useRef();
    const tmp = useRef({ a: new THREE.Color(), b: new THREE.Color(), white: new THREE.Color('#ffffff'), warm: new THREE.Color('#ffb347'), cool: new THREE.Color('#5a6688') });
    useFrame(({ clock }) => {
        if (!bounce.current) return;
        const target = look.current;
        const { a, b, white, warm, cool } = tmp.current;
        const flash = roomFlash(target, clock.elapsedTime, blinders).total;
        bounce.current.color.copy(a.set(target.colorA).lerp(b.set(target.colorB), 0.5)).lerp(white, Math.min(1, flash));
        bounce.current.intensity = (target.master ?? 1) * Math.min(target.intensity ?? 1, 1.4) * 1.4 + flash * 6;
        const house = target.house ?? 0;
        hemi.current.color.copy(cool).lerp(warm, house).lerp(white, Math.min(1, flash));
        hemi.current.intensity = 0.5 + house * 2.2 + flash * 5;
    });
    return (
        <>
            <hemisphereLight ref={hemi} args={['#5a6688', '#05060a', 0.5]} />
            <directionalLight position={[0, 3, 30]} intensity={0.35} color="#c8d4ff" />
            <directionalLight ref={bounce} position={[0, -6, 10]} intensity={1} />
        </>
    );
}

/** The glossy floor of the homepage's arena, under this stage's crowd: it reflects the show and pools where beams land. */
function Floor({ look, blinders, width, z }) {
    const material = useMemo(() => createFloorMaterial(), []);
    const mesh = useRef();
    useFrame(({ clock }, delta) => {
        if (!mesh.current) return;
        const target = look.current;
        const u = mesh.current.material.uniforms;
        u.uColorA.value.set(target.colorA);
        u.uColorB.value.set(target.colorB);
        const master = (target.master ?? 1) * Math.min(target.intensity ?? 1, 1.4);
        const down = Math.min(1, Math.max(0, (0.4 - (target.tiltShift ?? 0)) / 0.6)) * (1 - Math.min(1, target.converge ?? 0));
        u.uLight.value += (master * (target.beams ?? 0) * down * (1 + (target.pulse ?? 0) * 0.4) - u.uLight.value) * Math.min(1, delta * 4);
        u.uWall.value = master * 0.25;
        u.uHouse.value += ((target.house ?? 0) - u.uHouse.value) * Math.min(1, delta * 1.5);
        u.uFlash.value = roomFlash(target, clock.elapsedTime, blinders).total;
        u.uTime.value = clock.elapsedTime;
    });
    return (
        <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, z]} material={material}>
            <planeGeometry args={[width, 70]} />
        </mesh>
    );
}

/** The camera's exposure blowing out on a strobe or blinder hit (as on the homepage): a white veil over the view. */
function cameraFlash(mesh, look, camera, time, blinders) {
    const level = roomFlash(look.current, time, blinders).total;
    mesh.visible = level > 0.01;
    if (!mesh.visible) return;
    mesh.material.opacity = Math.min(0.9, level * 0.5);
    camera.updateMatrixWorld();
    mesh.position.set(0, 0, -1).applyMatrix4(camera.matrixWorld);
    mesh.quaternion.copy(camera.quaternion);
}

function CameraFlash({ look, blinders }) {
    const mesh = useRef();
    useFrame(({ camera, clock }) => mesh.current && cameraFlash(mesh.current, look, camera, clock.elapsedTime, blinders));
    return (
        <mesh ref={mesh} renderOrder={1000} frustumCulled={false} visible={false}>
            <planeGeometry args={[4, 4]} />
            <meshBasicMaterial color="#fff8ee" transparent opacity={0} depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
    );
}

/** Indoors there are no fireworks: while one would be in the air, the strobes and blinders fire instead. */
function indoorPyro(look, time) {
    const fw = look.current.fireworks;
    if (!fw?.length) return;
    const burst = fw.some((f) => (f.age ?? 0) < 1.2);
    look.current = { ...look.current, fireworks: undefined, strobe: Math.max(look.current.strobe ?? 0, burst ? 1 : 0.4), blinder: Math.max(look.current.blinder ?? 0, burst && Math.floor(time * 4) % 2 ? 0.8 : 0) };
}

function IndoorPyro({ look }) {
    useFrame(({ clock }) => indoorPyro(look, clock.elapsedTime));
    return null;
}

/** The warehouse: every moment of the show as a club look (lib/show/stages/club.js). */
function toClub(look) {
    look.current = onlyGroup(clubLook(look.current), look.current.only);
}

function ClubLooks({ look }) {
    useFrame(() => toClub(look));
    return null;
}

export default function FestivalScene({ stage, look, count = 96, bloom = true, quality = 'low', control }) {
    const heads = useMemo(() => rigHeads(stage, count), [stage, count]);
    const mounts = useMemo(() => stageMounts(stage), [stage]);
    const place = useMemo(() => (f) => placeFirework(stage, f), [stage]);
    const width = widthOf(stage);
    const blinders = mounts.strobes.length;
    // the homepage's haze is sized for its 40 m stage: stretched to this one's width and depth
    const hazeScale = [width / 40, stage.indoor ? 0.6 : 1, Math.max(1, -stage.focus[2] / 8)];
    const walls = useMemo(() => ledWalls(stage), [stage]);
    // the performer set, scaled (bigger than life on the big stages) with its feet kept on the deck
    const ps = stage.performerScale ?? 1;
    const [px, py, pz] = stage.performerAt;
    const blinding = Math.min(16, blinders);

    return (
        <>
            {stage.indoor && <IndoorPyro look={look} />}
            {stage.club && <ClubLooks look={look} />}
            <color attach="background" args={[stage.indoor ? '#010103' : '#010208']} />
            {!stage.indoor && <Sky kind={stage.sky} look={look} />}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 20]}>
                <planeGeometry args={[600, 600]} />
                <meshLambertMaterial color="#07080b" />
            </mesh>
            <Lights look={look} blinders={blinders} />

            <StageStructure stage={stage} />
            <StageScreens stage={stage} look={look} />
            {walls.length > 0 && <StageLedWall screens={walls} look={look} font={orbitron.style.fontFamily} logoFonts={LOGO_FONTS} />}
            <Floor look={look} blinders={blinding} width={Math.max(120, width * 2.6)} z={stage.crowd.z0 + 30} />
            {stage.pa && <StagePa settings={stage.pa} />}
            {stage.barrier && <StageBarrier width={stage.barrier.width} z={stage.barrier.z} />}
            <group position={[0, stage.deck - 1.8, stage.focus[2] + 8]} scale={[width / 40, 1, 1]}>
                <LowFog look={look} blinders={blinding} />
            </group>
            <StagePixelBars stage={stage} look={look} />
            <Suspense fallback={null}>
                <StageHeads heads={heads} look={look} focus={stage.focus} screenBeamsX={stage.screenBeamsX} />
                <StageStrobes positions={mounts.strobes} look={look} blinders={Math.min(16, blinders)} />
            </Suspense>
            <StageLasers look={look} projectors={mounts.lasers} pitch={stage.laserPitch ?? null} />
            {stage.logo && <StageLogo position={stage.logo.position} size={stage.logo.size} logoFonts={LOGO_FONTS} />}
            <group position={[0, 0, stage.focus[2] + 8 * hazeScale[2]]} scale={hazeScale}>
                <Haze look={look} blinders={Math.min(16, blinders)} />
            </group>
            <group position={[px, py + 1.8 - 1.8 * ps, pz]} scale={ps}>
                <Performer look={look} control={control} />
            </group>
            <StageCrowd look={look} area={stage.crowd} quality={quality} blinders={Math.min(16, blinders)} />

            <StageCo2 look={look} jets={mounts.floorJets} quality={quality} blinders={blinders} mount="floor" />
            <StageCo2 look={look} jets={mounts.highJets} quality={quality} blinders={blinders} mount="truss" />
            {stage.co2Extra && <StageCo2 look={look} jets={stage.co2Extra.map((j) => ({ pos: j.pos, dir: [0, 0.999, 0.05] }))} follow={stage.co2Extra.map((j) => j.follow)} quality={quality} blinders={blinders} mount="floor" />}
            {stage.confetti !== false && (
                <>
                    <StageConfetti look={look} cannons={mounts.cannons} quality={quality} blinders={blinders} />
                    <StageCo2 look={look} jets={mounts.cannons} quality={quality} blinders={blinders} mount="confetti" />
                    <StageStreamers look={look} launchers={mounts.launchers} quality={quality} blinders={blinders} />
                </>
            )}
            {stage.fireworks && <StageFireworks look={look} spots={mounts.mines} place={place} quality={quality} />}

            <CameraFlash look={look} blinders={blinding} />
            {bloom && (
                <EffectComposer multisampling={0}>
                    <Bloom mipmapBlur luminanceThreshold={0.3} luminanceSmoothing={0.2} intensity={0.9} radius={0.75} resolutionScale={0.5} />
                    <SMAA />
                </EffectComposer>
            )}
        </>
    );
}
