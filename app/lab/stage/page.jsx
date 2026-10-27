'use client';

import dynamic from 'next/dynamic';

// WebGL only exists in the browser, so the canvas is never server-rendered
const LabStage = dynamic(() => import('@/components/home/stage/LabStage'), {
    ssr: false,
    loading: () => <div className="h-screen grid place-items-center bg-[#02030a] text-cyan-300 font-mono">Loading stage…</div>,
});

export default function StageLabPage() {
    return <LabStage />;
}
