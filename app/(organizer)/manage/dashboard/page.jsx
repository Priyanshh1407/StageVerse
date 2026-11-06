'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign, Ticket, Hourglass, Calendar,
  Search, Bell, ChevronDown, MoreHorizontal,
  Zap, Send, Download, ArrowRight, Menu,
  Sparkles, Wand2, Copy, Check, Rocket, ArrowLeft, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import OrganizerSidebar from '@/components/organizer/OrganizerSidebar';
import HypeChart from '@/components/organizer/HypeChart';
import Link from 'next/link';

function StatsCard({ label, value, icon: Icon, trend, trendLabel, progress }) {
  return (
    <div className="bg-[#192734] rounded-xl p-5 border border-[#2c3b47] shadow-lg hover:border-[#a855f7]/50 transition-colors group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-[#101b22] rounded-lg group-hover:bg-[#ff6a00]/10 transition-colors">
          <Icon className="w-5 h-5 text-[#90b2cb] group-hover:text-[#ff6a00]" />
        </div>
        {typeof trend === 'number' && (
          <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-2xl font-bold text-white">{value}</h3>
        <p className="text-xs text-[#90b2cb] font-medium">{label}</p>
      </div>
      {typeof progress === 'number' && (
        <div className="mt-4">
          <div className="w-full bg-[#101b22] h-2 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label={`${label}: ${progress}% of capacity`}>
            <div className="bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(progress, progress > 0 ? 2 : 0)}%` }}></div>
          </div>
          <p className="mt-2 flex justify-between text-[10px] text-[#90b2cb]"><span>Upcoming shows</span><span className="font-bold text-white">{progress}% of capacity sold</span></p>
        </div>
      )}
      {trendLabel && <p className="text-[10px] text-[#587386] mt-3">{trendLabel}</p>}
    </div>
  );
}

const IS_COMING_SOON = false;

const dashboardData = {
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
    { city: "New York", percent: 42, color: "bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a]" },
    { city: "London", percent: 21, color: "bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a]" },
    { city: "Berlin", percent: 15, color: "bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a]" },
    { city: "Tokyo", percent: 9, color: "bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a]" },
  ]
};

export default function OrganizerDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/organizer/stats').then((r) => r.json()).then((j) => { if (alive && j.success) setStats(j.stats); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const money = (n) => `$${Math.round(n ?? 0).toLocaleString()}`;
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex h-screen w-full bg-[#101b22] text-white font-sans overflow-hidden relative">

      {IS_COMING_SOON && (
        <div className="absolute inset-0 z-[100] bg-[#101b22]/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-500">
          <div className="bg-[#192734] p-8 rounded-2xl border border-[#2c3b47] shadow-2xl max-w-md w-full relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 bg-[#ff6a00]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-[#ff6a00]/20 rounded-full flex items-center justify-center mb-6 text-[#ff6a00]">
                <Rocket className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Dashboard Coming Soon</h2>
              <p className="text-[#90b2cb] mb-8">We are finalizing the command center. Check back shortly.</p>
              <button onClick={() => window.location.reload()} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] hover:brightness-110 text-black font-bold transition-all shadow-lg shadow-[#ff6a00]/20">
                <ArrowLeft className="w-4 h-4" /> Refresh Page
              </button>
            </div>
          </div>
        </div>
      )}

      <OrganizerSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 h-full relative">

        { }
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
                className="w-full pl-10 pr-3 py-2 bg-[#192734] border border-[#2c3b47] rounded-lg text-sm text-white placeholder-[#90b2cb] focus:outline-none focus:border-[#a855f7]"
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
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] rounded-full"></span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-[1600px] mx-auto space-y-6 pb-10"
          >

            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard label="Gross Revenue" value={stats ? money(stats.revenue) : '…'} icon={DollarSign} trend={stats?.revenueTrend} trendLabel="last 30 days vs the 30 before" />
              <StatsCard label="Tickets Sold" value={stats ? stats.ticketsSold.toLocaleString() : '…'} icon={Ticket} trend={stats?.ticketsTrend} progress={stats ? stats.capacityPercent : undefined} />
              <StatsCard label="Upcoming Shows" value={stats ? stats.upcomingShows : '…'} icon={Hourglass} trendLabel={stats?.nextShow ? `Next: ${stats.nextShow.title}, ${new Date(stats.nextShow.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'No upcoming shows'} />

              <div className="bg-[#192734] rounded-xl p-5 border border-[#2c3b47] flex flex-col justify-center gap-3 shadow-lg">
                <h4 className="text-white font-bold text-sm flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-[#ff6a00]" /> Quick Actions
                </h4>
                <Link href="/create-event" className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] text-black font-bold text-sm hover:brightness-110 transition-colors flex justify-between items-center group">
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
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[450px]">

              <div className="lg:col-span-2 h-[300px] lg:h-full">
                <HypeChart data={dashboardData.hypeData} />
              </div>

              <div className="lg:col-span-1 h-[450px] lg:h-full">
                <AIDescriptionGenerator />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <div className="bg-[#192734] rounded-xl border border-[#2c3b47] p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">Attendee Profile</h3>
                  <button className="text-[#90b2cb] hover:text-white"><MoreHorizontal className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "18 - 24", val: 45, color: "bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a]" },
                    { label: "25 - 34", val: 32, color: "bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a]" },
                    { label: "35 - 44", val: 15, color: "bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a]" },
                    { label: "45+", val: 8, color: "bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a]" },
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

              { }
              <div className="bg-[#192734] rounded-xl border border-[#2c3b47] p-6 flex flex-col shadow-sm h-[350px]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">Top Locations</h3>
                  <button className="text-xs bg-[#2c3b47] px-2 py-1 rounded text-[#90b2cb] hover:text-white transition-colors">View All</button>
                </div>
                <div className="flex-1 flex gap-4">
                  <div className="relative flex-1 rounded-lg overflow-hidden bg-[#101b22] border border-[#2c3b47]">
                    <div className="absolute inset-0 opacity-40 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center invert filter brightness-50 contrast-125"></div>
                    <div className="absolute top-[30%] left-[25%] w-3 h-3 bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] rounded-full animate-ping"></div>
                    <div className="absolute top-[30%] left-[25%] w-3 h-3 bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] rounded-full"></div>
                    <div className="absolute top-[35%] left-[48%] w-2 h-2 bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] rounded-full"></div>
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

            </motion.div>
          </motion.div>
        </div>
      </main >
    </div>
  );
}

function AIDescriptionGenerator() {
  const [prompt, setPrompt] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setGeneratedText(""); // Clear previous

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'insight', prompt })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate");
      }

      setGeneratedText(data.result);
      toast.success("Insight generated!");

    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="bg-[#192734] rounded-xl border border-[#2c3b47] p-6 flex flex-col h-full relative overflow-hidden group">
      { }
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 text-white font-bold">
          <Sparkles className="w-5 h-5 text-pink-500/90" />
          <h3>AI Analysis Assistant</h3>
        </div>
        <div className="text-xs text-[#90b2cb] bg-[#101b22] px-2 py-1 rounded border border-[#2c3b47]">Beta</div>
      </div>

      { }
      <div className="flex-1 flex flex-col gap-4 min-h-0 mb-4">

        { }
        <div className={`flex flex-col ${generatedText ? 'h-1/3' : 'h-full'} transition-all duration-300`}>
          <label className="text-xs text-[#90b2cb] mb-2 uppercase font-semibold">Event Keywords / Context</label>
          <textarea
            className="w-full h-full bg-[#101b22] border border-[#2c3b47] rounded-lg p-3 text-sm text-white placeholder-[#90b2cb] focus:outline-none focus:border-pink-500/90 resize-none"
            placeholder="e.g., Techno rave, Warehouse vibes, Late night queues..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        { }
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

      { }
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