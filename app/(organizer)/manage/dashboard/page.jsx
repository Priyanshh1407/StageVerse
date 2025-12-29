'use client';

import React, { useState } from 'react';
import { 
  DollarSign, Ticket, Hourglass, Calendar, 
  Search, Bell, ChevronDown, MoreHorizontal,
  Zap, Send, Download, ArrowRight, Menu, 
  Sparkles, Wand2, Copy, Check, Rocket, ArrowLeft, Loader2
} from 'lucide-react';

// --- COMPONENT IMPORTS ---
import OrganizerSidebar from '@/components/organizer/OrganizerSidebar'; 
import HypeChart from '@/components/organizer/HypeChart';
import StatsCard from '@/components/organizer/StatsCard';
import Link from 'next/link';

// ==================================================================================
// --- TEMPORARY: COMING SOON MODE ---
const IS_COMING_SOON = false; 
// ==================================================================================

// Mock Data
const dashboardData = {
  stats: {
    revenue: "$142,500",
    ticketsSold: "12,450",
    waitlist: "856"
  },
  hypeData: [
    { date: 'Aug 01', velocity: 20 },
    { date: 'Aug 05', velocity: 35 },
    { date: 'Aug 10', velocity: 45 },
    { date: 'Aug 15', velocity: 30 },
    { date: 'Aug 20', velocity: 50 },
    { date: 'Aug 25', velocity: 65 },
    { date: 'Aug 30', velocity: 55 },
    { date: 'Sep 05', velocity: 80 },
    { date: 'Sep 10', velocity: 75 },
    { date: 'Sep 15', velocity: 95 },
    { date: 'Sep 20', velocity: 85 },
    { date: 'Sep 25', velocity: 90 },
  ],
  locations: [
    { city: "New York", percent: 42, color: "bg-[#0d93f2]" },
    { city: "London", percent: 21, color: "bg-[#3b82f6]" },
    { city: "Berlin", percent: 15, color: "bg-[#60a5fa]" },
    { city: "Tokyo", percent: 9, color: "bg-[#93c5fd]" },
  ]
};

export default function OrganizerDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#101b22] text-white font-sans overflow-hidden relative">
      
      {/* COMING SOON OVERLAY */}
      {IS_COMING_SOON && (
        <div className="absolute inset-0 z-[100] bg-[#101b22]/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-500">
          <div className="bg-[#192734] p-8 rounded-2xl border border-[#2c3b47] shadow-2xl max-w-md w-full relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 bg-[#0d93f2]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-[#0d93f2]/20 rounded-full flex items-center justify-center mb-6 text-[#0d93f2]">
                <Rocket className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Dashboard Coming Soon</h2>
              <p className="text-[#90b2cb] mb-8">We are finalizing the command center. Check back shortly.</p>
              <button onClick={() => window.location.reload()} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0d93f2] hover:bg-[#0b84db] text-white font-bold transition-all shadow-lg shadow-[#0d93f2]/20">
                <ArrowLeft className="w-4 h-4" /> Refresh Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. SIDEBAR */}
      <OrganizerSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* 2. MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        
        {/* Header */}
        <header className="h-20 border-b border-[#2c3b47] flex items-center justify-between px-4 md:px-8 bg-[#101b22]/95 backdrop-blur-sm sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 text-[#90b2cb] hover:text-white hover:bg-[#2c3b47] rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">Command Center</h2>
              <p className="text-[#90b2cb] text-xs md:text-sm hidden sm:block">Monitoring hype levels</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
            <div className="w-64 relative hidden lg:block">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#90b2cb]" />
              <input 
                className="w-full pl-10 pr-3 py-2 bg-[#192734] border border-[#2c3b47] rounded-lg text-sm text-white placeholder-[#90b2cb] focus:outline-none focus:border-[#0d93f2]" 
                placeholder="Search events..." 
              />
            </div>
            <button className="flex items-center gap-2 px-3 py-2 bg-[#192734] border border-[#2c3b47] rounded-lg hover:bg-[#223949] text-sm font-medium transition-colors">
              <Calendar className="w-4 h-4 text-[#90b2cb]" />
              <span className="hidden sm:inline">Aug 2023</span>
              <ChevronDown className="w-4 h-4 text-[#90b2cb]" />
            </button>
            <button className="relative p-2 text-[#90b2cb] hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0d93f2] rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-[1600px] mx-auto space-y-6 pb-10">
            
            {/* Row 1: KPI Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard label="Gross Revenue" value={dashboardData.stats.revenue} icon={DollarSign} trend={15} trendLabel="vs last 30 days" />
              <StatsCard label="Tickets Sold" value={dashboardData.stats.ticketsSold} icon={Ticket} progress={78} />
              <StatsCard label="Waitlist Count" value={dashboardData.stats.waitlist} icon={Hourglass} trend={24} trendLabel="new since yesterday" />
              
              {/* Quick Actions Panel */}
              <div className="bg-[#192734] rounded-xl p-5 border border-[#2c3b47] flex flex-col justify-center gap-3 shadow-lg">
                <h4 className="text-white font-bold text-sm flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-[#0d93f2]" /> Quick Actions
                </h4>
                <Link href="/create-event" className="w-full px-4 py-2.5 rounded-lg bg-[#0d93f2] text-white font-bold text-sm hover:bg-[#0b84db] transition-colors flex justify-between items-center group">
                  Create New Event <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 rounded-lg bg-[#2c3b47] hover:bg-[#3e5060] text-xs font-medium text-white flex items-center justify-center gap-2 transition-colors">
                    <Send className="w-3 h-3 text-[#90b2cb]" /> Blast
                  </button>
                  <button className="flex-1 px-3 py-2 rounded-lg bg-[#2c3b47] hover:bg-[#3e5060] text-xs font-medium text-white flex items-center justify-center gap-2 transition-colors">
                    <Download className="w-3 h-3 text-[#90b2cb]" /> Export
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Charts & AI Generator */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[450px]">
              
              {/* Hype Chart */}
              <div className="lg:col-span-2 h-[300px] lg:h-full">
                <HypeChart data={dashboardData.hypeData} />
              </div>
              
              {/* AI Description Generator (WITH 2 FIELDS & PINK BUTTON) */}
              <div className="lg:col-span-1 h-[450px] lg:h-full">
                <AIDescriptionGenerator />
              </div>
            </div>

            {/* Row 3: Demographics & Map */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Demographics */}
              <div className="bg-[#192734] rounded-xl border border-[#2c3b47] p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">Attendee Profile</h3>
                  <button className="text-[#90b2cb] hover:text-white"><MoreHorizontal className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "18 - 24", val: 45, color: "bg-[#0d93f2]" },
                    { label: "25 - 34", val: 32, color: "bg-[#3b82f6]" },
                    { label: "35 - 44", val: 15, color: "bg-[#60a5fa]" },
                    { label: "45+", val: 8, color: "bg-[#93c5fd]" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white">{item.label}</span>
                        <span className="text-[#90b2cb]">{item.val}%</span>
                      </div>
                      <div className="w-full bg-[#101b22] h-2 rounded-full overflow-hidden">
                        <div className={`${item.color} h-full rounded-full`} style={{ width: `${item.val}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Locations */}
              <div className="bg-[#192734] rounded-xl border border-[#2c3b47] p-6 flex flex-col shadow-sm h-[350px]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">Top Locations</h3>
                  <button className="text-xs bg-[#2c3b47] px-2 py-1 rounded text-[#90b2cb] hover:text-white transition-colors">View All</button>
                </div>
                <div className="flex-1 flex gap-4">
                  <div className="relative flex-1 rounded-lg overflow-hidden bg-[#101b22] border border-[#2c3b47]">
                    <div className="absolute inset-0 opacity-40 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center invert filter brightness-50 contrast-125"></div>
                    <div className="absolute top-[30%] left-[25%] w-3 h-3 bg-[#0d93f2] rounded-full animate-ping"></div>
                    <div className="absolute top-[30%] left-[25%] w-3 h-3 bg-[#0d93f2] rounded-full"></div>
                    <div className="absolute top-[35%] left-[48%] w-2 h-2 bg-[#3b82f6] rounded-full"></div>
                  </div>
                  <div className="w-32 flex flex-col justify-center gap-4">
                    {dashboardData.locations.map((loc) => (
                      <div key={loc.city} className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full ${loc.color}`}></span>
                          <span className="text-white text-sm">{loc.city}</span>
                        </div>
                        <span className="text-[#90b2cb] text-xs pl-4">{loc.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ==========================================
// SUB-COMPONENT: AI DESCRIPTION GENERATOR (UPDATED)
// ==========================================

function AIDescriptionGenerator() {
  const [prompt, setPrompt] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleGenerate = () => {
    if (!prompt) return;
    setIsGenerating(true);
    // Simulate API call
    setTimeout(() => {
      setGeneratedText("Experience the ultimate fusion of sound and light. Join us for a night where cutting-edge beats meet immersive visuals in the heart of the city. Don't miss the event of the year.");
      setIsGenerating(false);
    }, 1500);
  };

  const handleCopy = () => {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="bg-[#192734] rounded-xl border border-[#2c3b47] p-6 flex flex-col h-full relative overflow-hidden group">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 text-white font-bold">
          <Sparkles className="w-5 h-5 text-pink-500/90" />
          <h3>AI Analysis Assistant</h3>
        </div>
        <div className="text-xs text-[#90b2cb] bg-[#101b22] px-2 py-1 rounded border border-[#2c3b47]">Beta</div>
      </div>

      {/* Content Area - Split View for Input & Output */}
      <div className="flex-1 flex flex-col gap-4 min-h-0 mb-4">
        
        {/* FIELD 1: INPUT (Always Visible) */}
        <div className={`flex flex-col ${generatedText ? 'h-1/3' : 'h-full'} transition-all duration-300`}>
          <label className="text-xs text-[#90b2cb] mb-2 uppercase font-semibold">Event Keywords / Context</label>
          <textarea
            className="w-full h-full bg-[#101b22] border border-[#2c3b47] rounded-lg p-3 text-sm text-white placeholder-[#90b2cb] focus:outline-none focus:border-pink-500/90 resize-none"
            placeholder="e.g., Techno rave, Warehouse vibes, Late night queues..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        {/* FIELD 2: OUTPUT (Visible only after generation) */}
        {generatedText && (
          <div className="flex-1 flex flex-col h-2/3 animate-in slide-in-from-bottom-4 duration-300">
             <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-pink-500/90 uppercase font-semibold">Generated Insight</label>
                <button 
                  onClick={handleCopy}
                  className="text-xs text-[#90b2cb] hover:text-white flex items-center gap-1 transition-colors"
                >
                  {isCopied ? <><Check className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
             </div>
             <div className="flex-1 bg-[#101b22] border border-[#2c3b47] rounded-lg p-3 overflow-y-auto group/text">
                <p className="text-sm text-[#90b2cb] leading-relaxed">{generatedText}</p>
             </div>
          </div>
        )}
      </div>

      {/* PINK BUTTON */}
      <button 
        onClick={handleGenerate}
        disabled={isGenerating || !prompt}
        className={`
          mt-auto w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all
          ${isGenerating || !prompt
            ? 'bg-[#2c3b47] text-[#90b2cb] cursor-not-allowed' 
            : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/20 hover:scale-[1.02]'}
        `}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <><Wand2 className="w-4 h-4" /> Generate Magic</>
        )}
      </button>
    </div>
  );
}