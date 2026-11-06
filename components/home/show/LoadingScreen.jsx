'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Logo from '@/components/brand/Logo';
import BuiltBy from '@/components/brand/BuiltBy';
import { PART_LABELS, getReady, subscribeReady } from './stageReady';

// Revealed at the latest after this long, whatever is still loading (a slow network or driver
// shouldn't keep the page hidden for good)
const MAX_WAIT_MS = 20000;
// The fade out (ms)
const FADE_MS = 700;

/**
 * Covers the whole page until the stage and the show are ready: every part reported in, then two
 * frames drawn (so the first thing seen is the finished stage, not one still building), then a fade.
 * The page can't scroll meanwhile.
 */
export default function LoadingScreen() {
    const state = useSyncExternalStore(subscribeReady, getReady, getReady);
    const [phase, setPhase] = useState('loading'); // 'loading' → 'fading' → 'gone'
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        const id = setTimeout(() => setTimedOut(true), MAX_WAIT_MS);
        return () => clearTimeout(id);
    }, []);

    const ready = state.ready || timedOut;
    useEffect(() => {
        if (!ready || phase !== 'loading') return undefined;
        let raf = requestAnimationFrame(() => {
            raf = requestAnimationFrame(() => setPhase('fading'));
        });
        return () => cancelAnimationFrame(raf);
    }, [ready, phase]);

    useEffect(() => {
        if (phase !== 'fading') return undefined;
        const id = setTimeout(() => setPhase('gone'), FADE_MS);
        return () => clearTimeout(id);
    }, [phase]);

    // No scrolling (and no scroll restoration halfway down the show) until it's revealed
    useEffect(() => {
        if (phase === 'gone') return undefined;
        const root = document.documentElement;
        const before = root.style.overflow;
        root.style.overflow = 'hidden';
        window.scrollTo(0, 0);
        return () => { root.style.overflow = before; };
    }, [phase]);

    if (phase === 'gone') return null;
    const share = ready ? 1 : state.done / state.total;
    const label = ready ? 'Ready' : PART_LABELS[state.next] ?? 'Loading';

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label={`Loading the show: ${label}`}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#010208] text-white transition-opacity ease-out"
            style={{ opacity: phase === 'fading' ? 0 : 1, transitionDuration: `${FADE_MS}ms`, pointerEvents: phase === 'fading' ? 'none' : 'auto' }}
        >
            {/* Two beams sweeping across from the top corners, like a rig warming up */}
            <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="sv-loader-beam absolute -top-1/4 left-[18%] h-[130%] w-40 origin-top bg-gradient-to-b from-[#ffb000]/25 via-[#ff6a00]/5 to-transparent blur-2xl" />
                <div className="sv-loader-beam sv-loader-beam-2 absolute -top-1/4 right-[18%] h-[130%] w-40 origin-top bg-gradient-to-b from-[#ff3df2]/25 via-[#ff3df2]/5 to-transparent blur-2xl" />
            </div>

            <div className="relative flex flex-col items-center gap-8 px-6">
                <div className="flex flex-col items-center gap-3">
                    <Logo size="lg" />
                    <BuiltBy className="text-xs tracking-wide text-white/60" />
                </div>
                <div className="w-64 max-w-[70vw]">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-[#ffb000] to-[#ff3df2] transition-[width] duration-500 ease-out"
                            style={{ width: `${Math.max(6, share * 100)}%` }}
                        />
                    </div>
                    <p className="mt-3 text-center text-xs uppercase tracking-[0.25em] text-white/60">{label}</p>
                </div>
            </div>

            <style>{`
                .sv-loader-beam { transform: rotate(-18deg); animation: sv-sweep 3.2s ease-in-out infinite alternate; }
                .sv-loader-beam-2 { transform: rotate(18deg); animation-name: sv-sweep-2; animation-delay: -1.6s; }
                @keyframes sv-sweep { from { transform: rotate(-24deg); } to { transform: rotate(14deg); } }
                @keyframes sv-sweep-2 { from { transform: rotate(24deg); } to { transform: rotate(-14deg); } }
                @media (prefers-reduced-motion: reduce) { .sv-loader-beam { animation: none; } }
            `}</style>
        </div>
    );
}
