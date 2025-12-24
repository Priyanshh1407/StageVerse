'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Edit2, MapPin, Instagram, Twitter, Eye } from 'lucide-react';
import Image from 'next/image';

export default function EditProfileModal({ isOpen, onClose, currentUser, onSave }) {
  const fileInputRef = useRef(null);

  // 1. Initialize State with empty values
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    bio: '',
    visibility: 'Public',
    avatar: ''
  });

  const [socials, setSocials] = useState({
    instagram: '',
    twitter: ''
  });

  // 2. POPULATE DATA: This runs whenever the modal opens
  useEffect(() => {
    if (isOpen && currentUser) {
      // Safely check if properties exist before setting them
      setFormData({
        name: currentUser.name || '',
        location: currentUser.location || '',
        bio: currentUser.bio || '',
        visibility: currentUser.visibility || 'Public',
        avatar: currentUser.avatar || ''
      });

      // Handle nested socials object safely
      setSocials({
        instagram: currentUser.socials?.instagram || '',
        twitter: currentUser.socials?.twitter || ''
      });
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // 3. Handle Save
  const handleSave = () => {
    const updatedProfile = {
      ...formData,
      socials: socials
    };
    onSave(updatedProfile);
    onClose();
  };

  // Image Preview Logic
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setFormData({ ...formData, avatar: imageUrl });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl transform rounded-2xl bg-white dark:bg-[#1a2632] text-left shadow-2xl transition-all border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-700/50">
          <h3 className="text-xl font-bold leading-6 text-slate-900 dark:text-white">Edit Profile</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-500 dark:hover:text-white dark:hover:bg-slate-700/50 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
              <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-white dark:border-[#243442] shadow-xl relative">
                <Image 
                  src={formData.avatar || "https://via.placeholder.com/150"} 
                  alt="Profile" 
                  fill 
                  className="object-cover" 
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white w-8 h-8" />
                </div>
              </div>
              <button className="absolute bottom-1 right-1 bg-[#0d93f2] text-white p-2 rounded-full shadow-lg border-[3px] border-white dark:border-[#1a2632] hover:bg-blue-500 transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
            </div>
            <button onClick={() => fileInputRef.current.click()} className="text-sm font-bold text-[#0d93f2] hover:text-blue-400">Change Profile Picture</button>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
            
            <div className="col-span-1 space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Name</label>
              <input 
                className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#101b22] text-slate-900 dark:text-white shadow-sm focus:border-[#0d93f2] focus:ring-[#0d93f2] sm:text-sm px-4 py-2.5 outline-none" 
                type="text" 
                value={formData.name} // Connected to State
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div className="col-span-1 space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Location</label>
              <div className="relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <MapPin className="text-slate-500 w-5 h-5" />
                </div>
                <input 
                  className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#101b22] pl-10 text-slate-900 dark:text-white focus:border-[#0d93f2] focus:ring-[#0d93f2] sm:text-sm px-4 py-2.5 outline-none" 
                  type="text" 
                  placeholder="e.g. New York, NY"
                  value={formData.location} // Connected to State
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Bio</label>
              <textarea 
                className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#101b22] text-slate-900 dark:text-white shadow-sm focus:border-[#0d93f2] focus:ring-[#0d93f2] sm:text-sm px-4 py-2.5 resize-none outline-none" 
                rows="3" 
                placeholder="Tell us about your music taste..."
                value={formData.bio} // Connected to State
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
              ></textarea>
              <p className="text-xs text-slate-500 text-right">{formData.bio.length}/300</p>
            </div>

            {/* Social Links */}
            <div className="col-span-1 md:col-span-2 space-y-4">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Social Media Links</label>
              <div className="grid gap-3">
                <div className="flex rounded-lg shadow-sm">
                  <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-[#25323e] px-3 text-slate-500 dark:text-slate-400 w-12 justify-center">
                    <Instagram className="w-5 h-5" />
                  </span>
                  <input 
                    className="block w-full min-w-0 flex-1 rounded-none rounded-r-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#101b22] px-4 py-2.5 text-slate-900 dark:text-white focus:border-[#0d93f2] focus:ring-[#0d93f2] sm:text-sm outline-none" 
                    type="text" 
                    placeholder="Instagram Username"
                    value={socials.instagram} // Connected to State
                    onChange={(e) => setSocials({...socials, instagram: e.target.value})}
                  />
                </div>
                <div className="flex rounded-lg shadow-sm">
                  <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-[#25323e] px-3 text-slate-500 dark:text-slate-400 w-12 justify-center">
                    <Twitter className="w-5 h-5" />
                  </span>
                  <input 
                    className="block w-full min-w-0 flex-1 rounded-none rounded-r-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#101b22] px-4 py-2.5 text-slate-900 dark:text-white focus:border-[#0d93f2] focus:ring-[#0d93f2] sm:text-sm outline-none" 
                    type="text" 
                    placeholder="X / Twitter Username"
                    value={socials.twitter} // Connected to State
                    onChange={(e) => setSocials({...socials, twitter: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Visibility */}
            <div className="col-span-1 md:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-700/50 mt-2">
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[#1d2a37]">
                <div className="flex items-center gap-3">
                  <Eye className="text-slate-400 w-5 h-5" />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">Profile Visibility</span>
                    <span className="text-xs text-slate-500">Who can see your passport?</span>
                  </div>
                </div>
                <div className="relative inline-block text-left">
                  <select 
                    className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1a2632] py-1.5 pl-3 pr-8 text-slate-900 dark:text-white focus:border-[#0d93f2] focus:ring-[#0d93f2] text-sm font-medium outline-none cursor-pointer"
                    value={formData.visibility}
                    onChange={(e) => setFormData({...formData, visibility: e.target.value})}
                  >
                    <option value="Public">Public</option>
                    <option value="Friends Only">Friends Only</option>
                    <option value="Private">Private</option>
                  </select>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[#151f28]/50">
          <button onClick={onClose} className="rounded-lg border border-slate-300 dark:border-slate-600 px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          <button onClick={handleSave} className="rounded-lg bg-[#0d93f2] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#0d93f2]/25 hover:bg-[#0d93f2]/90 transition-all hover:scale-[1.02]">Save Changes</button>
        </div>

      </div>
    </div>
  );
}