'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Edit2, MapPin, Instagram, Twitter, Eye } from 'lucide-react';
import Image from 'next/image';

export default function EditProfileModal({ isOpen, onClose, currentUser, onSave }) {
  const fileInputRef = useRef(null);
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
  // Fill the form from the profile each time the modal opens (or the profile arrives)
  const [prevOpenUser, setPrevOpenUser] = useState(null);
  const openUser = isOpen ? currentUser : null;
  if (openUser !== prevOpenUser) {
    setPrevOpenUser(openUser);
    if (openUser) {
      setFormData({
        name: currentUser.name || '',
        location: currentUser.location || '',
        bio: currentUser.bio || '',
        visibility: currentUser.visibility || 'Public',
        avatar: currentUser.avatar || ''
      });
      setSocials({
        instagram: (currentUser.socials?.instagram || '').replace(/^@+/, ''),
        twitter: (currentUser.socials?.twitter || '').replace(/^@+/, '')
      });
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
  const handleSave = () => {
    const updatedProfile = {
      ...formData,
      socials: socials
    };
    onSave(updatedProfile);
    onClose();
  };
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


        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-700/50">
          <h3 className="text-xl font-bold leading-6 text-slate-900 dark:text-white">Edit Profile</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:text-slate-500 dark:hover:text-white dark:hover:bg-slate-700/50 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        { }
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">


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
              <span aria-hidden className="absolute bottom-1 right-1 bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] text-black p-2 rounded-full shadow-lg border-[3px] border-white dark:border-[#1a2632] hover:brightness-110 transition-colors">
                <Edit2 className="w-4 h-4" />
              </span>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 w-full">
              <div>
                <label htmlFor="profile-name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Name</label>
                <input id="profile-name" className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#101b22] text-slate-900 dark:text-white sm:text-sm px-4 py-2.5 outline-none focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/25" type="text" maxLength={80}
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label htmlFor="profile-location" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Location</label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input id="profile-location" className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#101b22] text-slate-900 dark:text-white sm:text-sm px-4 py-2.5 outline-none focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/25 pl-9" type="text" maxLength={80} placeholder="e.g. Mumbai, India"
                    value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                </div>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="profile-bio" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Bio</label>
                <textarea id="profile-bio" className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#101b22] text-slate-900 dark:text-white sm:text-sm px-4 py-2.5 outline-none focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/25 resize-none" rows={3} maxLength={300} placeholder="Tell us about your music taste..."
                  value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} />
                <p className="mt-1 text-xs text-slate-500 text-right">{formData.bio.length}/300</p>
              </div>

              <div className="md:col-span-2">
                <p className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Social media</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex">
                    <label htmlFor="profile-instagram" className="inline-flex items-center justify-center w-11 shrink-0 rounded-l-lg border border-r-0 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-[#25323e] text-slate-500 dark:text-slate-400" title="Instagram">
                      <Instagram className="w-4 h-4" /><span className="sr-only">Instagram</span>
                    </label>
                    <input id="profile-instagram" className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#101b22] text-slate-900 dark:text-white sm:text-sm px-4 py-2.5 outline-none focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/25 rounded-l-none min-w-0" type="text" maxLength={30} placeholder="username"
                      value={socials.instagram} onChange={(e) => setSocials({ ...socials, instagram: e.target.value.replace(/^@+/, '') })} />
                  </div>
                  <div className="flex">
                    <label htmlFor="profile-twitter" className="inline-flex items-center justify-center w-11 shrink-0 rounded-l-lg border border-r-0 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-[#25323e] text-slate-500 dark:text-slate-400" title="X / Twitter">
                      <Twitter className="w-4 h-4" /><span className="sr-only">X / Twitter</span>
                    </label>
                    <input id="profile-twitter" className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#101b22] text-slate-900 dark:text-white sm:text-sm px-4 py-2.5 outline-none focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/25 rounded-l-none min-w-0" type="text" maxLength={30} placeholder="username"
                      value={socials.twitter} onChange={(e) => setSocials({ ...socials, twitter: e.target.value.replace(/^@+/, '') })} />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 flex items-center justify-between gap-4 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[#1d2a37]">
                <div className="flex items-center gap-3 min-w-0">
                  <Eye className="text-slate-400 w-5 h-5 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <label htmlFor="profile-visibility" className="text-sm font-semibold text-slate-900 dark:text-white">Profile visibility</label>
                    <span className="text-xs text-slate-500">Who can see your passport?</span>
                  </div>
                </div>
                <select id="profile-visibility"
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1a2632] py-1.5 pl-3 pr-8 text-slate-900 dark:text-white text-sm font-medium outline-none cursor-pointer focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/25"
                  value={formData.visibility} onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}>
                  <option value="Public">Public</option>
                  <option value="Friends Only">Friends Only</option>
                  <option value="Private">Private</option>
                </select>
              </div>
            </div>
          </div>
        </div>


        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[#151f28]/50">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 dark:border-slate-600 px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:border-[#ff6a00]/60 hover:text-[#ff6a00] transition-colors">Cancel</button>
          <button type="button" onClick={handleSave} className="rounded-lg bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] px-5 py-2.5 text-sm font-bold text-black shadow-lg shadow-[#ff6a00]/25 hover:brightness-110 transition-all">Save Changes</button>
        </div>

      </div>
    </div>
  );
}