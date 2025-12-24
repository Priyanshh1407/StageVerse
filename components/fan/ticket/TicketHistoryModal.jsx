'use client';
import React, { useState, useEffect } from 'react';
import { X, Search, FileText, Calendar, MapPin } from 'lucide-react';
import Image from 'next/image';

export default function TicketHistoryModal({ isOpen, onClose, tickets = [], onSelectTicket }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Clear search when opening
  useEffect(() => {
    if (isOpen) setSearchQuery('');
  }, [isOpen]);

  useEffect(() =>{
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    if(isOpen){
        window.addEventListener('keydown', handleKeyDown);
    }

    return() => {
        window.removeEventListener('keydown', handleKeyDown);
    }
  },[isOpen, onClose]);

  if (!isOpen) return null;

  // Filter logic
  const filteredTickets = tickets.filter(ticket => 
    ticket.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.venue.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Order History</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Archive of all your past events.</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-50 dark:bg-[#151f28] border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input 
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a2632] text-sm focus:ring-2 focus:ring-[#0d93f2] outline-none transition-all"
              placeholder="Search by artist or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredTickets.map((ticket) => (
            <div 
              key={ticket.id} 
              onClick={() => {
                onSelectTicket(ticket); // Open the detailed ticket view
                onClose(); // Close this history list
              }}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1e2a35] border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer group"
            >
              {/* Thumbnail */}
              <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-800 relative overflow-hidden shrink-0">
                <Image src={ticket.image || ""} alt={ticket.artist} fill className="object-cover grayscale group-hover:grayscale-0 transition-all" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 dark:text-white truncate">{ticket.artist}</h4>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {ticket.date}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ticket.venue}</span>
                </div>
              </div>

              {/* Icon */}
              <div className="p-2 text-slate-400 group-hover:text-[#0d93f2] transition-colors">
                <FileText className="w-5 h-5" />
              </div>
            </div>
          ))}
          
          {filteredTickets.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-sm">
              No tickets found matching "{searchQuery}"
            </div>
          )}
        </div>

      </div>
    </div>
  );
}