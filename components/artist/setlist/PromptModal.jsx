'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

const DEFAULT_PROMPT = "Create a setlist curve that starts with high energy, has a slow emotional middle section, and ends with a banger.";

export default function PromptModal({ isOpen, onClose, onSubmit }) {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  useEffect(() => {
    if (isOpen) setPrompt(DEFAULT_PROMPT);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-[#101b22]/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#1a2c38] border border-[#223949] rounded-2xl shadow-2xl shadow-black/50 relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#0d93f2]/20 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="p-8 relative z-10 flex flex-col gap-6">
          
          {}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#0d93f2]" />
                Refine AI Setlist Prompt
              </h3>
              <p className="text-[#90b2cb] text-sm">Customize the prompt for the Gemini API optimization.</p>
            </div>
            <button onClick={onClose} className="text-[#90b2cb] hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {}
          <div>
            <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">Prompt Instructions</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-40 bg-[#101b22] border border-[#223949] rounded-xl p-4 text-white placeholder:text-[#90b2cb]/50 focus:ring-1 focus:ring-[#0d93f2] focus:border-[#0d93f2] resize-none text-base leading-relaxed custom-scrollbar shadow-inner outline-none transition-all" 
              placeholder="Describe how you want the setlist to flow..."
            />
          </div>

          {}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-2">
            <button onClick={onClose} className="text-[#90b2cb] hover:text-white px-4 py-2 text-sm font-bold transition-colors">
              Cancel
            </button>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button 
                onClick={() => setPrompt(DEFAULT_PROMPT)}
                className="px-5 py-2.5 rounded-lg border border-[#223949] text-[#90b2cb] hover:text-white hover:border-white/30 hover:bg-white/5 text-sm font-bold transition-all whitespace-nowrap"
              >
                Use Default Prompt
              </button>
              <button 
                onClick={() => onSubmit(prompt)}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#0d93f2] hover:bg-[#0d93f2]/90 text-white text-sm font-bold shadow-lg shadow-[#0d93f2]/25 hover:shadow-[#0d93f2]/40 transition-all whitespace-nowrap ring-1 ring-white/20"
              >
                Submit Optimized Flow
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}