'use client';

import React, { useState } from 'react';
import { PlayCircle, AlertTriangle, Eye, Crosshair, Wind, CheckCircle2, Megaphone, BarChart3, Check } from 'lucide-react';
import EncoreScreen from '@/components/EncoreScreen'; // Import the new screen

export default function LiveControls({ currentSong, currentCue, pollStats, winner, onRevealEncore, showWarning, onCloseWarning }) {
  if (!currentSong) return <div className="p-8 text-gray-500">No song active</div>;
  const [showEncoreScreen, setShowEncoreScreen] = useState(false);
  const [encoreWinner, setEncoreWinner] = useState(null);
  const activePoll = pollStats ? {
    isActive: true,
    title: pollStats.question,
    options: pollStats.options.map(o => ({
      ...o,
      title: o.text,
      percent: pollStats.options.reduce((a, b) => a + b.votes, 0) > 0 ? Math.round((o.votes / pollStats.options.reduce((a, b) => a + b.votes, 0)) * 100) : 0,
      winning: winner === o.text // Check if this option is the winner
    }))
  } : null;

  const tech = currentCue.technical || {
    visual: '-', visualDetail: '-', spots: '-', spotsDetail: '-', haze: '-', hazeDetail: '-'
  };
  const handleRevealEncore = (winnerName) => {
    setEncoreWinner(winnerName);
    setShowEncoreScreen(true);
    setTimeout(() => {
      setShowEncoreScreen(false);
    }, 10000);
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden p-4 gap-4 bg-[#0F0F10] relative">

      {}
      {showWarning && (
        <div className="absolute inset-0 z-50 bg-red-600/95 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 backdrop-blur-md">
          <button
            onClick={onCloseWarning}
            className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors p-2"
          >
            <div className="text-sm font-bold uppercase tracking-widest border border-white/30 px-4 py-2 rounded hover:bg-white/10">Dismiss Alert</div>
          </button>
          <AlertTriangle className="w-24 h-24 text-white animate-pulse" />
          <h1 className="text-white text-6xl font-black uppercase tracking-tighter mt-4 drop-shadow-xl border-4 border-white px-8 py-2">
            LAST SONG ALERT
          </h1>
          <p className="text-red-100 font-mono text-xl mt-4 font-bold uppercase tracking-widest animate-pulse">
            PREPARE FOR FINALE SEQUENCE
          </p>
        </div>
      )}

      {}
      {showEncoreScreen && (
        <EncoreScreen
          winnerName={encoreWinner || "ENCORE"}
          onClose={() => setShowEncoreScreen(false)}
          autoClose={10}
        />
      )}

      {}
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

        {}
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

      {}
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
              {currentCue.title} <br />
              <span className="text-[#0d93f2]">{currentCue.action}</span>
            </h2>
            <p className="text-slate-300 text-base md:text-lg font-medium mt-1 border-l-4 border-[#0d93f2] pl-3">
              {currentCue.notes}
            </p>
          </div>
        </div>
      </div>

      {}
      <div className="h-auto md:h-40 shrink-0">
        {activePoll && activePoll.isActive ? (
          <PollMonitor
            poll={activePoll}
            onReveal={(winnerName) => {
              handleRevealEncore(winnerName);
              if (onRevealEncore) onRevealEncore(activePoll);
            }}
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
function PollMonitor({ poll, onReveal }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
  const sortedOptions = [...poll.options]
    .map(opt => ({
      ...opt,
      percent: totalVotes > 0 ? Math.round((opt.votes || 0) / totalVotes * 100) : 0
    }))
    .sort((a, b) => b.percent - a.percent);

  const winner = sortedOptions[0]; // Highest votes = winner

  const handleRevealClick = () => {
    setIsRevealed(true);
    const winnerName = winner?.title || winner?.text || "ENCORE";
    onReveal(winnerName); // Pass the actual winner name
  };

  return (
    <div className="h-auto grid grid-cols-1 md:grid-cols-12 gap-4 flex-none">

      {}
      <div className="md:col-span-8 bg-[#16222b] border border-[#223949] rounded-xl p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-[#0d93f2]" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{poll.title}</span>
          <span className="ml-auto text-xs text-slate-500">{totalVotes} votes</span>
        </div>

        <div className="space-y-2">
          {sortedOptions.map((opt, idx) => {
            const isWinning = idx === 0 && totalVotes > 0;
            return (
              <div key={opt.id || opt._id || idx} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-bold ${isWinning ? 'text-[#0d93f2]' : 'text-white'}`}>
                    {isWinning && <span className="mr-1">👑</span>}
                    {opt.title || opt.text}
                  </span>
                  <span className={`font-mono text-sm font-bold ${isWinning ? 'text-[#0d93f2]' : 'text-slate-400'}`}>
                    {opt.percent}%
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${isWinning ? 'bg-[#0d93f2]' : 'bg-slate-600'}`}
                    style={{ width: `${opt.percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {}
      <button
        onClick={handleRevealClick}
        disabled={isRevealed || totalVotes === 0}
        className={`md:col-span-4 relative overflow-hidden rounded-xl flex flex-col items-center justify-center gap-2 p-4 group transition-all shadow-lg border-2
          ${isRevealed
            ? 'bg-slate-900 border-slate-700 cursor-default opacity-90'
            : totalVotes === 0
              ? 'bg-slate-800 border-slate-700 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 border-blue-500/50 hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]'
          }
        `}
      >
        {!isRevealed ? (
          <>
            <Megaphone className="w-8 h-8 text-white" />
            <span className="text-white font-bold text-sm uppercase tracking-wider">Reveal Winner</span>
            {totalVotes > 0 && (
              <span className="text-white/70 text-xs">{winner?.title || winner?.text}</span>
            )}
          </>
        ) : (
          <>
            <Check className="w-8 h-8 text-green-400" />
            <span className="text-green-400 font-bold text-sm uppercase">Revealed!</span>
          </>
        )}
      </button>
    </div>
  );
}
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