'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, Circle, Clock, Filter, Plus, Search,
  MoreHorizontal, Calendar, ArrowUpRight, X, Trash2, Pencil, Check, ArrowLeft, Loader2
} from 'lucide-react';
import StudioNavbar from '@/components/production/StudioNavbar';

export default function GlobalTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);  const fetchTasks = async () => {
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
    fetchTasks();
  }, []);

  const handleSaveTask = async (taskData) => {
    try {
      if (editingTask) {        const res = await fetch('/api/production/tasks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTask.id, ...taskData })
        });
        if (res.ok) fetchTasks(); // Refresh
      } else {        const res = await fetch('/api/production/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });
        if (res.ok) fetchTasks();
      }
      closeModal();
    } catch (e) { console.error(e); }
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
    if (!task) return;    setTasks(tasks.map(t => t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t));

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
  };  const filteredTasks = tasks.filter(task => {
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
                className='inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-500 transition-colors'
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
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-600/20"
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
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-600 outline-none"
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
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
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
          onClose={closeModal}
          onSave={handleSaveTask}
        />
      )}

    </div>
  );
}

function TaskRow({ task, onToggle, onDelete, onEdit }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);  useEffect(() => {
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
    return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
  };

  return (
    <div className="group flex items-center gap-4 bg-[#18181B] border border-[#27272A] p-4 rounded-xl hover:border-blue-500/30 transition-all shadow-sm relative">

      {}
      <button
        onClick={onToggle}
        className={`shrink-0 transition-colors ${task.status === 'completed' ? 'text-green-500' : 'text-gray-600 hover:text-blue-500'}`}
      >
        {task.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
      </button>

      {}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-white'}`}>
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
      </div>

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

function TaskModal({ task, onClose, onSave }) {  const [formData, setFormData] = useState({
    title: task ? task.title : '',
    show: task ? task.show : 'General',
    venue: task ? task.venue : '',
    priority: task ? task.priority : 'Medium',
    dueDate: task ? task.dueDate : '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#18181B] border border-[#27272A] w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        <div className="flex justify-between items-center p-5 border-b border-[#27272A]">
          <h3 className="text-white font-bold text-lg">{task ? 'Edit Task' : 'Create New Task'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Task Title</label>
            <input
              required
              type="text"
              className="w-full bg-[#0F0F10] border border-[#27272A] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g. Update Patch Sheet"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Show / Project</label>
              <select
                className="w-full bg-[#0F0F10] border border-[#27272A] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                value={formData.show}
                onChange={(e) => setFormData({ ...formData, show: e.target.value })}
              >
                <option>General</option>
                <option>Hamlet World Tour</option>
                <option>Neon Nights Tour</option>
                <option>Synthwave Sunset</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Venue</label>
              <input
                type="text"
                className="w-full bg-[#0F0F10] border border-[#27272A] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Optional"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Priority</label>
              <select
                className="w-full bg-[#0F0F10] border border-[#27272A] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Due Date</label>
              <input
                type="text"
                className="w-full bg-[#0F0F10] border border-[#27272A] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="e.g. Tomorrow"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#27272A] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-bold text-gray-400 hover:text-white hover:bg-[#27272A] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all"
            >
              {task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}