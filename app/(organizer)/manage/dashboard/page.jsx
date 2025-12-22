'use client';

import React from 'react';
import { 
  DollarSign, Ticket, Hourglass, Calendar, 
  Search, Bell, ChevronDown, MoreHorizontal,
  Zap, Send, Download, ArrowRight 
} from 'lucide-react';

// --- COMPONENT IMPORTS ---
import OrganizerSidebar from '@/components/organizer/OrganizerSidebar'; // <--- IMPORTED HERE
import HypeChart from '@/components/organizer/HypeChart';
import AIDescriptionGenerator from '@/components/organizer/AIDescriptionGenerator';
import StatsCard from '@/components/organizer/StatsCard';

// Mock Data (Simulate API)
const dashboardData = {
  stats: {
    revenue: "$142,500",
    ticketsSold: "12,450",
    waitlist: "856"
  },
  // Data for Recharts (Date + Velocity)
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
  return (
    <div className="flex h-screen w-full bg-[#101b22] text-white font-sans overflow-hidden">
      
      {/* 1. SIDEBAR (Fixed Left) */}
      <OrganizerSidebar />

      {/* 2. MAIN CONTENT AREA (Flex Grow) */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        
        {/* Header */}
        <header className="h-20 border-b border-[#2c3b47] flex items-center justify-between px-8 bg-[#101b22]/95 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold tracking-tight text-white">Command Center</h2>
            <p className="text-[#90b2cb] text-sm">Monitoring hype levels</p>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Search */}
            <div className="w-64 relative hidden md:block">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#90b2cb]" />
              <input 
                className="w-full pl-10 pr-3 py-2 bg-[#192734] border border-[#2c3b47] rounded-lg text-sm text-white placeholder-[#90b2cb] focus:outline-none focus:border-[#0d93f2]" 
                placeholder="Search events..." 
              />
            </div>
            {/* Actions */}
            <button className="flex items-center gap-2 px-3 py-2 bg-[#192734] border border-[#2c3b47] rounded-lg hover:bg-[#223949] text-sm font-medium transition-colors">
              <Calendar className="w-4 h-4 text-[#90b2cb]" />
              <span>Aug 2023</span>
              <ChevronDown className="w-4 h-4 text-[#90b2cb]" />
            </button>
            <button className="relative p-2 text-[#90b2cb] hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0d93f2] rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
          <div className="max-w-[1600px] mx-auto space-y-6 pb-10">
            
            {/* Row 1: KPI Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard 
                label="Gross Revenue" 
                value={dashboardData.stats.revenue} 
                icon={DollarSign} 
                trend={15} 
                trendLabel="vs last 30 days" 
              />
              <StatsCard 
                label="Tickets Sold" 
                value={dashboardData.stats.ticketsSold} 
                icon={Ticket} 
                progress={78} 
              />
              <StatsCard 
                label="Waitlist Count" 
                value={dashboardData.stats.waitlist} 
                icon={Hourglass} 
                trend={24} 
                trendLabel="new since yesterday" 
              />
              
              {/* Quick Actions Panel */}
              <div className="bg-[#192734] rounded-xl p-5 border border-[#2c3b47] flex flex-col justify-center gap-3 shadow-lg">
                <h4 className="text-white font-bold text-sm flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-[#0d93f2]" /> Quick Actions
                </h4>
                <button className="w-full px-4 py-2.5 rounded-lg bg-[#0d93f2] text-white font-bold text-sm hover:bg-[#0b84db] transition-colors flex justify-between items-center group">
                  Create New Event <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
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

            {/* Row 2: Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
              {/* Hype Chart (Takes up 2/3) */}
              <div className="lg:col-span-2 h-full">
                <HypeChart data={dashboardData.hypeData} />
              </div>
              
              {/* AI Description Generator (Takes up 1/3) */}
              <div className="lg:col-span-1 h-full">
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
                
                <div className="mt-6 pt-4 border-t border-[#2c3b47] flex text-center">
                  <div className="flex-1 border-r border-[#2c3b47]">
                    <p className="text-[#90b2cb] text-xs">Male</p>
                    <p className="text-white font-bold">48%</p>
                  </div>
                  <div className="flex-1 border-r border-[#2c3b47]">
                    <p className="text-[#90b2cb] text-xs">Female</p>
                    <p className="text-white font-bold">45%</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[#90b2cb] text-xs">Other</p>
                    <p className="text-white font-bold">7%</p>
                  </div>
                </div>
              </div>

              {/* Top Locations */}
              <div className="bg-[#192734] rounded-xl border border-[#2c3b47] p-6 flex flex-col shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">Top Locations</h3>
                  <button className="text-xs bg-[#2c3b47] px-2 py-1 rounded text-[#90b2cb] hover:text-white transition-colors">View All</button>
                </div>
                <div className="flex-1 flex gap-4">
                  <div className="relative flex-1 rounded-lg overflow-hidden bg-[#101b22] border border-[#2c3b47]">
                    {/* Simulated Map Background */}
                    <div className="absolute inset-0 opacity-40 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center invert filter brightness-50 contrast-125"></div>
                    
                    {/* Ping Dots (Simulating activity) */}
                    <div className="absolute top-[30%] left-[25%] w-3 h-3 bg-[#0d93f2] rounded-full animate-ping"></div>
                    <div className="absolute top-[30%] left-[25%] w-3 h-3 bg-[#0d93f2] rounded-full"></div>
                    <div className="absolute top-[35%] left-[48%] w-2 h-2 bg-[#3b82f6] rounded-full"></div>
                  </div>
                  
                  <div className="w-40 flex flex-col justify-center gap-4">
                    {dashboardData.locations.map((loc) => (
                      <div key={loc.city} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${loc.color}`}></span>
                          <span className="text-white text-sm">{loc.city}</span>
                        </div>
                        <span className="text-[#90b2cb] text-sm font-medium">{loc.percent}%</span>
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