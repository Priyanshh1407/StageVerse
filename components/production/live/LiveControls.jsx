'use client';

import React, { useState } from 'react';
import { PlayCircle, AlertTriangle, Eye, Crosshair, Wind, CheckCircle2, Megaphone, BarChart3, Check } from 'lucide-react';
import EncoreScreen from '@/components/EncoreScreen'; // Import the new screen

export default function LiveControls({ currentSong, currentCue }) {
  if (!currentSong) return <div className="p-8 text-gray-500">No song active</div>;

  // --- STATE FOR FULL SCREEN DISPLAY ---
  const [showEncoreScreen, setShowEncoreScreen] = useState(false);

  // --- MOCK POLL DATA ---
  const activePoll = {
    isActive: true,
    title: "Encore Vote",
    totalVotes: 12450,
    options: [
      { id: 1, title: "Midnight City", type: "M83 Cover", percent: 54, winning: true },
      { id: 2, title: "Wait", type: "M83 Original", percent: 46 }
    ]
  };

  const tech = currentCue.technical || { 
    visual: '-', visualDetail: '-', spots: '-', spotsDetail: '-', haze: '-', hazeDetail: '-' 
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden p-4 gap-4 bg-[#0F0F10]">
      
      {/* --- RENDER FULL SCREEN OVERLAY IF ACTIVE --- */}
      {showEncoreScreen && (
        <EncoreScreen 
          winnerName="MIDNIGHT CITY" 
          onClose={() => setShowEncoreScreen(false)} 
        />
      )}

      {/* 1. Song Header */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex flex-wrap justify-between items-end gap-3">
          <div className="flex flex-col">
            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-[#0d93f2]/20 text-[#0d93f2] w-fit mb-1">
              <PlayCircle className="w-3 h-3" />
              <span className="text-[10px] font-bold tracking-wider uppercase">Now Playing</span>
            </div>
            <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-black leading-none tracking-tight">
              {currentSong.title}
            </h1>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex gap-6 justify-between items-end">
            <p className="text-[#0d93f2] text-xs font-bold tracking-widest uppercase">{currentSong.section}</p>
            <p className="text-slate-400 font-mono text-xs">{currentSong.timeElapsed} <span className="text-slate-600">/</span> {currentSong.duration}</p>
          </div>
          <div className="rounded-full bg-[#16222b] border border-[#223949] h-2.5 overflow-hidden relative">
            <div 
              className="absolute h-full bg-[#0d93f2] transition-all duration-300 ease-linear" 
              style={{ width: `${currentSong.progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC CUE CARD */}
      <div className="flex-1 min-h-[220px] flex flex-col relative rounded-xl overflow-hidden border-2 border-[#0d93f2]/50 shadow-[0_0_20px_rgba(13,147,242,0.1)] group">
        <div className="absolute inset-0 z-0">
           <div 
             className="w-full h-full bg-cover bg-center opacity-40 mix-blend-luminosity group-hover:opacity-50 transition-opacity duration-500" 
             style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop")' }}
           ></div>
           <div className="absolute inset-0 bg-gradient-to-t from-[#101b22] via-[#101b22]/90 to-transparent"></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-between h-full p-5 md:p-6">
          <div className="flex justify-between items-start">
            <div className="bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 animate-pulse" /> {currentCue.type} Cue
            </div>
          </div>
          
          <div className="flex flex-col gap-1 max-w-4xl">
            <h2 className="text-white text-3xl md:text-4xl font-black leading-tight tracking-tight drop-shadow-xl uppercase">
              {currentCue.title} <br/>
              <span className="text-[#0d93f2]">{currentCue.action}</span>
            </h2>
            <p className="text-slate-300 text-base md:text-lg font-medium mt-1 border-l-4 border-[#0d93f2] pl-3">
              {currentCue.notes}
            </p>
          </div>
        </div>
      </div>

      {/* 3. POLL MONITOR SECTION */}
      <div className="h-auto md:h-40 shrink-0">
        {activePoll && activePoll.isActive ? (
          <PollMonitor 
            poll={activePoll} 
            onReveal={() => setShowEncoreScreen(true)} // Pass trigger to monitor
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 h-full">
            <InfoCard icon={Eye} title="Visual Look" value={tech.visual} sub={tech.visualDetail} />
            <InfoCard icon={Crosshair} title="Follow Spots" value={tech.spots} sub={tech.spotsDetail} accent />
            <InfoCard icon={Wind} title="Atmospherics" value={tech.haze} sub={tech.hazeDetail} />
          </div>
        )}
      </div>

    </main>
  );
}

// --- UPDATED POLL MONITOR ---
function PollMonitor({ poll, onReveal }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const winner = poll.options.find(opt => opt.winning) || poll.options[0];

  const handleRevealClick = () => {
    setIsRevealed(true);
    onReveal(); // Trigger the full screen overlay
  };

  return (
    <div className="h-32 md:h-40 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 flex-none">
      
      {/* LEFT CARD: RESULT DISPLAY */}
      <div className="md:col-span-7 bg-[#16222b] border border-[#223949] rounded-xl relative overflow-hidden flex items-center shadow-lg group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 to-transparent opacity-60"></div>
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#0d93f2] shadow-[0_0_15px_#0d93f2]"></div>
        
        <div className="relative z-10 px-6 md:px-8 py-4 flex flex-col justify-center h-full w-full">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#0d93f2] animate-pulse" />
              <span className="text-[#0d93f2] font-bold text-xs uppercase tracking-[0.2em]">Poll Decided</span>
            </div>
            <div className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700 uppercase tracking-wider">
              Verified
            </div>
          </div>
          
          <div className="flex items-baseline justify-between w-full">
            <div>
              <div className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-widest mb-1">Winning Encore</div>
              <div className="text-2xl md:text-4xl xl:text-5xl font-black text-white uppercase tracking-tight drop-shadow-md">
                {winner.title}
              </div>
            </div>
            <div className="hidden md:block text-right opacity-80">
              <span className="block text-3xl font-mono font-bold text-white">{winner.percent}%</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Votes</span>
            </div>
          </div>
        </div>
        
        <BarChart3 className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 pointer-events-none z-0 rotate-12" />
      </div>

      {/* RIGHT BUTTON: REVEAL ACTION */}
      <button 
        onClick={handleRevealClick}
        disabled={isRevealed}
        className={`md:col-span-5 relative overflow-hidden rounded-xl flex flex-col items-center justify-center gap-1 group transition-all shadow-[0_0_20px_rgba(37,99,235,0.5)] border-2 border-blue-500/50
          ${isRevealed 
            ? 'bg-slate-900 border-slate-700 cursor-default opacity-90' 
            : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 hover:shadow-[0_0_40px_rgba(37,99,235,0.7)] active:translate-y-[2px]'
          }
        `}
      >
        {!isRevealed ? (
            <>
                <div className="absolute inset-0 bg-blue-400/20 animate-pulse"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <Megaphone className="w-10 h-10 md:w-12 md:h-12 text-white drop-shadow-md group-hover:scale-110 transition-transform duration-200 mb-1" />
                    <span className="text-white text-lg md:text-2xl xl:text-3xl font-black uppercase tracking-wider drop-shadow-md">
                        Reveal Encore
                    </span>
                    <span className="text-blue-200 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mt-1 group-hover:text-white transition-colors">
                        To Stage & Production
                    </span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </>
        ) : (
            <div className="relative z-10 flex flex-col items-center">
                <CheckCircle2 className="w-10 h-10 text-green-500 mb-1" />
                <span className="text-white text-xl md:text-2xl font-black uppercase tracking-wider">
                    Revealed
                </span>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
                    Sent to Screens
                </span>
            </div>
        )}
      </button>

    </div>
  );
}

// --- HELPER: TECH INFO CARD ---
function InfoCard({ icon: Icon, title, value, sub, accent }) {
  return (
    <div className={`bg-[#16222b] border border-[#223949] rounded-lg p-3 flex flex-col justify-center group transition-colors hover:border-[#0d93f2]/30 ${accent ? 'bg-[#0d93f2]/5 border-[#0d93f2]/20' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${accent ? 'text-[#0d93f2]' : 'text-slate-500 group-hover:text-slate-300'}`} />
        <span className={`text-[10px] font-bold uppercase tracking-wide ${accent ? 'text-[#0d93f2]' : 'text-slate-500 group-hover:text-slate-300'}`}>{title}</span>
      </div>
      <div className="text-white font-bold text-base leading-tight truncate">{value}</div>
      <div className="text-slate-400 text-[10px] mt-0.5 font-mono truncate">{sub}</div>
    </div>
  );
}