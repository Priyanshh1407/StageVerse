'use client';

import { Save, Send } from 'lucide-react';

export default function RiderHeader({ onSave, isSaving }) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-[#223949] mb-8">
      <div>
        <h1 className="text-white tracking-tight text-[32px] font-bold leading-tight">Digital Tech Rider</h1>
        <p className="text-white/60 text-sm mt-1">
          Submitting gear requirements for: <span className="text-white font-medium">The Neon Echoes - World Tour 2024</span>
        </p>
      </div>
      <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
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
             <><Send className="w-4 h-4" /> Save & Send to Crew</>
          )}
        </button>
      </div>
    </div>
  );
}