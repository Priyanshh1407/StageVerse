import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import EventCard from "./EventCard";

const allEvents = [
  {
    id: 1,
    image: "https://picsum.photos/400/400?random=11",
    title: "ODESZA",
    date: "20+ 20$ - 2 PM",
    venue: "Palace Arena, Mumbai",
    genre: "electronic",
    price: 50,
    popularity: 95,
  },
  {
    id: 2,
    image: "https://picsum.photos/400/400?random=12",
    title: "Aurora",
    date: "20 - 16$ - 2 PM",
    venue: "Palace Arena, Mumbai",
    overlayText: "AURORA",
    genre: "pop",
    price: 35,
    popularity: 90,
  },
  {
    id: 3,
    image: "https://picsum.photos/400/400?random=13",
    title: "Lana Del Rey",
    date: "20+ 18$ - 7 PM",
    venue: "Palace Square Garden, NY",
    genre: "pop",
    price: 80,
    popularity: 98,
  },
  {
    id: 4,
    image: "https://picsum.photos/400/400?random=14",
    title: "Porter Robinson",
    date: "20+ 100 - 5 PM",
    venue: "Nemone, Edrin",
    genre: "electronic",
    price: 100,
    popularity: 85,
  },
  {
    id: 5,
    image: "https://picsum.photos/400/400?random=15",
    title: "The Chaokiims",
    date: "20 - 20 - 4 PM",
    venue: "Flakilo, Berlin",
    genre: "electronic",
    price: 45,
    popularity: 82,
  },
  {
    id: 6,
    image: "https://picsum.photos/400/400?random=16",
    title: "ROCK",
    date: "20+ 1P1 - 2 PM",
    venue: "Malace Square Garden, NY",
    overlayText: "ROCK",
    genre: "rock",
    price: 60,
    popularity: 88,
  },
  {
    id: 7,
    image: "https://picsum.photos/400/400?random=17",
    title: "ILLENIUM",
    date: "20 - 20 - 2 PM",
    venue: "Palace Arens, Mumbai",
    genre: "electronic",
    price: 55,
    popularity: 92,
  },
  {
    id: 8,
    image: "https://picsum.photos/400/400?random=18",
    title: "ILLENIUM",
    date: "26 - 230 - 2 PM",
    venue: "Palace Spaure, London",
    genre: "electronic",
    price: 70,
    popularity: 91,
  },
  {
    id: 9,
    image: "https://picsum.photos/400/400?random=19",
    title: "ROCK",
    date: "20 - 18$ - 2 1M",
    venue: "Patiest, Bitay Rentste",
    overlayText: "ROCK",
    genre: "rock",
    price: 40,
    popularity: 75,
  },
];

const EventsGrid = ({ searchQuery, sortBy, filters }) => {
  const [visibleCount, setVisibleCount] = useState(9);

  const filteredAndSortedEvents = useMemo(() => {
    let result = [...allEvents];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.venue.toLowerCase().includes(query)
      );
    }

    // Apply price filter
    if (filters.priceRange || filters.priceFree) {
      result = result.filter((event) => event.price <= filters.priceValue);
    }

    // Apply genre filter
    if (filters.genre) {
      // When genre filter is on, could filter by specific genres
      // For now, just keep all
    }

    // Apply sorting
    switch (sortBy) {
      case "popularity":
        result.sort((a, b) => b.popularity - a.popularity);
        break;
      case "date":
        result.sort((a, b) => a.date.localeCompare(b.date));
        break;
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
      case "name":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return result;
  }, [searchQuery, sortBy, filters]);

  const visibleEvents = filteredAndSortedEvents.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAndSortedEvents.length;

  const loadMore = () => {
    setVisibleCount((prev) => prev + 6);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-6 tracking-wide">
        EVENT CARDS
      </h2>

      {visibleEvents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No events found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleEvents.map((event, index) => (
            <div
              key={event.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <EventCard
                image={event.image}
                title={event.title}
                date={event.date}
                venue={event.venue}
                overlayText={event.overlayText}
              />
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center mt-10">
          <Button
            variant="hero"
            onClick={loadMore}
            className="px-8"
          >
            Load More Events
          </Button>
        </div>
      )}
    </div>
  );
};

export default EventsGrid;