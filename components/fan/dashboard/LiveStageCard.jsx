'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Radio } from 'lucide-react';
import { useSocket, useShowRoom } from '@/components/providers/SocketProvider';
import { VOTE_COLORS, leadingOption, liveLook } from '@/lib/show/liveLook';

// "Watch the stage": the 3D stage following a real show. The crew's console sets the show's status
// (standby, live, paused) and can send a warning; the encore vote colours the rig as it happens.
// The 3D code only loads when the fan opens it.
const StageView = dynamic(() => import('@/components/live/StageView'), { ssr: false });

const STATUS_TEXT = { Standby: 'Standby: house lights up', Live: 'Live', Paused: 'Paused' };

export default function LiveStageCard({ eventId, eventTitle }) {
    const { socket } = useSocket();
    useShowRoom(eventId);
    const [open, setOpen] = useState(false);
    const [state, setState] = useState({ status: 'Standby', warning: false, poll: null });
    const live = useRef(state);
    useEffect(() => { live.current = state; }, [state]);

    // where the show is now (the socket only reports changes)
    useEffect(() => {
        if (!eventId || !open) return undefined;
        let cancelled = false;
        fetch(`/api/fan/poll?eventId=${eventId}`).then((r) => (r.ok ? r.json() : null)).then((json) => {
            if (cancelled || !json?.success) return;
            setState((s) => ({ ...s, status: json.showStatus ?? s.status, poll: json.poll ?? s.poll }));
        }).catch(() => {});
        return () => { cancelled = true; };
    }, [eventId, open]);

    useEffect(() => {
        if (!socket || !eventId) return undefined;
        const mine = (data) => String(data?.eventId) === String(eventId);
        const onShow = (data) => mine(data) && setState((s) => ({ ...s, status: data.status ?? s.status, warning: Boolean(data.warning) }));
        const onWarning = (data) => {
            if (!mine(data)) return;
            setState((s) => ({ ...s, warning: true }));
            setTimeout(() => setState((s) => ({ ...s, warning: false })), 4000);
        };
        const onPoll = (data) => mine(data) && setState((s) => ({ ...s, poll: { ...data } }));
        const onPollUpdate = (data) => mine(data) && setState((s) => ({ ...s, poll: s.poll ? { ...s.poll, options: data.options } : { ...data, isActive: true } }));
        socket.on('show:update', onShow);
        socket.on('show:warning', onWarning);
        socket.on('poll:start', onPoll);
        socket.on('poll:update', onPollUpdate);
        socket.on('poll:end', onPoll);
        return () => {
            socket.off('show:update', onShow);
            socket.off('show:warning', onWarning);
            socket.off('poll:start', onPoll);
            socket.off('poll:update', onPollUpdate);
            socket.off('poll:end', onPoll);
        };
    }, [socket, eventId]);

    const lookAt = useCallback((t) => liveLook(live.current, t), []);
    const close = useCallback(() => setOpen(false), []);
    if (!eventId) return null;

    const lead = leadingOption(state.poll);
    const color = lead ? VOTE_COLORS[lead.index % VOTE_COLORS.length] : null;
    return (
        <>
            <button type="button" onClick={() => setOpen(true)}
                className="relative z-10 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] px-4 py-2.5 text-sm font-bold text-black shadow-lg shadow-[#ff6a00]/30 hover:brightness-110">
                <Radio className="h-4 w-4" aria-hidden /> Watch the stage live
            </button>
            <StageView open={open} onClose={close} title={eventTitle ? `${eventTitle}: the stage, live` : 'The stage, live'} subtitle="The lights follow the show's console and the encore vote" lookAt={lookAt}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="font-mono text-xs tracking-[0.25em] text-amber-300">{(STATUS_TEXT[state.status] ?? state.status).toUpperCase()}{state.warning ? ' · WARNING FROM THE CREW' : ''}</p>
                        <p className="mt-1 text-sm text-gray-200">
                            {state.poll?.question
                                ? lead ? <>{lead.decided ? 'The crowd chose' : 'In front'}: <b>{lead.text}</b> ({lead.votes} vote{lead.votes === 1 ? '' : 's'}), so the rig is {color.label.toLowerCase()}.</> : <>Vote open: <b>{state.poll.question}</b> The first vote colours the rig.</>
                                : 'No vote is open. When the encore vote starts, the option in front colours the rig.'}
                        </p>
                    </div>
                    {state.poll?.options?.length > 0 && (
                        <ul className="flex flex-wrap gap-2 text-xs">
                            {state.poll.options.map((o, i) => (
                                <li key={o._id ?? i} className="flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: `linear-gradient(135deg, ${VOTE_COLORS[i % VOTE_COLORS.length].a}, ${VOTE_COLORS[i % VOTE_COLORS.length].b})` }} />
                                    {o.text} · {o.votes ?? 0}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </StageView>
        </>
    );
}
