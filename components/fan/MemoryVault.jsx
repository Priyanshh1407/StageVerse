'use client';

import React from 'react';
import Image from 'next/image';
import { Camera, ArrowRight, PlayCircle, Ticket as TicketIcon, Image as ImageIcon } from 'lucide-react';

const memories = [
  {
    id: 1,
    size: 'featured', // Big item (2x2)
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9nWUa_jZdKX4PCJKFL3REuPGnEhrNzwsap8ZNWVDYQNfakGqxsuEkI49CGDCNBRNMCYPiFRlddN0012Mprok3d-x6mpew6JdAi3F4OrsRPYeXgzUDHl3DNKNYrkA2pJpNF9z2e3IYfQhpxIW1E7ZrzA6RY0YHMFnLCUD-9_ojQd1HMMa70L-zNYCA3aft1P0TUQhcOYx--vlka-u8juYzWUm9MCqb5dAu2QonhHaRnWF0nY_6jg09oGMRPsopuZJgcgHTVrv9csYi4',
    title: 'Electric Daisy Carnival',
    date: 'May 2023',
    type: 'image',
  },
  {
    id: 2,
    size: 'standard', // 1x1
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9nWUa_jZdKX4PCJKFL3REuPGnEhrNzwsap8ZNWVDYQNfakGqxsuEkI49CGDCNBRNMCYPiFRlddN0012Mprok3d-x6mpew6JdAi3F4OrsRPYeXgzUDHl3DNKNYrkA2pJpNF9z2e3IYfQhpxIW1E7ZrzA6RY0YHMFnLCUD-9_ojQd1HMMa70L-zNYCA3aft1P0TUQhcOYx--vlka-u8juYzWUm9MCqb5dAu2QonhHaRnWF0nY_6jg09oGMRPsopuZJgcgHTVrv9csYi5',
    type: 'video', // Shows play button
  },
  {
    id: 3,
    size: 'standard', // 1x1
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9nWUa_jZdKX4PCJKFL3REuPGnEhrNzwsap8ZNWVDYQNfakGqxsuEkI49CGDCNBRNMCYPiFRlddN0012Mprok3d-x6mpew6JdAi3F4OrsRPYeXgzUDHl3DNKNYrkA2pJpNF9z2e3IYfQhpxIW1E7ZrzA6RY0YHMFnLCUD-9_ojQd1HMMa70L-zNYCA3aft1P0TUQhcOYx--vlka-u8juYzWUm9MCqb5dAu2QonhHaRnWF0nY_6jg09oGMRPsopuZJgcgHTVrv9csYi6',
    title: 'The Killers',
    type: 'image',
  },
  {
    id: 4,
    size: 'ticket', // Special ticket style
    title: "Coachella '22",
    type: 'ticket',
  },
  {
    id: 5,
    size: 'horizontal', // Wide item (2x1)
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9nWUa_jZdKX4PCJKFL3REuPGnEhrNzwsap8ZNWVDYQNfakGqxsuEkI49CGDCNBRNMCYPiFRlddN0012Mprok3d-x6mpew6JdAi3F4OrsRPYeXgzUDHl3DNKNYrkA2pJpNF9z2e3IYfQhpxIW1E7ZrzA6RY0YHMFnLCUD-9_ojQd1HMMa70L-zNYCA3aft1P0TUQhcOYx--vlka-u8juYzWUm9MCqb5dAu2QonhHaRnWF0nY_6jg09oGMRPsopuZJgcgHTVrv9csYi7',
    title: 'Adele Live at Caesars',
    date: 'Oct 2022',
    type: 'image',
  },
];

export default function MemoryVault() {
  return (
    <section className="flex flex-col gap-6 pt-4">
      {}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight uppercase flex items-center gap-2 text-slate-900 dark:text-white">
            <ImageIcon className="w-6 h-6 text-blue-500" />
            Memory Vault
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Your curated collection of moments.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-bold transition-colors">
          <Camera className="w-4 h-4" />
          Upload Media
        </button>
      </div>

      {}
      {}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
        {memories.map((memory) => (
          <MemoryCard key={memory.id} memory={memory} />
        ))}
      </div>

      {}
      <div className="flex justify-center mt-2">
        <button className="text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-blue-500 transition-colors flex items-center gap-1">
          View All Memories
          <ArrowRight className="w-4 h-4 rotate-90" />
        </button>
      </div>
    </section>
  );
}
function MemoryCard({ memory }) {
  const spanClasses = {
    featured: 'col-span-2 row-span-2',   // Big Square
    vertical: 'row-span-2 col-span-1',   // Tall Portrait
    horizontal: 'col-span-2 row-span-1', // Wide Landscape
    standard: 'col-span-1 row-span-1',   // Standard Square
    ticket: 'col-span-1 row-span-1',     // Standard Square
  };

  const currentSpan = spanClasses[memory.size] || spanClasses.standard;
  if (memory.type === 'ticket') {
    return (
      <div className={`group relative rounded-xl overflow-hidden cursor-pointer bg-[#223949] flex flex-col items-center justify-center p-4 border border-slate-700 border-dashed transition-transform hover:scale-[1.02] ${currentSpan}`}>
        <TicketIcon className="text-slate-500 w-10 h-10 mb-2" />
        <p className="text-slate-300 text-center text-xs font-mono tracking-widest uppercase">Ticket Stub</p>
        <p className="text-white font-bold text-center mt-1 text-lg">{memory.title}</p>
      </div>
    );
  }
  return (
    <div className={`group relative rounded-xl overflow-hidden cursor-pointer bg-slate-800 ${currentSpan}`}>
      {}
      <div className="relative w-full h-full">
        <Image
          src={memory.image}
          alt={memory.title || 'Memory'}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        
        {}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-opacity duration-300 flex flex-col justify-end p-4 md:p-6 ${memory.title ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {memory.title && (
            <>
              <p className="text-white font-bold text-lg leading-tight">{memory.title}</p>
              {memory.date && <p className="text-blue-400 text-sm font-medium mt-1">{memory.date}</p>}
            </>
          )}
        </div>

        {}
        {memory.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/30 backdrop-blur-sm rounded-full p-3 group-hover:scale-110 transition-transform duration-300">
              <PlayCircle className="w-8 h-8 text-white" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}