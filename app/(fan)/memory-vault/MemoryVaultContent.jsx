'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import FanSidebar from '@/components/fan/FanSidebar';
import UploadMediaModal from '@/components/fan/dashboard/UploadMediaModal';

import { 
  Menu, Plus, Search, Grid, Share2, Info, Play, 
  MapPin, Ticket, ChevronDown, Filter, Loader2, ArrowUp 
} from 'lucide-react';

// --- BASE DATA ---
const BASE_MEMORIES = [
  { 
    id: 1, 
    type: 'video', 
    duration: '4:20 min', 
    title: "Electric Daisy Carnival Finale", 
    location: "Las Vegas, NV", 
    date: "2023-05-20", 
    artist: "Various",
    venue: "Las Vegas Motor Speedway",
    image: "https://images.unsplash.com/photo-1459749411177-3c0714b62437?q=80&w=800&auto=format&fit=crop",
    videoSrc: "https://videos.pexels.com/video-files/2022395/2022395-hd_1920_1080_30fps.mp4",
    featured: true 
  },
  { 
    id: 2, 
    type: 'photo', 
    title: "Tame Impala", 
    subtitle: "The Slow Rush Tour • 2022",
    date: "2022-03-15",
    artist: "Tame Impala",
    venue: "Barclays Center",
    image: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=800&auto=format&fit=crop" 
  },
  { 
    id: 3, 
    type: 'ticket', 
    title: "Coachella 2022", 
    subtitle: "Weekend 1 • VIP Pass",
    date: "2022-04-15",
    venue: "Empire Polo Club"
  },
  { 
    id: 4, 
    type: 'photo', 
    title: "The Killers", 
    subtitle: "Imploding The Mirage • 2022",
    date: "2022-09-30",
    artist: "The Killers",
    venue: "Madison Square Garden",
    image: "https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?q=80&w=800&auto=format&fit=crop" 
  },
  { 
    id: 5, 
    type: 'photo', 
    title: "Adele", 
    subtitle: "Hyde Park • 2022",
    date: "2022-07-01",
    artist: "Adele",
    venue: "Hyde Park",
    image: "https://images.unsplash.com/photo-1516280440614-6697288d5d38?q=80&w=800&auto=format&fit=crop" 
  },
  { 
    id: 6, 
    type: 'album', 
    title: "Radiohead", 
    subtitle: "A Moon Shaped Pool Tour",
    count: 42,
    date: "2018-07-10",
    artist: "Radiohead",
    venue: "Madison Square Garden",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop" 
  },
  { 
    id: 10, 
    type: 'video', 
    duration: '0:15 sec', 
    title: "Guitar Solo Close-up", 
    location: "Denver, CO", 
    date: "2023-11-12", 
    artist: "John Mayer",
    venue: "Ball Arena",
    image: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=800&auto=format&fit=crop",
    videoSrc: "https://videos.pexels.com/video-files/4763826/4763826-uhd_2560_1440_24fps.mp4" 
  }
];

// --- GENERATE LARGE DATASET ---
const ALL_MEMORIES = Array.from({ length: 5 }).flatMap((_, i) => 
  BASE_MEMORIES.map(item => ({
    ...item,
    id: `${item.id}-${i}`,
    title: i > 0 ? `${item.title} (Archived ${i})` : item.title
  }))
);

export default function MemoryVaultPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // --- REFS & SCROLL STATE ---
  const scrollContainerRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // --- FILTER STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtist, setSelectedArtist] = useState('All Artists');
  const [selectedVenue, setSelectedVenue] = useState('All Venues');
  const [selectedYear, setSelectedYear] = useState('Any Date');

  // --- PAGINATION STATE ---
  const ITEMS_PER_PAGE = 8;
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Open Modal from URL
  useEffect(() => {
    if (searchParams.get('action') === 'upload') {
      setIsUploadModalOpen(true);
    }
  }, [searchParams]);

  // --- SCROLL HANDLER ---
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop } = scrollContainerRef.current;
      setShowScrollTop(scrollTop > 400); // Show button after scrolling down 400px
    }
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseModal = () => {
    setIsUploadModalOpen(false);
    router.replace('/memory-vault', { scroll: false });
  };

  // --- FILTER LOGIC ---
  const filteredMemories = ALL_MEMORIES.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArtist = selectedArtist === 'All Artists' || item.artist === selectedArtist;
    const matchesVenue = selectedVenue === 'All Venues' || item.venue === selectedVenue;
    
    const itemYear = new Date(item.date).getFullYear().toString();
    const matchesYear = selectedYear === 'Any Date' || itemYear === selectedYear;

    return matchesSearch && matchesArtist && matchesVenue && matchesYear;
  });

  // --- RESET PAGINATION ON FILTER CHANGE ---
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchQuery, selectedArtist, selectedVenue, selectedYear]);

  const visibleMemories = filteredMemories.slice(0, visibleCount);
  const hasMore = visibleCount < filteredMemories.length;

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => prev + ITEMS_PER_PAGE);
      setIsLoadingMore(false);
    }, 600);
  };

  const artists = ['All Artists', ...new Set(ALL_MEMORIES.map(m => m.artist).filter(Boolean))];
  const venues = ['All Venues', ...new Set(ALL_MEMORIES.map(m => m.venue).filter(Boolean))];
  const years = ['Any Date', ...new Set(ALL_MEMORIES.map(m => new Date(m.date).getFullYear().toString()))];

  return (
    <div className="flex h-screen w-full bg-[#f5f7f8] dark:bg-[#101b22] font-sans text-slate-900 dark:text-white overflow-hidden selection:bg-[#0d93f2]/30 relative">
      
      <FanSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632]">
          <span className="font-bold text-lg">Concert Passport</span>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-300">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* MAIN SCROLL CONTAINER 
            Added ref={scrollContainerRef} and onScroll={handleScroll}
        */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth"
        >
          <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-10">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Your Memory Vault</h2>
                <p className="text-slate-500 dark:text-slate-400 text-base max-w-2xl">
                  Browse and relive your past concert experiences. You've captured <span className="text-[#0d93f2] font-bold">1,204 photos</span> and <span className="text-[#0d93f2] font-bold">86 videos</span> across 42 shows.
                </p>
              </div>
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-[#0d93f2] hover:bg-[#0d93f2]/90 text-white rounded-xl text-sm font-bold shadow-lg shadow-[#0d93f2]/20 transition-all hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" />
                Upload New Memories
              </button>
            </div>

            {/* --- FILTERS --- 
                Removed: sticky top-0 z-30 backdrop-blur-xl bg-opacity-95
            */}
            <div className="bg-white dark:bg-[#1a2632] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
              
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                
                {/* Artist Filter */}
                <div className="relative group min-w-[140px]">
                  <select 
                    className="w-full bg-slate-50 dark:bg-[#151f28] border-none text-slate-900 dark:text-white text-sm font-medium rounded-lg py-2 pl-3 pr-10 focus:ring-2 focus:ring-[#0d93f2] cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1e2a35] transition-colors appearance-none outline-none"
                    value={selectedArtist}
                    onChange={(e) => setSelectedArtist(e.target.value)}
                  >
                    {artists.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 pointer-events-none text-slate-500 w-4 h-4" />
                </div>

                {/* Venue Filter */}
                <div className="relative group min-w-[140px]">
                  <select 
                    className="w-full bg-slate-50 dark:bg-[#151f28] border-none text-slate-900 dark:text-white text-sm font-medium rounded-lg py-2 pl-3 pr-10 focus:ring-2 focus:ring-[#0d93f2] cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1e2a35] transition-colors appearance-none outline-none"
                    value={selectedVenue}
                    onChange={(e) => setSelectedVenue(e.target.value)}
                  >
                    {venues.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 pointer-events-none text-slate-500 w-4 h-4" />
                </div>

                {/* Date Filter */}
                <div className="relative group min-w-[140px]">
                  <select 
                    className="w-full bg-slate-50 dark:bg-[#151f28] border-none text-slate-900 dark:text-white text-sm font-medium rounded-lg py-2 pl-3 pr-10 focus:ring-2 focus:ring-[#0d93f2] cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1e2a35] transition-colors appearance-none outline-none"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 pointer-events-none text-slate-500 w-4 h-4" />
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto border-t md:border-t-0 border-slate-200 dark:border-slate-800 pt-3 md:pt-0">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                  <input 
                    className="w-full bg-slate-50 dark:bg-[#151f28] border-none text-slate-900 dark:text-white text-sm rounded-lg py-2 pl-10 pr-4 placeholder-slate-500 focus:ring-2 focus:ring-[#0d93f2] outline-none" 
                    placeholder="Search memories..." 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="p-2.5 bg-slate-50 dark:bg-[#151f28] hover:bg-slate-100 dark:hover:bg-[#1e2a35] rounded-lg text-slate-600 dark:text-slate-300 transition-colors" title="Grid View">
                  <Grid className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* --- MASONRY GRID --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[280px]">
              
              {/* Static Add Button */}
              <div 
                onClick={() => setIsUploadModalOpen(true)}
                className="group relative rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center p-6 hover:bg-slate-50 dark:hover:bg-[#1e2a35] transition-colors"
              >
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Plus className="text-slate-400 dark:text-slate-500 w-8 h-8" />
                </div>
                <p className="text-slate-900 dark:text-white font-bold text-sm">Add New Memory</p>
                <p className="text-slate-500 text-xs mt-1 text-center">Drag & drop photos or videos here</p>
              </div>

              {visibleMemories.length > 0 ? (
                visibleMemories.map((item) => (
                  <MemoryCard key={item.id} item={item} />
                ))
              ) : (
                <div className="col-span-full text-center py-20 text-slate-500">
                  <p>No memories found. Try adjusting your filters.</p>
                </div>
              )}

            </div>

            {/* --- LOAD MORE BUTTON --- */}
            {hasMore && (
              <div className="flex justify-center mt-6">
                <button 
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-[#1e2a35] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-[#2a3b4a] transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load More Memories
                      <ChevronDown className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* --- SCROLL TO TOP BUTTON --- */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-3 bg-[#0d93f2] text-white rounded-full shadow-lg hover:bg-[#0d93f2]/90 transition-all z-50 animate-in fade-in slide-in-from-bottom-4"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}

      <UploadMediaModal 
        isOpen={isUploadModalOpen} 
        onClose={handleCloseModal} 
      />

    </div>
  );
}

// ==========================================
// 2. MEMORY CARD (Unchanged)
// ==========================================

function MemoryCard({ item }) {
  const overlayClasses = "absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-6";
  const videoRef = useRef(null);

  const handleMouseEnter = () => {
    if (videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => console.log("Auto-play prevented"));
      }
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  if (item.type === 'video') {
    return (
      <div 
        className="group relative rounded-2xl overflow-hidden cursor-pointer sm:col-span-2 sm:row-span-2 shadow-md bg-black"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <video 
          ref={videoRef}
          src={item.videoSrc} 
          poster={item.image}
          muted 
          loop 
          playsInline
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className={overlayClasses}>
          <div className="flex justify-end gap-2">
            <ActionIcon icon={Share2} />
            <ActionIcon icon={Info} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 rounded bg-[#0d93f2] text-white text-xs font-bold uppercase">Video</span>
              <span className="text-slate-200 text-xs font-medium">{item.duration}</span>
            </div>
            <h3 className="text-white font-bold text-2xl leading-tight">{item.title}</h3>
            <p className="text-slate-300 text-sm mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {item.location} • {item.date}
            </p>
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity duration-300">
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full border border-white/30 shadow-2xl">
            <Play className="text-white w-12 h-12 fill-white" />
          </div>
        </div>
      </div>
    );
  }

  // ... Ticket and Photo cards remain exactly the same ...
  if (item.type === 'ticket') {
    return (
      <div className="group relative rounded-2xl overflow-hidden cursor-pointer bg-[#223949] border border-slate-700/50 border-dashed flex flex-col shadow-sm">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative z-10">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:bg-[#0d93f2]/20 group-hover:scale-110 transition-all duration-300">
            <Ticket className="text-slate-400 w-8 h-8 group-hover:text-[#0d93f2] transition-colors" />
          </div>
          <p className="text-slate-400 text-xs font-mono tracking-widest uppercase mb-1">Digital Stub</p>
          <h3 className="text-white font-bold text-xl">{item.title}</h3>
          <p className="text-slate-500 text-sm mt-1">{item.subtitle}</p>
        </div>
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#f5f7f8] dark:bg-[#101b22] rounded-full"></div>
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#f5f7f8] dark:bg-[#101b22] rounded-full"></div>
      </div>
    );
  }

  if (item.type === 'map') {
    return (
      <div className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-sm bg-slate-800">
        <div className="w-full h-full relative">
           <Image src={item.image} alt={item.title} fill className="object-cover opacity-60 transition-transform duration-500 group-hover:scale-110" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          <div className="w-12 h-12 rounded-full bg-[#0d93f2]/20 flex items-center justify-center mb-2">
            <MapPin className="text-[#0d93f2] w-6 h-6" />
          </div>
          <h3 className="text-white font-bold text-lg text-center relative z-10">{item.title}</h3>
          <p className="text-slate-300 text-xs text-center relative z-10">{item.subtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative rounded-2xl overflow-hidden cursor-pointer shadow-sm ${item.type === 'album' ? 'row-span-2' : ''}`}>
      <Image src={item.image} alt={item.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
      <div className={overlayClasses.replace('p-6', 'p-4')}>
        <div className="flex justify-end gap-2 translate-y-[-10px] group-hover:translate-y-0 transition-transform duration-300">
          <ActionIcon icon={Share2} />
        </div>
        <div className="translate-y-[10px] group-hover:translate-y-0 transition-transform duration-300">
          <h3 className="text-white font-bold text-lg">{item.title}</h3>
          <p className="text-slate-300 text-xs">{item.subtitle}</p>
          {item.count && (
            <button className="mt-4 w-full py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-lg text-xs font-bold transition-colors">
              View Full Album ({item.count})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionIcon({ icon: Icon }) {
  return (
    <button className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors">
      <Icon className="w-4 h-4" />
    </button>
  );
}