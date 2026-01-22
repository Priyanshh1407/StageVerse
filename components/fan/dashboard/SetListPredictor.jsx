'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, Search, Plus, Trash2, Save, Info, ChevronUp, ChevronDown, CheckCircle2, Ticket, Calendar } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import ScorecardModal from './ScoreCardModal';

export default function SetListPredictor({ initialEventId, events = [] }) {  const [selectedEventId, setSelectedEventId] = useState(initialEventId || (events[0]?.event?._id));
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);  const currentEventData = events.find(e => e.event._id === selectedEventId) || events[0];
  const { event, songs: availableSongs = [], prediction: initialPrediction = null, setlist: actualSetlist = null } = currentEventData || {};

  const [prediction, setPrediction] = useState(initialPrediction?.songs || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);

  const isGraded = initialPrediction?.status === 'graded';  useEffect(() => {
    setPrediction(initialPrediction?.songs || []);
    setSearchQuery("");    setShowScorecard(false);
  }, [selectedEventId, initialPrediction]);  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);  const filteredPool = availableSongs.filter(song =>
    !prediction.find(p => (p.id === song._id || p.id === song.id)) && // Handle _id vs id
    song.title.toLowerCase().includes(searchQuery.toLowerCase())
  );  const addToPrediction = (song) => {
    if (prediction.length >= 10) return;
    setPrediction([...prediction, { id: song._id || song.id, title: song.title, album: song.album || "Single" }]);
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

  const handleSave = async () => {
    if (!event) return;
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/fan/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event._id || event.eventId,
          songs: prediction
        })
      });

      console.log("Submitting Prediction Payload:", {
        eventId: event._id || event.eventId,
        songs: prediction
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Prediction Locked In!");      } else {
        toast.error(json.error || "Failed to save");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error saving prediction");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!event) return <div className="p-10 text-white">Loading Event...</div>;  if (isGraded && !showScorecard) {  }

  return (
    <div className="flex flex-col w-full h-[85vh] sm:max-w-6xl mx-auto bg-[#101b23] rounded-xl border border-[#315168] shadow-2xl overflow-hidden relative">

      {}
      <div className="flex-none px-6 py-4 border-b border-[#315168] bg-[#101b23] flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-4">

          {}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 bg-[#182934] hover:bg-[#223949] border border-[#315168] rounded-lg px-4 py-2 transition-all group"
            >
              <div className="flex items-center gap-2">
                <div className="relative w-8 h-8 rounded overflow-hidden bg-black">
                  <Image src={event.image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745"} alt={event.artist} fill className="object-cover" />
                </div>
                <div className="text-left">
                  <h2 className="text-white text-sm font-bold leading-tight">{event.artist}</h2>
                  <p className="text-[#90b2cb] text-[10px] uppercase tracking-wide flex items-center gap-1">
                    <Ticket className="w-3 h-3" /> {event.venue}
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#90b2cb] group-hover:text-white transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-[#182934]/95 backdrop-blur-xl border border-[#315168] rounded-xl shadow-2xl overflow-hidden py-2 animate-in fade-in zoom-in-95">
                <p className="px-4 py-2 text-[10px] uppercase font-bold text-[#5a7c96] tracking-wider">Select Event to Predict</p>
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  {events.map((item) => (
                    <button
                      key={item.event._id}
                      onClick={() => {
                        setSelectedEventId(item.event._id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#223949] transition-colors ${selectedEventId === item.event._id ? 'bg-[#0d93f2]/10 border-l-2 border-[#0d93f2]' : 'border-l-2 border-transparent'}`}
                    >
                      <div className="relative w-8 h-8 rounded overflow-hidden bg-black shrink-0">
                        <Image src={item.event.image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745"} alt={item.event.artist} fill className="object-cover" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className={`text-sm font-bold truncate ${selectedEventId === item.event._id ? 'text-[#0d93f2]' : 'text-slate-200'}`}>{item.event.artist}</p>
                        <p className="text-[#90b2cb] text-[10px] truncate flex items-center gap-1">
                          {new Date(item.event.date).toLocaleDateString()} • {item.event.venue}
                        </p>
                      </div>
                      {item.prediction?.status === 'graded' && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="hidden md:block h-8 w-[1px] bg-[#315168]"></div>
          <p className="hidden md:block text-[#90b2cb] text-sm">
            Select up to 10 songs for the setlist.
          </p>
        </div>
      </div>

      {}
      {isGraded && !showScorecard ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1a2f3d] to-[#101b23]">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 animate-pulse">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Results are In!</h2>
          <p className="text-[#90b2cb] max-w-md mx-auto mb-8">The artist has declared the official setlist for {event.venue}. Check your scorecard to see how many points you scored.</p>
          <button
            onClick={() => setShowScorecard(true)}
            className="px-8 py-4 bg-[#0d93f2] hover:bg-[#0b84db] text-white font-bold rounded-xl shadow-xl shadow-[#0d93f2]/20 transition-transform hover:scale-105 active:scale-95"
          >
            View Scorecard
          </button>
        </div>
      ) : (
        
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">

          {}
          <div className="w-full md:w-1/3 h-1/2 md:h-auto border-b md:border-b-0 md:border-r border-[#315168] flex flex-col bg-[#0b1217]">
            <div className="p-4 border-b border-[#315168]">
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

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {filteredPool.length > 0 ? (
                filteredPool.map(song => (
                  <button
                    key={song._id || song.id}
                    onClick={() => addToPrediction(song)}
                    disabled={prediction.length >= 10 || isGraded} // Disable if graded
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-[#182934] text-left group transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-[#315168]"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-white text-sm font-medium truncate">{song.title}</p>
                      <p className="text-[#90b2cb] text-xs truncate">{song.album || "Single"}</p>
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

          {}
          <div className="flex-1 flex flex-col bg-[#101b23] h-1/2 md:h-auto">
            <div className="p-4 border-b border-[#315168] flex justify-between items-center bg-[#142029]">
              <h3 className="text-white font-bold flex items-center gap-2">
                Your Draft <span className="px-2 py-0.5 rounded-full bg-[#0d93f2]/20 text-[#0d93f2] text-xs font-mono">{prediction.length}/10</span>
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#101b23]">
              {prediction.length > 0 ? (
                <div className="space-y-2">
                  {prediction.map((song, index) => (
                    <div key={song.id} className="flex items-center gap-3 bg-[#182934] p-3 rounded-lg border border-[#315168] group transition-all">
                      <div className="flex-none w-8 h-8 rounded-full bg-[#0d93f2]/10 text-[#0d93f2] flex items-center justify-center text-sm font-bold border border-[#0d93f2]/20">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{song.title}</p>
                      </div>

                      {}
                      {!isGraded && (
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
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[#90b2cb]/50 border-2 border-dashed border-[#315168]/50 rounded-xl m-2">
                  <p className="text-sm font-medium">Your setlist is empty</p>
                  <p className="text-xs mt-1">Add songs from the left</p>
                </div>
              )}
            </div>

            {}
            <div className="p-4 border-t border-[#315168] bg-[#142029] flex justify-end gap-3 shrink-0">
              <button
                onClick={handleSave}
                disabled={prediction.length === 0 || isSubmitting || isGraded}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#0d93f2] hover:bg-[#0b84db] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold shadow-lg shadow-[#0d93f2]/20 transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? "Saving..." : (isGraded ? "Prediction Locked" : "Lock In Prediction")}
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {showScorecard && (
        <ScorecardModal
          isOpen={showScorecard}
          onClose={() => setShowScorecard(false)}
          artistName={event?.artist || "Artist"}
          prediction={prediction}
          actualSetlist={actualSetlist?.items || []}
          totalScore={initialPrediction?.score || 0}
        />
      )}

    </div>
  );
}