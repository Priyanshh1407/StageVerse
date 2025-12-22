'use client';

import React, { useState, useEffect, use } from 'react';
import { Loader2 } from 'lucide-react';

// --- NEW IMPORTS ---
import StudioNavbar from '@/components/production/StudioNavbar';
import PatchingSidebar from '@/components/production/patcher/PatchingSidebar';
import PatchMainArea from '@/components/production/patcher/PatchMainArea';

// --- MOCK DATA (Same as before) ---
const MOCK_SHOWS = {
  '101': {
    id: '101', 
    name: 'WorldTour_Arena_vFinal.shw',
    venue: 'O2 Arena London',
    patches: [
      // --- UNIVERSE 1: TRUSS SPOTS (Robe BMFL) ---
      { id: 1, fixtureId: 101, profile: 'Robe BMFL Blade', universe: 1, address: 1, channels: 49, status: 'ok' },
      { id: 2, fixtureId: 102, profile: 'Robe BMFL Blade', universe: 1, address: 50, channels: 49, status: 'ok' },
      { id: 3, fixtureId: 103, profile: 'Robe BMFL Blade', universe: 1, address: 99, channels: 49, status: 'ok' },
      { id: 4, fixtureId: 104, profile: 'Robe BMFL Blade', universe: 1, address: 148, channels: 49, status: 'ok' },
      { id: 5, fixtureId: 105, profile: 'Robe BMFL Blade', universe: 1, address: 197, channels: 49, status: 'ok' },
      { id: 6, fixtureId: 106, profile: 'Robe BMFL Blade', universe: 1, address: 246, channels: 49, status: 'ok' },
      
      // --- UNIVERSE 2: FLOOR PACKAGE (JDC1 Strobes - High Channel Count) ---
      { id: 10, fixtureId: 201, profile: 'GLP JDC1 (Mode 3)', universe: 2, address: 1, channels: 68, status: 'ok' },
      { id: 11, fixtureId: 202, profile: 'GLP JDC1 (Mode 3)', universe: 2, address: 69, channels: 68, status: 'ok' },
      { id: 12, fixtureId: 203, profile: 'GLP JDC1 (Mode 3)', universe: 2, address: 137, channels: 68, status: 'ok' },
      // INTENTIONAL CONFLICT HERE:
      { id: 13, fixtureId: 204, profile: 'GLP JDC1 (Mode 3)', universe: 2, address: 150, channels: 68, status: 'conflict' }, 
      { id: 14, fixtureId: 205, profile: 'GLP JDC1 (Mode 3)', universe: 2, address: 273, channels: 68, status: 'ok' },

      // --- UNIVERSE 8: ATMOSPHERICS (Hazers) ---
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

      {/* 2. MAIN CONTENT SPLIT */}
      <div className="flex-1 flex overflow-hidden relative w-full">
        
        {/* Left Sidebar */}
        <PatchingSidebar showName={activeShow.name} />

        {/* Right Main Area */}
        <PatchMainArea patches={activeShow.patches} />

      </div>
    </div>
  );
}