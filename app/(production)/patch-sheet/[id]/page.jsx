'use client';

import React, { useState, useEffect, use } from 'react';
import { Loader2, Table2, Calculator, FileText, FileCode, Plus, Filter } from 'lucide-react';

// --- NEW IMPORTS ---
import StudioNavbar from '@/components/production/StudioNavbar';
import PatchingSidebar from '@/components/production/patcher/PatchingSidebar';
import PatchMainArea from '@/components/production/patcher/PatchMainArea';

// --- MOCK DATA ---
const MOCK_SHOWS = {
  '101': {
    id: '101', 
    name: 'WorldTour_Arena_vFinal.shw',
    venue: 'O2 Arena London',
    version: '1.4',
    patches: [
      { id: 1, fixtureId: 101, profile: 'Robe BMFL Blade', universe: 1, address: 1, channels: 49, status: 'ok' },
      { id: 2, fixtureId: 102, profile: 'Robe BMFL Blade', universe: 1, address: 50, channels: 49, status: 'ok' },
      { id: 3, fixtureId: 103, profile: 'Robe BMFL Blade', universe: 1, address: 99, channels: 49, status: 'ok' },
      { id: 4, fixtureId: 104, profile: 'Robe BMFL Blade', universe: 1, address: 148, channels: 49, status: 'ok' },
      { id: 5, fixtureId: 105, profile: 'Robe BMFL Blade', universe: 1, address: 197, channels: 49, status: 'ok' },
      { id: 6, fixtureId: 106, profile: 'Robe BMFL Blade', universe: 1, address: 246, channels: 49, status: 'ok' },
      { id: 10, fixtureId: 201, profile: 'GLP JDC1 (Mode 3)', universe: 2, address: 1, channels: 68, status: 'ok' },
      { id: 11, fixtureId: 202, profile: 'GLP JDC1 (Mode 3)', universe: 2, address: 69, channels: 68, status: 'ok' },
      { id: 12, fixtureId: 203, profile: 'GLP JDC1 (Mode 3)', universe: 2, address: 137, channels: 68, status: 'ok' },
      { id: 13, fixtureId: 204, profile: 'GLP JDC1 (Mode 3)', universe: 2, address: 150, channels: 68, status: 'conflict' }, 
      { id: 14, fixtureId: 205, profile: 'GLP JDC1 (Mode 3)', universe: 2, address: 273, channels: 68, status: 'ok' },
      { id: 50, fixtureId: 601, profile: 'MDG Atmosphere', universe: 8, address: 1, channels: 2, status: 'ok' },
      { id: 51, fixtureId: 602, profile: 'MDG Atmosphere', universe: 8, address: 3, channels: 2, status: 'ok' },
      { id: 52, fixtureId: 603, profile: 'Look Solutions Viper', universe: 8, address: 10, channels: 2, status: 'ok' },
      { id: 53, fixtureId: 801, profile: 'Generic Fan DMX', universe: 8, address: 20, channels: 1, status: 'ok' },
      { id: 54, fixtureId: 802, profile: 'Generic Fan DMX', universe: 8, address: 21, channels: 1, status: 'ok' },
    ]
  }
};

export default function PatchSheetPage(props) {
  const params = use(props.params);
  const showId = params.id;
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeShow, setActiveShow] = useState(null);
  const [mobileView, setMobileView] = useState('sheet');

  useEffect(() => {
    const timer = setTimeout(() => {
      const data = MOCK_SHOWS[showId] || MOCK_SHOWS['101'];
      setActiveShow(data);
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [showId]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-[#0F0F10] items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#00d4ff]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#0F0F10] text-gray-300 font-sans overflow-hidden">
      
      {/* 1. TOP NAVBAR */}
      <StudioNavbar />

      {/* MOBILE VIEW TOGGLE */}
      <div className="md:hidden px-4 py-3 bg-[#0F0F10] border-b border-[#2c3e50] shrink-0 z-10">
        <div className="flex bg-[#1a1a1a] p-1 rounded-lg border border-[#2c3e50] shadow-sm">
          <button 
            onClick={() => setMobileView('sheet')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${
              mobileView === 'sheet' 
                ? 'bg-[#00d4ff] text-black shadow-md' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
               <Table2 className="w-3.5 h-3.5" /> Patch Sheet
            </div>
          </button>
          <button 
            onClick={() => setMobileView('tools')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${
              mobileView === 'tools' 
                ? 'bg-[#00d4ff] text-black shadow-md' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
               <Calculator className="w-3.5 h-3.5" /> Tools
            </div>
          </button>
        </div>
      </div>

      {/* 2. MAIN CONTENT SPLIT */}
      <div className="flex-1 flex overflow-hidden relative w-full">
        
        {/* Left Sidebar (Tools) */}
        <div className={`
          ${mobileView === 'tools' ? 'flex w-full' : 'hidden'} 
          md:flex md:w-80 md:border-r md:border-[#2c3e50] flex-col bg-[#111] overflow-y-auto
        `}>
          <PatchingSidebar showName={activeShow.name} />
        </div>

        {/* Right Main Area (Sheet) */}
        <div className={`
          ${mobileView === 'sheet' ? 'flex w-full' : 'hidden'} 
          md:flex flex-1 flex-col bg-[#0F0F10] relative overflow-y-auto
        `}>
          
          {/* --- PAGE HEADER (FIXED) --- 
              - Mobile: Stacked vertically (flex-col) 
              - Desktop: Row with space-between (md:flex-row)
          */}
          <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:px-6 md:py-5 border-b border-[#2c3e50] shrink-0 bg-[#0F0F10] z-10">
            
            {/* Title Section */}
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold text-white tracking-tight leading-none">Active Patch Sheet</h1>
              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono text-[#546b81] uppercase tracking-wider">
                <span>Version {activeShow.version}</span>
                <span className="w-1 h-1 rounded-full bg-[#2c3e50]"></span>
                <span className="text-[#00d4ff]">Auto-Saved</span>
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="grid grid-cols-2 md:flex items-center gap-3">
              <button className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#2c3e50] rounded-lg text-xs font-bold text-[#90b2cb] hover:text-white hover:border-[#00d4ff] transition-colors">
                <FileText className="w-3.5 h-3.5" /> EXPORT PDF
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#2c3e50] rounded-lg text-xs font-bold text-[#90b2cb] hover:text-white hover:border-[#00d4ff] transition-colors">
                <FileCode className="w-3.5 h-3.5" /> EXPORT XML
              </button>
            </div>
          </div>

          {/* Pass data to Main Area (Table) */}
          <PatchMainArea patches={activeShow.patches} />
          
        </div>

      </div>
    </div>
  );
}