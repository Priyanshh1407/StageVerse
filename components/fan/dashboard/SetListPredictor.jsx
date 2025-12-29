'use client';

import React, { useEffect, useState } from 'react';
import { X, Search, Plus, Trash2, Save, Info, ChevronUp, ChevronDown } from 'lucide-react';

export default function PredictionModal({ isOpen, onClose, artistName = "The Strokes" }) {
  // --- STATE ---
  const [prediction, setPrediction] = useState([]); 
  const [searchQuery, setSearchQuery] = useState("");

  // Mock Data
  const allSongs = [
    { id: 's1', title: "Reptilia", album: "Room on Fire" },
    { id: 's2', title: "Last Nite", album: "Is This It" },
    { id: 's3', title: "Someday", album: "Is This It" },
    { id: 's4', title: "The Adults Are Talking", album: "The New Abnormal" },
    { id: 's5', title: "Hard to Explain", album: "Is This It" },
    { id: 's6', title: "New Person, Same Old Mistakes", album: "Currents" },
    { id: 's7', title: "Lost In Yesterday", album: "The Slow Rush" },
    { id: 's8', title: "Under Cover of Darkness", album: "Angles" },
    { id: 's9', title: "You Only Live Once", album: "First Impressions" },
    { id: 's10', title: "Machu Picchu", album: "Angles" },
    { id: 's11', title: "Selfless", album: "The New Abnormal" },
    { id: 's12', title: "Brooklyn Bridge to Chorus", album: "The New Abnormal" },
  ];

  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      } 
    };
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [isOpen, onClose]);

  // Filter Logic
  const filteredPool = allSongs.filter(song => 
    !prediction.find(p => p.id === song.id) &&
    song.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- HANDLERS ---
  const addToPrediction = (song) => {
    if (prediction.length >= 10) return;
    setPrediction([...prediction, song]);
  };

  const removeFromPrediction = (id) => {
    setPrediction(prediction.filter(item => item.id !== id));
  };

  const moveItem = (index, direction) => {
    const newPrediction = [...prediction];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newPrediction.length) return;
    [newPrediction[index], newPrediction[targetIndex]] = [newPrediction[targetIndex], newPrediction[index]];
    setPrediction(newPrediction);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* CSS for Custom Scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #101b23; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #315168; 
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #0d93f2; 
        }
      `}</style>

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Main Modal Container 
          - Mobile: Full width, starts from bottom, 90% height
          - Desktop: Centered, limited width/height
      */}
      <div className="relative flex flex-col w-full h-[90vh] sm:h-[85vh] sm:max-w-5xl bg-[#101b23] rounded-t-2xl sm:rounded-2xl border border-[#315168] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex-none px-4 sm:px-6 py-4 border-b border-[#315168] bg-[#101b23] flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-white text-xl sm:text-2xl font-bold flex items-center gap-2 truncate">
              🔮 Predict: <span className="text-[#0d93f2] truncate">{artistName}</span>
            </h2>
            <p className="text-[#90b2cb] text-xs sm:text-sm truncate">
              Select & arrange songs. Max 10.
            </p>
          </div>
          <button onClick={onClose} className="text-[#90b2cb] hover:text-white p-2 rounded-full hover:bg-[#223949] ml-2 shrink-0">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area - Stack on mobile, Side-by-side on Desktop */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* SECTION 1: Song Pool (Top on Mobile / Left on Desktop) */}
          <div className="w-full md:w-1/3 h-1/2 md:h-auto border-b md:border-b-0 md:border-r border-[#315168] flex flex-col bg-[#0b1217]">
            {/* Search Bar */}
            <div className="p-3 sm:p-4 border-b border-[#315168]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#90b2cb]" />
                <input 
                  type="text" 
                  placeholder="Search songs..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#182934] border border-[#315168] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#90b2cb] focus:outline-none focus:border-[#0d93f2]"
                />
              </div>
            </div>
            
            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {filteredPool.length > 0 ? (
                filteredPool.map(song => (
                  <button 
                    key={song.id}
                    onClick={() => addToPrediction(song)}
                    disabled={prediction.length >= 10}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-[#182934] text-left group transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-[#315168]"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-white text-sm font-medium truncate">{song.title}</p>
                      <p className="text-[#90b2cb] text-xs truncate">{song.album}</p>
                    </div>
                    <div className="bg-[#223949] p-1.5 rounded-full text-[#0d93f2] group-hover:bg-[#0d93f2] group-hover:text-white transition-colors shrink-0">
                      <Plus className="w-4 h-4" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-[#90b2cb] text-sm">No songs found.</div>
              )}
            </div>
          </div>

          {/* SECTION 2: My Prediction (Bottom on Mobile / Right on Desktop) */}
          <div className="flex-1 flex flex-col bg-[#101b23] h-1/2 md:h-auto">
            <div className="p-3 sm:p-4 border-b border-[#315168] flex justify-between items-center bg-[#142029]">
              <h3 className="text-white font-bold flex items-center gap-2 text-sm sm:text-base">
                Your Draft <span className="px-2 py-0.5 rounded-full bg-[#0d93f2]/20 text-[#0d93f2] text-xs font-mono">{prediction.length}/10</span>
              </h3>
              {prediction.length === 0 && (
                <span className="text-[#90b2cb] text-xs flex items-center gap-1 animate-pulse hidden sm:flex">
                  <Info className="w-3 h-3" /> Select songs to start
                </span>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar bg-[#101b23]">
              {prediction.length > 0 ? (
                <div className="space-y-2">
                  {prediction.map((song, index) => (
                    <div key={song.id} className="flex items-center gap-3 bg-[#182934] p-2.5 sm:p-3 rounded-lg border border-[#315168] group transition-all">
                      <div className="flex-none w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0d93f2]/10 text-[#0d93f2] flex items-center justify-center text-xs sm:text-sm font-bold border border-[#0d93f2]/20">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{song.title}</p>
                        <p className="text-[#90b2cb] text-xs truncate">{song.album}</p>
                      </div>
                      
                      {/* Controls */}
                      <div className="flex items-center gap-1">
                        <div className="flex flex-col gap-0.5 mr-1">
                          <button 
                            onClick={() => moveItem(index, -1)} 
                            disabled={index === 0}
                            className="p-0.5 text-[#90b2cb] hover:text-white disabled:opacity-30 hover:bg-[#223949] rounded"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => moveItem(index, 1)} 
                            disabled={index === prediction.length - 1}
                            className="p-0.5 text-[#90b2cb] hover:text-white disabled:opacity-30 hover:bg-[#223949] rounded"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                        <button 
                          onClick={() => removeFromPrediction(song.id)}
                          className="p-2 text-[#90b2cb] hover:text-red-400 hover:bg-red-400/10 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[#90b2cb]/50 border-2 border-dashed border-[#315168]/50 rounded-xl m-2">
                  <p className="text-sm font-medium">Your setlist is empty</p>
                  <p className="text-xs mt-1">Add songs from above</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#315168] bg-[#142029] flex justify-end gap-3 shrink-0">
              <button onClick={onClose} className="px-4 py-2.5 text-[#90b2cb] hover:text-white font-medium text-sm transition-colors hidden sm:block">Cancel</button>
              <button 
                onClick={() => { console.log(prediction); onClose(); }}
                disabled={prediction.length === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-[#0d93f2] hover:bg-[#0b84db] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold shadow-lg shadow-[#0d93f2]/20 transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                Lock In Prediction
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}