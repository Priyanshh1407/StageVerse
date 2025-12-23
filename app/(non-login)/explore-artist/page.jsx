'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import MainFooter from '@/components/MainFooter';
import ArtistsFilter from '@/components/explore-artist/ArtistFilter';
import ArtistsFeed from '@/components/explore-artist/ArtistFeed';

// --- MOCK DATA ---
const MOCK_ARTISTS = [
  { id: 1, name: 'ODESZA', genre: 'Electronic', type: 'Band / Group', location: 'Seattle, WA', upcomingEvents: 3, popularity: 95, image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop' },
  { id: 2, name: 'Aurora', genre: 'Indie', type: 'Solo Artist', location: 'Bergen, Norway', upcomingEvents: 12, popularity: 88, image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=800&auto=format&fit=crop' },
  { id: 3, name: 'The Chaokiims', genre: 'Rock', type: 'Band / Group', location: 'Berlin, Germany', upcomingEvents: 5, popularity: 75, image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=800&auto=format&fit=crop' },
  { id: 4, name: 'Stone Giants', genre: 'Rock', type: 'Band / Group', location: 'Austin, TX', upcomingEvents: 8, popularity: 60, image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=800&auto=format&fit=crop' },
  { id: 5, name: 'Neon Nights', genre: 'Electronic', type: 'DJ', location: 'Miami, FL', upcomingEvents: 2, popularity: 82, image: 'https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?q=80&w=800&auto=format&fit=crop' },
  { id: 6, name: 'River & Soul', genre: 'Pop', type: 'Band / Group', location: 'Nashville, TN', upcomingEvents: 6, popularity: 70, image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=800&auto=format&fit=crop' },
  // Adding duplicates to demonstrate "Load More" functionality
  { id: 7, name: 'Cyber Punk', genre: 'Electronic', type: 'DJ', location: 'Tokyo, JP', upcomingEvents: 1, popularity: 65, image: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=800&auto=format&fit=crop' },
  { id: 8, name: 'Jazz Cats', genre: 'Jazz', type: 'Band / Group', location: 'New Orleans, LA', upcomingEvents: 4, popularity: 55, image: 'https://images.unsplash.com/photo-1514525253440-b393332569ca?q=80&w=800&auto=format&fit=crop' },
];

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
      await new Promise(r => setTimeout(r, 1000));
      setAllArtists(MOCK_ARTISTS);
      setIsLoading(false);
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