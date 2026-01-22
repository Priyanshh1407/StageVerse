'use client';

import { FileText, PenLine, HelpCircle, ChevronDown, CloudFog, Plug, Cable, CheckCircle, Lock } from 'lucide-react';

export default function PlacementForm({ hazer, setHazer, plotData, setPlotData }) {

  const handleChange = (field, value) => {
    setPlotData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <section className="pb-10">
      <div className="flex justify-between items-end mb-4 px-1">
        <h2 className="text-white text-xl font-bold leading-tight flex items-center gap-2">
          <FileText className="text-[#0d93f2] w-6 h-6" />
          Placement Form
        </h2>
        <span className="text-xs text-white/40 font-medium">Define stage instructions</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {}
        <div className="md:col-span-2 bg-[#1a2632] p-6 rounded-xl border border-[#223949] shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
            <PenLine className="text-[#0d93f2] w-5 h-5" />
            <h3 className="text-white font-bold">Stage Instructions</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wide flex items-center gap-2">
                Stage Location
                <HelpCircle className="w-3 h-3 text-[#0d93f2]" />
              </label>
              <input
                value={plotData.stageLocation || ''}
                onChange={(e) => handleChange('stageLocation', e.target.value)}
                className="w-full bg-[#101b23] border border-[#223949] rounded-lg px-4 py-3 text-white text-sm focus:ring-1 focus:ring-[#0d93f2] focus:border-[#0d93f2] outline-none placeholder-white/20 transition-all"
                placeholder="e.g. Upstage Center Truss"
                type="text"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wide flex items-center gap-2">
                Mounting Preference
              </label>
              <div className="relative">
                <select
                  value={plotData.mountingPreference || 'Standard / Default'}
                  onChange={(e) => handleChange('mountingPreference', e.target.value)}
                  className="w-full appearance-none bg-[#101b23] border border-[#223949] rounded-lg px-4 py-3 text-white text-sm focus:ring-1 focus:ring-[#0d93f2] focus:border-[#0d93f2] outline-none transition-all cursor-pointer"
                >
                  <option>Standard / Default</option>
                  <option>Floor Stand</option>
                  <option>Flown (Truss)</option>
                  <option>Riser Clamp</option>
                  <option>Side Fill</option>
                </select>
                <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-white/40 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-white/60 uppercase tracking-wide">Specific Placement Notes</label>
            <textarea
              value={plotData.placementNotes || ''}
              onChange={(e) => handleChange('placementNotes', e.target.value)}
              className="w-full bg-[#101b23] border border-[#223949] rounded-lg p-4 text-white text-sm focus:ring-1 focus:ring-[#0d93f2] focus:border-[#0d93f2] outline-none h-32 resize-none placeholder-white/30 leading-relaxed transition-all"
              placeholder="Enter detailed instructions here..."
            ></textarea>
          </div>
        </div>

        {}
        <div className="flex flex-col gap-4">

          {}
          <label className="relative flex items-center justify-between bg-[#1a2632] p-5 rounded-xl border border-[#223949] cursor-pointer group hover:border-[#0d93f2]/50 transition-colors shadow-sm h-min select-none">
            <div className="flex items-center gap-3">
              <div className="bg-[#0d93f2]/10 p-2 rounded-lg text-[#0d93f2]">
                <CloudFog className="w-5 h-5" />
              </div>
              <div>
                <span className="text-white font-bold block">Hazer Required</span>
                <span className="text-[11px] text-white/50 block font-medium">Continuous Haze</span>
              </div>
            </div>
            <div
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${hazer ? 'bg-[#0d93f2]' : 'bg-[#223949]'}`}
              onClick={(e) => { e.preventDefault(); setHazer(!hazer); }}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${hazer ? 'translate-x-5' : 'translate-x-0'}`}></span>
            </div>
          </label>

          {}
          <div className="bg-[#1a2632] p-5 rounded-xl border border-[#223949] flex flex-col gap-3 opacity-80 hover:opacity-100 transition-opacity">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/5 p-2 rounded-lg text-white">
                  <Plug className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-white font-bold block text-sm">Local Power</span>
                  <span className="text-[11px] text-white/50 block font-medium">3 Phase / 60A</span>
                </div>
              </div>
              <CheckCircle className="w-5 h-5 text-white/30" />
            </div>
          </div>

          <div className="bg-[#1a2632] p-5 rounded-xl border border-[#223949] flex flex-col gap-3 opacity-60 hover:opacity-100 transition-opacity cursor-not-allowed">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/5 p-2 rounded-lg text-white">
                  <Cable className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-white font-bold block text-sm">Cabling</span>
                  <span className="text-[11px] text-white/50 block font-medium">DMX 5-Pin</span>
                </div>
              </div>
              <Lock className="w-5 h-5 text-white/30" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}