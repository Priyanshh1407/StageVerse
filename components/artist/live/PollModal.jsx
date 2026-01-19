'use client';

import { useState } from 'react';
import { Check, X, Activity } from 'lucide-react';

export default function PollModal({ isOpen, onClose, onActivate, pollData }) {
  const [selectedOptionId, setSelectedOptionId] = useState(null);

  if (!isOpen || !pollData) return null;

  const question = pollData.data?.question || "Poll Question";
  const options = pollData.data?.options || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/90 backdrop-blur-md p-4 animate-in fade-in duration-200">

      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,240,255,0.15),transparent_70%)] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#00f0ff]/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 flex flex-col justify-between bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">

        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-20">
          <X className="w-6 h-6" />
        </button>

        <header className="text-center pt-8 px-6">
          <div className="inline-flex items-center justify-center gap-2 mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">Live Poll Preview</span>
          </div>
          <h1 className="text-2xl font-black uppercase leading-tight tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
            {question}
          </h1>
          <p className="text-slate-400 font-medium text-sm">Review the poll below before launching to fans.</p>
        </header>

        <div className="flex-1 flex flex-col gap-4 p-6 max-h-[50vh] overflow-y-auto custom-scrollbar">
          {options.map((opt, idx) => {
            const text = typeof opt === 'string' ? opt : opt.text;
            const id = opt._id || idx;
            const isSelected = selectedOptionId === id;

            return (
              <div
                key={id}
                onClick={() => setSelectedOptionId(id)}
                className={`cursor-pointer w-full rounded-2xl bg-[#1a1a1a] border-2 p-5 flex flex-col justify-between relative overflow-hidden transition-all ${isSelected ? 'border-[#00f0ff] bg-[#00f0ff]/10 shadow-[0_0_30px_rgba(0,240,255,0.2)]' : 'border-white/10 hover:border-white/20'}`}
              >
                <div className="flex justify-between items-start relative z-10">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Option {idx + 1}</span>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-[#00f0ff] text-black flex items-center justify-center">
                      <Check className="w-4 h-4 font-bold" />
                    </div>
                  )}
                </div>
                <div className="relative z-10 mt-2">
                  <h2 className="text-xl font-bold uppercase leading-none mb-1 text-white">{text}</h2>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="p-6 bg-[#050505] border-t border-white/10">
          <button
            onClick={onActivate}
            className="w-full py-4 rounded-xl bg-[#00f0ff] hover:bg-[#00c3d1] text-black font-black uppercase tracking-widest text-lg shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all transform hover:scale-[1.02]"
          >
            Launch Poll to Audience
          </button>
        </footer>
      </div>
    </div>
  );
}