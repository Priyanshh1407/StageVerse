'use client';

import { Search } from 'lucide-react';

export default function EventsHero({ searchValue, onSearchChange }) {
  return (
    <div className="relative h-[26vh] min-h-[220px] lg:h-[34vh] w-full overflow-hidden">
      <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: 'url("/images/events/desert-1.jpg")' }}></div>
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#0a0a0a]/30 via-[#0a0a0a]/80 to-[#0a0a0a]"></div>

      <div className="relative z-20 flex h-full flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-white sm:text-6xl drop-shadow-lg">
          Events
        </h1>
        <p className="mb-5 max-w-2xl text-base text-slate-200 sm:text-lg drop-shadow-md">
          Find a show near you.
        </p>

        <div className="w-full max-w-2xl">
          <div className="relative flex items-center group">
            <Search className="absolute left-4 w-5 h-5 text-slate-400 group-focus-within:text-[#ffb000] transition-colors" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-full border border-white/10 bg-[#121212]/80 py-3 pl-12 pr-4 text-white placeholder-slate-500 backdrop-blur-md focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] outline-none transition-all"
              aria-label="Search events, artists or venues"
              placeholder="Search events, artists or venues"
            />
          </div>
        </div>
      </div>
    </div>
  );
}