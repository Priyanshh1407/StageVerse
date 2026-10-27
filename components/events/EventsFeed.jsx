'use client';

import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import EventCard from './EventCard';

export default function EventsFeed({ 
  events, 
  isLoading, 
  onLoadMore, 
  hasMore, 
  totalFound, 
  onToggleFilters, 
  sortOption, 
  setSortOption 
}) {
  return (
    <div className="flex-1">
      
      {}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center">
          Events 
          {!isLoading && (
            <span className="text-sm font-normal text-slate-500 ml-2 pt-1">
              ({totalFound} found)
            </span>
          )}
        </h2>

        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
          <button 
            onClick={onToggleFilters}
            className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-lg bg-[#121212] border border-white/10 text-white text-sm font-medium hover:border-[#00d4ff] transition-all whitespace-nowrap"
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>

          <div className="flex items-center gap-2 bg-[#121212] border border-white/10 rounded-lg px-3 py-2 flex-1 sm:flex-initial">
            <span className="text-sm text-slate-400 whitespace-nowrap">Sort:</span>
            <select 
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="bg-transparent text-sm font-medium text-white focus:ring-0 cursor-pointer w-full outline-none"
            >
              <option value="date" className="bg-[#121212]">Date: Soonest</option>
              <option value="price_low" className="bg-[#121212]">Price: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {}
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : events.length > 0 ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-12 flex justify-center">
              <button 
                onClick={onLoadMore}
                className="group flex items-center gap-2 rounded-full border border-white/10 bg-[#1e1e1e] px-6 py-3 text-sm font-bold text-white transition-all hover:border-[#00d4ff] hover:bg-[#121212] hover:text-[#00d4ff]"
              >
                <span>Load More Events</span>
                <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500 border border-dashed border-white/10 rounded-xl">
          <p>No events found matching your filters.</p>
          <p className="text-sm mt-2">Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
}
function SkeletonCard() {
  return (
    <div className="rounded-xl bg-[#121212] border border-white/5 overflow-hidden">
      <div className="aspect-[4/5] bg-white/5 animate-pulse relative">
        <div className="absolute bottom-0 left-0 w-full p-5 space-y-3">
          <div className="h-3 w-24 bg-white/10 rounded"></div>
          <div className="h-6 w-3/4 bg-white/10 rounded"></div>
          <div className="h-4 w-1/2 bg-white/10 rounded"></div>
          <div className="pt-3 border-t border-white/5 flex justify-between">
            <div className="h-4 w-16 bg-white/10 rounded"></div>
            <div className="h-8 w-8 bg-white/10 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}