'use client';

import Link from 'next/link';
import { Sparkles, CalendarClock } from 'lucide-react';

export default function PromoSection() {
  return (
    <section className="py-16 relative">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row gap-12 items-center bg-[#141414] rounded-3xl p-8 lg:p-12 border border-white/5">
          
          {}
          <div className="lg:w-1/2 w-full">
            {/* (one of the event photos rendered from StageVerse's own stages) */}
            <img src="/images/events/mainstage-3.jpg" alt="The StageVerse mainstage in full light" className="w-full aspect-video rounded-xl object-cover" />
          </div>

          {}
          <div className="lg:w-1/2 w-full space-y-6">
            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
              Manage Your Event. <br/>
              <span className="text-[#ffb000]">Seamlessly.</span>
            </h2>
            
            <div className="flex items-start gap-3 text-slate-300">
              <Sparkles className="w-6 h-6 text-[#ffb000] mt-1 shrink-0" />
              <p className="text-lg">Use our AI powered assistant to write compelling event descriptions in seconds and automate your workflows.</p>
            </div>
            
            <div className="flex items-start gap-3 text-slate-300">
              <CalendarClock className="w-6 h-6 text-[#ffb000] mt-1 shrink-0" />
              <p className="text-lg">One timeline for you, the artist and the crew: the day sheet, the setlist, the lighting patch and every task.</p>
            </div>
            
            <div className="pt-4">
              <Link href="/signup?role=organizer" className="inline-block px-8 py-3 rounded-lg border border-[#a855f7]/50 text-[#ffb000] font-bold hover:bg-gradient-to-r hover:from-[#ffb000] hover:via-[#ff6a00] hover:to-[#ff3d7a] hover:text-black transition-all uppercase tracking-wide">
                Start as an organizer
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}