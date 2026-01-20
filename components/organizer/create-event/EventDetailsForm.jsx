'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from "sonner";
import { MapPin, Search, Plus, AlertTriangle, Info, Rocket, RefreshCw, X, Calendar, Image as ImageIcon, Ticket, DollarSign, Upload } from 'lucide-react';
import Image from 'next/image';

const GENRES = [
  "Select a Genre", "EDM", "Rock", "Pop", "Jazz", "Hip Hop", "Indie",
  "Techno", "House", "Classical", "Metal", "R&B", "Comedy", "Theater", "Bollywood"
];

const STATUS_OPTIONS = [
  "Draft", "Scheduled", "Published", "Live", "Completed", "Cancelled"
];

export default function EventDetailsForm({
  onOpenVenueModal,
  autoSelectVenue,
  onPreviewUpdate,
  aiRequest // New Prop
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); // Internal State

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    genre: '',
    status: 'Scheduled',
    vibe: 50,
    date: '',
    time: '',
    city: '',
    description: ''
  });

  // --- VENUE STATE ---
  const [venueSearch, setVenueSearch] = useState('');
  const [venuesList, setVenuesList] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [cityMismatch, setCityMismatch] = useState(false);

  // 1. DETECT EDIT MODE & FETCH DATA
  useEffect(() => {
    if (editId) {
      fetchEventDetails(editId);
    }
  }, [editId]);

  const fetchEventDetails = async (id) => {
    setIsFetching(true);
    try {
      const res = await fetch(`/api/events/${id}`);
      const json = await res.json();

      if (json.success) {
        const data = json.data;

        // Populate Form
        setFormData({
          title: data.title,
          artist: data.artist,
          genre: data.genre || '',
          status: data.status || 'Scheduled',
          vibe: getVibeValue(data.vibe), // Helper to convert String back to Slider Number
          date: data.date ? new Date(data.date).toISOString().split('T')[0] : '',
          time: data.time || '',
          city: data.city || '',
          description: data.description || ''
        });

        // Populate Venue
        if (data.venue) {
          setSelectedVenue(data.venue); // Assuming populate returned the object
          setVenueSearch(data.venue.name);
        }
      }
    } catch (error) {
      console.error("Failed to load event for edit", error);
    } finally {
      setIsFetching(false);
    }
  };

  // Helper: Convert Vibe String back to Number (Approximate)
  const getVibeValue = (label) => {
    if (label === "Chill / Relaxed") return 10;
    if (label === "Casual / Lounge") return 30;
    if (label === "Upbeat") return 50;
    if (label === "Energetic / Party") return 70;
    if (label === "High Voltage / Raging") return 90;
    return 50; // Default
  };

  // Helper: Convert Number to Label
  const getVibeLabel = (val) => {
    if (val < 20) return "Chill / Relaxed";
    if (val < 40) return "Casual / Lounge";
    if (val < 60) return "Upbeat";
    if (val < 80) return "Energetic / Party";
    return "High Voltage / Raging";
  };

  // 2. LISTEN FOR AUTO-SELECT (From Modal)
  useEffect(() => {
    if (autoSelectVenue) {
      handleSelectVenue(autoSelectVenue);
    }
  }, [autoSelectVenue]);

  // 2b. LISTEN FOR AI REQUESTS (From Preview)
  useEffect(() => {
    if (aiRequest?.ts) {
      let modifier = "";
      if (aiRequest.type === 'hype') modifier = "Make it extremely HYPE, EXCITING, and use strong adjectives!";
      if (aiRequest.type === 'seo') modifier = "Include relevant SEO keywords for this artist/genre naturally.";

      // We pass modifier to handleAiGenerate. Note handleAiGenerate shouldn't rely on being an event handler only.
      handleAiGenerate(null, modifier);
    }
  }, [aiRequest]);

  // 3. SEARCH VENUES
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      // Don't search if we are just displaying the pre-filled venue
      if (venueSearch.length > 1 && (!selectedVenue || venueSearch !== selectedVenue.name)) {
        try {
          const res = await fetch(`/api/venues?search=${venueSearch}`);
          const data = await res.json();
          if (data.success) {
            setVenuesList(data.data);
            setShowDropdown(true);
          }
        } catch (err) { console.error(err); }
      } else {
        setVenuesList([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [venueSearch, selectedVenue]);

  const handleSelectVenue = (venue) => {
    setSelectedVenue(venue);
    setVenueSearch(venue.name);
    setShowDropdown(false);
    if (!formData.city) {
      setFormData(prev => ({ ...prev, city: venue.city }));
      setCityMismatch(false);
    } else {
      checkCityMismatch(venue.city, formData.city);
    }
  };

  const checkCityMismatch = (venueCity, eventCity) => {
    if (venueCity && eventCity && venueCity.toLowerCase() !== eventCity.toLowerCase()) {
      setCityMismatch(true);
    } else {
      setCityMismatch(false);
    }
  };

  const handleCreateNewClick = () => {
    setShowDropdown(false);
    onOpenVenueModal(venueSearch);
  };

  // 3b. AI GENERATE DESCRIPTION
  const handleAiGenerate = async (e, modifier = "") => {
    if (e && e.preventDefault) e.preventDefault();

    // If called via useEffect, e is null, logic holds.

    if (!formData.artist) {
      toast.error("Please enter an Artist name first.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artist: formData.artist,
          genre: formData.genre,
          vibe: getVibeLabel(formData.vibe) + (modifier ? `. IMPORTANT: ${modifier}` : ""),
          // New Context Fields
          title: formData.title,
          date: formData.date,
          city: formData.city,
          venue: selectedVenue?.name || venueSearch
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate description");
      }

      if (data.description) {
        setFormData(prev => ({ ...prev, description: data.description }));
        if (onPreviewUpdate) onPreviewUpdate(data.description); // Update Preview
        toast.success(modifier ? "AI Updated with feedback!" : "Description generated!");
      } else {
        toast.error("Failed to generate description.");
      }
    } catch (e) {
      console.error(e);
      toast.error(e.message || "AI Error.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. SUBMIT (Create OR Update)
  const handleSubmit = async () => {
    if (!selectedVenue?._id) return toast.error("Please select a valid venue.");
    if (!formData.title || !formData.date) return toast.error("Required fields missing.");

    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        venue: selectedVenue._id,
        vibe: getVibeLabel(formData.vibe),
        // Only include ticket tiers on creation to avoid overwriting sales data on edit
        // (Unless you build a specific UI to manage tiers)
        ...(!editId && { ticketTiers: [{ name: "General Admission", price: 0, capacity: selectedVenue.capacity || 100 }] })
      };

      // DYNAMIC URL & METHOD
      const url = editId ? `/api/events/${editId}` : '/api/events';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(editId ? "Event Updated Successfully!" : "Event Created Successfully! 🚀");
        router.push('/manage/dashboard');
      } else {
        toast.error(`Failed: ${data.message}`);
      }

    } catch (error) {
      console.error("Error:", error);
      toast.error("Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // SWITCH TO CREATE MODE (Clear Form)
  const handleCancelEdit = () => {
    router.push('/manage/create-event'); // Removes ?id=...
    // Reset state manually (optional, as router push might not remount immediately depending on config)
    setFormData({ title: '', artist: '', genre: '', status: 'Scheduled', vibe: 50, date: '', time: '', city: '', description: '' });
    setSelectedVenue(null);
    setVenueSearch('');
  };

  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-[#101622] rounded-xl border border-[#314368] text-[#90a4cb] gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-[#0d93f2]" />
        <p>Loading Event Details...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 bg-[#101622] p-6 rounded-xl border border-[#314368] relative">

      {/* HEADER WITH TOGGLE */}
      <div className="flex items-center justify-between border-b border-[#314368] pb-4">
        <h3 className="text-xl font-bold text-white">
          {editId ? 'Edit Event Details' : 'Create New Event'}
        </h3>

        {editId && (
          <button
            onClick={handleCancelEdit}
            className="text-xs flex items-center gap-1 text-[#90a4cb] hover:text-white bg-[#192734] px-3 py-1.5 rounded-lg border border-[#2c3b47] hover:border-red-400 hover:text-red-400 transition-colors"
          >
            <X className="w-3 h-3" /> Cancel Edit
          </button>
        )}
      </div>

      {/* --- FORM INPUTS (Same as before) --- */}
      <div className="flex flex-col gap-5">

        {/* Title */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#90a4cb]">Event Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full h-12 bg-[#182234] border border-[#314368] rounded-lg px-4 text-white focus:border-[#0d93f2] outline-none placeholder-[#314368]"
          />
        </div>

        {/* Artist */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#90a4cb]">Artist</label>
          <input
            type="text"
            value={formData.artist}
            onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
            className="w-full h-12 bg-[#182234] border border-[#314368] rounded-lg px-4 text-white focus:border-[#0d93f2] outline-none placeholder-[#314368]"
          />
        </div>

        {/* Grid: Genre, Status, Vibe */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#90a4cb]">Genre</label>
            <div className="relative">
              <select
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="w-full h-12 bg-[#182234] border border-[#314368] rounded-lg px-4 text-white focus:border-[#0d93f2] outline-none appearance-none cursor-pointer"
              >
                {GENRES.map((g) => <option key={g} value={g === "Select a Genre" ? "" : g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#90a4cb]">Event Status</label>
            <div className="relative">
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full h-12 bg-[#182234] border border-[#314368] rounded-lg px-4 text-white focus:border-[#0d93f2] outline-none appearance-none cursor-pointer"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-[#90a4cb]">Vibe</label>
              <span className="text-xs font-bold text-[#0d93f2]">{getVibeLabel(formData.vibe)}</span>
            </div>
            <input
              type="range" min="0" max="100" value={formData.vibe}
              onChange={(e) => setFormData({ ...formData, vibe: parseInt(e.target.value) })}
              className="w-full h-2 bg-[#314368] rounded-lg appearance-none cursor-pointer accent-[#0d93f2]"
            />
          </div>
        </div>
      </div>

      <div className="h-px bg-[#314368]/50 my-2"></div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#90a4cb]">Date</label>
          <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full h-12 bg-[#182234] border border-[#314368] rounded-lg px-4 text-white focus:border-[#0d93f2] outline-none [color-scheme:dark]" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#90a4cb]">Time</label>
          <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="w-full h-12 bg-[#182234] border border-[#314368] rounded-lg px-4 text-white focus:border-[#0d93f2] outline-none [color-scheme:dark]" />
        </div>
      </div>

      {/* City */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-[#90a4cb]">Event City</label>
        <input
          type="text"
          value={formData.city}
          onChange={(e) => {
            setFormData({ ...formData, city: e.target.value });
            if (selectedVenue) checkCityMismatch(selectedVenue.city, e.target.value);
          }}
          className={`w-full h-12 bg-[#182234] border rounded-lg px-4 text-white focus:border-[#0d93f2] outline-none ${cityMismatch ? 'border-yellow-500' : 'border-[#314368]'}`}
        />
        {cityMismatch && <p className="text-xs text-yellow-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Warning: Venue is in {selectedVenue?.city}</p>}
      </div>

      {/* Venue Search */}
      <div className="flex flex-col gap-2 relative z-50">
        <label className="text-sm font-medium text-[#90a4cb]">Venue</label>
        <div className="relative">
          <input
            type="text"
            value={venueSearch}
            onChange={(e) => {
              setVenueSearch(e.target.value);
              setSelectedVenue(null);
              setShowDropdown(true);
            }}
            onFocus={() => { if (venueSearch) setShowDropdown(true); }}
            className={`w-full h-12 bg-[#182234] border rounded-lg pl-10 pr-4 text-white focus:border-[#0d93f2] outline-none ${selectedVenue ? 'border-green-500/50' : 'border-[#314368]'}`}
            placeholder="Search for a venue..."
          />
          <Search className="absolute left-3 top-3.5 text-[#90a4cb] w-5 h-5" />
          {selectedVenue && !showDropdown && <div className="absolute right-3 top-3.5 text-green-400"><MapPin className="w-5 h-5" /></div>}
        </div>

        {/* Dropdown Results */}
        {showDropdown && venueSearch && !selectedVenue && (
          <div className="absolute top-full left-0 w-full mt-2 bg-[#182234] border border-[#314368] rounded-lg shadow-xl overflow-hidden z-50">
            {venuesList.length > 0 ? (
              venuesList.map((venue) => (
                <div key={venue._id} onClick={() => handleSelectVenue(venue)} className="px-4 py-3 hover:bg-[#0d93f2]/10 cursor-pointer border-b border-[#314368]/50 flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-[#90a4cb]" />
                  <div><div className="text-white font-medium">{venue.name}</div><div className="text-xs text-[#90a4cb]">{venue.city}</div></div>
                </div>
              ))
            ) : (
              <div onClick={handleCreateNewClick} className="px-4 py-4 hover:bg-[#0d93f2]/10 cursor-pointer flex items-center gap-3 text-[#0d93f2]">
                <Plus className="w-5 h-5" />
                <div><div className="font-bold">Venue not found?</div><div className="text-sm">Create "{venueSearch}"</div></div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-[#314368]/50 my-2"></div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-[#90a4cb]">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => {
            setFormData({ ...formData, description: e.target.value });
            if (onPreviewUpdate) onPreviewUpdate(e.target.value);
          }}
          className="w-full h-32 bg-[#182234] border border-[#314368] rounded-lg p-4 text-white focus:border-[#0d93f2] outline-none resize-y"
        />
      </div>

      <div className="flex gap-4 mt-4">
        <button
          onClick={(e) => handleAiGenerate(e)}
          disabled={isGenerating || isSubmitting}
          className="flex-1 h-12 bg-[#192734] border border-[#2c3b47] rounded-lg font-bold text-white hover:bg-[#233b4a] transition-all flex items-center justify-center gap-2"
        >
          {isGenerating ? 'Thinking...' : <><Info className="w-4 h-4" /> Generate AI</>}
        </button>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isGenerating}
          className={`flex-1 h-12 rounded-lg font-bold text-white hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${editId ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-emerald-500/20' : 'bg-gradient-to-r from-[#0d93f2] to-[#0066cc] hover:shadow-[#0d93f2]/20'
            }`}
        >
          {isSubmitting ? (editId ? 'Updating...' : 'Publishing...') : (
            <><Rocket className="w-4 h-4" /> {editId ? 'Update Event' : 'Publish Event'}</>
          )}
        </button>
      </div>

    </div>
  );
}