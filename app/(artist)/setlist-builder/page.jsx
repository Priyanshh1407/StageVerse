'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ArtistNavbar from '@/components/artist/ArtistNavbar';
import BuilderHeader from '@/components/artist/setlist/BuilderHeader';
import SongBank from '@/components/artist/setlist/SongBank';
import SetlistCanvas from '@/components/artist/setlist/SetlistCanvas';
import EncorePollConfig from '@/components/artist/setlist/EncorePollConfig';
import GuestlistPanel from '@/components/artist/setlist/GuestlistPanel';
import LeaderboardModal from '@/components/artist/setlist/LeaderboardModal';
import { toast } from 'sonner';

// Initial Mock Data
const INITIAL_BANK = [
  { id: 1, title: "Midnight City", duration: "04:03", bpm: "128 BPM", tag: "High Energy", tagColor: "orange" },
  { id: 2, title: "Slow Burn", duration: "03:45", bpm: "85 BPM", tag: "Sad/Chill", tagColor: "indigo" },
  { id: 3, title: "Acoustic Dreams", duration: "02:50", bpm: "Key: G", tag: "Acoustic", tagColor: "amber" },
  { id: 4, title: "Electric Feel", duration: "03:30", bpm: "105 BPM", tag: "Indie Pop", tagColor: "teal" },
  { id: 5, title: "Crowd Pleaser (Cover)", duration: "04:15", bpm: "Key: Am", tag: "Anthem", tagColor: "purple" },
];

const INITIAL_SETLIST = [];

function SetlistBuilderContent() {
  const searchParams = useSearchParams();
  // We'll manage eventId mainly via URL, but if missing, we default to the first upcoming event?
  // Or just allow user to pick.
  // Actually, we can just use state if we want to change it without reloading, 
  // OR push to router. using router.push is better for deep linking.
  // For now, let's allow it to be driven by prop or state if we want smooth transitioning.

  // But to sync with URL, let's keep it simple: URL is source of truth.
  // "No Event Selected" means literally no param?
  const urlEventId = searchParams.get('eventId');
  const [selectedEventId, setSelectedEventId] = useState(urlEventId);

  // Sync state if URL changes externally
  useEffect(() => {
    if (urlEventId) setSelectedEventId(urlEventId);
  }, [urlEventId]);

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [bankSongs, setBankSongs] = useState(INITIAL_BANK);
  const [setlistItems, setSetlistItems] = useState([]);
  const [loadingSetlist, setLoadingSetlist] = useState(false);

  // View Mode: 'builder' | 'guestlist'
  const [viewMode, setViewMode] = useState('builder');

  // Leaderboard State
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [winners, setWinners] = useState([]);
  const [calculatingResults, setCalculatingResults] = useState(false);

  // 1. Fetch Events on Mount
  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/artist/events');
        const json = await res.json();
        if (json.success) {
          setEvents(json.events);
          // Optional: Auto-select first event if none selected?
          // if (!selectedEventId && json.events.length > 0) {
          //    setSelectedEventId(json.events[0]._id);
          // }
        }
      } catch (e) {
        console.error("Failed to fetch events", e);
      } finally {
        setLoadingEvents(false);
      }
    }
    fetchEvents();
  }, []);

  // 2. Fetch Setlist when selectedEventId changes
  useEffect(() => {
    if (!selectedEventId) return;

    async function loadSetlist() {
      try {
        setLoadingSetlist(true);
        const res = await fetch(`/api/artist/setlist?eventId=${selectedEventId}`);
        const json = await res.json();
        if (json.success && json.data) {
          // Restore items
          setSetlistItems(json.data.items.map(item => ({
            ...item,
            id: item._id || Date.now(), // Fallback ID
          })));
        } else {
          setSetlistItems(INITIAL_SETLIST); // Default if new
        }
      } catch (e) {
        console.error("Failed to load setlist", e);
      } finally {
        setLoadingSetlist(false);
      }
    }
    loadSetlist();
  }, [selectedEventId]);

  // 3. Handlers
  const addToSetlist = (song) => {
    const newItem = {
      id: Date.now(),
      title: song.title,
      duration: song.duration,
      tags: [{ label: song.tag, color: song.tagColor }]
    };
    /* @ts-ignore */
    setSetlistItems([...setlistItems, newItem]);
  };

  const createNewSong = (newSongData) => {
    const newSong = {
      id: Date.now(),
      ...newSongData,
      tagColor: 'blue' // Default color for custom songs
    };
    /* @ts-ignore */
    setBankSongs([newSong, ...bankSongs]); // Add to top of list
  };

  const handleSave = async () => {
    if (!selectedEventId) {
      toast.error("Event ID not found.");
      return;
    }

    try {
      const payload = {
        eventId: selectedEventId,
        items: setlistItems.map(item => ({
          title: item.title,
          duration: item.duration,
          bpm: item.bpm || "",
          status: item.status || 'pending',
          /* @ts-ignore */
          tags: item.tags || []
        }))
      };

      const res = await fetch('/api/artist/setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Setlist Saved Successfully!");
      } else {
        toast.error("Failed to save setlist.");
      }
    } catch (e) {
      toast.error("Error saving setlist");
    }
  };

  const handleDeclareResults = async () => {
    if (!selectedEventId) return;
    if (!confirm("Are you sure you want to declare results? This will calculate scores for all fan predictions.")) return;

    setIsLeaderboardOpen(true);
    setCalculatingResults(true);

    try {
      const res = await fetch('/api/artist/declare-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: selectedEventId })
      });

      const json = await res.json();
      if (json.success) {
        setWinners(json.winners || []);
        toast.success("Results Declared & Graded!");
      } else {
        toast.error(json.error || "Failed to declare results");
        setIsLeaderboardOpen(false);
      }
    } catch (e) {
      console.error(e);
      toast.error("Error declaring results");
      setIsLeaderboardOpen(false);
    } finally {
      setCalculatingResults(false);
    }
  };

  // Guestlist Logic
  const [guestlistUser, setGuestlistUser] = useState(null);
  const [isGuestlistLoading, setIsGuestlistLoading] = useState(false);

  const confirmAddToGuestlist = (user) => {
    setGuestlistUser(user);
  };

  const executeAddToGuestlist = async () => {
    if (!guestlistUser || !selectedEventId) return;

    try {
      setIsGuestlistLoading(true);
      const res = await fetch('/api/artist/guestlist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: guestlistUser._id,
          eventId: selectedEventId
        })
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`🎉 ${guestlistUser.name} added to guestlist!`);
        setGuestlistUser(null); // Close confirmation
      } else {
        toast.error(json.error || "Failed to add to guestlist");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error adding to guestlist");
    } finally {
      setIsGuestlistLoading(false);
    }
  };

  // --- RENDER ---

  // If loading events initially
  if (loadingEvents) {
    return <div className="flex h-screen items-center justify-center text-[#90b2cb]">Loading Your Events...</div>;
  }

  // If no event selected, show SELECTION UI
  if (!selectedEventId) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-[#90b2cb] p-6">
        <h2 className="text-3xl font-bold text-white mb-6">Select an Event</h2>

        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
            {events.map(evt => (
              <button
                key={evt._id}
                onClick={() => setSelectedEventId(evt._id)}
                className="flex flex-col text-left bg-[#101b23] border border-[#315168] hover:border-[#0d93f2] hover:bg-[#182934] rounded-xl overflow-hidden transition-all group shadow-lg"
              >
                <div className="h-32 bg-slate-800 relative w-full">
                  {/* Use img for simplicity or Image if configured */}
                  <img src={evt.image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745"} alt={evt.artist} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-mono text-white">
                    {new Date(evt.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-white group-hover:text-[#0d93f2] transition-colors">{evt.venue?.name || evt.city}</h3>
                  <p className="text-sm text-[#90b2cb]">{evt.city}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center bg-[#101b23] p-8 rounded-xl border border-[#315168]">
            <p>No upcoming events found.</p>
            <p className="text-sm mt-2">Create an event in the dashboard first.</p>
          </div>
        )}
      </div>
    );
  }

  // Find current event object for the header
  const activeEvent = events.find(e => e._id === selectedEventId);

  return (
    <main className="flex-1 flex flex-col items-center py-8 px-4 md:px-8 lg:px-12 xl:px-20 w-full overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-[1600px] flex flex-col gap-6">

        {/* Pass activeEvent and events list to BuilderHeader for potential dropdown switch */}
        <BuilderHeader
          event={activeEvent}
          allEvents={events} // We need to update BuilderHeader to accept this and show dropdown
          onSwitchEvent={setSelectedEventId}
          onSave={handleSave}
          onDeclareResults={handleDeclareResults}
        />

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-[#315168]/50 mb-2">
          <button
            onClick={() => setViewMode('builder')}
            className={`relative px-6 py-3 font-bold text-sm transition-all ${viewMode === 'builder' ? 'text-white' : 'text-[#90b2cb] hover:text-white'}`}
          >
            Setlist Builder
            {viewMode === 'builder' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0d93f2] shadow-[0_0_10px_#0d93f2] rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setViewMode('guestlist')}
            className={`relative px-6 py-3 font-bold text-sm transition-all ${viewMode === 'guestlist' ? 'text-white' : 'text-[#90b2cb] hover:text-white'}`}
          >
            Guestlist Manager
            {viewMode === 'guestlist' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0d93f2] shadow-[0_0_10px_#0d93f2] rounded-t-full" />
            )}
          </button>
        </div>

        {viewMode === 'builder' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start h-full pb-12">

            {/* Left Column: Song Bank */}
            <div className="lg:col-span-4 flex flex-col gap-4 h-[calc(100vh-220px)] lg:sticky lg:top-24">
              <SongBank
                songs={bankSongs}
                onAddSong={addToSetlist}
                onCreateSong={createNewSong}
              />
            </div>

            {/* Right Column: Setlist Canvas & Poll Config */}
            <div className="lg:col-span-8 flex flex-col gap-6">

              {loadingSetlist ? (
                <div className="h-64 flex items-center justify-center text-[#90b2cb] bg-[#101b23] rounded-xl border border-[#315168]">
                  Loading Setlist...
                </div>
              ) : (
                <>
                  {/* The Drag & Drop Canvas */}
                  <SetlistCanvas items={setlistItems} setItems={setSetlistItems} />
                  <EncorePollConfig eventId={selectedEventId} />
                </>
              )}

            </div>
          </div>
        ) : (
          <div className="h-[calc(100vh-200px)]">
            <GuestlistPanel eventId={selectedEventId} />
          </div>
        )}
      </div>

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        winners={winners}
        loading={calculatingResults}
        onAddToGuestlist={confirmAddToGuestlist}
        guestlistUser={guestlistUser}
        onConfirmGuestlist={executeAddToGuestlist}
        guestlistLoading={isGuestlistLoading}
        onCancelGuestlist={() => setGuestlistUser(null)}
      />
    </main>
  );
}

export default function SetlistBuilderPage() {
  return (
    <div className="min-h-screen bg-[#f5f7f8] dark:bg-[#101b22] text-slate-900 dark:text-white font-sans flex flex-col overflow-hidden">
      <ArtistNavbar />
      <Suspense fallback={<div className="text-white text-center p-10">Loading...</div>}>
        <SetlistBuilderContent />
      </Suspense>
    </div>
  );
}