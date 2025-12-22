'use client';

import { useState, useEffect, useMemo } from 'react';
import ArtistNavbar from '@/components/artist/ArtistNavbar';
import GuestListHeader from '@/components/artist/guestlist/Header';
import StatsGrid from '@/components/artist/guestlist/StatsGrid';
import AddGuestForm from '@/components/artist/guestlist/AddGuestForm';
import GuestTable from '@/components/artist/guestlist/GuestTable';
import { Loader2 } from 'lucide-react';

const MOCK_DB_GUESTS = [
  { id: 1, name: 'Sarah Miller', email: 'sarah.m@example.com', initials: 'SM', color: 'indigo', tier: 'All Access', status: 'Checked In', added: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
  { id: 2, name: 'James Doe', email: '+1 555-0123', initials: 'JD', color: 'purple', tier: 'VIP', status: 'Pending', added: new Date(Date.now() - 1000 * 60 * 25).toISOString() },
  { id: 3, name: 'Anna Lee', email: 'anna@lee.com', initials: 'AL', color: 'pink', tier: 'Afterparty', status: 'Pending', added: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
  { id: 4, name: 'Ryan King', email: 'ryan.k@agency.com', initials: 'RK', color: 'blue', tier: 'All Access', status: 'Checked In', added: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
  { id: 5, name: 'Marcus Lee', email: 'marcus@test.com', initials: 'ML', color: 'orange', tier: 'Afterparty', status: 'Pending', added: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
];

export default function GuestListPage() {
  const [guests, setGuests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingGuest, setEditingGuest] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      await new Promise(resolve => setTimeout(resolve, 800));
      setGuests(MOCK_DB_GUESTS);
      setIsLoading(false);
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

  // --- ACTIONS ---

  const handleAddGuest = (formData) => {
    const newGuest = {
      id: Date.now(),
      name: formData.name,
      email: formData.email,
      tier: formData.tier,
      initials: formData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
      color: ['blue', 'purple', 'indigo', 'pink', 'orange'][Math.floor(Math.random() * 5)],
      status: formData.status || 'Pending',
      added: new Date().toISOString()
    };
    setGuests(prev => [newGuest, ...prev]);
  };

  const handleUpdateGuest = (formData) => {
    setGuests(prev => prev.map(g => 
      g.id === editingGuest.id 
        ? { ...g, ...formData, initials: formData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) } 
        : g
    ));
    setEditingGuest(null);
  };

  const handleDeleteGuest = (id) => {
    if (confirm('Are you sure you want to remove this guest?')) {
        setGuests(prev => prev.filter(guest => guest.id !== id));
        if (editingGuest?.id === id) setEditingGuest(null);
    }
  };

  // NEW: Handle New List (Clear All)
  const handleNewList = () => {
    if (confirm('Create a new list? This will remove all current guests.')) {
      setGuests([]);
      setEditingGuest(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] dark:bg-[#101b22] text-slate-900 dark:text-white font-sans flex flex-col overflow-x-hidden">
      <ArtistNavbar />

      <main className="flex-1 w-full max-w-7xl mx-auto p-6 flex flex-col gap-6">
        
        {/* Pass the handler to the header */}
        <GuestListHeader onNewList={handleNewList} />
        
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
             />
          )}
        </div>
      </main>
    </div>
  );
}