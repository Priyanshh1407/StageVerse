'use client';

import { useState, useEffect } from 'react';
import ArtistNavbar from '@/components/artist/ArtistNavbar';
import BuilderHeader from '@/components/artist/setlist/BuilderHeader';
import SongBank from '@/components/artist/setlist/SongBank';
import SetlistCanvas from '@/components/artist/setlist/SetlistCanvas';
import EncorePollConfig from '@/components/artist/setlist/EncorePollConfig';

// Initial Mock Data
const INITIAL_BANK = [
  { id: 1, title: "Midnight City", duration: "04:03", bpm: "128 BPM", tag: "High Energy", tagColor: "orange" },
  { id: 2, title: "Slow Burn", duration: "03:45", bpm: "85 BPM", tag: "Sad/Chill", tagColor: "indigo" },
  { id: 3, title: "Acoustic Dreams", duration: "02:50", bpm: "Key: G", tag: "Acoustic", tagColor: "amber" },
  { id: 4, title: "Electric Feel", duration: "03:30", bpm: "105 BPM", tag: "Indie Pop", tagColor: "teal" },
  { id: 5, title: "Crowd Pleaser (Cover)", duration: "04:15", bpm: "Key: Am", tag: "Anthem", tagColor: "purple" },
];

const INITIAL_SETLIST = [
  { id: 101, title: "Intro Sequence", duration: "02:45", tags: [{ label: "Dark/Blue", color: "indigo" }] },
  { id: 102, title: "Neon Nights", duration: "03:30", tags: [{ label: "High Energy", color: "red" }] },
];

export default function SetlistBuilderPage() {
  const [bankSongs, setBankSongs] = useState(INITIAL_BANK);
  const [setlistItems, setSetlistItems] = useState([]);

  useEffect(() => {
    async function loadSetlist() {
      try {
        const res = await fetch('/api/artist/setlist?eventId=13');
        const json = await res.json();
        if (json.success && json.data) {
          // Restore items
          setSetlistItems(json.data.items.map(item => ({
            ...item,
            id: item._id || Date.now(), // Fallback ID
            // Ensure tags are present (schema vs UI mismatch potentially)
          })));
        } else {
          setSetlistItems(INITIAL_SETLIST); // Default if new
        }
      } catch (e) {
        console.error("Failed to load setlist");
      }
    }
    loadSetlist();
  }, []);

  // 1. Add to Setlist Handler
  const addToSetlist = (song) => {
    const newItem = {
      id: Date.now(),
      title: song.title,
      duration: song.duration,
      tags: [{ label: song.tag, color: song.tagColor }]
    };
    setSetlistItems([...setlistItems, newItem]);
  };

  // 2. Create New Song in Bank Handler
  const createNewSong = (newSongData) => {
    const newSong = {
      id: Date.now(),
      ...newSongData,
      tagColor: 'blue' // Default color for custom songs
    };
    setBankSongs([newSong, ...bankSongs]); // Add to top of list
  };

  const handleSave = async () => {
    try {
      const payload = {
        eventId: '13',
        items: setlistItems.map(item => ({
          title: item.title,
          duration: item.duration,
          bpm: item.bpm || "",
          status: item.status || 'pending',
          // Map UI tags to Backend Schema if needed, mostly pass through if schema matches
          tags: item.tags || []
        }))
      };

      const res = await fetch('/api/artist/setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("Setlist Saved Successfully!");
      } else {
        alert("Failed to save setlist.");
      }
    } catch (e) {
      alert("Error saving setlist");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] dark:bg-[#101b22] text-slate-900 dark:text-white font-sans flex flex-col overflow-hidden">
      <ArtistNavbar />

      <main className="flex-1 flex flex-col items-center py-8 px-4 md:px-8 lg:px-12 xl:px-20 w-full overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-[1600px] flex flex-col gap-6">
          <BuilderHeader onSave={handleSave} />

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

              {/* The Drag & Drop Canvas */}
              <SetlistCanvas items={setlistItems} setItems={setSetlistItems} />

              {/* 2. Add The New Poll Component Here */}
              <EncorePollConfig />

            </div>

          </div>
        </div>
      </main>
    </div>
  );
}