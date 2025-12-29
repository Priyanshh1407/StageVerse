'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation'; 
import { 
  Bell, Search, Filter, CalendarDays, Plus, MoreVertical, 
  Music, Mic, Palette, Trophy, Utensils, Edit, LineChart, Copy, 
  ChevronLeft, ChevronRight, Menu, Trash2, CheckCircle, Eye
} from 'lucide-react';
import OrganizerSidebar from '@/components/organizer/OrganizerSidebar';

// --- MOCK DATA GENERATOR ---
const INITIAL_EVENTS = [
  { id: 1, name: "Summer Vibes Festival 2024", category: "Electronic • Music", date: "Aug 24, 2024", time: "8:00 PM", venue: "Neon Arena", location: "Los Angeles, CA", ticketsSold: 12450, capacityPercentage: 78, status: "Live", icon: Music },
  { id: 2, name: "Tech Talks: Future AI", category: "Conference • Tech", date: "Sep 12, 2024", time: "10:00 AM", venue: "Convention Center", location: "San Francisco, CA", ticketsSold: 450, capacityPercentage: 30, status: "Draft", icon: Mic },
  { id: 3, name: "Modern Art Gallery Opening", category: "Exhibition • Art", date: "Jul 15, 2024", time: "6:00 PM", venue: "The Void Gallery", location: "New York, NY", ticketsSold: 2000, capacityPercentage: 100, status: "Completed", icon: Palette },
  { id: 4, name: "Urban Hoops Championship", category: "Sports • Tournament", date: "Oct 05, 2024", time: "2:00 PM", venue: "City Park Courts", location: "Chicago, IL", ticketsSold: 850, capacityPercentage: 55, status: "Live", icon: Trophy },
  { id: 5, name: "Taste of Downtown", category: "Food • Festival", date: "Nov 20, 2024", time: "11:00 AM", venue: "Downtown Plaza", location: "Austin, TX", ticketsSold: 0, capacityPercentage: 0, status: "Scheduled", icon: Utensils },
  { id: 6, name: "Winter Jazz Gala", category: "Jazz • Music", date: "Dec 10, 2024", time: "7:00 PM", venue: "Blue Note", location: "Chicago, IL", ticketsSold: 120, capacityPercentage: 15, status: "Scheduled", icon: Music },
  { id: 7, name: "Startup Pitch Night", category: "Business • Networking", date: "Jan 15, 2025", time: "6:30 PM", venue: "WeWork Loft", location: "Seattle, WA", ticketsSold: 50, capacityPercentage: 50, status: "Draft", icon: Mic },
];

export default function EventsPage() {
  const router = useRouter(); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // --- STATE FOR INTERACTIVITY ---
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // --- FILTER LOGIC ---
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            event.venue.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || event.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [events, searchQuery, statusFilter]);

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const currentData = filteredEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- HANDLERS ---
  const handleCreateRedirect = () => {
    // Redirect to Create Event Page
    router.push('/create-event'); 
  };

  const handleDuplicate = (event) => {
    const newEvent = {
      ...event,
      id: Date.now(), // simple unique id
      name: `${event.name} (Copy)`,
      status: 'Draft',
      ticketsSold: 0,
      capacityPercentage: 0
    };
    setEvents([newEvent, ...events]);
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this event?")) {
      setEvents(events.filter(e => e.id !== id));
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  return (
    <div className="flex h-screen w-full bg-[#f5f7f8] dark:bg-[#101b22] font-sans text-white overflow-hidden selection:bg-[#0d93f2]/30">
      
      {/* Imported Sidebar Component */}
      <OrganizerSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#101b22]">
        
        <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-[#2c3b47] scrollbar-track-[#101b22]">
          <div className="max-w-[1400px] mx-auto flex flex-col gap-6">
            
            {/* CONTROLS */}
            <EventsControlBar 
              search={searchQuery}
              setSearch={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onCreate={handleCreateRedirect}
            />

            {/* EVENTS TABLE CONTAINER */}
            <div className="bg-[#192734] rounded-xl border border-[#2c3b47] overflow-hidden flex flex-col min-h-[400px]">
              <EventsTable 
                data={currentData} 
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
              
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredEvents.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
              />
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function Header({ onMenuClick }) {
  return (
    <header className="h-20 border-b border-[#2c3b47] flex items-center justify-between px-4 md:px-8 bg-[#101b22]/95 backdrop-blur-sm z-10 shrink-0">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="md:hidden text-[#90b2cb] hover:text-white">
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex flex-col">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">Events Management</h2>
          <p className="text-[#90b2cb] text-sm hidden md:block">Create, monitor and update your scheduled events.</p>
        </div>
      </div>
      <div className="flex items-center gap-4 md:gap-6">
        <button className="relative p-2 text-[#90b2cb] hover:text-white">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0d93f2] rounded-full"></span>
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-[#2c3b47]">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0d93f2] to-purple-500 p-[1px] cursor-pointer hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-full bg-[#101b22] relative overflow-hidden">
               <Image src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop" alt="Profile" fill className="object-cover" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function EventsControlBar({ search, setSearch, statusFilter, setStatusFilter, onCreate }) {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#192734] p-4 rounded-xl border border-[#2c3b47]">
      <div className="flex flex-1 items-center gap-4 w-full md:w-auto flex-wrap md:flex-nowrap">
        {/* Search Input */}
        <div className="w-full md:w-80 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-[#90b2cb]" />
          </div>
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 bg-[#101b22] border border-[#2c3b47] rounded-lg text-sm text-white placeholder-[#90b2cb] focus:outline-none focus:border-[#0d93f2] focus:ring-1 focus:ring-[#0d93f2] transition-colors" 
            placeholder="Search events..." 
            type="text"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative group">
          <button 
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-[#101b22] border border-[#2c3b47] rounded-lg hover:border-[#3e5060] transition-colors text-sm text-[#90b2cb] hover:text-white"
          >
            <Filter className="w-4 h-4" />
            <span>Status: {statusFilter}</span>
          </button>
          
          {showFilterDropdown && (
            <div className="absolute top-full left-0 mt-2 w-40 bg-[#192734] border border-[#2c3b47] rounded-lg shadow-xl z-10 overflow-hidden">
              {["All", "Live", "Draft", "Scheduled", "Completed"].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                    setShowFilterDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-[#90b2cb] hover:text-white hover:bg-[#2c3b47]"
                >
                  {status}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative hidden sm:block">
          <button className="flex items-center gap-2 px-3 py-2 bg-[#101b22] border border-[#2c3b47] rounded-lg hover:border-[#3e5060] transition-colors text-sm text-[#90b2cb] hover:text-white">
            <CalendarDays className="w-4 h-4" />
            <span>Date Range</span>
          </button>
        </div>
      </div>

      {/* Create Button with Redirect */}
      <button 
        onClick={onCreate}
        className="flex items-center gap-2 bg-[#0d93f2] hover:bg-[#0b84db] text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-[#0d93f2]/20 w-full md:w-auto justify-center"
      >
        <Plus className="w-5 h-5" />
        Create New Event
      </button>
    </div>
  );
}

function EventsTable({ data, onDuplicate, onDelete }) {
  if (data.length === 0) {
    return (
      <div className="p-12 text-center text-[#90b2cb]">
        No events found matching your criteria.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#101b22]/50 border-b border-[#2c3b47] text-[#90b2cb] text-xs uppercase tracking-wider">
            <th className="px-6 py-4 font-medium w-[30%]">Event Name</th>
            <th className="px-6 py-4 font-medium">Date & Time</th>
            <th className="px-6 py-4 font-medium">Venue</th>
            <th className="px-6 py-4 font-medium">Tickets Sold</th>
            <th className="px-6 py-4 font-medium">Status</th>
            <th className="px-6 py-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2c3b47]">
          {data.map((event) => (
            <EventRow 
              key={event.id} 
              event={event} 
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventRow({ event, onDuplicate, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);

  // Status styling logic
  const getStatusStyles = (status) => {
    switch (status) {
      case 'Live': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Draft': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Completed': return 'bg-[#2c3b47] text-[#90b2cb] border-[#3e5060]';
      case 'Scheduled': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

  const getStatusDotColor = (status) => {
    switch (status) {
      case 'Live': return 'bg-emerald-400';
      case 'Draft': return 'bg-amber-400';
      case 'Completed': return 'bg-[#90b2cb]';
      case 'Scheduled': return 'bg-purple-400';
      default: return 'bg-gray-400';
    }
  };

  const getProgressColor = (status) => {
    if (status === 'Completed') return 'bg-[#90b2cb]';
    if (status === 'Draft') return 'bg-blue-500';
    if (status === 'Scheduled') return 'bg-gray-600';
    return 'bg-[#0d93f2]';
  };

  return (
    <tr className="hover:bg-[#223949]/30 transition-colors group relative">
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#2c3b47] flex items-center justify-center shrink-0">
            <event.icon className="w-6 h-6 text-[#90b2cb]" />
          </div>
          <div>
            <h4 className="text-white font-medium text-sm mb-0.5">{event.name}</h4>
            <p className="text-[#90b2cb] text-xs">{event.category}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-white">{event.date}</div>
        <div className="text-xs text-[#90b2cb]">{event.time}</div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-white">{event.venue}</div>
        <div className="text-xs text-[#90b2cb]">{event.location}</div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1 w-32">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white">{event.ticketsSold.toLocaleString()}</span>
            <span className="text-[#90b2cb]">{event.capacityPercentage}%</span>
          </div>
          <div className="w-full bg-[#101b22] h-1.5 rounded-full overflow-hidden">
            <div 
              className={`${getProgressColor(event.status)} h-full rounded-full`} 
              style={{ width: `${event.capacityPercentage}%` }}
            ></div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyles(event.status)}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(event.status)}`}></span>
          {event.status}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        {/* FIXED HERE: 
           - 'opacity-100' makes it visible by default (Mobile)
           - 'md:opacity-0 md:group-hover:opacity-100' applies hover effect ONLY on Desktop
        */}
        <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button className="p-2 hover:bg-[#2c3b47] rounded-lg text-[#90b2cb] hover:text-white transition-colors" title="Edit">
            <Edit className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-[#2c3b47] rounded-lg text-[#90b2cb] hover:text-white transition-colors" title="Analytics">
            <LineChart className="w-5 h-5" />
          </button>
          <button onClick={() => onDuplicate(event)} className="p-2 hover:bg-[#2c3b47] rounded-lg text-[#90b2cb] hover:text-white transition-colors" title="Duplicate">
            <Copy className="w-5 h-5" />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-[#2c3b47] rounded-lg text-[#90b2cb] hover:text-white transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-32 bg-[#192734] border border-[#2c3b47] rounded-lg shadow-xl z-20 overflow-hidden flex flex-col">
                 <button className="flex items-center gap-2 px-4 py-2 text-xs text-[#90b2cb] hover:text-white hover:bg-[#2c3b47] text-left">
                    <Eye className="w-3 h-3" /> View Live
                 </button>
                 <button onClick={() => onDelete(event.id)} className="flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-[#2c3b47] text-left">
                    <Trash2 className="w-3 h-3" /> Delete
                 </button>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="px-6 py-4 border-t border-[#2c3b47] flex flex-col sm:flex-row items-center justify-between bg-[#101b22]/30 gap-4">
      <div className="text-xs text-[#90b2cb]">
        Showing <span className="font-medium text-white">{totalItems > 0 ? startItem : 0}</span> to <span className="font-medium text-white">{endItem}</span> of <span className="font-medium text-white">{totalItems}</span> events
      </div>
      <div className="flex gap-2">
        <button 
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-xs font-medium text-[#90b2cb] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2c3b47] rounded transition-colors flex items-center"
        >
          <ChevronLeft className="w-3 h-3 mr-1" /> Previous
        </button>
        
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
           <button 
             key={page}
             onClick={() => onPageChange(page)}
             className={`px-3 py-1.5 text-xs font-medium rounded shadow-sm transition-colors ${
               currentPage === page 
                 ? 'text-white bg-[#0d93f2] hover:bg-[#0b84db]' 
                 : 'text-[#90b2cb] hover:text-white hover:bg-[#2c3b47]'
             }`}
           >
             {page}
           </button>
        ))}

        <button 
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-3 py-1.5 text-xs font-medium text-[#90b2cb] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2c3b47] rounded transition-colors flex items-center"
        >
          Next <ChevronRight className="w-3 h-3 ml-1" />
        </button>
      </div>
    </div>
  );
}