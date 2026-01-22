'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, ArrowRight, Loader2 } from 'lucide-react';

import ArtistNavbar from '@/components/artist/ArtistNavbar';
import StudioNavbar from '@/components/production/StudioNavbar';

export default function EventSelectionPage({ role = 'artist' }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {                const res = await fetch('/api/artist/events');
                const json = await res.json();
                if (json.success) {
                    setEvents(json.events || []);
                }
            } catch (e) {
                console.error("Error fetching events", e);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    const linkPrefix = role === 'artist' ? '/live-show' : '/live';
    const Navbar = role === 'artist' ? ArtistNavbar : StudioNavbar;

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a2c38] via-[#050505] to-[#050505]">
            <Navbar />

            <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-12">
                    <header className="text-center space-y-4">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-500">
                            Select Event
                        </h1>
                        <p className="text-slate-400 text-lg max-w-xl mx-auto">
                            Access the {role === 'artist' ? 'Live Command Center' : 'Production Suite'} for your scheduled shows.
                        </p>
                    </header>

                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500 w-10 h-10" /></div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {events.map(event => (
                                <Link
                                    key={event._id}
                                    href={`${linkPrefix}/${event._id}`}
                                    className="group relative flex flex-col md:flex-row w-full bg-[#0d131a]/80 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden hover:border-[#00d4ff]/50 transition-all duration-300 hover:shadow-[0_0_40px_-10px_rgba(0,212,255,0.2)]"
                                >
                                    {}
                                    <div className="flex-1 p-6 flex gap-6 relative">
                                        {}
                                        <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-2xl overflow-hidden bg-slate-800 shadow-lg relative group-hover:scale-105 transition-transform duration-500">
                                            {event.images?.hero ? (
                                                <img src={event.images.hero} alt={event.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold text-2xl">
                                                    {event.venue?.name?.substring(0, 2) || "EV"}
                                                </div>
                                            )}
                                        </div>

                                        {}
                                        <div className="flex flex-col justify-center space-y-2 z-10">
                                            <h3 className="text-2xl md:text-3xl font-bold text-white group-hover:text-[#00d4ff] transition-colors">
                                                {event.title}
                                            </h3>
                                            <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
                                                <span className="text-[#00d4ff]">
                                                    {new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    {event.venue?.name || event.city || "TBA"}
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">
                                                {event.city}
                                            </p>
                                        </div>

                                        {}
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                                    </div>

                                    {}
                                    <div className="relative flex md:flex-col items-center justify-center">
                                        {}
                                        <div className="absolute inset-0 flex md:flex-col justify-between py-2 md:px-0 px-2 opacity-30">
                                            {}
                                        </div>
                                        {}
                                        <div className="w-full h-[1px] md:w-[1px] md:h-full border-t md:border-t-0 md:border-l border-dashed border-white/20 my-4 md:my-0 md:mx-4 relative">
                                            {}
                                            <div className="absolute left-[-6px] md:left-[-6px] top-[-10px] md:top-[-6px] w-3 h-3 md:w-4 md:h-4 bg-[#050505] rounded-full"></div>
                                            <div className="absolute right-[-6px] md:left-[-6px] bottom-[-6px] md:bottom-[-6px] w-3 h-3 md:w-4 md:h-4 bg-[#050505] rounded-full"></div>
                                        </div>
                                    </div>

                                    {}
                                    <div className="w-full md:w-72 bg-white/[0.02] p-6 flex flex-col justify-center items-center text-center space-y-4 relative">

                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">
                                                {role === 'artist' ? 'Artist Access' : 'Crew Access'}
                                            </p>
                                            <div className="px-4 py-2 bg-[#00d4ff] text-[#050505] text-sm font-bold rounded shadow-[0_0_15px_rgba(0,212,255,0.4)] group-hover:scale-105 transition-transform flex items-center gap-2">
                                                {role === 'artist' ? 'LAUNCH SHOW' : 'OPEN CONSOLE'} <ArrowRight className="w-4 h-4" />
                                            </div>
                                        </div>

                                        <div className="text-[10px] text-slate-500 font-mono space-y-1 pt-2 border-t border-white/5 w-full">
                                            <div className="flex justify-between">
                                                <span>GATE</span>
                                                <span className="text-white">ACCESS A</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>ROW</span>
                                                <span className="text-white">STAGE</span>
                                            </div>
                                        </div>

                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
