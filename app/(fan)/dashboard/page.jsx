'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// --- IMPORTS ---
import FanSidebar from '@/components/fan/FanSidebar';
import TopArtistsModal from '@/components/fan/dashboard/TopArtistModal';
import TopFriendsModal from '@/components/fan/dashboard/TopFriendsModal';
import EditProfileModal from '@/components/fan/EditProfileModal';
import UploadMediaModal from '@/components/fan/dashboard/UploadMediaModal';
import PredictionModal from '@/components/fan/dashboard/SetListPredictor';
import ScorecardModal from '@/components/fan/dashboard/ScoreCardModal';
import NotificationsModal from '@/components/fan/dashboard/NotificationsModal';
import LivePollCard from '@/components/fan/dashboard/LivePollCard';

// --- ICONS ---
import {
  Menu, Edit, MapPin, PlaneTakeoff, Ticket as TicketStub, Plus, Image as ImageIcon, ArrowRight, Filter, Loader2, Instagram, ListMusic
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FanDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- MODAL STATES ---
  const [isPredictorOpen, setIsPredictorOpen] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTopFriendsOpen, setIsTopFriendsOpen] = useState(false);
  const [isTopArtistsOpen, setIsTopArtistsOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // --- FETCH DATA FROM API ---
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/fan-dashboard');
        const json = await res.json();

        if (json.success) {
          setData(json.data);
        } else {
          console.error("Failed to load dashboard data");
        }
      } catch (error) {
        console.error("Error fetching dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [isUploadModalOpen, isEditProfileOpen]); // Re-fetch if upload or edit happens

  const handleUpdateProfile = (updatedUser) => {
    // Optimistic update or trigger refetch
    setIsEditProfileOpen(false);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#f5f7f8] dark:bg-[#101b22]">
        <Loader2 className="w-10 h-10 text-[#0d93f2] animate-spin" />
      </div>
    );
  }

  if (!data) return <div className="p-10 text-white">Error loading data. Please refresh.</div>;

  const { activeEvent, activeEventSongs, activeEventPrediction, activeEventSetlist, upcomingEvents } = data;

  return (
    <div className="flex h-screen w-full bg-[#f5f7f8] dark:bg-[#101b22] font-sans text-slate-900 dark:text-white overflow-hidden selection:bg-[#0d93f2]/30">

      <FanSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632]">
          <span className="font-bold text-lg">Concert Passport</span>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-300">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 scroll-smooth">
          <div className="max-w-6xl mx-auto flex flex-col gap-8 pb-10">

            {/* Profile Header */}
            <section className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between bg-white dark:bg-[#1a2632] p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 relative overflow-hidden group">
              <div className="absolute -left-20 -top-20 w-64 h-64 bg-[#0d93f2]/10 rounded-full blur-[80px] group-hover:bg-[#0d93f2]/20 transition-all duration-700"></div>
              <div className="flex items-center gap-6 relative z-10">
                <div className="relative">
                  <div className="relative h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-white dark:border-[#1a2632] shadow-xl overflow-hidden bg-gray-700">
                    <Image src={data.user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde"} alt="User" fill className="object-cover" />
                  </div>
                  <div className="absolute bottom-1 right-1 bg-green-500 h-4 w-4 border-2 border-white dark:border-[#1a2632] rounded-full"></div>
                </div>
                <div className="flex flex-col">
                  <h2 className="text-2xl md:text-3xl font-bold leading-tight tracking-tight">{data.user.name}</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-normal mb-1">Passport ID: {data.user.id}</p>

                  <div className="flex flex-wrap items-center gap-4 mb-2">
                    {data.user.location && (
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="w-3 h-3" /> {data.user.location}
                      </div>
                    )}
                    {data.user.socials?.instagram && (
                      <div className="flex items-center gap-1 text-xs text-[#0d93f2]">
                        <Instagram className="w-3 h-3" /> @{data.user.socials.instagram}
                      </div>
                    )}
                  </div>

                  {data.user.bio && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 italic mb-3 max-w-md">"{data.user.bio}"</p>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#0d93f2]/10 text-[#0d93f2] border border-[#0d93f2]/20">LEVEL {data.user.level} FAN</span>
                    <span className="text-xs text-slate-400">Member since {data.user.memberSince}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsEditProfileOpen(true)} className="relative z-10 flex cursor-pointer items-center gap-2 justify-center rounded-lg px-6 py-3 bg-white dark:bg-[#22303c] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-bold hover:bg-slate-100 dark:hover:bg-[#2a3b4a] transition-colors w-full md:w-auto shadow-sm">
                <Edit className="w-4 h-4" /> <span>Edit Profile</span>
              </button>
            </section>

            {/* --- GRID: STATS & PREDICTOR --- */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              <StatCard icon={TicketStub} label="Total Shows" value={data.stats.showsAttended.value} subtext={data.stats.showsAttended.subtext} progress={data.stats.showsAttended.progress} />

              <StatCard icon={MapPin} label="Cities Visited" value={data.stats.citiesVisited.value} extra={<div className="flex items-center gap-2 mt-4 text-[#0d93f2] text-sm font-medium"><PlaneTakeoff className="w-4 h-4" /><span>{data.stats.citiesVisited.value} cities</span></div>} />

              {/* --- DYNAMIC CARD: SETLIST PREDICTOR --- */}
              {activeEvent ? (
                <div className="flex flex-col gap-1 rounded-xl p-6 bg-gradient-to-br from-[#101b22] to-[#1a2632] border border-[#0d93f2]/30 shadow-lg relative overflow-hidden group cursor-pointer" onClick={() => setIsPredictorOpen(true)}>
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <ListMusic className="w-24 h-24 text-[#0d93f2]" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 rounded bg-[#0d93f2] text-white text-[10px] font-bold uppercase tracking-wider animate-pulse">Live Challenge</span>
                    </div>
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Predict Setlist</p>
                    <h3 className="text-white text-2xl font-bold leading-tight mt-1 truncate">{activeEvent.artist}</h3>
                    <p className="text-slate-400 text-xs mt-1 truncate">Next: {activeEvent.venue}</p>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsPredictorOpen(true); }}
                        className="px-4 py-2 bg-[#0d93f2] hover:bg-[#0b84db] text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-[#0d93f2]/20"
                      >
                        {activeEventPrediction ? (activeEventPrediction.status === 'graded' ? 'View Results' : 'Edit Prediction') : 'Play'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Fallback Card when no active event
                <div className="flex flex-col gap-1 rounded-xl p-6 bg-[#1a2632] border border-slate-800 shadow-sm relative overflow-hidden opacity-75">
                  <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Predict Setlist</p>
                  <h3 className="text-slate-200 text-xl font-bold leading-tight mt-1">No Upcoming Shows</h3>
                  <p className="text-slate-500 text-xs mt-1">Buy a ticket to play!</p>
                </div>
              )}

              {/* Top Friends Card */}
              <div className="flex flex-col gap-1 rounded-xl p-6 bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider relative z-10">Top Friends</p>
                <div className="flex items-center justify-between gap-4 mt-2">
                  <div className="flex items-center -space-x-3">
                    {data.topFriends.slice(0, 3).map((friend, i) => (
                      <div key={i} className="relative h-10 w-10 rounded-full border-2 border-white dark:border-[#1a2632] overflow-hidden">
                        <Image src={friend.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde"} alt={friend.name} fill className="object-cover" />
                      </div>
                    ))}
                    {data.topFriends.length > 3 && (
                      <div className="h-10 w-10 rounded-full border-2 border-white dark:border-[#1a2632] bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">+{data.topFriends.length - 3}</div>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[#0d93f2] font-bold text-2xl">{data.topFriends.length}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide">Following</span>
                  </div>
                </div>
                <div className="mt-4 p-2 bg-slate-100 dark:bg-[#151f28] rounded-lg border border-slate-200 dark:border-slate-700/50">
                  <button onClick={() => setIsTopFriendsOpen(true)} className="text-xs text-[#0d93f2] hover:underline flex items-center gap-1 font-medium w-full justify-center">
                    View All Friends <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

            </section>

            {/* Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold tracking-tight">TOP ARTISTS SEEN</h3>
                  <Button onClick={() => setIsTopArtistsOpen(true)} className="text-sm bg-transparent text-[#0d93f2] hover:bg-transparent hover:text-white font-medium">View All</Button>
                </div>
                <div className="flex flex-col bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  {data.topArtists.length > 0 ? (
                    data.topArtists.map((artist) => (<ArtistRow key={artist.rank} {...artist} />))
                  ) : (
                    <div className="p-6 text-center text-slate-500">No shows attended yet.</div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold tracking-tight">MOST VISITED VENUES</h3>
                  <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"><Filter className="w-4 h-4 text-slate-500" /></button>
                </div>
                <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm h-full flex flex-col">
                  <div className="h-32 w-full bg-slate-800 relative bg-cover bg-center" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1514525253440-b393332569ca?q=80&w=800&auto=format&fit=crop")' }}>
                    <div className="absolute inset-0 bg-[#0d93f2]/20 backdrop-brightness-50"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button className="bg-white dark:bg-[#1a2632] text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 hover:scale-105 transition-transform"><MapPin className="w-3 h-3 text-[#0d93f2]" />View Interactive Map</button>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col">
                    {data.topVenues.length > 0 ? (
                      data.topVenues.map((venue, i) => (<VenueRow key={i} {...venue} />))
                    ) : (
                      <div className="p-6 text-center text-slate-500">Go to events to see venues here.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Memory Vault - UPDATED WITH FIXES */}
            <section className="flex flex-col gap-6 pt-4">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div><h3 className="text-2xl font-bold tracking-tight uppercase flex items-center gap-2"><ImageIcon className="w-6 h-6 text-[#0d93f2]" />Memory Vault</h3><p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Your curated collection of moments.</p></div>
                <button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0d93f2] hover:bg-[#0d93f2]/90 text-white rounded-lg text-sm font-bold transition-colors"><Plus className="w-4 h-4" />Upload Media</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
                {data.memories.length > 0 ? data.memories.slice(0, 5).map((memory) => {
                  // FIX 1: Ensure fallback is used
                  const safeImage = memory.image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745";

                  // FIX 2: Detect video types
                  const isVideo = safeImage.includes(".mp4") || memory.type === 'video';

                  // Helper to render correct media type
                  const MediaContent = () => {
                    if (isVideo) {
                      return (
                        <video
                          src={safeImage}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          autoPlay muted loop playsInline
                        />
                      );
                    }
                    return (
                      <Image
                        src={safeImage}
                        alt={memory.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    );
                  };

                  if (memory.featured) {
                    return (
                      <div key={memory.id} className="group relative rounded-xl overflow-hidden cursor-pointer md:col-span-2 md:row-span-2">
                        <MediaContent />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                          <p className="text-white font-bold text-lg">{memory.title}</p>
                          <p className="text-[#0d93f2] text-sm font-medium">{memory.date}</p>
                        </div>
                      </div>
                    );
                  }

                  if (memory.type === "ticket") {
                    return (
                      <div key={memory.id} className="group relative rounded-xl overflow-hidden cursor-pointer bg-[#223949] flex flex-col items-center justify-center p-4 border border-slate-700 border-dashed hover:border-[#0d93f2] transition-colors">
                        <TicketStub className="text-slate-500 w-10 h-10 mb-2 group-hover:text-[#0d93f2] transition-colors" />
                        <p className="text-slate-300 text-center text-sm font-mono uppercase">TICKET STUB</p>
                        <p className="text-white font-bold text-center mt-1">{memory.title}</p>
                      </div>
                    );
                  }

                  // Standard Memory Item
                  return (
                    <div key={memory.id} className="group relative rounded-xl overflow-hidden cursor-pointer">
                      <MediaContent />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                        <p className="text-white font-bold text-xs">{memory.title}</p>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="col-span-full py-10 text-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">No memories yet. Upload one!</div>
                )}
              </div>
              <div className="flex justify-center mt-2"><Link href="/memory-vault" className="text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-[#0d93f2] transition-colors flex items-center gap-1">Enter Memory Vault<ArrowRight className="w-4 h-4" /></Link></div>
            </section>

          </div>
        </div>
      </main>

      {/* --- RENDER ALL MODALS --- */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentUser={data?.user}
        onSave={handleUpdateProfile}
      />

      <TopArtistsModal
        isOpen={isTopArtistsOpen}
        onClose={() => setIsTopArtistsOpen(false)}
        artists={data?.allArtists}
      />

      <TopFriendsModal
        isOpen={isTopFriendsOpen}
        onClose={() => setIsTopFriendsOpen(false)}
        friends={data?.topFriends}
      />

      <UploadMediaModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* --- PREDICTION MODALS --- */}
      {isPredictorOpen && activeEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsPredictorOpen(false)} />
          <div className="relative z-10 w-full max-w-5xl">
            <PredictionModal
              initialEventId={activeEvent._id}
              events={upcomingEvents}
            />
            {/* Close Button Override or ensure Modal handles closing via prop if refactored. 
                     Wait, SetListPredictor doesn't have an typical 'isOpen' prop anymore, it just renders.
                     So wrapping it here in a conditional render is correct.
                     However, I need to pass a way to CLOSE it. 
                     I checked SetListPredictor, it doesn't seem to have an explicit 'onClose' in my last refactor?
                     Let me check SetListPredictor again.
                 */}
            <button onClick={() => setIsPredictorOpen(false)} className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full hover:bg-red-500/50 z-50 transition-colors">
              <span className="sr-only">Close</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
      )}

      {/* --- LIVE POLL OVERLAY (Always Mounted to Listen) --- */}
      <LivePollCard eventId={activeEvent?._id} onComplete={() => console.log("Poll Ended")} />

    </div>
  );
}

// --- SUB COMPONENTS ---

function StatCard({ icon: Icon, label, value, valueColor, subtext, progress, extra }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl p-6 bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5"><Icon className="w-24 h-24" /></div>
      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider relative z-10">{label}</p>
      <p className={`text-slate-900 dark:text-white text-4xl font-bold leading-tight relative z-10 ${valueColor || ''}`}>{value}</p>
      {progress !== undefined && <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-4 relative z-10 overflow-hidden"><div className="bg-[#0d93f2] h-full rounded-full" style={{ width: `${progress}%` }}></div></div>}
      {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
      {extra}
    </div>
  );
}

function ArtistRow({ rank, name, genre, count, image }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-slate-200 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-[#1e2a35] transition-colors group cursor-pointer last:border-0">
      <div className="font-bold text-slate-300 dark:text-slate-600 w-4 text-center">{rank}</div>
      <div className="relative h-12 w-12 rounded-lg shadow-md overflow-hidden bg-slate-700">
        <Image src={image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745"} alt={name} fill className="object-cover" />
      </div>
      <div className="flex-1 min-w-0"><p className="text-slate-900 dark:text-white font-bold truncate">{name}</p><p className="text-xs text-slate-500">{genre}</p></div>
      <div className="shrink-0 flex items-center gap-1"><TicketStub className="w-4 h-4 text-[#0d93f2]" /><p className="text-slate-900 dark:text-white font-bold">{count}</p></div>
    </div>
  );
}

function VenueRow({ name, location, visits, active }) {
  return (
    <div className={`flex items-center gap-4 p-4 ${active ? 'border-b border-slate-200 dark:border-slate-800/50' : ''}`}>
      <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-500 dark:text-slate-400"><MapPin className={`w-5 h-5 ${active ? 'text-[#0d93f2]' : ''}`} /></div>
      <div className="flex-1"><p className="text-slate-900 dark:text-white font-bold">{name}</p><p className="text-xs text-slate-500">{location}</p></div>
      <span className={`text-sm font-bold px-2 py-1 rounded ${active ? 'bg-[#0d93f2]/10 text-[#0d93f2]' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{visits} Visits</span>
    </div>
  );
}