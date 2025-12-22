'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import StudioNavbar from '@/components/production/StudioNavbar';
import DashboardHeader from '@/components/production/dashboard/DashboardHeader';
import ActiveShowsGrid from '@/components/production/dashboard/ActiveShowsGrid';
import DashboardSidebar from '@/components/production/dashboard/DashboardSidebar';

// --- MOCK USER DATA ---
const MOCK_USER_DATA = {
  name: 'Alex M.',
  role: 'Lighting Designer',
  currentProject: 'Neon Nights Tour (Mumbai)',
  stats: {
    pending: 1,
    conflicts: 2,
    tasks: 5
  },
  shows: [
    { 
      id: '101', 
      title: 'Neon Nights Tour', 
      venue: 'Mumbai Arena', 
      date: 'Dec 05, 2025', 
      status: 'active',
      type: 'Touring', 
      typeColor: 'bg-blue-500',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnVj5hRL8AOfL32wFRk1t6vNfXjCJGtYEdyHYBibnuH2byrvZsXsL1qovr4Is69A7PA7tIOYblHGsCqwynXXVJzbew0GlvIPmmvwId9pB0aUd4C7ZqsJBXgE5l1YCnOH7Xwx9UJ_TGCjgg1YyovrOkWh7oruXuzYUPltvT5dl45lFB25khObV__7ZuXqhGhuTWgopTGWHAsw8tWiAn00JaNlLYauRfrbfiZ0geMjsPWRkJGBVsw8dxrgxc55wDKaGmmtVDghJ_X7Tg'
    },
    { 
      id: '102', 
      title: 'Synthwave Sunset', 
      venue: 'The Roxy, LA', 
      date: 'Nov 12-14, 2025', 
      status: 'active',
      type: 'Festival', 
      typeColor: 'bg-indigo-500',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDGVyKiqTzz6dYasHoxqAR8XdR3qhWhpmQIgMwWhxTKTxr8bz62u6Cuq6zDLbVXXDd57OznD-lLWlAld2R-XFLSrfyNP4xm-vzK1KWT9Yv6zToHn-wh6RXNqoilPSDIHcgEpd9f60Sxjo56EdQb7CF5hczRm5WCBNHdWc0dpnNSM06rV-Z9wEOg4J5F2R-Qq1rEIMukmHK9YOyUfHMG6eRv9_n_vUNwyT_gDyAIA94RWMF2E3dxkuo3BG0fKPpthcM4i9pm3K17dIix'
    },
    { 
      id: '103', 
      title: 'TechCrunch Keynote', 
      venue: 'Moscone Center', 
      date: 'Jan 10, 2026', 
      status: 'archived',
      type: 'Corporate', 
      typeColor: 'bg-slate-600',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCSszewq5PIfOmer4kYgOEQ_zEcw3hXDhubp_mv6b3bPNDqchz_HBW4sto8wN7VVl9vztqvmggwOHZUp8haOg2jDHlehl7HieF24XfR-60eL-7K1G1ar9aTwY-_lIq0Vlrq5rE81J0qyZX-oBHJ4q4UAxPMZa0WvwkZg-vFV2050kJ__vL5YtJ9IpbgrRXK0AGgO7xxikZBhq5xqlwctvkfQAxfzcFkaaKnpgfx1-rLzjmt3qnYsaC7dCwxjc43_5_LYkPTfeypBot'
    }
  ],
  tasks: [
    { id: 1, title: 'Finalize patch list for Mumbai', priority: 'High', color: 'red', due: '2h' },
    { id: 2, title: 'Review riser plot conflicts', priority: 'In Progress', color: 'amber', due: 'Tomorrow' },
    { id: 3, title: 'Update fixture inventory', priority: 'To Do', color: 'blue', due: 'Nov 10' }
  ],
  // In app/(production)/dashboard/page.jsx

activity: [
  { 
    id: 1, 
    text: 'Rider for Synthwave Sunset received.', 
    time: 'Just now', 
    type: 'document', // Blue Icon
    link: '/logistics/102' // Goes to Logistics Page
  },
  { 
    id: 2, 
    text: 'Conflict detected in Mumbai Arena plot.', 
    time: '2 hours ago', 
    type: 'warning',  // Red Icon
    link: '/patch-studio/101' // Goes to Patch Studio
  },
  { 
    id: 3, 
    text: 'Fixture library updated to v2.4.0', 
    time: 'Yesterday', 
    type: 'system',   // Gray Icon
    link: '#' // System settings (or no link)
  }
]
};

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    // Simulate Fetch
    setTimeout(() => {
      setData(MOCK_USER_DATA);
      setIsLoading(false);
    }, 600);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-[#0F0F10] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#0F0F10] font-sans text-slate-300 overflow-hidden">
      
      {/* 1. Global Nav */}
      <StudioNavbar />

      {/* 2. Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <main className="w-full max-w-[1400px] mx-auto p-6 md:p-8 lg:p-10">
          
          {/* Header & Stats */}
          <DashboardHeader user={data} stats={data.stats} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN: Active Shows */}
            <div className="lg:col-span-8 flex flex-col gap-6">
               <ActiveShowsGrid initialActiveShows={data.shows} />
            </div>

            {/* RIGHT COLUMN: Sidebar (Tasks & Activity) */}
            <div className="lg:col-span-4 flex flex-col gap-8">
               <DashboardSidebar tasks={data.tasks} activity={data.activity} />
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}