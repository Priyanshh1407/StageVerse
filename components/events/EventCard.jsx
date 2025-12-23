'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function EventCard({ event }) {
  return (
    <Link 
      href={`/event/${event.id}`}
      className="group relative block overflow-hidden rounded-xl bg-[#121212] ring-1 ring-white/5 transition-all hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] hover:ring-[#00d4ff]/50"
    >
      
      {/* Image Container */}
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <img 
          src={event.image} 
          alt={event.name} 
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
        
        {/* Card Content */}
        <div className="absolute bottom-0 left-0 w-full p-5">
          <div className="mb-1 text-xs font-bold text-[#00d4ff] tracking-wider uppercase">
            {event.displayDate} • {event.time}
          </div>
          
          <h3 className="text-2xl font-bold text-white leading-tight mb-1">
            {event.name}
          </h3>
          
          <p className="text-sm text-slate-300 mb-3">
            {event.venue}, {event.city}
          </p>
          
          {/* Footer / CTA */}
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-sm font-medium text-white">
              {event.priceDisplay}
            </span>
            {/* Replaced button with div since we are inside an <a> tag now, avoiding hydration errors */}
            <div className="rounded-full bg-white/10 p-2 text-white group-hover:bg-[#00d4ff] group-hover:text-black transition-colors">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Floating Tag */}
        {event.tag && (
          <div className="absolute top-4 left-4 rounded bg-white/20 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
            {event.tag}
          </div>
        )}
      </div>
    </Link>
  );
}