'use client';

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ShowSection from "@/components/home/show/ShowSection";
import TrendingEvents from "@/components/home/TrendingEvents";
import LocalEvents from "@/components/home/LocalEvents";
import PromoSection from "@/components/home/PromoEvent";
import MainFooter from "@/components/MainFooter";
import { FEATURES } from "@/lib/features";

export default function Home() {
  const [trendingData, setTrendingData] = useState([]);
  const [localData, setLocalData] = useState([]);
  const [localCity, setLocalCity] = useState(null); // the city with the most upcoming shows
  const [isLoading, setIsLoading] = useState(true);
  const [screenEvents, setScreenEvents] = useState([]); // shown on the stage's LED wall
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/events');
        const json = await res.json();

        if (json.success) {
          // Only shows that haven't happened yet (the list is sorted by date, soonest first)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const upcoming = json.events.filter(e => e.date && new Date(e.date) >= today);
          const realEvents = upcoming.map(e => ({
            id: e._id,
            name: e.title,
            genre: e.genre || 'Music',
            date: e.date ? new Date(e.date).getDate().toString() : 'TBA',
            month: e.date ? new Date(e.date).toLocaleString('default', { month: 'short' }).toUpperCase() : '',
            location: e.venue?.name || e.city || 'Unknown Location',
            price: e.ticketTiers?.[0]?.price || 0,
            image: e.images?.hero || e.images?.cover || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800",
            color: 'text-[#ffb000] border-[#a855f7]/20 bg-[#ff6a00]/20', // Default styling
            city: e.city || null,
            title: e.title, // For LocalEvents
            venue: e.venue?.name || 'TBA', // For LocalEvents
            time: e.time || '8:00 PM', // For LocalEvents
            tags: [e.genre || 'Live', 'Music'], // For LocalEvents
            badge: e.status === 'Selling Fast' ? 'Hot' : null // For LocalEvents
          }));

          // The LED wall shows two shows: featured ones first, then the soonest
          const onScreen = [...upcoming.filter(e => e.featured), ...upcoming.filter(e => !e.featured)];
          setScreenEvents(onScreen.slice(0, 2).map(e => ({
            title: e.title,
            city: e.city,
            date: e.date ? new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '',
          })));
          setTrendingData(realEvents.slice(0, 4)); // Top 4
          if (FEATURES.liveSections) {
            // "Coming up in <city>": the city with the most upcoming shows, and its shows (soonest first)
            const perCity = new Map();
            for (const e of realEvents) if (e.city) perCity.set(e.city, (perCity.get(e.city) || 0) + 1);
            const top = [...perCity.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
            const inCity = top ? realEvents.filter(e => e.city === top) : [];
            setLocalCity(inCity.length ? top : null);
            setLocalData((inCity.length ? inCity : realEvents).slice(0, 6));
          } else {
            setLocalData(realEvents.slice(0, 4));
          }
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
    <div className="bg-[#f5f7f8] dark:bg-[#050505] font-sans text-slate-900 dark:text-white antialiased selection:bg-[#ffb000] selection:text-black">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-clip">

        <Navbar isLoggedIn={false} />

        <main className="flex-1 relative pt-0">

          <ShowSection events={screenEvents} />

          <div id="events" className="relative z-10 flex flex-col pt-8 pb-8 bg-[#050505]">

            {}
            <div className="w-full">
              <TrendingEvents events={trendingData} isLoading={isLoading} />
            </div>

            <div className="w-full">
              <LocalEvents events={localData} isLoading={isLoading} city={localCity} live={FEATURES.liveSections} />
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