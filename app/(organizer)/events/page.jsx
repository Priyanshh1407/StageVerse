'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Bell, Search, Filter, CalendarDays, Plus, MoreVertical,
  Music, Mic, Palette, Trophy, Utensils, Edit, LineChart, Copy,
  ChevronLeft, ChevronRight, Menu, Trash2, CheckCircle, Eye, RefreshCw
} from 'lucide-react';
import { toast } from "sonner";
import OrganizerSidebar from '@/components/organizer/OrganizerSidebar';

export default function EventsPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- STATE FOR INTERACTIVITY ---
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Fetch events 
  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/events?mode=organizer');
      const data = await res.json();

      if (data.success) {
        const formatedEvents = data.data.map(event => {

          let totalSold = 0;
          let totalCapacity = 0;

          if (event.ticketTiers && event.ticketTiers.length > 0) {
            event.ticketTiers.forEach(tier => {
              totalSold += (tier.sold || 0);
              totalCapacity += (tier.capacity || 0);
            });
          }

          const capacityPercentage = totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0;

          return {
            id: event._id,
            eventId: event.eventId,
            name: event.title,
            artist: event.artist || 'TBA',
            category: `${event.genre || 'General'} • ${event.vibe || 'Event'}`,
            date: new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: event.time,
            venue: event.venue?.name || 'Unknown Venue',
            location: event.city,
            ticketsSold: totalSold,
            capacityPercentage: capacityPercentage,
            status: event.status || 'Scheduled',
            icon: getCategoryIcon(event.genre)
          };
        });
        setEvents(formatedEvents);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

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

  const handleViewLive = (eventId) => {
    window.open(`/event/${eventId}`, '_blank');
  };

  const handleEdit = (event) => {
    const idToUse = event.eventId || event.id;
    router.push(`/create-event?id=${idToUse}`);
  }

  const handleAnalytics = (id) => {
    router.push(`/manage/events/${id}/analytics`);
  }

  const handleDuplicate = async (event) => {
    if (!confirm(`Duplicate "${event.name}"?`)) return;

    setIsLoading(true);
    try {
      // A. Fetch full raw details of the event first (to get clean data)
      const res = await fetch(`/api/events/${event.id}`); // Using the Long ID
      const json = await res.json();

      if (!json.success) throw new Error("Failed to fetch original event");
      const originalEvent = json.data;

      // B. Prepare payload (Remove IDs, dates, and add 'Copy')
      const payload = {
        title: `${originalEvent.title} (Copy)`,
        description: originalEvent.description,
        artist: originalEvent.artist,
        genre: originalEvent.genre,
        vibe: originalEvent.vibe,
        date: originalEvent.date, // Keep original date or reset? Keeping for now.
        time: originalEvent.time,
        city: originalEvent.city,
        venue: originalEvent.venue?._id || originalEvent.venue, // Ensure we send ID
        status: 'Draft', // Always reset status to Draft
        ticketTiers: originalEvent.ticketTiers.map(tier => ({
          name: tier.name,
          price: tier.price,
          capacity: tier.capacity,
          sold: 0, // Reset sold count
          status: 'Active'
        }))
      };

      // C. Create the new Event
      const createRes = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (createRes.ok) {
        toast.success("Event Duplicated Successfully!");
        fetchEvents(); // Refresh the table
      } else {
        toast.error("Failed to duplicate.");
      }
    } catch (error) {
      console.error("Duplicate error:", error);
      toast.error("Error duplicating event.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this event permanently?")) {
      try {
        // Optimistic update
        setEvents(prev => prev.filter(e => e.id !== id));
        await fetch(`/api/events/${id}`, { method: 'DELETE' });
      } catch (err) {
        toast.error("Failed to delete event");
        fetchEvents();
      }
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

  const getCategoryIcon = (genre) => {
    if (!genre) return Music;
    const g = genre.toLowerCase();
    if (g.includes('tech') || g.includes('business')) return Mic;
    if (g.includes('art') || g.includes('theater')) return Palette;
    if (g.includes('sport')) return Trophy;
    if (g.includes('food')) return Utensils;
    return Music;
  };

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
              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[#90b2cb] gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#0d93f2]" />
                  <p>Loading your events...</p>
                </div>
              ) : (
                <>
                  <EventsTable
                    data={currentData}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onEdit={handleEdit}
                    onAnalytics={handleAnalytics}
                    onViewLive={handleViewLive}
                  />

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredEvents.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                  />
                </>
              )}
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

function EventsTable({ data, onDuplicate, onDelete, onEdit, onAnalytics, onViewLive }) {
  if (data.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center gap-4 text-[#90b2cb]">
        <div className="w-16 h-16 rounded-full bg-[#101b22] border border-[#2c3b47] flex items-center justify-center">
          <CalendarDays className="w-8 h-8 opacity-50" />
        </div>
        <div>
          <h3 className="text-white font-medium mb-1">No Events Found</h3>
          <p className="text-sm">Create your first event to see it here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#101b22]/50 border-b border-[#2c3b47] text-[#90b2cb] text-xs uppercase tracking-wider">
            <th className="px-6 py-4 font-medium w-[25%]">Event Name</th>
            <th className="px-6 py-4 font-medium">Artist</th>
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
              onEdit={onEdit}
              onAnalytics={onAnalytics}
              onViewLive={onViewLive}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventRow({ event, onDuplicate, onDelete, onEdit, onAnalytics, onViewLive }) {
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
      {/* 2. ARTIST COLUMN */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <Mic className="w-3 h-3 text-[#90b2cb]" /> {/* Optional icon */}
          <span className="text-sm text-white font-medium">{event.artist}</span>
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
          <button
            onClick={() => onEdit(event)}
            className="p-2 hover:bg-[#2c3b47] rounded-lg text-[#90b2cb] hover:text-white transition-colors"
            title="Edit">
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={() => onAnalytics(event.id)}
            className="p-2 hover:bg-[#2c3b47] rounded-lg text-[#90b2cb] hover:text-white transition-colors" title="Analytics">
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
                <button
                  onClick={() => onViewLive(event.id)}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-[#90b2cb] hover:text-white hover:bg-[#2c3b47] text-left">
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
            className={`px-3 py-1.5 text-xs font-medium rounded shadow-sm transition-colors ${currentPage === page
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