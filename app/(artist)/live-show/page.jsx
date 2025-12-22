'use client';

import { useState, useEffect } from 'react';
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

export default function LiveModePage() {
  // --- STATE MANAGEMENT ---
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [showStatus, setShowStatus] = useState('Standby'); // 'Standby' | 'Live' | 'Paused'
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Modals & Overlays
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showEncoreScreen, setShowEncoreScreen] = useState(false);
  
  // Data Passing
  const [selectedPollData, setSelectedPollData] = useState(null);

  // --- TIMER LOGIC ---
  useEffect(() => {
    let interval = null;
    if (showStatus === 'Live') {
      interval = setInterval(() => setElapsedSeconds((prev) => prev + 1), 1000);
    } else if (showStatus === 'Paused') {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [showStatus]);

  // Helper: Time Formatter
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return { hours, minutes, seconds };
  };

  // Helper: Logger
  const addLog = (message, subtext = "", type = "neutral") => {
    const newLog = {
      id: Date.now(),
      time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
      msg: message,
      sub: subtext,
      active: type === "active",
      critical: type === "critical"
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  // --- HANDLERS ---

  // 1. Start Show
  const handleStartShow = () => {
    if (showStatus === 'Live') return;
    if (showStatus === 'Standby') {
        setElapsedSeconds(0); 
        addLog("Show Started", "Intro Sequence 01 Initiated", "active");
    } else {
        addLog("Show Resumed", "Timer continued", "active");
    }
    setShowStatus('Live');
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

  const handleConfirmPoll = () => {
    setShowPreviewModal(false);
    addLog(`${selectedPollData?.title || 'Poll'} Activated`, "Live Pulse System: Voting Open", "active");
    
    // Simulate flow: After 5 seconds, simulate a winner (optional)
    setTimeout(() => {
        addLog("Poll Results Finalized", "Winner: Midnight City (54%)", "active");
    }, 5000);
  };

  // 3. Warning Flow
  const handleWarningClick = () => setShowWarningModal(true);

  const handleConfirmWarning = () => {
    setShowWarningModal(false);
    addLog("Last Song Alert Sent", "Crew prepared for finale/egress", "critical");
  };

  // 4. Emergency
  const handleEmergencyPause = () => {
    if (showStatus === 'Paused') {
        setShowStatus('Live');
        addLog("TECHNICAL PAUSE ENDED", "Resuming show flow.", "active");
    } else {
        setShowStatus('Paused');
        addLog("EMERGENCY PAUSE ACTIVATED", "Timer halted. Audio Cut.", "critical");
    }
  };

  // 5. Manual Log
  const handleManualLog = (text) => addLog(text, "Manual Entry");
  const handleOpenSettings = () => alert("Opening Settings...");

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
      />

      {/* 2. Poll Preview Modal */}
      <PollModal 
        isOpen={showPreviewModal} 
        onClose={() => setShowPreviewModal(false)} 
        onActivate={handleConfirmPoll}
        // Pass title dynamically if your modal supports it, e.g. title={selectedPollData?.title}
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