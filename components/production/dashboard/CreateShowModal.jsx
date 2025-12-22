'use client';

import React, { useState } from 'react';
import { X, Upload, Calendar, MapPin, Layers } from 'lucide-react';

export default function CreateShowModal({ onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    venue: '',
    date: '',
    type: 'Touring'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate API call
    onSave({ 
      id: Date.now().toString(), 
      ...formData,
      status: 'active',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnVj5hRL8AOfL32wFRk1t6vNfXjCJGtYEdyHYBibnuH2byrvZsXsL1qovr4Is69A7PA7tIOYblHGsCqwynXXVJzbew0GlvIPmmvwId9pB0aUd4C7ZqsJBXgE5l1YCnOH7Xwx9UJ_TGCjgg1YyovrOkWh7oruXuzYUPltvT5dl45lFB25khObV__7ZuXqhGhuTWgopTGWHAsw8tWiAn00JaNlLYauRfrbfiZ0geMjsPWRkJGBVsw8dxrgxc55wDKaGmmtVDghJ_X7Tg', // Default placeholder
      typeColor: 'bg-blue-500' // Logic to assign color based on type
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#18181B] border border-[#27272A] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[#27272A]">
          <div>
            <h2 className="text-white font-bold text-xl tracking-tight">Create New Show</h2>
            <p className="text-gray-500 text-xs mt-1">Manual Entry</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto">
          
          {/* Show Title */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Show Name / Tour Title</label>
            <input 
              autoFocus
              type="text" 
              required
              placeholder="e.g. Neon Nights World Tour" 
              className="w-full bg-[#0F0F10] border border-[#27272A] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-gray-700 font-medium"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Type Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Production Type</label>
              <div className="relative">
                <select 
                  className="w-full bg-[#0F0F10] border border-[#27272A] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option>Touring</option>
                  <option>Festival</option>
                  <option>Corporate</option>
                  <option>Theatre</option>
                </select>
                <Layers className="absolute right-3 top-3.5 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Start Date</label>
              <div className="relative">
                <input 
                  type="date" 
                  className="w-full bg-[#0F0F10] border border-[#27272A] rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-blue-500 outline-none text-sm [color-scheme:dark]"
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Venue / Location</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="e.g. Wembley Stadium" 
                className="w-full bg-[#0F0F10] border border-[#27272A] rounded-lg pl-10 pr-4 py-3 text-white focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-gray-700"
                onChange={(e) => setFormData({...formData, venue: e.target.value})}
              />
              <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
            </div>
          </div>

          {/* Rider Upload (Visual Only) */}
          <div className="border-2 border-dashed border-[#27272A] rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-[#0F0F10] hover:border-blue-500/50 transition-all cursor-pointer group">
            <div className="size-10 rounded-full bg-[#0F0F10] flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <Upload className="w-5 h-5 text-gray-500 group-hover:text-blue-500" />
            </div>
            <p className="text-sm text-gray-400 font-medium">Drop Technical Rider (PDF)</p>
            <p className="text-xs text-gray-600">Optional • Max 10MB</p>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 rounded-lg font-bold text-sm text-gray-400 hover:text-white hover:bg-[#27272A] transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 rounded-lg font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all"
            >
              Create Project
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}