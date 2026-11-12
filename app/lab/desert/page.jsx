'use client';

import dynamic from 'next/dynamic';
import { useSyncExternalStore } from 'react';

// WebGL only exists in the browser, so the canvases are never server-rendered
const loading = () => <div className="h-screen grid place-items-center bg-[#02030a] text-amber-300 font-mono">Loading stage…</div>;
const FestivalLab = dynamic(() => import('@/components/home/stage/festival/FestivalLab'), { ssr: false, loading });
const StageBlockout = dynamic(() => import('@/components/home/stage/lab/StageBlockout'), { ssr: false, loading });

// ?layout=1 shows the grey layout with every fixture marked; otherwise the built stage
const layoutView = () => new URLSearchParams(window.location.search).get('layout') === '1';

export default function DesertLabPage() {
    const layout = useSyncExternalStore(() => () => {}, layoutView, () => false);
    return layout ? <StageBlockout stage="desert" /> : <FestivalLab stageKey="desert" />;
}
