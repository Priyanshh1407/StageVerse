'use client';
import React from 'react';
import { useEffect } from 'react';
import { X, MapPin, Users, Info, Car, Utensils, Wifi, ShieldCheck, Map } from 'lucide-react';
import Image from 'next/image';

export default function VenueInfoModal({ isOpen, onClose, venue }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key == 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  },[isOpen, onClose]);
  if (!isOpen || !venue) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] overflow-hidden">

        {}
        <div className="relative h-48 sm:h-64 shrink-0">
          <Image
            src={venue.image || "https://images.unsplash.com/photo-1514525253440-b393332569ca?q=80&w=800&auto=format&fit=crop"}
            alt={venue.name}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>

          <div className="absolute bottom-0 left-0 p-6 w-full">
            <h2 className="text-3xl font-bold text-white leading-tight">{venue.name}</h2>
            <div className="flex items-center gap-2 text-slate-300 mt-1 text-sm font-medium">
              <MapPin className="w-4 h-4 text-[#0d93f2]" />
              {venue.address}
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar bg-slate-50 dark:bg-[#101b22]">

          {}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatItem icon={Users} label="Capacity" value={venue.capacity} />
            <StatItem icon={Map} label="Type" value={venue.type} />
            <StatItem icon={Car} label="Parking" value={venue.parking ? "Available" : "No"} />
            <StatItem icon={ShieldCheck} label="Bag Policy" value={venue.bagPolicy} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {}
            <div className="lg:col-span-2 space-y-6">
              <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <Info className="w-5 h-5 text-[#0d93f2]" /> About the Venue
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  {venue.description}
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Amenities</h3>
                <div className="flex flex-wrap gap-3">
                  <AmenityBadge icon={Utensils} label="Food Court" />
                  <AmenityBadge icon={Wifi} label="Free Wi-Fi" />
                  <AmenityBadge icon={Car} label="Valet Parking" />
                  <AmenityBadge icon={ShieldCheck} label="Security Check" />
                </div>
              </section>
            </div>

            {}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-[#1a2632] p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="relative aspect-square w-full bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden group cursor-pointer">
                  {}
                  <Image
                    src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=800&auto=format&fit=crop"
                    alt="Map Location"
                    fill
                    className="object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button className="px-4 py-2 bg-[#0d93f2] hover:bg-[#0d93f2]/90 text-white text-xs font-bold rounded-lg shadow-lg transform transition-transform group-hover:scale-105">
                      Get Directions
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white mb-1">Getting Here</p>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Accessible via Metro Line 4 or Bus Route 202. Rideshare drop-off located at the North Entrance.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632] flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            Close
          </button>
          <button className="px-5 py-2.5 bg-[#0d93f2] hover:bg-[#0d93f2]/90 text-white text-sm font-bold rounded-lg shadow-lg shadow-[#0d93f2]/25 transition-all">
            Visit Official Site
          </button>
        </div>

      </div>
    </div>
  );
}function StatItem({ icon: Icon, label, value }) {
  return (
    <div className="p-3 bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center text-center shadow-sm">
      <Icon className="w-5 h-5 text-slate-400 mb-1" />
      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{label}</span>
      <span className="text-sm font-bold text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

function AmenityBadge({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300">
      <Icon className="w-3.5 h-3.5 text-[#0d93f2]" />
      {label}
    </div>
  );
}