'use client';

import { RotateCcw, X, Check } from 'lucide-react';

export default function EventsFilter({ filters, setFilters, onReset, isOpen, onClose }) {
  
  const update = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  // Helper for Arrays (Vibes and Genres)
  const toggleArrayItem = (field, item) => {
    setFilters(prev => {
      const list = prev[field];
      const exists = list.includes(item);
      return {
        ...prev,
        [field]: exists ? list.filter(i => i !== item) : [...list, item]
      };
    });
  };

  const GENRES = ['Electronic', 'Rock', 'Indie', 'Jazz', 'Pop', 'Conference'];

  return (
    <>
      <div 
        onClick={onClose}
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      ></div>

      <aside 
        className={`
          fixed top-0 right-0 bottom-0 z-50 w-[85%] max-w-sm bg-[#121212] border-l border-white/10 p-6 overflow-y-auto transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-0 lg:w-72 lg:shrink-0 lg:bg-transparent lg:border-none lg:p-0 lg:overflow-visible
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="lg:sticky lg:top-24 lg:rounded-xl lg:border lg:border-white/10 lg:bg-[#121212]/60 lg:backdrop-blur-md lg:p-6">
          
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Filter By</h3>
            <div className="flex items-center gap-4">
              <button onClick={onReset} className="flex items-center gap-1 text-xs text-[#00d4ff] hover:text-white transition-colors">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
              <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            
            {/* Genre List */}
            <div>
              <label className="mb-3 block text-sm font-medium text-slate-300">Genres</label>
              <div className="space-y-2">
                {GENRES.map(genre => {
                  const isSelected = filters.genres.includes(genre);
                  return (
                    <button
                      key={genre}
                      onClick={() => toggleArrayItem('genres', genre)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-all ${
                        isSelected 
                          ? 'bg-[#00d4ff]/10 border-[#00d4ff] text-[#00d4ff]' 
                          : 'bg-[#1e1e1e] border-transparent text-slate-400 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <span>{genre}</span>
                      {isSelected && <Check className="w-4 h-4" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <hr className="border-white/10" />

            {/* City Select */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">City</label>
              <select 
                value={filters.city}
                onChange={(e) => update('city', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#1e1e1e] px-3 py-2 text-sm text-white focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] outline-none"
              >
                <option value="All">All Cities</option>
                <option value="New York">New York, NY</option>
                <option value="Los Angeles">Los Angeles, CA</option>
                <option value="London">London, UK</option>
                <option value="Berlin">Berlin, DE</option>
                <option value="Mumbai">Mumbai, IN</option>
                <option value="Tokyo">Tokyo, JP</option>
              </select>
            </div>

            {/* Date Picker */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Date</label>
              <input 
                type="date" 
                value={filters.date}
                onChange={(e) => update('date', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#1e1e1e] px-3 py-2 text-sm text-white focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] outline-none [color-scheme:dark]" 
              />
            </div>

            {/* Price Range */}
            <div>
              <div className="mb-2 flex justify-between text-sm text-slate-300">
                <span>Max Price</span>
                <span className="text-[#00d4ff]">${filters.maxPrice}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="300" 
                value={filters.maxPrice}
                onChange={(e) => update('maxPrice', Number(e.target.value))}
                className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 accent-[#00d4ff]" 
              />
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>Free</span>
                <span>$300+</span>
              </div>
            </div>

            {/* Vibe Tags */}
            <div>
              <label className="mb-3 block text-sm font-medium text-slate-300">Vibe</label>
              <div className="flex flex-wrap gap-2">
                {['Chill', 'Raging', 'Intimate', 'Acoustic', 'Visuals'].map((vibe) => {
                  const isActive = filters.vibes.includes(vibe);
                  return (
                    <button 
                      key={vibe}
                      onClick={() => toggleArrayItem('vibes', vibe)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        isActive 
                          ? 'border-[#00d4ff] bg-[#00d4ff] text-black font-bold' 
                          : 'border-white/10 bg-[#1e1e1e] text-slate-400 hover:border-[#00d4ff]/50 hover:text-white'
                      }`}
                    >
                      {vibe}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="lg:hidden pt-4">
              <button 
                onClick={onClose}
                className="w-full py-3 rounded-lg bg-[#00d4ff] text-black font-bold hover:bg-white transition-colors"
              >
                Show Results
              </button>
            </div>

          </div>
        </div>
      </aside>
    </>
  );
}