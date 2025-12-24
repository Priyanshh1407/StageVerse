'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
// We removed FanSidebar since this is a public page
import { 
  Globe, PlayCircle, ThumbsUp, Play, 
  Heart, Ticket, Share2, Menu, X 
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MainFooter from '@/components/MainFooter';

// --- MOCK DATA (Same as before) ---
const ARTIST_DATA = {
  name: "The Neon Synths",
  image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAnkS0ti0xhyJvZYjVJ2474H-2gM_PIwTpEkJFGQtvKmFanHJwOqgqqpytAK9eZ7qwdQOEOxNFH6ASbFNe8tvoCDbCTjFmhk9knby63XzXyw_lHllSMXnJZ2_uW3ndx1ziblnnklSE14pSQ-wecTHzAkEza5DVFoS3MbGL96SVKPAoZWHexiwTLZpTdsdnMt9bkbjj9lmP8ybnHHTIDtQsw6_fgXMFEBOjyzWVcCnMBC6e8xKVHrwZJZecd8C1XlOh_G48M1rhpJzG_",
  genres: ["Electronic", "Synth-wave", "Pop"],
  bio: [
    "Formed in 2018 in the underground clubs of Berlin, The Neon Synths quickly rose to prominence...",
    "Known for their immersive live performances involving heavy use of lasers..."
  ],
  popularTracks: [
    { rank: 1, title: "Midnight Drive", album: "Neon Horizons • 2023", duration: "3:45", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAAZaIS6VVRxdkQXE2Z5GGumWGlwuNOCnxKyZlV9l1KsErk2t4bQQOHm1ZCA8HNBX4GAViVYOB-TdVcdlaG6hjSrxytuKoIYVdARrJRjIF1K9WdTIazGKOjY7M9BHXB_z4BGpTCR5bj6_ounKdJOuF11LxTryWiADCHQ4A-FRP5qt49jdszVklg9InqmDdtkUwczN2PnJ6EPbjx9xXvUW4qsb-oGwMzOn2--qlepY5TQ_gMAGfpJnh9yMtcWMRi4AIUlm5bTUhwo9SC" },
    { rank: 3, title: "Retrograde", album: "Neon Horizons • 2023", duration: "3:08", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCp40tmJw07mRarHEHDzz7Ncjoc0Xm8TWClHJZ_McgAxL9MzJS9fcYKvWH2PgBnqdl_cCqqj1tU48MYqdpwII5lzt2qWUz48PbHiEhUcaOm6bOGr6dPfqyuh5vLkOVQox_lFANzsYNYs0gEa1enOvITK6vOVGg8C8kgna-D08NEniERzhzC5DfT18BqpMygOG4wvGJzaDXLeJo51E8K8ZZDkUtUscqe9sMX4Ty_WiP2pSn3MzH9UNU_YTKHhPd_5aM5yV4Zcxc9zX3G" },
    { rank: 2, title: "Cyber Heart", album: "Digital Love • 2022", duration: "4:12", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD4k07s5EY9lcTyTcdtgU4dWzXJQQlJJn9m0zVotJBj-Qe6sDLUTE867Ghe40w1TrjDeI5QdZUr2WJ422qh5e67D4GNklgfNWukVT1FN0-17uEHDT6SAdD41O0lnexAK-LxVWOeI22Y-4F5-yHUgzUjQzWb0KgmxDNC0-d1OVAd2-yPbabexA-0-6YEBv_civ_bIUaWewjiXk-726HrJk-LEYSOFgV8kPHzfYIeBBrtQvM2yYP5ZT-lK71bkBleSyxPSSJnGiWDgbJB" },
  ],
  upcomingShows: [
    { day: "12", month: "NOV", venue: "The Basement", city: "London, UK" },
    { day: "15", month: "NOV", venue: "Le Zénith", city: "Paris, France" },
    { day: "02", month: "DEC", venue: "Terminal 5", city: "New York, USA" },
  ],
  relatedArtists: [
    { name: "Midnight Runners", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCQ6MDVUOpASOpfFuk-w7oY5nmAsclEGqNb2CwVDf5gosluoQxbLEauc7VcVwBmYYwVLFmHSgVAFoOt5fyC3iQsWFBCfsYjFaiakRelHrBH4cTDNg-Mj0fisKxWM54Pr7FL9r8BgiXsmgHxKE3HEVs6MsXUh6nkDEfl2NVxnh0SdFGXIhzTWaNhLsyJa3OkDEEV8Cefi1uVhnKAPkl23c4qmcZKWxCv7AyQcmKEEVo1DpefpDyUtvlQKvTQTfLBcJX5UUuAg5Vhq0lo" },
    { name: "Laser Heart", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDuMov3N-scfi7Pr6ExV3ZcLZoJXyAKe4Hf_LjIdCNmX28a7Gs69_G2iQwqkvBhdKc0fi_W6Dt6FZResNLTqWMxFwrMSoe6JakJf3Ll7Ekb3p_XVdXpBREWM24sYqL_hquNKhvN4xWvhxdZ1dfE-umcEuLuwkVYe0GCSmC4IYHU4aEQ7J2Y3EZgunDU9pNg7Uruccl7q4PEI31Kq_Pkromm_35AW2YSMz5heiU9WmD3Wkc7QG7uLi43M52GYdGJyRZN9DNMAD0hGmVA" },
    { name: "Digital Dream", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD32bMfkeeCneXwnOFT259ri-wsxSVemykbJkrdkAQfRbb2oMh0FK1gn2mJfOjgssjZosYJqYs9V-CBOIaPaqgx2aSORT6BxbIXPH5OJvsFZCygYFs52Iz1ZEfb_rBD3hYYoeytRMEWqAnoWFf-dVJBxtYHPRcP6ugjw7g8ym_Bw09em1O1ioCb_KjzzL7qay9BMTUKzV1dj0La39-cMgyKl_Iec1aHbIGVYeaD9l7uZEqSGBvDKVx8LMU2IcCqnc1dTb84bqfAxG1S" },
  ]
};

export default function PublicArtistPage({ params }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f7f8] dark:bg-[#101b22] font-sans text-slate-900 dark:text-white selection:bg-[#0d93f2]/30">
      
      {/* --- PUBLIC HEADER --- */}
      <Navbar />

      {/* --- MAIN CONTENT --- */}
      <main>
        
        {/* Hero Section */}
        <div className="relative w-full h-[50vh] sm:h-[60vh] lg:h-[70vh]">
          <Image 
            src={ARTIST_DATA.image} 
            alt={ARTIST_DATA.name} 
            fill 
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101b22] via-[#101b22]/60 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full px-4 sm:px-10 lg:px-40 pb-10">
            <div className="max-w-7xl mx-auto w-full">
              <h1 className="text-white text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tighter drop-shadow-2xl">
                {ARTIST_DATA.name.toUpperCase()}
              </h1>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="px-4 sm:px-10 lg:px-40 -mt-6 relative z-10 pb-20">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10">
            
            {/* Left Column */}
            <div className="flex-1 flex flex-col gap-8 min-w-0">
              
              {/* Tags & Bio Blurb */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  {ARTIST_DATA.genres.map(genre => (
                    <span key={genre} className="px-3 py-1 rounded-full bg-[#182630] border border-[#223949] text-[#0d93f2] text-xs font-bold uppercase tracking-wider">
                      {genre}
                    </span>
                  ))}
                </div>
                <p className="text-xl sm:text-2xl text-white font-medium leading-relaxed">
                  The Neon Synths are an electronic duo redefining the synth-wave genre with pulse-pounding beats.
                </p>
                
                {/* Social Icons */}
                <div className="flex gap-4 pt-2">
                  <button className="text-slate-400 hover:text-[#0d93f2] transition-colors"><Globe className="w-6 h-6" /></button>
                  <button className="text-slate-400 hover:text-[#0d93f2] transition-colors"><PlayCircle className="w-6 h-6" /></button>
                  <button className="text-slate-400 hover:text-[#0d93f2] transition-colors"><ThumbsUp className="w-6 h-6" /></button>
                </div>
              </div>

              {/* Popular Tracks */}
              <div className="pt-8">
                <h3 className="text-white text-2xl font-bold mb-6 flex items-center gap-2">
                  <span className="p-1 bg-[#0d93f2]/20 rounded text-[#0d93f2]"><Play className="w-5 h-5 fill-current" /></span>
                  Popular Tracks
                </h3>
                <div className="flex flex-col gap-2">
                  {ARTIST_DATA.popularTracks.map((track) => (
                    <TrackRow key={track.rank} track={track} />
                  ))}
                </div>
              </div>

              {/* Full Bio */}
              <div className="pt-8 pb-10 border-t border-[#223949] mt-4">
                <h3 className="text-white text-2xl font-bold mb-4">About the Artist</h3>
                <div className="prose prose-invert max-w-none text-slate-300 font-sans leading-relaxed space-y-4">
                  {ARTIST_DATA.bio.map((para, i) => <p key={i}>{para}</p>)}
                </div>
              </div>
            </div>

            {/* Right Column (Sidebar) */}
            <div className="lg:w-[360px] shrink-0">
              <div className="sticky top-24 flex flex-col gap-6">
                
                {/* Upcoming Shows */}
                <div className="bg-[#182630] rounded-xl border border-[#223949] overflow-hidden shadow-xl">
                  <div className="p-5 border-b border-[#223949] bg-[#14202a]">
                    <h3 className="text-white text-lg font-bold">Upcoming Shows</h3>
                  </div>
                  <div className="p-5 flex flex-col gap-4">
                    {ARTIST_DATA.upcomingShows.map((show, index) => (
                      <React.Fragment key={index}>
                        <ShowCard show={show} />
                        {index < ARTIST_DATA.upcomingShows.length - 1 && <div className="w-full h-px bg-[#223949]"></div>}
                      </React.Fragment>
                    ))}
                    <button className="text-center text-[#0d93f2] text-sm font-bold hover:underline mt-2">View all 12 dates</button>
                  </div>
                </div>

                {/* Follow Widget */}
                <div className="bg-gradient-to-br from-[#101b22] to-[#0d93f2]/10 rounded-xl border border-[#223949] p-5 shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Heart className="text-[#0d93f2] w-6 h-6 fill-[#0d93f2]" />
                    <h3 className="text-white text-lg font-bold">Don't miss a beat</h3>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">Login to follow {ARTIST_DATA.name} and get notified about new tours.</p>
                  <Link href="/login" className="flex justify-center w-full bg-[#182630] border border-[#223949] hover:bg-[#223949] text-white text-sm font-bold py-2.5 px-4 rounded-lg transition-all">
                    Login to Follow
                  </Link>
                </div>

                {/* Related Artists */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-4 text-slate-400">Fans also like</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {ARTIST_DATA.relatedArtists.map((artist, i) => (
                      <RelatedArtist key={i} artist={artist} />
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <MainFooter />
    </div>
  );
}

// --- SUB-COMPONENTS ---

function TrackRow({ track }) {
  return (
    <div className="group flex items-center justify-between p-3 rounded-lg hover:bg-[#182630] transition-colors cursor-pointer border border-transparent hover:border-[#223949]">
      <div className="flex items-center gap-4 overflow-hidden">
        <span className="text-slate-500 font-bold w-6 text-center group-hover:text-[#0d93f2]">{track.rank}</span>
        <div className="relative h-12 w-12 rounded overflow-hidden shrink-0 bg-gray-800">
          <Image src={track.image} alt={track.title} fill className="object-cover" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold truncate group-hover:text-[#0d93f2] transition-colors">{track.title}</p>
          <p className="text-slate-400 text-sm truncate">{track.album}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 pl-4">
        <span className="text-slate-400 text-sm hidden sm:block font-mono">{track.duration}</span>
        <button className="size-10 rounded-full bg-[#0d93f2] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 shadow-lg shadow-[#0d93f2]/20">
          <Play className="w-5 h-5 fill-current ml-0.5" />
        </button>
      </div>
    </div>
  );
}

function ShowCard({ show }) {
  return (
    <div className="flex gap-4 items-start group cursor-pointer">
      <div className="flex flex-col items-center justify-center bg-[#101b22] border border-[#223949] rounded-lg w-14 h-14 shrink-0 text-white group-hover:border-[#0d93f2]/50 transition-colors">
        <span className="text-[10px] font-bold uppercase text-[#0d93f2] tracking-wide">{show.month}</span>
        <span className="text-xl font-bold leading-none">{show.day}</span>
      </div>
      <div className="flex flex-col gap-2 w-full">
        <div>
          <p className="text-white font-bold leading-tight group-hover:text-[#0d93f2] transition-colors">{show.venue}</p>
          <p className="text-slate-400 text-sm">{show.city}</p>
        </div>
        <button className="w-full bg-[#0d93f2] hover:bg-[#0d93f2]/90 text-white text-sm font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md">
          <span>Get Tickets</span>
          <Ticket className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function RelatedArtist({ artist }) {
  return (
    <div className="group flex flex-col items-center gap-2 cursor-pointer">
      <div className="relative aspect-square w-full rounded-full overflow-hidden border-2 border-transparent group-hover:border-[#0d93f2] transition-all">
        <Image src={artist.image} alt={artist.name} fill className="object-cover" />
      </div>
      <span className="text-xs text-center text-slate-300 group-hover:text-white truncate w-full transition-colors">
        {artist.name}
      </span>
    </div>
  );
}