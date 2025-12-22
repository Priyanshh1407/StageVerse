'use client';

import React, { useState, useEffect, use } from 'react';
import { Loader2 } from 'lucide-react';

// Adjust this import path if your StudioNavbar is elsewhere
import StudioNavbar from '@/components/production/StudioNavbar';
import LiveHeader from '@/components/production/live/LiveHeader';
import LiveControls from '@/components/production/live/LiveControls';
import SetlistTimeline from '@/components/production/live/SetlistTimeline';
// --- DYNAMIC MOCK DATA ---
const MOCK_SHOW_DATA = {
  '101': {
    id: '101',
    name: 'The Eras Tour - Night 2',
    status: 'Live', // 'Live', 'Offline', 'Rehearsal'
    bpm: 128,
    currentSong: {
      title: 'Song 04: Midnight Rain',
      section: 'Bridge • Build Up',
      timeElapsed: '3:12', 
      duration: '4:50',    
      progress: 65,        
    },
    currentCue: {
      type: 'Critical',
      title: 'Slow Fade to Blue',
      action: '+ Spotlight Center',
      notes: 'Hold on singer until chorus drop.',
      nextCueId: 'Q-105',
      technical: {
        visual: 'Deep Blue Wash',
        visualDetail: 'Sharp Beams / Gobo Rot',
        spots: 'Hold Center',
        spotsDetail: 'Iris 40% / Frame 2',
        haze: 'Haze @ 60%',
        hazeDetail: 'No Fan'
      }
    },
    setlist: [
      { id: '01', title: 'Lavender Haze', status: 'completed', duration: '3:20', notes: '' },
      { id: '02', title: 'Maroon', status: 'completed', duration: '3:40', notes: '' },
      { id: '03', title: 'Anti-Hero', status: 'completed', duration: '3:15', notes: '' },
      { id: '04', title: 'Midnight Rain', status: 'live', duration: '4:50', notes: 'Quick Change' },
      { id: '05', title: 'Vigilante Shit', status: 'pending', duration: '3:40', notes: 'Chair Routine • Dark Blue' },
      { id: '06', title: 'Bejeweled', status: 'pending', duration: '3:10', notes: 'Sparkle FX • Pink/Gold' },
      { id: '07', title: 'Mastermind', status: 'pending', duration: '3:30', notes: 'Grid Pattern • Red' },
      { id: '08', title: 'Karma', status: 'pending', duration: '4:00', notes: 'Confetti • Rainbow' },
    ]
  }
};

export default function LiveShowPage(props) {
  // Unwrap params using React.use() for Next.js 15+ compatibility
  const params = use(props.params);
  const showId = params.id;

  const [isLoading, setIsLoading] = useState(true);
  const [show, setShow] = useState(null);

  useEffect(() => {
    // Simulate API Fetch
    const timer = setTimeout(() => {
      const data = MOCK_SHOW_DATA[showId] || MOCK_SHOW_DATA['101'];
      setShow(data);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [showId]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-[#0F0F10] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0d93f2]" />
      </div>
    );
  }

  if (!show) return <div className="text-white p-10">Show not found</div>;

  return (
    <div className="flex flex-col h-screen w-full bg-[#0F0F10] font-sans text-white overflow-hidden">

      {/* 1. Global Navigation */}
      <StudioNavbar />

      {/* 2. Show Status Header */}
      <LiveHeader 
        showName={show.name} 
        status={show.status} 
        bpm={show.bpm} 
      />

      {/* 3. Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left: Controls & Visuals */}
        <LiveControls 
          currentSong={show.currentSong} 
          currentCue={show.currentCue} 
        />

        {/* Right: Setlist */}
        <SetlistTimeline items={show.setlist} />

      </div>
    </div>
  );
}