'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Search, Bell, Calendar, Clock, MapPin, Info, Map as MapIcon, 
  Navigation, ArrowRight, Heart, Share2, Link as LinkIcon, 
  CalendarPlus, BarChart3 
} from 'lucide-react';

// --- MOCK DATA SIMULATION (Replace this with your API Call later) ---
const getEventData = (id) => {
  // In real app: const res = await fetch(`/api/events/${id}`); return res.json();
  return {
    id: id,
    title: "THE WEEKND",
    subtitle: "After Hours Til Dawn Tour",
    status: "Selling Fast",
    type: "World Tour",
    date: "Sat, Aug 19, 2023",
    time: "8:00 PM",
    isoDate: "2023-08-19T20:00:00",
    images: {
      hero: "https://lh3.googleusercontent.com/aida-public/AB6AXuDwduQJoR0kv_AMtvXXuHm62fl4IdlAXjFEfXiY_unZtf1y4UmXHEhvpU6khjrloLgiWuy_B_fdGbguiQqY5GiAvU1SaqD3CQLP1-anxRC4_z-gKYY5m2DjNP14tY2kB30pCAJLsZ7q9WgyBQsocVEEuL0U4UBYU5t0G60FQti-dH7EoojvIMb4xhWU8SYluHAc_Ad3RziOeAN2nE10dJyT9gUbu-YmCvJOwDIQN9OkuX9j2GnI0OudiWCBTnKf9IeoRYK7l9_gpErF",
      artist: "https://lh3.googleusercontent.com/aida-public/AB6AXuCnMbnYheA1QkOZtX4tO3pR0PL6fwuAHupk2y5PaWxOApeqlO7RSC5EseSLR0jc6YKEEyrnnNaYOgVaHlK8ul5t28A5a6tSdhpvMwWh7mlPQYozCKC0srri4CM46WruoKO9XM8iD3KViT8L1syIcWtcqI6nr217i_19bLSldpcepiOyph--nTaGJs0pXfUfxyslmzGNS-Hb12Rtsv0toe3VrRu1GYvGxxsM9zPRj8gYRh7ENpVvETRf28IrQdAOTxjnimzRXGUjqxx3",
      venue: "https://lh3.googleusercontent.com/aida-public/AB6AXuBAthwD-SToJsVEiCOVXt1PzvhqexdQIo6F4LRwNkXV6QtnoBxOIu3KTeWt8slA4P1vx0VmSIQ2GBFZ7JANe6BlzI23iH3ftv2US_20rBxTHvc4mMku_JNm8XMpi_t-_Ei2kVvIn1yGQtqPTLZfwyl7wBc_EeMpdlNTNlE95l4P4K8pmvIbGcxSF-0qqIYQUEzK1P6a9ZGhyrepLLys9KYng2_T15BHbdkdX7BZriB7gR_nQjsgypZk9lvuNUA-dfyEvMBmekRIrxHX"
    },
    venue: {
      name: "Wembley Stadium",
      address: "London HA9 0WS, United Kingdom",
      city: "London"
    },
    artist: {
      name: "The Weeknd",
      bio: "The Weeknd is a Canadian singer, songwriter, and record producer known for his sonic versatility and dark lyricism.",
      listeners: "84M Monthly Listeners"
    },
    about: [
      "Prepare for an unforgettable night as The Weeknd brings his critically acclaimed 'After Hours Til Dawn' tour to Wembley Stadium. This spectacular show combines the haunting aesthetics of his 'After Hours' era with the sci-fi synth-pop universe of 'Dawn FM'.",
      "Expect a visually stunning production featuring a post-apocalyptic cityscape set, dazzling light shows, and all your favorite hits including 'Blinding Lights', 'Save Your Tears', 'Starboy', and 'Can't Feel My Face'."
    ],
    lineup: [
      { name: "Kaytranada", role: "Support Act", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC7O0Dmmf6BV69YnOEF4vlXPRqNUTcbs3sU_mXcmMDcY-CbSXpXKE0rsGXqSTQhn3R55kSu5RZRG5fjtMvPBeOywZRPk4wrXs77Z6Tf_hY5g042l5OSt_psrk8J1YXvGH-xRb2nVmxAxSvjUN6EK25uAAqui2Jvc1M5yuSS5h4PL7oCjmOtVLdhMoawbT4tGs8P3RDBRmBczeucM7sr2tXPeuQEBItTeVkTwUOP9DWfDkcdGN4SoIkqzeLap_sAuX77oEAxFBwMg2B4" },
      { name: "Mike Dean", role: "Special Guest", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD4B9OFjYsH2a8ovGbzrmhrNQNW9ZTupW5kjjwPCIFnjdXZ_mnqR8GRDcjJyjovyDWAwglX7w1d0cqXoWUthXWtml5SOJjThIMdyoA_hngimrIS3-EKfkEvGKP0GULs9wmbLe0TDNLn9vqmTZinn6ZDbh5U-lt8cp5AqsXtF0o6OwhmUxjQ6sdJhiJ46YuTx4LylVCCv1F5YKHsLCNk1-xLLc-Fqjt1VIcuBxIx5-pw6d-Ywfh_oBsmuxRqeAe9rOJgqJsLqEzGHRDS" }
    ],
    ticket: {
      price: 75,
      currency: "USD",
      status: "Available",
      provider: "Ticketmaster"
    },
    similarEvents: [
      { id: 101, name: "Dua Lipa", date: "Sep 22", city: "London", venue: "O2 Arena", price: 65, genre: "Pop", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCHW8a-H2J1AP3GUILVt8cUJd6RIRXEhCP8awRGKD67Dp6Febsn-19A-6jRg8t_2TvWi7-c7uBtZiMeICCFQfwi1iclHNnzFKqd62XhHcGL6zuDqabOXJVCquyNLwT9eBktzDWNThmytqcOzhZinrfkr8D5rD8GSzpMLFHuNXfSfbuftmxHqSzvV0cKC0-2Qmb-9wCewovx07LmlC4S19m6Oiqtcbns7I_qtFkU_O77JLQtcIxjGDK1AXZO602zoHWBA3_OfQu2cmhq" },
      { id: 102, name: "Drake", date: "Oct 10", city: "London", venue: "Wembley Arena", price: 120, genre: "R&B", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAqAdCS_X5ubXXGDXcqdm_XQl60rdctFCywY1sw0rVju1ibxTc8Br5htUaLIa07se5Ocvf9RJE61FYutMYLzTNwyE_cnmZIOYkErIiKv0hbiNN5EJp4ZibDHnx9PMei_wCwVn_Iihp8FocPu0sWSokJJCU1QX7GcVljl_i0N-F2z_Sb53zebOwqHjKPR9yK2cUA6sIqafAC2XcDF-_lLWEo3Qwvf9jPxAYtFln6KfxvatFjuJ6SVg7r9y2GVu37PCRE2YlzklQqN4m8" },
      { id: 103, name: "Calvin Harris", date: "Nov 05", city: "London", venue: "Hyde Park", price: 55, genre: "Electronic", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCMAffHZx4Df-fT6hjQkHI6m4PSf4pNT1KmXb96S4qJoiKUjqv0akl2Em386WuQT6ocI0dgvdmCMVS6ff-B0Q7SffRcBr_445PWv3z1BALjb-S1qjSiuMwQ8WR22ysQcBVtMVF8lK8tj-TzxwfxsTmfeysLB1lkquwMmMfwFAPWct1XlNIyw8fB_JuHo9c73k3snKJA6m4SNhWfPy_Ltu_zwmf_5qeexZrbb9y68gEdq46gpMXfXrbsCYYMFukNNz_AmoFWGMG1me_H" },
      { id: 104, name: "Harry Styles", date: "Dec 12", city: "London", venue: "Wembley Stadium", price: 90, genre: "Pop", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC_l75LBAjfrLQ4fvIitqQ3mwV2UOt9ppcr4nLFbeOfflu_n39UtuP1WYTv4UTkAbD_h6d72QANq4LdcyX3c2tNNnix9U4o7WjlsPqjosLcWupTA6FREB0Ash193p3P_a1PtxEFhJ-Ov2TnFLNUj2v5GdJYyiJzl_5vs4yzNmGSYKYLqUZehiQtVqtpbfmuC2iopEE5w2VRfWlMeqtFt9JUYVpeK9J-017oCplWkwillsl5mVQPF8HUGjHZbSvqIUz1iY9UbFA6kpn4" },
    ]
  };
};

export default function EventDetailPage({ params }) {
  // 1. Simulate Fetching Data based on ID
  // In Next.js App Router, params are passed as props to the page
  const eventId = params?.id || '1'; 
  const event = getEventData(eventId); 

  // --- RENDER ---
  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white transition-colors duration-200 font-sans">
      
      {/* Header */}
      <Header />

      <main className="flex-1 flex flex-col">
        
        {/* Breadcrumbs */}
        <div className="px-6 md:px-10 lg:px-40 py-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/events" className="text-text-secondary hover:text-primary transition-colors font-medium">Concerts</Link>
            <span className="text-text-secondary font-medium">/</span>
            <span className="text-slate-900 dark:text-white font-medium">{event.title} - {event.subtitle}</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat" 
            style={{ backgroundImage: `url("${event.images.hero}")` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background-dark/90 via-background-dark/40 to-transparent"></div>
          
          <div className="relative h-full flex flex-col justify-end px-6 md:px-10 lg:px-40 pb-12">
            <div className="max-w-4xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider border border-primary/30">{event.type}</span>
                <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-sm">{event.status}</span>
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight mb-2">{event.title}</h1>
              <h2 className="text-xl md:text-3xl font-normal text-text-secondary mb-6">{event.subtitle}</h2>
              <div className="flex flex-wrap items-center gap-6 text-white/90">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="font-medium text-lg">{event.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="font-medium text-lg">{event.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span className="font-medium text-lg">{event.venue.name}, {event.venue.city}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="px-6 md:px-10 lg:px-40 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* Main Column (Left) */}
            <div className="lg:col-span-8 flex flex-col gap-10">
              
              {/* About Section */}
              <section>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" />
                  About The Event
                </h3>
                <div className="prose prose-invert max-w-none text-text-secondary leading-relaxed">
                  {event.about.map((paragraph, index) => (
                    <p key={index} className="mb-4">{paragraph}</p>
                  ))}
                </div>
              </section>

              {/* Lineup Section (Dynamic Map) */}
              <section>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Lineup & Support</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                  {event.lineup.map((act, index) => (
                    <div key={index} className="snap-start min-w-[160px] bg-white dark:bg-surface-dark rounded-lg p-3 border border-slate-200 dark:border-white/5 hover:border-primary/50 transition-colors group cursor-pointer">
                      <div 
                        className="aspect-square rounded-md bg-cover bg-center mb-3 group-hover:opacity-90 transition-opacity" 
                        style={{ backgroundImage: `url("${act.image}")` }}
                      ></div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{act.name}</h4>
                      <p className="text-xs text-text-secondary">{act.role}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Venue Map */}
              <section>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <MapIcon className="w-5 h-5 text-primary" />
                  Venue Location
                </h3>
                <div className="bg-surface-dark rounded-xl overflow-hidden border border-white/5">
                  <div className="h-[300px] w-full bg-cover bg-center relative" style={{ backgroundImage: `url("${event.images.venue}")` }}>
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="relative">
                        <MapPin className="w-12 h-12 text-red-500 drop-shadow-xl" />
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-black/50 blur-[2px] rounded-full"></div>
                      </div>
                    </div>
                    <button className="absolute bottom-4 right-4 bg-white text-slate-900 text-xs font-bold px-3 py-2 rounded shadow-lg hover:bg-gray-100 transition">View Larger Map</button>
                  </div>
                  <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-darker">
                    <div>
                      <h4 className="text-white font-bold">{event.venue.name}</h4>
                      <p className="text-text-secondary text-sm">{event.venue.address}</p>
                    </div>
                    <button className="flex items-center gap-2 text-sm text-primary font-medium hover:text-primary/80 transition-colors">
                      <Navigation className="w-4 h-4" />
                      Get Directions
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* Sidebar (Right - Sticky) */}
            <div className="lg:col-span-4 relative">
              <div className="sticky top-24 flex flex-col gap-6">
                
                {/* Ticket Card */}
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl p-6 shadow-xl dark:shadow-black/40">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-sm font-medium text-text-secondary mb-1">Tickets starting from</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-slate-900 dark:text-white">${event.ticket.price}</span>
                        <span className="text-sm text-text-secondary">{event.ticket.currency}</span>
                      </div>
                    </div>
                    <div className="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                      {event.ticket.status}
                    </div>
                  </div>
                  <button className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 mb-3 group">
                    <span>Get Tickets</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button className="w-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white font-medium h-10 rounded-lg flex items-center justify-center gap-2 transition-colors border border-transparent dark:border-white/5">
                    <Heart className="w-5 h-5" />
                    <span>Track Event</span>
                  </button>
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                    <p className="text-xs text-text-secondary text-center">
                      Safe & secure checkout via {event.ticket.provider}
                    </p>
                  </div>
                </div>

                {/* Artist Mini Profile */}
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="size-16 rounded-full bg-cover bg-center border-2 border-primary/30" style={{ backgroundImage: `url("${event.images.artist}")` }}></div>
                    <div>
                      <h4 className="font-bold text-lg text-slate-900 dark:text-white">{event.artist.name}</h4>
                      <p className="text-sm text-text-secondary">{event.artist.listeners}</p>
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary mb-4 line-clamp-3">
                    {event.artist.bio}
                  </p>
                  <div className="flex gap-2">
                    <button className="flex-1 h-9 rounded-lg border border-slate-300 dark:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                      Follow
                    </button>
                    <button className="flex-1 h-9 rounded-lg bg-[#1DB954] hover:bg-[#1ed760] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                      Spotify
                    </button>
                  </div>
                </div>

                {/* Share */}
                <div className="bg-transparent px-2">
                  <div className="flex items-center justify-between text-text-secondary text-sm">
                    <span>Share this event</span>
                    <div className="flex gap-3">
                      <button className="hover:text-primary transition-colors"><Share2 className="w-5 h-5" /></button>
                      <button className="hover:text-primary transition-colors"><LinkIcon className="w-5 h-5" /></button>
                      <button className="hover:text-primary transition-colors"><CalendarPlus className="w-5 h-5" /></button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Similar Events (Dynamic Map) */}
        <div className="border-t border-slate-200 dark:border-[#223949] bg-slate-50 dark:bg-surface-darker py-16">
          <div className="px-6 md:px-10 lg:px-40">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Similar Events</h3>
              <Link href="/events" className="text-primary font-bold text-sm hover:underline">View All</Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {event.similarEvents.map((simEvent) => (
                <SimilarEventCard key={simEvent.id} event={simEvent} />
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// --- SUB-COMPONENTS (Reusable) ---

function SimilarEventCard({ event }) {
  return (
    <div className="group flex flex-col bg-white dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 dark:border-white/5">
      <div 
        className="h-48 bg-cover bg-center relative group-hover:scale-105 transition-transform duration-500" 
        style={{ backgroundImage: `url("${event.image}")` }}
      >
        <div className="absolute top-3 right-3 bg-white/10 backdrop-blur-md px-2 py-1 rounded text-white text-xs font-bold">{event.genre}</div>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <p className="text-primary font-bold text-xs uppercase tracking-wide">{event.date} • {event.city}</p>
        <h4 className="text-lg font-bold text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors">{event.name}</h4>
        <p className="text-text-secondary text-sm">{event.venue}</p>
        <div className="mt-auto pt-4 flex items-center justify-between">
          <span className="text-slate-900 dark:text-white font-bold text-sm">From ${event.price}</span>
          <button className="bg-slate-100 dark:bg-white/10 hover:bg-primary hover:text-white text-slate-900 dark:text-white p-2 rounded-lg transition-colors">
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-[#223949] bg-background-light dark:bg-[#101b23] px-6 md:px-10 py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-4 dark:text-white text-slate-900">
            <BarChart3 className="w-8 h-8 text-primary" />
            <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">ConcertTracker</h2>
          </Link>
          <div className="hidden lg:flex items-center gap-9">
            <Link href="#" className="text-sm font-medium leading-normal text-slate-600 dark:text-white hover:text-primary transition-colors">Discover</Link>
            <Link href="#" className="text-sm font-medium leading-normal text-slate-600 dark:text-white hover:text-primary transition-colors">Artists</Link>
            <Link href="#" className="text-sm font-medium leading-normal text-slate-600 dark:text-white hover:text-primary transition-colors">Venues</Link>
            <Link href="#" className="text-sm font-medium leading-normal text-slate-600 dark:text-white hover:text-primary transition-colors">My Tracked Events</Link>
          </div>
        </div>
        <div className="flex flex-1 justify-end gap-6 items-center">
          <label className="hidden md:flex flex-col min-w-40 !h-10 max-w-64">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full border border-slate-200 dark:border-none">
              <div className="text-slate-400 dark:text-text-secondary flex bg-white dark:bg-[#223949] items-center justify-center pl-4 rounded-l-lg border-r-0">
                <Search className="w-5 h-5" />
              </div>
              <input className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg rounded-l-none text-slate-900 dark:text-white focus:outline-0 focus:ring-0 border-none bg-white dark:bg-[#223949] h-full placeholder:text-slate-400 dark:placeholder:text-text-secondary px-4 pl-2 text-sm font-normal leading-normal" placeholder="Search events..." />
            </div>
          </label>
          <div className="flex items-center gap-4">
            <button className="bg-surface-darker hover:bg-surface-dark text-white p-2 rounded-full relative transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
            </button>
            <div 
              className="w-8 h-8 rounded-full bg-cover bg-center ring-2 ring-primary/20" 
              style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCXWfGS7zEOZwA4uJ8sKrCLdwUyUVeZOHiVwTMZ_XzsRY_UcF172ET-b0zQDkUUr1_rZa37CHnwOQ4wWXkwfzjT4iapKvc42naMCq2aycQUSbBUJAqSxkrFV8M4DzOPkakfjAMRASEEKrptV4GXh1oCCByfW-cWLsInGdZHLR4AE4JCN5nhyU2hozxuTFBP7G-PFnCuWnDZJgBeYY9gQprFHF4SRJYBSv8ChOj-NCH5b9KchVjWbb_p_pKXh8Z2FiImhjaHI8cecng8")' }}
            ></div>
          </div>
        </div>
      </header>
  )
}

function Footer() {
  return (
    <footer className="bg-background-light dark:bg-[#101b23] border-t border-slate-200 dark:border-[#223949] py-10 px-6 lg:px-40">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <BarChart3 className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">ConcertTracker</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-sm text-text-secondary">
            <Link href="#" className="hover:text-primary transition-colors">About Us</Link>
            <Link href="#" className="hover:text-primary transition-colors">Careers</Link>
            <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>
          <div className="flex gap-4 text-text-secondary">
            <Link href="#" className="hover:text-primary transition-colors">
              {/* Simple generic social icon */}
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"></path></svg>
            </Link>
          </div>
        </div>
        <div className="mt-8 text-center text-xs text-text-secondary">
          © {new Date().getFullYear()} ConcertTracker. All rights reserved.
        </div>
      </footer>
  )
}