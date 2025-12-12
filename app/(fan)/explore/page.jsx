'use client';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EventFilters from "@/components/EventFilters";
import EventsGrid from "@/components/EventsGrid";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Events = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("popularity");
  const [filters, setFilters] = useState({
    genre: false,
    bestie: true,
    dateWeek: false,
    dateMonth: false,
    priceRange: true,
    priceFree: false,
    spiceHot: true,
    cityLocal: true,
    cityAll: false,
    priceValue: 50,
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 lg:px-8 py-8 pt-24">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="w-full lg:w-64 shrink-0">
            <EventFilters 
              filters={filters} 
              onFilterChange={handleFilterChange} 
            />
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Search and Sort */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search events, artists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 bg-muted/30 border-border/50 rounded-full text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-sm whitespace-nowrap">Sort By</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-36 bg-muted/50 border-border/50 rounded-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="popularity">Popularity</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="price-low">Price: Low</SelectItem>
                    <SelectItem value="price-high">Price: High</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Events Grid */}
            <EventsGrid 
              searchQuery={searchQuery} 
              sortBy={sortBy} 
              filters={filters} 
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Events;