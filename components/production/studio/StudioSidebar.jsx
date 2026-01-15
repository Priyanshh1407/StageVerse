'use client';

import React, { useState, useEffect } from 'react';
import { PlusCircle, Wand2, Info, ChevronDown, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StudioSidebar({ onAddFixtures }) {
   const [profiles, setProfiles] = useState([]);
   const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);

   // Selection Inputs
   const [selectedProfileId, setSelectedProfileId] = useState("");
   const [quantity, setQuantity] = useState(8);
   const [role, setRole] = useState("Intro Sequence");
   const [logic, setLogic] = useState("");

   // Modal State
   const [showModal, setShowModal] = useState(false);
   const [newManufacturer, setNewManufacturer] = useState("");
   const [newModel, setNewModel] = useState("");
   const [newModeName, setNewModeName] = useState("Standard");
   const [newChannels, setNewChannels] = useState(16);
   const [isCreating, setIsCreating] = useState(false);

   // Fetch Profiles on Mount
   useEffect(() => {
      fetchProfiles();
   }, []);

   const fetchProfiles = async () => {
      try {
         const res = await fetch('/api/production/fixture-profiles');
         const data = await res.json();
         if (data.success) {
            setProfiles(data.data);
            if (data.data.length > 0) {
               setSelectedProfileId(data.data[0]._id);
            }
         }
      } catch (error) {
         console.error("Failed to load profiles", error);
         toast.error("Failed to load fixture profiles");
      } finally {
         setIsLoadingProfiles(false);
      }
   };

   const handleCreateProfile = async (e) => {
      e.preventDefault();
      setIsCreating(true);
      try {
         const res = await fetch('/api/production/fixture-profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               manufacturer: newManufacturer,
               model: newModel,
               type: "Moving Head", // Default
               modes: [{ name: newModeName, channels: parseInt(newChannels) }]
            })
         });

         const data = await res.json();
         if (data.success) {
            toast.success("Profile created!");
            await fetchProfiles(); // Reload
            setSelectedProfileId(data.data._id); // Select new
            setShowModal(false);
            // Reset
            setNewManufacturer("");
            setNewModel("");
            setNewChannels(16);
         } else {
            toast.error(data.error || "Failed to create profile");
         }
      } catch (error) {
         console.error(error);
         toast.error("System error creating profile");
      } finally {
         setIsCreating(false);
      }
   };

   const handleSubmit = () => {
      if (!onAddFixtures) return;

      if (!selectedProfileId) {
         toast.error("Please select a fixture profile");
         return;
      }

      const profile = profiles.find(p => p._id === selectedProfileId);
      if (!profile) return;

      // Use first mode defaults
      const modeData = profile.modes[0] || { name: 'Standard', channels: 16 };
      const channels = modeData.channels;

      // Visual Cue Color Logic
      let cueColor = "blue";
      if (role.includes("Drum")) cueColor = "red";
      if (role.includes("Wash")) cueColor = "orange";
      if (role.includes("Blinder")) cueColor = "orange"; // Added logic

      const newFixtures = Array.from({ length: parseInt(quantity) || 1 }).map(() => ({
         profile: `${profile.manufacturer} ${profile.model}`,
         mode: `${modeData.name} (${channels}ch)`,
         channels,
         cue: role,
         cueColor: cueColor,
         status: 'ok'
      }));

      onAddFixtures(newFixtures);
   };

   return (
      <div className="w-full md:w-[320px] bg-[#0F0F10] border-r border-[#27272A] flex flex-col overflow-y-auto shrink-0">
         <div className="p-5 flex flex-col gap-6 h-full">

            <div className="flex items-center gap-2 pb-2 border-b border-[#27272A]">
               <PlusCircle className="text-blue-500 w-5 h-5" />
               <h2 className="text-white font-bold text-lg tracking-tight">Add New Group</h2>
            </div>

            <div className="flex flex-col gap-5">
               {/* Inputs Row */}
               <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                     <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Fixture Profile</label>
                        <button
                           onClick={() => setShowModal(true)}
                           className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold uppercase tracking-wider"
                        >
                           <PlusCircle className="w-3 h-3" /> New
                        </button>
                     </div>
                     <div className="relative">
                        <select
                           value={selectedProfileId}
                           onChange={(e) => setSelectedProfileId(e.target.value)}
                           disabled={isLoadingProfiles}
                           className="w-full bg-[#18181B] border border-[#2c3e50] text-white text-sm rounded-lg focus:ring-1 focus:ring-blue-500 block p-2.5 appearance-none cursor-pointer hover:border-[#3F3F46] transition-colors disabled:opacity-50"
                        >
                           {isLoadingProfiles ? <option>Loading...</option> : (
                              profiles.length > 0 ? (
                                 profiles.map(p => (
                                    <option key={p._id} value={p._id}>
                                       {p.manufacturer} {p.model} ({p.modes[0]?.channels}ch)
                                    </option>
                                 ))
                              ) : (
                                 <option value="">No profiles found</option>
                              )
                           )}
                        </select>
                        <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                     </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                     <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Quantity</label>
                     <input
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="bg-[#18181B] border border-[#27272A] text-white text-sm rounded-lg focus:ring-1 focus:ring-blue-500 block w-full p-2.5 outline-none hover:border-[#3F3F46] transition-colors"
                        type="number"
                        min="1"
                        max="512"
                     />
                  </div>
               </div>

               <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Creative Role / Cue</label>
                  <div className="relative">
                     <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full bg-[#18181B] border border-[#27272A] text-white text-sm rounded-lg focus:ring-1 focus:ring-blue-500 block p-2.5 appearance-none cursor-pointer hover:border-[#3F3F46] transition-colors"
                     >
                        <option value="Intro Sequence">Intro Sequence</option>
                        <option value="Drum Solo">Drum Solo</option>
                        <option value="Main Wash">Main Wash</option>
                        <option value="Audience Blinders">Audience Blinders</option>
                        <option value="Specials">Specials</option>
                     </select>
                     <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
               </div>

               <div className="flex flex-col gap-1.5 flex-1 min-h-[160px]">
                  <div className="flex justify-between items-center">
                     <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Logic</label>
                     <span className="text-[10px] text-blue-500 flex items-center gap-1 bg-blue-500/10 px-1.5 rounded border border-blue-500/20">
                        <Wand2 className="w-3 h-3" /> AI Assist
                     </span>
                  </div>
                  <textarea
                     value={logic}
                     onChange={(e) => setLogic(e.target.value)}
                     className="flex-1 bg-[#18181B] border border-[#27272A] text-gray-300 text-sm rounded-lg focus:ring-1 focus:ring-blue-500 block w-full p-3 resize-none placeholder:text-gray-600 font-mono leading-relaxed outline-none hover:border-[#3F3F46] transition-colors"
                     placeholder="Patch these sequentially starting from Universe 2..."
                  ></textarea>
               </div>

               <button
                  onClick={handleSubmit}
                  className="bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)] w-full text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
               >
                  <PlusCircle className="w-5 h-5" />
                  Add To Patch
               </button>
            </div>

            <div className="mt-auto pt-6 border-t border-[#27272A]">
               <div className="flex items-center gap-3 text-xs text-gray-500">
                  <Info className="w-4 h-4" />
                  <span>Standard Library v24.1</span>
               </div>
            </div>
         </div>

         {/* CREATE PROFILE MODAL */}
         {showModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-[#16202a] border border-[#2c3e50] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between p-4 border-b border-[#2c3e50] bg-[#111]">
                     <h3 className="text-white font-bold">Create New Fixture</h3>
                     <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={handleCreateProfile} className="p-6 space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Manufacturer</label>
                        <input
                           className="w-full bg-[#0b1219] border border-[#2c3e50] rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                           placeholder="e.g. Clay Paky"
                           value={newManufacturer}
                           onChange={e => setNewManufacturer(e.target.value)}
                           required
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Model Name</label>
                        <input
                           className="w-full bg-[#0b1219] border border-[#2c3e50] rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                           placeholder="e.g. Sharpy"
                           value={newModel}
                           onChange={e => setNewModel(e.target.value)}
                           required
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-gray-400 mb-1">Mode Name</label>
                           <input
                              className="w-full bg-[#0b1219] border border-[#2c3e50] rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                              value={newModeName}
                              onChange={e => setNewModeName(e.target.value)}
                              required
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-400 mb-1">Channels</label>
                           <input
                              type="number"
                              className="w-full bg-[#0b1219] border border-[#2c3e50] rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                              value={newChannels}
                              onChange={e => setNewChannels(e.target.value)}
                              min={1}
                              required
                           />
                        </div>
                     </div>

                     <button
                        type="submit"
                        disabled={isCreating}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg mt-2 flex items-center justify-center gap-2"
                     >
                        {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                        Create Profile
                     </button>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
}
