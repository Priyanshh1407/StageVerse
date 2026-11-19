'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ticket, ExternalLink, X, Clock, Calendar, MapPin } from 'lucide-react';
import { formatPrice } from '@/lib/format';

// StageVerse does not sell tickets: an event says where its tickets are sold (event.ticketsAt: { name, url }), and
// the button to that platform says buying there from here is coming soon.

/** The "coming soon" popup: Escape, the backdrop or the button closes it. */
function ComingSoon({ platform, onClose }) {
    const ok = useRef(null);
    useEffect(() => {
        ok.current?.focus();
        const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    // (in the page's body: inside the event page's animated hero a fixed overlay would move with it)
    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-labelledby="tickets-soon-title" onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#111] p-6 text-center text-white shadow-2xl">
                <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white">
                    <X className="h-5 w-5" />
                </button>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] text-black">
                    <Clock className="h-7 w-7" />
                </div>
                <h2 id="tickets-soon-title" className="text-xl font-bold">Coming soon</h2>
                <p className="mt-2 text-sm text-slate-300">
                    {platform ? <>Going straight to <b className="text-white">{platform}</b> for tickets is coming soon.</> : 'Getting tickets from here is coming soon.'}
                    {' '}For now, look for this event on {platform || 'the ticket partner'}.
                </p>
                <button ref={ok} type="button" onClick={onClose} className="mt-6 w-full rounded-xl bg-white/10 py-3 font-bold hover:bg-white/20">OK</button>
            </div>
        </div>,
        document.body,
    );
}

/** The button to the event's ticket platform (opens the coming-soon popup). */
export function TicketsButton({ event, className = '' }) {
    const [open, setOpen] = useState(false);
    const platform = event?.ticketsAt?.name?.trim() || '';
    return (
        <>
            <button type="button" onClick={() => setOpen(true)}
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] px-6 font-bold text-black shadow-lg shadow-[#ff6a00]/20 transition-all hover:brightness-110 ${className}`}>
                <Ticket className="h-5 w-5" aria-hidden />
                {platform ? `Get tickets on ${platform}` : 'Get tickets'}
                <ExternalLink className="h-4 w-4" aria-hidden />
            </button>
            {open && <ComingSoon platform={platform} onClose={() => setOpen(false)} />}
        </>
    );
}

/** The event's ticket information: when, where, the price range and where the tickets are sold. */
export default function TicketsInfo({ event, formattedDate }) {
    const platform = event?.ticketsAt?.name?.trim() || '';
    const prices = (event?.ticketTiers ?? []).map((t) => Number(t.price)).filter((p) => p > 0);
    const from = prices.length ? Math.min(...prices) : null;
    const to = prices.length ? Math.max(...prices) : null;
    return (
        <div className="rounded-[1.4rem] bg-[#141414] p-6 text-white">
            <h2 className="mb-5 flex items-center gap-2 text-xl font-bold"><Ticket className="h-5 w-5 text-[#ff6a00]" aria-hidden /> Tickets</h2>
            <dl className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                    <div><dt className="text-slate-400">When</dt><dd className="font-semibold">{formattedDate}{event?.time ? ` · ${event.time}` : ''}</dd></div>
                </div>
                <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                    <div><dt className="text-slate-400">Where</dt><dd className="font-semibold">{[event?.venue?.name, event?.city].filter(Boolean).join(', ')}</dd></div>
                </div>
                {from !== null && (
                    <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-slate-400" aria-hidden>$</span>
                        <div><dt className="text-slate-400">Prices</dt><dd className="font-semibold">{from === to ? formatPrice(from) : `${formatPrice(from)} to ${formatPrice(to)}`}</dd></div>
                    </div>
                )}
                <div className="flex items-start gap-3">
                    <ExternalLink className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                    <div><dt className="text-slate-400">Sold on</dt><dd className="font-semibold">{platform || 'To be announced'}</dd></div>
                </div>
            </dl>
            <TicketsButton event={event} className="mt-6 w-full" />
            <p className="mt-3 text-center text-xs text-slate-400">StageVerse doesn&apos;t sell tickets. You buy them on {platform || 'the ticket partner'}.</p>
        </div>
    );
}
