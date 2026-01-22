'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Star, Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Session check failed", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' }); 
      setUser(null);
      setIsOpen(false);
      router.push('/'); 
      router.refresh();
    } catch (err) {
      console.error('Logout failed', err);
    }
  };  const getDashboardLink = () => {
    if (!user) return '/login';
    const role = (user.role || '').toLowerCase();
    
    const roleMap = {
      artist: '/artist-dashboard',
      organizer: '/manage/dashboard',
      production: '/prod-dashboard',
      fan: '/dashboard',
      user: '/dashboard'
    };
    
    return roleMap[role] || '/dashboard';
  };

  const baseLinks = [
    { label: 'Events', href: '/explore' },
    { label: 'Artists', href: '/explore-artist' },
    { label: 'About Us', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  const navLinks = user 
    ? [{ label: 'Dashboard', href: getDashboardLink() }, ...baseLinks]
    : baseLinks;

  return (
    <>
      <header className="fixed top-0 z-50 w-full bg-black/60 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-6 lg:px-12">
          
          {}
          <Link href="/" className="flex items-center gap-2 cursor-pointer group" onClick={() => setIsOpen(false)}>
            <Star className="w-8 h-8 text-[#00d4ff] group-hover:text-white transition-colors" />
            <span className="text-xl font-bold tracking-widest text-white uppercase group-hover:text-[#00d4ff] transition-colors">
              StageVerse
            </span>
          </Link>

          {}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              const isDashboard = item.label === 'Dashboard';
              
              return (
                <Link 
                  key={item.label} 
                  href={item.href} 
                  className={`text-sm tracking-wide uppercase transition-colors flex items-center gap-2 ${
                    isActive 
                      ? 'text-white border-b-2 border-[#00d4ff] pb-0.5 font-bold' 
                      : isDashboard 
                        ? 'text-[#00d4ff] font-bold hover:text-white' 
                        : 'text-slate-400 font-medium hover:text-white'
                  }`}
                >
                  {isDashboard && <LayoutDashboard className="w-4 h-4" />}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {}
          <div className="flex items-center gap-4">
            
            {}
            {isLoading ? (
               <div className="hidden sm:block w-24 h-8 bg-white/5 animate-pulse rounded-full"></div>
            ) : user ? (              <div className="hidden sm:flex items-center gap-4 pl-4 border-l border-white/10">
                <div className="flex flex-col items-end leading-tight">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Welcome</span>
                    <span className="text-sm font-bold text-white">Hi, <span className="text-[#00d4ff]">{user.name?.split(' ')[0]}</span>!</span>
                </div>

                <Link 
                  href={getDashboardLink()}
                  className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-[#00d4ff] flex items-center justify-center text-white font-bold text-lg hover:scale-110 transition-transform shadow-[0_0_15px_rgba(0,212,255,0.3)] border border-white/20"
                >
                   {user.name?.charAt(0).toUpperCase()}
                </Link>

                <button 
                  onClick={handleLogout}
                  className="ml-2 text-slate-500 hover:text-red-400 transition-colors p-2 hover:bg-white/5 rounded-full"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (              <div className="hidden sm:flex items-center gap-4">
                <Link href="/login" className="text-sm font-bold text-slate-300 uppercase transition-colors hover:text-white hover:underline decoration-[#00d4ff] underline-offset-4">
                  Login
                </Link>
                <Link href="/signup" className="rounded-full bg-[#00d4ff] px-6 py-2 text-sm font-bold text-black uppercase transition-all hover:bg-white hover:scale-105 shadow-[0_0_15px_rgba(0,212,255,0.3)]">
                  Sign Up
                </Link>
              </div>
            )}

            {}
            <button 
              className="md:hidden text-white hover:text-[#00d4ff] transition-colors p-1"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
          </div>

        </div>
      </header>

      {}
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
                const isDashboard = item.label === 'Dashboard';
                return (
                  <Link 
                    key={item.label} 
                    href={item.href} 
                    className={`text-lg font-bold tracking-wide uppercase transition-colors flex items-center gap-3 ${
                      isActive 
                        ? 'text-[#00d4ff]' 
                        : isDashboard 
                            ? 'text-[#00d4ff]' 
                            : 'text-slate-300 hover:text-white'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {isDashboard && <LayoutDashboard className="w-5 h-5" />}
                    {item.label}
                  </Link>
                );
              })}
              
              <div className="pt-6 flex flex-col gap-4 border-t border-white/10">
                {user ? (                   <div className="flex flex-col gap-4">
                      <Link 
                        href={getDashboardLink()}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-white/5 to-transparent border border-white/10 hover:border-[#00d4ff]/50 transition-all"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#00d4ff] flex items-center justify-center text-black font-bold text-lg shadow-[0_0_10px_rgba(0,212,255,0.4)]">
                           {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white font-bold text-lg">{user.name}</span>
                          <span className="text-xs text-[#00d4ff] uppercase tracking-wider font-semibold">{user.role} Account</span>
                        </div>
                      </Link>
                      <button 
                        onClick={handleLogout}
                        className="w-full py-3 rounded-lg border border-red-500/30 text-red-400 font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                      >
                        <LogOut className="w-4 h-4" /> LOGOUT
                      </button>
                   </div>
                ) : (                   <div className="grid grid-cols-2 gap-4">
                    <Link href="/login" onClick={() => setIsOpen(false)} className="py-3 rounded-lg border border-white/10 text-white font-bold text-center hover:bg-white/5 transition-colors uppercase">
                      Login
                    </Link>
                    <Link href="/signup" onClick={() => setIsOpen(false)} className="py-3 rounded-lg bg-[#00d4ff] text-black font-bold text-center hover:bg-white transition-colors shadow-[0_0_15px_rgba(0,212,255,0.25)] uppercase">
                      Sign Up
                    </Link>
                   </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}