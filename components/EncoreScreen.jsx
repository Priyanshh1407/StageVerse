'use client';

import React, { useEffect, useState } from 'react';
import { AudioWaveform, X } from 'lucide-react'; 

export default function EncoreScreen({ winnerName, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {    const enterTimer = setTimeout(() => setVisible(true), 100);    const exitAnimTimer = setTimeout(() => {
      setVisible(false);
    }, 19000);    const closeTimer = setTimeout(() => {
      if (onClose) onClose();
    }, 20000);    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitAnimTimer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center w-full h-full bg-[#050505] text-white overflow-hidden font-sans">
      
      {}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-[#0d93f2]/10 rounded-full blur-[150px] opacity-40 pointer-events-none"></div>

      {}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 z-50 p-2 text-white/20 hover:text-white bg-black/50 rounded-full backdrop-blur-md transition-colors border border-white/10"
        title="Close Stage Screen"
      >
        <X className="w-6 h-6" />
      </button>

      {}
      <div className={`relative z-10 flex flex-col items-center justify-center w-full max-w-[90vw] transition-all duration-1000 ease-in-out ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        
        {}
        <div className="mb-4 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500 fill-mode-forwards opacity-0" style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#0d93f2] font-bold tracking-[0.2em] text-xs sm:text-sm uppercase backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0d93f2] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0d93f2]"></span>
            </span>
            Winner Selected
          </span>
        </div>

        {}
        <h1 className="text-white font-black tracking-tighter text-[12vw] leading-[0.9] text-center uppercase drop-shadow-2xl break-words w-full max-w-7xl">
          {winnerName || "MIDNIGHT CITY"}
        </h1>

        {}
        <p className="mt-6 text-white/40 font-bold tracking-[0.3em] text-lg sm:text-xl md:text-2xl uppercase">
          Live Audience Poll
        </p>

        {}
        <div className="absolute -bottom-32 w-64 h-1 bg-white/10 rounded-full overflow-hidden">
             <div className="h-full bg-[#0d93f2] w-full animate-[shrink_20s_linear_forwards]" style={{ animationName: 'shrinkWidth' }}></div>
        </div>

      </div>

      {}
      <div className={`absolute bottom-6 right-6 sm:bottom-10 sm:right-10 z-20 opacity-30 select-none transition-opacity duration-1000 ${visible ? 'opacity-30' : 'opacity-0'}`}>
        <div className="flex items-center gap-3">
          <AudioWaveform className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          <div className="flex flex-col">
            <span className="text-white font-black tracking-widest text-lg sm:text-xl leading-none">STAGEVERSE</span>
            <span className="text-white/60 text-[10px] tracking-[0.2em] uppercase leading-none mt-1 text-right">Live OS</span>
          </div>
        </div>
      </div>

      {}
      <style jsx>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>

    </div>
  );
}