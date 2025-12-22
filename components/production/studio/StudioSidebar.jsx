import React from 'react';
import { PlusCircle, Wand2, Info, ChevronDown } from 'lucide-react';

export default function StudioSidebar() {
  return (
    <div className="w-full md:w-[30%] min-w-[320px] bg-[#0F0F10] border-r border-[#27272A] flex flex-col overflow-y-auto">
      <div className="p-6 flex flex-col gap-6 h-full">
        
        <div className="flex items-center gap-2 pb-2 border-b border-[#27272A]">
          <PlusCircle className="text-blue-500 w-5 h-5" />
          <h2 className="text-white font-bold text-lg tracking-tight">Add New Group</h2>
        </div>

        <div className="flex flex-col gap-5">
          {/* Inputs Row */}
          <div className="grid grid-cols-3 gap-3">
             <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Fixture Profile</label>
                <div className="relative">
                   <select className="w-full bg-[#18181B] border border-[#27272A] text-white text-sm rounded-lg focus:ring-1 focus:ring-blue-500 block p-2.5 appearance-none">
                      <option>Clay Paky Sharpy</option>
                      <option>Martin MAC Aura XB</option>
                      <option>Robe MegaPointe</option>
                   </select>
                   <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
             </div>
             <div className="col-span-1 flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Quantity</label>
                <input className="bg-[#18181B] border border-[#27272A] text-white text-sm rounded-lg focus:ring-1 focus:ring-blue-500 block w-full p-2.5" type="number" defaultValue="8"/>
             </div>
          </div>

          <div className="flex flex-col gap-1.5">
             <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Creative Role / Cue</label>
             <div className="relative">
                <select className="w-full bg-[#18181B] border border-[#27272A] text-white text-sm rounded-lg focus:ring-1 focus:ring-blue-500 block p-2.5 appearance-none">
                   <option>Intro Sequence</option>
                   <option>Drum Solo</option>
                   <option>Main Wash</option>
                </select>
                <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
             </div>
          </div>

          <div className="flex flex-col gap-1.5 flex-1 min-h-[160px]">
             <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Logic</label>
                <span className="text-[10px] text-blue-500 flex items-center gap-1 bg-blue-500/10 px-1.5 rounded border border-blue-500/20">
                   <Wand2 className="w-3 h-3" /> AI Assist
                </span>
             </div>
             <textarea className="flex-1 bg-[#18181B] border border-[#27272A] text-gray-300 text-sm rounded-lg focus:ring-1 focus:ring-blue-500 block w-full p-3 resize-none placeholder:text-gray-600 font-mono leading-relaxed" placeholder="Patch these sequentially for the floor package..."></textarea>
          </div>

          <button className="bg-blue-600 hover:bg-blue-700 shadow-[0_0_15px_rgba(37,99,235,0.3)] w-full text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]">
             <Wand2 className="w-5 h-5" />
             Calculate & Add Group
          </button>
        </div>

        <div className="mt-auto pt-6 border-t border-[#27272A]">
           <div className="flex items-center gap-3 text-xs text-gray-500">
              <Info className="w-4 h-4" />
              <span>Creative AI Logic Active</span>
           </div>
        </div>
      </div>
    </div>
  );
}