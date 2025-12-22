'use client';

import React from 'react';

export default function SetlistTimeline({ items = [] }) {
  return (
    <aside className="w-80 lg:w-96 hidden md:flex flex-col bg-[#16222b] border-l border-[#223949]">
      
      <div className="p-5 border-b border-[#223949] flex justify-between items-center bg-[#101b22]">
        <h3 className="text-white font-bold text-lg">Up Next</h3>
        <span className="text-xs text-slate-400 font-mono">SCROLL: AUTO</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {items.map((item) => (
          <TimelineItem key={item.id} item={item} />
        ))}
      </div>

      <div className="p-4 border-t border-[#223949] bg-[#101b22]">
        <label className="flex items-center justify-between cursor-pointer group">
          <span className="text-slate-400 font-bold text-sm uppercase group-hover:text-white transition-colors">Manual Override</span>
          <div className="relative inline-flex items-center cursor-pointer">
            <input className="sr-only peer" type="checkbox" />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0d93f2]"></div>
          </div>
        </label>
      </div>
    </aside>
  );
}

function TimelineItem({ item }) {
  // 1. COMPLETED ITEMS
  if (item.status === 'completed') {
    return (
      <div className="opacity-40 select-none pointer-events-none">
        <div className="flex gap-4 p-3 rounded-lg border border-transparent">
          <span className="text-slate-500 font-mono text-sm pt-1">{item.id}</span>
          <div>
            <p className="text-white font-bold text-lg leading-tight">{item.title}</p>
            <p className="text-slate-500 text-xs font-medium uppercase mt-1">Completed</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. LIVE ITEMS
  if (item.status === 'live') {
    return (
      <div className="relative">
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#0d93f2] rounded-r"></div>
        <div className="flex gap-4 p-3 rounded-lg bg-[#0d93f2]/10 border border-[#0d93f2]/30">
          <span className="text-[#0d93f2] font-mono text-sm pt-1 animate-pulse">{item.id}</span>
          <div>
            <p className="text-white font-bold text-lg leading-tight">{item.title}</p>
            <p className="text-[#0d93f2] text-xs font-bold uppercase mt-1">Live Now</p>
          </div>
        </div>
      </div>
    );
  }

  // 3. PENDING ITEMS (Default)
  return (
    <div className="group">
      <div className="flex gap-4 p-3 rounded-lg border border-[#223949] bg-[#101b22] hover:border-slate-600 transition-colors cursor-pointer">
        <span className="text-slate-400 font-mono text-sm pt-1 group-hover:text-white">{item.id}</span>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <p className="text-white font-bold text-lg leading-tight group-hover:text-[#0d93f2] transition-colors">{item.title}</p>
            {item.duration && <span className="text-xs font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">{item.duration}</span>}
          </div>
          <p className="text-slate-400 text-xs font-medium uppercase mt-1">{item.notes}</p>
        </div>
      </div>
    </div>
  );
}