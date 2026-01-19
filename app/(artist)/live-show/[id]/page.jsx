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

const INITIAL_LOGS = [
  { id: 1, time: "20:45:12", msg: "System standby confirmed.", sub: "All nodes responding.", active: true },
  { id: 2, time: "20:30:00", msg: "Support Act Finished." },
];

// --- IMPORTS ---
import { useSocket } from '@/components/providers/SocketProvider'; // Import Hook
import { use } from 'react'; // React 19+

export default function LiveModePage(props) {
  const params = use(props.params);
  const eventId = params.id;

  const { socket } = useSocket(); // Use Socket
  // --- STATE MANAGEMENT ---
  // --- STATE MANAGEMENT ---
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [showStatus, setShowStatus] = useState('Standby'); // 'Standby' | 'Live' | 'Paused'
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEncoreScreen, setShowEncoreScreen] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [selectedPollData, setSelectedPollData] = useState(null);

  // --- HELPERS ---
  const addLog = (msg, sub = "", type = "normal") => {
    setLogs(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString('en-US', { hour12: false }), msg, sub, active: type === "active", critical: type === "critical" }, ...prev]);
  };

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return { hours, minutes, seconds };
  };

  // --- TIMER EFFECT ---
  useEffect(() => {
    let interval;
    if (showStatus === 'Live') {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showStatus]);

  // Debug: Monitor Socket Connection
  useEffect(() => {
    if (socket) {
      console.log(`[Artist Page] Socket Status: ${socket.connected ? 'Connected' : 'Disconnected'} (ID: ${socket.id})`);
      socket.on("connect", () => toast.success("Connected to Sync Server"));
      socket.on("disconnect", () => toast.error("Lost Connection to Sync Server"));
    }
  }, [socket]);

  // Helper: Persist Status
  const updateShowStatus = async (newStatus) => {
    try {
      await fetch('/api/production/live', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, status: newStatus })
      });
    } catch (e) {
      console.error("Failed to persist status", e);
    }
  };

  // 1. Start Show
  const handleStartShow = () => {
    console.log("Triggering Start Show...");

    // Check Status Logic
    if (showStatus === 'Live') return;

    if (showStatus === 'Standby') {
      setElapsedSeconds(0);
      addLog("Show Started", "Intro Sequence 01 Initiated", "active");

      // EMIT EVENT
      if (socket && socket.connected) {
        console.log(`[Socket TX] show:start | EventID: ${eventId} | SocketID: ${socket.id}`);
        // Removed hardcoded BPM to let Production handle it
        socket.emit("show:start", { eventId, status: 'Live' });
        toast.success("Sync Signal Broadcasted");
      } else {
        console.error("[Socket Error] Socket not connected! Cannot emit show:start");
        toast.error("Sync Failed: Socket Offline");
        // Fallback: Still update local state? Yes, for UI responsiveness.
      }
      // PERSIST
      updateShowStatus('Live');
    } else {
      addLog("Show Resumed", "Timer continued", "active");
    }
    setShowStatus('Live');
    console.log("State set to Live");
  };

  // 2. Poll Flow
  const handleTriggerPollClick = () => {
    setShowSelectionModal(true); // Open List
  };

  const handleSelectPoll = (poll) => {
    setSelectedPollData(poll);
    setShowSelectionModal(false); // Close List
    setShowPreviewModal(true);    // Open Preview
  };

  const handleConfirmPoll = async () => {
    setShowPreviewModal(false);

    let activePollId = selectedPollData?.id;
    // EXTRACT DATA ROBUSTLY (Handle both DB objects and Template strings)
    let pollQuestion = selectedPollData?.data?.question || "Encore Poll";
    let rawOptions = selectedPollData?.data?.options || [];

    // Normalize options to simple strings for creation, or keep objects for existing
    let pollOptions = rawOptions.map(o => (typeof o === 'object' ? o.text : o));

    // 1. Create or Activate via API
    try {
      let res;
      if (selectedPollData?.isTemplate) {
        // Create New
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
        // Activate Existing
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
        pollOptions = json.poll.options; // Ensure we have DB IDs
        pollQuestion = json.poll.question;

        addLog(`${pollQuestion} Activated`, "Live Pulse System: Voting Open", "active");

        // 2. EMIT POLL START (With DB ID so fans vote on correct object)
        if (socket) {
          console.log(`[Artist] Emitting poll:start for Poll: ${activePollId}`);
          socket.emit("poll:start", {
            eventId,
            pollId: activePollId,
            question: pollQuestion,
            options: pollOptions.map((o, idx) => ({
              id: o._id || `opt-${idx}`,
              text: typeof o === 'string' ? o : (o.text || "Option")
            }))
          });
          toast.success("Poll Distributed to Fans");
        }
      } else {
        toast.error("Failed to activate poll");
        return;
      }

    } catch (e) {
      console.error("Poll Error", e);
      toast.error("Error activating poll");
    }

    // 3. Deactivate after Timeout
    setTimeout(async () => {
      addLog("Poll Results Finalized", "Voting Closed", "active");

      // Notify Frontend
      if (socket) socket.emit("poll:end");

      // Update DB
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

  // 3. Warning Flow
  const handleWarningClick = () => setShowWarningModal(true);

  const handleConfirmWarning = async () => {
    setShowWarningModal(false);
    addLog("Last Song Alert Sent", "Crew prepared for finale/egress", "critical");

    // 1. Persist to DB (Reliability)
    try {
      await fetch('/api/production/live', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, warning: true })
      });
    } catch (e) {
      console.error("Failed to persist warning", e);
    }

    // 2. Emit Socket (Speed)
    if (socket) {
      console.log(`[Artist] Emitting show:warning for Event: ${eventId}`);
      socket.emit("show:warning", { eventId });
      toast.success("Alert Signal Sent to Production");
    } else {
      console.error("[Artist] Socket disconnected. Cannot send warning.");
      toast.error("Socket Error: Check Connection");
    }

    // 3. Auto-Clear Warning after 30s (Optional)
    setTimeout(async () => {
      try {
        await fetch('/api/production/live', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, warning: false })
        });
      } catch (e) { }
    }, 30000);
  };

  // 4. Emergency
  const handleEmergencyPause = () => {
    console.log("Triggering Emergency Pause...");
    if (showStatus === 'Paused') {
      setShowStatus('Live');
      addLog("TECHNICAL PAUSE ENDED", "Resuming show flow.", "active");

      // EMIT EVENT (Resume - Continued Flow)
      if (socket && socket.connected) {
        // Resume from current time, do NOT restart
        socket.emit("show:update", { eventId, status: 'Live', time: elapsedSeconds });
        toast.success("Show Resumed");
      }
      updateShowStatus('Live');
    } else {
      setShowStatus('Paused');
      addLog("EMERGENCY PAUSE ACTIVATED", "Timer halted. Audio Cut.", "critical");

      // EMIT EVENT (Pause)
      if (socket && socket.connected) {
        // Send current time so crew pauses at EXACT same second
        socket.emit("show:update", { eventId, status: 'Paused', time: elapsedSeconds });
        toast.error("Emergency Signal Sent");
      }
      updateShowStatus('Paused');
    }
  };

  // 5. Manual Log
  const handleManualLog = (text) => addLog(text, "Manual Entry");
  const handleOpenSettings = () => toast.info("Opening Settings...");

  return (
    <div className="h-screen bg-[#f5f7f8] dark:bg-[#101b22] text-slate-900 dark:text-white font-sans flex flex-col overflow-hidden">
      <ArtistNavbar />

      {/* --- FULL SCREEN OVERLAY (Conditionally Rendered) --- */}
      {showEncoreScreen && (
        <EncoreScreen
          winnerName="MIDNIGHT CITY"
          onClose={() => setShowEncoreScreen(false)}
        />
      )}

      <main className="flex-1 w-full max-w-[1920px] mx-auto p-4 overflow-y-auto custom-scrollbar">
        <LiveHeader status={showStatus} onOpenSettings={handleOpenSettings} />

        <div className="flex flex-col xl:flex-row gap-6 mt-6 h-full">

          {/* LEFT COLUMN: Controls */}
          <div className="flex-1 flex flex-col gap-6">
            <ShowTimer time={formatTime(elapsedSeconds)} status={showStatus} />

            <ActionGrid
              status={showStatus}
              onStartShow={handleStartShow}
              onEncorePoll={handleTriggerPollClick} // Starts Selection Flow
              onWarning={handleWarningClick}        // Starts Warning Flow
              onEmergency={handleEmergencyPause}
            // Optional: Manual Trigger for Screen if you want a button for it
            // onReveal={() => setShowEncoreScreen(true)} 
            />
          </div>

          {/* RIGHT COLUMN: Logs & Venue */}
          <div className="w-full xl:w-[400px] flex flex-col gap-6">
            <SystemLog logs={logs} onAddLog={handleManualLog} />
            <VenueInfo />
          </div>

        </div>
      </main>

      {/* --- MODALS --- */}

      {/* 1. Poll Selection Modal */}
      <PollSelectionModal
        isOpen={showSelectionModal}
        onClose={() => setShowSelectionModal(false)}
        onSelect={handleSelectPoll}
        eventId={eventId}
      />

      {/* 2. Poll Preview Modal */}
      <PollModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onActivate={handleConfirmPoll}
        pollData={selectedPollData}
      />

      {/* 3. Last Song Warning Modal */}
      <WarningModal
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        onConfirm={handleConfirmWarning}
      />

    </div>
  );
}