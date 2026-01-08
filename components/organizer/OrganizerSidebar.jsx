'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Calendar, Ticket, Megaphone,
  FileText, Settings, LogOut, BarChart3, X
} from 'lucide-react';
import { Button } from '../ui/button';

const OrganizerSidebar = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { label: "Dashboard", href: "/manage/dashboard", icon: LayoutDashboard },
    { label: "Events", href: "/events", icon: Calendar },
    { label: "Ticketing", href: "/ticketing", icon: Ticket },
    { label: "Reports", href: "/reports", icon: FileText },
    { label: "Analytics", href: "/analysis", icon: BarChart3 },
  ];

  const handleLogout = async () => {
    try {
      // 1. Ask Server to delete the Cookie
      await fetch('/api/auth/logout', { method: 'POST' });

      // 2. Clear Client-side User Info (for UI)
      localStorage.removeItem('user');

      // 3. Force Redirect to Login
      router.push('/');
      router.refresh(); // Important: Refreshes Server Components to see you are gone
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <>
      {/* 1. MOBILE OVERLAY (Backdrop) */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={onClose}
      />

      {/* 2. SIDEBAR CONTAINER */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-64 p-4
          bg-white dark:bg-[#1a2632] border-r border-slate-200 dark:border-slate-800
          flex flex-col transition-transform duration-300 ease-in-out
          md:sticky md:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >

        {/* Organizer Brand */}
        <div className="flex items-center justify-between px-2 mb-8 mt-2">
          <Link href="/" className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-slate-900 dark:text-white">StageVerse</h1>
              <p className="text-xs text-slate-500 font-medium">Organizer Portal</p>
            </div>
          </Link>

          {/* Close Button (Mobile Only) */}
          <button
            onClick={onClose}
            className="md:hidden p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col gap-1 flex-1">
          {links.map((item) => {
            // Enhanced Active Logic:
            // 1. Exact match (e.g. /organizer/events)
            // 2. Sub-path match (e.g. /organizer/events/new), excluding dashboard to prevent false positives if paths overlap
            const isActive = pathname === item.href ||
              (item.href !== '/organizer/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose} // Close sidebar on mobile click
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Log Out</span>
          </Button>
        </div>
      </aside>
    </>
  );
};

export default OrganizerSidebar;