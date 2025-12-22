'use client';

import { useState, useEffect } from 'react';
import { Bus, Truck, Music, DoorOpen, Star, Check, ChevronDown, CheckCircle2 } from 'lucide-react';

export default function Timeline() {
  const [now, setNow] = useState(new Date());
  const [expandedId, setExpandedId] = useState(null);
  
  // 1. SCHEDULE STATE (Moved here so checkboxes are interactive)
  const [schedule, setSchedule] = useState([
    { 
      id: 1, 
      time: '10:00 AM', 
      title: 'Lobby Call', 
      sub: 'Hotel Lobby • Depart for Venue', 
      icon: Bus,
      details: 'Manifest: 12 Pax, 2 Vans.',
      status: 'future'
    },
    { 
      id: 2, 
      time: '02:00 PM', 
      title: 'Load-In', 
      sub: 'Loading Dock B', 
      icon: Truck,
      details: 'Local Crew: 4 Hands.',
      status: 'future'
    },
    { 
      id: 3, 
      time: '04:00 PM', 
      title: 'Soundcheck', 
      sub: 'Full Band • Sync: Production Team', 
      icon: Music, 
      // Tasks are now interactive state
      tasks: [
        { label: 'Line Check', done: false }, 
        { label: 'Monitor Mix', done: false }, 
        { label: 'IEM Sync', done: false }
      ],
      status: 'future'
    },
    { 
      id: 4, 
      time: '07:00 PM', 
      title: 'Doors Open', 
      sub: 'Main Entrance', 
      icon: DoorOpen,
      details: 'Security Briefing at 6:30 PM.',
      status: 'future'
    },
    { 
      id: 5, 
      time: '09:00 PM', 
      title: 'SHOWTIME', 
      sub: 'Main Stage • 90 Min Set', 
      icon: Star, 
      isHeadline: true,
      details: 'Setlist A. Pyrotechnics enabled.',
      status: 'future'
    },
  ]);

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

  // 3. TASK TOGGLE HANDLER
  const handleTaskToggle = (itemId, taskLabel) => {
    setSchedule(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        tasks: item.tasks.map(t => 
          t.label === taskLabel ? { ...t, done: !t.done } : t
        )
      };
    }));
  };

  // 4. MANUAL MARK DONE
  const handleMarkDone = (e, id) => {
    e.stopPropagation();
    setSchedule(prev => prev.map(item => 
      item.id === id ? { ...item, status: item.status === 'completed' ? 'active' : 'completed_manual' } : item
    ));
  };

  return (
    <div className="lg:col-span-7 xl:col-span-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Itinerary</h3>
        <div className="text-right">
          <span className="block text-sm font-medium text-slate-500 dark:text-[#90b2cb]">Time Zone: CST</span>
          <span className="text-xs font-mono text-[#0d93f2] animate-pulse">
             Current: {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
      
      <div className="relative">
        {/* Continuous Line */}
        <div className="absolute left-[24px] top-4 bottom-12 w-[2px] bg-[#223949] -z-10"></div>

        <div className="flex flex-col gap-6">
          {schedule.map((item) => {
            const isManuallyDone = item.status === 'completed_manual';
            const isActive = item.status === 'active';
            const isCompleted = item.status === 'completed' || isManuallyDone;

            return (
              <TimelineItem 
                key={item.id} 
                item={item} 
                isActive={isActive}
                isCompleted={isCompleted}
                isExpanded={expandedId === item.id}
                onToggleExpand={() => handleToggleExpand(item.id)}
                onMarkDone={(e) => handleMarkDone(e, item.id)}
                onTaskToggle={handleTaskToggle}
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

function TimelineItem({ item, isActive, isCompleted, isExpanded, onToggleExpand, onMarkDone, onTaskToggle }) {
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
          {isCompleted ? <Check className="w-5 h-5" /> : <item.icon className="w-5 h-5" />}
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
                    onClick={(e) => { e.stopPropagation(); onTaskToggle(item.id, task.label); }} // Clicking row toggles check
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