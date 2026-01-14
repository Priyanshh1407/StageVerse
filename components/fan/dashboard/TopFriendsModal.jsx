'use client';
import React, { useState, useEffect, use } from 'react';
import { X, Search, Users, MessageSquare, ArrowUpRight } from 'lucide-react';
import Image from 'next/image';

export default function TopFriendsModal({ isOpen, onClose, friends = [] }) {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) setSearchQuery('');
  }, [isOpen]);

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

  const filteredFriends = friends.filter((friend) =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh] zoom-in-95">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Concert Friends</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">People you've shared the most memories with.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151f28] shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a2632] text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#0d93f2] focus:border-transparent outline-none shadow-sm"
              placeholder="Search friends..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
          {filteredFriends.length > 0 ? (
            filteredFriends.map((friend) => (
              <div key={friend.name} className="flex items-center gap-4 p-3 hover:bg-slate-100 dark:hover:bg-[#1e2a35] rounded-lg transition-colors group cursor-pointer">
                {/* Avatar */}
                <div className="relative h-12 w-12 rounded-full shadow-md shrink-0 overflow-hidden border-2 border-white dark:border-slate-700">
                  <Image
                    src={friend.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde"}
                    alt={friend.name}
                    fill
                    className="object-cover" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 dark:text-white font-bold truncate text-base">{friend.name}</p>
                  <p className="text-xs text-slate-500">{friend.role || "Concert Buddy"}</p>
                </div>

                {/* Stats & Action */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 bg-purple-500/10 px-2 py-0.5 rounded text-purple-500 border border-purple-500/20">
                    <Users className="w-3 h-3" />
                    <p className="font-bold text-xs">{friend.sharedShows} Shared</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-[10px] text-slate-400 hover:text-[#0d93f2] transition-colors flex items-center gap-0.5">
                      Message <MessageSquare className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <p>No friends found matching "{searchQuery}"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shadow-sm">
            Close
          </button>
        </div>

      </div>
    </div>
  );
}