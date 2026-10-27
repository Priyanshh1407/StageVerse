'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Loader2, Monitor, ArrowLeft } from 'lucide-react';
import StudioNavbar from '@/components/production/StudioNavbar';
import LiveHeader from '@/components/production/live/LiveHeader';
import LiveControls from '@/components/production/live/LiveControls';
import SetlistTimeline from '@/components/production/live/SetlistTimeline';
import { useSocket } from '@/components/providers/SocketProvider';

import { toast } from "sonner";
import ShowTimer from "@/components/artist/live/ShowTimer"; // Reuse Artist Timer

export default function LiveShowPage(props) {
  const params = use(props.params);
  const showId = params.id;
  const { socket, isConnected } = useSocket(); // Use Socket
  useEffect(() => {
    if (socket) {
      console.log(`[Production Page] Socket Status: ${socket.connected ? 'Connected' : 'Disconnected'} (ID: ${socket.id})`);
      socket.on("connect", () => toast.success("Crew: Connected to Sync Server"));
      socket.on("disconnect", () => toast.error("Crew: Lost Connection"));
    }
  }, [socket]);

  const [isLoading, setIsLoading] = useState(true);
  const [show, setShow] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pollStats, setPollStats] = useState(null);
  const [showEncoreReveal, setShowEncoreReveal] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [winner, setWinner] = useState(null);
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
      if (json.success) {
        setShow(prev => {
          // Always trust the DB status — artist writes to DB on every action (start, pause, resume)
          // Sockets handle polls/warnings; DB polling handles show status reliably
          const newStatus = json.showStatus || 'Standby';

          console.log(`[Poll] DB Status: ${json.showStatus} -> Setting: ${newStatus}`);

          return {
            ...prev,
            name: json.event.title,
            status: newStatus,
            bpm: 128,
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
    } catch (e) {
      console.error("Error fetching show data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShowData();
    const interval = setInterval(() => {
      fetchShowData();
    }, 1000); // 1-second polling for near-instant sync with artist actions

    return () => clearInterval(interval);
  }, [showId]);

  useEffect(() => {
    if (!socket) return;
    const onShowUpdate = (data) => {
      console.log(`[Socket RX] show:update`, data);
      toast.info(`Signal Received: ${data.status}`);
      if (data.eventId && String(data.eventId) !== String(showId)) {
        console.error(`[Sync Warning] Mismatch! Page: ${showId} vs Socket: ${data.eventId}`);
        toast.warning(`Event ID Mismatch (P:${showId} vs S:${data.eventId})`, {
          description: "Proceeding with update anyway (Debug Mode)",
          duration: 5000
        });
      }
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
      console.log("Socket: Poll Started", data);
      toast.info("ENCORE POLL STARTED");
      setPollStats({
        question: data.question,
        options: data.options.map(o => ({ ...o, votes: 0 }))
      });
    };
    const onPollUpdate = (data) => {
      setPollStats(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          options: prev.options.map(opt =>
            (opt.id === data.optionId || opt._id === data.optionId)
              ? { ...opt, votes: opt.votes + 1 }
              : opt
          )
        };
      });
    };
    const onPollReveal = (data) => {
      setWinner(data?.winner || "Midnight City");
      setShowEncoreReveal(true);
    };
    const onWarning = () => {
      console.log("[Socket RX] show:warning RECEIVED");
      toast.warning("LAST SONG ALERT: Prepare for Finale");
      setShowWarning(true); // Active UI Alert
    };

    socket.on("show:update", onShowUpdate);
    socket.on("poll:start", onPollStart);
    socket.on("poll:update", onPollUpdate);
    socket.on("poll:reveal", onPollReveal);
    socket.on("show:warning", onWarning);

    return () => {
      socket.off("show:update", onShowUpdate);
      socket.off("poll:start", onPollStart);
      socket.off("poll:update", onPollUpdate);
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

  if (!show) return <div className="text-white p-10">Show not found</div>;

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

        { }
        <LiveHeader
          showName={show.event?.name}
          onResync={fetchShowData} // Pass the data fetcher
          status={show.status}
          bpm={show.currentSong?.bpm || show.bpm || 128} // Dynamic BPM
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
            onRevealEncore={(poll) => {
              if (socket) socket.emit("poll:reveal", { winner: poll.options.find(o => o.winning)?.title });
            }}
          />

          { }
          <SetlistTimeline items={show.setlist} />

        </div>
      </div>
    </>
  );
}