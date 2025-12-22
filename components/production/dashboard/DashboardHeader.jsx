'use client';

import React from 'react';
import { HardHat, Clock, AlertTriangle, CheckSquare } from 'lucide-react';

export default function DashboardHeader({ user, stats }) {
  return (
    <div className="flex flex-col lg:flex-row gap-8 justify-between items-start lg:items-end mb-10 pb-8 border-b border-[#27272A]">
      <div className="flex flex-col gap-4 max-w-2xl">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">
            Welcome back, {user.name.split(' ')[0]}.
          </h1>
          <div className="flex items-center gap-2 text-gray-400">
            <HardHat className="w-5 h-5 text-gray-500" />
            <p className="text-base font-normal">
              Currently Working On: <span className="text-blue-500 font-bold">{user.currentProject}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-4 w-full lg:w-auto">
        <StatCard 
          icon={Clock} 
          label="Riders Pending" 
          value={stats.pending} 
          color="text-amber-500" 
          bg="bg-amber-500/10" 
        />
        <StatCard 
          icon={AlertTriangle} 
          label="Conflicts" 
          value={stats.conflicts} 
          color="text-red-500" 
          bg="bg-red-500/10" 
        />
        <StatCard 
          icon={CheckSquare} 
          label="Upcoming Tasks" 
          value={stats.tasks} 
          color="text-blue-500" 
          bg="bg-blue-500/10" 
        />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="flex-1 lg:flex-none min-w-[160px] flex items-center gap-4 rounded-lg p-4 bg-[#18181B] border border-[#27272A] shadow-sm">
      <div className={`size-10 rounded-full ${bg} flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}