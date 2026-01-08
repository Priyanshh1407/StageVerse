'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Star, Menu, X, LogOut, User } from 'lucide-react'; // Added Icons
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);

  // 1. Check Login State on Mount
  useEffect(() => {
    setMounted(true);
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // 2. Logout Function
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' }); // Clear Cookie
      localStorage.removeItem('user'); // Clear UI Data
      setUser(null);
      setIsOpen(false); // Close mobile menu if open
      router.push('/'); 
      router.refresh();
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  // 3. Helper to get the correct Dashboard URL based on Role
  const getDashboardLink = () => {
    if (!user) return '/';
    const roleMap = {
      artist: '/artist-dashboard',
      organizer: '/manage/dashboard',
      production: '/prod-dashboard',
      fan: '/dashboard'
    };
    return roleMap[user.role] || '/dashboard';
  };

  const navLinks = [
    { label: 'Events', href: '/explore' },
    { label: 'Artists', href: '/explore-artist' },
    { label: 'About Us', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  // Prevent hydration mismatch
  if (!mounted) return null;

  return (
    <>
      <header className="fixed top-0 z-50 w-full bg-black/60 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-6 lg:px-12">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 cursor-pointer group" onClick={() => setIsOpen(false)}>
            <Star className="w-8 h-8 text-[#00d4ff] group-hover:text-white transition-colors" />
            <span className="text-xl font-bold tracking-widest text-white uppercase group-hover:text-[#00d4ff] transition-colors">
              StageVerse
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link 
                  key={item.label} 
                  href={item.href} 
                  className={`text-sm tracking-wide uppercase transition-colors ${
                    isActive 
                      ? 'text-white border-b-2 border-[#00d4ff] pb-0.5 font-bold' 
                      : 'text-slate-400 font-medium hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions & Mobile Toggle */}
          <div className="flex items-center gap-4">
            
            {/* --- DYNAMIC AUTH SECTION --- */}
            {user ? (
              // LOGGED IN VIEW
              <div className="hidden sm:flex items-center gap-4">
                <span className="text-sm text-slate-300">
                  Hi, <span className="text-[#00d4ff] font-bold">{user.name}</span>
                </span>

                <Link 
                  href={getDashboardLink()}
                  className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-[#00d4ff] flex items-center justify-center text-white font-bold text-sm hover:scale-110 transition-transform shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                  title="Go to Dashboard"
                >
                   {user.name.charAt(0).toUpperCase()}
                </Link>

                <button 
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-400 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              // LOGGED OUT VIEW
              <>
                <Link href="/login" className="hidden text-sm font-bold text-slate-300 uppercase transition-colors hover:text-white sm:block">
                  Login
                </Link>
                
                <Link href="/signup" className="hidden sm:block rounded-full bg-[#00d4ff] px-7 py-2.5 text-sm font-bold text-black uppercase transition-all hover:bg-white hover:scale-105 shadow-[0_0_20px_rgba(0,212,255,0.25)]">
                  Sign Up
                </Link>
              </>
            )}

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden text-white hover:text-[#00d4ff] transition-colors"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-20 left-0 right-0 z-40 md:hidden bg-black/95 border-b border-white/10 backdrop-blur-xl overflow-hidden"
          >
            <div className="flex flex-col p-6 space-y-6">
              {navLinks.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link 
                    key={item.label} 
                    href={item.href} 
                    className={`text-lg font-bold tracking-wide uppercase transition-colors ${
                      isActive ? 'text-[#00d4ff]' : 'text-slate-300 hover:text-white'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
              
              <div className="pt-4 flex flex-col gap-4 border-t border-white/10">
                {user ? (
                   // MOBILE LOGGED IN
                   <div className="flex flex-col gap-4">
                      <Link 
                        href={getDashboardLink()}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#00d4ff]/50"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#00d4ff] flex items-center justify-center text-black font-bold">
                           {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white font-bold">{user.name}</span>
                          <span className="text-xs text-[#00d4ff] uppercase">{user.role} Dashboard</span>
                        </div>
                      </Link>

                      <button 
                        onClick={handleLogout}
                        className="w-full py-3 rounded-lg border border-red-500/30 text-red-400 font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                      >
                        <LogOut className="w-4 h-4" /> LOGOUT
                      </button>
                   </div>
                ) : (
                   // MOBILE LOGGED OUT
                   <>
                    <Link href="/login" onClick={() => setIsOpen(false)} className="w-full py-3 rounded-lg border border-white/10 text-white font-bold text-center hover:bg-white/5 transition-colors">
                      LOGIN
                    </Link>
                    <Link href="/signup" onClick={() => setIsOpen(false)} className="w-full py-3 rounded-lg bg-[#00d4ff] text-black font-bold text-center hover:bg-white transition-colors shadow-[0_0_15px_rgba(0,212,255,0.25)]">
                      SIGN UP
                    </Link>
                   </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}