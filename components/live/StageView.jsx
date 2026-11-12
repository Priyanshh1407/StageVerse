'use client';

import { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Orbitron } from 'next/font/google';
import { X } from 'lucide-react';
import StageScene from '@/components/home/stage/StageScene';
import { useQualityTier, TIER_SETTINGS } from '@/components/home/stage/useQualityTier';
import { logoTag, logoScript } from '@/components/brand/Logo';
import { SHOTS } from '@/lib/show/shots';
import { DEFAULT_LOOK } from '@/lib/show/look';

// The homepage's 3D stage in a full-screen popup, for the dashboards: `lookAt(t)` gives the look to
// show at time t (seconds), `rig` the fixture counts. Used to watch a live show (fans) and to see a
// DMX patch as a rig (crew). Clicking the backdrop or pressing Escape closes it.

const orbitron = Orbitron({ subsets: ['latin'], weight: ['700', '900'], display: 'swap' });
const LOGO_FONTS = { tag: logoTag.style.fontFamily, script: logoScript.style.fontFamily };

/** One frame: put the look of the moment on the rig, and place the camera once. */
function stepFrame(look, lookAt, shot, state, { camera, clock }) {
    look.current = lookAt(clock.elapsedTime);
    if (state.placed) return;
    camera.position.set(shot.pos[0], shot.pos[1] + 2.2, shot.pos[2]);
    camera.lookAt(shot.target[0], shot.target[1] + 0.9, shot.target[2]);
    state.placed = true;
}

function Frame({ look, lookAt, shot }) {
    const state = useRef({ placed: false });
    useFrame((frame) => stepFrame(look, lookAt, shot, state.current, frame));
    return null;
}

export default function StageView({ open, onClose, title, subtitle, lookAt, rig = {}, children }) {
    const tier = useQualityTier();
    const look = useRef(DEFAULT_LOOK);
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    if (!open) return null;

    const settings = TIER_SETTINGS[tier === 0 || tier === null ? 1 : tier];
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-3 sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
            <div className="relative flex h-full max-h-[52rem] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#010208]" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
                    <div className="min-w-0">
                        <h2 className="truncate text-base font-bold">{title}</h2>
                        {subtitle && <p className="truncate text-xs text-gray-400">{subtitle}</p>}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-gray-300 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
                </div>
                <div className="relative min-h-0 flex-1">
                    {tier === null ? null : (
                        <Canvas dpr={settings.dpr} camera={{ position: SHOTS.wide.pos, fov: 55, near: 0.5, far: 200 }} gl={{ antialias: !settings.bloom, powerPreference: 'high-performance' }}>
                            <Frame look={look} lookAt={lookAt} shot={SHOTS.wide} />
                            <StageScene beams={rig.beams ?? settings.beams} bloom={settings.bloom} look={look} lasers={rig.lasers ?? 40} blinders={rig.blinders ?? 8}
                                screen={{ kind: 'brand' }} font={orbitron.style.fontFamily} logoFonts={LOGO_FONTS} effects="low" />
                        </Canvas>
                    )}
                    {children && <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 text-white">{children}</div>}
                </div>
            </div>
        </div>
    );
}
