'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Search, Bell, User, LogOut, CreditCard, Settings, 
  HelpCircle, ChevronDown, Menu, X 
} from 'lucide-react';

export default function StudioNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  
  // State for Dropdowns
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      // Close Profile Dropdown
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      // Close Mobile Menu if clicking outside nav
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        // Optional: Check if the click was on the hamburger button itself to avoid conflict
        // For simplicity, we usually let the button toggle handle itself or use a wrapper.
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Logout
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

  const navItems = [
    { label: 'Dashboard', href: '/prod-dashboard', isActive: (path) => path.includes('/production/dashboard') },
    { label: 'Patch Sheet', href: '/patch-sheet/101', isActive: (path) => path.includes('/patch-sheet') },
    { label: 'Patch Studio', href: '/patch-studio/101', isActive: (path) => path.includes('/patch-studio') },
    { label: 'Logistics', href: '/logistics/101', isActive: (path) => path.includes('/logistics') },
    { label: 'Live Show', href: '/live/101', isActive: (path) => path.includes('/live') },
  ];

  return (
    <nav className="h-[64px] bg-[#0d131a] border-b border-[#2c3e50] flex items-center justify-between px-4 md:px-6 shrink-0 relative z-50 shadow-lg select-none" ref={mobileMenuRef}>
      
      {/* LEFT SECTION: Hamburger + Logo + Desktop Nav */}
      <div className="flex items-center gap-4 md:gap-8 h-full">
        
        {/* Mobile Menu Toggle */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden text-[#90b2cb] hover:text-white transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Logo */}
        <Link href="/production/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#00d4ff] to-blue-600 flex items-center justify-center shadow-[0_0_10px_rgba(0,212,255,0.3)]">
            <span className="font-bold text-black text-xl">#</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight hidden md:block">Production Suite</span>
        </Link>

        {/* Desktop Navigation Links (Hidden on Mobile) */}
        <div className="hidden lg:flex items-center gap-1 h-full ml-4">
          {navItems.map((item) => {
            const active = item.isActive(pathname);
            return (
              <Link 
                key={item.label}
                href={item.href} 
                className={`h-full flex items-center px-4 text-[11px] font-bold uppercase tracking-wider transition-colors border-b-[3px] 
                  ${active 
                    ? 'text-white bg-white/5 border-[#00d4ff] shadow-[inset_0_-2px_6px_rgba(0,212,255,0.15)]' 
                    : 'text-[#90b2cb] border-transparent hover:text-white hover:border-white/20 hover:bg-white/5'
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* RIGHT SECTION: Search + Notifications + Profile */}
      <div className="flex items-center gap-3 md:gap-5">
        
        {/* Desktop Search Bar */}
        <div className="hidden md:flex items-center bg-[#0b1219] border border-[#2c3e50] rounded-full px-3 py-1.5 gap-2 group cursor-pointer hover:border-gray-500 transition-colors">
          <Search className="w-4 h-4 text-[#90b2cb] group-hover:text-[#00d4ff] transition-colors" />
          <span className="text-[10px] text-[#90b2cb] font-mono group-hover:text-white uppercase">Search</span>
        </div>

        <div className="h-4 w-px bg-[#2c3e50] hidden md:block"></div>
        
        <div className="flex items-center gap-3 md:gap-4">
          
          {/* Notifications */}
          <button className="text-[#90b2cb] hover:text-white transition-colors relative p-1">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1.5 w-1.5 h-1.5 bg-[#e74c3c] rounded-full border border-[#0d131a]"></span>
          </button>

          {/* PROFILE DROPDOWN */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 focus:outline-none group"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold leading-none text-white group-hover:text-[#00d4ff] transition-colors">Alex M.</p>
                <p className="text-[10px] text-[#90b2cb] leading-none mt-1">Lighting Designer</p>
              </div>
              <div className={`w-9 h-9 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 border flex items-center justify-center text-xs font-bold text-white shadow-lg transition-all ${isProfileOpen ? 'border-[#00d4ff] ring-2 ring-[#00d4ff]/20' : 'border-gray-500 group-hover:border-[#00d4ff]'}`}>
                 AM
              </div>
              <ChevronDown className={`hidden sm:block w-3 h-3 text-gray-500 transition-transform duration-200 ${isProfileOpen ? 'rotate-180 text-white' : ''}`} />
            </button>

            {/* The Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 top-12 w-64 bg-[#18181B] border border-[#2c3e50] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                {/* Mobile-only profile info in dropdown */}
                <div className="p-4 border-b border-[#2c3e50] bg-[#1d2b36] sm:hidden">
                  <p className="text-white font-bold text-sm">Alex Morrison</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">Lighting Designer</p>
                </div>

                <div className="p-2 bg-[#0b1219]"> 
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-red-400 hover:text-white hover:bg-red-500/10 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================== */}
      {/* MOBILE NAVIGATION MENU DRAWER */}
      {/* ============================== */}
      {isMobileMenuOpen && (
        <div className="absolute top-[64px] left-0 w-full bg-[#0d131a] border-b border-[#2c3e50] shadow-2xl lg:hidden flex flex-col animate-in slide-in-from-top-2 duration-200">
          
          {/* Mobile Search */}
          <div className="p-4 pb-2">
            <div className="flex items-center bg-[#0b1219] border border-[#2c3e50] rounded-lg px-3 py-2.5 gap-2">
              <Search className="w-4 h-4 text-[#90b2cb]" />
              <input 
                type="text" 
                placeholder="Search projects..." 
                className="bg-transparent border-none outline-none text-white text-sm w-full placeholder-[#90b2cb]" 
              />
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col p-2">
            {navItems.map((item) => {
              const active = item.isActive(pathname);
              return (
                <Link 
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)} // Close menu on click
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors
                    ${active 
                      ? 'text-white bg-[#00d4ff]/10 text-[#00d4ff]' 
                      : 'text-[#90b2cb] hover:text-white hover:bg-white/5'
                    }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

    </nav>
  );
}