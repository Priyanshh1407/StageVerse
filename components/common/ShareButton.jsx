'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';

/** Share this page: the phone's share sheet where there is one, otherwise its link is copied. */
export default function ShareButton({ label = 'Share' }) {
    const [copied, setCopied] = useState(false);
    const share = async () => {
        const url = window.location.href.split('#')[0];
        if (navigator.share) {
            try { await navigator.share({ title: document.title, url }); } catch { /* closed the sheet */ }
            return;
        }
        try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); }
    };
    return (
        <button type="button" onClick={share}
            className="flex min-h-12 items-center gap-2 bg-white/10 text-white border border-white/20 px-8 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-white hover:text-black transition-colors">
            {copied ? <><Check className="w-4 h-4" aria-hidden /> Link copied</> : <><Share2 className="w-4 h-4" aria-hidden /> {label}</>}
        </button>
    );
}
