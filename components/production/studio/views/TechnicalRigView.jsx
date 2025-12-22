'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Pencil, Trash2, Info, AlertTriangle } from 'lucide-react';

export default function TechnicalRigView() {
  // State to track which row's menu is open (by ID)
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Close menu when clicking outside
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

  return (
    <div className="min-h-[500px] pb-32"> {/* Added padding bottom for dropdown space */}
      <table className="w-full text-left border-collapse min-w-[900px]">
        <thead className="bg-[#18181B] sticky top-0 z-20 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
          <tr>
            <th className="py-3 px-4 border-b border-[#27272A] w-16">ID</th>
            <th className="py-3 px-4 border-b border-[#27272A]">Fixture Name</th>
            <th className="py-3 px-4 border-b border-[#27272A] text-center w-24">Universe</th>
            <th className="py-3 px-4 border-b border-[#27272A] w-32">Address</th>
            <th className="py-3 px-4 border-b border-[#27272A]">Mode (Ch)</th>
            <th className="py-3 px-4 border-b border-[#27272A]">Linked Cue</th>
            <th className="py-3 px-4 border-b border-[#27272A]">Status</th>
            <th className="py-3 px-4 border-b border-[#27272A] text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#27272A] text-xs">
          
          {/* Row 1: Standard Fixture */}
          <FixtureRow 
            id="101" 
            name="Martin MAC Aura XB" 
            univ="2" 
            addr="001" 
            mode="Standard (25ch)" 
            cue="Intro Sequence" 
            cueColor="blue"
            status="Patched"
            isOpen={activeMenuId === "101"}
            onToggle={() => toggleMenu("101")}
          />

          {/* Row 2: Conflict Example */}
          <FixtureRow 
            id="201" 
            name="Robe MegaPointe" 
            univ="3" 
            addr="450" 
            mode="Ext (42ch)" 
            cue="Main Wash" 
            cueColor="orange"
            status="Conflict"
            isConflict={true}
            isOpen={activeMenuId === "201"}
            onToggle={() => toggleMenu("201")}
          />
          
          {/* Row 3: Another Standard */}
          <FixtureRow 
            id="301" 
            name="Atomic 3000" 
            univ="4" 
            addr="001" 
            mode="4ch Mode" 
            cue="Drum Solo" 
            cueColor="red"
            status="Patched"
            isOpen={activeMenuId === "301"}
            onToggle={() => toggleMenu("301")}
          />

        </tbody>
      </table>
    </div>
  );
}

// --- SUB-COMPONENT: Single Row with Dropdown Logic ---
function FixtureRow({ id, name, univ, addr, mode, cue, cueColor, status, isConflict, isOpen, onToggle }) {
  
  // Color mapping helper
  const getCueColors = (color) => {
    const map = {
      blue: { bg: 'bg-blue-900/20', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-500' },
      orange: { bg: 'bg-orange-900/20', text: 'text-orange-400', border: 'border-orange-500/20', dot: 'bg-orange-500' },
      red: { bg: 'bg-red-900/20', text: 'text-red-400', border: 'border-red-500/20', dot: 'bg-red-500' },
    };
    return map[color] || map.blue;
  };
  const theme = getCueColors(cueColor);

  return (
    <tr className={`transition-colors group relative ${isConflict ? 'bg-red-900/5 hover:bg-red-900/10 border-l-2 border-l-red-500' : 'hover:bg-[#18181B]'}`}>
       
       <td className={`py-3 px-4 font-bold ${isConflict ? 'text-white pl-3.5' : 'text-white'}`}>{id}</td>
       <td className="py-3 px-4 text-gray-400 group-hover:text-gray-300 transition-colors">{name}</td>
       
       <td className={`py-3 px-4 text-center font-mono ${isConflict ? 'text-white bg-[#18181B]/50 font-bold' : 'text-gray-300 bg-[#18181B]/50'}`}>
         {univ}
       </td>
       
       <td className="py-3 px-4">
          <div className="flex flex-col gap-1">
             <span className={`font-mono text-xs ${isConflict ? 'text-red-400 font-bold' : 'text-white'}`}>{addr}</span>
             <div className="w-16 h-1 bg-[#27272A] rounded-full overflow-hidden relative">
               <div className={`h-full w-[20%] ${isConflict ? 'bg-red-500/50 w-full animate-pulse absolute inset-0' : 'bg-green-500'}`}></div>
             </div>
          </div>
       </td>
       
       <td className="py-3 px-4 text-gray-400">{mode}</td>
       
       <td className="py-3 px-4">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border ${theme.bg} ${theme.text} ${theme.border}`}>
             <span className={`size-1.5 rounded-full ${theme.dot}`}></span> {cue}
          </span>
       </td>
       
       <td className="py-3 px-4">
          <div className="flex items-center gap-2">
             <span className={`size-2 rounded-full ${isConflict ? 'bg-red-500 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'}`}></span>
             <span className={isConflict ? 'text-red-400 font-bold' : 'text-gray-300'}>{status}</span>
          </div>
       </td>

       {/* ACTIONS COLUMN WITH DROPDOWN */}
       <td className="py-3 px-4 text-right relative action-menu-container">
          
          {isConflict && (
            <button className="mr-3 bg-red-600 hover:bg-red-500 text-white text-[10px] uppercase font-bold py-1 px-3 rounded shadow-lg shadow-red-900/20 transition-all">
              Fix
            </button>
          )}

          <button 
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={`text-gray-600 hover:text-white transition-colors p-1 rounded ${isOpen ? 'text-white bg-[#27272A]' : ''}`}
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {/* THE DROPDOWN MENU */}
          {isOpen && (
            <div className="absolute right-8 top-8 w-40 bg-[#27272A] border border-[#3F3F46] rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
              <div className="flex flex-col py-1">
                
                <button className="flex items-center gap-3 px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-blue-600 transition-colors w-full text-left group/item">
                  <Pencil className="w-3.5 h-3.5 text-gray-500 group-hover/item:text-white" />
                  Edit Fixture
                </button>
                
                <button className="flex items-center gap-3 px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-blue-600 transition-colors w-full text-left group/item">
                  <Info className="w-3.5 h-3.5 text-gray-500 group-hover/item:text-white" />
                  View Details
                </button>
                
                <div className="h-px bg-[#3F3F46] my-1 mx-2"></div>
                
                <button className="flex items-center gap-3 px-4 py-2.5 text-xs text-red-400 hover:text-white hover:bg-red-600 transition-colors w-full text-left group/item">
                  <Trash2 className="w-3.5 h-3.5 group-hover/item:text-white" />
                  Delete
                </button>

              </div>
            </div>
          )}
       </td>
    </tr>
  );
}