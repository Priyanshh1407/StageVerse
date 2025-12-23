'use client';

import { Search } from 'lucide-react';

export default function EventsHero({ searchValue, onSearchChange }) {
  return (
    <div className="relative h-[30vh] lg:h-[60vh] w-full overflow-hidden">
      <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuApOLvMR5d5NCgq_-zJBVRVu7Hi4FjvkgRzkiCDsacOx8S3fzqJ5zG7atOBr9XdwzWhsIhvDX4PW8YNJ_4-a93JY2_u7W1geg_-uAllrb-Ao828N1wvxwpX4XJ4ppOnhq70RChbaXio0EjNILsDyCtoeQHohaKGe7pFyixkt9HiaihOO_NQkALf2RYrBgYbwPX6DETT8y6gdxw7kqqdJ4wyeBFaZ5eaNLHz_JU8xukdusyNuR5Hsrrnl9rGj0U2PnjGe3TB4C3_JB3z")' }}></div>
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#0a0a0a]/30 via-[#0a0a0a]/80 to-[#0a0a0a]"></div>

      <div className="relative z-20 flex h-full flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-6 text-5xl font-bold tracking-tight text-white sm:text-7xl drop-shadow-lg">
          Find Your <span className="text-[#00d4ff]">Stage.</span>
        </h1>
        <p className="mb-8 max-w-2xl text-lg text-slate-300 sm:text-xl drop-shadow-md">
          Explore the universe of live music.
        </p>
        
        <div className="w-full max-w-2xl">
          <div className="relative flex items-center group">
            <Search className="absolute left-4 w-5 h-5 text-slate-400 group-focus-within:text-[#00d4ff] transition-colors" />
            <input 
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-full border border-white/10 bg-[#121212]/80 py-3 pl-12 pr-4 text-white placeholder-slate-500 backdrop-blur-md focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] outline-none transition-all" 
              placeholder="Search events, artists, or venues..." 
            />
          </div>
        </div>
      </div>
    </div>
  );
}