'use client';

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/MainFooter";
import Hero from "@/components/home/Hero";
import TrendingEvents from "@/components/home/TrendingEvents";
import LocalEvents from "@/components/home/LocalEvents";
import PromoSection from "@/components/home/PromoEvent";
import { Loader2 } from "lucide-react"; // Optional: specific loader icon
import MainFooter from "@/components/MainFooter";

export default function Home() {
  const [trendingData, setTrendingData] = useState([]);
  const [localData, setLocalData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- SIMULATE API CALL ---
  useEffect(() => {
    async function fetchData() {
      // Simulate network latency
      await new Promise(r => setTimeout(r, 1200));

      // 1. Mock Trending Data
      const mockTrending = [
        { id: 1, name: 'The Midnight', genre: 'Synthwave', date: '14', month: 'OCT', location: 'Terminal 5, NYC', price: 45, image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop', color: 'text-[#00d4ff] border-[#00d4ff]/20 bg-[#00d4ff]/20' },
        { id: 2, name: 'Glass Animals', genre: 'Indie Pop', date: '02', month: 'NOV', location: 'The Greek, LA', price: null, image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=800&auto=format&fit=crop', color: 'text-purple-300 border-purple-500/20 bg-purple-500/20' },
        { id: 3, name: 'Tomorrowland', genre: 'EDM', date: '18', month: 'NOV', location: 'Boom, Belgium', price: 120, image: 'https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?q=80&w=800&auto=format&fit=crop', color: 'text-yellow-300 border-yellow-500/20 bg-yellow-500/20' },
        { id: 4, name: 'Warehouse Project', genre: 'Techno', date: '05', month: 'DEC', location: 'Manchester, UK', price: 55, image: 'https://images.unsplash.com/photo-1514525253440-b393332569ca?q=80&w=800&auto=format&fit=crop', color: 'text-red-300 border-red-500/20 bg-red-500/20' },
      ];

      // 2. Mock Local Data
      const mockLocal = [
        { id: 1, title: 'Neon Dreams: 80s Night', venue: 'Brooklyn Steel', time: '10:00 PM', tags: ['Dance', 'Retro', '18+'], price: '$25', image: 'https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=800&auto=format&fit=crop', badge: 'Tonight' },
        { id: 2, title: 'Jazz in the Park', venue: 'Prospect Park', time: 'Tomorrow, 2:00 PM', tags: ['Jazz', 'Outdoor', 'Free'], price: 'Free', image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=800&auto=format&fit=crop', badge: null }
      ];

      setTrendingData(mockTrending);
      setLocalData(mockLocal);
      setIsLoading(false);
    }

    fetchData();
  }, []);

  return (
    <div className="bg-[#f5f7f8] dark:bg-[#050505] font-sans text-slate-900 dark:text-white antialiased selection:bg-[#00d4ff] selection:text-black">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
        
        <Navbar isLoggedIn={false} />

        <main className="flex-1 relative pt-0">
          
          {/* Hero takes full height usually, so no extra padding needed here if Hero is h-screen */}
          <Hero />

          {/* WRAPPER FOR CONTENT SECTIONS:
             - relative z-10: Ensures this sits above any fixed Hero backgrounds if they overlap.
             - space-y-16: Adds consistent vertical gaps (4rem) between sections on mobile.
             - md:space-y-24: Larger gaps (6rem) on desktop for a cleaner look.
             - pb-20: Adds bottom padding so the footer doesn't feel jammed.
          */}
          <div className="relative z-10 flex flex-col space-y-16 md:space-y-24 pb-20 bg-transparent">
            
            {/* Dynamic Sections */}
            <div className="w-full">
               <TrendingEvents events={trendingData} isLoading={isLoading} />
            </div>
            
            <div className="w-full">
               <LocalEvents events={localData} isLoading={isLoading} />
            </div>

            {/* Static Promo */}
            <div className="w-full">
               <PromoSection />
            </div>
            
          </div>
        </main>

        <MainFooter isLoggedIn={false} />
      </div>
    </div>
  );
}