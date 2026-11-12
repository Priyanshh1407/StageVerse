import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// where the site lives (links in the social card and the sitemap are built from it)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://stage-verse.vercel.app";
const DESCRIPTION = "Discover live shows, vote on the setlist, and run production: one platform for fans, artists, organizers and crew.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "StageVerse: the entire concert ecosystem",
  // the card shown when the site's link is pasted into LinkedIn, WhatsApp, X and others (the picture is app/opengraph-image.jpg)
  openGraph: { title: "StageVerse: the entire concert ecosystem", description: DESCRIPTION, url: "/", siteName: "StageVerse", type: "website" },
  twitter: { card: "summary_large_image", title: "StageVerse: the entire concert ecosystem", description: DESCRIPTION },
  // the author: StageVerse is designed and built by Priyansh Waghela
  authors: [{ name: "Priyansh Waghela", url: "https://www.linkedin.com/in/priyansh-waghela-3b754b282/" }],
  creator: "Priyansh Waghela",
  publisher: "Priyansh Waghela",
  description: "Discover live shows, vote on the setlist, and run production: one platform for fans, artists, organizers and crew.",
};

import { Toaster } from "@/components/ui/sonner";

import { SocketProvider } from "@/components/providers/SocketProvider";
import EscapeToClose from "@/components/EscapeToClose";

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SocketProvider>
          {children}
          <Toaster />
          <EscapeToClose />
        </SocketProvider>
      </body>
    </html>
  );
}
