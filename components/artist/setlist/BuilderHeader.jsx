'use client';
import { useState, useRef, useEffect } from 'react';
import { Sparkles, Save, Trash2, ChevronDown, Calendar, Ticket } from 'lucide-react';

export default function BuilderHeader({ event, allEvents = [], onSwitchEvent, onSave, onDeclareResults }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-wrap justify-between items-end gap-4 border-b border-[#223949] pb-6">
      <div className="flex min-w-72 flex-col gap-2">
        <div className="flex items-center gap-2 text-emerald-400 mb-1">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">AI Curator Active</span>
        </div>
        <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">Smart Setlist Builder</h1>

        {}
        {event ? (
          <div className="relative inline-block mt-2" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 text-[#90b2cb] hover:text-white transition-colors group"
            >
              <span className="text-base font-normal">Building set for:</span>
              <span className="text-white font-bold flex items-center gap-2 bg-[#223949]/50 hover:bg-[#223949] px-3 py-1 rounded-full border border-transparent hover:border-[#0d93f2]/30 transition-all">
                {event.venue?.name || event.city}
                {allEvents.length > 1 && <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />}
              </span>
            </button>

            {}
            {isDropdownOpen && allEvents.length > 0 && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-[#182934] border border-[#315168] rounded-xl shadow-2xl overflow-hidden py-1 z-50">
                <div className="px-3 py-2 text-[10px] uppercase font-bold text-[#5a7c96] tracking-wider border-b border-[#223949] mb-1">Switch Event</div>
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  {allEvents.map((evt) => (
                    <button
                      key={evt._id}
                      onClick={() => {
                        onSwitchEvent(evt._id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-[#223949] transition-colors text-left ${event._id === evt._id ? 'bg-[#0d93f2]/10 text-[#0d93f2] font-bold' : 'text-slate-300'}`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm truncate">{evt.venue?.name || evt.city}</span>
                        <span className="text-[10px] text-[#5a7c96] flex items-center gap-1">
                          {new Date(evt.date).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[#90b2cb] text-base font-normal leading-normal">
            Select an event to start building.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-[#223949] hover:bg-[#2c4a5f] text-[#90b2cb] hover:text-white text-sm font-bold transition-colors">
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Discard Draft</span>
        </button>
        <button
          onClick={onSave}
          disabled={!event}
          className="flex items-center justify-center gap-2 rounded-lg h-10 px-6 bg-[#0d93f2] hover:bg-[#0d93f2]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold tracking-[0.015em] transition-colors shadow-lg shadow-[#0d93f2]/20"
        >
          <Save className="w-4 h-4" />
          Save Setlist
        </button>
        <button
          onClick={onDeclareResults}
          disabled={!event}
          className="flex items-center justify-center gap-2 rounded-lg h-10 px-6 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold tracking-[0.015em] transition-colors shadow-lg shadow-purple-500/20"
        >
          <Sparkles className="w-4 h-4" />
          Declare Results
        </button>
      </div>
    </div>
  );
}