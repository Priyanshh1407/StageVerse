import React from 'react';
import { MoreVertical, Sun, CheckCircle, Zap, Aperture } from 'lucide-react';

export default function CreativeRigView() {
  const groups = [
    {
      id: 1, role: 'Intro Sequence', color: 'blue',
      fixtures: '8x Martin MAC Aura XB', location: 'Floor Package',
      patch: 'Univ 2 • CH 001-200', icon: Sun
    },
    {
      id: 2, role: 'Main Wash', color: 'orange',
      fixtures: '12x Robe MegaPointe', location: 'Mid Truss',
      patch: 'Univ 3 • CH 001-576', icon: Aperture
    },
    {
      id: 3, role: 'Drum Solo', color: 'red',
      fixtures: '6x Blinders (Atomic 3000)', location: 'Risers',
      patch: 'Univ 4 • CH 001-024', icon: Zap
    }
  ];

  const colorMap = {
    blue: { bg: 'bg-blue-900/40', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-500', iconHover: 'group-hover:text-blue-500' },
    orange: { bg: 'bg-orange-900/40', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-500', iconHover: 'group-hover:text-orange-500' },
    red: { bg: 'bg-red-900/40', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500', iconHover: 'group-hover:text-red-500' },
  };

  return (
    <div className="flex flex-col gap-8 p-6 pb-12">
      {groups.map((group) => {
        const theme = colorMap[group.color];
        const Icon = group.icon;
        
        return (
          <div key={group.id} className="flex flex-col gap-3">
             {/* Header Label */}
             <div className="flex items-center gap-3">
                <span className={`${theme.bg} ${theme.text} ${theme.border} border px-3 py-1 rounded text-[11px] font-bold tracking-widest uppercase flex items-center gap-2`}>
                   <span className={`size-2 rounded-full ${theme.dot}`}></span>
                   {group.role}
                </span>
                <div className="h-px bg-[#27272A] flex-1"></div>
             </div>

             {/* Card */}
             <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#3F3F46] transition-all group cursor-default">
                <div className="flex items-center gap-5">
                   <div className={`size-12 bg-[#27272A] rounded-lg flex items-center justify-center text-gray-400 ${theme.iconHover} transition-colors`}>
                      <Icon className="w-7 h-7" />
                   </div>
                   <div>
                      <h3 className="text-white text-xl font-bold tracking-tight">{group.fixtures}</h3>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-gray-400 text-xs font-medium bg-[#27272A] px-2 py-0.5 rounded">{group.location}</span>
                      </div>
                   </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 border-[#27272A] pt-3 md:pt-0 mt-2 md:mt-0">
                   <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5 text-green-500 text-xs font-bold bg-green-900/10 px-2 py-0.5 rounded-full border border-green-900/20 w-fit ml-auto">
                         <CheckCircle className="w-3.5 h-3.5" /> Patched
                      </div>
                      <p className="text-[#52525B] text-[10px] font-mono mt-1">{group.patch}</p>
                   </div>
                   <button className="text-gray-600 hover:text-white transition-colors">
                      <MoreVertical className="w-5 h-5" />
                   </button>
                </div>
             </div>
          </div>
        );
      })}
    </div>
  );
}