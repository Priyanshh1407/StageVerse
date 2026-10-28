'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from "sonner";
import ArtistNavbar from '@/components/artist/ArtistNavbar';
import LiveHeader from '@/components/artist/live/LiveHeader';
import ShowTimer from '@/components/artist/live/ShowTimer';
import ActionGrid from '@/components/artist/live/ActionGrid';
import SystemLog from '@/components/artist/live/SystemLog';
import VenueInfo from '@/components/artist/live/VenueInfo';
import PollModal from '@/components/artist/live/PollModal';
import PollSelectionModal from '@/components/artist/live/PollSelectionModal';
import WarningModal from '@/components/artist/live/WarningModal';
import EncoreScreen from '@/components/EncoreScreen';
import { useSocket, useShowRoom } from '@/components/providers/SocketProvider';
import { use } from 'react';

const INITIAL_LOGS = [
  { id: 1, time: "20:45:12", msg: "System standby confirmed.", sub: "All nodes responding.", active: true },
  { id: 2, time: "20:30:00", msg: "Support Act Finished." },
];

export default function LiveModePage(props) {
  const params = use(props.params);
  const eventId = params.id;

  const { socket } = useSocket();
  const room = useShowRoom(eventId);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [showStatus, setShowStatus] = useState('Standby');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEncoreScreen, setShowEncoreScreen] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [selectedPollData, setSelectedPollData] = useState(null);

  const addLog = (msg, sub = "", type = "normal") => {
    setLogs(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString('en-US', { hour12: false }), msg, sub, active: type === "active", critical: type === "critical" }, ...prev]);
  };

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return { hours, minutes, seconds };
  };

  useEffect(() => {
    let interval;
    if (showStatus === 'Live') {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showStatus]);

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => toast.success("Connected to Sync Server");
    const onDisconnect = () => toast.error("Lost Connection to Sync Server");
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  useEffect(() => {
    if (room.error) toast.error(`Sync unavailable: ${room.error}`);
  }, [room.error]);

  // Persist show state. The server broadcasts it to the crew after saving,
  // so the DB and every screen agree on what happened.
  const updateLiveState = async (patch) => {
    try {
      const res = await fetch('/api/production/live', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, ...patch })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || 'Could not update the show');
        return false;
      }
      return true;
    } catch (e) {
      toast.error('Network error: show state not saved');
      return false;
    }
  };
  // `time` is this screen's timer: the server's show clock follows it, so every screen agrees
  const updateShowStatus = (newStatus, time) => updateLiveState({ status: newStatus, time });

  // Coming back to a show: pick up where it is (status and clock) instead of Standby at 0:00
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/production/live?eventId=${eventId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json?.success) return;
        setShowStatus(json.showStatus || 'Standby');
        if (typeof json.elapsedSeconds === 'number') setElapsedSeconds(json.elapsedSeconds);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [eventId]);

  const handleStartShow = () => {
    console.log("Triggering Start Show...");
    if (showStatus === 'Live') return;

    if (showStatus === 'Standby') {
      setElapsedSeconds(0);
      addLog("Show Started", "Intro Sequence 01 Initiated", "active");
      updateShowStatus('Live', 0).then((ok) => ok && toast.success("Show started: crew notified"));
    } else {
      // Resuming from Paused — must emit socket and persist to DB too
      addLog("Show Resumed", "Timer continued", "active");
      if (socket && socket.connected) {
        socket.emit("show:update", { eventId, status: 'Live', time: elapsedSeconds });
        toast.success("Sync Signal Broadcasted");
      } else {
        toast.error("Sync Failed: Socket Offline");
      }
      updateShowStatus('Live', elapsedSeconds);
    }
    setShowStatus('Live');
    console.log("State set to Live");
  };

  const handleTriggerPollClick = () => {
    setShowSelectionModal(true);
  };

  const handleSelectPoll = (poll) => {
    setSelectedPollData(poll);
    setShowSelectionModal(false);
    setShowPreviewModal(true);
  };

  const handleConfirmPoll = async () => {
    setShowPreviewModal(false);

    let activePollId = selectedPollData?.id;
    let pollQuestion = selectedPollData?.data?.question || "Encore Poll";
    let rawOptions = selectedPollData?.data?.options || [];
    let pollOptions = rawOptions.map(o => (typeof o === 'object' ? o.text : o));

    try {
      let res;
      if (selectedPollData?.isTemplate) {
        res = await fetch('/api/fan/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            create: true,
            eventId,
            question: pollQuestion,
            options: pollOptions
          })
        });
      } else {
        res = await fetch('/api/fan/poll', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pollId: activePollId,
            isActive: true
          })
        });
      }

      const json = await res.json();
      if (json.success) {
        activePollId = json.poll._id;
        pollOptions = json.poll.options;
        pollQuestion = json.poll.question;

        addLog(`${pollQuestion} Activated`, "Live Pulse System: Voting Open", "active");
        // The server broadcasts poll:start to fans and crew once the poll is open
        toast.success("Poll Distributed to Fans");
      } else {
        toast.error("Failed to activate poll");
        return;
      }

    } catch (e) {
      console.error("Poll Error", e);
      toast.error("Error activating poll");
    }

    setTimeout(async () => {
      addLog("Poll Results Finalized", "Voting Closed", "active");
      try {
        await fetch('/api/fan/poll', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pollId: activePollId,
            isActive: false
          })
        });
      } catch (e) { console.error("Error closing poll", e); }
    }, 60000);
  };

  const handleWarningClick = () => setShowWarningModal(true);

  const handleConfirmWarning = async () => {
    setShowWarningModal(false);
    addLog("Last Song Alert Sent", "Crew prepared for finale/egress", "critical");
    // Saving the warning makes the server alert the crew's screens
    if (await updateLiveState({ warning: true })) toast.success("Alert Signal Sent to Production");
    setTimeout(() => { updateLiveState({ warning: false }); }, 30000);
  };

  const handleEmergencyPause = () => {
    console.log("Triggering Emergency Pause...");
    if (showStatus === 'Paused') {
      setShowStatus('Live');
      addLog("TECHNICAL PAUSE ENDED", "Resuming show flow.", "active");
      if (socket && socket.connected) {
        socket.emit("show:update", { eventId, status: 'Live', time: elapsedSeconds });
        toast.success("Show Resumed");
      }
      updateShowStatus('Live', elapsedSeconds);
    } else {
      setShowStatus('Paused');
      addLog("EMERGENCY PAUSE ACTIVATED", "Timer halted. Audio Cut.", "critical");
      if (socket && socket.connected) {
        socket.emit("show:update", { eventId, status: 'Paused', time: elapsedSeconds });
        toast.error("Emergency Signal Sent");
      }
      updateShowStatus('Paused', elapsedSeconds);
    }
  };

  const handleManualLog = (text) => addLog(text, "Manual Entry");
  const handleOpenSettings = () => toast.info("Opening Settings...");

  return (
    <div className="h-screen bg-[#f5f7f8] dark:bg-[#101b22] text-slate-900 dark:text-white font-sans flex flex-col overflow-hidden">
      <ArtistNavbar />

      {showEncoreScreen && (
        <EncoreScreen
          winnerName="MIDNIGHT CITY"
          onClose={() => setShowEncoreScreen(false)}
        />
      )}

      <main className="flex-1 w-full max-w-[1920px] mx-auto p-4 overflow-y-auto custom-scrollbar">
        <LiveHeader status={showStatus} onOpenSettings={handleOpenSettings} />

        <div className="flex flex-col xl:flex-row gap-6 mt-6 h-full">

          <div className="flex-1 flex flex-col gap-6">
            <ShowTimer time={formatTime(elapsedSeconds)} status={showStatus} />

            <ActionGrid
              status={showStatus}
              onStartShow={handleStartShow}
              onEncorePoll={handleTriggerPollClick}
              onWarning={handleWarningClick}
              onEmergency={handleEmergencyPause}
            />
          </div>

          <div className="w-full xl:w-[400px] flex flex-col gap-6">
            <SystemLog logs={logs} onAddLog={handleManualLog} />
            <VenueInfo />
          </div>

        </div>
      </main>

      <PollSelectionModal
        isOpen={showSelectionModal}
        onClose={() => setShowSelectionModal(false)}
        onSelect={handleSelectPoll}
        eventId={eventId}
      />

      <PollModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onActivate={handleConfirmPoll}
        pollData={selectedPollData}
      />

      <WarningModal
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        onConfirm={handleConfirmWarning}
      />

    </div>
  );
}