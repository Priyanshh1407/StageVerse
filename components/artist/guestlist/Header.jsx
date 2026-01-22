'use client';

import { Download, Plus, ChevronRight } from 'lucide-react';

export default function GuestListHeader({ onNewList, onExport }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-2">
      <div>
        <div className="flex items-center gap-2 mb-2 text-sm text-slate-500 dark:text-slate-400">
          <span>Artist Portal</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-900 dark:text-white font-medium">Guest List</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight font-sans mb-2">
          Guest List Manager
        </h1>
        <p className="text-slate-500 dark:text-[#90b2cb] text-base font-normal max-w-2xl">
          Add guests and manage access tiers instantly synced with the door.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onExport}
          className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-white dark:bg-[#223949] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-[#2c4a5f] transition-colors"
        >
          <Download className="w-5 h-5" />
          <span>Export CSV</span>
        </button>

        {}
        <button
          onClick={onNewList}
          className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-[#0d93f2] hover:bg-[#0d93f2]/90 text-white text-sm font-bold shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New List</span>
        </button>
      </div>
    </div>
  );
}