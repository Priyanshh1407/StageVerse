'use client';

import { Save, Send } from 'lucide-react';
import LDSelector from './LDSelector';

export default function RiderHeader({
  onSave,
  isSaving,
  events = [],
  selectedEventId,
  onEventChange,
  selectedLD,
  onLDSelect
}) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-[#223949] mb-8">
      <div>
        <h1 className="text-white tracking-tight text-[32px] font-bold leading-tight">Digital Tech Rider</h1>
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm w-24">Target Event:</span>
            <select
              value={selectedEventId || ''}
              onChange={(e) => onEventChange(e.target.value)}
              className="bg-[#101b23] text-white text-sm font-bold rounded-lg px-3 py-1.5 outline-none min-w-[200px] cursor-pointer"
            >
              <option value="" disabled>Select an Event...</option>
              {events.map(ev => (
                <option key={ev._id} value={ev._id}>
                  {ev.title} • {ev.city} ({new Date(ev.date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {/* Prominent LD Selector */}
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm w-24">Assign LD:</span>
            <LDSelector selectedLD={selectedLD} onSelect={onLDSelect} />
          </div>
        </div>
      </div>
      <div className="mt-4 md:mt-0 flex flex-wrap gap-3 items-center">


        <span className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-400 rounded-full border border-green-500/20 text-xs font-bold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Live Draft
        </span>

        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-[#0d93f2] hover:bg-[#0d93f2]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-[#0d93f2]/20"
        >
          {isSaving ? (
            <>Saving...</>
          ) : (
            <><Send className="w-4 h-4" /> Save & Assign</>
          )}
        </button>
      </div>
    </div>
  );
}