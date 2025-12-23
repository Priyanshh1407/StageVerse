'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import MainFooter from '@/components/MainFooter';
import EventsHero from '@/components/events/EventsHero';
import EventsFilter from '@/components/events/EventFilters';
import EventsFeed from '@/components/events/EventsFeed';

// --- MOCK DATABASE (Updated with diverse categories) ---
const MOCK_DB_EVENTS = [
  { id: 1, name: 'ODESZA', date: '2025-10-14', displayDate: 'Oct 14', time: '8:00 PM', venue: 'Palace Arena', city: 'Mumbai', priceVal: 45, priceDisplay: '$45 - $120', image: 'https://images.unsplash.com/photo-1459749411177-3c0714b62437?q=80&w=800&auto=format&fit=crop', category: 'Electronic', vibes: ['Chill', 'Visuals'] },
  { id: 2, name: 'Aurora', date: '2025-11-02', displayDate: 'Nov 02', time: '9:00 PM', venue: 'The Greek', city: 'Los Angeles', priceVal: 0, priceDisplay: 'Free / RSVP', image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=800&auto=format&fit=crop', category: 'Indie', vibes: ['Intimate', 'Acoustic'] },
  { id: 3, name: 'The Chaokiims', date: '2025-11-18', displayDate: 'Nov 18', time: '4:00 PM', venue: 'Flakilo', city: 'Berlin', priceVal: 20, priceDisplay: '$20 - $40', image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=800&auto=format&fit=crop', category: 'Rock', vibes: ['Raging'] },
  { id: 4, name: 'Warehouse Project', date: '2025-12-05', displayDate: 'Dec 05', time: '11:00 PM', venue: 'Depot Mayfield', city: 'London', priceVal: 55, priceDisplay: '$55', image: 'https://images.unsplash.com/photo-1514525253440-b393332569ca?q=80&w=800&auto=format&fit=crop', category: 'Electronic', vibes: ['Raging', 'Dark'] },
  { id: 5, name: 'ROCK Valley', date: '2025-12-12', displayDate: 'Dec 12', time: 'All Day', venue: 'Patiest', city: 'New York', priceVal: 150, priceDisplay: '$150+', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop', category: 'Rock', vibes: ['Raging', 'Outdoor'], tag: 'ROCK' },
  { id: 6, name: 'Neon Nights', date: '2025-12-15', displayDate: 'Dec 15', time: '10:00 PM', venue: 'Cyber Plaza', city: 'Tokyo', priceVal: 80, priceDisplay: '$80', image: 'https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?q=80&w=800&auto=format&fit=crop', category: 'Electronic', vibes: ['Visuals', 'Raging'], tag: 'New' },
  { id: 7, name: 'Jazz in Park', date: '2025-10-20', displayDate: 'Oct 20', time: '2:00 PM', venue: 'Central Park', city: 'New York', priceVal: 0, priceDisplay: 'Free', image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=800&auto=format&fit=crop', category: 'Jazz', vibes: ['Chill', 'Acoustic'] },
  { id: 8, name: 'Tech Summit', date: '2025-11-05', displayDate: 'Nov 05', time: '9:00 AM', venue: 'Convention Ctr', city: 'London', priceVal: 200, priceDisplay: '$200', image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=800&auto=format&fit=crop', category: 'Conference', vibes: ['Chill'] },
];

export default function EventsPage() {
  const [allEvents, setAllEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);
  const [sortOption, setSortOption] = useState('date');
  
  const [filters, setFilters] = useState({
    city: 'All',
    date: '',
    maxPrice: 200,
    vibes: [],
    genres: [] // Changed from 'onlyElectronic' to array
  });

  useEffect(() => {
    async function init() {
      await new Promise(r => setTimeout(r, 1500)); // Increased time to see Skeleton
      setAllEvents(MOCK_DB_EVENTS);
      setIsLoading(false);
    }
    init();
  }, []);

  const filteredEvents = useMemo(() => {
    let result = allEvents.filter(event => {
      const matchesSearch = 
        event.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        event.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.city.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCity = filters.city === 'All' || event.city.includes(filters.city.split(',')[0]);
      const matchesDate = !filters.date || event.date === filters.date;
      const matchesPrice = event.priceVal <= filters.maxPrice;
      const matchesVibe = filters.vibes.length === 0 || event.vibes.some(v => filters.vibes.includes(v));
      
      // NEW GENRE LOGIC: If no genres selected, pass all. Else, check if category is in list.
      const matchesGenre = filters.genres.length === 0 || filters.genres.includes(event.category);

      return matchesSearch && matchesCity && matchesDate && matchesPrice && matchesGenre && matchesVibe;
    });

    if (sortOption === 'date') {
      result.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortOption === 'price_low') {
      result.sort((a, b) => a.priceVal - b.priceVal);
    }

    return result;
  }, [allEvents, searchQuery, filters, sortOption]);

  const visibleEvents = filteredEvents.slice(0, visibleCount);
  const hasMore = visibleCount < filteredEvents.length;

  const handleLoadMore = () => setVisibleCount(prev => prev + 6);
  
  const resetFilters = () => {
    setSearchQuery('');
    setFilters({ city: 'All', date: '', maxPrice: 200, vibes: [], genres: [] });
    setSortOption('date');
    setVisibleCount(6);
  };

  return (
    <div className="bg-[#f5f7f8] dark:bg-[#0a0a0a] font-sans text-slate-900 dark:text-white antialiased selection:bg-[#00d4ff] selection:text-black">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
        
        <Navbar />
        
        <main className="flex-1 relative pt-20">
          <EventsHero 
            searchValue={searchQuery} 
            onSearchChange={setSearchQuery} 
          />
          
          <div className="mx-auto flex max-w-[1440px] flex-col lg:flex-row gap-8 px-6 py-2 md:py-6 lg:py-12 lg:px-12">
            
            <EventsFilter 
              filters={filters} 
              setFilters={setFilters} 
              onReset={resetFilters}
              isOpen={showFilters}
              onClose={() => setShowFilters(false)}
            />
            
            <EventsFeed 
              events={visibleEvents} 
              isLoading={isLoading} 
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
              totalFound={filteredEvents.length}
              onToggleFilters={() => setShowFilters(true)}
              sortOption={sortOption}
              setSortOption={setSortOption}
            />
            
          </div>
        </main>

        <MainFooter />
        
      </div>
    </div>
  );
}