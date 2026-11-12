'use client';

import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import Haze from '../Haze';
import Performer from '../Performer';
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

// One festival stage, lit and running, for use inside a <Canvas>: built entirely from its definition
// (lib/show/stages). The homepage does not use this yet: it renders on the /lab stage pages only.

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

export default function FestivalScene({ stage, look, count = 96, bloom = true, quality = 'low', control }) {
    const heads = useMemo(() => rigHeads(stage, count), [stage, count]);
    const mounts = useMemo(() => stageMounts(stage), [stage]);
    const place = useMemo(() => (f) => placeFirework(stage, f), [stage]);
    const width = widthOf(stage);
    const blinders = mounts.strobes.length;
    // the homepage's haze is sized for its 40 m stage: stretched to this one's width and depth
    const hazeScale = [width / 40, stage.indoor ? 0.6 : 1, Math.max(1, -stage.focus[2] / 8)];

    return (
        <>
            <color attach="background" args={[stage.indoor ? '#010103' : '#010208']} />
            {!stage.indoor && <Sky kind={stage.sky} look={look} />}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 20]}>
                <planeGeometry args={[600, 600]} />
                <meshLambertMaterial color="#07080b" />
            </mesh>
            <Lights look={look} blinders={blinders} />

            <StageStructure stage={stage} />
            <StageScreens stage={stage} look={look} />
            <StagePixelBars stage={stage} look={look} />
            <Suspense fallback={null}>
                <StageHeads heads={heads} look={look} focus={stage.focus} />
                <StageStrobes positions={mounts.strobes} look={look} blinders={Math.min(16, blinders)} />
            </Suspense>
            <StageLasers look={look} projectors={mounts.lasers} />
            <group position={[0, 0, stage.focus[2] + 8 * hazeScale[2]]} scale={hazeScale}>
                <Haze look={look} blinders={Math.min(16, blinders)} />
            </group>
            <group position={stage.performerAt}>
                <Performer look={look} control={control} />
            </group>
            <StageCrowd look={look} area={stage.crowd} quality={quality} blinders={Math.min(16, blinders)} />

            <StageCo2 look={look} jets={mounts.floorJets} quality={quality} blinders={blinders} mount="floor" />
            <StageCo2 look={look} jets={mounts.highJets} quality={quality} blinders={blinders} mount="truss" />
            <StageConfetti look={look} cannons={mounts.cannons} quality={quality} blinders={blinders} />
            <StageCo2 look={look} jets={mounts.cannons} quality={quality} blinders={blinders} mount="confetti" />
            <StageStreamers look={look} launchers={mounts.launchers} quality={quality} blinders={blinders} />
            {stage.fireworks && <StageFireworks look={look} spots={mounts.mines} place={place} quality={quality} />}

            {bloom && (
                <EffectComposer multisampling={0}>
                    <Bloom mipmapBlur luminanceThreshold={0.3} luminanceSmoothing={0.2} intensity={0.9} radius={0.75} resolutionScale={0.5} />
                    <SMAA />
                </EffectComposer>
            )}
        </>
    );
}
