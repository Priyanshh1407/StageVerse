'use client';

import { useEffect, useState } from 'react';

// Rendering budget for the 3D show:
//   0  no 3D: static poster + 2D lights (no WebGL, "reduce motion", very weak devices)
//   1  integrated GPUs (e.g. Intel Iris Xe): fewer beams, half-resolution bloom, dpr 1
//   2  discrete GPUs: more beams, bloom, dpr up to 1.5
export const TIER_SETTINGS = {
    0: { beams: 0, bloom: false, dpr: 1 },
    // Full-scene benchmark on an Iris Xe: 140 beams, and 100 + bloom at native DPR, all held 60 FPS
    // (1% low 58), so integrated GPUs get bloom too; the auto step-down turns it off first if needed
    // Moving heads are the detailed model (~16.5k vertices each), so counts stay moderate
    1: { beams: 52, bloom: true, dpr: 1 },
    2: { beams: 72, bloom: true, dpr: [1, 1.5] },
};

function hasWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
        return false;
    }
}

/** Decisions that need no measuring: ?tier= override, "reduce motion", no WebGL. */
function quickDecision() {
    if (typeof window === 'undefined') return null;
    const forced = new URLSearchParams(window.location.search).get('tier');
    if (['0', '1', '2'].includes(forced)) return Number(forced);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !hasWebGL()) return 0;
    return null; // needs the GPU benchmark
}

/**
 * Picks a tier once on the client. `?tier=0|1|2` overrides it, for testing every
 * tier on one machine. Returns null until decided (render nothing heavy meanwhile).
 * Use only in client-rendered components (the canvas is loaded with ssr: false).
 */
export function useQualityTier() {
    const [tier, setTier] = useState(quickDecision);

    useEffect(() => {
        if (tier !== null) return;
        let cancelled = false;
        // detect-gpu benchmarks the GPU model; its data is self-hosted (no third-party request)
        import('detect-gpu')
            .then(({ getGPUTier }) => getGPUTier({ benchmarksURL: '/gpu-benchmarks' }))
            .then(({ tier: gpuTier, isMobile }) => {
                if (cancelled) return;
                if (gpuTier <= 0 || (isMobile && gpuTier <= 1)) setTier(0);
                else setTier(gpuTier >= 3 && !isMobile ? 2 : 1);
            })
            .catch(() => { if (!cancelled) setTier(1); }); // unknown GPU: assume integrated graphics
        return () => { cancelled = true; };
    }, [tier]);

    return tier;
}
