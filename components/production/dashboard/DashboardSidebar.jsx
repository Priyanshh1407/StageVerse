'use client';

import React from 'react';
import { Kanban, GripVertical, Clock, History, FileText, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import Link from 'next/link';

export default function DashboardSidebar({ tasks, activity }) {
  return (
    <>
      {}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Kanban className="w-5 h-5 text-blue-500" />
            Tasks
          </h2>
          <Link href="/tasks" className="text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-blue-500 transition-colors">View All</Link>
        </div>

        <div className="flex flex-col gap-3">
          {tasks.map(task => <TaskItem key={task.id} task={task} />)}
        </div>
      </div>

      {}
      <div className="flex flex-col gap-4 mt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-blue-500" />
            Activity
          </h2>
        </div>

        <div className="flex flex-col relative before:absolute before:left-[19px] before:top-2 before:bottom-0 before:w-[2px] before:bg-[#27272A]">
          {activity.map((item, i) => <ActivityItem key={i} item={item} />)}
        </div>
      </div>
    </>
  );
}

function TaskItem({ task }) {
  const isMessage = task.title.startsWith('Artist Message'); // Detect message
  const colorMap = {
    red: { border: 'bg-red-500', badge: 'text-red-500 bg-red-500/10' },
    amber: { border: 'bg-amber-500', badge: 'text-amber-500 bg-amber-500/10' },
    blue: { border: 'bg-blue-500', badge: 'text-blue-500 bg-blue-500/10' },
  };  const theme = isMessage
    ? { border: 'bg-purple-500', badge: 'text-purple-400 bg-purple-500/10' }
    : (colorMap[task.color] || colorMap.blue);

  return (
    <div className={`bg-[#18181B] border border-[#27272A] rounded-lg p-4 flex flex-col gap-2 shadow-sm relative overflow-hidden group hover:border-blue-500/30 transition-colors ${isMessage ? 'bg-purple-500/5' : ''}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${theme.border}`}></div>
      <div className="flex justify-between items-start">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${theme.badge}`}>
          {isMessage ? 'Artist Message' : task.priority}
        </span>
        <GripVertical className="w-4 h-4 text-gray-600 cursor-pointer hover:text-white" />
      </div>
      <p className="text-sm font-medium text-white leading-snug">{isMessage ? task.title.replace('Artist Message: ', '') : task.title}</p>

      {}
      {isMessage && task.description && (
        <div className="mt-2 text-xs text-gray-300 bg-black/20 p-2 rounded whitespace-pre-wrap font-mono">
          {task.description}
        </div>
      )}

      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1 text-gray-500 text-xs">
          <Clock className="w-3.5 h-3.5" />
          <span>Due {task.due}</span>
        </div>
        {}
        <div className="size-5 rounded-full bg-gray-700 border border-[#18181B]"></div>
      </div>
    </div>
  );
}

function ActivityItem({ item }) {  const getStyle = (type) => {
    switch (type) {
      case 'warning': return {
        icon: AlertTriangle, color: 'bg-red-500', ring: 'ring-red-500/20', text: 'text-red-400'
      };
      case 'success': return {
        icon: CheckCircle2, color: 'bg-green-500', ring: 'ring-green-500/20', text: 'text-green-400'
      };
      case 'document': return {
        icon: FileText, color: 'bg-blue-500', ring: 'ring-blue-500/20', text: 'text-blue-400'
      };
      default: return {
        icon: Zap, color: 'bg-gray-500', ring: 'ring-gray-500/20', text: 'text-gray-400'
      };
    }
  };

  const style = getStyle(item.type);
  const Icon = style.icon;

  return (
    <div className="relative pl-12 pb-6 group last:pb-0">

      {}
      <div className="absolute left-[19px] top-2 bottom-0 w-[2px] bg-[#27272A] group-last:hidden"></div>

      {}
      <div className="absolute left-0 top-0 size-10 flex items-center justify-center bg-[#0F0F10] z-10">
        <div className={`size-6 rounded-full flex items-center justify-center border border-[#0F0F10] ring-4 ${style.ring} ${style.color}`}>
          <Icon className="w-3 h-3 text-black fill-current" />
        </div>
      </div>

      {}
      <Link href={item.link || '#'} className="flex flex-col gap-1 group/text hover:bg-[#18181B] p-2 -ml-2 rounded-lg transition-colors">
        <p className="text-sm text-gray-300 group-hover/text:text-white transition-colors">
          {}
          {item.text}
        </p>
        <p className="text-xs text-gray-600 group-hover/text:text-gray-500">
          {item.time}
        </p>
      </Link>
    </div>
  );
}