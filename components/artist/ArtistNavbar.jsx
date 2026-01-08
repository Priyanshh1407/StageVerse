'use client';

import { useState } from 'react';
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

  return (
    <nav className="sticky top-0 z-50 w-full bg-white dark:bg-[#101b23] border-b border-slate-200 dark:border-slate-800 px-6 py-3">
      <div className="flex items-center justify-between">
        
        {/* LEFT SIDE: Brand & Desktop Nav */}
        <div className="flex items-center gap-6">
          {/* Profile / Brand */}
          <div className="flex items-center gap-3 pr-6 lg:border-r lg:border-slate-200 lg:dark:border-slate-700">
            <div className="bg-center bg-no-repeat bg-cover rounded-full h-10 w-10 shadow-lg ring-2 ring-[#0d93f2]/20" style={{ backgroundImage: 'url("https://github.com/shadcn.png")' }}></div>
            <div className="hidden md:flex flex-col">
              <h1 className="text-slate-900 dark:text-white text-base font-bold leading-tight">Artist Hub</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-normal">Tour Management</p>
            </div>
          </div>

          {/* Desktop Menu (Hidden on mobile) */}
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
          <button className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#101b23]"></span>
          </button>
          
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
          
          <button 
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-2 text-red-400 hover:text-red-500 text-sm font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>

          {/* Mobile Menu Toggle Button */}
          <button 
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {isMobileMenuOpen && (
        <div className="lg:hidden mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200">
          {navItems.map((item) => (
            <Link 
              key={item.href}
              href={item.href} 
              onClick={() => setIsMobileMenuOpen(false)} // Close menu on click
              className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive(item.href)
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
      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
        active 
        ? 'font-bold text-[#0d93f2] bg-[#0d93f2]/10' 
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#223949]'
      }`}
    >
      {children}
    </Link>
  );
}