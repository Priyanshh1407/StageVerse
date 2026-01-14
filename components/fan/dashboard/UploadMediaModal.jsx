'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, Ticket, Calendar, UserPlus, Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function UploadMediaModal({ isOpen, onClose }) {
  // --- FORM STATE ---
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventQuery, setEventQuery] = useState('');
  const [eventResults, setEventResults] = useState([]);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  
  const [taggedFriends, setTaggedFriends] = useState([]);
  const [friendQuery, setFriendQuery] = useState('');
  const [showFriendDropdown, setShowFriendDropdown] = useState(false);

  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [privacy, setPrivacy] = useState('Public');

  // --- FILE UPLOAD STATE ---
  const [files, setFiles] = useState([]); // Array of File objects
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0 to 100
  const fileInputRef = useRef(null);

  // --- REFS ---
  const eventInputRef = useRef(null);
  const friendInputRef = useRef(null);

  // --- 1. HANDLE FILE SELECTION ---
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    // Append new files to existing selection
    setFiles(prev => [...prev, ...selected]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  // --- 2. UPLOAD LOGIC (Cloudinary -> DB) ---
  const handleUpload = async () => {
    if (files.length === 0) return alert("Please select files first!");
    
    setIsUploading(true);
    let completedCount = 0;

    // CLOUDINARY CONFIG (Replace these with your actual keys if not using env vars for testing)
    const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME; 
    const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_PRESET || 'stageverse_unsigned'; 

    try {
      // Loop through every file selected
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        // A. Determine resource type (image or video)
        const resourceType = file.type.startsWith('video') ? 'video' : 'image';

        // B. Upload to Cloudinary
        const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
          method: 'POST',
          body: formData
        });
        const cloudinaryData = await cloudinaryRes.json();
        if (cloudinaryData.error) {
            console.error("Cloudinary Error Details:", cloudinaryData.error);
        }

        if (!cloudinaryData.secure_url) throw new Error('Cloudinary upload failed');

        // C. Save to MongoDB via our API
        const payload = {
            imageUrl: resourceType === 'image' ? cloudinaryData.secure_url : cloudinaryData.secure_url.replace('.mp4', '.jpg'), // Simple thumbnail logic
            videoSrc: resourceType === 'video' ? cloudinaryData.secure_url : null,
            title: notes || (selectedEvent ? selectedEvent.title : "New Memory"), // Use notes as title or fallback
            date: date || new Date(),
            location: selectedEvent?.city || "Unknown Location",
            artist: selectedEvent?.artist || "Unknown Artist",
            venue: selectedEvent?.venue?.name || selectedEvent?.venue || "Unknown Venue",
            eventId: selectedEvent?._id
            // Note: We aren't saving 'taggedFriends' or 'privacy' in the simple Model yet, 
            // but the UI collects them for future expansion.
        };

        const dbRes = await fetch('/api/memory-vault', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!dbRes.ok) throw new Error('Database save failed');

        // Update Progress
        completedCount++;
        setUploadProgress(Math.round((completedCount / files.length) * 100));
      }

      // D. Cleanup and Close
      setIsUploading(false);
      onClose(); // Close modal
      alert("Upload Complete!");
      window.location.reload(); // Refresh to see new memories (or trigger a refetch in parent)

    } catch (error) {
      console.error(error);
      setIsUploading(false);
      alert("Upload failed. Check console.");
    }
  };

  // --- EVENT & FRIEND SEARCH LOGIC (Existing) ---
  useEffect(() => {
    const fetchEvents = async () => {
      if (eventQuery.length < 2) { setEventResults([]); return; }
      const res = await fetch(`/api/discover?search=${eventQuery}`);
      const data = await res.json();
      if (data.success) setEventResults(data.data);
    };
    const timeout = setTimeout(fetchEvents, 300);
    return () => clearTimeout(timeout);
  }, [eventQuery]);

  // Mock Friends Logic
  useEffect(() => {
    if (friendQuery.length < 1) { setEventResults([]); return; }
    const MOCK_FRIENDS = [
      { id: 'u1', name: 'Sarah Jenkins' }, { id: 'u2', name: 'Mike Chen' },
      { id: 'u3', name: 'Jessica Alverez' }, { id: 'u4', name: 'David Ross' },
    ];
    setFriendQuery(prev => prev); // minor ref hack
    // ... filtering logic ...
  }, [friendQuery]);

  // Close dropdowns
  useEffect(() => {
    const handleClick = (e) => {
        if(eventInputRef.current && !eventInputRef.current.contains(e.target)) setShowEventDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
      <div className="w-full max-w-2xl bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Upload New Memories</h2>
          <button onClick={onClose} disabled={isUploading} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* 1. DRAG & DROP ZONE */}
          <div 
            onClick={triggerFileSelect}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer group
            ${files.length > 0 ? 'border-[#0d93f2] bg-[#0d93f2]/5' : 'border-slate-300 dark:border-slate-600 hover:border-[#0d93f2] hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            {/* HIDDEN INPUT - Only accepts Image and Video */}
            <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                multiple 
                accept="image/*,video/*"
                onChange={handleFileChange}
            />

            <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8 text-slate-500 dark:text-slate-400" />
            </div>
            
            {files.length === 0 ? (
                <>
                    <p className="text-slate-900 dark:text-white font-medium mb-2">Click to select photos & videos</p>
                    <p className="text-slate-500 text-sm">JPG, PNG, MP4 supported</p>
                </>
            ) : (
                <div className="w-full">
                    <p className="text-[#0d93f2] font-bold mb-4">{files.length} files selected</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {files.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-sm text-slate-700 dark:text-slate-300">
                                <span className="max-w-[100px] truncate">{f.name}</span>
                                <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="text-red-500 hover:text-red-700"><X className="w-3 h-3" /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>

          {/* 2. FORM FIELDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 relative" ref={eventInputRef}>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Event Name</label>
              <div className="relative">
                <Ticket className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" />
                <input 
                  className="w-full bg-white dark:bg-[#151f28] border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-[#0d93f2]" 
                  placeholder="Search event..." 
                  value={eventQuery}
                  onChange={(e) => { setEventQuery(e.target.value); setShowEventDropdown(true); }}
                  onFocus={() => setShowEventDropdown(true)}
                />
              </div>
              {showEventDropdown && eventResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                    {eventResults.map(e => (
                        <button key={e._id} onClick={() => { setSelectedEvent(e); setEventQuery(e.title); setDate(new Date(e.date).toISOString().split('T')[0]); setShowEventDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                            <span className="font-bold block text-sm">{e.title}</span>
                            <span className="text-xs text-slate-500">{e.venue?.name}</span>
                        </button>
                    ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Date Attended</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" />
                <input 
                  type="date"
                  className="w-full bg-white dark:bg-[#151f28] border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-[#0d93f2] dark:[color-scheme:dark]" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Notes / Caption</label>
            <textarea 
                className="w-full bg-white dark:bg-[#151f28] border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#0d93f2] resize-none" 
                rows="3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What was the highlight of the show?"
            ></textarea>
          </div>
          
          {/* Privacy and Friends inputs are UI only for now in this snippet for brevity */}
          
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-[#151f28]/50">
          <button onClick={onClose} disabled={isUploading} className="px-6 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
            Cancel
          </button>
          
          <button 
            onClick={handleUpload}
            disabled={isUploading || files.length === 0}
            className="px-6 py-2.5 bg-[#0d93f2] hover:bg-[#0d93f2]/90 text-white font-bold rounded-lg shadow-lg shadow-[#0d93f2]/25 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
                <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading {uploadProgress}%
                </>
            ) : (
                <>Upload {files.length > 0 && `(${files.length})`}</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}