'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Loader2, Monitor, ArrowLeft } from 'lucide-react';

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
    <>
      {/* ========================================
        MOBILE BLOCKING OVERLAY (Visible < 1024px)
        ======================================== 
      */}
      <div className="lg:hidden flex h-screen w-full bg-[#0F0F10] items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Background glow decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#0d93f2]/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center max-w-sm">
          <div className="w-20 h-20 bg-[#1F1F22] rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-xl">
            <Monitor className="w-10 h-10 text-[#0d93f2]" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3">Desktop Access Only</h2>
          <p className="text-[#90b2cb] leading-relaxed mb-8">
            The Live Show Control Interface requires a larger screen to ensure precise cue management and setlist control.
          </p>

          <Link 
            href="/prod-dashboard" 
            className="flex items-center gap-2 px-6 py-3 bg-[#1F1F22] hover:bg-[#2c2c30] text-white rounded-lg font-medium transition-colors border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* ========================================
        DESKTOP UI (Hidden < 1024px)
        ======================================== 
      */}
      <div className="hidden lg:flex flex-col h-screen w-full bg-[#0F0F10] font-sans text-white overflow-hidden">

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
    </>
  );
}