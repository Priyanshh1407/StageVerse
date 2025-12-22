'use client';

import React, { useState } from 'react';
import { User, Music, Mic2, Sparkles } from 'lucide-react';

export default function EventDetailsForm({ onGenerate, isGenerating }) {
  const [vibe, setVibe] = useState(75);

  return (
    <div className="bg-white dark:bg-[#192734] rounded-xl p-6 shadow-sm border border-slate-200 dark:border-[#2c3b47]">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
        <span className="p-1 bg-blue-500/10 rounded text-primary">
            <Sparkles className="w-5 h-5" />
        </span>
        Event Details
      </h3>

      <div className="space-y-6">
        {/* Artist Input */}
        <label className="flex flex-col w-full gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-[#90b2cb] uppercase tracking-wider">Artist / Lineup</span>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-slate-50 dark:bg-[#101b22] border border-slate-200 dark:border-[#2c3b47] text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
              placeholder="e.g., Fred Again.., Skrillex" 
              type="text" 
            />
          </div>
        </label>

        {/* Genre Select */}
        <label className="flex flex-col w-full gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-[#90b2cb] uppercase tracking-wider">Genre</span>
          <div className="relative">
            <Music className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select className="w-full pl-12 pr-10 py-3 rounded-lg bg-slate-50 dark:bg-[#101b22] border border-slate-200 dark:border-[#2c3b47] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer">
              <option disabled defaultValue>Select a primary genre</option>
              <option value="techno">Techno</option>
              <option value="house">House</option>
              <option value="edm">EDM</option>
              <option value="hiphop">Hip Hop</option>
              <option value="indie">Indie / Alternative</option>
            </select>
          </div>
        </label>

        {/* Tone Select */}
        <label className="flex flex-col w-full gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-[#90b2cb] uppercase tracking-wider">Tone of Voice</span>
          <div className="relative">
            <Mic2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select className="w-full pl-12 pr-10 py-3 rounded-lg bg-slate-50 dark:bg-[#101b22] border border-slate-200 dark:border-[#2c3b47] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none cursor-pointer">
              <option value="hype">High Hype / Energetic</option>
              <option value="pro">Professional / Corporate</option>
              <option value="mysterious">Mysterious / Underground</option>
              <option value="friendly">Friendly / Community</option>
            </select>
          </div>
        </label>

        {/* Vibe Slider */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 dark:text-[#90b2cb] uppercase tracking-wider">Vibe / Energy</span>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                {vibe > 80 ? "Raging" : vibe > 40 ? "High Energy" : "Chill"}
            </span>
          </div>
          <div className="h-12 bg-slate-50 dark:bg-[#101b22] rounded-lg border border-slate-200 dark:border-[#2c3b47] px-4 flex items-center">
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={vibe} 
              onChange={(e) => setVibe(e.target.value)}
              className="w-full h-1.5 bg-slate-200 dark:bg-[#2c3b47] rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 font-medium px-1">
            <span>Chill</span>
            <span>Raging</span>
          </div>
        </div>

        {/* Extra Details */}
        <label className="flex flex-col w-full gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-[#90b2cb] uppercase tracking-wider">Key Highlights</span>
          <textarea 
            className="w-full p-4 rounded-lg bg-slate-50 dark:bg-[#101b22] border border-slate-200 dark:border-[#2c3b47] text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary outline-none resize-none min-h-[100px]" 
            placeholder="e.g., Rooftop view, 2-for-1 drinks before 10pm, Secret guest..." 
          ></textarea>
        </label>

        <button 
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full mt-2 bg-cyan-600 hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>Generating...</>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Description
            </>
          )}
        </button>
      </div>
    </div>
  );
}