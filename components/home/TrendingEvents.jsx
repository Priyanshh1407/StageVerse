'use client';

import { ArrowRight, MapPin, Loader2 } from 'lucide-react';

export default function TrendingEvents({ events, isLoading }) {
  return (
    <section className="py-20 bg-[#050505] relative overflow-hidden" id="trending">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-[#00d4ff]/5 rounded-full blur-[120px]"></div>
      </div>
      
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12 relative z-10">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Trending Now</h2>
            <p className="text-slate-400">Events getting the most hype this week.</p>
          </div>
          <a href="#" className="hidden md:flex items-center gap-1 text-[#00d4ff] hover:text-white font-medium transition-colors">
            View all <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* LOADING STATE */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64 w-full">
            <Loader2 className="w-10 h-10 text-[#00d4ff] animate-spin" />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {events.map((event) => (
              <div key={event.id} className="group relative overflow-hidden rounded-2xl bg-[#0a0a0a] border border-white/5 transition-all hover:border-[#00d4ff]/30 hover:shadow-[0_0_40px_-10px_rgba(0,212,255,0.3)] cursor-pointer">
                
                <div className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md rounded-lg px-3 py-1.5 text-center border border-white/10">
                  <div className="text-[10px] text-[#00d4ff] font-bold uppercase tracking-wider">{event.month}</div>
                  <div className="text-xl font-bold text-white leading-none">{event.date}</div>
                </div>

                <div className="relative aspect-[3/4] w-full overflow-hidden">
                  <img src={event.image} alt={event.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-90"></div>
                  
                  <div className="absolute top-4 left-4 z-20">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-md border ${event.color}`}>
                      {event.genre}
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 w-full p-5">
                    <h3 className="text-xl font-bold text-white leading-tight mb-1">{event.name}</h3>
                    <div className="flex items-center gap-1 text-slate-400 text-sm mb-4">
                      <MapPin className="w-4 h-4" />
                      {event.location}
                    </div>
                    <button className={`w-full rounded-lg py-3 text-sm font-bold transition-colors ${event.price ? 'bg-[#00d4ff] text-black hover:bg-white' : 'bg-white/10 border border-white/10 text-white hover:bg-white hover:text-black'}`}>
                      {event.price ? `Get Tickets • $${event.price}` : 'Join Waitlist'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}