'use client';

import { useState } from 'react';
import { Share2, Link as LinkIcon, Check } from 'lucide-react';

/** Share an event: the phone's share sheet where there is one, and copying its link. */
export default function ShareEvent({ title }) {
    const [copied, setCopied] = useState(false);
    const url = () => window.location.href.split('#')[0];
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { setCopied(false); }
    };
    const share = async () => {
        if (navigator.share) {
            try { await navigator.share({ title, url: url() }); } catch { /* closed the sheet */ }
        } else copy();
    };
    return (
        <div className="flex items-center justify-between gap-2 border-t border-white/10 mt-4 px-2 pt-2">
            <span className="text-slate-400 text-sm font-bold uppercase">Share this event</span>
            <div className="flex gap-1">
                <button type="button" onClick={share} aria-label="Share this event" title="Share"
                    className="grid h-11 w-11 place-items-center rounded-full text-slate-300 hover:bg-white/10 hover:text-[#ffb000]">
                    <Share2 className="w-5 h-5" aria-hidden />
                </button>
                <button type="button" onClick={copy} aria-label={copied ? 'Link copied' : 'Copy the link'} title={copied ? 'Copied' : 'Copy the link'}
                    className="grid h-11 w-11 place-items-center rounded-full text-slate-300 hover:bg-white/10 hover:text-[#ffb000]">
                    {copied ? <Check className="w-5 h-5 text-green-400" aria-hidden /> : <LinkIcon className="w-5 h-5" aria-hidden />}
                </button>
            </div>
        </div>
    );
}
