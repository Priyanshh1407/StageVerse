'use client';

import React, { useState } from 'react';
import { Search, FolderOpen } from 'lucide-react';

// 1. Import the shared Navbar Component
import StudioNavbar from '@/components/production/StudioNavbar';

import StudioSidebar from '@/components/production/studio/StudioSidebar';
import CreativeRigView from '@/components/production/studio/views/CreativeRigView';
import TechnicalRigView from '@/components/production/studio/views/TechnicalRigView';

export default function PatchStudioPage() {
  // THE TOGGLE STATE
  const [viewMode, setViewMode] = useState('creative'); // 'creative' or 'technical'

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0F0F10] text-slate-300 selection:bg-blue-500 selection:text-white font-sans">
      
      {/* 1. GLOBAL NAVBAR (Replaced manual code with Component) */}
      <StudioNavbar />

      {/* 2. SUB HEADER (Breadcrumbs & Context Search) */}
      <header className="flex items-center justify-between border-b border-[#27272A] bg-[#0F0F10] px-6 py-2.5 shrink-0 z-20">
         <div className="flex items-center gap-2 text-sm">
            <FolderOpen className="w-5 h-5 text-gray-600" />
            <span className="text-gray-500">Project Alpha</span>
            <span className="text-[#27272A]">/</span>
            <span className="text-white font-medium">Patch Studio</span>
         </div>
         <div className="hidden md:flex items-center bg-[#18181B] border border-[#27272A] rounded-lg h-9 w-72 px-3 focus-within:border-blue-500/50 transition-all">
            <Search className="w-4 h-4 text-gray-500 mr-2" />
            <input className="bg-transparent border-none text-white text-xs w-full focus:outline-none placeholder:text-gray-600" placeholder="Search fixtures..." />
            <span className="text-[10px] text-gray-600 border border-[#27272A] px-1 rounded">⌘K</span>
         </div>
      </header>

      {/* 3. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT SIDEBAR (Controls) */}
        <StudioSidebar />

        {/* RIGHT CONTENT AREA */}
        <div className="flex-1 bg-[#0F0F10] flex flex-col h-full overflow-hidden relative">
           {/* Background Grid Pattern */}
           <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
           
           {/* VIEW TOGGLE HEADER */}
           <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 pb-4 gap-4 z-10 border-b border-[#27272A] bg-[#0F0F10]/95 backdrop-blur-sm sticky top-0">
              <div className="flex flex-col">
                 <h2 className="text-white text-xl font-bold tracking-tight">Show Rig: <span className="text-blue-500 font-normal">Neon Nights Tour</span></h2>
                 <p className="text-xs text-gray-500 mt-1">
                    {viewMode === 'creative' ? 'Creative Mode • 3 Sections Defined' : 'Technical Mode • 78 Fixtures Patched'}
                 </p>
              </div>
              
              {/* THE TOGGLE SWITCH */}
              <div className="bg-[#18181B] p-1 rounded-lg border border-[#27272A] flex h-9 items-center">
                 <button 
                    onClick={() => setViewMode('creative')}
                    className={`px-3 h-full rounded-md text-xs font-bold transition-all ${viewMode === 'creative' ? 'bg-[#27272A] text-white shadow-sm border border-[#3F3F46]' : 'text-gray-500 hover:text-white'}`}
                 >
                    Creative View
                 </button>
                 <button 
                    onClick={() => setViewMode('technical')}
                    className={`px-3 h-full rounded-md text-xs font-bold transition-all ${viewMode === 'technical' ? 'bg-[#27272A] text-white shadow-sm border border-[#3F3F46]' : 'text-gray-500 hover:text-white'}`}
                 >
                    Technical View
                 </button>
              </div>
           </div>

           {/* DYNAMIC VIEW RENDER */}
           <div className="flex-1 overflow-auto z-0">
              {viewMode === 'creative' ? <CreativeRigView /> : <TechnicalRigView />}
           </div>

        </div>
      </div>
    </div>
  );
}