'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, MessageSquare, Send, ArrowLeft, Loader2 } from 'lucide-react';

const initials = (name = '?') => name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const when = (d) => new Date(d).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function Avatar({ person }) {
    return person?.avatar
        // eslint-disable-next-line @next/next/no-img-element -- user avatars come from any host
        ? <img src={person.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
        : <span className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-black bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a]`}>{initials(person?.name)}</span>;
}

/**
 * Direct messages: the list of conversations (and the people you follow, to start one), and a
 * conversation with someone. `start` opens straight onto a conversation ({ id, name, avatar }).
 */
export default function MessagesModal({ isOpen, onClose, start = null }) {
    const [conversations, setConversations] = useState([]);
    const [friends, setFriends] = useState([]);
    const [active, setActive] = useState(null);      // { id, name, avatar }
    const [thread, setThread] = useState([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const bottom = useRef(null);

    const loadList = useCallback(async () => {
        setLoading(true);
        try {
            const [c, f] = await Promise.all([
                fetch('/api/fan/messages').then((r) => r.json()),
                fetch('/api/social').then((r) => r.json()),
            ]);
            if (c.success) setConversations(c.conversations);
            if (f.success) setFriends(f.following || []);
        } catch { setError('Could not load your messages.'); } finally { setLoading(false); }
    }, []);

    const openThread = useCallback(async (person) => {
        setActive(person);
        setThread([]);
        setError('');
        try {
            const r = await fetch(`/api/fan/messages?with=${person.id}`).then((x) => x.json());
            if (r.success) { setThread(r.messages); setActive(r.with); } else setError(r.message || 'Could not open this conversation.');
        } catch { setError('Could not open this conversation.'); }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: syncing with the server is what this effect is for
        loadList();
        if (start) openThread(start);
    }, [isOpen, start, loadList, openThread]);

    useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [thread]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    const send = async (e) => {
        e.preventDefault();
        const text = draft.trim();
        if (!text || !active || sending) return;
        setSending(true);
        setError('');
        try {
            const r = await fetch('/api/fan/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: active.id, text }) }).then((x) => x.json());
            if (r.success) { setThread((t) => [...t, r.message]); setDraft(''); loadList(); } else setError(r.message || 'Message not sent.');
        } catch { setError('Message not sent. Check your connection.'); } finally { setSending(false); }
    };

    if (!isOpen) return null;
    const startable = friends.filter((f) => !conversations.some((c) => c.with.id === f.id));

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Messages">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full h-full sm:h-[600px] sm:max-w-2xl bg-white dark:bg-[#1a2632] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 min-w-0">
                        {active && (
                            <button type="button" onClick={() => { setActive(null); setThread([]); }} aria-label="Back to conversations" className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-[#ff6a00]">
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <MessageSquare className="w-5 h-5 text-[#ff6a00] shrink-0" />
                        <h2 className="font-bold text-lg text-slate-900 dark:text-white truncate">{active ? active.name : 'Messages'}</h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close messages" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-[#ff6a00]">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {!active ? (
                    <div className="flex-1 overflow-y-auto p-3">
                        {loading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#ff6a00]" /></div>}
                        {!loading && conversations.length === 0 && startable.length === 0 && (
                            <p className="text-center text-sm text-slate-500 py-10">No messages yet. Follow fans on the Friends page to message them.</p>
                        )}
                        {conversations.map((c) => (
                            <button key={c.with.id} type="button" onClick={() => openThread(c.with)} className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-white/5">
                                <Avatar person={c.with} />
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center justify-between gap-2">
                                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{c.with.name}</span>
                                        <span className="text-[10px] text-slate-400 shrink-0">{when(c.last.createdAt)}</span>
                                    </span>
                                    <span className="block text-xs text-slate-500 truncate">{c.last.mine ? 'You: ' : ''}{c.last.text}</span>
                                </span>
                                {c.unread > 0 && <span className="text-[10px] font-bold text-black rounded-full px-2 py-0.5 bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a]">{c.unread}</span>}
                            </button>
                        ))}
                        {startable.length > 0 && (
                            <>
                                <p className="px-3 pt-4 pb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Start a conversation</p>
                                {startable.map((f) => (
                                    <button key={f.id} type="button" onClick={() => openThread(f)} className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-white/5">
                                        <Avatar person={f} />
                                        <span className="font-medium text-sm text-slate-900 dark:text-white">{f.name}</span>
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {thread.length === 0 && <p className="text-center text-sm text-slate-500 py-10">Say hi to {active.name}.</p>}
                            {thread.map((m) => (
                                <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${m.mine ? 'bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] text-black' : 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white'}`}>
                                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                                        <p className={`mt-0.5 text-[10px] ${m.mine ? 'text-black/60' : 'text-slate-400'}`}>{when(m.createdAt)}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={bottom} />
                        </div>
                        <form onSubmit={send} className="flex items-center gap-2 p-3 border-t border-slate-200 dark:border-slate-700">
                            <label htmlFor="message-draft" className="sr-only">Message</label>
                            <input id="message-draft" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} placeholder={`Message ${active.name}`} autoComplete="off"
                                className="flex-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/30" />
                            <button type="submit" disabled={!draft.trim() || sending} aria-label="Send message"
                                className="p-2.5 rounded-full text-black bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] disabled:opacity-40 hover:brightness-110">
                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </form>
                    </>
                )}
                {error && <p className="px-5 pb-3 text-xs text-red-500" role="alert">{error}</p>}
            </div>
        </div>
    );
}
