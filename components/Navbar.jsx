'use client'; 

import React, { useState } from 'react';
import { Button } from "@/components/ui/button"; 
import { Sparkles, Menu, X } from "lucide-react"; 
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const isActive = (path) => pathname === path;

  const publicLinks = [
    { href: "/explore", label: "EVENTS" },
    { href: "/artists", label: "ARTISTS" },
    { href: "/overview", label: "OVERVIEW" },
    { href: "/pricing", label: "PRICING" },
    { href: "/contact", label: "CONTACT" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 border-b border-white/10 backdrop-blur-md">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold text-white tracking-wide">stageverse</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {publicLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href} 
                className={`text-sm font-medium transition-colors ${
                  isActive(link.href) ? "text-primary" : "text-gray-300 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
              LOGIN
            </Link>
            <Link href="/signup">
              <Button variant="default" size="sm" className="rounded-full px-6">SIGN UP</Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="text-white">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-b border-white/10 bg-black/95 overflow-hidden"
          >
            <div className="flex flex-col p-6 space-y-4">
              {publicLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href} 
                  className="text-lg font-medium text-gray-300 hover:text-primary"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 flex flex-col gap-3">
                <Button variant="outline" className="w-full">LOGIN</Button>
                <Button className="w-full">SIGN UP</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;