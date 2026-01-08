'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Search, Filter, CalendarDays, Ticket, ArrowRight, 
  Loader2, Bell, Menu 
} from 'lucide-react';
import OrganizerSidebar from '@/components/organizer/OrganizerSidebar';

export default function TicketingSelectionPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // --- STATE ---
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // --- FETCH EVENTS ---
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/events?mode=organizer');
        const data = await res.json();
        if (data.success) {
          setEvents(data.data);
        }
      } catch (error) {
        console.error("Failed to load events", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // --- FILTER LOGIC ---
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || event.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [events, searchQuery, statusFilter]);

  // --- HANDLER ---
  const handleSelectEvent = (event) => {
    // 🚀 REDIRECT TO THE SPECIFIC TICKET DASHBOARD
    // Uses the Short ID (eventId) or Long ID (_id) based on your routing
    const id = event.eventId || event._id;
    router.push(`/ticketing/${id}`);
  };

  return (
    <div className="flex h-screen w-full bg-[#f5f7f8] dark:bg-[#101b22] font-sans text-white overflow-hidden">
      
      <OrganizerSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#101b22]">
        
        {/* HEADER */}
        <header className="h-20 border-b border-[#2c3b47] flex items-center justify-between px-8 bg-[#101b22]/95 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-[#90b2cb]"><Menu /></button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Ticketing Hub</h2>
              <p className="text-[#90b2cb] text-sm">Select an event to manage sales & inventory.</p>
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0d93f2] to-purple-500 p-[1px]">
             <div className="w-full h-full rounded-full bg-[#101b22] overflow-hidden relative">
                <Image src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop" alt="Profile" fill className="object-cover" />
             </div>
          </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto flex flex-col gap-6">
            
            {/* CONTROLS */}
            <div className="flex flex-col md:flex-row gap-4 bg-[#192734] p-4 rounded-xl border border-[#2c3b47]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-[#90b2cb] w-5 h-5" />
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#101b22] border border-[#2c3b47] rounded-lg text-sm text-white focus:border-[#0d93f2] outline-none transition-colors"
                  placeholder="Find an event..." 
                />
              </div>
              <div className="relative">
                 <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-full px-4 py-2 bg-[#101b22] border border-[#2c3b47] rounded-lg text-sm text-[#90b2cb] focus:border-[#0d93f2] outline-none appearance-none cursor-pointer min-w-[150px]"
                 >
                    <option value="All">All Statuses</option>
                    <option value="Live">Live</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Draft">Draft</option>
                 </select>
                 <Filter className="absolute right-3 top-2.5 w-4 h-4 text-[#90b2cb] pointer-events-none" />
              </div>
            </div>

            {/* EVENT LIST */}
            <div className="flex flex-col gap-3">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center text-[#90b2cb]">
                   <Loader2 className="w-8 h-8 animate-spin mb-2 text-[#0d93f2]" />
                   <p>Loading your events...</p>
                </div>
              ) : filteredEvents.length > 0 ? (
                filteredEvents.map((event) => (
                  <div 
                    key={event._id} 
                    onClick={() => handleSelectEvent(event)}
                    className="group bg-[#192734] hover:bg-[#1f2f3f] border border-[#2c3b47] hover:border-[#0d93f2]/50 rounded-xl p-5 flex items-center justify-between cursor-pointer transition-all duration-200"
                  >
                    <div className="flex items-center gap-5">
                      {/* Date Box */}
                      <div className="hidden sm:flex flex-col items-center justify-center w-16 h-16 bg-[#101b22] rounded-lg border border-[#2c3b47] text-[#90b2cb] group-hover:text-white group-hover:border-[#0d93f2] transition-colors">
                         <span className="text-xs font-bold uppercase">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                         <span className="text-xl font-bold">{new Date(event.date).getDate()}</span>
                      </div>
                      
                      {/* Info */}
                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-[#0d93f2] transition-colors">{event.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-[#90b2cb] mt-1">
                           <span className="flex items-center gap-1"><Ticket className="w-3 h-3" /> {event.ticketTiers?.length || 0} Tiers</span>
                           <span>•</span>
                           <span>{event.city}</span>
                           <span>•</span>
                           <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              event.status === 'Live' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                              event.status === 'Draft' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                              'bg-[#2c3b47] text-[#90b2cb] border-[#3e5060]'
                           }`}>
                              {event.status}
                           </span>
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="flex items-center gap-3">
                       <span className="hidden sm:block text-sm font-medium text-[#90b2cb] group-hover:text-white transition-colors">Manage Tickets</span>
                       <div className="w-8 h-8 rounded-full bg-[#101b22] flex items-center justify-center text-[#90b2cb] group-hover:bg-[#0d93f2] group-hover:text-white transition-all">
                          <ArrowRight className="w-4 h-4" />
                       </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-[#90b2cb] bg-[#192734] rounded-xl border border-[#2c3b47]">
                   <p>No events found matching your filter.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}