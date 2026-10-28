'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Loader2, Monitor, ArrowLeft } from 'lucide-react';
import StudioNavbar from '@/components/production/StudioNavbar';
import LiveHeader from '@/components/production/live/LiveHeader';
import LiveControls from '@/components/production/live/LiveControls';
import SetlistTimeline from '@/components/production/live/SetlistTimeline';
import { useSocket, useShowRoom } from '@/components/providers/SocketProvider';

import { toast } from "sonner";
import ShowTimer from "@/components/artist/live/ShowTimer"; // Reuse Artist Timer

// Reconciliation poll. Was 1000 ms (10 screens = 10 requests/s); see bench/results.
const RECONCILE_MS = 20000;

export default function LiveShowPage(props) {
  const params = use(props.params);
  const showId = params.id;
  const { socket } = useSocket();
  useShowRoom(showId);
  useEffect(() => {
    if (!socket) return;
    const onConnect = () => toast.success("Crew: Connected to Sync Server");
    const onDisconnect = () => toast.error("Crew: Lost Connection");
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  const [isLoading, setIsLoading] = useState(true);
  const [show, setShow] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pollStats, setPollStats] = useState(null);
  const [showEncoreReveal, setShowEncoreReveal] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [winner, setWinner] = useState(null);
  // Set when the last state refresh failed; the screen keeps the last good data and says so
  const [syncError, setSyncError] = useState(null);
  const warningDismissed = React.useRef(false); // Prevent re-trigger after dismiss
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return { hours, minutes, seconds };
  };
  useEffect(() => {
    let interval;
    if (show && show.status === 'Live') {
      interval = setInterval(() => {
        setElapsedSeconds(prev => {
          const newTime = prev + 1;
          if (show.currentSong) {
            const parts = (show.currentSong.duration || "0:00").split(':');
            const durationSecs = (parseInt(parts[0]) * 60) + parseInt(parts[1]);
            const progress = durationSecs > 0 ? (newTime / durationSecs) * 100 : 0;
            setShow(curr => ({
              ...curr,
              currentSong: {
                ...curr.currentSong,
                progress: Math.min(progress, 100),
                timeElapsed: formatTime(newTime).minutes + ":" + formatTime(newTime).seconds
              }
            }));

            if (durationSecs > 0 && newTime >= durationSecs) {
              return durationSecs;
            }
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [show?.status, show?.currentSong?._id]);
  const fetchShowData = async () => {
    try {
      const res = await fetch(`/api/production/live?eventId=${showId}`);
      const json = await res.json();
      if (!res.ok) {
        setSyncError(res.status === 403 ? 'You are not on the crew for this show.' : (json.error || 'Show data unavailable'));
        return false;
      }
      setSyncError(null);
      if (json.success) {
        // The server keeps the show clock: coming back to this show, or re-syncing, puts the timer back on track
        if (typeof json.elapsedSeconds === 'number') setElapsedSeconds(json.elapsedSeconds);
        setShow(prev => {
          // Always trust the DB status — artist writes to DB on every action (start, pause, resume)
          // Sockets handle polls/warnings; DB polling handles show status reliably
          const newStatus = json.showStatus || 'Standby';

          console.log(`[Poll] DB Status: ${json.showStatus} -> Setting: ${newStatus}`);

          return {
            ...prev,
            name: json.event.title,
            status: newStatus,
            currentSong: json.setlist.find(s => s.status === 'live') || json.setlist[0],
            currentCue: {},
            setlist: json.setlist
          };
        });

        if (json.activePoll) {
          setPollStats({
            question: json.activePoll.question,
            options: json.activePoll.options
          });
        }
        // Show warning from DB if artist set it and user hasn't dismissed it this session
        if (json.showWarning && !warningDismissed.current) {
          setShowWarning(true);
        } else if (!json.showWarning) {
          // Reset dismiss guard when artist clears the warning (after 30s)
          warningDismissed.current = false;
        }
      }
      return Boolean(json.success);
    } catch (e) {
      setSyncError('Connection lost. Retrying...');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Sockets deliver every state change within milliseconds (the server broadcasts after each
  // DB write). The poll only reconciles anything missed, so it can be slow; every (re)connect
  // also refetches, because events sent while disconnected are never replayed.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: syncing with the server is what this effect is for
    fetchShowData();
    const interval = setInterval(fetchShowData, RECONCILE_MS);
    return () => clearInterval(interval);
  }, [showId]);

  useEffect(() => {
    if (!socket) return;
    socket.on("connect", fetchShowData);
    return () => socket.off("connect", fetchShowData);
  }, [socket, showId]);

  useEffect(() => {
    if (!socket) return;
    // The server only sends this room's events; the id check is defence in depth
    const isOtherShow = (data) => data?.eventId && String(data.eventId) !== String(showId);

    const onShowUpdate = (data) => {
      if (isOtherShow(data) || !data.status) return;
      toast.info(`Signal Received: ${data.status}`);
      if (typeof data.time === 'number') {
        console.log(`[Sync] Force Time to ${data.time}`);
        setElapsedSeconds(data.time);
      }

      setShow(prev => {
        if (!prev) return prev;
        let newSetlist = prev.setlist;
        let newCurrentSong = prev.currentSong;

        if (data.status === 'Live' && prev.status === 'Standby') {
          newSetlist = prev.setlist.map((s, i) => ({ ...s, status: i === 0 ? 'live' : 'pending' }));
          newCurrentSong = newSetlist[0];
        }

        return {
          ...prev,
          status: data.status,
          setlist: newSetlist,
          currentSong: newCurrentSong
        };
      });
      if (data.status === 'Live' && elapsedSeconds === 0) {
      }
    };
    const onPollStart = (data) => {
      if (isOtherShow(data)) return;
      toast.info("ENCORE POLL STARTED");
      setPollStats({ question: data.question, options: data.options });
    };
    // Tallies are the persisted counts from the server, not client-side +1s
    const onPollUpdate = (data) => {
      if (isOtherShow(data)) return;
      setPollStats(prev => ({ question: data.question ?? prev?.question, options: data.options }));
    };
    // The server fixes the winner when the poll closes
    const onPollEnd = (data) => {
      if (isOtherShow(data)) return;
      setPollStats(prev => ({ question: data.question ?? prev?.question, options: data.options }));
      if (data.winner?.text) setWinner(data.winner.text);
    };
    const onPollReveal = (data) => {
      if (isOtherShow(data) || !data?.winner) return;
      setWinner(data.winner);
      setShowEncoreReveal(true);
    };
    const onWarning = (data) => {
      if (isOtherShow(data)) return;
      toast.warning("LAST SONG ALERT: Prepare for Finale");
      setShowWarning(true); // Active UI Alert
    };

    socket.on("show:update", onShowUpdate);
    socket.on("poll:start", onPollStart);
    socket.on("poll:update", onPollUpdate);
    socket.on("poll:end", onPollEnd);
    socket.on("poll:reveal", onPollReveal);
    socket.on("show:warning", onWarning);

    return () => {
      socket.off("show:update", onShowUpdate);
      socket.off("poll:start", onPollStart);
      socket.off("poll:update", onPollUpdate);
      socket.off("poll:end", onPollEnd);
      socket.off("poll:reveal", onPollReveal);
      socket.off("show:warning", onWarning);
    };
  }, [showId, socket]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-[#0F0F10] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0d93f2]" />
      </div>
    );
  }

  if (!show) return <div className="text-white p-10">{syncError || 'Show not found'}</div>;

  return (
    <>
      { }
      <div className="lg:hidden flex h-screen w-full bg-[#0F0F10] items-center justify-center p-6 text-center relative overflow-hidden">
        { }
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#0d93f2]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center max-w-sm">
          <div className="w-20 h-20 bg-[#1F1F22] rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-xl">
            <Monitor className="w-10 h-10 text-[#0d93f2]" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">Desktop Access Only</h2>
          <p className="text-[#90b2cb] leading-relaxed mb-8">
            The Live Show Control Interface requires a larger screen to ensure precise cue management and setlist control.
          </p>

          <Link
            href="/prod-dashboard"
            className="flex items-center gap-2 px-6 py-3 bg-[#1F1F22] hover:bg-[#2c2c30] text-white rounded-lg font-medium transition-colors border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      { }
      <div className="hidden lg:flex flex-col h-screen w-full bg-[#0F0F10] font-sans text-white overflow-hidden">

        { }
        <StudioNavbar />

        {syncError && (
          <div role="alert" className="bg-amber-500/15 border-b border-amber-500/40 text-amber-300 text-sm font-medium px-6 py-2">
            Sync problem: {syncError} The screen is showing the last known state.
          </div>
        )}

        { }
        <LiveHeader
          showName={show.event?.name}
          onResync={fetchShowData} // Pass the data fetcher
          status={show.status}
          bpm={show.currentSong?.bpm ?? '—'} // tempo of the current song, if the setlist has one
          showTime={formatTime(elapsedSeconds)}
        />

        { }
        <div className="flex flex-1 overflow-hidden">

          { }
          <LiveControls
            currentSong={show.currentSong}
            currentCue={show.currentCue}
            pollStats={pollStats}
            winner={winner}
            showWarning={showWarning} // Pass alert state
            onCloseWarning={() => { setShowWarning(false); warningDismissed.current = true; }}
            onRevealEncore={(winnerName) => {
              // Prefer the winner the server fixed at poll close; fall back to the live tally
              if (socket) socket.emit("poll:reveal", { eventId: showId, winner: winner || winnerName });
            }}
          />

          { }
          <SetlistTimeline items={show.setlist} />

        </div>
      </div>
    </>
  );
}