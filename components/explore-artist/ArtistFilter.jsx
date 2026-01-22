'use client';

import { RotateCcw, X, Check } from 'lucide-react';

export default function ArtistsFilter({ filters, setFilters, onReset, isOpen, onClose }) {  const update = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
  
  const toggleArrayItem = (field, item) => {
    setFilters(prev => {
      const list = prev[field];
      return {
        ...prev,
        [field]: list.includes(item) ? list.filter(i => i !== item) : [...list, item]
      };
    });
  };

  const GENRES = ['Pop', 'Rock', 'Electronic', 'Indie', 'Jazz', 'Hip Hop'];
  const TYPES = ['Solo Artist', 'Band / Group', 'DJ'];

  return (
    <>
      {}
      <div 
        onClick={onClose}
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      ></div>

      {}
      <aside 
        className={`
          fixed top-0 right-0 bottom-0 z-50 w-[85%] max-w-sm bg-[#0F0F10] border-l border-gray-800 p-6 overflow-y-auto transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-0 lg:w-64 lg:shrink-0 lg:bg-transparent lg:border-none lg:p-0 lg:overflow-visible
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="lg:sticky lg:top-24 bg-[#18181B] p-6 rounded-2xl border border-gray-800 shadow-lg">
          
          {}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Filter By</h2>
            <div className="flex items-center gap-4">
              <button onClick={onReset} className="text-xs text-[#00C2FF] hover:text-white transition-colors flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
              <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="space-y-8">
            
            {}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wider">Genre</h3>
              <div className="space-y-3">
                {GENRES.map(genre => (
                  <label key={genre} className="flex items-center justify-between cursor-pointer group">
                    <span className={`text-sm transition-colors ${filters.genres.includes(genre) ? 'text-white font-medium' : 'text-gray-400 group-hover:text-[#00C2FF]'}`}>
                      {genre}
                    </span>
                    <div 
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filters.genres.includes(genre) ? 'bg-[#00C2FF] border-[#00C2FF]' : 'border-gray-600 bg-[#27272A]'}`}
                      onClick={() => toggleArrayItem('genres', genre)}
                    >
                      {filters.genres.includes(genre) && <Check className="w-3 h-3 text-black" />}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wider">Artist Type</h3>
              <div className="space-y-4">
                {TYPES.map(type => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">{type}</span>
                    <button 
                      onClick={() => toggleArrayItem('types', type)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${filters.types.includes(type) ? 'bg-[#00C2FF]' : 'bg-gray-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${filters.types.includes(type) ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wider">Popularity Score</h3>
              <div className="px-1">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={filters.popularity}
                  onChange={(e) => update('popularity', parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#00C2FF]" 
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>New</span>
                  <span>Rising</span>
                  <span>Star</span>
                </div>
              </div>
            </div>

            {}
            <div className="lg:hidden pt-4">
              <button onClick={onClose} className="w-full py-3 rounded-lg bg-[#00C2FF] text-black font-bold">
                Apply Filters
              </button>
            </div>

          </div>
        </div>
      </aside>
    </>
  );
}