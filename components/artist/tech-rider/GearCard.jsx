'use client';

import { Plus, Minus } from 'lucide-react';

export default function GearCard({ item, onIncrement, onDecrement }) {
  const isSelected = item.count > 0;

  return (
    <div 
      className={`
        bg-[#1a2632] border rounded-xl p-4 flex flex-col gap-4 transition-all duration-200 cursor-pointer group shadow-sm
        ${isSelected 
          ? 'border-[#0d93f2]/30 opacity-100 ring-1 ring-[#0d93f2]/10' 
          : 'border-[#223949] opacity-80 hover:opacity-100 hover:border-[#0d93f2]/30'}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div 
            className={`
              p-2.5 rounded-lg transition-colors
              ${isSelected 
                ? 'bg-[#0d93f2] text-white' 
                : 'bg-[#0d93f2]/10 text-[#0d93f2] group-hover:bg-[#0d93f2] group-hover:text-white'}
            `}
          >
            <item.icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white leading-tight">{item.name}</h3>
            <p className="text-[11px] text-white/50 mt-0.5 uppercase tracking-wide">{item.type}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-black/30 rounded-lg p-1.5 border border-[#223949]">
        <button 
          onClick={() => onDecrement(item.id)}
          className="w-8 h-8 rounded hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        
        <span className={`font-mono font-bold text-lg ${isSelected ? 'text-white' : 'text-white/40'}`}>
          {item.count}
        </span>
        
        <button 
          onClick={() => onIncrement(item.id)}
          className={`
            w-8 h-8 rounded flex items-center justify-center transition-colors
            ${isSelected 
              ? 'bg-[#0d93f2] hover:bg-[#0d93f2]/90 text-white shadow-lg shadow-[#0d93f2]/20' 
              : 'bg-white/10 hover:bg-white/20 text-white'}
          `}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}