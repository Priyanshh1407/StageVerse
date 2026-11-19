'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatPrice } from '@/lib/format';
import { eventImage } from '@/lib/eventImages';
import Navbar from '@/components/Navbar';
import MainFooter from '@/components/MainFooter';
import EventsHero from '@/components/events/EventsHero';
import EventsFilter from '@/components/events/EventFilters';
import EventsFeed from '@/components/events/EventsFeed';

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
      try {
        const res = await fetch('/api/events');
        const json = await res.json();

        if (json.success) {
          const mappedEvents = json.events.map(e => ({
            id: e._id,
            name: e.title, // Map title to name
            date: e.date ? new Date(e.date).toISOString().split('T')[0] : '2025-01-01',
            displayDate: e.date ? new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBA',
            time: e.time || '8:00 PM',
            venue: e.venue?.name || 'Unknown Venue',
            city: e.venue?.city || e.city || 'Unknown City',
            priceVal: e.ticketTiers?.[0]?.price || 0,
            priceDisplay: e.ticketTiers?.length > 0 ? formatPrice(e.ticketTiers[0].price) : 'Free',
            image: eventImage(e),
            category: e.genre || 'Music',
            vibes: e.vibe ? [e.vibe] : ['Live'],
            tag: e.status === 'Selling Fast' ? 'Hot' : null
          }));
          setAllEvents(mappedEvents);
        }
      } catch (err) {
        console.error("Failed to load events", err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // the genres the events really have (not a fixed list that matches none of them)
  const genreOptions = useMemo(() => [...new Set(allEvents.map((e) => e.category).filter(Boolean))].sort(), [allEvents]);
  const toggleGenre = (g) => setFilters((f) => ({ ...f, genres: f.genres.includes(g) ? f.genres.filter((x) => x !== g) : [...f.genres, g] }));

  // remembered between visits (on this device): the filters and the sort order
  const SAVED = 'sv:explore';
  const [savedRead, setSavedRead] = useState(false);
  useEffect(() => {
    // (after the first paint, so the page renders the same on the server and here first)
    const id = setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(SAVED) || 'null');
        if (saved?.filters) setFilters((f) => ({ ...f, ...saved.filters }));
        if (saved?.sortOption) setSortOption(saved.sortOption);
      } catch { /* nothing saved */ }
      setSavedRead(true);
    }, 0);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    if (!savedRead) return;
    try { localStorage.setItem(SAVED, JSON.stringify({ filters, sortOption })); } catch { /* private mode */ }
  }, [filters, sortOption, savedRead]);

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
    <div className="bg-[#f5f7f8] dark:bg-[#0a0a0a] font-sans text-slate-900 dark:text-white antialiased selection:bg-[#ffb000] selection:text-black">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">

        <Navbar />

        <main className="flex-1 relative pt-20">
          <EventsHero
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          />

          <div className="mx-auto flex max-w-[1440px] flex-col lg:flex-row gap-8 px-6 py-2 md:py-6 lg:py-12 lg:px-12">

            {/* phones: the genres as chips to tap, above the list (the full filters are a button away) */}
            {genreOptions.length > 1 && (
              <div role="group" aria-label="Genres" className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 lg:hidden">
                {genreOptions.map((g) => (
                  <button key={g} type="button" onClick={() => toggleGenre(g)} aria-pressed={filters.genres.includes(g)}
                    className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold ${filters.genres.includes(g) ? 'border-[#ffb000] bg-[#ff6a00]/15 text-[#ffb000]' : 'border-white/15 text-slate-200'}`}>
                    {g}
                  </button>
                ))}
              </div>
            )}

            <EventsFilter
              genreOptions={genreOptions}
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