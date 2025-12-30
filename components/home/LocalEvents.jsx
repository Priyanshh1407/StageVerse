'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

export default function LocalEvents({ events, isLoading }) {
  // 1. State for Pagination
  const [startIndex, setStartIndex] = useState(0);
  const itemsPerPage = 2;

  // 2. Logic to slice data
  const visibleEvents = events.slice(startIndex, startIndex + itemsPerPage);
  
  // 3. Navigation Handlers
  const handleNext = () => {
    if (startIndex + itemsPerPage < events.length) {
      setStartIndex(prev => prev + itemsPerPage);
    }
  };

  const handlePrev = () => {
    if (startIndex > 0) {
      setStartIndex(prev => prev - itemsPerPage);
    }
  };

  // Helper booleans for disabling buttons
  const isStart = startIndex === 0;
  const isEnd = startIndex + itemsPerPage >= events.length;

  return (
    <section className="py-20 bg-[#0a0a0a] border-y border-white/5">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
        
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">This Weekend in Brooklyn</h2>
            <p className="text-slate-400">
              Showing {isLoading ? '...' : `${startIndex + 1}-${Math.min(startIndex + itemsPerPage, events.length)} of ${events.length} picks`}
            </p>
          </div>
          
          {/* 4. Connected Arrows to Pagination Logic */}
          <div className="hidden md:flex gap-3">
            <button 
              onClick={handlePrev}
              disabled={isStart}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${isStart ? 'border-white/5 text-white/20 cursor-not-allowed' : 'border-white/10 text-white hover:bg-white hover:text-black'}`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={handleNext}
              disabled={isEnd}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${isEnd ? 'border-white/5 text-white/20 cursor-not-allowed' : 'border-white/10 text-white hover:bg-white hover:text-black'}`}
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading ? (
          <div className="flex justify-center items-center h-48 w-full">
            <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
          </div>
        ) : (
          /* 5. Vertical Stack Layout (Restored) */
          <div className="space-y-4 min-h-[400px]"> 
            {visibleEvents.map((event) => (
              <Link 
                href={`/event/${event.id}`} 
                key={event.id} 
                className="group flex flex-col md:flex-row bg-[#141414] rounded-xl overflow-hidden border border-white/5 hover:border-[#00d4ff]/30 transition-all hover:bg-white/5 cursor-pointer animate-in fade-in slide-in-from-right-4 duration-300"
              >
                
                <div className="w-full md:w-64 h-48 md:h-auto shrink-0 relative overflow-hidden">
                  <img src={event.image} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  {event.badge && (
                    <div className="absolute top-3 left-3 bg-[#00d4ff] text-black text-xs font-bold px-2 py-0.5 rounded">
                      {event.badge}
                    </div>
                  )}
                </div>

                <div className="flex-1 p-6 flex flex-col justify-center">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1 group-hover:text-[#00d4ff] transition-colors">{event.title}</h3>
                      <p className="text-slate-400 text-sm mb-3">{event.venue} • {event.time}</p>
                      <div className="flex gap-2 mb-4 md:mb-0">
                        {event.tags.map(tag => (
                          <span key={tag} className="text-xs bg-white/5 text-slate-300 px-2 py-1 rounded border border-white/5">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-3">
                      <span className="text-xl font-bold text-white">{event.price}</span>
                      <div className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors text-center ${event.price === 'Free' ? 'bg-white/10 hover:bg-white hover:text-black text-white' : 'bg-white/10 hover:bg-[#00d4ff] hover:text-black text-white'}`}>
                        {event.price === 'Free' ? 'RSVP' : 'Buy'}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}