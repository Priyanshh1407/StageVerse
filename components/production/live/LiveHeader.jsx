'use client';

import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw } from 'lucide-react';

export default function LiveHeader({ showName, status, bpm }) {
  const [time, setTime] = useState("00:00:00");

  useEffect(() => {
    // Client-side clock
    const updateTime = () => setTime(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex-none flex items-center justify-between whitespace-nowrap border-b border-[#223949] bg-[#101b22] px-6 py-4 z-20">
      <div className="flex items-center gap-4 text-white">
        <div className="size-8 flex items-center justify-center rounded bg-[#0d93f2]/20 text-[#0d93f2]">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-white text-lg font-bold leading-tight tracking-tight">{showName}</h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium tracking-wide uppercase">
            <span className={`w-2 h-2 rounded-full animate-pulse ${status === 'Live' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
            {status} Show
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-6 border-r border-[#223949] pr-6">
          <div className="flex flex-col items-end">
            <span className="text-xs text-[#90b2cb] uppercase font-bold">System Time</span>
            <span className="text-xl font-bold font-mono tracking-widest text-white">{time}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-[#90b2cb] uppercase font-bold">BPM</span>
            {/* Dynamic BPM */}
            <span className="text-xl font-bold font-mono tracking-widest text-[#0d93f2]">{bpm}</span>
          </div>
        </div>
        
        <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#0d93f2] text-white text-sm font-bold leading-normal tracking-wide shadow-[0_0_15px_rgba(13,147,242,0.4)] transition hover:bg-blue-600">
          <RefreshCw className="w-4 h-4 mr-2 animate-spin-slow" />
          <span className="truncate">SYNC ACTIVE</span>
        </button>
      </div>
    </div>
  );
}