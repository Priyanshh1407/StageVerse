'use client';

import React from 'react';

export default function LogisticsSidebar({ crew = [], docs = [] }) {
  return (
    // FIX: Sidebar Background #0F0F10, Border #27272A
    <aside className="w-80 border-l border-[#27272A] bg-[#0F0F10] hidden xl:flex flex-col gap-0 z-10 h-full">

      <div className="p-6 border-b border-[#27272A]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-lg">Project Docs</h3>
          <button className="text-blue-500 hover:text-white text-xs font-bold uppercase">View All</button>
        </div>
        <div className="flex flex-col gap-3">
          {docs.map((doc, i) => (
            <DocItem key={i} {...doc} />
          ))}
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-lg">Crew Status</h3>
          <span className="bg-green-500/10 text-green-500 text-xs px-2 py-0.5 rounded-full font-medium border border-green-500/20">{crew.length} Active</span>
        </div>

        <div className="space-y-4">
          {crew.map((member, i) => (
            <CrewItem key={i} {...member} />
          ))}
        </div>

        <div className="mt-8 p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Lightbulb className="text-blue-500 w-6 h-6 shrink-0" />
            <div>
              <p className="text-white text-sm font-bold mb-1">Tip of the day</p>
              <p className="text-gray-500 text-xs leading-relaxed">Use "Group Mode" to assign tasks to multiple electricians at once during load-in.</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

import { Lightbulb, Map, Grid, Box } from 'lucide-react';

function DocItem({ title, type, url }) {
  // Map string type to Icon component
  let Icon = Box;
  let color = "text-blue-400";
  let bgColor = "bg-blue-500/10";

  if (type === 'Map') { Icon = Map; color = "text-purple-400"; bgColor = "bg-purple-500/10"; }
  if (type === 'Grid') { Icon = Grid; color = "text-green-400"; bgColor = "bg-green-500/10"; }

  return (
    // FIX: Item BG #18181B
    <a className="group flex items-center p-3 rounded-lg bg-[#18181B] border border-transparent hover:border-blue-500/50 transition-all" href={url || '#'}>
      <div className={`size-10 rounded ${bgColor} flex items-center justify-center ${color} mr-3 group-hover:text-white transition-colors`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="text-white text-sm font-bold group-hover:text-blue-400 transition-colors">{title}</p>
        <p className="text-gray-500 text-xs">{type}</p>
      </div>
    </a>
  );
}

function CrewItem({ name, status, color }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className="size-9 rounded-full bg-[#27272A] border border-[#3F3F46]"></div>
        <div className={`absolute bottom-0 right-0 size-2.5 ${color} border-2 border-[#0F0F10] rounded-full`}></div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{name}</p>
        <p className="text-gray-500 text-xs truncate">{status}</p>
      </div>
    </div>
  );
}