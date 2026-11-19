'use client';

import React, { useState, useEffect } from 'react';
import {
  Hourglass, Mic2, Wrench, MapPin,
  Zap, ArrowRight, Menu,
  Sparkles, Wand2, Copy, Check, Rocket, ArrowLeft, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import OrganizerSidebar from '@/components/organizer/OrganizerSidebar';
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
        <p className="text-sm text-[#90b2cb] font-medium">{label}</p>
      </div>
      {typeof progress === 'number' && (
        <div className="mt-4">
          <div className="w-full bg-[#101b22] h-2 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label={`${label}: ${progress}% of capacity`}>
            <div className="bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(progress, progress > 0 ? 2 : 0)}%` }}></div>
          </div>
          <p className="mt-2 flex justify-between text-xs text-[#90b2cb]"><span>Upcoming shows</span><span className="font-bold text-white">{progress}% of capacity sold</span></p>
        </div>
      )}
      {trendLabel && <p className="text-xs text-[#90b2cb] mt-3">{trendLabel}</p>}
    </div>
  );
}

const IS_COMING_SOON = false;

export default function OrganizerDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/organizer/stats').then((r) => r.json()).then((j) => { if (alive && j.success) setStats(j.stats); }).catch(() => {});
    return () => { alive = false; };
  }, []);
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
              className="md:hidden p-2 text-[#90b2cb] hover:text-white hover:bg-[#2c3b47] rounded-lg transition-colors min-h-11 min-w-11"
             aria-label="Open the menu" title="Open the menu">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">Dashboard</h1>
              <p className="text-[#90b2cb] text-sm hidden sm:block">Your shows at a glance</p>
            </div>
          </div>

          <Link href="/create-event" className="hidden sm:flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] px-4 text-sm font-bold text-black hover:brightness-110">
            Create event <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-[1600px] mx-auto space-y-6 pb-10"
          >

            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard label="Upcoming shows" value={stats ? stats.upcomingShows : '…'} icon={Hourglass} trendLabel={stats?.nextShow ? `Next: ${stats.nextShow.title}, ${new Date(stats.nextShow.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'No upcoming shows yet'} />
              <StatsCard label="Artists booked" value={stats ? stats.artistsBooked : '…'} icon={Mic2} trendLabel="Across your upcoming shows" />
              <StatsCard label="Shows with a crew" value={stats ? `${stats.crewAssigned} of ${stats.upcomingShows}` : '…'} icon={Wrench} trendLabel="Upcoming shows with production assigned" />
              <div className="bg-[#192734] rounded-xl p-5 border border-[#2c3b47] flex flex-col justify-center gap-3 shadow-lg">
                <h2 className="text-white font-bold text-sm flex items-center gap-2 mb-1"><Zap className="w-4 h-4 text-[#ff6a00]" aria-hidden /> Quick actions</h2>
                <Link href="/create-event" className="w-full min-h-11 px-4 rounded-lg bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] text-black font-bold text-sm hover:brightness-110 transition-colors flex justify-between items-center group">
                  Create a new event <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden />
                </Link>
                <Link href="/events" className="w-full min-h-11 px-4 rounded-lg bg-[#2c3b47] hover:bg-[#3e5060] text-sm font-semibold text-white flex justify-between items-center">
                  See all your events <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[450px]">

              <div className="lg:col-span-2 h-[300px] lg:h-full">
                <NextShows shows={stats?.nextShows} />
              </div>

              <div className="lg:col-span-1 h-[450px] lg:h-full">
                <AIDescriptionGenerator />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="bg-[#192734] rounded-xl border border-[#2c3b47] p-6 shadow-sm">
                <h2 className="text-lg font-bold text-white mb-4">Your shows by city</h2>
                {!stats ? <p className="text-sm text-[#90b2cb]">Loading…</p> : stats.byCity?.length ? (
                  <ul className="space-y-3">
                    {stats.byCity.map(({ city, shows }) => (
                      <li key={city}>
                        <div className="flex justify-between text-sm mb-1"><span className="text-white">{city}</span><span className="text-[#90b2cb]">{shows} show{shows > 1 ? 's' : ''}</span></div>
                        <div className="w-full bg-[#101b22] h-2 rounded-full overflow-hidden"><div className="bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] h-full rounded-full" style={{ width: `${Math.round((shows / Math.max(...stats.byCity.map((c) => c.shows))) * 100)}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-[#90b2cb]">No upcoming shows yet. <Link href="/create-event" className="font-semibold text-[#ffb000] hover:underline">Create one</Link>.</p>}
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
          <h2>Ask the AI about your event</h2>
        </div>
        <div className="text-xs text-[#90b2cb] bg-[#101b22] px-2 py-1 rounded border border-[#2c3b47]">Beta</div>
      </div>

      { }
      <div className="flex-1 flex flex-col gap-4 min-h-0 mb-4">

        { }
        <div className={`flex flex-col ${generatedText ? 'h-1/3' : 'h-full'} transition-all duration-300`}>
          <label htmlFor="ai-insight-prompt" className="text-sm text-[#90b2cb] mb-2 font-semibold">Describe your event in a few words</label>
          <textarea
            id="ai-insight-prompt"
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
              <p className="text-sm text-pink-400 font-semibold">What the AI suggests</p>
              <button
                onClick={handleCopy}
                className="text-xs text-[#90b2cb] hover:text-white flex items-center gap-1 transition-colors min-h-11 min-w-11"
               aria-label="Done" title="Done">
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
         min-h-11 min-w-11`}
       aria-label="Ask the AI" title="Ask the AI">
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <><Wand2 className="w-4 h-4" aria-hidden /> Analyse</>
        )}
      </button>
    </div>
  );
}

/** The organizer's next shows: date, title, city, artist, and whether a crew is on it. */
function NextShows({ shows }) {
  return (
    <div className="bg-[#192734] rounded-xl border border-[#2c3b47] p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Your next shows</h2>
        <Link href="/events" className="flex min-h-11 items-center gap-1 text-sm font-semibold text-[#ffb000] hover:underline">All events <ArrowRight className="w-4 h-4" aria-hidden /></Link>
      </div>
      {!shows ? <p className="text-sm text-[#90b2cb]">Loading…</p> : shows.length === 0 ? (
        <p className="text-sm text-[#90b2cb]">No upcoming shows yet. <Link href="/create-event" className="font-semibold text-[#ffb000] hover:underline">Create your first event</Link>.</p>
      ) : (
        <ul className="divide-y divide-[#2c3b47] overflow-y-auto">
          {shows.map((show) => (
            <li key={show.id}>
              <Link href={`/events/${show.id}`} className="flex items-center gap-4 py-3 hover:bg-[#223949]/50 rounded-lg px-2">
                <div className="w-12 shrink-0 text-center">
                  <div className="text-xs font-bold uppercase text-[#ffb000]">{new Date(show.date).toLocaleDateString('en-GB', { month: 'short' })}</div>
                  <div className="text-xl font-bold text-white leading-none">{new Date(show.date).getDate()}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{show.title}</p>
                  <p className="truncate text-sm text-[#90b2cb]"><MapPin className="inline w-3.5 h-3.5 -mt-0.5" aria-hidden /> {show.city}{show.artist ? ` · ${show.artist}` : ''}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${show.crew ? 'bg-green-400/10 text-green-300' : 'bg-yellow-400/10 text-yellow-200'}`}>{show.crew ? 'Crew assigned' : 'No crew yet'}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
