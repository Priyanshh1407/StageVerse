'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Calendar, MapPin, ChevronRight, Clock, Star, ArrowRight } from 'lucide-react';
import ArtistNavbar from '@/components/artist/ArtistNavbar';

export default function DaySheetListPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch('/api/artist/day-sheet');
        const json = await res.json();
        if (json.success) {
          setEvents(json.data);
        }
      } catch (e) {
        console.error("Failed to load events", e);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b1219] font-sans text-white selection:bg-[#0d93f2]/30">
      <ArtistNavbar />

      <main className="w-full max-w-7xl mx-auto px-4 lg:px-10 py-12">

        {/* HERO SECTION */}
        <div className="relative mb-16 rounded-3xl overflow-hidden bg-gradient-to-r from-[#0d93f2]/10 to-transparent border border-[#0d93f2]/10 p-8 md:p-12">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=2600&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <h5 className="text-[#0d93f2] font-bold uppercase tracking-widest text-sm mb-2">StageVerse Tour Manager</h5>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
                Tour Itineraries
              </h1>
              <p className="text-[#90b2cb] text-lg max-w-2xl leading-relaxed">
                Access detailed day sheets, production schedules, and logistical data for your upcoming run.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0d93f2]/10 border border-[#0d93f2]/20 text-[#0d93f2] text-sm font-bold">
              <Star className="w-4 h-4 fill-current" />
              <span>Next Show: Chicago</span>
            </div>
          </div>
        </div>

        {/* SHOWS GRID */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-50">
            <Loader2 className="w-10 h-10 animate-spin text-[#0d93f2] mb-4" />
            <p className="text-sm font-mono text-[#0d93f2] uppercase tracking-widest">Syncing Tour Data...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-32 rounded-3xl border border-dashed border-[#223949] bg-[#101b22]">
            <p className="text-slate-500 font-medium">No upcoming shows found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {events.map((event, index) => (
              <Link
                key={event._id}
                href={`/day-sheet/${event._id}`}
                className="group relative flex flex-col bg-[#131d24] rounded-2xl border border-[#223949] overflow-hidden hover:border-[#0d93f2] hover:shadow-[0_0_30px_rgba(13,147,242,0.1)] transition-all duration-300"
              >
                {/* Status Strip */}
                <div className="h-1.5 w-full bg-gradient-to-r from-[#223949] to-[#101b22] group-hover:from-[#0d93f2] group-hover:to-[#60a5fa] transition-all duration-500"></div>

                <div className="p-6 flex flex-col h-full relative">
                  {/* Decorative Number */}
                  <span className="absolute top-4 right-6 text-6xl font-black text-[#1c2a35] -z-0 select-none group-hover:text-[#223949] transition-colors">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div className="relative z-10">
                    <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider mb-4 ${index === 0 ? 'bg-[#0d93f2] text-white shadow-lg shadow-blue-500/20' : 'bg-[#223949] text-slate-400'}`}>
                      {index === 0 ? 'Next Up' : 'Scheduled'}
                    </span>

                    <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-[#0d93f2] transition-colors line-clamp-1">{event.city}</h3>
                    <p className="text-[#90b2cb] text-sm font-medium line-clamp-1 mb-6 border-b border-[#223949] pb-6">{event.venue?.name || 'Venue TBA'}</p>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                        <Calendar className="w-4 h-4 text-[#0d93f2]" />
                        <span>{new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                        <Clock className="w-4 h-4 text-[#0d93f2]" />
                        <span>Doors: {event.doorsOpen || '19:00'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Hover Action */}
                  <div className="mt-8 pt-4 flex items-center text-sm font-bold text-[#0d93f2] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    View Full Itinerary <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}