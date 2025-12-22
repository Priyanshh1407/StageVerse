'use client';

import React from 'react';
import { Plus, MoreHorizontal, Clock, AlertCircle } from 'lucide-react';

export default function KanbanBoard({ columns = [] }) {
  return (
    // FIX: Background #0F0F10
    <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-[#0F0F10]">
      <div className="flex h-full gap-6 min-w-max pb-4">
        {columns.map((col) => (
          <KanbanColumn key={col.id} data={col} />
        ))}
      </div>
    </div>
  );
}

function KanbanColumn({ data }) {
  return (
    // FIX: Column Background #0F0F10 (Transparent) or very dark #121214, Border #27272A
    <div className={`flex flex-col w-80 bg-[#121214] rounded-xl border border-[#27272A] h-full max-h-full ${data.isGhost ? 'opacity-60' : ''}`}>
      
      <div className="p-4 flex items-center justify-between border-b border-[#27272A]">
        <div className="flex items-center gap-2">
          <div className={`size-2 rounded-full ${data.dotColor}`}></div>
          <h3 className="font-bold text-white text-sm">{data.title}</h3>
          <span className="bg-[#27272A] text-gray-400 text-[10px] px-1.5 py-0.5 rounded font-mono">{data.count}</span>
        </div>
        <button className="text-gray-500 hover:text-white"><Plus className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {data.cards.length > 0 ? (
          data.cards.map(card => <KanbanCard key={card.id} card={card} />)
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-600 h-32">
            <div className="opacity-50 mb-2 border-2 border-dashed border-[#27272A] rounded-lg p-3">
                <Plus className="w-6 h-6" />
            </div>
            <p className="text-sm">No tasks yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({ card }) {
  return (
    // FIX: Card Background #18181B, Border #27272A
    <div className={`bg-[#18181B] p-3 rounded-lg border border-[#27272A] shadow-sm cursor-grab active:cursor-grabbing group hover:border-blue-500/50 transition-colors ${card.urgent ? 'border-l-4 border-l-red-500' : ''}`}>
      
      <div className="flex justify-between items-start mb-2">
        <span className={`${card.tagColor} text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide`}>{card.tag}</span>
        {card.urgent ? (
           <span className="text-red-400 text-[10px] font-bold uppercase flex items-center gap-1">
             <AlertCircle className="w-3 h-3" /> Urgent
           </span>
        ) : (
           <button className="text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
             <MoreHorizontal className="w-4 h-4" />
           </button>
        )}
      </div>

      <p className="text-sm font-medium text-gray-200 mb-3">{card.title}</p>

      <div className="flex justify-between items-center">
        <div className="flex -space-x-2">
            {card.unassigned ? (
                <div className="size-6 rounded-full bg-[#27272A] flex items-center justify-center text-[10px] font-bold border border-[#18181B] text-gray-400">?</div>
            ) : (
                <div className="size-6 rounded-full bg-gray-600 border border-[#18181B]"></div>
            )}
        </div>
        <div className="flex items-center gap-1 text-gray-500 text-xs">
          <Clock className="w-3 h-3" />
          <span>{card.date}</span>
        </div>
      </div>
    </div>
  );
}