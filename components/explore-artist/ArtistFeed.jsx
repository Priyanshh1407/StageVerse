'use client';

import { Search, ChevronDown, SlidersHorizontal, Loader2 } from 'lucide-react';
import ArtistCard from './ArtistCard';

export default function ArtistsFeed({
  artists,
  isLoading,
  searchQuery,
  setSearchQuery,
  sortOption,
  setSortOption,
  onToggleFilters,
  onLoadMore, // Receive props
  hasMore
}) {
  return (
    <div className="flex-1">

      <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
        {/* ... (Search bar code remains same) ... */}
        <div className="relative w-full md:max-w-xl group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-gray-500 group-focus-within:text-[#00C2FF] transition-colors" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-11 pr-4 py-3 border border-gray-800 rounded-xl bg-[#18181B] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00C2FF] focus:border-transparent shadow-sm text-sm transition-all"
            placeholder="Search artists, genres, or locations..."
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={onToggleFilters}
            className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#18181B] border border-gray-800 text-white font-medium hover:border-[#00C2FF] transition-all"
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 whitespace-nowrap hidden sm:inline">Sort By</span>
            <div className="relative">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="block w-40 pl-3 pr-10 py-2.5 text-sm border border-gray-800 focus:outline-none focus:ring-[#00C2FF] focus:border-[#00C2FF] rounded-lg bg-[#18181B] text-white appearance-none cursor-pointer hover:border-gray-600 transition-colors"
              >
                <option value="popularity">Popularity</option>
                <option value="name">A-Z</option>
                <option value="newest">Newest</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-white mb-6 uppercase tracking-wide">Artists</h1>

      {isLoading ? (
        <div className="flex h-96 w-full items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#00C2FF] animate-spin" />
        </div>
      ) : artists.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>

          {/* LOAD MORE BUTTON LOGIC */}
          {hasMore && (
            <div className="mt-12 flex justify-center">
              <button
                onClick={onLoadMore}
                className="bg-[#18181B] hover:bg-[#00C2FF] hover:text-black text-white border border-gray-700 hover:border-[#00C2FF] px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 shadow-lg group"
              >
                Load More Artists
                <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 border border-dashed border-gray-800 rounded-xl">
          <p>No artists found.</p>
          <button onClick={() => setSearchQuery('')} className="text-[#00C2FF] text-sm mt-2 hover:underline">Clear Search</button>
        </div>
      )}
    </div>
  );
}