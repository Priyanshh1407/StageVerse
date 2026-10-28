'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import FanSidebar from '@/components/fan/FanSidebar';
import CreateAlertModal from '@/components/fan/discover/CreateAlertModal';
import AllReleasesModal from '@/components/fan/discover/AllReleaseModal';

import {
  Menu, Search, Music, MapPin, Calendar, SlidersHorizontal,
  Sparkles, Heart, Users, Bell, Plus, ChevronDown, ChevronUp, X
} from 'lucide-react';

export default function DiscoverPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [events, setEvents] = useState([]);
  const [friendEvents, setFriendEvents] = useState([]);
  const [releases, setReleases] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ genres: [], cities: [] });
  const [isLoading, setIsLoading] = useState(false); const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [isReleasesModalOpen, setIsReleasesModalOpen] = useState(false); const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedDate, setSelectedDate] = useState('All');
  const [selectedVibe, setSelectedVibe] = useState('All'); const [expandedSections, setExpandedSections] = useState({
    recommended: false,
    friends: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        if (selectedGenre !== 'All') params.append('genre', selectedGenre);
        if (selectedCity !== 'All') params.append('city', selectedCity);
        if (selectedVibe !== 'All') params.append('vibe', selectedVibe);
        if (selectedDate !== 'All') params.append('date', selectedDate);

        const res = await fetch(`/api/discover?${params.toString()}`);
        const result = await res.json();

        if (result.success) {
          const formattedEvents = result.data.map(e => {
            const d = new Date(e.date);
            return {
              ...e,
              id: e._id,
              date: {
                month: d.toLocaleString('default', { month: 'short' }).toUpperCase(),
                day: d.getDate()
              },
              venue: e.venue?.name || e.venue || "Unknown Venue",
              city: e.venue?.city || e.city || "Unknown City",
              match: "95% match"
            };
          });
          setEvents(formattedEvents);
          // Only update filter options if they are populated (or on first load)
          if (result.facets) {
            setFilterOptions({
              genres: ['All', ...result.facets.genres.filter(Boolean).sort()],
              cities: ['All', ...result.facets.cities.filter(Boolean).sort()]
            });
          }
        }

        const resFriends = await fetch('/api/discover/friends');
        const dataFriends = await resFriends.json();
        if (dataFriends.success) setFriendEvents(dataFriends.data);

        const resRelease = await fetch('/api/discover/release');
        const dataRelease = await resRelease.json();
        if (dataRelease.success) setReleases(dataRelease.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(() => fetchAll(), 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedGenre, selectedCity, selectedDate, selectedVibe])
  const dateOptions = ['All', 'Today', 'This Week', 'This Month', 'OCT', 'NOV', 'DEC'];
  const vibes = ['All', 'Intimate', 'Festival', 'Rave', 'Arena', 'Outdoor'];

  const filteredRecommended = events;

  const filteredFriends = friendEvents.filter(event => event.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredReleases = releases.filter(item =>
    item.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  ); const displayedRecommended = expandedSections.recommended ? filteredRecommended : filteredRecommended.slice(0, 6);
  const displayedFriends = expandedSections.friends ? filteredFriends : filteredFriends.slice(0, 2);
  const displayedReleases = filteredReleases.slice(0, 3);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedGenre('All');
    setSelectedCity('All');
    setSelectedDate('All');
    setSelectedVibe('All');
  };

  return (
    <div className="flex h-screen w-full bg-[#f5f7f8] dark:bg-[#101b22] font-sans text-slate-900 dark:text-white overflow-hidden selection:bg-[#0d93f2]/30">

      <FanSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632]">
          <span className="font-bold text-lg">Concert Passport</span>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-300">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-12 lg:py-10 scroll-smooth">
          <div className="max-w-7xl mx-auto flex flex-col gap-10 pb-10">

            <section className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Discover your next experience</h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg">Personalized recommendations based on your taste.</p>
              </div>

              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0d93f2] outline-none shadow-sm transition-all"
                    placeholder="Search artists, venues, or cities..."
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>}
                </div>

                <div className="flex items-center gap-3 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
                  <FilterDropdown icon={Music} label="Genre" options={filterOptions.genres} value={selectedGenre} onChange={setSelectedGenre} />
                  <FilterDropdown icon={MapPin} label="City" options={filterOptions.cities} value={selectedCity} onChange={setSelectedCity} />
                  <FilterDropdown icon={Calendar} label="Date" options={dateOptions} value={selectedDate} onChange={setSelectedDate} />
                  <button onClick={resetFilters} className="flex items-center gap-2 px-4 py-3 bg-[#0d93f2]/5 border border-[#0d93f2]/30 rounded-xl transition-colors whitespace-nowrap shadow-sm text-sm font-medium text-[#0d93f2] hover:bg-[#0d93f2]/10"><SlidersHorizontal className="w-4 h-4" /> Reset</button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 py-1.5 mr-2">Vibe:</span>
                <VibeTag label="All" active={selectedVibe === 'All'} onClick={() => setSelectedVibe('All')} />
                {vibes.filter(v => v !== 'All').map(vibe => <VibeTag key={vibe} label={vibe} active={selectedVibe === vibe} onClick={() => setSelectedVibe(vibe)} />)}
              </div>
            </section>

            { }
            <section>
              <SectionHeader icon={Sparkles} title="Recommended for You" />
              {filteredRecommended.length > 0 ? (
                <>
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: { staggerChildren: 0.1 }
                      }
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    {displayedRecommended.map(event => (
                      <motion.div key={event.id} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                        <RecommendedCard event={event} />
                      </motion.div>
                    ))}
                  </motion.div>
                  {filteredRecommended.length > 3 && (
                    <div className="flex justify-center mt-6">
                      <button onClick={() => toggleSection('recommended')} className="flex items-center gap-2 text-sm font-bold text-[#0d93f2] hover:bg-[#0d93f2]/10 px-4 py-2 rounded-lg transition-colors">
                        {expandedSections.recommended ? <><ChevronUp className="w-4 h-4" /> Show Less</> : <><ChevronDown className="w-4 h-4" /> View All ({filteredRecommended.length})</>}
                      </button>
                    </div>
                  )}
                </>
              ) : <EmptyState message="No events match your filters." />}
            </section>

            { }
            {filteredFriends.length > 0 && (
              <section>
                <SectionHeader icon={Users} title="Friends Are Going To" />
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
                  }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {displayedFriends.map(event => (
                    <motion.div key={event.id} variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}>
                      <FriendEventCard event={event} />
                    </motion.div>
                  ))}
                </motion.div>
                {filteredFriends.length > 2 && (
                  <div className="flex justify-center mt-6">
                    <button onClick={() => toggleSection('friends')} className="flex items-center gap-2 text-sm font-bold text-[#0d93f2] hover:bg-[#0d93f2]/10 px-4 py-2 rounded-lg transition-colors">
                      {expandedSections.friends ? <><ChevronUp className="w-4 h-4" /> Show Less</> : <><ChevronDown className="w-4 h-4" /> View All ({filteredFriends.length})</>}
                    </button>
                  </div>
                )}
              </section>
            )}

            { }
            {filteredReleases.length > 0 && (
              <section>
                <SectionHeader icon={Bell} title="New Releases & Announcements" />
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
                  }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                  { }
                  {displayedReleases.map(item => (
                    <motion.div key={item.id} variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}>
                      <ReleaseCard item={item} />
                    </motion.div>
                  ))}

                  { }
                  <motion.div
                    variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}
                    onClick={() => setIsReleasesModalOpen(true)}
                    className="group relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer bg-slate-800 border border-slate-700 flex flex-col items-center justify-center hover:bg-slate-700 transition-colors"
                  >
                    <Plus className="w-10 h-10 text-slate-600 mb-2 group-hover:text-slate-400 transition-colors" />
                    <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">View All</span>
                  </motion.div>
                </motion.div>
              </section>
            )}

            { }
            <section className="mt-4 rounded-2xl bg-gradient-to-r from-[#0d93f2] to-blue-600 p-8 md:p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="max-w-xl">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Can&apos;t find what you&apos;re looking for?</h2>
                  <p className="text-blue-100">Set up alerts for your favorite artists and never miss a show again.</p>
                </div>
                <button onClick={() => setIsAlertModalOpen(true)} className="bg-white text-[#0d93f2] hover:bg-blue-50 px-6 py-3 rounded-xl font-bold shadow-lg transition-colors whitespace-nowrap">
                  Create Alert
                </button>
              </div>
            </section>

          </div>
        </div>
      </main >

      { }
      < CreateAlertModal isOpen={isAlertModalOpen} onClose={() => setIsAlertModalOpen(false)
      } />
      < AllReleasesModal isOpen={isReleasesModalOpen} onClose={() => setIsReleasesModalOpen(false)} releases={releases} />

    </div >
  );
}
function FilterDropdown({ icon: Icon, label, options, value, onChange }) {
  return (
    <div className="relative min-w-[140px]">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full appearance-none pl-10 pr-8 py-3 bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0d93f2] cursor-pointer">
        <option value="All">{label}: All</option>
        {options.filter(opt => opt !== 'All').map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><ChevronDown className="w-3 h-3 text-slate-400" /></div>
    </div>
  );
}

function VibeTag({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${active ? 'bg-[#0d93f2] text-white border-[#0d93f2] shadow-md shadow-[#0d93f2]/20' : 'bg-white dark:bg-[#1a2632] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#0d93f2] hover:text-[#0d93f2]'}`}>{label}</button>
  );
}

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white"><Icon className="w-5 h-5 text-[#0d93f2]" />{title}</h2>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-[#1a2632]/50 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
      <Search className="w-10 h-10 text-slate-300 mb-2" /><p className="text-slate-500 font-medium">{message}</p>
      <button onClick={() => window.location.reload()} className="mt-4 text-sm text-[#0d93f2] hover:underline">Clear Filters</button>
    </div>
  );
}

function RecommendedCard({ event }) {
  return (
    <Link href={`/events/${event.id}`} className="group flex flex-col bg-white dark:bg-[#1a2632] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-lg hover:border-[#0d93f2]/50 transition-all duration-300 cursor-pointer">
      <div className="relative h-48 overflow-hidden">
        { }
        <div className="absolute top-3 left-3 bg-white/90 dark:bg-black/80 backdrop-blur text-slate-900 dark:text-white px-3 py-1.5 rounded-lg text-xs font-bold z-10 text-center shadow-sm">
          <span className="block text-red-500 uppercase">{event.date?.month || 'OCT'}</span>
          <span className="text-lg leading-none">{event.date?.day || '24'}</span>
        </div>

        { }
        <div className="absolute top-3 right-3 z-10">
          <button className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur transition-colors">
            <Heart className="w-4 h-4" />
          </button>
        </div>

        { }
        <Image
          src={event.image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745"}
          alt={event.artist || "Event"}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />

        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/80 to-transparent"></div>
        <span className="absolute bottom-3 left-3 px-2 py-1 rounded bg-[#0d93f2]/20 border border-[#0d93f2]/30 backdrop-blur text-[10px] font-bold text-white uppercase tracking-wider">
          {event.match || '95% Match'}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-1 group-hover:text-[#0d93f2] transition-colors">
          {event.title}
        </h3>

        <div className="flex items-center gap-1 text-sm text-slate-500 mb-4">
          <MapPin className="w-3.5 h-3.5" />
          <span>{event.venue}</span>
        </div>

        { }
        <div className="flex flex-wrap gap-2 mb-4">
          {(event.tags || []).map(tag => (
            <span key={tag} className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            From ${event.price}
          </span>
          <span className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold rounded-lg hover:opacity-90 transition-opacity">
            Get Tickets
          </span>
        </div>
      </div>
    </Link>
  );
}

function FriendEventCard({ event }) {
  return (
    <Link href={`/events/${event.id}`} className="flex flex-col md:flex-row bg-white dark:bg-[#1a2632] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer">
      <div className="w-full md:w-48 h-48 md:h-auto relative shrink-0"><Image src={event.image} alt={event.title} fill className="object-cover" /></div>
      <div className="p-5 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-center justify-between mb-2"><span className={`text-xs font-bold uppercase tracking-wide ${event.statusColor || 'text-[#0d93f2]'}`}>{event.status}</span><span className="text-xs text-slate-500">{event.date}</span></div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{event.title}</h3>
          <p className="text-sm text-slate-500 mb-4">{event.venue}</p>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex -space-x-3">{event.attendees.map((person, i) => <div key={i} className={`size-8 rounded-full ring-2 ring-white dark:ring-[#1a2632] flex items-center justify-center overflow-hidden ${person.color || 'bg-gray-300 dark:bg-slate-700'}`}>{person.img ? <Image src={person.img} alt="User" width={32} height={32} className="object-cover h-full w-full" /> : <span className={`text-[10px] font-bold ${person.count ? 'text-white bg-[#0d93f2] w-full h-full flex items-center justify-center' : 'text-slate-600 dark:text-slate-300'}`}>{person.initials || `+${person.count}`}</span>}</div>)}</div>
          <span className="text-sm font-bold text-[#0d93f2] hover:text-[#0d93f2]/80 transition-colors">Join Them</span>
        </div>
      </div>
    </Link>
  );
}

function ReleaseCard({ item }) {
  return (
    <Link href={`/artist/${item.id}`} className="group relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer block">
      <Image src={item.image} alt={item.artist} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4">
        <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold text-white w-fit mb-2 ${item.color}`}>{item.type}</span>
        <h4 className="text-white font-bold leading-tight">{item.artist}</h4>
        <p className="text-slate-300 text-xs mt-1">{item.title}</p>
      </div>
    </Link>
  );
}