'use client'; 

import React, { useState } from 'react';
import { Button } from "@/components/ui/button"; 
import { Sparkles, Menu, X } from "lucide-react"; // Import Menu and X icons
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false); // State for mobile menu
  
  // Helper to determine if a link is active
  const isActive = (path) => pathname === path;

  // Helper class for nav links
  const getLinkClass = (path) => 
    `text-sm tracking-wide transition-colors ${
      isActive(path) ? "text-foreground" : "text-muted-foreground hover:text-foreground"
    }`;

  // Close menu when a link is clicked
  const closeMenu = () => setIsOpen(false);

  const navLinks = [
    { href: "/explore", label: "EVENTS" },
    { href: "/artists", label: "ARTISTS" },
    { href: "/overview", label: "OVERVIEW" },
    { href: "/pricing", label: "PRICING" },
    { href: "/contact", label: "CONTACT" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 border-b border-border/50 backdrop-blur-md">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left - Logo */}
          <Link href="/" className="flex items-center gap-2" onClick={closeMenu}>
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold text-foreground">stageverse</span>
          </Link>

          {/* Center - Primary Nav (Desktop) */}
          <div className="hidden md:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={getLinkClass(link.href)}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right - Auth Actions */}
          <div className="ml-auto flex items-center gap-4">
            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link 
                href="/login" 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm tracking-wide"
              >
                LOGIN
              </Link>
              <Link href="/signup">
                <Button variant="default" size="sm" className="rounded-full px-5">
                  SIGN UP
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Toggle Button */}
            <div className="md:hidden flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsOpen(!isOpen)}
                className="text-foreground"
              >
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
              {/* Mobile Navigation Links */}
              {navLinks.map((link) => (
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

              {/* Mobile Auth Buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <Link href="/login" onClick={closeMenu}>
                  <Button variant="outline" className="w-full justify-center">
                    LOGIN
                  </Button>
                </Link>
                <Link href="/signup" onClick={closeMenu}>
                  <Button variant="default" className="w-full justify-center">
                    SIGN UP
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;