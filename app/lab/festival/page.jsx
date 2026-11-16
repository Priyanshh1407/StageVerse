'use client';

import dynamic from 'next/dynamic';

// WebGL only exists in the browser, so the canvas is never server-rendered
const loading = () => <div className="h-screen grid place-items-center bg-[#02030a] text-amber-300 font-mono">Loading the grounds…</div>;
const FestivalGround = dynamic(() => import('@/components/home/stage/festival/FestivalGround'), { ssr: false, loading });

/** The festival ground's camera flight between the four stages (rough builds): a test page. */
export default function FestivalLabPage() {
    return <FestivalGround />;
}
