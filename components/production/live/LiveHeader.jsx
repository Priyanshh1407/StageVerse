'use client';

import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw } from 'lucide-react';

export default function LiveHeader({ showName, status, bpm, showTime }) {
  const [time, setTime] = useState("00:00:00");

  useEffect(() => {    const updateTime = () => setTime(new Date().toLocaleTimeString('en-GB', { hour12: false }));
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
            {}
            <span className="text-xl font-bold font-mono tracking-widest text-[#0d93f2]">{bpm}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-[#90b2cb] uppercase font-bold">Show Duration</span>
            <span className="text-xl font-bold font-mono tracking-widest text-emerald-400">
              {showTime?.minutes || "00"}:{showTime?.seconds || "00"}
            </span>
          </div>
        </div>

        <ConnectionStatus />
      </div>
    </div>
  );
}function ConnectionStatus({ onResync }) {
  const { socket, isConnected } = require("@/components/providers/SocketProvider").useSocket();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleResync = async () => {
    setIsSyncing(true);    if (socket) {
      socket.disconnect();
      socket.connect();
    }    if (onResync) await onResync();

    setTimeout(() => setIsSyncing(false), 1000);
  };

  return (
    <div className="flex items-center gap-2">
      {}
      <button
        onClick={handleResync}
        disabled={isSyncing}
        className="h-10 w-10 flex items-center justify-center rounded-lg bg-[#16222b] border border-[#223949] text-slate-400 hover:text-white hover:border-[#0d93f2] hover:bg-[#0d93f2]/10 transition-all"
        title="Force Re-Sync"
      >
        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#0d93f2]' : ''}`} />
      </button>

      {}
      <div className={`flex min-w-[84px] items-center justify-center overflow-hidden rounded-lg h-10 px-4 text-white text-sm font-bold leading-normal tracking-wide shadow-lg transition-all ${isConnected ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-red-500/50'}`}>
        <Activity className={`w-4 h-4 mr-2 ${isConnected ? 'text-white' : 'animate-pulse'}`} />
        <span className="truncate">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
      </div>
    </div>
  );
}
