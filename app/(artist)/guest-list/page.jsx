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

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/artist/guest-list?eventId=13');
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
  }, []);

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
          eventId: '13',
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
          body: JSON.stringify({ eventId: '13', clearAll: true })
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
    link.setAttribute("download", `guest_list_event_13_${new Date().toISOString().split('T')[0]}.csv`);
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