'use client';

import React, { useState, useEffect, use } from 'react';
import { Loader2, Table2, Calculator, Save, RefreshCw, Pencil, X } from 'lucide-react';
import StudioNavbar from '@/components/production/StudioNavbar';
import PatchingSidebar from '@/components/production/patcher/PatchingSidebar';
import PatchMainArea from '@/components/production/patcher/PatchMainArea';

import { toast } from 'sonner';

export default function PatchSheetPage(props) {
  const params = use(props.params);
  const showId = params.id;

  const [isLoading, setIsLoading] = useState(true);
  const [activeShow, setActiveShow] = useState(null);
  const [patches, setPatches] = useState([]);
  const [mobileView, setMobileView] = useState('sheet');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [editingFixture, setEditingFixture] = useState(null);

  const fetchPatch = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/production/patch?eventId=${showId}`);

      if (res.status === 401 || res.status === 403) {
        toast.error("Unauthorized Access");
        setIsLoading(false);
        return;
      }

      const data = await res.json();

      if (data.success && data.data) {
        setActiveShow({
          id: showId,
          name: data.data.showName || 'Untitled Show',
          version: data.data.version || '1.0',
        });
        setPatches(data.data.fixtures || []);
        if (!isLoading) toast.success("Data synced from server");
      } else {
        setActiveShow({
          id: showId,
          name: 'New Show Patch',
          version: '1.0',
        });
        setPatches([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load patch data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: syncing with the server is what this effect is for
    fetchPatch();
    const handleFocus = () => {
      if (!isSaving) fetchPatch();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [showId]);

  const handleSavePatch = async () => {
    setIsSaving(true);
    try {
      const payload = {
        eventId: showId,
        fixtures: patches // Send the current state of patches
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
        if (data.data && data.data.fixtures) {
          setPatches(data.data.fixtures);
        } else {
          fetchPatch();
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
    const maxId = patches.length > 0 ? Math.max(...patches.map(p => p.fixtureId || 0)) : 0;
    const processedFixtures = newFixtures.map((f, index) => ({
      ...f,
      fixtureId: maxId + index + 1,
      status: f.status || 'ok',
      cue: f.cue || 'General',
      cueColor: f.cueColor || 'blue'
    }));

    setPatches(prev => [...prev, ...processedFixtures]);
    toast.success(`Added ${newFixtures.length} new fixtures. Don't forget to save!`);
  };
  const handleEditSubmission = (e) => {
    e.preventDefault();
    if (editingFixture) {
      setPatches(prev => prev.map(p =>
        (p.fixtureId === editingFixture.fixtureId) ? editingFixture : p
      ));
      setEditingFixture(null);
      toast.success(`Updated fixture ${editingFixture.fixtureId}`);
    }
  };

  const handleReplaceFixtures = (newFixtures) => {
    console.log("Replacing fixtures via AI:", newFixtures.length);
    const mapped = newFixtures.map((f, i) => ({
      ...f,
      fixtureId: f.fixtureId || (1000 + i),
      id: f.id || (1000 + i),
      status: f.status || 'ok',
      cue: f.cue || 'General',
      cueColor: f.cueColor || 'blue',
      address: parseInt(f.address),
      universe: parseInt(f.universe)
    }));
    setPatches(mapped);
    toast.success("Patch Repatched by AI");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-[#0F0F10] items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#00d4ff]" />
      </div>
    );
  }

  if (!activeShow) {
    return <div className="flex h-screen w-full bg-[#0F0F10] items-center justify-center text-white">Access Denied or Error Loading Patch</div>;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#0F0F10] text-gray-300 font-sans overflow-hidden">

      {}
      <StudioNavbar projectId={showId} />

      {}
      <div className="md:hidden px-4 py-3 bg-[#0F0F10] border-b border-[#2c3e50] shrink-0 z-10">
        <div className="flex bg-[#1a1a1a] p-1 rounded-lg border border-[#2c3e50] shadow-sm">
          <button
            onClick={() => setMobileView('sheet')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${mobileView === 'sheet'
              ? 'bg-[#00d4ff] text-black shadow-md'
              : 'text-gray-500 hover:text-gray-300'
              }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Table2 className="w-3.5 h-3.5" /> Patch Sheet
            </div>
          </button>
          <button
            onClick={() => setMobileView('tools')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${mobileView === 'tools'
              ? 'bg-[#00d4ff] text-black shadow-md'
              : 'text-gray-500 hover:text-gray-300'
              }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Calculator className="w-3.5 h-3.5" /> Tools
            </div>
          </button>
        </div>
      </div>

      {}
      <div className="flex-1 flex overflow-hidden relative w-full">

        {}
        <div className={`
          ${mobileView === 'tools' ? 'flex w-full absolute inset-0 z-20' : 'hidden'} 
          md:flex md:relative md:w-[360px] md:min-w-[360px] md:border-r md:border-[#2c3e50] flex-col bg-[#16202a]
        `}>
          <PatchingSidebar
            showName={activeShow.name}
            onAddFixtures={handleAddFixtures}
            onReplaceFixtures={handleReplaceFixtures}
            fixtures={patches}
          />
        </div>

        {}
        <div className={`
          ${mobileView === 'sheet' ? 'flex w-full' : 'hidden'} 
          md:flex flex-1 flex-col bg-[#0F0F10] relative overflow-hidden
        `}>

          {}
          <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:px-6 md:py-5 border-b border-[#2c3e50] shrink-0 bg-[#0F0F10] z-10">

            {}
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold text-white tracking-tight leading-none">Active Patch Sheet</h1>
              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono text-[#546b81] uppercase tracking-wider">
                <span>Version {activeShow.version}</span>
                <span className="w-1 h-1 rounded-full bg-[#2c3e50]"></span>
                <span className="text-[#00d4ff]">Auto-Saved</span>
                {lastSaved && <span className="ml-2 text-green-500 animate-in fade-in transition-all"> • Saved {lastSaved.toLocaleTimeString()}</span>}
              </div>
            </div>

            {}
            <div className="grid grid-cols-2 md:flex items-center gap-3">
              <button
                onClick={fetchPatch}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#2c3e50] border border-[#2c3e50] rounded-lg text-xs font-bold text-gray-300 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Sync
              </button>

              <button
                onClick={handleSavePatch}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 border border-blue-500 rounded-lg text-xs font-bold text-white transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                SAVE PATCH
              </button>
            </div>
          </div>

          {}
          <div className="flex-1 overflow-hidden">
            {}
            <PatchMainArea patches={patches} onEditFixture={setEditingFixture} />
          </div>

        </div>

      </div>

      {}
      {editingFixture && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16202a] border border-[#2c3e50] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-[#2c3e50] bg-[#111]">
              <h3 className="text-white font-bold flex items-center gap-2"><Pencil className="w-4 h-4 text-blue-500" /> Edit Fixture {editingFixture.fixtureId}</h3>
              <button onClick={() => setEditingFixture(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEditSubmission} className="p-6 space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Universe</label>
                  <input
                    type="number"
                    className="w-full bg-[#0b1219] border border-[#2c3e50] rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                    value={editingFixture.universe}
                    onChange={e => setEditingFixture({ ...editingFixture, universe: parseInt(e.target.value) })}
                    min={1}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Address</label>
                  <input
                    type="number"
                    className="w-full bg-[#0b1219] border border-[#2c3e50] rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                    value={editingFixture.address}
                    onChange={e => setEditingFixture({ ...editingFixture, address: parseInt(e.target.value) })}
                    min={1}
                    max={512}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Role / Cue</label>
                <select
                  value={editingFixture.cue}
                  onChange={e => {
                    const colors = { "Intro Sequence": "blue", "Drum Solo": "red", "Main Wash": "orange", "Audience Blinders": "orange", "Specials": "blue" };
                    setEditingFixture({ ...editingFixture, cue: e.target.value, cueColor: colors[e.target.value] || 'blue' })
                  }}
                  className="w-full bg-[#0b1219] border border-[#2c3e50] rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                >
                  <option value="Intro Sequence">Intro Sequence</option>
                  <option value="Drum Solo">Drum Solo</option>
                  <option value="Main Wash">Main Wash</option>
                  <option value="Audience Blinders">Audience Blinders</option>
                  <option value="Specials">Specials</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg mt-2 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Update Fixture
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}