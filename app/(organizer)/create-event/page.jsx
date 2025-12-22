'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { History, Zap, ArrowLeft } from 'lucide-react';

// --- COMPONENT IMPORTS ---
import OrganizerSidebar from '@/components/organizer/OrganizerSidebar';
import EventDetailsForm from '@/components/organizer/create-event/EventDetailsForm';
import AIContentPreview from '@/components/organizer/create-event/AIContentPreview';

export default function CreateEventPage() {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate AI delay
    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="flex h-screen w-full bg-[#101b22] text-white font-sans overflow-hidden">
      
      {/* --- CUSTOM SCROLLBAR CSS --- */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px; /* Slightly wider for page scroll */
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #101b22; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #2c3b47; 
          border-radius: 4px;
          border: 2px solid #101b22; /* Adds padding effect */
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #0d93f2; 
        }
      `}</style>

      {/* 1. SIDEBAR */}
      <OrganizerSidebar />

      {/* 2. MAIN AREA */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        
        {/* HEADER (Fixed Top) */}
        <header className="flex-none flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#2c3b47] p-8 bg-[#101b22] z-10">
          <div className="flex flex-col gap-2">
            <Link 
              href="/organizer/events" 
              className="flex items-center gap-2 text-[#90b2cb] hover:text-[#0d93f2] transition-colors text-sm font-medium mb-1"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Events
            </Link>
            <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight text-white">
              Create New Event
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[#90b2cb] text-base font-medium">Powered by Gemini</span>
              <Zap className="text-[#0d93f2] w-4 h-4 fill-current" />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2c3b47] bg-[#192734] text-white hover:bg-[#233b4a] transition-colors text-sm font-medium">
              <History className="w-4 h-4" />
              Load Draft
            </button>
          </div>
        </header>

        {/* CONTENT AREA (Scrollable with Custom Scrollbar) */}
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth custom-scrollbar">
          <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10">
            
            {/* Left: Input Controls */}
            <div className="lg:col-span-5">
              <EventDetailsForm onGenerate={handleGenerate} isGenerating={isGenerating} />
            </div>

            {/* Right: AI Output / Preview */}
            <div className="lg:col-span-7">
              <AIContentPreview />
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}