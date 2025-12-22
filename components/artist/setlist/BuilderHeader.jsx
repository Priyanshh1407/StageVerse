import { Sparkles, Save, Trash2 } from 'lucide-react';

export default function BuilderHeader() {
  return (
    <div className="flex flex-wrap justify-between items-end gap-4 border-b border-[#223949] pb-6">
      <div className="flex min-w-72 flex-col gap-2">
        <div className="flex items-center gap-2 text-emerald-400 mb-1">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">AI Curator Active</span>
        </div>
        <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">Smart Setlist Builder</h1>
        <p className="text-[#90b2cb] text-base font-normal leading-normal">
          Building set for: <span className="text-white font-medium">World Tour 2024 (Europe Leg)</span>
        </p>
      </div>
      <div className="flex gap-3">
        <button className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-[#223949] hover:bg-[#2c4a5f] text-[#90b2cb] hover:text-white text-sm font-bold transition-colors">
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Discard Draft</span>
        </button>
        <button className="flex items-center justify-center gap-2 rounded-lg h-10 px-6 bg-[#0d93f2] hover:bg-[#0d93f2]/90 text-white text-sm font-bold tracking-[0.015em] transition-colors shadow-lg shadow-[#0d93f2]/20">
          <Save className="w-4 h-4" />
          Save Setlist
        </button>
      </div>
    </div>
  );
}