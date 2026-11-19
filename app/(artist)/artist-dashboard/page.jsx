'use client';
import { useState, useEffect } from 'react';
import { MessageSquare, Settings, Users, Music } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LiveShowCard,
  TicketStatsCard,
  MerchAlert,
  StatGrid,
  UpcomingStops,
  DaySheetCard,
} from '@/components/artist/dashboard/dashboard-parts';

export default function ArtistDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/artist/dashboard');
        const json = await res.json();

        if (json.success) {
          setData(json.data);
        }
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);

  const handleStatAction = (actionType) => {
    if (actionType === 'revenue_breakdown') {
      setShowRevenueModal(true);
    }
  };

  const handleTaskComplete = async (taskId) => {
    try {
      const res = await fetch('/api/production/logistics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: 'Done' })
      });
      if (res.ok) {
        setData(prev => ({
          ...prev,
          alert: {
            ...prev.alert,
            tasks: prev.alert.tasks.filter(t => t._id !== taskId),
            message: `You have ${prev.alert.tasks.length - 1} Urgent Tasks Pending`
          }
        }));
        if (data.alert.tasks.length <= 1) {
          setTimeout(() => setShowAlertModal(false), 500);
        }
      }
    } catch (e) {
      console.error("Failed to complete task", e);
    }
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowRevenueModal(false);
        setShowAlertModal(false);
      }
    };
    if (showRevenueModal) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showRevenueModal, showAlertModal]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7f8] dark:bg-[#101b22] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-[#a855f7] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-slate-500 dark:text-slate-400 font-medium">Loading Tour Data...</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#f5f7f8] dark:bg-[#101b22] text-slate-900 dark:text-white font-sans relative">

      {}
      {showAlertModal && data.alert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAlertModal(false)}>
          <div
            className="bg-white dark:bg-[#1e2e38] rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-red-500/30 outline-none"
            onClick={e => e.stopPropagation()}
            tabIndex="-1" // Allow focus
            ref={(el) => el && el.focus()} // Auto-focus on mount
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Urgent Tasks
              </h3>
              <button onClick={() => setShowAlertModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
              {data.alert.tasks && data.alert.tasks.map((task) => (
                <div key={task._id} className="flex justify-between items-center p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors group">
                  <div>
                    <p className="font-bold text-white">{task.title}</p>
                    <p className="text-xs text-red-300 font-medium uppercase tracking-wide">High Priority • Due {task.dueDate || 'ASAP'}</p>
                  </div>
                  <button
                    onClick={() => handleTaskComplete(task._id)}
                    className="px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg text-xs font-bold hover:bg-green-500 hover:text-white transition-all flex items-center gap-1"
                  >
                    Mark Done
                  </button>
                </div>
              ))}
              {(!data.alert.tasks || data.alert.tasks.length === 0) && (
                <div className="text-center py-8 text-slate-400">
                  <p>All clear! No urgent tasks.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
        className="flex-1 w-full max-w-[1400px] mx-auto p-6 md:p-8 flex flex-col gap-8"
      >

        {}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-slate-900 dark:text-white tracking-tight text-3xl md:text-4xl font-bold leading-tight">
              Tour Hub: {data.tourName}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Overview of today&apos;s logistics and tour status.</p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-[#1e2e38] p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">

            <a href="/tech-rider#crew-messenger" className="group flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400">
              <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span>Message the crew</span>
            </a>

          </div>
        </div>

        {}
        <div className="flex flex-col gap-6">
          {}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <div className="lg:col-span-2 h-full">
              <LiveShowCard data={data.currentShow} />
            </div>
            <div className="lg:col-span-1 h-full">
              <DaySheetCard
                onClick={() => window.location.href = '/day-sheet'}
                data={[
                  { time: "14:00", event: "Load In", status: "past" },
                  { time: "16:00", event: "Soundcheck", status: "past" },
                  { time: data.currentShow?.doorsOpen || "19:00", event: "Doors Open", status: "active" },
                  { time: data.currentShow?.showStart || "20:00", event: "Showtime", status: "future" },
                ]}
              />
            </div>
          </div>

          {}
          <MerchAlert data={data.alert} onClick={() => setShowAlertModal(true)} />
        </div>

        {/* (no ticket revenue: StageVerse doesn't sell tickets) */}
        <StatGrid data={data.quickStats.filter((st) => st.label !== 'Gross Rev')} onAction={handleStatAction} />

        <UpcomingStops data={data.stops} />

      </motion.main>
    </div>
  );
}