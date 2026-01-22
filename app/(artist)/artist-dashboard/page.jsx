'use client';
import { useState, useEffect } from 'react';
import { MessageSquare, Settings, Users, Music } from 'lucide-react';
import { motion } from 'framer-motion';
import ArtistNavbar from '@/components/artist/ArtistNavbar';
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
      if (res.ok) {        setData(prev => ({
          ...prev,
          alert: {
            ...prev.alert,
            tasks: prev.alert.tasks.filter(t => t._id !== taskId),
            message: `You have ${prev.alert.tasks.length - 1} Urgent Tasks Pending`
          }
        }));        if (data.alert.tasks.length <= 1) {
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
          <div className="w-8 h-8 border-4 border-[#0d93f2] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-slate-500 dark:text-slate-400 font-medium">Loading Tour Data...</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#f5f7f8] dark:bg-[#101b22] text-slate-900 dark:text-white font-sans relative">
      <ArtistNavbar />

      {}
      {showRevenueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowRevenueModal(false)}>
          <div className="bg-white dark:bg-[#1e2e38] rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-700/50" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Gross Revenue Breakdown</h3>
              <button onClick={() => setShowRevenueModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
              {data.revenueBreakdown && data.revenueBreakdown.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-[#101b23] border border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{item.city}</p>
                    <p className="text-xs text-slate-500">{new Date(item.date).toLocaleDateString()}</p>
                  </div>
                  <p className="font-mono font-bold text-[#0d93f2]">${(item.revenue / 1000).toFixed(1)}k</p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-700 flex justify-between items-center">
              <span className="text-slate-400 font-medium">Total Tour Gross</span>
              <span className="text-2xl font-black text-emerald-400">
                {data.quickStats.find(s => s.label === "Gross Rev")?.value}
              </span>
            </div>
          </div>
        </div>
      )}

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
            <p className="text-slate-500 dark:text-slate-400 mt-1">Overview of today's logistics and tour status.</p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-[#1e2e38] p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">

            <a href="/tech-rider#crew-messenger" className="group flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400">
              <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="hidden md:inline">Message Crew</span>
            </a>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

            <a href="/tech-rider" className="group flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
              <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                <Settings className="w-4 h-4" />
              </div>
              <span className="hidden md:inline">Rider</span>
            </a>

            <a href="/guest-list" className="group flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Users className="w-4 h-4" />
              </div>
              <span className="hidden md:inline">Guests</span>
            </a>

            <a href="/setlist-builder" className="group flex items-center gap-2 px-3 py-2 bg-[#0d93f2] hover:bg-[#0b84db] text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all ml-1">
              <Music className="w-4 h-4" />
              <span>Setlist Builder</span>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            <TicketStatsCard data={data.ticketStats} />
            <MerchAlert data={data.alert} onClick={() => setShowAlertModal(true)} />
          </div>
        </div>

        <StatGrid data={data.quickStats} onAction={handleStatAction} />

        <UpcomingStops data={data.stops} />

      </motion.main>
    </div>
  );
}