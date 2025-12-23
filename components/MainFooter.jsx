import Link from "next/link";
import { Twitter, Facebook, Instagram, Youtube, Sparkles, BarChart3 } from "lucide-react";

const MainFooter = ({ isLoggedIn = false }) => {
  // --- CONFIGURATION ---
  
  const publicLinks = [
    { label: "About Us", href: "/about" },
    { label: "For Promoters", href: "/promoters" },
    { label: "Help Center", href: "/help" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ];

  // App footer usually has less marketing fluff
  const appLinks = [
    { label: "About Us", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ];

  const socialLinks = [
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Youtube, href: "#", label: "YouTube" },
  ];

  // --- RENDER LOGGED IN FOOTER (Simpler, App Style) ---
  if (isLoggedIn) {
    return (
      <footer className="bg-background-light dark:bg-[#101b23] border-t border-slate-200 dark:border-[#223949] py-10 px-6 lg:px-40">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <BarChart3 className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">ConcertTracker</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-sm text-[#90b2cb]">
            {appLinks.map(link => (
              <Link key={link.label} href={link.href} className="hover:text-primary transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex gap-4 text-[#90b2cb]">
             {/* Simplified Socials for App */}
             {socialLinks.slice(0, 2).map((social) => (
                <Link key={social.label} href={social.href} className="hover:text-primary transition-colors">
                  <social.icon className="w-5 h-5" />
                </Link>
             ))}
          </div>
        </div>
        <div className="mt-8 text-center text-xs text-[#90b2cb]">
          © {new Date().getFullYear()} ConcertTracker. All rights reserved.
        </div>
      </footer>
    );
  }

  // --- RENDER LOGGED OUT FOOTER (Marketing Style) ---
  return (
    <footer className="border-t border-white/5 bg-black py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-white tracking-widest uppercase">
              Stageverse
            </span>
          </div>

          <nav className="flex flex-wrap justify-center gap-8">
            {publicLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-slate-400 hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex gap-4">
            {socialLinks.map((social) => (
              <Link
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <social.icon className="h-5 w-5" />
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Stageverse Inc. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default MainFooter;