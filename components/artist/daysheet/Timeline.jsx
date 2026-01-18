'use client';

import { useState, useEffect } from 'react';
import { Bus, Truck, Music, DoorOpen, Star, Check, ChevronDown, CheckCircle2, Plus, X } from 'lucide-react';

export default function Timeline({ initialSchedule, onUpdate }) {
  const [now, setNow] = useState(new Date());
  const [expandedId, setExpandedId] = useState(null);

  // 1. SCHEDULE STATE
  const [schedule, setSchedule] = useState(initialSchedule || []);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // If null, we are adding. If set, we are editing.
  const [formData, setFormData] = useState({ time: '12:00 PM', title: '', sub: '', type: 'other', tasks: [] });
  const [tempTask, setTempTask] = useState(''); // For adding new subtasks in modal

  // Update schedule if props change
  useEffect(() => {
    if (initialSchedule) {
      // console.log("Syncing Schedule from Props:", initialSchedule);
      setSchedule(initialSchedule);
    }
  }, [initialSchedule]);

  // Open Modal for NEW logic
  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ time: '12:00 PM', title: '', sub: '', type: 'other', tasks: [] });
    setTempTask('');
    setIsModalOpen(true);
  };

  // Open Modal for EDIT logic
  const openEditModal = (e, item) => {
    e.stopPropagation(); // prevent expanding
    setEditingItem(item);
    setFormData({
      time: item.time || '',
      title: item.title || '',
      sub: item.sub || '',
      type: item.type || 'other',
      tasks: item.tasks || []
    });
    setTempTask('');
    setIsModalOpen(true);
  };

  // Helper: Add Temp Task to Form Data
  const addTempTask = () => {
    if (!tempTask.trim()) return;
    setFormData(prev => ({
      ...prev,
      tasks: [...(prev.tasks || []), { label: tempTask, done: false }]
    }));
    setTempTask('');
  };

  // Helper: Remove Task from Form Data
  const removeTaskObj = (idx) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== idx)
    }));
  };

  // Helper to get ID
  const getItemId = (item) => item._id || item.id;

  const parseAndSort = (items) => {
    return items.sort((a, b) => {
      const tA = parseTime(a.time);
      const tB = parseTime(b.time);
      return tA - tB;
    });
  };

  // Handle Submit (Add OR Email)
  const handleSubmit = () => {
    let newSchedule;
    const dataToSave = { ...formData };

    // Ensure tasks are saved (even if added last minute)
    if (tempTask.trim()) {
      dataToSave.tasks = [...(dataToSave.tasks || []), { label: tempTask, done: false }];
    }

    if (editingItem) {
      // EDIT MODE
      const editId = getItemId(editingItem);
      newSchedule = schedule.map(item =>
        getItemId(item) === editId ? { ...item, ...dataToSave } : item
      );
    } else {
      // ADD MODE
      const newItem = {
        ...dataToSave,
        id: `new-${Date.now()}`,
        status: 'future'
      };
      newSchedule = [...schedule, newItem];
    }

    // Sort chronological
    newSchedule = parseAndSort(newSchedule);

    setSchedule(newSchedule);
    onUpdate(newSchedule, true); // Pass 'true' to signal "notify team"
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (!editingItem) return;
    if (!confirm("Are you sure you want to delete this event?")) return;

    const editId = getItemId(editingItem);
    const newSchedule = schedule.filter(item => getItemId(item) !== editId);
    setSchedule(newSchedule);
    onUpdate(newSchedule, true); // Notify deletion too
    setIsModalOpen(false);
  };

  // 2. TIME & STATUS LOGIC (Runs every minute)
  useEffect(() => {
    const updateStatus = () => {
      const currentTime = new Date();
      setNow(currentTime);

      setSchedule(prevSchedule => {
        return prevSchedule.map((item, index) => {
          // Skip if manually marked as completed (optional, removed for strict time adherence)
          if (item.status === 'completed_manual') return item;

          const itemTime = parseTime(item.time);
          const nextItem = prevSchedule[index + 1];
          const nextTime = nextItem ? parseTime(nextItem.time) : null;

          let newStatus = 'future';

          if (currentTime >= itemTime) {
            // If strictly between this event start and next event start
            if ((nextTime && currentTime < nextTime) || !nextTime) {
              newStatus = 'active';
            } else {
              newStatus = 'completed';
            }
          }

          // Only update if status actually changed to avoid re-renders
          return item.status !== newStatus ? { ...item, status: newStatus } : item;
        });
      });
    };

    updateStatus(); // Run immediately
    const timer = setInterval(updateStatus, 60000); // Run every minute
    return () => clearInterval(timer);
  }, []);

  const handleToggleExpand = (id) => {
    setExpandedId(current => current === id ? null : id);
  };

  // 3. TASK TOGGLE HANDLER - FIXED CRASH
  const handleTaskToggle = (itemId, taskLabel) => {
    const newSched = schedule.map(item => {
      if (getItemId(item) !== itemId) return item;
      // Guard clause: if no tasks, nothing to toggle
      if (!item.tasks) return item;

      return {
        ...item,
        tasks: item.tasks.map(t => t.label === taskLabel ? { ...t, done: !t.done } : t)
      };
    });
    setSchedule(newSched);
    // Persist changes to DB (notify=false to avoid spamming crew)
    onUpdate(newSched, false);
  };

  // 4. MANUAL MARK DONE
  const handleMarkDone = (e, id) => {
    e.stopPropagation();
    const newSched = schedule.map(item =>
      getItemId(item) === id ? { ...item, status: item.status === 'completed' ? 'active' : 'completed_manual' } : item
    );
    setSchedule(newSched);
    onUpdate(newSched); // Persist status
  };

  return (
    <div className="lg:col-span-7 xl:col-span-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Itinerary</h3>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#223949] hover:bg-[#315168] text-white text-xs font-bold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
        <div className="text-right">
          <span className="block text-sm font-medium text-slate-500 dark:text-[#90b2cb]">Time Zone: CST</span>
          <span className="text-xs font-mono text-[#0d93f2] animate-pulse">
            Current: {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="mb-6 p-6 rounded-xl border border-[#0d93f2] bg-[#131d24] shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-top-4 relative z-50">
          <h4 className="text-white font-bold mb-4 flex justify-between items-center">
            {editingItem ? 'Edit Event' : 'Add New Event'}
            <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
          </h4>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Time</label>
              <input
                placeholder="05:00 PM"
                value={formData.time}
                onChange={e => setFormData({ ...formData, time: e.target.value })}
                className="w-full bg-[#0b1219] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-[#0d93f2] outline-none"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Title</label>
              <input
                placeholder="Event Title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-[#0b1219] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-[#0d93f2] outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-[#0b1219] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-[#0d93f2] outline-none"
              >
                <option value="other">General</option>
                <option value="sound">Sound</option>
                <option value="travel">Travel</option>
                <option value="work">Work</option>
                <option value="doors">Doors</option>
                <option value="show">Show</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs text-slate-400 mb-1 block">Subtitle / Details</label>
            <input
              placeholder="Location, notes, or team details..."
              value={formData.sub}
              onChange={e => setFormData({ ...formData, sub: e.target.value })}
              className="w-full bg-[#0b1219] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-[#0d93f2] outline-none"
            />
          </div>

          {/* SUBTASKS SECTION */}
          <div className="mb-6 p-4 bg-[#0b1219] rounded-lg border border-slate-800">
            <label className="text-xs text-[#0d93f2] font-bold mb-2 block uppercase tracking-wider">Checklist Items (Optional)</label>

            {/* List existing */}
            {formData.tasks && formData.tasks.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tasks.map((t, idx) => (
                  <span key={idx} className="inline-flex items-center gap-2 bg-[#223949] text-white text-xs px-2 py-1 rounded-md">
                    {t.label}
                    <button onClick={() => removeTaskObj(idx)} className="hover:text-red-400"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}

            {/* Add New */}
            <div className="flex gap-2">
              <input
                placeholder="Add subtask (e.g. 'Line Check')"
                value={tempTask}
                onChange={e => setTempTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTempTask()}
                className="flex-1 bg-[#131d24] border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#0d93f2] outline-none"
              />
              <button onClick={addTempTask} className="px-3 py-1 bg-[#223949] hover:bg-[#315168] text-white text-xs font-bold rounded-lg transition-colors">Add</button>
            </div>
          </div>

          <div className="flex gap-3">
            {editingItem && (
              <button onClick={handleDelete} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-2 rounded-lg text-sm transition-colors border border-red-500/50">
                Delete
              </button>
            )}
            <button onClick={handleSubmit} className="flex-[2] bg-[#0d93f2] hover:bg-blue-600 text-white font-bold py-2 rounded-lg text-sm transition-colors shadow-lg shadow-blue-500/20">
              {editingItem ? 'Save Changes' : 'Add to Schedule'}
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        {/* Continuous Line */}
        {/* Continuous Line (Glowing) */}
        {/* Continuous Line (Glowing) - Z-index fixed */}
        <div className="absolute left-[24px] top-4 bottom-12 w-[2px] bg-[#0d93f2] opacity-30 shadow-[0_0_15px_#0d93f2]"></div>

        <div className="flex flex-col gap-6">
          {schedule.map((item, index) => {
            // FIX KEY ISSUE: Use _id (DB) or id (Local)
            const itemId = getItemId(item);

            const isManuallyDone = item.status === 'completed_manual';
            const isActive = item.status === 'active';
            const isCompleted = item.status === 'completed' || isManuallyDone;

            return (
              <TimelineItem
                key={itemId || index}
                item={item}
                isActive={isActive}
                isCompleted={isCompleted}
                isExpanded={expandedId === itemId}
                onToggleExpand={() => handleToggleExpand(itemId)}
                onMarkDone={(e) => handleMarkDone(e, itemId)}
                onTaskToggle={(id, label) => handleTaskToggle(id, label)} // Pass ID correctly
                onEdit={(e) => openEditModal(e, item)} // Pass edit handler
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- HELPER FUNCTIONS ---

function parseTime(timeStr) {
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':');
  if (hours === '12') hours = '00';
  if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// --- ITEM COMPONENT ---

import { Edit2 } from 'lucide-react'; // Make sure to import this at top

function TimelineItem({ item, isActive, isCompleted, isExpanded, onToggleExpand, onMarkDone, onTaskToggle, onEdit }) {
  const isHeadline = item.isHeadline;

  // Logic: Show details if it's the ACTIVE item OR if manually expanded
  const showDetails = isActive || isExpanded;

  const containerClasses = isActive
    ? 'bg-[#1c2a35] border-[#0d93f2] shadow-[0_0_20px_rgba(13,147,242,0.15)] opacity-100'
    : isCompleted
      ? 'bg-[#101b22] border-[#223949] opacity-60'
      : 'bg-[#131d24] border-[#223949] opacity-100';

  const iconClasses = isActive
    ? 'bg-[#0d93f2] text-white border-[#0d93f2] shadow-lg scale-110'
    : isCompleted
      ? 'bg-[#101b22] text-[#587386] border-[#223949]'
      : 'bg-[#101b22] text-white border-[#223949] group-hover:border-[#0d93f2]';

  return (
    <div className="flex gap-6 group">

      {/* 1. LEFT COLUMN: Icon */}
      <div className="flex flex-col items-center shrink-0 w-[50px] relative">
        <div
          onClick={onToggleExpand}
          className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 cursor-pointer z-10 ${iconClasses}`}
        >
          {isCompleted ? <Check className="w-5 h-5" /> : (
            <>
              {(!item.type || item.type === 'travel') && <Bus className="w-5 h-5" />}
              {item.type === 'work' && <Truck className="w-5 h-5" />}
              {item.type === 'sound' && <Music className="w-5 h-5" />}
              {item.type === 'doors' && <DoorOpen className="w-5 h-5" />}
              {item.type === 'show' && <Star className="w-5 h-5" />}
            </>
          )}
        </div>
      </div>

      {/* 2. RIGHT COLUMN: Content Card */}
      <div
        onClick={onToggleExpand}
        className={`flex-1 rounded-xl border p-5 transition-all duration-300 cursor-pointer overflow-hidden ${containerClasses}`}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between gap-4 mb-2">

          <div className="flex items-center gap-3 overflow-hidden">
            <h4 className={`text-lg font-bold truncate ${isActive || isHeadline ? 'text-white' : 'text-slate-300'}`}>
              {item.title}
              {isActive && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
            </h4>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* EDIT BUTTON (Only visible on hover) */}
            <button
              onClick={onEdit}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
              title="Edit Event"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              onClick={onMarkDone}
              className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${isCompleted ? 'text-green-500 hover:text-green-400' : 'text-slate-500 hover:text-white hover:bg-white/10'}`}
            >
              {isCompleted ? (<>DONE <CheckCircle2 className="w-4 h-4" /></>) : (<>MARK DONE</>)}
            </button>
            <div className={`text-sm font-mono font-medium ${isActive ? 'text-[#0d93f2]' : 'text-slate-500'}`}>{item.time}</div>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* ... Rest of content ... */}
        <p className="text-[#90b2cb] text-sm leading-relaxed">{item.sub}</p>

        {/* EXPANDABLE CONTENT */}
        <div className={`grid transition-all duration-500 ease-in-out ${showDetails ? 'grid-rows-[1fr] opacity-100 mt-4 pt-4 border-t border-[#223949]' : 'grid-rows-[0fr] opacity-0 mt-0 pt-0'}`}>
          <div className="overflow-hidden min-h-0">

            {/* CHECKLIST: Clicking toggles 'done' and style */}
            {item.tasks ? (
              <div className="space-y-2">
                {item.tasks.map((task, i) => (
                  <div
                    key={i}
                    onClick={(e) => { e.stopPropagation(); onTaskToggle(item._id || item.id, task.label); }} // Use _id or id
                    className={`flex items-center gap-3 p-2 rounded transition-all cursor-pointer group/task ${task.done ? 'bg-[#223949]/20' : 'hover:bg-[#223949]/50'}`}
                  >
                    {/* Checkbox */}
                    <div className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${task.done ? 'border-green-500 bg-green-500/10' : 'border-slate-600 group-hover/task:border-[#0d93f2]'}`}>
                      {task.done && <Check className="w-3 h-3 text-green-500" />}
                    </div>
                    {/* Text: Strikethrough if done */}
                    <span className={`text-sm transition-all ${task.done ? 'line-through text-slate-500 decoration-slate-600' : 'text-white'}`}>
                      {task.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[#90b2cb]">{item.details}</div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}