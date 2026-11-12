'use client';

import dynamic from 'next/dynamic';

// WebGL only exists in the browser, so the canvas is never server-rendered
const StageBlockout = dynamic(() => import('@/components/home/stage/lab/StageBlockout'), {
    ssr: false,
    loading: () => <div className="h-screen grid place-items-center bg-[#02030a] text-amber-300 font-mono">Loading stage…</div>,
});

export default function DesertLabPage() {
    return <StageBlockout stage="desert" />;
}
