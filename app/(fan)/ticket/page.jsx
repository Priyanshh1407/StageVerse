'use client';

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import FanSidebar from '@/components/fan/FanSidebar';
import TicketModal from '@/components/fan/ticket/TicketModal';
import VenueInfoModal from '@/components/fan/ticket/VenueInfoModal';
import TicketHistoryModal from '@/components/fan/ticket/TicketHistoryModal';

import {
    Menu, Calendar, MapPin, Armchair, Ticket,
    Share2, Info, QrCode, ArrowRight, Clock, FileText, Loader2
} from 'lucide-react';

export default function TicketsPage() {
    const [tickets, setTickets] = useState({ upcoming: [], past: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upcoming');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isVenueModalOpen, setIsVenueModalOpen] = useState(false);
    const [selectedVenue, setSelectedVenue] = useState(null);
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const res = await fetch('/api/fan/ticket');
                const json = await res.json();
                if (json.success) {
                    setTickets(json.data);
                }
            } catch (error) {
                console.error("Failed to fetch tickets:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTickets();
    }, []);
    const handleOpenVenue = (venueData) => {
        setSelectedVenue(venueData || {
            name: "Unknown Venue",
            address: "Address unavailable",
            description: "No details available."
        });
        setIsVenueModalOpen(true);
    };

    const handleOpenTicket = (ticket) => {
        setSelectedTicket(ticket);
        setIsTicketModalOpen(true);
    };
    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#f5f7f8] dark:bg-[#101b22]">
                <Loader2 className="w-10 h-10 text-[#0d93f2] animate-spin" />
            </div>
        );
    }
    const primaryTicket = tickets.upcoming[0];
    const secondaryTicket = tickets.upcoming[1];

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

                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 scroll-smooth">
                    <div className="max-w-5xl mx-auto flex flex-col gap-10 pb-10">

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight mb-2">My Tickets</h1>
                                <p className="text-slate-500 dark:text-slate-400">View your upcoming shows and manage your purchases.</p>
                            </div>
                            <div className="flex p-1 bg-slate-200 dark:bg-slate-800 rounded-lg self-start md:self-auto">
                                <button onClick={() => setActiveTab('upcoming')} className={`px-5 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'upcoming' ? 'bg-white dark:bg-[#1a2632] shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Upcoming</button>
                                <button onClick={() => setActiveTab('past')} className={`px-5 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'past' ? 'bg-white dark:bg-[#1a2632] shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Past Events</button>
                            </div>
                        </div>

                        {activeTab === 'upcoming' && (
                            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    Next Up
                                </h2>

                                {tickets.upcoming.length === 0 ? (
                                    <div className="p-10 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center text-slate-500">
                                        No upcoming tickets found. Go to Discover to find events!
                                    </div>
                                ) : (
                                    <>
                                        {}
                                        {primaryTicket && (
                                            <div className="flex flex-col lg:flex-row bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-md group relative">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-[#0d93f2] z-20"></div>
                                                <div className="relative lg:w-72 h-48 lg:h-auto shrink-0 bg-slate-900">
                                                    <Image src={primaryTicket.bgImage} alt={primaryTicket.artist} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent lg:hidden"></div>
                                                    <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-white/20 dark:border-slate-700 rounded-xl p-3 text-center min-w-[70px] shadow-lg">
                                                        <span className="block text-xs font-bold text-red-500 uppercase tracking-wider mb-0.5">{primaryTicket.month}</span>
                                                        <span className="block text-2xl font-black text-slate-900 dark:text-white leading-none">{primaryTicket.day}</span>
                                                    </div>
                                                </div>

                                                <div className="flex-1 p-6 md:p-8 flex flex-col justify-between relative border-r border-dashed border-slate-200 dark:border-slate-700">
                                                    <div>
                                                        <div className="flex items-start justify-between mb-2">
                                                            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-tight">{primaryTicket.artist}</h3>
                                                            <span className="px-2 py-1 rounded bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-bold uppercase border border-green-500/20">{primaryTicket.status}</span>
                                                        </div>
                                                        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg mb-6">{primaryTicket.tour}</p>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm text-slate-700 dark:text-slate-300">
                                                            <InfoItem icon={Clock} label="Time" value={primaryTicket.time} />
                                                            <InfoItem icon={MapPin} label="Venue" value={primaryTicket.venue} />
                                                            <InfoItem icon={Armchair} label="Seat" value={primaryTicket.seat} />
                                                            <InfoItem icon={Ticket} label="Type" value={primaryTicket.type} />
                                                        </div>
                                                    </div>

                                                    <div className="mt-8 flex flex-wrap gap-3 pt-6 border-t border-slate-100 dark:border-slate-800/50">
                                                        <ActionButton icon={Calendar} label="Add to Calendar" onClick={() => toast.info("Calendar integration coming soon!")} />
                                                        <ActionButton icon={Share2} label="Transfer" onClick={() => handleOpenTicket(primaryTicket)} />
                                                        <ActionButton icon={Info} label="Venue Info" onClick={() => handleOpenVenue(primaryTicket.venueDetails)} />
                                                    </div>
                                                </div>

                                                <div className="w-full lg:w-80 bg-slate-50 dark:bg-[#151f28] p-8 flex flex-col items-center justify-center gap-6 relative">
                                                    <div className="bg-white p-4 rounded-xl shadow-sm w-48 mx-auto">
                                                        <div className="aspect-square bg-slate-900 rounded-lg flex items-center justify-center relative overflow-hidden group-hover:shadow-[0_0_20px_rgba(13,147,242,0.3)] transition-shadow duration-500">
                                                            <QrCode className="text-white w-24 h-24" />
                                                        </div>
                                                        <p className="text-center text-[10px] font-mono mt-3 text-slate-400 font-bold tracking-wider truncate px-2">{primaryTicket.qrCode}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleOpenTicket(primaryTicket)}
                                                        className="w-full py-3 bg-[#0d93f2] hover:bg-[#0d93f2]/90 text-white font-bold rounded-xl shadow-lg shadow-[#0d93f2]/20 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                                    >
                                                        <Info className="w-4 h-4" /> View Ticket Details
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {}
                                        {secondaryTicket && (
                                            <div className="flex flex-col md:flex-row bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:border-[#0d93f2]/50 transition-colors cursor-pointer group">
                                                <div className="w-full md:w-32 h-32 relative bg-slate-800 shrink-0">
                                                    <Image src={secondaryTicket.bgImage} alt={secondaryTicket.artist} fill className="object-cover" />
                                                </div>
                                                <div className="flex-1 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2 text-xs font-bold text-[#0d93f2] uppercase tracking-wider mb-1">
                                                            <Calendar className="w-3 h-3" /> {secondaryTicket.dateDisplay} • {secondaryTicket.time}
                                                        </div>
                                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-[#0d93f2] transition-colors">{secondaryTicket.artist}</h3>
                                                        <p className="text-slate-500 text-sm">{secondaryTicket.venue}</p>
                                                    </div>
                                                    <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 shrink-0">
                                                        <div className="text-right hidden md:block">
                                                            <p className="text-xs text-slate-400 uppercase font-bold">Seats</p>
                                                            <p className="text-sm font-bold">{secondaryTicket.seat}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleOpenTicket(secondaryTicket)}
                                                            className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-sm font-bold transition-colors"
                                                        >
                                                            Manage
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {}
                        <div className="flex flex-col gap-6 pt-6 border-t border-slate-200 dark:border-slate-800/50">
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Past Events</h2>
                            {tickets.past.length === 0 ? (
                                <p className="text-slate-500 text-sm italic">No past events found.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {tickets.past.slice(0, 4).map((ticket) => (
                                        <div key={ticket.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-[#1a2632]/50 border border-slate-200 dark:border-slate-800 opacity-75 hover:opacity-100 transition-opacity">
                                            <div className="w-16 h-16 rounded-lg bg-slate-800 relative overflow-hidden shrink-0 grayscale">
                                                <Image src={ticket.bgImage || ""} alt={ticket.artist} fill className="object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-700 dark:text-slate-300 truncate">{ticket.artist}</h4>
                                                <p className="text-xs text-slate-500 mt-1">{ticket.dateFull} • {ticket.venue}</p>
                                            </div>
                                            <button
                                                onClick={() => handleOpenTicket(ticket)}
                                                className="text-slate-400 hover:text-[#0d93f2] p-2 transition-colors"
                                            >
                                                <FileText className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {tickets.past.length > 0 && (
                                <button
                                    onClick={() => setIsHistoryModalOpen(true)}
                                    className="self-center mt-4 text-sm font-medium text-[#0d93f2] hover:underline"
                                >
                                    View full history
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <VenueInfoModal
                isOpen={isVenueModalOpen}
                onClose={() => setIsVenueModalOpen(false)}
                venue={selectedVenue}
            />

            <TicketModal
                isOpen={isTicketModalOpen}
                onClose={() => setIsTicketModalOpen(false)}
                ticket={selectedTicket}
            />

            <TicketHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                tickets={tickets.past}
                onSelectTicket={handleOpenTicket}
            />

        </div>
    );
}
function InfoItem({ icon: Icon, label, value }) {
    return (
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#0d93f2]">
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase font-bold">{label}</span>
                <span className="font-semibold">{value}</span>
            </div>
        </div>
    );
}

function ActionButton({ icon: Icon, label, onClick }) {
    return (
        <button
            onClick={onClick}
            className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wide transition-colors flex items-center gap-2"
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );
}