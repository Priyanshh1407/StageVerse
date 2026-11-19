'use client';
import Link from "next/link";
import Logo from '@/components/brand/Logo';
import BuiltBy from "@/components/brand/BuiltBy";

// (the same footer signed in or not)
const MainFooter = () => {
  
  // only pages that exist
  const publicLinks = [
    { label: "Events", href: "/explore" },
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ];
  return (
    <footer className="border-t border-white/5 bg-black py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          
          <div className="flex items-center gap-2">
            <Logo size="md" />
          </div>

          <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-8">
            {publicLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="flex min-h-11 items-center text-sm text-slate-300 hover:text-[#ffb000] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} StageVerse. <BuiltBy />. All rights reserved.
          <p className="mt-2">Songs on this site are used for educational, non-commercial purposes only. All rights belong to their respective owners.</p>
        </div>
      </div>
    </footer>
  );
};

export default MainFooter;