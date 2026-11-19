'use client';

import { Bell, Settings, FileText } from 'lucide-react';

export default function DaySheetHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#223949]/30 bg-[#f5f7f8]/95 dark:bg-[#101b23]/95 backdrop-blur-sm px-4 lg:px-10 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 text-[#ff6a00] flex items-center justify-center">
            <FileText className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white">DaySheet</h2>
        </div>
        <div className="flex items-center gap-4 lg:gap-6">
          <div 
            className="bg-center bg-no-repeat bg-cover rounded-full w-10 h-10 ring-2 ring-[#a855f7]/50 cursor-pointer" 
            style={{ backgroundImage: 'url("https://github.com/shadcn.png")' }}
          ></div>
        </div>
      </div>
    </header>
  );
}