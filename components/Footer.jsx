import Link from "next/link";
import { Twitter, Facebook, Instagram, Youtube, Sparkles } from "lucide-react";

const Footer = () => {
  const footerLinks = [
    { label: "About Us", href: "/about" },
    { label: "For Promoters", href: "/promoters" },
    { label: "Help Center", href: "/help" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ];

  const socialLinks = [
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Youtube, href: "#", label: "YouTube" },
  ];

  return (
    <footer className="border-t border-white/5 bg-black py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Top Section: Flex Container for Logo, Links, Socials */}
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          
          {/* 1. Brand Logo */}
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-white tracking-widest uppercase">
              Stageverse
            </span>
          </div>

          {/* 2. Navigation Links */}
          <nav className="flex flex-wrap justify-center gap-8">
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-slate-400 hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* 3. Social Icons */}
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

        {/* Bottom Section: Copyright */}
        <div className="mt-8 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Stageverse Inc. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;