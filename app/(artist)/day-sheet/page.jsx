'use client';

// 1. Import your existing Global Navbar
import ArtistNavbar from '@/components/artist/ArtistNavbar';

// 2. Import the local Day Sheet components
import ShowHeader from '@/components/artist/daysheet/ShowHeader';
import Timeline from '@/components/artist/daysheet/Timeline';
import VenueIntel from '@/components/artist/daysheet/VenueIntel';

export default function DaySheetPage() {
  return (
    <div className="min-h-screen bg-[#f5f7f8] dark:bg-[#101b22] font-sans text-slate-900 dark:text-white transition-colors duration-200 flex flex-col">
      
      {/* Global Navigation */}
      <ArtistNavbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-10 py-6 lg:py-10">
        
        {/* Page Heading & Actions */}
        <ShowHeader 
          city="Chicago" 
          venue="The Riviera Theatre" 
          date="Oct 24, 2024" 
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          
          {/* Left Column: Itinerary Timeline */}
          <Timeline />

          {/* Right Column: Venue/Wifi Info */}
          <VenueIntel />

        </div>
      </main>
    </div>
  );
}