'use client';

import React, { useState } from 'react';
import { Settings2, ChevronDown, Wand2, Minus, Plus } from 'lucide-react';

export default function PatchingSidebar({ showName }) {
  return (
    <aside className="w-full lg:w-[30%] min-w-[340px] bg-[#16202a] border-r border-[#2c3e50] flex flex-col h-full relative z-20 shadow-2xl">
      
      {/* 1. Header (Fixed Height) */}
      <div className="flex-none p-6 border-b border-[#2c3e50] bg-[#16202a]">
        <h1 className="text-white font-bold text-xl tracking-tight leading-none">Intelligent Patch Studio</h1>
        <div className="flex items-center gap-2 mt-2">
          <span className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse"></span>
          <p className="text-xs text-[#90b2cb] font-mono uppercase tracking-wide truncate">
            {showName || 'Active Show'}
          </p>
        </div>
      </div>

      {/* 2. Scrollable Content (Flex-1 fills remaining space, min-h-0 prevents overflow) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 min-h-0">
        <div>
          <h2 className="text-white font-bold text-xs uppercase tracking-[0.2em] text-[#90b2cb] border-b border-[#2c3e50] pb-3 mb-6 flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> Patching Controls
          </h2>
          
          <div className="space-y-5 mb-6">
            <div>
              <label className="block text-[10px] font-bold text-[#90b2cb] mb-1.5 uppercase tracking-wide">Fixture Profile</label>
              <div className="relative group">
                <select className="w-full bg-[#0b1219] border border-[#2c3e50] text-white rounded-lg pl-4 pr-10 py-3 appearance-none focus:outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] text-sm font-medium transition-all hover:border-[#4a6f8a] cursor-pointer">
                  <option>Clay Paky Sharpy (16ch)</option>
                  <option>Martin Mac Aura (Standard)</option>
                  <option>Robe Pointe (Mode 2)</option>
                  <option>GLP JDC1 (Mode 3 - 68ch)</option>
                  <option>Generic Dimmer</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#90b2cb] w-4 h-4 pointer-events-none group-hover:text-white transition-colors" />
              </div>
            </div>
            
            <NumberControl label="Quantity" defaultValue={8} />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <NumberControl label="Start Universe" defaultValue={1} />
            <NumberControl label="Start Address" defaultValue={1} />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#00d4ff] mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <Wand2 className="w-4 h-4" /> AI Logic / Constraints
            </label>
            <div className="relative">
              <textarea 
                className="w-full h-40 bg-[#0b1219] border border-[#2c3e50] rounded-lg p-4 text-sm text-gray-300 focus:outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] placeholder:text-gray-600 resize-none font-mono leading-relaxed shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]" 
                placeholder="Patch these fixtures sequentially, but skip channels 50-60 due to a bad dimmer."
              ></textarea>
              <div className="absolute bottom-3 right-3 text-[10px] text-gray-600 font-mono">AI-ENABLED</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Footer (Fixed at Bottom) */}
      <div className="flex-none p-6 border-t border-[#2c3e50] bg-[#16202a] z-10 relative">
        <button className="w-full py-4 bg-gradient-to-r from-[#1e40af] to-[#1d4ed8] hover:from-[#2563eb] hover:to-[#3b82f6] text-white font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 text-sm transform active:scale-[0.98] border border-blue-500/30">
          <Wand2 className="w-5 h-5 fill-none" />
          Calculate & Append
        </button>
      </div>

    </aside>
  );
}

function NumberControl({ label, defaultValue }) {
  const [val, setVal] = useState(defaultValue);
  return (
    <div>
      <label className="block text-[10px] font-bold text-[#90b2cb] mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="flex items-center w-full bg-[#0b1219] border border-[#2c3e50] rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-[#00d4ff] focus-within:border-[#00d4ff] hover:border-[#4a6f8a] transition-all">
        <button onClick={() => setVal(Math.max(1, val - 1))} className="px-4 py-3 text-[#90b2cb] hover:text-white hover:bg-white/5 active:bg-white/10 transition-colors border-r border-[#2c3e50] flex items-center justify-center"><Minus className="w-4 h-4" /></button>
        <input type="number" value={val} onChange={(e) => setVal(parseInt(e.target.value) || 0)} className="flex-1 bg-transparent text-white text-center text-sm font-mono focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
        <button onClick={() => setVal(val + 1)} className="px-4 py-3 text-[#90b2cb] hover:text-white hover:bg-white/5 active:bg-white/10 transition-colors border-l border-[#2c3e50] flex items-center justify-center"><Plus className="w-4 h-4" /></button>
      </div>
    </div>
  );
}