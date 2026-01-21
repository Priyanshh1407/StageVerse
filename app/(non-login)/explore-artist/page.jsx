'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import MainFooter from '@/components/MainFooter';
import ArtistsFilter from '@/components/explore-artist/ArtistFilter';
import ArtistsFeed from '@/components/explore-artist/ArtistFeed';

// --- MOCK DATA ---
// --- MOCK DATA (Removed - using API) ---

export default function ArtistsPage() {
  const [allArtists, setAllArtists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortOption, setSortOption] = useState('popularity');

  // PAGINATION STATE
  const [visibleCount, setVisibleCount] = useState(6);

  const [filters, setFilters] = useState({
    genres: [],
    types: [],
    popularity: 0
  });

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/artists');
        const json = await res.json();
        if (json.success) {
          setAllArtists(json.data);
        }
      } catch (err) {
        console.error("Failed to load artists", err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const filteredArtists = useMemo(() => {
    let result = allArtists.filter(artist => {
      const matchesSearch =
        artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGenre = filters.genres.length === 0 || filters.genres.includes(artist.genre);
      const matchesType = filters.types.length === 0 || filters.types.includes(artist.type);
      const matchesPop = artist.popularity >= filters.popularity;

      return matchesSearch && matchesGenre && matchesType && matchesPop;
    });

    if (sortOption === 'popularity') {
      result.sort((a, b) => b.popularity - a.popularity);
    } else if (sortOption === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'newest') {
      result.sort((a, b) => b.id - a.id);
    }

    return result;
  }, [allArtists, searchQuery, filters, sortOption]);

  // PAGINATION LOGIC
  const visibleArtists = filteredArtists.slice(0, visibleCount);
  const hasMore = visibleCount < filteredArtists.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 6);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilters({ genres: [], types: [], popularity: 0 });
    setSortOption('popularity');
    setVisibleCount(6); // Reset pagination on filter reset
  };

  return (
    <div className="bg-[#0F0F10] font-sans text-white min-h-screen flex flex-col antialiased selection:bg-[#00C2FF] selection:text-black">

      <Navbar />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 pt-24">
        <div className="flex flex-col lg:flex-row gap-8">

          <ArtistsFilter
            filters={filters}
            setFilters={setFilters}
            onReset={resetFilters}
            isOpen={showFilters}
            onClose={() => setShowFilters(false)}
          />

          <ArtistsFeed
            artists={visibleArtists} // Pass sliced list
            isLoading={isLoading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortOption={sortOption}
            setSortOption={setSortOption}
            onToggleFilters={() => setShowFilters(true)}
            onLoadMore={handleLoadMore} // Pass handler
            hasMore={hasMore} // Pass boolean
          />

        </div>
      </main>

      <MainFooter />
    </div>
  );
}