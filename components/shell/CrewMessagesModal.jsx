'use client';

import { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';

/**
 * The artist's messages from the crew (what the artist's top bar used to drop down): each can be marked as read.
 * Reports how many there are (`onCount`), for the menu's badge; checks again every 30 s.
 */
export default function CrewMessagesModal({ isOpen, onClose, onCount }) {
    const [messages, setMessages] = useState([]);
    useEffect(() => {
        let alive = true;
        const load = async () => {
            try {
                const json = await (await fetch('/api/artist/notifications')).json();
                if (alive && json.success) { setMessages(json.data); onCount?.(json.data.length); }
            } catch { /* offline: keep what we have */ }
        };
        load();
        const id = setInterval(load, 30000);
        return () => { alive = false; clearInterval(id); };
    }, [onCount]);
    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    const markRead = async (id) => {
        try {
            const res = await fetch('/api/production/logistics', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'Done' }) });
            if (res.ok) setMessages((list) => { const next = list.filter((m) => m._id !== id); onCount?.(next.length); return next; });
        } catch (error) { console.error('Could not mark the message as read', error); }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-labelledby="crew-messages-title" onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#1e2e38] text-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                    <h2 id="crew-messages-title" className="text-lg font-bold">Messages from the crew</h2>
                    <button type="button" onClick={onClose} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-lg text-slate-300 hover:bg-white/10"><X className="h-5 w-5" aria-hidden /></button>
                </div>
                <ul className="max-h-[60vh] overflow-y-auto">
                    {messages.length === 0 ? <li className="p-6 text-center text-sm text-slate-300">No new messages.</li> : messages.map((m) => (
                        <li key={m._id} className="flex items-start justify-between gap-3 border-b border-white/5 px-5 py-3">
                            <div>
                                <p className="text-sm font-medium leading-snug">{String(m.title ?? '').replace('Crew Message: ', '')}</p>
                                <p className="mt-1 text-xs text-slate-400">{new Date(m.createdAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <button type="button" onClick={() => markRead(m._id)} className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-green-300 hover:bg-green-400/10">
                                <Check className="h-4 w-4" aria-hidden /> Read
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
