'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, Circle, Clock, Filter, Plus, Search,
  MoreHorizontal, Calendar, ArrowUpRight, X, Trash2, Pencil, Check, ArrowLeft, Loader2
} from 'lucide-react';
import StudioNavbar from '@/components/production/StudioNavbar';
import { toast } from 'sonner';

export default function GlobalTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [shows, setShows] = useState([]);
  useEffect(() => {
    fetch('/api/production/dashboard').then((r) => r.json())
      .then((j) => { if (j.success) setShows((j.data.shows || []).filter((x) => x.status !== 'archived').map((x) => ({ id: String(x.id), title: x.title, venue: x.venue }))); })
      .catch(() => {});
  }, []);
  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/production/tasks');
      const json = await res.json();
      if (json.success) setTasks(json.data);
    } catch (e) {
      console.error("Failed to fetch tasks", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: syncing with the server is what this effect is for
    fetchTasks();
  }, []);

  const handleSaveTask = async (taskData) => {
    try {
      const res = await fetch('/api/production/tasks', {
        method: editingTask ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTask ? { id: editingTask.id, ...taskData } : taskData)
      });
      if (!res.ok) {
        // Keep the modal open so the user can fix the problem (e.g. no show selected)
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || 'Could not save the task');
        return;
      }
      fetchTasks();
      closeModal();
    } catch (e) {
      toast.error('Network error: task not saved');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await fetch(`/api/production/tasks?id=${id}`, { method: 'DELETE' });
        setTasks(tasks.filter(t => t.id !== id));
      } catch (e) { console.error(e); }
    }
  };

  const handleToggleComplete = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    setTasks(tasks.map(t => t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t));

    try {
      await fetch('/api/production/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: task.status === 'completed' ? 'pending' : 'completed' })
      });
    } catch (e) {
      console.error(e);
      fetchTasks(); // Revert on error
    }
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };
  const filteredTasks = tasks.filter(task => {
    const matchesFilter = filter === 'all' || (filter === 'completed' && task.status === 'completed') || (filter === 'pending' && task.status === 'pending');
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || task.show.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex flex-col h-screen w-full bg-[#0F0F10] font-sans text-slate-300 overflow-hidden">
      <StudioNavbar />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0F0F10]">

          {}
          <div className="px-6 py-8 border-b border-[#27272A]">
            <div className='mb-2'>
              <Link
                href="/prod-dashboard"
                className='inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors'
              >
                <ArrowLeft className='w-4 h-4' />
                Back to Dashboard
              </Link>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Global Task Manager</h1>
                <p className="text-gray-500 text-sm mt-1">Manage deliverables across all active productions.</p>
              </div>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] hover:brightness-110 text-black px-4 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-orange-600/20"
              >
                <Plus className="w-4 h-4" />
                Create Task
              </button>
            </div>

            {}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
              <div className="flex items-center gap-2 bg-[#18181B] p-1 rounded-lg border border-[#27272A]">
                {['all', 'pending', 'completed'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all capitalize ${filter === f ? 'bg-[#27272A] text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search tasks or shows..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 placeholder:text-gray-600 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="max-w-5xl mx-auto space-y-3">
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
              ) : (
                <>
                  {filteredTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={() => handleToggleComplete(task.id)}
                      onDelete={() => handleDelete(task.id)}
                      onEdit={() => openEditModal(task)}
                    />
                  ))}

                  {filteredTasks.length === 0 && (
                    <div className="text-center py-20 text-gray-600">
                      <p>No tasks found.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

        </main>
      </div>

      {}
      {isModalOpen && (
        <TaskModal
          task={editingTask}
          shows={shows}
          onClose={closeModal}
          onSave={handleSaveTask}
        />
      )}

    </div>
  );
}

function TaskRow({ task, onToggle, onDelete, onEdit }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPriorityColor = (p) => {
    if (p === 'High') return 'text-red-400 bg-red-400/10 border-red-400/20';
    if (p === 'Medium') return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    return 'text-orange-400 bg-orange-400/10 border-purple-400/20';
  };

  return (
    <div className="group flex items-center gap-4 bg-[#18181B] border border-[#27272A] p-4 rounded-xl hover:border-purple-500/30 transition-all shadow-sm relative">

      {}
      <button
        onClick={onToggle}
        className={`shrink-0 transition-colors ${task.status === 'completed' ? 'text-green-500' : 'text-gray-600 hover:text-orange-500'}`}
      >
        {task.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
      </button>

      {}
      <button type="button" onClick={onEdit} aria-label={`Open task: ${task.title}`} className="flex-1 min-w-0 flex flex-col gap-1 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a855f7]">
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium group-hover:text-[#ffb000] transition-colors ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-white'}`}>
            {task.title}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-[#27272A] bg-[#222] text-gray-400 uppercase tracking-wider">
            {task.show}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{task.venue}</span>
          <span className={`px-1.5 rounded text-[10px] font-bold uppercase border ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
        </div>
      </button>

      {}
      <div className="flex items-center gap-6">
        <div className="text-xs font-medium text-right text-gray-400 flex items-center gap-1">
          <Calendar className="w-3 h-3" /> {task.dueDate}
        </div>

        {}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg hover:bg-[#27272A] text-gray-500 hover:text-white transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {}
          {menuOpen && (
            <div className="absolute right-0 top-10 w-48 bg-[#18181B] border border-[#27272A] rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="flex flex-col p-1">
                <button
                  onClick={() => { onEdit(); setMenuOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-[#27272A] rounded-md text-left"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit Task
                </button>
                <button
                  onClick={() => { onToggle(); setMenuOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-[#27272A] rounded-md text-left"
                >
                  {task.status === 'completed' ? (
                    <><Circle className="w-3.5 h-3.5" /> Mark Pending</>
                  ) : (
                    <><Check className="w-3.5 h-3.5" /> Mark Complete</>
                  )}
                </button>
                <div className="h-px bg-[#27272A] my-1"></div>
                <button
                  onClick={() => { onDelete(); setMenuOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-md text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskModal({ task, shows = [], onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: task ? task.title : '',
    eventId: task ? String(task.eventId ?? '') : '',
    description: task ? task.description || '' : '',
    priority: task ? task.priority : 'Medium',
    dueDate: task ? (task.dueDate === 'ASAP' ? '' : task.dueDate) : '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    // an existing task keeps its show (eventId is set once, on create)
    const { eventId, ...rest } = formData;
    await onSave(task ? rest : { ...rest, eventId });
    setSaving(false);
  };

  const field = 'w-full bg-[#0F0F10] border border-[#27272A] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/25';
  const label = 'block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#18181B] border border-[#27272A] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start gap-4 p-5 border-b border-[#27272A]">
          <div className="min-w-0">
            <h3 id="task-modal-title" className="text-white font-bold text-lg">{task ? 'Task details' : 'Create new task'}</h3>
            {task && <p className="mt-0.5 text-xs text-gray-500 truncate">{task.show}{task.venue ? ` · ${task.venue}` : ''} · {task.status === 'completed' ? 'Completed' : 'Open'}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-full text-gray-500 hover:text-[#ff6a00] hover:bg-white/5"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label htmlFor="task-title" className={label}>Task title</label>
            <input id="task-title" required type="text" maxLength={200} className={field} placeholder="e.g. Update patch sheet"
              value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>

          <div>
            <label htmlFor="task-show" className={label}>Show</label>
            {task ? (
              <p id="task-show" className="px-4 py-2.5 rounded-lg bg-[#0F0F10] border border-[#27272A] text-sm text-gray-300">{task.show}</p>
            ) : (
              <select id="task-show" required className={field} value={formData.eventId} onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}>
                <option value="" disabled>{shows.length ? 'Pick a show' : 'Loading your shows…'}</option>
                {shows.map((show) => <option key={show.id} value={show.id}>{show.title}{show.venue ? ` (${show.venue})` : ''}</option>)}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="task-description" className={label}>Details</label>
            <textarea id="task-description" rows={3} maxLength={2000} className={`${field} resize-none`} placeholder="What needs doing, and anything the crew should know"
              value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-priority" className={label}>Priority</label>
              <select id="task-priority" className={field} value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
            <div>
              <label htmlFor="task-due" className={label}>Due</label>
              <input id="task-due" type="text" maxLength={50} className={field} placeholder="e.g. Tomorrow, 18:00"
                value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
            </div>
          </div>

          <div className="mt-2 pt-4 border-t border-[#27272A] flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-sm font-bold text-gray-300 border border-[#27272A] hover:border-[#ff6a00]/60 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-lg text-sm font-bold text-black bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] hover:brightness-110 disabled:opacity-60 shadow-lg shadow-orange-600/20 transition-all">
              {saving ? 'Saving…' : task ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
