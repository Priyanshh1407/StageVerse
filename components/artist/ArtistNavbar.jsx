'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Bell, LogOut, Menu, X } from 'lucide-react';

export default function ArtistNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Helper to determine if a link is active
  const isActive = (path) => pathname === path || pathname.startsWith(`${path}/`);

  // Define nav items in an array for cleaner rendering in both desktop and mobile views
  const navItems = [
    { href: "/artist-dashboard", label: "Dashboard" },
    { href: "/tech-rider", label: "Tech Rider" },
    { href: "/setlist-builder", label: "Setlist Builder" },
    { href: "/live-show", label: "Live Mode" },
    { href: "/day-sheet", label: "Smart Day Sheet" },
    { href: "/guest-list", label: "Guest List" },
  ];

  const [notifications, setNotifications] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Fetch Notifications (Crew Messages)
  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await fetch('/api/artist/notifications');
        const json = await res.json();
        if (json.success) setNotifications(json.data);
      } catch (e) {
        console.error("Failed to load notifications", e);
      }
    }
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkDone = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/production/logistics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'Done' })
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n._id !== id));
      }
    } catch (error) {
      console.error("Failed to mark done", error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-white dark:bg-[#101b23] border-b border-slate-200 dark:border-slate-800 px-6 py-3">
      <div className="flex items-center justify-between">

        {/* LEFT SIDE: Brand & Desktop Nav */}
        <div className="flex items-center gap-6">
          {/* Same as before... */}
          <div className="flex items-center gap-3 pr-6 lg:border-r lg:border-slate-200 lg:dark:border-slate-700">
            <div className="bg-center bg-no-repeat bg-cover rounded-full h-10 w-10 shadow-lg ring-2 ring-[#0d93f2]/20" style={{ backgroundImage: 'url("https://github.com/shadcn.png")' }}></div>
            <div className="hidden md:flex flex-col">
              <h1 className="text-slate-900 dark:text-white text-base font-bold leading-tight">Artist Hub</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-normal">Tour Management</p>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href} active={isActive(item.href)}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* RIGHT SIDE: Actions & Mobile Toggle */}
        <div className="flex items-center gap-4">

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#101b23] animate-pulse"></span>}
            </button>

            {isNotificationOpen && (
              <div className="absolute right-0 top-12 w-80 bg-white dark:bg-[#1e2e38] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right z-50">
                <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#18242e] flex justify-between items-center">
                  <span className="text-slate-900 dark:text-white font-bold text-sm">Crew Messages</span>
                  <span className="text-xs text-[#0d93f2] font-bold">{notifications.length} New</span>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">No new messages</div>
                  ) : (
                    notifications.map(note => (
                      <div key={note._id} className="p-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <div className="mt-1.5 w-2 h-2 rounded-full bg-[#0d93f2] flex-shrink-0"></div>
                          <div>
                            <p className="text-slate-800 dark:text-white text-sm font-medium leading-tight">{note.title.replace('Crew Message: ', '')}</p>
                            <p className="text-xs text-slate-500 mt-1">{new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleMarkDone(e, note._id)}
                          className="text-green-500 hover:text-green-600 dark:hover:text-green-400 p-1 flex-shrink-0"
                          title="Mark as Read"
                        >
                          <div className="border border-current rounded p-0.5"><div className="w-2.5 h-2.5 bg-current rounded-[1px]"></div></div>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-2 text-red-400 hover:text-red-500 text-sm font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>

          {/* Mobile Menu Toggle (Keep as is) */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN (Keep as is) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)} // Close menu on click
              className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive(item.href)
                ? 'font-bold text-[#0d93f2] bg-[#0d93f2]/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#223949]'
                }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Mobile Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 mt-2 text-sm font-medium text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      )}
    </nav>
  );
}

// NavLink Component (Desktop)
function NavLink({ href, children, active }) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${active
        ? 'font-bold text-[#0d93f2] bg-[#0d93f2]/10'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#223949]'
        }`}
    >
      {children}
    </Link>
  );
}