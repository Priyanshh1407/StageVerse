'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation'; // Added usePathname
import { Bell, LogOut, Menu } from 'lucide-react';

export default function ArtistNavbar() {
  const router = useRouter();
  const pathname = usePathname(); // Get current path

  const handleLogout = () => {
    console.log("Logging out...");
    router.push('/'); 
  };

  // Helper function to determine if a link is active
  const isActive = (path) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white dark:bg-[#101b23] border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        {/* Profile / Brand */}
        <div className="flex items-center gap-3 pr-6 border-r border-slate-200 dark:border-slate-700">
          <div className="bg-center bg-no-repeat bg-cover rounded-full h-10 w-10 shadow-lg ring-2 ring-[#0d93f2]/20" style={{ backgroundImage: 'url("https://github.com/shadcn.png")' }}></div>
          <div className="hidden md:flex flex-col">
            <h1 className="text-slate-900 dark:text-white text-base font-bold leading-tight">Artist Hub</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-normal">Tour Management</p>
          </div>
        </div>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-1">
          {/* We pass the 'isActive' boolean to each NavLink */}
          <NavLink href="/artist-dashboard" active={isActive('/artist-dashboard')}>Dashboard</NavLink>
          <NavLink href="/tech-rider" active={isActive('/tech-rider')}>Tech Rider</NavLink>
          <NavLink href="/setlist-builder" active={isActive('/setlist-builder')}>Setlist Builder</NavLink>
          <NavLink href="/live-show" active={isActive('/live-show')}>Live Mode</NavLink>
          <NavLink href="/day-sheet" active={isActive('/day-sheet')}>Smart Day Sheet</NavLink>
          <NavLink href="/guest-list" active={isActive('/guest-list')}>Guest List</NavLink>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#101b23]"></span>
        </button>
        
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
        
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-400 hover:text-red-500 text-sm font-medium transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden sm:inline">Log Out</span>
        </button>

        <button className="lg:hidden p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </nav>
  );
}

// Updated NavLink to accept the calculated 'active' prop
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