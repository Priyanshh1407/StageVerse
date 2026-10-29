'use client';

import { useEffect, useState } from 'react';
import { Monitor, Link2, Check } from 'lucide-react';

/**
 * Shown on phones when a visitor taps a playground control (lighting desk, a demo song, "Light up
 * your song"): those are made for bigger screens. The scroll show itself plays on phones as normal.
 */
export default function BiggerScreenNotice({ open, onClose }) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.origin);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            setCopied(false); // clipboard blocked: nothing else to do
        }
    };

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="bigger-screen-title"
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6 pointer-events-auto"
            onClick={onClose}>
            <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0b0d1a]/95 p-6 text-center text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                    <Monitor className="h-6 w-6 text-cyan-300" aria-hidden />
                </div>
                <h2 id="bigger-screen-title" className="text-lg font-bold mb-2">Best enjoyed on a bigger screen</h2>
                <p className="text-sm text-gray-300 leading-relaxed mb-5">
                    The lighting desk and the song light shows are made for laptops and desktops. Open StageVerse on a
                    bigger screen, with the sound on, to run the show yourself.
                </p>
                <button onClick={copyLink}
                    className="w-full flex items-center justify-center gap-2 rounded-full bg-white text-black py-2.5 text-sm font-bold hover:bg-cyan-300 transition-colors">
                    {copied ? <><Check className="h-4 w-4" aria-hidden /> Link copied</> : <><Link2 className="h-4 w-4" aria-hidden /> Copy link for later</>}
                </button>
                <button onClick={onClose} className="mt-3 w-full py-2 text-sm text-gray-300 hover:text-white">Got it</button>
            </div>
        </div>
    );
}
