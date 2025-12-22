'use client';

import React from 'react';
import { PlayCircle, AlertTriangle, Eye, Crosshair, Wind } from 'lucide-react';

export default function LiveControls({ currentSong, currentCue }) {
  if (!currentSong) return <div className="p-8 text-gray-500">No song active</div>;

  // Destructure technical details for cleaner access
  const tech = currentCue.technical || { 
    visual: '-', visualDetail: '-', spots: '-', spotsDetail: '-', haze: '-', hazeDetail: '-' 
  };

  return (
    // UPDATED: Reduced padding (p-4) and gap (gap-4) to prevent scrolling
    <main className="flex-1 flex flex-col overflow-hidden p-4 gap-4 bg-[#0F0F10]">
      
      {/* Song Header - Compacted */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex flex-wrap justify-between items-end gap-3">
          <div className="flex flex-col">
            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-[#0d93f2]/20 text-[#0d93f2] w-fit mb-1">
              <PlayCircle className="w-3 h-3" />
              <span className="text-[10px] font-bold tracking-wider uppercase">Now Playing</span>
            </div>
            {/* Reduced text size slightly */}
            <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-black leading-none tracking-tight">
              {currentSong.title}
            </h1>
          </div>
        </div>

        {/* Progress Bar - Compacted */}
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
            <div className="absolute inset-0 flex justify-evenly opacity-30">
              {[...Array(4)].map((_, i) => <div key={i} className="w-px h-full bg-black"></div>)}
            </div>
          </div>
        </div>
      </div>

      {/* DYNAMIC CUE CARD - Height Reduced */}
      {/* UPDATED: min-h reduced from 300px to 220px to save vertical space */}
      <div className="flex-1 min-h-[220px] flex flex-col relative rounded-xl overflow-hidden border-2 border-[#0d93f2]/50 shadow-[0_0_20px_rgba(13,147,242,0.1)] group">
        
        {/* BACKGROUND IMAGE LAYER */}
        <div className="absolute inset-0 z-0">
           <img 
             className="w-full h-full object-cover opacity-40 mix-blend-luminosity group-hover:opacity-50 transition-opacity duration-500" 
             src="https://lh3.googleusercontent.com/aida-public/AB6AXuCvuyBocEQpInLKrFfd4iBJVzKlAf11Pq3JaLKWAJYJ15YVZPf_2o1YZf5eKmb57SvxBr9bq5eh-m1A6qLYp-aaR1yJFpoggqUsB28ZB5H2meQmlUFYn9RyUU3JOJOq5r4ihPgURkbwIN-rf4LAkvZnOFVobQTFwHsaQJv2ArJX-N8BJH6nBS0TGnh_KJXMFphr-DYIqhQ6aGhRUCkC-kOfOTWUXZ0zrgM9FUtTurci4ZKgkXL5qNQAkkkMV1OrrAuLMEokikrfJZYa" 
             alt="Stage lighting background"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-[#101b22] via-[#101b22]/90 to-transparent"></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-between h-full p-5 md:p-6">
          <div className="flex justify-between items-start">
            <div className="bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 animate-pulse" /> {currentCue.type} Cue
            </div>
            {/* Reduced text size */}
          </div>
          
          <div className="flex flex-col gap-1 max-w-4xl">
            {/* Reduced text size */}
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

      {/* TECHNICAL CONTEXT PANEL - Dynamic & Compact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 h-auto md:h-24 shrink-0">
        
        <InfoCard 
          icon={Eye} 
          title="Visual Look" 
          value={tech.visual} 
          sub={tech.visualDetail} 
        />

        <InfoCard 
          icon={Crosshair} 
          title="Follow Spots" 
          value={tech.spots} 
          sub={tech.spotsDetail} 
          accent 
        />

        <InfoCard 
          icon={Wind} 
          title="Atmospherics" 
          value={tech.haze} 
          sub={tech.hazeDetail} 
        />

      </div>
    </main>
  );
}

// Compact Info Card Sub-component
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