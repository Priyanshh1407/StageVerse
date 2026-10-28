'use client';

import { Wifi, Battery, Settings, MapPin } from 'lucide-react';

export default function LiveHeader({ status, onOpenSettings }) {
  const getStatusStyles = () => {
    if (status === 'Live') return "bg-green-500/10 text-green-500 ring-green-500/20";
    if (status === 'Paused') return "bg-red-500/10 text-red-500 ring-red-500/20";
    return "bg-yellow-400/10 text-yellow-500 ring-yellow-400/20";
  };

  const getStatusDot = () => {
    if (status === 'Live') return "bg-green-500";
    if (status === 'Paused') return "bg-red-500";
    return "bg-yellow-500";
  };

  return (
    <>
      <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-[#223949] px-6 py-4 bg-white dark:bg-[#101b23]">
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 text-[#0d93f2]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 3v18M8 8v8M16 8v8M4 11v2M20 11v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] hidden sm:block">LIVE MODE CONTROL</h2>
        </div>
        
        <div className="flex items-center justify-end gap-4 md:gap-8">
          <div className="flex gap-2">
            <div className="flex items-center justify-center rounded-lg h-9 px-3 bg-slate-100 dark:bg-[#223949] text-slate-600 dark:text-white gap-2 text-xs font-bold uppercase tracking-wider">
              <Wifi className="w-4 h-4" />
              <span className="hidden sm:inline">Online</span>
            </div>
            <div className="flex items-center justify-center rounded-lg h-9 px-3 bg-slate-100 dark:bg-[#223949] text-green-500 gap-2 text-xs font-bold uppercase tracking-wider">
              <Battery className="w-4 h-4 fill-current" />
              <span className="hidden sm:inline">100%</span>
            </div>
          </div>
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-[#223949]">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold leading-none">Tour Manager</p>
              <p className="text-xs text-slate-500 dark:text-[#90b2cb]">Access Level: Admin</p>
            </div>
            <div className="bg-center bg-no-repeat bg-cover rounded-full h-10 w-10 border-2 border-[#0d93f2]" style={{ backgroundImage: 'url("https://github.com/shadcn.png")' }}></div>
          </div>
        </div>
      </header>

      <section className="bg-white dark:bg-[#15232d] rounded-xl p-6 border border-slate-200 dark:border-[#223949] shadow-sm">
        <div className="flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-bold ring-1 ring-inset uppercase tracking-widest ${getStatusStyles()}`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-2 animate-pulse ${getStatusDot()}`}></span>
                {status === 'Live' ? 'Show Live' : status === 'Paused' ? 'Emergency' : 'Standby'}
              </span>
              <span className="text-slate-400 dark:text-[#587386] text-sm font-medium uppercase tracking-wide">Doors Open</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight uppercase">
              The Weeknd <span className="text-slate-300 dark:text-[#315168]">@</span> SoFi Stadium
            </h1>
            <p className="text-slate-500 dark:text-[#90b2cb] mt-1 text-sm md:text-base font-medium flex items-center gap-1">
              <MapPin className="w-4 h-4" /> Inglewood, California
            </p>
          </div>
          <button 
            onClick={onOpenSettings}
            className="w-full md:w-auto flex items-center justify-center gap-2 rounded-lg bg-slate-100 dark:bg-[#223949] hover:bg-slate-200 dark:hover:bg-[#2c4759] transition-colors text-slate-900 dark:text-white px-5 py-3 text-sm font-bold uppercase tracking-wider"
          >
            <Settings className="w-4 h-4" />
            Show Settings
          </button>
        </div>
      </section>
    </>
  );
}