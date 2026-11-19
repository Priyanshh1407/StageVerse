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
  "Draft", "Scheduled", "Published", "Cancelled"
];

import CreateVenueModal from '@/components/organizer/create-event/CreateVenueModal';
import UserSearchInput from '@/components/common/UserSearchInput';

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
  const [errors, setErrors] = useState({});
  const [restored, setRestored] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); // Internal State
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    artistId: null, // Store ID
    genre: '',
    status: 'Scheduled',
    vibe: 50,
    date: '',
    time: '',
    city: '',
    description: '',
    ticketsAt: { name: '', url: '' }
  });
  const [venueSearch, setVenueSearch] = useState('');
  const DRAFT_KEY = 'sv:event-draft';
  const LAST_VENUE_KEY = 'sv:last-venue';
  const [venuesList, setVenuesList] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [cityMismatch, setCityMismatch] = useState(false);
  useEffect(() => {
    if (editId) {
      fetchEventDetails(editId);
    }
  }, [editId]);

  async function fetchEventDetails(id) {
    setIsFetching(true);
    try {
      const res = await fetch(`/api/events/${id}`);
      const json = await res.json();

      if (json.success) {
        const data = json.data;
        setFormData({
          title: data.title,
          artist: data.artist, // Name
          artistId: data.artistId, // ID
          genre: data.genre || '',
          status: data.status || 'Scheduled',
          vibe: getVibeValue(data.vibe), // Helper to convert String back to Slider Number
          date: data.date ? new Date(data.date).toISOString().split('T')[0] : '',
          time: data.time || '',
          city: data.city || '',
          description: data.description || '',
          ticketsAt: { name: data.ticketsAt?.name || '', url: data.ticketsAt?.url || '' }
        });
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
  const getVibeValue = (label) => {
    if (label === "Chill / Relaxed") return 10;
    if (label === "Casual / Lounge") return 30;
    if (label === "Upbeat") return 50;
    if (label === "Energetic / Party") return 70;
    if (label === "High Voltage / Raging") return 90;
    return 50; // Default
  };
  const getVibeLabel = (val) => {
    if (val < 20) return "Chill / Relaxed";
    if (val < 40) return "Casual / Lounge";
    if (val < 60) return "Upbeat";
    if (val < 80) return "Energetic / Party";
    return "High Voltage / Raging";
  };
  useEffect(() => {
    if (autoSelectVenue) {
      handleSelectVenue(autoSelectVenue);
    }
  }, [autoSelectVenue]);
  useEffect(() => {
    if (aiRequest?.ts) {
      let modifier = "";
      if (aiRequest.type === 'hype') modifier = "Make it extremely HYPE, EXCITING, and use strong adjectives!";
      if (aiRequest.type === 'seo') modifier = "Include relevant SEO keywords for this artist/genre naturally.";
      handleAiGenerate(null, modifier);
    }
  }, [aiRequest]);
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
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

  function handleSelectVenue(venue) {
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
  async function handleAiGenerate(e, modifier = "") {
    if (e && e.preventDefault) e.preventDefault();

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
  // a new event: bring back an unfinished draft, otherwise start from the last city and venue used
  const [draftChecked, setDraftChecked] = useState(false);
  if (!draftChecked && typeof window !== 'undefined') {
    setDraftChecked(true);
    if (!editId) {
      try {
        const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
        if (draft?.formData && Object.values(draft.formData).some((v) => typeof v === 'string' && v.trim())) {
          setFormData((f) => ({ ...f, ...draft.formData, ticketsAt: { name: '', url: '', ...(draft.formData.ticketsAt ?? {}) } }));
          if (draft.venue) { setSelectedVenue(draft.venue); setVenueSearch(draft.venue.name ?? ''); }
          setRestored(true);
        } else {
          const last = JSON.parse(localStorage.getItem(LAST_VENUE_KEY) || 'null');
          if (last?.venue) { setSelectedVenue(last.venue); setVenueSearch(last.venue.name ?? ''); setFormData((f) => ({ ...f, city: last.city ?? f.city })); }
        }
      } catch { /* no saved draft */ }
    }
  }
  // (saved as you type, for a new event only)
  useEffect(() => {
    if (editId || !draftChecked) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, venue: selectedVenue })); } catch { /* private mode */ }
  }, [formData, selectedVenue, editId, draftChecked]);
  const startOver = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* private mode */ }
    setFormData({ title: '', artist: '', artistId: null, genre: '', status: 'Scheduled', vibe: 50, date: '', time: '', city: '', description: '', ticketsAt: { name: '', url: '' } });
    setSelectedVenue(null); setVenueSearch(''); setErrors({}); setRestored(false);
  };

  const handleSubmit = async () => {
    // (the server needs all of these: say which are missing, next to them, all at once)
    const found = {};
    if (!formData.title.trim()) found.title = 'Give the event a name.';
    if (!String(formData.artist ?? '').trim()) found.artist = 'Pick the artist (start typing their name).';
    if (!formData.date) found.date = 'Pick the date.';
    if (!formData.time) found.time = 'Pick the start time.';
    if (!formData.city.trim()) found.city = 'Which city is it in?';
    if (!selectedVenue?._id) found.venue = 'Pick the venue from the list (or create it).';
    if (!formData.description.trim()) found.description = 'Add a short description, or press "Write the description for me".';
    setErrors(found);
    if (Object.keys(found).length) { toast.error('A few details are missing: they are marked in red.'); return; }

    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        venue: selectedVenue._id,
        vibe: getVibeLabel(formData.vibe),
        ...(!editId && { ticketTiers: [{ name: "General Admission", price: 0, capacity: selectedVenue.capacity || 100 }] })
      };
      const url = editId ? `/api/events/${editId}` : '/api/events';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(editId ? 'Your changes are saved.' : 'Your event is published.');
        try {
          localStorage.removeItem(DRAFT_KEY);
          localStorage.setItem(LAST_VENUE_KEY, JSON.stringify({ city: formData.city, venue: selectedVenue }));
        } catch { /* private mode */ }
        router.push('/manage/dashboard');
      } else {
        toast.error(data.message ? `It couldn't be saved: ${data.message}` : "It couldn't be saved. Please try again.");
      }

    } catch (error) {
      console.error("Error:", error);
      toast.error("Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleCancelEdit = () => {
    router.push('/create-event'); // Removes ?id=...
    setFormData({ title: '', artist: '', genre: '', status: 'Scheduled', vibe: 50, date: '', time: '', city: '', description: '' });
    setSelectedVenue(null);
    setVenueSearch('');
  };

  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-[#101622] rounded-xl border border-[#314368] text-[#90a4cb] gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-[#ff6a00]" />
        <p>Loading Event Details...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 bg-[#101622] p-6 rounded-xl border border-[#314368] relative">

      {}
      <div className="flex items-center justify-between border-b border-[#314368] pb-4">
        <div>
          <h2 className="text-xl font-bold text-white">{editId ? 'Edit the event' : 'Event details'}</h2>
          <p className="mt-1 text-sm text-[#90a4cb]">Fields marked <span className="text-red-300">*</span> are needed. {editId ? '' : 'Your draft is saved as you type.'}</p>
          {restored && <p className="mt-1 text-sm text-amber-200">We brought back the draft you hadn&apos;t finished. <button type="button" onClick={startOver} className="font-semibold underline">Start over</button></p>}
        </div>

        {editId && (
          <button
            onClick={handleCancelEdit}
            className="text-xs flex items-center gap-1 text-[#90a4cb] hover:text-white bg-[#192734] px-3 py-1.5 rounded-lg border border-[#2c3b47] hover:border-red-400 hover:text-red-400 transition-colors"
          >
            <X className="w-3 h-3" /> Cancel Edit
          </button>
        )}
      </div>

      {}
      <div className="flex flex-col gap-5">

        {}
        <div className="flex flex-col gap-2">
          <label htmlFor="event-title" className="text-sm font-medium text-[#90a4cb]">Event name <span className="text-red-300">*</span></label>
          <input
            id="event-title"
            type="text"
            value={formData.title}
            aria-invalid={Boolean(errors.title)}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Neon Skyline Tour: Pune"
            className={`w-full h-12 bg-[#182234] border rounded-lg px-4 text-white focus:border-[#a855f7] outline-none placeholder-[#5b6b86] ${errors.title ? 'border-red-400' : 'border-[#314368]'}`}
          />
        {errors.title && <p role="alert" className="text-sm font-medium text-red-300">{errors.title}</p>}
        </div>

        {}
        <div className="flex flex-col gap-2 relative z-[60]"> {}
          <UserSearchInput
            label="Artist"
            role="artist"
            initialValue={formData.artist} // Pass name string OR object if you had full user.
            onSelect={(user) => {
              if (user) {
                setFormData({ ...formData, artist: user.name, artistId: user._id });
              } else {
                setFormData({ ...formData, artist: '', artistId: null });
              }
            }}
            required
          />
          {errors.artist && <p role="alert" className="text-sm font-medium text-red-300">{errors.artist}</p>}
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="event-genre" className="text-sm font-medium text-[#90a4cb]">Genre</label>
            <div className="relative">
              <select
                id="event-genre"
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="w-full h-12 bg-[#182234] border border-[#314368] rounded-lg px-4 text-white focus:border-[#a855f7] outline-none appearance-none cursor-pointer"
              >
                {GENRES.map((g) => <option key={g} value={g === "Select a Genre" ? "" : g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="event-status" className="text-sm font-medium text-[#90a4cb]">Status</label>
            <div className="relative">
              <select
                id="event-status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full h-12 bg-[#182234] border border-[#314368] rounded-lg px-4 text-white focus:border-[#a855f7] outline-none appearance-none cursor-pointer"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <div className="flex justify-between items-center">
              <label htmlFor="event-vibe" className="text-sm font-medium text-[#90a4cb]">Vibe</label>
              <span className="text-xs font-bold text-[#ff6a00]">{getVibeLabel(formData.vibe)}</span>
            </div>
            <input
              id="event-vibe"
              type="range" min="0" max="100" value={formData.vibe}
              onChange={(e) => setFormData({ ...formData, vibe: parseInt(e.target.value) })}
              className="w-full h-2 bg-[#314368] rounded-lg appearance-none cursor-pointer accent-[#ff6a00]"
            />
          </div>
        </div>
      </div>

      <div className="h-px bg-[#314368]/50 my-2"></div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="event-date" className="text-sm font-medium text-[#90a4cb]">Date <span className="text-red-300">*</span></label>
          <input id="event-date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full h-12 bg-[#182234] border border-[#314368] rounded-lg px-4 text-white focus:border-[#a855f7] outline-none [color-scheme:dark]" />
          {errors.date && <p role="alert" className="text-sm font-medium text-red-300">{errors.date}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="event-time" className="text-sm font-medium text-[#90a4cb]">Start time <span className="text-red-300">*</span></label>
          <input id="event-time" type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="w-full h-12 bg-[#182234] border border-[#314368] rounded-lg px-4 text-white focus:border-[#a855f7] outline-none [color-scheme:dark]" />
          {errors.time && <p role="alert" className="text-sm font-medium text-red-300">{errors.time}</p>}
        </div>
      </div>

      {}
      <div className="flex flex-col gap-2">
        <label htmlFor="event-city" className="text-sm font-medium text-[#90a4cb]">City <span className="text-red-300">*</span></label>
        <input
          id="event-city"
          type="text"
          autoComplete="address-level2"
          value={formData.city}
          onChange={(e) => {
            setFormData({ ...formData, city: e.target.value });
            if (selectedVenue) checkCityMismatch(selectedVenue.city, e.target.value);
          }}
          className={`w-full h-12 bg-[#182234] border rounded-lg px-4 text-white focus:border-[#a855f7] outline-none ${cityMismatch ? 'border-yellow-500' : 'border-[#314368]'}`}
        />
        {cityMismatch && <p className="text-sm text-yellow-300 flex items-center gap-1"><AlertTriangle className="w-4 h-4" aria-hidden /> The venue you picked is in {selectedVenue?.city}.</p>}
        {errors.city && <p role="alert" className="text-sm font-medium text-red-300">{errors.city}</p>}

      </div>

      {}
      <div className="flex flex-col gap-2 relative z-50">
        <label htmlFor="event-venue" className="text-sm font-medium text-[#90a4cb]">Venue <span className="text-red-300">*</span></label>
        <div className="relative">
          <input
            id="event-venue"
            type="text"
            value={venueSearch}
            onChange={(e) => {
              setVenueSearch(e.target.value);
              setSelectedVenue(null);
              setShowDropdown(true);
            }}
            onFocus={() => { if (venueSearch) setShowDropdown(true); }}
            className={`w-full h-12 bg-[#182234] border rounded-lg pl-10 pr-4 text-white focus:border-[#a855f7] outline-none ${selectedVenue ? 'border-green-500/50' : 'border-[#314368]'}`}
            placeholder="Start typing the venue's name"
          />
          <Search className="absolute left-3 top-3.5 text-[#90a4cb] w-5 h-5" />
          {selectedVenue && !showDropdown && <div className="absolute right-3 top-3.5 text-green-400"><MapPin className="w-5 h-5" /></div>}
        </div>
        {errors.venue && <p role="alert" className="text-sm font-medium text-red-300">{errors.venue}</p>}

        {}
        {showDropdown && venueSearch && !selectedVenue && (
          <div className="absolute top-full left-0 w-full mt-2 bg-[#182234] border border-[#314368] rounded-lg shadow-xl overflow-hidden z-50">
            {venuesList.length > 0 ? (
              venuesList.map((venue) => (
                <div key={venue._id} onClick={() => handleSelectVenue(venue)} className="px-4 py-3 hover:bg-[#ff6a00]/10 cursor-pointer border-b border-[#314368]/50 flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-[#90a4cb]" />
                  <div><div className="text-white font-medium">{venue.name}</div><div className="text-xs text-[#90a4cb]">{venue.city}</div></div>
                </div>
              ))
            ) : (
              <div onClick={handleCreateNewClick} className="px-4 py-4 hover:bg-[#ff6a00]/10 cursor-pointer flex items-center gap-3 text-[#ff6a00]">
                <Plus className="w-5 h-5" />
                <div><div className="font-bold">Venue not found?</div><div className="text-sm">Create &quot;{venueSearch}&quot;</div></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* where the tickets are sold (StageVerse doesn't sell them) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="tickets-at-name" className="text-sm font-medium text-[#90a4cb]">Tickets sold on</label>
          <input id="tickets-at-name" type="text" value={formData.ticketsAt.name} placeholder="e.g. BookMyShow"
            onChange={(e) => setFormData({ ...formData, ticketsAt: { ...formData.ticketsAt, name: e.target.value } })}
            className="w-full h-12 bg-[#182234] border border-[#314368] rounded-lg px-4 text-white focus:border-[#a855f7] outline-none" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="tickets-at-url" className="text-sm font-medium text-[#90a4cb]">Link to the tickets (optional)</label>
          <input id="tickets-at-url" type="url" inputMode="url" value={formData.ticketsAt.url} placeholder="https://"
            onChange={(e) => setFormData({ ...formData, ticketsAt: { ...formData.ticketsAt, url: e.target.value } })}
            className="w-full h-12 bg-[#182234] border border-[#314368] rounded-lg px-4 text-white focus:border-[#a855f7] outline-none" />
        </div>
      </div>

      <div className="h-px bg-[#314368]/50 my-2"></div>

      <div className="flex flex-col gap-2">
        <label htmlFor="event-description" className="text-sm font-medium text-[#90a4cb]">Description <span className="text-red-300">*</span></label>
        <textarea
          id="event-description"
          value={formData.description}
          onChange={(e) => {
            setFormData({ ...formData, description: e.target.value });
            if (onPreviewUpdate) onPreviewUpdate(e.target.value);
          }}
          className="w-full h-32 bg-[#182234] border border-[#314368] rounded-lg p-4 text-white focus:border-[#a855f7] outline-none resize-y"
        />
        {errors.description && <p role="alert" className="text-sm font-medium text-red-300">{errors.description}</p>}
      </div>

      <div className="flex gap-4 mt-4">
        <button
          onClick={(e) => handleAiGenerate(e)}
          disabled={isGenerating || isSubmitting}
          className="flex-1 h-12 bg-[#192734] border border-[#2c3b47] rounded-lg font-bold text-white hover:bg-[#233b4a] transition-all flex items-center justify-center gap-2 min-h-11 min-w-11"
         aria-label="More information" title="More information">
          {isGenerating ? 'Writing…' : <><Info className="w-4 h-4" aria-hidden /> Write the description for me</>}
        </button>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isGenerating}
          className={`flex-1 h-12 rounded-lg font-bold text-white hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${editId ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-emerald-500/20' : 'bg-gradient-to-r from-[#ffb000] to-[#ff3d7a] hover:shadow-[#ff6a00]/20'
            }`}
        >
          {isSubmitting ? (editId ? 'Updating...' : 'Publishing...') : (
            <><Rocket className="w-4 h-4" aria-hidden /> {editId ? 'Save changes' : 'Publish event'}</>
          )}
        </button>
      </div>

    </div>
  );
}