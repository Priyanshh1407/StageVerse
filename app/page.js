'use client';

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ShowSection from "@/components/home/show/ShowSection";
import TrendingEvents from "@/components/home/TrendingEvents";
import LocalEvents from "@/components/home/LocalEvents";
import PromoSection from "@/components/home/PromoEvent";
import MainFooter from "@/components/MainFooter";

export default function Home() {
  const [trendingData, setTrendingData] = useState([]);
  const [localData, setLocalData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [screenEvents, setScreenEvents] = useState([]); // shown on the stage's LED wall
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/events');
        const json = await res.json();

        if (json.success) {
          const realEvents = json.events.map(e => ({
            id: e._id,
            name: e.title,
            genre: e.genre || 'Music',
            date: e.date ? new Date(e.date).getDate().toString() : 'TBA',
            month: e.date ? new Date(e.date).toLocaleString('default', { month: 'short' }).toUpperCase() : '',
            location: e.venue?.name || e.city || 'Unknown Location',
            price: e.ticketTiers?.[0]?.price || 0,
            image: e.images?.hero || e.images?.cover || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800",
            color: 'text-[#00d4ff] border-[#00d4ff]/20 bg-[#00d4ff]/20', // Default styling
            title: e.title, // For LocalEvents
            venue: e.venue?.name || 'TBA', // For LocalEvents
            time: e.time || '8:00 PM', // For LocalEvents
            tags: [e.genre || 'Live', 'Music'], // For LocalEvents
            badge: e.status === 'Selling Fast' ? 'Hot' : null // For LocalEvents
          }));

          setScreenEvents(json.events.slice(0, 2).map(e => ({
            title: e.title,
            city: e.city,
            date: e.date ? new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '',
          })));
          setTrendingData(realEvents.slice(0, 4)); // Top 4
          setLocalData(realEvents.slice(0, 4)); // Same for now, or shuffle
        }
      } catch (err) {
        console.error("Failed to fetch home events", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="bg-[#f5f7f8] dark:bg-[#050505] font-sans text-slate-900 dark:text-white antialiased selection:bg-[#00d4ff] selection:text-black">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-clip">

        <Navbar isLoggedIn={false} />

        <main className="flex-1 relative pt-0">

          <ShowSection events={screenEvents} />

          <div id="events" className="relative z-10 flex flex-col space-y-16 md:space-y-24 pt-16 pb-20 bg-transparent">

            {}
            <div className="w-full">
              <TrendingEvents events={trendingData} isLoading={isLoading} />
            </div>

            <div className="w-full">
              <LocalEvents events={localData} isLoading={isLoading} />
            </div>

            {}
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