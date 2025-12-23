'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Star, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Defined links based on your latest structure
  const navLinks = [
    { label: 'Events', href: '/explore' },
    { label: 'Artists', href: '/explore-artist' },
    // { label: 'Overview', href: '/overview' },
    { label: 'About Us', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

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
            <button className="hidden text-sm font-bold text-slate-300 uppercase transition-colors hover:text-white sm:block">
              Login
            </button>
            
            <button className="hidden sm:block rounded-full bg-[#00d4ff] px-7 py-2.5 text-sm font-bold text-black uppercase transition-all hover:bg-white hover:scale-105 shadow-[0_0_20px_rgba(0,212,255,0.25)]">
              Sign Up
            </button>

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

      {/* Mobile Menu Dropdown (Framer Motion) */}
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
                <button className="w-full py-3 rounded-lg border border-white/10 text-white font-bold hover:bg-white/5 transition-colors">
                  LOGIN
                </button>
                <button className="w-full py-3 rounded-lg bg-[#00d4ff] text-black font-bold hover:bg-white transition-colors shadow-[0_0_15px_rgba(0,212,255,0.25)]">
                  SIGN UP
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}