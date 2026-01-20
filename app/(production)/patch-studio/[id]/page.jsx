'use client';

import React, { useState, useEffect, use } from 'react';
import { Search, FolderOpen, Save, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// 1. Import the shared Navbar Component
import StudioNavbar from '@/components/production/StudioNavbar';

import StudioSidebar from '@/components/production/studio/StudioSidebar';
import CreativeRigView from '@/components/production/studio/views/CreativeRigView';
import TechnicalRigView from '@/components/production/studio/views/TechnicalRigView';

const INITIAL_FIXTURES = [
   // Fallback if needed, but we prefer fetching.
   { id: 101, fixtureId: 101, profile: "Martin MAC Aura XB", universe: 2, address: 1, channels: 25, mode: "Standard (25ch)", cue: "Intro Sequence", cueColor: "blue", status: "ok" },
];

export default function PatchStudioPage(props) {
   const params = use(props.params);
   const showId = params.id;

   // STATE
   const [viewMode, setViewMode] = useState('creative'); // 'creative' or 'technical'
   const [fixtures, setFixtures] = useState([]);
   const [isLoading, setIsLoading] = useState(true);
   const [isSaving, setIsSaving] = useState(false);
   const [searchQuery, setSearchQuery] = useState("");
   const [lastSaved, setLastSaved] = useState(null);

   // Load Patch Data
   useEffect(() => {
      if (!showId) return;
      loadPatch();
   }, [showId]);

   const loadPatch = async () => {
      try {
         setIsLoading(true);
         const res = await fetch(`/api/production/patch?eventId=${showId}`);
         if (res.ok) {
            const data = await res.json();
            if (data.success && data.data && data.data.fixtures) {
               setFixtures(data.data.fixtures);
               toast.success("Data synced");
            } else {
               if (data.data && data.data.fixtures && data.data.fixtures.length === 0) {
                  setFixtures(INITIAL_FIXTURES);
               }
            }
         } else {
            if (res.status === 401 || res.status === 403) toast.error("Unauthorized: Access Denied");
         }
      } catch (e) {
         console.error(e);
         toast.error("Failed to load patch");
      } finally {
         setIsLoading(false);
      }
   };

   const handleSavePatch = async () => {
      setIsSaving(true);
      try {
         const payload = {
            eventId: showId,
            fixtures: fixtures.map(f => ({
               fixtureId: f.fixtureId,
               profile: f.profile,
               mode: f.mode,
               channels: f.channels,
               universe: f.universe,
               address: f.address,
               status: f.status,
               cue: f.cue,
               cueColor: f.cueColor
            }))
         };

         const res = await fetch('/api/production/patch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
         });

         const data = await res.json();

         if (res.ok) {
            toast.success('Patch saved successfully');
            setLastSaved(new Date());

            // IMMEDIATE SYNC: Update local state with what the server has stored
            if (data.data && data.data.fixtures) {
               setFixtures(data.data.fixtures);
            } else {
               // Fallback refetch if response is partial
               loadPatch();
            }

         } else {
            toast.error(data.error || 'Failed to save patch');
         }
      } catch (error) {
         console.error(error);
         toast.error('System error saving patch');
      } finally {
         setIsSaving(false);
      }
   };

   const handleAddFixtures = (newFixtures) => {
      // 1. Find the highest used address in Universe 1 (Simple Auto-Patch)
      let currentUniverse = 1;
      let nextAddress = 1;

      // Filter fixtures in Universe 1 and find the max address range
      const fixturesInUniv1 = fixtures.filter(f => parseInt(f.universe) === 1);
      if (fixturesInUniv1.length > 0) {
         fixturesInUniv1.forEach(f => {
            const endAddr = parseInt(f.address) + (parseInt(f.channels) || 0);
            if (endAddr > nextAddress) {
               nextAddress = endAddr;
            }
         });
      }

      // Find max ID for unique IDs
      const maxId = fixtures.length > 0 ? Math.max(...fixtures.map(f => f.fixtureId || 0)) : 100;

      const prepareToAdd = newFixtures.map((f, i) => {
         // 1. If AI/Manual provided specific address, use it.
         if (f.address && f.universe) {
            return {
               ...f,
               fixtureId: maxId + i + 1,
               id: maxId + i + 1,
               status: 'ok',
               // Ensure these are numbers
               address: parseInt(f.address),
               universe: parseInt(f.universe)
            };
         }

         // 2. Otherwise Auto-Patch logic
         const startAddr = nextAddress;

         // Increment for next fixture in loop
         const channelCount = parseInt(f.channels) || 0;
         nextAddress += channelCount;

         return {
            ...f,
            fixtureId: maxId + i + 1,
            id: maxId + i + 1,
            status: 'ok',
            universe: currentUniverse,
            address: startAddr
         };
      });

      setFixtures(prev => [...prev, ...prepareToAdd]);
      toast.success(`Added ${newFixtures.length} fixtures starting at Address ${prepareToAdd[0].address}`);
   };

   const handleReplaceFixtures = (newFixtures) => {
      // Find max ID for safety if needed, but if replaced, maybe reset IDs?
      // Actually if AI returns replacements, we should trust it, or map them to ensure IDs exist.
      const mapped = newFixtures.map((f, i) => ({
         ...f,
         fixtureId: f.fixtureId || (1000 + i), // ensuring IDs
         id: f.id || (1000 + i),
         status: 'ok',
         address: parseInt(f.address),
         universe: parseInt(f.universe)
      }));
      setFixtures(mapped);
      toast.success("Patch Repatched by AI");
   };

   // --- CONTEXT ACTIONS ---
   const handleDeleteFixture = (fixtureId) => {
      setFixtures(prev => prev.filter(f => (f.fixtureId || f.id) !== fixtureId));
      toast.success("Fixture deleted (unsaved)");
   };

   // UPDATED DELETE LOGIC TO BE GRANULAR
   const handleDeleteGroup = (cueName, profileName = null) => {
      let count = 0;

      if (profileName) {
         // Granular Deletion: Delete only fixtures with this Cue AND this Profile
         count = fixtures.filter(f => {
            const fCue = f.cue || 'Unassigned';
            const fProfile = f.profile || 'Unknown Fixture';
            return fCue === cueName && fProfile === profileName;
         }).length;

         setFixtures(prev => prev.filter(f => {
            const fCue = f.cue || 'Unassigned';
            const fProfile = f.profile || 'Unknown Fixture';
            return !(fCue === cueName && fProfile === profileName);
         }));

         toast.success(`Deleted batch of ${count} '${profileName}' fixtures`);

      } else {
         // Full Group Deletion (Legacy fallback)
         count = fixtures.filter(f => {
            const fCue = f.cue || 'Unassigned';
            return fCue === cueName;
         }).length;

         setFixtures(prev => prev.filter(f => {
            const fCue = f.cue || 'Unassigned';
            return fCue !== cueName;
         }));

         toast.success(`Deleted entire group '${cueName}' (${count} fixtures)`);
      }
   };

   const handleEditFixture = (updatedFixture) => {
      setFixtures(prev => prev.map(f => {
         // robust ID check using string comparison
         const fId = String(f.fixtureId || f.id);
         const uId = String(updatedFixture.fixtureId || updatedFixture.id);
         return fId === uId ? { ...f, ...updatedFixture } : f;
      }));
      toast.success("Fixture updated (unsaved)");
   };

   // Filter fixtures based on search
   const filteredFixtures = fixtures.filter(f => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
         f.profile?.toLowerCase().includes(q) ||
         String(f.fixtureId || f.id).includes(q) ||
         f.cue?.toLowerCase().includes(q)
      );
   });

   return (
      <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0F0F10] text-slate-300 selection:bg-blue-500 selection:text-white font-sans">

         {/* 1. GLOBAL NAVBAR */}
         <StudioNavbar projectId={showId} />

         {/* 2. SUB HEADER */}
         <header className="flex items-center justify-between border-b border-[#27272A] bg-[#0F0F10] px-6 py-2.5 shrink-0 z-20">
            <div className="flex items-center gap-2 text-sm">
               <FolderOpen className="w-5 h-5 text-gray-600" />
               <span className="text-gray-500">Project Alpha</span>
               <span className="text-[#27272A]">/</span>
               <span className="text-white font-medium">Patch Studio</span>
               {lastSaved && <span className="text-green-500 text-[10px] ml-2 animate-in fade-in slide-in-from-left-2 transition-all">Saved {lastSaved.toLocaleTimeString()}</span>}
            </div>

            <div className="flex items-center gap-4">
               {/* Search */}
               <div className="hidden md:flex items-center bg-[#18181B] border border-[#27272A] rounded-lg h-9 w-72 px-3 focus-within:border-blue-500/50 transition-all">
                  <Search className="w-4 h-4 text-gray-500 mr-2" />
                  <input
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="bg-transparent border-none text-white text-xs w-full focus:outline-none placeholder:text-gray-600"
                     placeholder="Search fixtures (ID, Type, Role)..."
                  />
                  <span className="text-[10px] text-gray-600 border border-[#27272A] px-1 rounded">⌘K</span>
               </div>

               {/* Manual Sync Button (Bonus) */}
               <button
                  onClick={loadPatch}
                  disabled={isLoading}
                  title="Sync Data"
                  className="text-gray-500 hover:text-white transition-colors"
               >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
               </button>

               {/* Global Save Button */}
               <button
                  onClick={handleSavePatch}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
               >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
               </button>
            </div>
         </header>

         {/* 3. MAIN WORKSPACE */}
         <div className="flex-1 flex overflow-hidden">

            {/* LEFT SIDEBAR (Controls) */}
            {/* LEFT SIDEBAR (Controls) */}
            <StudioSidebar onAddFixtures={handleAddFixtures} onReplaceFixtures={handleReplaceFixtures} fixtures={fixtures} />

            {/* RIGHT CONTENT AREA */}
            <div className="flex-1 bg-[#0F0F10] flex flex-col h-full overflow-hidden relative">
               {/* Background Grid Pattern */}
               <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

               {/* VIEW TOGGLE HEADER */}
               <div className="flex flex-col md:flex-row items-center justify-between p-6 pb-4 gap-4 z-10 border-b border-[#27272A] bg-[#0F0F10]/95 backdrop-blur-sm sticky top-0">
                  <div className="flex flex-col">
                     <h2 className="text-white text-xl font-bold tracking-tight">Show Rig: <span className="text-blue-500 font-normal">Neon Nights Tour</span></h2>
                     <p className="text-xs text-gray-500 mt-1">
                        {viewMode === 'creative'
                           ? `Creative Mode • ${new Set(filteredFixtures.map(f => f.cue)).size} Groups Defined`
                           : `Technical Mode • ${filteredFixtures.length} Fixtures Patched`}
                     </p>
                  </div>

                  {/* THE TOGGLE SWITCH */}
                  <div className="bg-[#18181B] p-1 rounded-lg border border-[#27272A] flex h-9 items-center">
                     <button
                        onClick={() => setViewMode('creative')}
                        className={`px-3 h-full rounded-md text-xs font-bold transition-all ${viewMode === 'creative' ? 'bg-[#27272A] text-white shadow-sm border border-[#3F3F46]' : 'text-gray-500 hover:text-white'}`}
                     >
                        Creative View
                     </button>
                     <button
                        onClick={() => setViewMode('technical')}
                        className={`px-3 h-full rounded-md text-xs font-bold transition-all ${viewMode === 'technical' ? 'bg-[#27272A] text-white shadow-sm border border-[#3F3F46]' : 'text-gray-500 hover:text-white'}`}
                     >
                        Technical View
                     </button>
                  </div>
               </div>

               {/* DYNAMIC VIEW RENDER */}
               <div className="flex-1 overflow-auto z-0 relative">
                  {isLoading && <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center"><Loader2 className="animate-spin text-white w-8 h-8" /></div>}

                  {viewMode === 'creative'
                     ? <CreativeRigView fixtures={filteredFixtures} onDeleteGroup={handleDeleteGroup} />
                     : <TechnicalRigView fixtures={filteredFixtures} onDeleteFixture={handleDeleteFixture} onEditFixture={handleEditFixture} />
                  }
               </div>

            </div>
         </div>
      </div>
   );
}
