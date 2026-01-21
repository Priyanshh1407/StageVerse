'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Play, Heart, Share2, Globe, Music2,
  Calendar, MapPin, ArrowRight, Loader2, Sparkles, User, Ticket
} from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import MainFooter from '@/components/MainFooter';
import { useParams } from 'next/navigation';

export default function PublicArtistPage() {
  const params = useParams();
  const artistId = params?.id;

  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Scroll Animation Hooks
  const ref = useRef(null);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 200]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0.3]);

  useEffect(() => {
    if (!artistId) return;

    const fetchArtist = async () => {
      try {
        const res = await fetch(`/api/artist/${artistId}`);
        if (!res.ok) throw new Error("Artist not found");
        const json = await res.json();
        if (json.success) {
          setArtist(json.data);
        } else {
          throw new Error(json.message || "Failed to load artist");
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchArtist();
  }, [artistId]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#00d4ff]" />
        </div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="flex flex-col min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <User className="w-16 h-16 text-slate-500 mb-6" />
          <h2 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">Artist Not Found</h2>
          <Link href="/explore-artist" className="text-[#00d4ff] hover:underline font-bold text-lg">
            Browse Artists
          </Link>
        </div>
        <MainFooter />
      </div>
    );
  }

  // --- DATA ---
  const heroImage = artist.image || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1000&auto=format&fit=crop";
  const bio = artist.bio || ["No bio available."];
  const shows = artist.upcomingShows || [];

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00d4ff] selection:text-black overflow-x-hidden">
      <Navbar />

      <main className="flex-1 flex flex-col relative w-full">

        {/* 1. IMMERSIVE HERO SECTION */}
        <div className="relative w-full h-[70vh] lg:h-[80vh] overflow-hidden" ref={ref}>
          <motion.div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url("${heroImage}")`,
              y: heroY,
              opacity: heroOpacity
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-tr from-[#050505] via-transparent to-[#00d4ff]/10 mix-blend-overlay" />

          <div className="absolute inset-0 flex flex-col justify-end px-6 md:px-12 lg:px-24 pb-24 z-10">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-5xl"
            >
              <div className="flex flex-wrap items-center gap-4 mb-6">
                {artist.genres && artist.genres.map((g, i) => (
                  <span key={i} className="bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] text-xs font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-sm backdrop-blur-md">
                    {g}
                  </span>
                ))}
                <span className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-widest pl-2 border-l border-white/20">
                  <MapPin className="w-3.5 h-3.5" /> {artist.location}
                </span>
              </div>

              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-white tracking-tighter leading-[0.9] mb-8 drop-shadow-2xl mix-blend-screen bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-400">
                {artist.name}
              </h1>

              <div className="flex flex-wrap gap-4">
                <button className="bg-[#00d4ff] text-black px-8 py-3 rounded-full font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_0_20px_rgba(0,212,255,0.4)]">
                  <Heart className="w-4 h-4" /> Follow
                </button>
                <button className="bg-white/10 text-white border border-white/20 px-8 py-3 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-white hover:text-black transition-all flex items-center gap-2 backdrop-blur-md">
                  <Share2 className="w-4 h-4" /> Share
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* 2. MAIN GRID */}
        <div className="relative z-20 -mt-12 px-6 md:px-12 lg:px-24 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

            {/* LEFT: Info & Layout */}
            <div className="lg:col-span-8 flex flex-col gap-16">

              {/* BIO */}
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="bg-[#111] p-8 md:p-10 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#00d4ff]" /> About
                </h3>
                <div className="prose prose-invert prose-lg max-w-none text-slate-300 leading-relaxed font-light">
                  {bio.map((p, i) => (
                    <p key={i} className="mb-4">{p}</p>
                  ))}
                </div>
              </motion.section>

              {/* POPULAR TRACKS (Mockup) */}
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h3 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
                  <Music2 className="w-6 h-6 text-[#00d4ff]" /> Popular
                </h3>
                <div className="flex flex-col gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-[#111] border border-white/5 rounded-2xl hover:bg-[#161616] hover:border-[#00d4ff]/20 transition-all cursor-pointer group">
                      <div className="flex items-center gap-6">
                        <span className="text-slate-600 font-black text-xl w-6 text-center group-hover:text-[#00d4ff]">{i}</span>
                        <div className="w-12 h-12 bg-gray-800 rounded-lg overflow-hidden relative">
                          <Image src={`https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=100&h=100&fit=crop`} alt="Track" fill className="object-cover" />
                        </div>
                        <div>
                          <h4 className="text-white font-bold group-hover:text-[#00d4ff] transition-colors">Track Title {i}</h4>
                          <p className="text-slate-500 text-xs uppercase tracking-wider">Album Name</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-500 text-sm">3:45</span>
                        <button className="w-10 h-10 rounded-full bg-[#00d4ff] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>

            </div>

            {/* RIGHT: Sidebar (Upcoming Shows) */}
            <div className="lg:col-span-4 relative">
              <div className="sticky top-28 flex flex-col gap-6">
                <div className="bg-[#111] border border-[#00d4ff]/20 rounded-3xl p-6 shadow-[0_0_40px_-10px_rgba(0,212,255,0.15)] relative overflow-hidden">
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <h3 className="text-xl font-bold text-white">Upcoming Shows</h3>
                    <span className="text-xs bg-[#00d4ff]/10 text-[#00d4ff] px-2 py-1 rounded font-bold uppercase">{shows.length} Found</span>
                  </div>

                  <div className="space-y-4 relative z-10">
                    {shows.length > 0 ? shows.map((show) => (
                      <Link href={`/events/${show.id}`} key={show.id} className="block group">
                        <div className="flex gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
                          <div className="bg-[#1a1a1a] rounded-lg w-14 h-14 flex flex-col items-center justify-center border border-white/10 group-hover:border-[#00d4ff] transition-colors">
                            <span className="text-[10px] text-[#00d4ff] font-black uppercase">{show.month}</span>
                            <span className="text-xl text-white font-bold leading-none">{show.day}</span>
                          </div>
                          <div>
                            <h4 className="text-white font-bold leading-tight group-hover:text-[#00d4ff] transition-colors">{show.title}</h4>
                            <p className="text-slate-400 text-xs mt-0.5">{show.venue}, {show.city}</p>
                          </div>
                        </div>
                      </Link>
                    )) : (
                      <p className="text-slate-500 text-center py-8">No upcoming shows.</p>
                    )}
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/10 text-center">
                    <Link href="/events" className="inline-flex items-center gap-2 text-sm font-bold text-white hover:text-[#00d4ff] transition-colors uppercase tracking-widest">
                      View Full Tour <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <MainFooter />
      </main>
    </div>
  );
}