'use client';

import { BarChart2, CheckCircle2, ChevronRight, X } from 'lucide-react';

export default function PollSelectionModal({ isOpen, onClose, onSelect }) {
  if (!isOpen) return null;

  // Mock Polls (This would come from your DB/State)
  const availablePolls = [
    { id: 'p1', title: 'Encore Vote', type: 'Ready', options: 2, trigger: 'After Song 5' },
    { id: 'p2', title: 'Next Song Choice', type: 'Draft', options: 3, trigger: 'Manual' },
    { id: 'p3', title: 'Outfit Color', type: 'Ready', options: 4, trigger: 'Manual' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#101b22] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#15232d]">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-purple-400" />
              Select Poll to Trigger
            </h2>
            <p className="text-slate-400 text-xs mt-1">Choose a configured poll to push to the audience.</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Poll List */}
        <div className="p-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {availablePolls.map((poll) => (
            <button 
              key={poll.id}
              onClick={() => onSelect(poll)}
              className="group flex items-center justify-between p-4 rounded-xl bg-[#0a1116] border border-white/5 hover:border-purple-500/50 hover:bg-[#1a1a2e] transition-all text-left"
            >
              <div className="flex items-start gap-4">
                <div className={`mt-1 w-3 h-3 rounded-full ${poll.type === 'Ready' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-amber-500/50'}`}></div>
                <div>
                  <h3 className="text-white font-bold text-base group-hover:text-purple-300 transition-colors">{poll.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500 font-mono bg-white/5 px-1.5 py-0.5 rounded">{poll.options} Options</span>
                    <span className="text-xs text-slate-500">Trigger: {poll.trigger}</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>

        <div className="p-4 bg-[#0a1116] border-t border-white/5 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">StageVerse Live Control</p>
        </div>
      </div>
    </div>
  );
}