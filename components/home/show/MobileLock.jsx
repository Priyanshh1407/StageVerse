'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lock, Monitor, Link2, Check } from 'lucide-react';
import hero from '@/public/images/hero.jpg';

/**
 * What phones see instead of the 3D light show: the show is locked, with a suggestion to open the
 * site on a bigger screen. The rest of the homepage (events, footer) works as normal below it.
 */
export default function MobileLock({ className = '' }) {
    const [copied, setCopied] = useState(false);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.origin);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            setCopied(false); // clipboard blocked: the URL is on screen anyway
        }
    };

    return (
        <section className={`relative min-h-[100svh] overflow-hidden bg-[#010208] text-white ${className}`} aria-label="StageVerse live show (best on a bigger screen)">
            <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url("${hero.src}")` }} aria-hidden />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[#010208]" aria-hidden />
            {/* A slow coloured glow, so the screen still feels like a stage */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[140%] h-72 rounded-full bg-gradient-to-r from-fuchsia-500/30 via-cyan-400/25 to-fuchsia-500/30 blur-3xl animate-pulse" aria-hidden />

            <div className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-6 py-16 text-center">
                <p className="font-mono text-[11px] tracking-[0.35em] text-cyan-300 mb-3">LIVE LIGHT SHOW</p>
                <h1 className="text-4xl font-black tracking-tight mb-2">StageVerse</h1>
                <p className="text-sm text-gray-300 mb-10">The entire concert ecosystem, in one place.</p>

                <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-black/60 backdrop-blur-md p-6 shadow-2xl">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                        <Lock className="h-6 w-6 text-cyan-300" aria-hidden />
                    </div>
                    <h2 className="text-lg font-bold mb-2">This experience is locked on phones</h2>
                    <p className="text-sm text-gray-300 leading-relaxed mb-5">
                        The 3D concert, with its lighting rig, lasers and a light show programmed from any song, is built for
                        bigger screens. For the best experience, open StageVerse on a laptop or desktop.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-5">
                        <Monitor className="h-4 w-4" aria-hidden /> Best on a laptop or desktop, with sound on
                    </div>
                    <button
                        onClick={copyLink}
                        className="w-full flex items-center justify-center gap-2 rounded-full bg-white text-black py-2.5 text-sm font-bold hover:bg-cyan-300 transition-colors"
                    >
                        {copied ? <><Check className="h-4 w-4" aria-hidden /> Link copied</> : <><Link2 className="h-4 w-4" aria-hidden /> Copy link for later</>}
                    </button>
                    <div className="mt-4 flex justify-center gap-5 text-sm">
                        <a href="#events" className="font-bold text-cyan-300 hover:underline">Explore events</a>
                        <Link href="/login" className="text-gray-300 hover:underline">Sign in →</Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
