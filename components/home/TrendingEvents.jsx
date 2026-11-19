'use client';

import Link from 'next/link';
import { ArrowRight, MapPin, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatPrice } from '@/lib/format';

export default function TrendingEvents({ events, isLoading }) {
  return (
    <section className="py-16 relative overflow-hidden" id="trending">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-[#ff6a00]/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="mx-auto max-w-[1440px] px-6 lg:px-12 relative z-10">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Coming up soon</h2>
            <p className="text-slate-400">The next shows on StageVerse.</p>
          </div>
          <a href="/explore" className="flex min-h-11 items-center gap-1 text-[#ffb000] hover:text-white font-medium transition-colors">
            View all <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {}
        {isLoading ? (
          <div className="flex justify-center items-center h-64 w-full">
            <Loader2 className="w-10 h-10 text-[#ffb000] animate-spin" />
          </div>
        ) : (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
            className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-2 sm:mx-0 sm:grid sm:snap-none sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 sm:grid-cols-2 lg:grid-cols-4"
          >
            {events.map((event) => (
              <motion.div
                key={event.id}
                className="w-[78%] shrink-0 snap-start sm:w-auto"
                variants={{
                  hidden: { opacity: 0, y: 50 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 20 } }
                }}
              >
                <Link
                  href={`/events/${event.id}`}
                  className="group relative overflow-hidden rounded-2xl bg-[#0a0a0a] border border-white/5 transition-all hover:border-[#a855f7]/30 hover:shadow-[0_0_40px_-10px_rgba(255,106,0,0.3)] cursor-pointer block h-full"
                >

                  <div className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md rounded-lg px-3 py-1.5 text-center border border-white/10">
                    <div className="text-xs text-[#ffb000] font-bold uppercase tracking-wider">{event.month}</div>
                    <div className="text-xl font-bold text-white leading-none">{event.date}</div>
                  </div>

                  <div className="relative aspect-[3/4] w-full overflow-hidden">
                    <img src={event.image} alt={event.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-90"></div>

                    <div className="absolute top-4 left-4 z-20">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-black/70 text-[#ffb000] border border-white/10 backdrop-blur-md">
                        {event.genre}
                      </span>
                    </div>

                    <div className="absolute bottom-0 left-0 w-full p-5">
                      <h3 className="text-xl font-bold text-white leading-tight mb-1 group-hover:text-[#ffb000] transition-colors">{event.name}</h3>
                      <div className="flex items-center gap-1 text-slate-400 text-sm mb-4">
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </div>
                      {}
                      <div className={`w-full rounded-lg py-3 text-sm font-bold transition-all text-center ${event.price ? 'bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] text-black group-hover:scale-105' : 'bg-white/10 border border-white/10 text-white group-hover:bg-white group-hover:text-black'}`}>
                        {event.price ? `View event • from ${formatPrice(event.price)}` : 'View event'}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}