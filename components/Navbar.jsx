'use client'; 

import React, { useState } from 'react';
import { Button } from "@/components/ui/button"; 
import { Sparkles, Menu, X, Search, Bell, BarChart3 } from "lucide-react"; 
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// You can replace this prop with a real auth hook later, e.g., const { user } = useAuth();
const Navbar = ({ isLoggedIn = false }) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  
  const isActive = (path) => pathname === path;
  const closeMenu = () => setIsOpen(false);

  // --- CONFIGURATION ---
  
  // 1. Logged Out Links (Marketing)
  const publicLinks = [
    { href: "/explore", label: "EVENTS" },
    { href: "/artists", label: "ARTISTS" },
    { href: "/overview", label: "OVERVIEW" },
    { href: "/pricing", label: "PRICING" },
    { href: "/contact", label: "CONTACT" },
  ];

  // 2. Logged In Links (App)
  const appLinks = [
    { href: "/discover", label: "Discover" },
    { href: "/artists", label: "Artists" },
    { href: "/venues", label: "Venues" },
    { href: "/my-events", label: "My Tracked Events" },
  ];

  const currentLinks = isLoggedIn ? appLinks : publicLinks;

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md transition-colors ${
      isLoggedIn 
        ? "bg-background-light dark:bg-[#101b23] border-slate-200 dark:border-[#223949]" 
        : "bg-card/80 border-border/50"
    }`}>
      <div className={`container mx-auto ${isLoggedIn ? 'px-6 md:px-10' : 'px-4 lg:px-8'}`}>
        <div className="flex items-center justify-between h-16">
          
          {/* --- LEFT: LOGO --- */}
          <div className="flex items-center gap-8">
            <Link href={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-2" onClick={closeMenu}>
              {/* Use different logo icon if desired, keeping Sparkles for consistency or BarChart3 for App feel */}
              {isLoggedIn ? <BarChart3 className="w-8 h-8 text-primary" /> : <Sparkles className="w-6 h-6 text-primary" />}
              <span className={`font-bold text-foreground ${isLoggedIn ? "text-lg tracking-tight" : "text-xl"}`}>
                {isLoggedIn ? "StageVerse" : "StageVerse"}
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              {currentLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href} 
                  className={`text-sm font-medium transition-colors ${
                    isActive(link.href) 
                      ? "text-primary" 
                      : isLoggedIn 
                        ? "text-slate-600 dark:text-white hover:text-primary" 
                        : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* --- RIGHT: ACTIONS --- */}
          <div className="ml-auto flex items-center gap-6">
            
            {isLoggedIn ? (
              // LOGGED IN STATE: Search, Bell, Avatar
              <>
                {/* Search Bar (Hidden on mobile) */}
                <label className="hidden md:flex flex-col min-w-40 h-10 max-w-64 relative">
                  <div className="flex w-full flex-1 items-stretch rounded-lg h-full border border-slate-200 dark:border-none overflow-hidden">
                    <div className="text-slate-400 dark:text-[#90b2cb] flex bg-white dark:bg-[#223949] items-center justify-center pl-4 pr-2">
                      <Search className="w-4 h-4" />
                    </div>
                    <input 
                      className="flex w-full min-w-0 flex-1 bg-white dark:bg-[#223949] text-slate-900 dark:text-white focus:outline-none px-2 text-sm" 
                      placeholder="Search events..." 
                    />
                  </div>
                </label>

                {/* Notifications */}
                <button className="bg-[#13212b] hover:bg-[#182934] text-white p-2 rounded-full relative transition-colors hidden sm:block">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
                </button>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden border-2 border-primary/20">
                   <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCXWfGS7zEOZwA4uJ8sKrCLdwUyUVeZOHiVwTMZ_XzsRY_UcF172ET-b0zQDkUUr1_rZa37CHnwOQ4wWXkwfzjT4iapKvc42naMCq2aycQUSbBUJAqSxkrFV8M4DzOPkakfjAMRASEEKrptV4GXh1oCCByfW-cWLsInGdZHLR4AE4JCN5nhyU2hozxuTFBP7G-PFnCuWnDZJgBeYY9gQprFHF4SRJYBSv8ChOj-NCH5b9KchVjWbb_p_pKXh8Z2FiImhjaHI8cecng8" alt="Profile" className="w-full h-full object-cover" />
                </div>
              </>
            ) : (
              // LOGGED OUT STATE: Login/Signup
              <div className="hidden md:flex items-center gap-4">
                <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors text-sm tracking-wide">
                  LOGIN
                </Link>
                <Link href="/signup">
                  <Button variant="default" size="sm" className="rounded-full px-5">
                    SIGN UP
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle (Visible in both states) */}
            <div className="md:hidden flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="text-foreground">
                <span className="sr-only">Toggle Menu</span>
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* --- MOBILE MENU DROPDOWN --- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="md:hidden absolute top-16 left-0 w-full bg-card border-b border-border/50 shadow-2xl"
          >
            <div className="flex flex-col p-4 space-y-4">
              {currentLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href} 
                  className={`text-base font-medium py-2 border-b border-border/10 ${
                    isActive(link.href) ? "text-primary" : "text-muted-foreground"
                  }`}
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              ))}

              {!isLoggedIn && (
                <div className="flex flex-col gap-3 pt-2">
                  <Link href="/login" onClick={closeMenu}>
                    <Button variant="outline" className="w-full justify-center">LOGIN</Button>
                  </Link>
                  <Link href="/signup" onClick={closeMenu}>
                    <Button variant="default" className="w-full justify-center">SIGN UP</Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;