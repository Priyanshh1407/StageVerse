'use client';
import React, { useState, useEffect, use } from 'react';
import { X, Search, Ticket, ArrowUpRight } from 'lucide-react';
import Image from 'next/image';

export default function TopArtistsModal({ isOpen, onClose,artists=[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  // Reset when the modal opens (adjusted during render, not in an effect)
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setSearchQuery('');
    }
  }

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const filteredArtists = artists.filter((artist) => {
    const query = searchQuery.toLowerCase();
    return (
      artist.name.toLowerCase().includes(query) ||
      artist.genre.toLowerCase().includes(query)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh] zoom-in-95">

        {}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Top Artists Seen</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your concert history highlights.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151f28] shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a2632] text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#0d93f2] focus:border-transparent outline-none shadow-sm"
              placeholder="Search artists, genres..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {}
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {filteredArtists.length > 0 ? (
            filteredArtists.map((artist) => (
              <div key={artist.name} className="flex items-center gap-4 p-3 hover:bg-slate-100 dark:hover:bg-[#1e2a35] rounded-lg transition-colors group cursor-pointer">
                {}
                <div className="relative h-12 w-12 rounded-lg shadow-md shrink-0 overflow-hidden">
                  <Image src={artist.image} alt={artist.name} fill className="object-cover" />
                </div>

                {}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 dark:text-white font-bold truncate text-base">{artist.name}</p>
                  <p className="text-xs text-slate-500">{artist.genre}</p>
                </div>

                {}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 bg-[#0d93f2]/10 px-2 py-0.5 rounded text-[#0d93f2] border border-[#0d93f2]/20">
                    <Ticket className="w-3 h-3" />
                    <p className="font-bold text-xs">{artist.count} Shows</p>
                  </div>
                  <button className="text-[10px] text-slate-400 hover:text-[#0d93f2] transition-colors flex items-center gap-0.5">
                    View Profile <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <p>No artists found matching &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </div>

        {}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shadow-sm">
            Close
          </button>
        </div>

      </div>
    </div>
  );
}