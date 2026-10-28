'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { easing } from 'maath';
import * as THREE from 'three';
import StageScene from '@/components/home/stage/StageScene';
import { useQualityTier, TIER_SETTINGS } from '@/components/home/stage/useQualityTier';
import { ConcertLights } from '@/components/ConcertLights';
import { SHOTS } from '@/lib/show/shots';
import { currentState } from './director';
import hero from '@/public/images/hero.jpg';

/** One frame of the show: put the current look on the rig and fly the camera toward its shot. */
function directFrame(control, look, camera, aim, delta) {
    // Glide toward the scroll position instead of jumping a wheel notch at a time
    const raw = control.progress;
    control.smoothProgress = control.smoothProgress === undefined ? raw : control.smoothProgress + (raw - control.smoothProgress) * (1 - Math.exp(-delta * 2.5));
    const state = currentState(control);
    look.current = state.look;
    if (control.mode !== 'manual') control.shot = state.shot;
    const shot = SHOTS[control.shot] || SHOTS.wide;
    if (!aim.placed) {
        // First frame: start on the shot instead of flying in from the default camera
        camera.position.set(...shot.pos);
        aim.target.set(...shot.target);
        aim.placed = true;
    }
    // No handheld sway: a constantly moving camera makes every sub-pixel detail (truss bracing,
    // LED pixels, fixture vents) crawl, which reads as flicker
    easing.damp3(camera.position, shot.pos, 1.4, delta);
    easing.damp3(aim.target, shot.target, 1.4, delta);
    camera.lookAt(aim.target);
}

/** Inside the canvas: runs the show every frame. */
function Director({ control, look }) {
    const aim = useRef({ target: new THREE.Vector3(), placed: false });
    useFrame(({ camera }, delta) => directFrame(control.current, look, camera, aim.current, delta));
    return null;
}

// Automatic step-down when the frame rate can't keep up: bloom off, then 70% beams, then lower resolution
const MAX_STEP = 3;

function Stage3D({ tier, control, look, visible, counts, events }) {
    const [step, setStep] = useState(0);
    const settings = TIER_SETTINGS[tier];
    const beams = Math.round((counts.beams ?? settings.beams) * (step >= 2 ? 0.7 : 1));
    const bloom = settings.bloom && step < 1;
    const dpr = step >= 3 ? 0.75 : settings.dpr;

    return (
        <Canvas
            frameloop={visible ? 'always' : 'never'}   // nothing renders while scrolled away
            dpr={dpr}
            camera={{ position: SHOTS.house.pos, fov: 55, near: 0.5, far: 200 }}
            gl={{ antialias: !bloom, powerPreference: 'high-performance' }} // MSAA only without bloom (the composer does SMAA)
        >
            <PerformanceMonitor flipflops={3} onDecline={() => setStep((s) => Math.min(s + 1, MAX_STEP))} />
            <Director control={control} look={look} />
            <StageScene beams={beams} bloom={bloom} look={look} events={events} lasers={counts.lasers} blinders={counts.blinders} />
        </Canvas>
    );
}

/** Tier 0 without "reduce motion": the 2D lights, following the show a few times a second. */
function Stage2D({ control, counts }) {
    const [lights, setLights] = useState(null);
    useEffect(() => {
        let last = '';
        const id = setInterval(() => {
            const { look } = currentState(control.current);
            const next = {
                masterOn: look.master > 0.5,
                beams: { on: look.beams > 0.5 && look.intensity > 0.3, count: Math.round(4 + look.sweep * 10), color: look.colorA },
                lasers: { on: look.laser > 0.3, count: counts.lasers, color: look.laserColor },
                blinders: { on: look.blinder > 0.3 || look.strobe > 0.3, count: counts.blinders },
            };
            const key = JSON.stringify(next);
            if (key !== last) {
                last = key;
                setLights(next);
            }
        }, 250);
        return () => clearInterval(id);
    }, [control, counts.lasers, counts.blinders]);
    return lights && <ConcertLights {...lights} />;
}

/**
 * The visual layer of the show. Picks a quality tier on the client, then renders the 3D stage,
 * or for tier 0 the poster with 2D lights (or the poster alone when "reduce motion" is set).
 */
export default function ShowStage({ control, look, visible, counts, events }) {
    const tier = useQualityTier();
    const [reducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    if (tier === null) return null; // deciding (a few hundred ms); the HTML headline is already up
    if (tier === 0) {
        return (
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: `url("${hero.src}")` }} />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80" />
                {!reducedMotion && <div className="absolute inset-0 pointer-events-none"><Stage2D control={control} counts={counts} /></div>}
            </div>
        );
    }
    return (
        <div className="absolute inset-0 animate-[fadeIn_1.2s_ease-out]">
            <Stage3D tier={tier} control={control} look={look} visible={visible} counts={counts} events={events} />
        </div>
    );
}
