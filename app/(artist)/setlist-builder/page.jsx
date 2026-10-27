'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles, Loader2 } from 'lucide-react';
import ArtistNavbar from '@/components/artist/ArtistNavbar';
import BuilderHeader from '@/components/artist/setlist/BuilderHeader';
import SongBank from '@/components/artist/setlist/SongBank';
import SetlistCanvas from '@/components/artist/setlist/SetlistCanvas';
import EncorePollConfig from '@/components/artist/setlist/EncorePollConfig';
import GuestlistPanel from '@/components/artist/setlist/GuestlistPanel';
import LeaderboardModal from '@/components/artist/setlist/LeaderboardModal';
import { toast } from 'sonner';
const INITIAL_BANK = [
  { id: 1, title: "Mr. Brightside", duration: "03:42", bpm: "148 BPM", tag: "High Energy", tagColor: "orange" },
  { id: 2, title: "Someone Like You", duration: "04:45", bpm: "67 BPM", tag: "Sad/Chill", tagColor: "indigo" },
  { id: 3, title: "Uptown Funk", duration: "04:30", bpm: "115 BPM", tag: "Funky", tagColor: "purple" },
  { id: 4, title: "Fix You", duration: "04:55", bpm: "76 BPM", tag: "Emotional", tagColor: "blue" },
  { id: 5, title: "Don't Stop Believin'", duration: "04:11", bpm: "119 BPM", tag: "Anthem", tagColor: "teal" },
  { id: 6, title: "Blinding Lights", duration: "03:20", bpm: "171 BPM", tag: "Synth Pop", tagColor: "pink" },
  { id: 7, title: "Bohemian Rhapsody", duration: "05:55", bpm: "72 BPM", tag: "Classic", tagColor: "red" },
  { id: 8, title: "HUMBLE.", duration: "02:57", bpm: "150 BPM", tag: "Hype", tagColor: "orange" },
  { id: 9, title: "Dreams", duration: "04:17", bpm: "120 BPM", tag: "Chill", tagColor: "green" },
  { id: 10, title: "Seven Nation Army", duration: "03:51", bpm: "123 BPM", tag: "Rock", tagColor: "red" },
  { id: 11, title: "Dancing Queen", duration: "03:50", bpm: "100 BPM", tag: "Disco", tagColor: "pink" },
  { id: 12, title: "Lose Yourself", duration: "05:26", bpm: "171 BPM", tag: "Intense", tagColor: "gray" },
];

const INITIAL_SETLIST = [];

function SetlistBuilderContent() {
  const searchParams = useSearchParams();
  const urlEventId = searchParams.get('eventId');
  const [selectedEventId, setSelectedEventId] = useState(urlEventId);
  // Follow ?eventId= when the URL changes (adjusted during render, not in an effect)
  const [prevUrlEventId, setPrevUrlEventId] = useState(urlEventId);
  if (urlEventId !== prevUrlEventId) {
    setPrevUrlEventId(urlEventId);
    if (urlEventId) setSelectedEventId(urlEventId);
  }

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [bankSongs, setBankSongs] = useState(INITIAL_BANK);
  const [setlistItems, setSetlistItems] = useState([]);
  const [loadingSetlist, setLoadingSetlist] = useState(false);
  const [viewMode, setViewMode] = useState('builder');
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [winners, setWinners] = useState([]);
  const [calculatingResults, setCalculatingResults] = useState(false);
  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/artist/events');
        const json = await res.json();
        if (json.success) {
          setEvents(json.events);
        }
      } catch (e) {
        console.error("Failed to fetch events", e);
      } finally {
        setLoadingEvents(false);
      }
    }
    fetchEvents();
  }, []);
  useEffect(() => {
    if (!selectedEventId) return;

    async function loadSetlist() {
      try {
        setLoadingSetlist(true);
        const res = await fetch(`/api/artist/setlist?eventId=${selectedEventId}`);
        const json = await res.json();
        if (json.success && json.data) {
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
  const addToSetlist = (song) => {
    const newItem = {
      id: Date.now(),
      title: song.title,
      duration: song.duration,
      tags: [{ label: song.tag, color: song.tagColor }]
    };
    
    setSetlistItems([...setlistItems, newItem]);
  };

  const createNewSong = (newSongData) => {
    const newSong = {
      id: Date.now(),
      ...newSongData,
      tagColor: 'blue' // Default color for custom songs
    };
    
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
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("Suggest 3 unique, high-energy hit songs that would fit a modern setlist.");
  const handleAiSuggestClick = () => {
    setIsAiModalOpen(true);
  };
  const executeAiGeneration = async () => {
    if (!aiPrompt) return;
    setIsAiLoading(true);
    setIsAiModalOpen(false); // Close modal during generation to show loading state in button or toast? 

    try {
      const fullPrompt = `${aiPrompt} 
      IMPORTANT: Return a JSON array ONLY. Format: [{"title": "Song Name", "duration": "03:30", "bpm": "120 BPM", "tag": "High Energy", "tagColor": "orange"}].`;

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      let text = data.result;
      if (text.startsWith("```json")) text = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      else if (text.startsWith("```")) text = text.replace(/^```\s*/, "").replace(/\s*```$/, "");

      const suggestions = JSON.parse(text);

      if (Array.isArray(suggestions)) {
        const newSongs = suggestions.map(s => ({
          id: Date.now() + Math.random(),
          title: s.title,
          duration: s.duration,
          bpm: s.bpm,
          tag: s.tag,
          tagColor: s.tagColor || 'purple'
        }));
        setBankSongs(prev => [...newSongs, ...prev]);
        toast.success("AI added 3 songs to your bank!");
      }

    } catch (e) {
      console.error(e);
      toast.error("AI Failed to suggest songs.");
    } finally {
      setIsAiLoading(false);
    }
  };
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
  if (loadingEvents) {
    return <div className="flex h-screen items-center justify-center text-[#90b2cb]">Loading Your Events...</div>;
  }
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
                  {}
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
  const activeEvent = events.find(e => e._id === selectedEventId);

  return (
    <main className="flex-1 flex flex-col items-center py-8 px-4 md:px-8 lg:px-12 xl:px-20 w-full overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-[1600px] flex flex-col gap-6">

        {}
        <BuilderHeader
          event={activeEvent}
          allEvents={events} // We need to update BuilderHeader to accept this and show dropdown
          onSwitchEvent={setSelectedEventId}
          onSave={handleSave}
          onDeclareResults={handleDeclareResults}
        />

        {}
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

            {}
            <div className="lg:col-span-4 flex flex-col gap-4 h-[calc(100vh-220px)] lg:sticky lg:top-24">
              <button
                onClick={handleAiSuggestClick}
                disabled={isAiLoading}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-lg transition-all disabled:opacity-50"
              >
                {isAiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {isAiLoading ? "Dreaming..." : "Suggest Songs with AI"}
              </button>

              <SongBank
                songs={bankSongs}
                onAddSong={addToSetlist}
                onCreateSong={createNewSong}
              />
            </div>

            {}
            <div className="lg:col-span-8 flex flex-col gap-6">

              {loadingSetlist ? (
                <div className="h-64 flex items-center justify-center text-[#90b2cb] bg-[#101b23] rounded-xl border border-[#315168]">
                  Loading Setlist...
                </div>
              ) : (
                <>
                  {}
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

      {}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsAiModalOpen(false)}>
          <div className="bg-[#1e2e38] border border-[#315168] rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Customize AI Vibe
              </h3>
              <button onClick={() => setIsAiModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-sm text-slate-400 mb-3">Describe the vibe you want (e.g., &quot;Sad acoustic ballads&quot; or &quot;High energy 80s rock&quot;).</p>

            <textarea
              className="w-full bg-[#101b23] border border-[#315168] rounded-xl p-4 text-white text-sm focus:outline-none focus:border-purple-500 min-h-[100px] mb-6"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Enter your prompt here..."
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeAiGeneration}
                className="px-6 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20"
              >
                Generate Magic
              </button>
            </div>
          </div>
        </div>
      )}

      {}
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