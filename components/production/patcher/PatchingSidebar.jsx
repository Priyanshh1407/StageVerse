'use client';

import React, { useState, useEffect } from 'react';
import { Settings2, ChevronDown, Wand2, Minus, Plus, PlusCircle, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PatchingSidebar({ showName, onAddFixtures, onReplaceFixtures, fixtures = [] }) {
  const [profiles, setProfiles] = useState([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [quantity, setQuantity] = useState(8);
  const [universe, setUniverse] = useState(1);
  const [address, setAddress] = useState(1);
  const [logic, setLogic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const handleAiPatch = async () => {
    if (!logic.trim()) {
      toast.error("Please enter a prompt (e.g. 'Patch 8 beams')");
      return;
    }

    setIsGenerating(true);
    try {
      const currentPatch = fixtures.map(f => ({
        u: f.universe,
        a: f.address,
        c: f.channels,
        type: f.profile, // Preserve Name
        mode: f.mode
      }));

      const res = await fetch('/api/patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: logic, currentPatch })
      });
      const json = await res.json();

      if (json.error) {
        toast.error("AI Error: " + json.error);
      } else if (json.patch && Array.isArray(json.patch)) {
        const newFixtures = json.patch.map(item => ({
          profile: item.type || 'Generic',
          mode: 'Standard',
          channels: 16,
          quantity: 1,
          patch: 'Auto',
          address: item.address,
          universe: item.universe,
          cue: 'Ready',
          cueColor: 'blue',
          status: 'ok'
        }));

        if (json.action === 'replace' && onReplaceFixtures) {
          onReplaceFixtures(newFixtures);
        } else if (onAddFixtures) {
          onAddFixtures(newFixtures);
        }

        toast.success(json.action === 'replace' ? "Patch Repatched!" : `AI patched ${newFixtures.length} fixtures!`);
        setLogic(''); // Clear prompt
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate patch");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCalculate = () => {
    if (logic && logic.trim().length > 0) {
      handleAiPatch();
      return;
    }

    if (!onAddFixtures) return;
    if (!selectedProfileId) {
      toast.error("Please select a fixture profile");
      return;
    }
    const profile = profiles.find(p => p._id === selectedProfileId);
    if (!profile) return;
    const modeData = profile.modes[0] || { name: 'Standard', channels: 16 };
    const channels = modeData.channels;
    const newFixtures = [];
    let currentAddress = parseInt(address);
    let currentUniverse = parseInt(universe);
    for (let i = 0; i < quantity; i++) {
      if (currentAddress + channels > 512) {
        currentUniverse++;
        currentAddress = 1;
      }
      newFixtures.push({
        fixtureId: Date.now() + i,
        profile: `${profile.manufacturer} ${profile.model}`,
        mode: `${modeData.name} (${channels}ch)`,
        channels: channels,
        universe: currentUniverse,
        address: currentAddress,
        cue: "New Group",
        cueColor: "blue",
        status: "ok"
      });
      currentAddress += channels;
    }
    onAddFixtures(newFixtures);
    setAddress(currentAddress);
    setUniverse(currentUniverse);
  };
  const [showModal, setShowModal] = useState(false);
  const [newManufacturer, setNewManufacturer] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newModeName, setNewModeName] = useState("Standard");
  const [newChannels, setNewChannels] = useState(16);
  const [isCreating, setIsCreating] = useState(false);
  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
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
          type: "Moving Head", // Default for now
          modes: [{ name: newModeName, channels: parseInt(newChannels) }]
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Profile created!");
        await fetchProfiles(); // Reload list
        setSelectedProfileId(data.data._id); // Select new profile
        setShowModal(false);
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

  return (
    <aside className="w-full h-full flex flex-col relative z-20 shadow-2xl bg-[#16202a]">

      {}
      <div className="flex-none p-6 border-b border-[#2c3e50] bg-[#16202a]">
        <h1 className="text-white font-bold text-xl tracking-tight leading-none">Intelligent Patch Studio</h1>
        <div className="flex items-center gap-2 mt-2">
          <span className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse"></span>
          <p className="text-xs text-[#90b2cb] font-mono uppercase tracking-wide truncate">
            {showName || 'Active Show'}
          </p>
        </div>
      </div>

      {}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 min-h-0">
        <div>
          <h2 className="text-white font-bold text-xs uppercase tracking-[0.2em] text-[#90b2cb] border-b border-[#2c3e50] pb-3 mb-6 flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> Patching Controls
          </h2>

          <div className="space-y-5 mb-6">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-bold text-[#90b2cb] uppercase tracking-wide">Fixture Profile</label>
                <button
                  onClick={() => setShowModal(true)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold uppercase tracking-wider"
                >
                  <PlusCircle className="w-3 h-3" /> New Profile
                </button>
              </div>

              <div className="relative group">
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  disabled={isLoadingProfiles}
                  className="w-full bg-[#0b1219] border border-[#2c3e50] text-white rounded-lg pl-4 pr-10 py-3 appearance-none focus:outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] text-sm font-medium transition-all hover:border-[#4a6f8a] cursor-pointer disabled:opacity-50"
                >
                  {isLoadingProfiles ? <option>Loading...</option> : (
                    profiles.length > 0 ? (
                      profiles.map(p => (
                        <option key={p._id} value={p._id}>
                          {p.manufacturer} {p.model} ({p.modes[0]?.channels}ch)
                        </option>
                      ))
                    ) : (
                      <option value="">No profiles found. Create one!</option>
                    )
                  )}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#90b2cb] w-4 h-4 pointer-events-none group-hover:text-white transition-colors" />
              </div>
            </div>

            <NumberControl label="Quantity" value={quantity} onChange={setQuantity} />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <NumberControl label="Start Universe" value={universe} onChange={setUniverse} />
            <NumberControl label="Start Address" value={address} onChange={setAddress} max={512} />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#00d4ff] mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <Wand2 className="w-4 h-4" /> AI Logic / Constraints
            </label>
            <div className="relative">
              <textarea
                value={logic}
                onChange={(e) => setLogic(e.target.value)}
                className="w-full h-40 bg-[#0b1219] border border-[#2c3e50] rounded-lg p-4 text-sm text-gray-300 focus:outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] placeholder:text-gray-600 resize-none font-mono leading-relaxed shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                placeholder="Patch these fixtures sequentially, but skip channels 50-60 due to a bad dimmer."
              ></textarea>
              <div className="absolute bottom-3 right-3 text-[10px] text-gray-600 font-mono">AI-ENABLED</div>
            </div>
          </div>
        </div>
      </div>

      {}
      <div className="flex-none p-6 border-t border-[#2c3e50] bg-[#16202a] z-10 relative">
        <button
          onClick={handleCalculate}
          disabled={isGenerating}
          className="w-full py-4 bg-gradient-to-r from-[#1e40af] to-[#1d4ed8] hover:from-[#2563eb] hover:to-[#3b82f6] text-white font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 text-sm transform active:scale-[0.98] border border-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5 fill-none" />}
          {isGenerating ? 'Thinking...' : 'Calculate & Append'}
        </button>
      </div>

      {}
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

    </aside>
  );
}

function NumberControl({ label, value, onChange, max }) {
  const handleDec = () => onChange(Math.max(1, value - 1));
  const handleInc = () => {
    if (max && value >= max) return;
    onChange(value + 1);
  };

  return (
    <div>
      <label className="block text-[10px] font-bold text-[#90b2cb] mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="flex items-center w-full bg-[#0b1219] border border-[#2c3e50] rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-[#00d4ff] focus-within:border-[#00d4ff] hover:border-[#4a6f8a] transition-all h-11">
        <button
          type="button"
          onClick={handleDec}
          className="h-full px-3 text-[#90b2cb] bg-[#16202a] hover:text-white hover:bg-[#1f2d3a] active:bg-[#2c3e50] transition-colors border-r border-[#2c3e50] flex items-center justify-center"
        >
          <Minus className="w-4 h-4" />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="flex-1 bg-transparent text-white text-left pl-3 text-sm font-mono focus:outline-none appearance-none h-full [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={handleInc}
          className="h-full px-3 text-[#90b2cb] bg-[#16202a] hover:text-white hover:bg-[#1f2d3a] active:bg-[#2c3e50] transition-colors border-l border-[#2c3e50] flex items-center justify-center"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}