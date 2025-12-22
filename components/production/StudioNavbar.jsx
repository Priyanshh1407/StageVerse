'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, User, LogOut, CreditCard, Settings, HelpCircle, ChevronDown } from 'lucide-react';

export default function StudioNavbar() {
  const pathname = usePathname();
  const router = useRouter(); // Used for Logout navigation
  
  // State for Profile Dropdown
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  // Handle Logout
  const handleLogout = () => {
    // In a real app, you would clear tokens here
    router.push('/'); // Redirect to Home Page
  };

  const navItems = [
    { label: 'Dashboard', href: '/production/dashboard', isActive: (path) => path.includes('/production/dashboard') },
    { label: 'Patch Sheet', href: '/production/patch-sheet/101', isActive: (path) => path.includes('/patch-sheet') },
    { label: 'Patch Studio', href: '/production/patch-studio/101', isActive: (path) => path.includes('/patch-studio') },
    { label: 'Logistics', href: '/production/logistics/101', isActive: (path) => path.includes('/logistics') },
    { label: 'Live Show', href: '/production/live/101', isActive: (path) => path.includes('/live') },
  ];

  return (
    <nav className="h-[64px] bg-[#0d131a] border-b border-[#2c3e50] flex items-center justify-between px-6 shrink-0 relative z-50 shadow-lg select-none">
      <div className="flex items-center gap-8 h-full">
        
        {/* Logo */}
        <Link href="/production/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#00d4ff] to-blue-600 flex items-center justify-center shadow-[0_0_10px_rgba(0,212,255,0.3)]">
            <span className="font-bold text-black text-xl">#</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight hidden md:block">Production Suite</span>
        </Link>

        {/* Top Navigation Links */}
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

      {/* Right Actions */}
      <div className="flex items-center gap-5">
        
        {/* Search Bar */}
        <div className="hidden md:flex items-center bg-[#0b1219] border border-[#2c3e50] rounded-full px-3 py-1.5 gap-2 group cursor-pointer hover:border-gray-500 transition-colors">
          <Search className="w-4 h-4 text-[#90b2cb] group-hover:text-[#00d4ff] transition-colors" />
          <span className="text-[10px] text-[#90b2cb] font-mono group-hover:text-white uppercase">Search</span>
        </div>

        <div className="h-4 w-px bg-[#2c3e50] hidden md:block"></div>
        
        <div className="flex items-center gap-4">
          
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
              <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${isProfileOpen ? 'rotate-180 text-white' : ''}`} />
            </button>

            {/* The Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 top-12 w-64 bg-[#18181B] border border-[#2c3e50] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                
                {/* --- COMMENTED OUT SECTIONS FOR LATER USE ---
                
                <div className="p-4 border-b border-[#2c3e50] bg-[#1d2b36]">
                  <p className="text-white font-bold text-sm">Alex Morrison</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">alex.m@stageverse.com</p>
                </div>

                <div className="p-2 flex flex-col gap-1">
                  <DropdownItem icon={User} label="Profile Settings" />
                  <DropdownItem icon={CreditCard} label="Billing & Plans" />
                  <DropdownItem icon={Settings} label="Studio Preferences" />
                  <DropdownItem icon={HelpCircle} label="Help & Support" />
                </div>
                
                ---------------------------------------------- */}

                {/* Footer (Logout) - Styling adjusted to be the only item */}
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
    </nav>
  );
}

// Helper Sub-component for menu items
function DropdownItem({ icon: Icon, label, onClick }) {
  return (
    <button 
      onClick={onClick} 
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-gray-300 hover:text-white hover:bg-[#2c3e50] transition-colors text-left"
    >
      <Icon className="w-4 h-4 text-gray-500" />
      {label}
    </button>
  );
}