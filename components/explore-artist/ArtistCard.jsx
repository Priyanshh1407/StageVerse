'use client';

import { MapPin, ArrowRight, Music2 } from 'lucide-react';
import Link from 'next/link';

export default function ArtistCard({ artist }) {
  return (
    <Link
      href={`/artist/${artist.id}`}
      className="group relative bg-[#18181B] rounded-2xl overflow-hidden shadow-lg border border-gray-800 hover:border-[#00C2FF]/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,194,255,0.15)] hover:-translate-y-1 block"
    >
      {/* Image Header */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={artist.image}
          alt={artist.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#18181B] via-black/20 to-transparent opacity-90 group-hover:opacity-80 transition-opacity"></div>

        {/* Genre Badge */}
        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-white border border-white/10">
          {artist.genre}
        </div>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-[#00C2FF] transition-colors">
          {artist.name}
        </h3>

        <p className="text-gray-400 text-sm mb-4 flex items-center gap-2">
          <MapPin className="w-3 h-3 text-[#00C2FF]" />
          {artist.location}
        </p>

        {/* Footer Stats */}
        <div className="flex items-center justify-between border-t border-gray-800 pt-4 mt-2">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase font-semibold">Upcoming</span>
            <span className="text-sm font-bold text-white">{artist.upcomingEvents} Events</span>
          </div>

          <div className="bg-[#00C2FF] text-black px-4 py-2 rounded-lg text-sm font-bold transition-all hover:bg-white flex items-center gap-2 group/btn">
            View Profile
          </div>
        </div>
      </div>
    </Link>
  );
}