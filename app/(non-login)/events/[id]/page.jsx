'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    Search, Bell, Calendar, Clock, MapPin, Info, Map as MapIcon,
    Navigation, ArrowRight, Heart, Share2, Link as LinkIcon,
    CalendarPlus, BarChart3, Loader2, Sparkles, Flame, Users, Ticket
} from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import MainFooter from '@/components/MainFooter';
import TicketSelection from '@/components/fan/TicketSelection';
import { useParams, useRouter } from 'next/navigation';

export default function EventDetailPage() {
    const params = useParams();
    const eventId = params?.id || '1';
    const router = useRouter();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);    const ref = useRef(null);
    const { scrollY } = useScroll();
    const heroY = useTransform(scrollY, [0, 500], [0, 200]);
    const heroOpacity = useTransform(scrollY, [0, 500], [1, 0.3]);

    useEffect(() => {
        if (!eventId) return;

        const fetchEventData = async () => {
            try {
                const res = await fetch(`/api/events/${eventId}`);

                if (!res.ok) {
                    if (res.status == 404) throw new Error("Event not found");
                    throw new Error("Failed to load event");
                }

                const json = await res.json();

                if (json.success) {
                    setEvent(json.data);
                } else {
                    throw new Error(json.message || "Something went wrong");
                }
            } catch (err) {
                console.error("Error fetching event:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchEventData();
    }, [eventId]);

    const handleGetTickets = () => {
        router.push(`/events/${eventId}/tickets`);
    };

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

    if (error || !event) {
        return (
            <div className="flex flex-col min-h-screen bg-black text-white">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                    <Flame className="w-16 h-16 text-red-500 mb-6 animate-bounce" />
                    <h2 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">Event Not Found</h2>
                    <p className="text-slate-400 mb-8 text-lg">{error || "The event you're looking for has vanished."}</p>
                    <Link href="/events" className="bg-[#00d4ff] hover:bg-white hover:text-black text-black px-8 py-4 rounded-full font-bold transition-all text-lg uppercase tracking-widest shadow-[0_0_20px_rgba(0,212,255,0.4)]">
                        Explore Other Gigs
                    </Link>
                </div>
                <MainFooter isLoggedIn={false} />
            </div>
        );
    }    const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const images = event.images || {};
    const heroImage = images.hero || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1074&auto=format&fit=crop";
    const artistImage = images.artist || "https://images.unsplash.com/photo-1741036379058-cca704d04101?w=600&auto=format&fit=crop";
    const venueImage = images.venue || "https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?w=600&auto=format&fit=crop";

    const aboutSection = event.about || (event.description ? [event.description] : ["No details available."]);
    const lineup = event.lineup || [];
    const similarEvents = event.similarEvents || [];
    const tiers = event.ticketTiers || [];

    return (
        <div className="flex flex-col min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00d4ff] selection:text-black overflow-x-hidden">
            <Navbar />

            <main className="flex-1 flex flex-col relative w-full">

                {}
                <div className="relative w-full h-[85vh] overflow-hidden" ref={ref}>
                    {}
                    <motion.div
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{
                            backgroundImage: `url("${heroImage}")`,
                            y: heroY,
                            opacity: heroOpacity
                        }}
                    />

                    {}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#050505] via-transparent to-[#00d4ff]/10 mix-blend-overlay" />

                    {}
                    <div className="absolute inset-0 flex flex-col justify-end px-6 md:px-12 lg:px-24 pb-24 z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="max-w-5xl"
                        >
                            {}
                            <div className="flex flex-wrap items-center gap-4 mb-6">
                                <span className="bg-[#00d4ff] text-black text-xs font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-sm shadow-[0_0_15px_rgba(0,212,255,0.6)]">
                                    {event.type || 'Concert'}
                                </span>
                                {event.status && (
                                    <span className="flex items-center gap-2 bg-red-600/20 backdrop-blur-md border border-red-500/50 text-red-400 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-sm animate-pulse">
                                        <Flame className="w-3.5 h-3.5 fill-current" /> {event.status}
                                    </span>
                                )}
                            </div>

                            {}
                            <h1 className="text-5xl md:text-7xl lg:text-9xl font-black text-white tracking-tighter leading-[0.9] mb-4 drop-shadow-2xl mix-blend-screen text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-slate-400">
                                {event.title}
                            </h1>
                            <h2 className="text-xl md:text-3xl font-light text-[#00d4ff] mb-8 tracking-wide font-display">
                                {event.subtitle}
                            </h2>

                            {}
                            <div className="flex flex-wrap items-center gap-8 md:gap-16 text-white/90 glass-panel p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md inline-flex">
                                <div className="flex items-center gap-4 group cursor-default">
                                    <div className="p-3 bg-white/10 rounded-full group-hover:bg-[#00d4ff] group-hover:text-black transition-colors duration-300">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-white/50 uppercase tracking-widest font-bold">Date</span>
                                        <span className="font-bold text-lg md:text-xl">{formattedDate}</span>
                                    </div>
                                </div>
                                <div className="w-px h-10 bg-white/10 hidden md:block"></div>
                                <div className="flex items-center gap-4 group cursor-default">
                                    <div className="p-3 bg-white/10 rounded-full group-hover:bg-[#00d4ff] group-hover:text-black transition-colors duration-300">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-white/50 uppercase tracking-widest font-bold">Venue</span>
                                        <span className="font-bold text-lg md:text-xl">{event.venue.name}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {}
                <div className="relative z-20 -mt-12 px-6 md:px-12 lg:px-24 pb-20">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                        {}
                        <div className="lg:col-span-8 flex flex-col gap-16">

                            {}
                            <motion.section
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6 }}
                            >
                                <div className="flex items-center gap-3 mb-8">
                                    <Sparkles className="w-6 h-6 text-[#00d4ff]" />
                                    <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">The Experience</h3>
                                </div>

                                <div className="bg-[#111] p-8 md:p-10 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group">
                                    {}
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-blue-500/10 transition-colors duration-700" />

                                    <div className="prose prose-invert prose-lg max-w-none text-slate-300 relative z-10 leading-relaxed">
                                        {aboutSection.map((text, index) => {
                                            const hasKeywords = /(HEADLINE:|HOOK:|ATMOSPHERE:|HIGHLIGHTS:|CLOSING:)/.test(text);

                                            if (hasKeywords) {
                                                const parts = text.split(/(?=(?:HEADLINE:|HOOK:|ATMOSPHERE:|HIGHLIGHTS:|CLOSING:))/g);
                                                return (
                                                    <div key={index} className="space-y-8 my-4">
                                                        {parts.map((part, i) => {
                                                            const [label, ...contentArr] = part.split(':');
                                                            const content = contentArr.join(':').trim();
                                                            if (content) {
                                                                return (
                                                                    <div key={i} className="pl-6 border-l-2 border-[#00d4ff]/30 hover:border-[#00d4ff] transition-colors duration-300">
                                                                        <span className="text-[#00d4ff] font-bold text-sm uppercase tracking-[0.2em] block mb-2">{label.trim()}</span>
                                                                        <p className="text-white mb-0 text-lg font-light">{content}</p>
                                                                    </div>
                                                                );
                                                            }
                                                            return <p key={i}>{part}</p>;
                                                        })}
                                                    </div>
                                                );
                                            }
                                            return <p key={index} className="whitespace-pre-line text-lg font-light text-slate-300">{text}</p>;
                                        })}
                                    </div>
                                </div>
                            </motion.section>

                            {}
                            <motion.section
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                            >
                                <h3 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
                                    <Users className="w-6 h-6 text-[#00d4ff]" /> Lineup
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {lineup.map((act, index) => (
                                        <div key={index} className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#111] border border-white/10 cursor-pointer">
                                            <div
                                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                                                style={{ backgroundImage: `url("${act.image}")` }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
                                            <div className="absolute bottom-0 left-0 w-full p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                                <h4 className="text-white font-bold text-lg leading-none mb-1">{act.name}</h4>
                                                <p className="text-[#00d4ff] text-xs font-bold uppercase tracking-wider">{act.role || 'Artist'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>

                            {}
                            <motion.section
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                            >
                                <h3 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
                                    <MapIcon className="w-6 h-6 text-[#00d4ff]" /> Location
                                </h3>
                                <div className="rounded-3xl overflow-hidden border border-white/10 h-[400px] relative group">
                                    <div
                                        className="absolute inset-0 bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-700"
                                        style={{ backgroundImage: `url("${venueImage}")` }}
                                    />
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />

                                    <div className="absolute bottom-6 left-6 right-6 p-6 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                                        <div>
                                            <h4 className="text-xl font-bold text-white">{event.venue.name}</h4>
                                            <p className="text-slate-400 text-sm">{event.venue.address || event.venue.city}</p>
                                        </div>
                                        <button className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-[#00d4ff] transition-colors flex items-center gap-2">
                                            <Navigation className="w-4 h-4" /> Get Directions
                                        </button>
                                    </div>
                                </div>
                            </motion.section>

                        </div>

                        {}
                        <div className="lg:col-span-4 relative">
                            <div className="sticky top-28 flex flex-col gap-6">

                                {}
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5, duration: 0.6 }}
                                    className="bg-[#111] border border-[#00d4ff]/20 rounded-3xl p-1 shadow-[0_0_40px_-10px_rgba(0,212,255,0.15)]"
                                >
                                    <TicketSelection eventId={event._id} tiers={tiers} />
                                </motion.div>

                                {}
                                <div className="bg-[#111]/50 backdrop-blur-sm border border-white/5 rounded-3xl p-6 flex items-center gap-5 hover:bg-[#111] transition-colors">
                                    <div className="w-16 h-16 rounded-full bg-cover bg-center border-2 border-[#00d4ff]" style={{ backgroundImage: `url("${artistImage}")` }} />
                                    <div>
                                        <h4 className="text-white font-bold text-lg">{event.artist.name}</h4>
                                        <p className="text-slate-500 text-sm">{event.artist.listeners || 'Top Artist'}</p>
                                    </div>
                                    <div className="ml-auto">
                                        <button className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center text-black hover:scale-110 transition-transform">
                                            <ArrowRight className="w-5 h-5 -rotate-45" />
                                        </button>
                                    </div>
                                </div>

                                {}
                                <div className="flex justify-between items-center px-4 py-2 border-t border-white/10 mt-4">
                                    <span className="text-slate-500 text-sm font-bold uppercase">Share Event</span>
                                    <div className="flex gap-4">
                                        {[Share2, LinkIcon, Heart].map((Icon, i) => (
                                            <button key={i} className="text-slate-400 hover:text-[#00d4ff] transition-colors">
                                                <Icon className="w-5 h-5" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>

                {}
                <section className="py-20 bg-[#080808] border-t border-white/5">
                    <div className="px-6 md:px-12 lg:px-24">
                        <div className="flex items-end justify-between mb-12">
                            <div>
                                <h3 className="text-sm font-bold text-[#00d4ff] uppercase tracking-widest mb-2">More Like This</h3>
                                <h2 className="text-3xl md:text-5xl font-black text-white">Don't Miss Out</h2>
                            </div>
                            <Link href="/discover" className="text-white hover:text-[#00d4ff] font-bold border-b border-white hover:border-[#00d4ff] pb-1 transition-colors">
                                View All Events
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {similarEvents.map((sim, i) => (
                                <motion.div
                                    key={sim.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <SimilarEventCard event={sim} />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                <MainFooter isLoggedIn={false} />
            </main>
        </div>
    );
}function SimilarEventCard({ event }) {
    return (
        <Link href={`/events/${event.id}`} className="group block bg-[#111] rounded-2xl overflow-hidden border border-white/5 hover:border-[#00d4ff]/50 transition-all duration-500 hover:-translate-y-2">
            <div className="h-64 bg-cover bg-center relative overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url("${event.image}")` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute top-4 left-4">
                    <span className="bg-[#00d4ff] text-black text-[10px] font-black uppercase px-2 py-1 rounded-sm">{event.genre}</span>
                </div>
                <div className="absolute bottom-4 left-4">
                    <p className="text-white font-black text-xl leading-none mb-1">{event.name}</p>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{event.date} • {event.city}</p>
                </div>
            </div>
            <div className="p-4 flex justify-between items-center border-t border-white/5 bg-[#161616]">
                <div>
                    <p className="text-xs text-slate-500 font-bold uppercase mb-0.5">Starting at</p>
                    <p className="text-white font-bold text-lg">${event.price}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white group-hover:bg-[#00d4ff] group-hover:text-black transition-colors">
                    <ArrowRight className="w-4 h-4" />
                </div>
            </div>
        </Link>
    )
}