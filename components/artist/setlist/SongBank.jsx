'use client';

import { useState } from 'react';
import { Library, Search, Music, Plus, Check, PlusCircle, X, AlertCircle } from 'lucide-react';

export default function SongBank({ songs, onAddSong, onCreateSong }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentlyAdded, setRecentlyAdded] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');  const [newTitle, setNewTitle] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newGenre, setNewGenre] = useState('');
  const [newMood, setNewMood] = useState('');
  const [newBpm, setNewBpm] = useState('');  const handleDurationChange = (e) => {    let value = e.target.value.replace(/\D/g, '');    if (value.length > 4) value = value.slice(0, 4);    if (value.length > 2) {
      value = `${value.slice(0, 2)}:${value.slice(2)}`;
    }

    setNewDuration(value);
  };  const filteredSongs = songs.filter((song) => {
    const matchesFilter = activeFilter === 'All' || song.tag.includes(activeFilter);
    const matchesSearch = song.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          song.tag.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleAddClick = (song) => {
    onAddSong(song);
    setRecentlyAdded(song.id);
    setTimeout(() => setRecentlyAdded(null), 1000);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    
    if(!newTitle || !newDuration || !newGenre || !newMood || !newBpm) {
        setError('All fields are required');
        return;
    }

    const durationRegex = /^\d{2}:\d{2}$/; // Simple MM:SS check
    if (!durationRegex.test(newDuration)) {
        setError('Complete the time (MM:SS)');
        return;
    }

    onCreateSong({
      title: newTitle,
      duration: newDuration,
      genre: newGenre,
      bpm: newBpm.toUpperCase().includes('BPM') ? newBpm : `${newBpm} BPM`,
      tag: newMood 
    });    setNewTitle('');
    setNewDuration('');
    setNewGenre('');
    setNewMood('');
    setNewBpm('');
    setError('');
    setIsCreating(false);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setError('');
  };

  const filters = ['All', 'High Energy', 'Acoustic', 'Sad/Chill'];

  return (
    <div className="bg-[#1a2c38] border border-[#223949] rounded-xl flex flex-col h-full overflow-hidden shadow-lg ring-1 ring-white/5">
      
      {}
      <div className="p-4 border-b border-[#223949] bg-[#1a2c38] z-10 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h3 className="text-white text-lg font-bold flex items-center gap-2">
            <Library className="w-5 h-5 text-[#0d93f2]" />
            Song Bank
          </h3>
          
          {!isCreating ? (
             <button 
               onClick={() => setIsCreating(true)}
               className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#223949] hover:bg-[#0d93f2]/10 hover:text-[#0d93f2] text-[#90b2cb] text-xs font-bold transition-colors border border-white/5 hover:border-[#0d93f2]/30"
             >
               <PlusCircle className="w-3.5 h-3.5" />
               New
             </button>
          ) : (
            <button 
               onClick={handleCancel}
               className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-400 text-xs font-bold transition-colors border border-red-500/20"
             >
               <X className="w-3.5 h-3.5" />
               Cancel
             </button>
          )}
        </div>
        
        {}
        {isCreating ? (
          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200">
            <input 
              autoFocus
              className="w-full bg-[#101b22] text-white text-sm rounded-lg border border-[#223949] focus:ring-1 focus:ring-[#0d93f2] px-3 py-2 placeholder:text-white/30"
              placeholder="Song Title (e.g. My New Track)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            
            <div className="flex gap-2">
               <input 
                className="w-1/2 bg-[#101b22] text-white text-sm rounded-lg border border-[#223949] focus:ring-1 focus:ring-[#0d93f2] px-3 py-2 placeholder:text-white/30"
                placeholder="Genre (Pop)"
                value={newGenre}
                onChange={(e) => setNewGenre(e.target.value)}
              />
              <input 
                className="w-1/2 bg-[#101b22] text-white text-sm rounded-lg border border-[#223949] focus:ring-1 focus:ring-[#0d93f2] px-3 py-2 placeholder:text-white/30"
                placeholder="Mood (Sad)"
                value={newMood}
                onChange={(e) => setNewMood(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <input 
                className="w-1/2 bg-[#101b22] text-white text-sm rounded-lg border border-[#223949] focus:ring-1 focus:ring-[#0d93f2] px-3 py-2 placeholder:text-white/30"
                placeholder="BPM (120)"
                value={newBpm}
                onChange={(e) => setNewBpm(e.target.value)}
              />
              
              {}
              <input 
                className="w-1/2 bg-[#101b22] text-white text-sm rounded-lg border border-[#223949] focus:ring-1 focus:ring-[#0d93f2] px-3 py-2 placeholder:text-white/30"
                placeholder="MM:SS"
                value={newDuration}
                onChange={handleDurationChange} // Use the new handler
                maxLength={5} // Prevents typing more than 04:00
              />
            </div>

            {error && (
                <div className="flex items-center gap-1.5 text-red-400 text-xs px-1">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </div>
            )}

            <button type="submit" className="w-full py-2 bg-[#0d93f2] hover:bg-[#0d93f2]/90 text-white text-xs font-bold rounded-lg transition-colors mt-1 shadow-lg shadow-[#0d93f2]/20">
              Add to Bank
            </button>
          </form>
        ) : (
          
          <>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-[#90b2cb]">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#223949] text-white text-sm rounded-lg border-none focus:ring-1 focus:ring-[#0d93f2] pl-9 pr-3 py-2 placeholder:text-white/30" 
                placeholder="Filter by mood, tag, title..." 
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {filters.map((filter) => (
                <button 
                  key={filter} 
                  onClick={() => setActiveFilter(filter)}
                  className={`whitespace-nowrap px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    activeFilter === filter 
                    ? 'bg-[#0d93f2] text-white border-[#0d93f2]' 
                    : 'bg-[#223949] hover:bg-white/10 text-[#90b2cb] border-transparent'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-[#1a2c38]/50">
        {filteredSongs.length > 0 ? (
          filteredSongs.map((song) => (
            <div key={song.id} className="group flex items-center gap-3 p-3 rounded-lg bg-[#223949]/20 hover:bg-[#223949] border border-transparent hover:border-[#223949]/50 transition-all">
              <div className="bg-[#223949] size-10 rounded-md flex items-center justify-center text-[#90b2cb] shrink-0">
                <Music className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white text-sm font-bold truncate">{song.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-1.5 rounded-sm bg-${song.tagColor || 'blue'}-500/20 text-${song.tagColor || 'blue'}-300 border border-${song.tagColor || 'blue'}-500/30`}>{song.tag}</span>
                  <span className="text-[#90b2cb] text-[10px] font-mono">{song.bpm}</span>
                </div>
              </div>
              <span className="text-[#90b2cb] text-xs font-mono">{song.duration}</span>
              
              <button 
                onClick={() => handleAddClick(song)}
                className={`size-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  recentlyAdded === song.id 
                  ? 'bg-green-500 text-white scale-110' 
                  : 'text-[#0d93f2] hover:bg-[#0d93f2] hover:text-white'
                }`}
              >
                {recentlyAdded === song.id ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-[#90b2cb] text-sm">
            {isCreating ? "Fill all fields to add a song." : `No songs found matching "${searchQuery}"`}
          </div>
        )}
      </div>
    </div>
  );
}