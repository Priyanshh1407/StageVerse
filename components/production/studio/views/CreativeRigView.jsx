'use client';
import React, { useState, useEffect } from 'react';
import { MoreVertical, Sun, CheckCircle, Target, Layers, Trash2 } from 'lucide-react';

export default function CreativeRigView({ fixtures, onDeleteGroup }) {
   const [activeMenuId, setActiveMenuId] = useState(null);
   useEffect(() => {
      const handleClickOutside = (event) => {
         if (!event.target.closest('.action-menu-container')) {
            setActiveMenuId(null);
         }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
   }, []);

   const toggleMenu = (id) => {
      setActiveMenuId(activeMenuId === id ? null : id);
   };
   const groups = fixtures ? fixtures.reduce((acc, f) => {
      const cueName = f.cue || 'Unassigned';

      if (!acc[cueName]) {
         acc[cueName] = {
            role: cueName,
            color: f.cueColor || 'blue',
            subgroups: {}
         };
      }
      const profileKey = f.profile || 'Unknown Fixture';
      if (!acc[cueName].subgroups[profileKey]) {
         acc[cueName].subgroups[profileKey] = {
            profile: profileKey,
            items: [],
            minAddr: Infinity,
            maxAddr: -Infinity,
            universe: f.universe
         };
      }

      const sub = acc[cueName].subgroups[profileKey];
      sub.items.push(f);
      const addr = parseInt(f.address);
      if (!isNaN(addr)) {
         if (addr < sub.minAddr) sub.minAddr = addr;
         if (addr > sub.maxAddr) sub.maxAddr = addr + (parseInt(f.channels) || 0) - 1;
      }

      return acc;
   }, {}) : {};

   const groupList = Object.values(groups);

   const colorMap = {
      blue: { bg: 'bg-blue-900/40', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-500', iconHover: 'group-hover:text-blue-500' },
      orange: { bg: 'bg-orange-900/40', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-500', iconHover: 'group-hover:text-orange-500' },
      red: { bg: 'bg-red-900/40', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500', iconHover: 'group-hover:text-red-500' },
   };

   if (!fixtures || fixtures.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center h-full text-gray-500 p-12">
            <Layers className="w-12 h-12 mb-4 opacity-20" />
            <p>No groups defined yet.</p>
            <p className="text-xs mt-1 text-gray-600">Add fixtures from the sidebar to start creating.</p>
         </div>
      );
   }

   return (
      <div className="flex flex-col gap-8 p-6 pb-12">
         {groupList.map((group) => {
            const theme = colorMap[group.color] || colorMap.blue;
            const subGroups = Object.values(group.subgroups);

            return (
               <div key={group.role} className="flex flex-col gap-3">
                  {}
                  <div className="flex items-center gap-3">
                     <span className={`${theme.bg} ${theme.text} ${theme.border} border px-3 py-1 rounded text-[11px] font-bold tracking-widest uppercase flex items-center gap-2`}>
                        <span className={`size-2 rounded-full ${theme.dot}`}></span>
                        {group.role}
                     </span>
                     <div className="h-px bg-[#27272A] flex-1"></div>
                  </div>

                  {}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {subGroups.map((sub) => {
                        const uniqueId = `${group.role}-${sub.profile}`;
                        const count = sub.items.length;
                        const displayName = sub.profile.split('(')[0];
                        const patchLabel = `Univ ${sub.universe || '?'} • CH ${sub.minAddr !== Infinity ? String(sub.minAddr).padStart(3, '0') : '???'}-${sub.maxAddr !== -Infinity ? String(sub.maxAddr).padStart(3, '0') : '???'}`;

                        const isOpen = activeMenuId === uniqueId;

                        return (
                           <div key={uniqueId} className="bg-[#18181B] border border-[#27272A] rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-[#3F3F46] transition-all group cursor-default shadow-sm">

                              {}
                              <div className="flex items-start justify-between">
                                 <div className="flex items-center gap-4">
                                    <div className={`size-12 bg-[#27272A] rounded-lg flex items-center justify-center text-gray-400 ${theme.iconHover} transition-colors shrink-0`}>
                                       <Target className="w-6 h-6" />
                                    </div>
                                    <div>
                                       <h3 className="text-white text-lg font-bold tracking-tight leading-tight">{count}x {displayName}</h3>
                                       <div className="flex items-center gap-2 mt-1.5">
                                          <span className="text-gray-500 text-[10px] font-medium bg-[#27272A] px-2 py-0.5 rounded uppercase tracking-wide">Fixture Batch</span>
                                       </div>
                                    </div>
                                 </div>
                              </div>

                              {}
                              <div className="flex items-end justify-between border-t border-[#27272A] pt-4 mt-2">
                                 <div>
                                    <div className="flex items-center gap-1.5 text-green-500 text-[10px] font-bold">
                                       <CheckCircle className="w-3 h-3" /> Patched
                                    </div>
                                    <p className="text-[#52525B] text-[10px] font-mono mt-0.5">{patchLabel}</p>
                                 </div>

                                 {}
                                 <div className="relative action-menu-container">
                                    <button
                                       onClick={(e) => { e.stopPropagation(); toggleMenu(uniqueId); }}
                                       className={`text-gray-600 hover:text-white transition-colors p-1.5 rounded-md ${isOpen ? 'text-white bg-[#27272A]' : ''}`}
                                    >
                                       <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {}
                                    {isOpen && (
                                       <div className="absolute right-0 bottom-8 w-48 bg-[#27272A] border border-[#3F3F46] rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-bottom-right">
                                          <div className="flex flex-col py-1">
                                             <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#3F3F46] mb-1">
                                                Manage Group
                                             </div>
                                             {}
                                             <button
                                                onClick={() => onDeleteGroup(group.role, sub.profile)}
                                                className="flex items-center gap-3 px-4 py-2.5 text-xs text-red-400 hover:text-white hover:bg-red-600 transition-colors w-full text-left group/item"
                                             >
                                                <Trash2 className="w-3.5 h-3.5 group-hover/item:text-white" />
                                                Delete Fixture Batch
                                             </button>
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            );
         })}
      </div>
   );
}