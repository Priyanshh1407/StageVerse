'use client';

import Navbar from '@/components/Navbar';
import MainFooter from '@/components/MainFooter';
import AboutHero from '@/components/about/AboutHero';
import OurStory from '@/components/about/OurStory';
import CoreValues from '@/components/about/CoreValues';
import VisionSection from '@/components/about/VisionSection';
import CTASection from '@/components/about/CtaSection';

export default function AboutPage() {
  return (
    <div className="bg-[#0F0F10] text-gray-200 font-sans antialiased selection:bg-[#00E5FF] selection:text-white min-h-screen flex flex-col">
      
      <Navbar />

      <main className="flex-grow">
        <AboutHero />
        <OurStory />
        <CoreValues />
        <VisionSection />
        <CTASection />
      </main>

      <MainFooter />
    </div>
  );
}