'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PredictionModal from '@/components/fan/SetListPredictor';
import ScorecardModal from '@/components/fan/ScoreCardModal';
import {
  LayoutDashboard,
  Compass,
  Ticket,
  Image as ImageIcon,
  Settings,
  LogOut,
  Menu,
  Edit,
  MapPin,
  PlaneTakeoff,
  Calendar,
  ArrowRight,
  Filter,
  Camera,
  PlayCircle,
  Ticket as TicketStub,
  ListMusic,
  GripVertical,
  Plus,
  Trophy,
  Users
} from 'lucide-react';
import MemoryVault from '@/components/fan/MemoryVault';

export default function FanDashboard() {
  // State to control the Setlist Predictor Modal
  const [activeModal, setActiveModal] = useState(null); // 'predict' | 'scorecard' | null
  const [selectedArtist, setSelectedArtist] = useState("");

  const openPredictor = (artist) => {
    setSelectedArtist(artist);
    setActiveModal('predict');
  };

  const openScorecard = (artist) => {
    setSelectedArtist(artist);
    setActiveModal('scorecard');
  };
  return (
    <div className="flex h-screen w-full bg-[#f5f7f8] dark:bg-[#101b22] font-sans text-slate-900 dark:text-white overflow-hidden selection:bg-primary/30">

      {/* --- SIDEBAR --- */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632] p-4 shrink-0 z-20">
        <div className="flex flex-col gap-8 h-full">
          <div className="flex items-center gap-3 px-2">
            <div className="relative h-10 w-10 rounded-full shadow-lg shadow-blue-500/20 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-cyan-400" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold leading-tight tracking-tight">Concert Passport</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-normal">User Dashboard</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            <NavItem href="#" icon={LayoutDashboard} label="Passport" active />
            <NavItem href="#" icon={Compass} label="Discover" />
            <NavItem href="#" icon={Ticket} label="Tickets" />
            <NavItem href="#" icon={ImageIcon} label="Memories" />
            <NavItem href="#" icon={Settings} label="Settings" />
          </nav>

          <div className="mt-auto">
            <Link
              href="#"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <p className="text-sm font-medium">Log Out</p>
            </Link>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632]">
          <span className="font-bold text-lg">Concert Passport</span>
          <button className="p-2 text-slate-600 dark:text-slate-300">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 scroll-smooth">
          <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-10">

            {/* Profile Header */}
            <section className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between bg-white dark:bg-[#1a2632] p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 relative overflow-hidden group">
              <div className="absolute -left-20 -top-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] group-hover:bg-blue-500/20 transition-all duration-700"></div>
              <div className="flex items-center gap-6 relative z-10">
                <div className="relative">
                  <div className="relative h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-white dark:border-[#1a2632] shadow-xl overflow-hidden">
                    <Image src="https://lh3.googleusercontent.com/a/ACg8ocL-f_x_x_x=s96-c" alt="Alex Rocker" fill className="object-cover" />
                  </div>
                  <div className="absolute bottom-1 right-1 bg-green-500 h-4 w-4 border-2 border-white dark:border-[#1a2632] rounded-full" title="Online"></div>
                </div>
                <div className="flex flex-col">
                  <h2 className="text-2xl md:text-3xl font-bold leading-tight tracking-tight">Alex Rocker</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-normal mb-1">Passport ID: #82930</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">LEVEL 5 FAN</span>
                    <span className="text-xs text-slate-400">Member since 2018</span>
                  </div>
                </div>
              </div>
              <button className="relative z-10 flex cursor-pointer items-center gap-2 justify-center rounded-lg px-6 py-3 bg-white dark:bg-[#22303c] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-bold hover:bg-slate-100 dark:hover:bg-[#2a3b4a] transition-colors w-full md:w-auto shadow-sm">
                <Edit className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            </section>

            {/* Stats */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard icon={TicketStub} label="Total Shows Attended" value="42" subtext="Top 15% of users" progress={75} />
              <StatCard icon={MapPin} label="Cities Visited" value="12" extra={<div className="flex items-center gap-2 mt-4 text-blue-500 text-sm font-medium"><PlaneTakeoff className="w-4 h-4" /><span>12,400 km traveled</span></div>} />
              <StatCard icon={Calendar} label="Upcoming Gigs" value="3" valueColor="text-blue-500" extra={<div className="mt-4 p-3 bg-slate-100 dark:bg-[#151f28] rounded-lg border border-slate-200 dark:border-slate-700/50 flex items-center justify-between"><div className="flex flex-col"><span className="text-xs font-bold text-slate-900 dark:text-white">The Strokes</span><span className="text-[10px] text-slate-500">In 5 days</span></div><ArrowRight className="w-4 h-4 text-blue-500" /></div>} />
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 flex flex-col gap-8">
                {/* Top Artists & Venues */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold tracking-tight">TOP ARTISTS SEEN</h3>
                      <a className="text-sm text-blue-500 hover:text-blue-400 font-medium" href="#">View All</a>
                    </div>
                    <div className="flex flex-col bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm h-full">
                      <ArtistRow rank={1} name="Radiohead" genre="Alt-Rock / Electronic" count={5} />
                      <ArtistRow rank={2} name="Tame Impala" genre="Psychedelic Rock" count={3} />
                      <ArtistRow rank={3} name="Khruangbin" genre="Funk / Soul" count={3} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold tracking-tight">MOST VISITED VENUES</h3>
                      <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"><Filter className="w-4 h-4 text-slate-500" /></button>
                    </div>
                    <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm h-full flex flex-col">
                      <div className="h-32 w-full bg-slate-800 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <button className="bg-white dark:bg-[#1a2632] text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 hover:scale-105 transition-transform">
                            <MapPin className="w-3 h-3 text-blue-500" />
                            View Interactive Map
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col">
                        <VenueRow name="Red Rocks Amphitheatre" location="Morrison, CO" visits={6} active />
                        <VenueRow name="Madison Square Garden" location="New York, NY" visits={2} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Memories */}
                <MemoryVault />
              </div>

              {/* RIGHT COLUMN */}
              <div className="flex flex-col gap-6">
                <h3 className="text-xl font-bold tracking-tight px-1 uppercase">Live & Social</h3>

                {/* UPCOMING EVENTS CARD */}
                <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1a2632]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">Upcoming Events</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Events you are attending</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    {/* Event 1: Pre-Show (Triggers Predictor) */}
                    <div className="p-5 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#1e2a35] transition-colors relative group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-blue-500 mb-1">NOV 12 · 8:00 PM</span>
                          <h5 className="font-bold text-slate-900 dark:text-white text-lg">The Strokes</h5>
                          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Barclays Center
                          </p>
                        </div>
                        <div className="text-center bg-slate-100 dark:bg-slate-800 rounded-lg p-2 min-w-[50px]">
                          <span className="block text-xs font-bold text-slate-400 uppercase">Nov</span>
                          <span className="block text-xl font-bold text-slate-900 dark:text-white">12</span>
                        </div>
                      </div>
                      {/* Button opens Predictor Modal */}
                      <div className="flex items-center justify-between bg-[#101b22] p-3 rounded-lg border border-slate-700/50">
                        <div className="text-xs text-slate-400">
                          Status: <span className="text-yellow-400 font-bold">PRE-SHOW</span>
                        </div>
                        <button
                          onClick={() => openPredictor("The Strokes")}
                          className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-bold transition-all hover:scale-105 shadow-lg shadow-blue-500/20"
                        >
                          <ListMusic className="w-4 h-4" />
                          🔮 Predict Setlist
                        </button>
                      </div>
                    </div>

                    {/* Event 2: Post-Show (Triggers Scorecard) */}
                    <div className="p-5 hover:bg-slate-50 dark:hover:bg-[#1e2a35] transition-colors relative group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-500 mb-1">OCT 28 · PAST</span>
                          <h5 className="font-bold text-slate-900 dark:text-white text-lg">Arctic Monkeys</h5>
                          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Madison Square Garden
                          </p>
                        </div>
                        <div className="text-center bg-slate-100 dark:bg-slate-800 rounded-lg p-2 min-w-[50px] opacity-70">
                          <span className="block text-xs font-bold text-slate-400 uppercase">Oct</span>
                          <span className="block text-xl font-bold text-slate-900 dark:text-white">28</span>
                        </div>
                      </div>
                      {/* Button opens Scorecard Modal */}
                      <div className="flex items-center justify-between bg-[#101b22] p-3 rounded-lg border border-slate-700/50">
                        <div className="text-xs text-slate-400">
                          Status: <span className="text-green-400 font-bold">COMPLETED</span>
                        </div>
                        <button
                          onClick={() => openScorecard("Arctic Monkeys")}
                          className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-md text-xs font-bold transition-all hover:scale-105 shadow-lg shadow-green-500/20"
                        >
                          <Trophy className="w-4 h-4" />
                          🏆 View Results (+350 pts)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Friend Activity & I'm Going Section */}
                <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h4 className="font-bold text-lg text-slate-900 dark:text-white">I'm Going</h4>
                    <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded">The Strokes</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    <span className="text-slate-900 dark:text-white font-bold">5 friends</span> are attending this event.
                  </p>
                  <div className="flex -space-x-3 overflow-hidden py-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-[#1a2632] bg-slate-600" />
                    ))}
                    <div className="flex items-center justify-center h-10 w-10 rounded-full ring-2 ring-white dark:ring-[#1a2632] bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-500 dark:text-slate-300">+1</div>
                    <button className="flex items-center justify-center h-10 w-10 rounded-full ring-2 ring-white dark:ring-[#1a2632] bg-blue-500 text-white hover:bg-blue-600 transition-colors ml-4 z-10"><Plus className="w-5 h-5" /></button>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">View Group</button>
                    <button className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Message</button>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-4">
                  <h4 className="font-bold text-sm uppercase text-slate-500 dark:text-slate-400 tracking-wider">Friend Activity</h4>
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-3">
                      <div className="relative"><div className="h-8 w-8 rounded-full bg-slate-600" /><div className="absolute -bottom-1 -right-1 bg-green-500 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#1a2632]"></div></div>
                      <div className="flex flex-col"><p className="text-xs text-slate-300"><span className="font-bold text-white">Sarah M.</span> just bought tickets to <span className="text-blue-500">Neon Trees</span></p><span className="text-[10px] text-slate-500">2 mins ago</span></div>
                    </div>
                    <div className="flex gap-3">
                      <div className="relative"><div className="h-8 w-8 rounded-full bg-slate-600" /></div>
                      <div className="flex flex-col"><p className="text-xs text-slate-300"><span className="font-bold text-white">Mike R.</span> uploaded 5 photos from <span className="text-blue-500">Coachella</span></p><span className="text-[10px] text-slate-500">1 hour ago</span></div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </main>

      {/* --- RENDER MODALS --- */}
      <PredictionModal
        isOpen={activeModal === 'predict'}
        onClose={() => setActiveModal(null)}
        artistName={selectedArtist}
      />

      <ScorecardModal
        isOpen={activeModal === 'scorecard'}
        onClose={() => setActiveModal(null)}
        artistName={selectedArtist}
      />

    </div>
  );
}

// --- SUB-COMPONENTS ---

function NavItem({ href, icon: Icon, label, active }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 scale-[1.02]' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
      <Icon className="w-5 h-5" />
      <p className="text-sm font-medium">{label}</p>
    </Link>
  );
}

function StatCard({ icon: Icon, label, value, valueColor, subtext, progress, extra }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl p-6 bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5"><Icon className="w-24 h-24" /></div>
      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider relative z-10">{label}</p>
      <p className={`text-slate-900 dark:text-white text-4xl font-bold leading-tight relative z-10 ${valueColor || ''}`}>{value}</p>
      {progress && <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-4 relative z-10 overflow-hidden"><div className="bg-blue-500 h-full rounded-full" style={{ width: `${progress}%` }}></div></div>}
      {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
      {extra}
    </div>
  );
}

function ArtistRow({ rank, name, genre, count }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-slate-200 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-[#1e2a35] transition-colors group cursor-pointer last:border-0">
      <div className="font-bold text-slate-300 dark:text-slate-600 w-4 text-center">{rank}</div>
      <div className="bg-slate-700 rounded-lg h-12 w-12 shadow-md"></div>
      <div className="flex-1 min-w-0"><p className="text-slate-900 dark:text-white font-bold truncate">{name}</p><p className="text-xs text-slate-500">{genre}</p></div>
      <div className="shrink-0 flex items-center gap-1"><TicketStub className="w-4 h-4 text-blue-500" /><p className="text-slate-900 dark:text-white font-bold">{count}</p></div>
    </div>
  );
}

function VenueRow({ name, location, visits, active }) {
  return (
    <div className={`flex items-center gap-4 p-4 ${active ? 'border-b border-slate-200 dark:border-slate-800/50' : ''}`}>
      <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-500 dark:text-slate-400"><MapPin className={`w-5 h-5 ${active ? 'text-blue-500' : ''}`} /></div>
      <div className="flex-1"><p className="text-slate-900 dark:text-white font-bold">{name}</p><p className="text-xs text-slate-500">{location}</p></div>
      <span className={`text-sm font-bold px-2 py-1 rounded ${active ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{visits} Visits</span>
    </div>
  );
}

function EventRow({ artist, venue, date, time, friendsCount, onPredictClick }) {
  const [month, day] = date.split(' ');
  return (
    <div className="p-5 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#1e2a35] transition-colors relative group last:border-0">
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-blue-500 mb-1">{date.toUpperCase()} · {time}</span>
          <h5 className="font-bold text-slate-900 dark:text-white text-lg">{artist}</h5>
          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {venue}
          </p>
        </div>
        <div className="text-center bg-slate-100 dark:bg-slate-800 rounded-lg p-2 min-w-[50px]">
          <span className="block text-xs font-bold text-slate-400 uppercase">{month}</span>
          <span className="block text-xl font-bold text-slate-900 dark:text-white">{day}</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="flex -space-x-2">
          <div className="w-6 h-6 rounded-full border-2 border-white dark:border-[#1a2632] bg-slate-600" />
          {friendsCount > 1 && <div className="w-6 h-6 rounded-full border-2 border-white dark:border-[#1a2632] bg-slate-500" />}
          <span className="text-xs text-slate-500 ml-3 self-center">+{friendsCount} friends going</span>
        </div>
        <button
          onClick={onPredictClick}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg text-xs font-bold transition-colors"
        >
          <ListMusic className="w-4 h-4" />
          Predict Setlist
        </button>
      </div>
    </div>
  );
}