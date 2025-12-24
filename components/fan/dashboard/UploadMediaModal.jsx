'use client';
import React from 'react';
import { useEffect } from 'react';
import { X, UploadCloud, Ticket, Calendar, UserPlus, Lock } from 'lucide-react';

export default function UploadMediaModal({ isOpen, onClose }) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] overflow-hidden zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Upload New Memories</h2>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Drag & Drop Zone */}
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-8 flex flex-col items-center justify-center text-center transition-colors hover:border-[#0d93f2] hover:bg-slate-100 dark:hover:bg-slate-800 group">
            <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8 text-slate-500 dark:text-slate-400" />
            </div>
            <p className="text-slate-900 dark:text-white font-medium mb-2">Drag & Drop your photos and videos here</p>
            <p className="text-slate-500 text-sm mb-6">Support for JPG, PNG, MP4 up to 500MB</p>
            <button className="px-6 py-2.5 bg-[#0d93f2] hover:bg-[#0d93f2]/90 text-white font-bold rounded-lg transition-colors shadow-lg shadow-[#0d93f2]/25">
              Browse Files
            </button>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Event Name</label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 text-slate-400">
                  <Ticket className="w-5 h-5" />
                </div>
                <input className="w-full bg-white dark:bg-[#151f28] border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0d93f2] focus:border-transparent outline-none transition-all placeholder:text-slate-500" placeholder="Search event, artist, or venue..." type="text"/>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Date Attended</label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 text-slate-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <input className="w-full bg-white dark:bg-[#151f28] border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0d93f2] focus:border-transparent outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]" type="date"/>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea className="w-full bg-white dark:bg-[#151f28] border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0d93f2] focus:border-transparent outline-none transition-all resize-none placeholder:text-slate-500" placeholder="What was your favorite moment?" rows="3"></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tag Friends</label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 text-slate-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <input className="w-full bg-white dark:bg-[#151f28] border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0d93f2] focus:border-transparent outline-none transition-all placeholder:text-slate-500" placeholder="Search friends..." type="text"/>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Privacy Setting</label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <select className="w-full bg-white dark:bg-[#151f28] border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-10 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0d93f2] focus:border-transparent outline-none transition-all appearance-none cursor-pointer">
                  <option>Private (Only Me)</option>
                  <option>Friends Only</option>
                  <option>Public</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-[#151f28]/50">
          <button onClick={onClose} className="px-6 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
            Cancel
          </button>
          <button className="px-6 py-2.5 bg-[#0d93f2] hover:bg-[#0d93f2]/90 text-white font-bold rounded-lg shadow-lg shadow-[#0d93f2]/25 transition-all hover:scale-[1.02]">
            Upload
          </button>
        </div>

      </div>
    </div>
  );
}