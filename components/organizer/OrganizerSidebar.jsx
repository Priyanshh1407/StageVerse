'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Calendar, Ticket, Megaphone, 
  FileText, Settings, LogOut, BarChart3 
} from 'lucide-react';

const OrganizerSidebar = () => {
  const pathname = usePathname();

  const links = [
    { label: "Dashboard", href: "/organizer/dashboard", icon: LayoutDashboard },
    { label: "Events", href: "/organizer/events", icon: Calendar },
    { label: "Ticketing", href: "/organizer/ticketing", icon: Ticket },
    { label: "Marketing", href: "/organizer/marketing", icon: Megaphone },
    { label: "Reports", href: "/organizer/reports", icon: FileText },
    { label: "Settings", href: "/organizer/settings", icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632] h-screen sticky top-0 p-4 shrink-0 z-20">
      
      {/* Organizer Brand */}
      <div className="flex items-center gap-3 px-2 mb-8 mt-2">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight text-slate-900 dark:text-white">StageVerse</h1>
          <p className="text-xs text-slate-500 font-medium">Organizer Portal</p>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex flex-col gap-1 flex-1">
        {links.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                isActive 
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
        <Link href="/logout" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Log Out</span>
        </Link>
      </div>
    </aside>
  );
};

export default OrganizerSidebar;