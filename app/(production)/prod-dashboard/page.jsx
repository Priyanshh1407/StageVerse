'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import StudioNavbar from '@/components/production/StudioNavbar';
import DashboardHeader from '@/components/production/dashboard/DashboardHeader';
import ActiveShowsGrid from '@/components/production/dashboard/ActiveShowsGrid';
import DashboardSidebar from '@/components/production/dashboard/DashboardSidebar';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch('/api/production/dashboard');
        if (res.status === 401) {
          setError("Unauthorized"); // Handle easier redirect later
          return;
        }
        const json = await res.json();

        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || "Failed to load dashboard");
        }
      } catch (err) {
        console.error(err);
        setError("System Error");
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-[#0F0F10] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen w-full bg-[#0F0F10] items-center justify-center flex-col gap-4">
        <p className="text-red-500 font-bold">{error || "No data available"}</p>
        <button onClick={() => window.location.reload()} className="text-blue-500 underline text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#0F0F10] font-sans text-slate-300 overflow-hidden">

      <StudioNavbar />

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <motion.main
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1 }
            }
          }}
          className="w-full max-w-[1400px] mx-auto p-6 md:p-8 lg:p-10"
        >

          <motion.div variants={{ hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0 } }}>
            <DashboardHeader
              user={data.user}
              stats={{
                pending: data.stats.pending,
                conflicts: data.stats.conflicts,
                tasks: data.tasks ? data.tasks.length : 0
              }}
            />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            <motion.div variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }} className="lg:col-span-8 flex flex-col gap-6">
              <ActiveShowsGrid initialActiveShows={data.shows} />
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 } }} className="lg:col-span-4 flex flex-col gap-8">
              <DashboardSidebar tasks={data.tasks} activity={data.activity} />
            </motion.div>

          </div>
        </motion.main>
      </div>
    </div>
  );
}