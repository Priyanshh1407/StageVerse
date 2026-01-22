'use client';

import React, { useState } from 'react';
import { Sparkles, Copy, RefreshCw } from 'lucide-react';

export default function AIDescriptionGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");

  const handleGenerate = () => {
    setIsGenerating(true);    setTimeout(() => {
      setDescription("Experience an electrifying night of sonic brilliance as [Artist Name] takes over [Venue]. Featuring immersive visuals and a setlist of chart-topping hits, this is the event of the summer you don't want to miss. Secure your tickets now before they sell out!");
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="bg-[#192734] rounded-xl border border-[#2c3b47] p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          AI Event Description
        </h3>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <label className="text-xs text-[#90b2cb] uppercase font-bold tracking-wider">Event Vibe / Keywords</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. High energy, neon lights, rave..." 
            className="flex-1 bg-[#101b22] border border-[#2c3b47] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#0d93f2]"
          />
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Generate
          </button>
        </div>
      </div>

      <div className="flex-1 bg-[#101b22] rounded-lg border border-[#2c3b47] p-3 relative group">
        {description ? (
          <>
            <p className="text-sm text-slate-300 leading-relaxed">{description}</p>
            <button 
              className="absolute top-2 right-2 p-1.5 bg-[#2c3b47] rounded hover:bg-white/10 text-[#90b2cb] hover:text-white transition-colors opacity-0 group-hover:opacity-100"
              title="Copy to clipboard"
            >
              <Copy className="w-3 h-3" />
            </button>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-[#90b2cb]/50 text-xs text-center p-4">
            <Sparkles className="w-8 h-8 mb-2 opacity-50" />
            Enter keywords above to generate a marketing description instantly.
          </div>
        )}
      </div>
    </div>
  );
}