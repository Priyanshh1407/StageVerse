'use client';

import { Wifi, Copy, Lock, Info, Star, Navigation } from 'lucide-react';

export default function VenueIntel() {
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    alert(`Copied: ${text}`);
  };

  return (
    <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-5 h-5 text-[#0d93f2]" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Venue Intel</h3>
      </div>

      {/* WIFI CARD */}
      <div className="flex flex-col gap-4 rounded-xl border border-[#315168] bg-white dark:bg-[#1c2a35] p-5 shadow-sm hover:border-[#0d93f2]/50 transition-colors">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-slate-100 dark:bg-[#101b23] rounded-lg text-[#0d93f2]">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs uppercase text-[#90b2cb] font-bold tracking-wider">Venue Wifi</p>
            <p className="text-slate-900 dark:text-white text-lg font-bold leading-tight mt-1">Riviera_Artist</p>
          </div>
        </div>
        <div className="flex items-center justify-between bg-slate-100 dark:bg-[#101b23] p-3 rounded-lg border border-[#315168]/50">
          <p className="font-mono text-[#0d93f2] text-sm tracking-wide">RocknRoll2024!</p>
          <button onClick={() => handleCopy('RocknRoll2024!')} className="text-[#90b2cb] hover:text-white transition-colors">
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* GREEN ROOM CARD */}
      <div className="flex flex-col gap-4 rounded-xl border border-[#315168] bg-white dark:bg-[#1c2a35] p-5 shadow-sm hover:border-[#0d93f2]/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 dark:bg-[#101b23] rounded-lg text-green-500">
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase text-[#90b2cb] font-bold tracking-wider">Green Room</p>
            <div className="flex justify-between items-baseline mt-1">
              <p className="text-slate-900 dark:text-white text-lg font-bold leading-tight">Code: 4590#</p>
              <button onClick={() => handleCopy('4590#')} className="text-[#90b2cb] hover:text-white transition-colors">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAP / COFFEE CARD */}
      <div className="rounded-xl border border-[#315168] bg-white dark:bg-[#1c2a35] overflow-hidden group">
        <div className="relative h-32 w-full bg-slate-800">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-overlay group-hover:opacity-80 transition-opacity" 
            style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=800&auto=format&fit=crop")' }}
          ></div>
          <div className="absolute top-3 right-3 bg-white text-black text-xs font-bold px-2 py-1 rounded shadow">
            0.2 mi
          </div>
        </div>
        <div className="p-5">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs uppercase text-[#90b2cb] font-bold tracking-wider mb-1">Best Coffee Nearby</p>
              <h4 className="text-slate-900 dark:text-white text-lg font-bold">Dark Matter Coffee</h4>
            </div>
            <div className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
              <Star className="w-3 h-3 fill-current" />
              <span className="text-sm font-bold">4.8</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-[#90b2cb] mb-4">"Mothership" location. Known for psychedelic blends and strong espresso.</p>
          <button className="w-full h-10 rounded-lg bg-[#0d93f2] hover:bg-blue-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors">
            <Navigation className="w-4 h-4" />
            Get Directions
          </button>
        </div>
      </div>

    </div>
  );
}