'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from "sonner";
import ArtistNavbar from '@/components/artist/ArtistNavbar';
import GuestListHeader from '@/components/artist/guestlist/Header';
import StatsGrid from '@/components/artist/guestlist/StatsGrid';
import AddGuestForm from '@/components/artist/guestlist/AddGuestForm';
import GuestTable from '@/components/artist/guestlist/GuestTable';
import { Loader2 } from 'lucide-react';

export default function GuestListPage() {
  const [guests, setGuests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingGuest, setEditingGuest] = useState(null);
  // The artist's own shows (this page used to be hardcoded to event 13)
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const res = await fetch('/api/artist/day-sheet', { cache: 'no-store' });
        const json = await res.json();
        const list = json.success ? json.data : [];
        setEvents(list);
        // Default to the next upcoming show, else the most recent one
        const upcoming = list.find(e => new Date(e.date) >= new Date());
        const fallback = list[list.length - 1];
        if (upcoming || fallback) setEventId((upcoming || fallback)._id);
        else setIsLoading(false);
      } catch (e) {
        toast.error("Could not load your shows");
        setIsLoading(false);
      }
    };
    loadEvents();
  }, []);

  useEffect(() => {
    if (!eventId) return;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/artist/guest-list?eventId=${eventId}`);
        const json = await res.json();
        if (json.success) {
          const mapped = json.data.map(g => ({
            ...g,
            id: g._id,
            initials: g.name.substring(0, 2).toUpperCase(),
            color: 'indigo'
          }));
          setGuests(mapped);
        }
      } catch (e) {
        console.error("Failed to load guest list");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [eventId]);

  const stats = useMemo(() => {
    return {
      total: guests.length,
      allAccess: guests.filter(g => g.tier === 'All Access').length,
      vip: guests.filter(g => g.tier === 'VIP').length,
      afterparty: guests.filter(g => g.tier === 'Afterparty').length,
    };
  }, [guests]);

  const handleAddGuest = async (formData) => {
    try {
      const res = await fetch('/api/artist/guest-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          name: formData.name,
          email: formData.email,
          tier: formData.tier
        })
      });
      const json = await res.json();
      if (json.success) {
        const newGuest = {
          ...json.data,
          id: json.data._id,
          initials: json.data.name.substring(0, 2).toUpperCase(),
          color: 'blue'
        };
        setGuests(prev => [newGuest, ...prev]);
      }
    } catch (e) {
      toast.error("Failed to add guest");
    }
  };

  const handleUpdateGuest = async (formData) => {
    try {
      const res = await fetch('/api/artist/guest-list', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingGuest.id,
          ...formData
        })
      });

      if (res.ok) {
        setGuests(prev => prev.map(g =>
          g.id === editingGuest.id
            ? { ...g, ...formData, initials: formData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) }
            : g
        ));
        setEditingGuest(null);
      } else {
        toast.error("Failed to update guest");
      }
    } catch (e) {
      console.error("Update failed", e);
      toast.error("Failed to update guest");
    }
  };

  const handleDeleteGuest = (id) => {
    if (confirm('Are you sure you want to remove this guest?')) {
      setGuests(prev => prev.filter(guest => guest.id !== id));
      if (editingGuest?.id === id) setEditingGuest(null);
    }
  };
  const handleNewList = async () => {
    if (confirm('Are you sure you want to clear the entire list? This action cannot be undone.')) {
      try {
        const res = await fetch('/api/artist/guest-list', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, clearAll: true })
        });
        if (res.ok) {
          setGuests([]);
          setEditingGuest(null);
        } else {
          toast.error("Failed to clear list.");
        }
      } catch (e) {
        console.error("Failed to clear list", e);
      }
    }
  };
  const handleExportCSV = () => {
    if (guests.length === 0) return toast.error("List is empty!");

    const headers = ["Name", "Email", "Tier", "Status", "Added At"];
    const rows = guests.map(g => [
      `"${g.name}"`,
      `"${g.email || ''}"`,
      g.tier,
      g.status,
      new Date(g.addedAt).toLocaleDateString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `guest_list_${events.find(e => e._id === eventId)?.title?.replace(/W+/g, '_') || 'event'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCheckIn = async (guestId, currentStatus) => {
    const newStatus = currentStatus === 'Checked In' ? 'Pending' : 'Checked In'; // Toggle
    try {
      setGuests(prev => prev.map(g =>
        g.id === guestId ? { ...g, status: newStatus } : g
      ));

      const res = await fetch('/api/artist/guest-list', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: guestId, status: newStatus })
      });

      if (!res.ok) throw new Error("Failed to update");

    } catch (e) {
      console.error("Check-in failed", e);
      setGuests(prev => prev.map(g =>
        g.id === guestId ? { ...g, status: currentStatus } : g
      ));
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] dark:bg-[#101b22] text-slate-900 dark:text-white font-sans flex flex-col overflow-x-hidden">
      <ArtistNavbar />

      <main className="flex-1 w-full max-w-7xl mx-auto p-6 flex flex-col gap-6">

        {}
        <GuestListHeader onNewList={handleNewList} onExport={handleExportCSV} />

        {events.length > 0 ? (
          <label className="flex items-center gap-3 text-sm text-slate-500 dark:text-[#90b2cb]">
            Show
            <select
              value={eventId || ''}
              onChange={(e) => setEventId(e.target.value)}
              className="bg-white dark:bg-[#182934] border border-slate-200 dark:border-[#315168] rounded-lg px-3 py-2 text-slate-900 dark:text-white"
            >
              {events.map(ev => (
                <option key={ev._id} value={ev._id}>
                  {ev.title} — {new Date(ev.date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </label>
        ) : (
          !isLoading && <p className="text-sm text-slate-500 dark:text-[#90b2cb]">You have no shows yet, so there is no guest list to manage.</p>
        )}

        <StatsGrid stats={stats} isLoading={isLoading} />

        <div className="grid lg:grid-cols-3 gap-6">
          <AddGuestForm
            onAdd={handleAddGuest}
            onUpdate={handleUpdateGuest}
            editingGuest={editingGuest}
            onCancel={() => setEditingGuest(null)}
          />

          {isLoading ? (
            <div className="lg:col-span-2 flex items-center justify-center h-64 bg-white dark:bg-[#182934] rounded-xl border border-slate-200 dark:border-[#315168]">
              <Loader2 className="w-8 h-8 animate-spin text-[#0d93f2]" />
            </div>
          ) : (
            <GuestTable
              data={guests}
              onDelete={handleDeleteGuest}
              onEdit={setEditingGuest}
              onCheckIn={handleCheckIn}
            />
          )}
        </div>
      </main>
    </div>
  );
}