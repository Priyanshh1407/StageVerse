'use client';

import { MessageSquare, CalendarDays } from 'lucide-react';

export default function ShowHeader({ city, venue, date }) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-6 border-b border-[#315168]/30">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tighter uppercase text-slate-900 dark:text-white">
            {city}
          </h1>
          <span className="px-3 py-1 rounded-full bg-[#0d93f2]/20 text-[#0d93f2] text-xs font-bold uppercase tracking-wider border border-[#0d93f2]/30 animate-pulse">
            Live Sync
          </span>
        </div>
        <p className="text-slate-500 dark:text-[#90b2cb] text-lg md:text-xl font-medium">
          {venue} • {date}
        </p>
      </div>
      <div className="flex gap-3 w-full md:w-auto">
        <button className="flex-1 md:flex-none h-12 px-6 rounded-lg bg-[#223949] hover:bg-[#315168] text-white text-sm font-bold flex items-center justify-center gap-2 transition-all">
          <MessageSquare className="w-5 h-5" />
          <span>Tour Manager</span>
        </button>
        <button className="h-12 w-12 rounded-lg border border-[#315168] text-[#90b2cb] hover:text-white flex items-center justify-center transition-colors">
          <CalendarDays className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}