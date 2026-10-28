'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Compass, Ticket, Users, Settings,
  LogOut, Sparkles, Image as ImageIcon, X, Bell
} from 'lucide-react';

const FanSidebar = ({ isOpen, onClose, onOpenNotifications }) => {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { label: "My Passport", href: "/dashboard", icon: Ticket },
    { label: "Discover", href: "/discover", icon: Compass },
    { label: "Memories", href: "/memory-vault", icon: ImageIcon },
    { label: "Friends", href: "/social", icon: Users },
    { label: "Tickets", href: "/ticket", icon: Ticket },
    { label: "Notifications", action: "OPEN_NOTIFICATIONS", icon: Bell },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('user');
      router.push('/');
      router.refresh(); // Important: Refreshes Server Components to see you are gone
      console.log("Logout Successful");
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <>
      { }
      { }
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={onClose}
      />

      { }
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-64 p-4
          bg-white dark:bg-[#1a2632] border-r border-slate-200 dark:border-slate-800
          flex flex-col transition-transform duration-300 ease-in-out
          md:sticky md:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >

        { }
        <div className="flex items-center justify-between px-2 mb-8 mt-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-slate-900 dark:text-white">StageVerse</h1>
              <p className="text-xs text-slate-500 font-medium">Fan Portal</p>
            </div>
          </div>

          { }
          <button
            onClick={onClose}
            className="md:hidden p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        { }
        <nav className="flex flex-col gap-1 flex-1">
          {links.map((item) => {
            const isActive = pathname === item.href;

            if (item.action === 'OPEN_NOTIFICATIONS') {
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    console.log("Notification Clicked", { onOpenNotifications });
                    onClose();
                    if (onOpenNotifications) onOpenNotifications();
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white text-left"
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose} // Close sidebar on mobile when a link is clicked
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${isActive
                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/25"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        { }
        <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default FanSidebar;  