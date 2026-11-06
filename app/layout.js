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

export const metadata = {
  title: "StageVerse: the entire concert ecosystem",
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
