'use client';

import { useState, useEffect } from 'react';
import ArtistNavbar from '@/components/artist/ArtistNavbar';
import RiderHeader from '@/components/artist/tech-rider/RiderHeader';
import GearCard from '@/components/artist/tech-rider/GearCard';
import PlacementForm from '@/components/artist/tech-rider/PlacementForm';
import CrewMessenger from '@/components/artist/tech-rider/CrewMessenger';
import RiderManifest from '@/components/artist/tech-rider/RiderManifest';
import AddFixtureModal from '@/components/artist/tech-rider/AddFixtureModal';
import { Grid, Scan, Zap, Waves, Sun, Columns, Lightbulb, Loader2, PlusCircle, Speaker, Radio } from 'lucide-react';

// Mapped icons helper for dynamic rendering
const ICON_MAP = {
  'Scan': Scan,
  'Zap': Zap,
  'Waves': Waves,
  'Sun': Sun,
  'Columns': Columns,
  'Lightbulb': Lightbulb,
  'Speaker': Speaker,
  'Radio': Radio
};

export default function TechRiderPage() {
  const [gear, setGear] = useState([]);
  const [hazer, setHazer] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. SIMULATE API FETCH
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/artist/rider');
        const json = await res.json();

        if (json.success && json.data && json.data.gear) {
          const processedData = json.data.gear.map(item => ({
            ...item,
            icon: ICON_MAP[item.iconKey] || Lightbulb // Restore icon component
          }));
          setGear(processedData);
          if (json.data.notes) {
            // Future: Set notes if we add a notes field to UI
          }
        } else {
          // Default if no rider exists yet
          setGear([]);
        }
      } catch (e) {
        console.error("Failed to load rider", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // 2. HANDLERS
  const handleIncrement = (id) => {
    setGear(prev => prev.map(item =>
      item.id === id ? { ...item, count: item.count + 1 } : item
    ));
  };

  const handleDecrement = (id) => {
    setGear(prev => prev.map(item =>
      item.id === id ? { ...item, count: Math.max(0, item.count - 1) } : item
    ));
  };

  const handleAddNewFixture = (newItemData) => {
    const newId = Math.max(...gear.map(g => g.id)) + 1;
    const newItem = {
      id: newId,
      name: newItemData.name,
      type: newItemData.type,
      icon: ICON_MAP[newItemData.iconType] || Lightbulb,
      count: 1, // Start with 1 selected
    };
    setGear(prev => [...prev, newItem]);
  };

  const handleSaveAndSend = async () => {
    setIsSaving(true);
    // Simulate API call
    // Construct Payload
    const payload = {
      gear: gear.filter(g => g.count > 0).map(g => ({
        id: g.id,
        name: g.name,
        type: g.type,
        count: g.count,
        iconKey: Object.keys(ICON_MAP).find(key => ICON_MAP[key] === g.icon) || 'Lightbulb' // serialized
      })),
      notes: `Hazer Required: ${hazer}`
    };

    try {
      const res = await fetch('/api/artist/rider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Rider Saved & Synced to Cloud!");
      } else {
        alert("Failed to save.");
      }
    } catch (e) {
      alert("Error saving rider.");
    }

    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#101b23] text-white font-sans flex flex-col overflow-x-hidden">

      <ArtistNavbar />

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-10 lg:px-20 py-8">
        <div className="flex flex-col max-w-[1200px] mx-auto w-full flex-1">

          <RiderHeader onSave={handleSaveAndSend} isSaving={isSaving} />

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 border border-dashed border-[#223949] rounded-xl bg-[#1a2632]/50">
              <Loader2 className="w-10 h-10 text-[#0d93f2] animate-spin mb-4" />
              <p className="text-white/50">Loading current gear config...</p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8 relative">

              {/* LEFT COLUMN */}
              <div className="flex flex-col flex-1 gap-8 min-w-0">

                <section>
                  <div className="flex justify-between items-end mb-4 px-1">
                    <h2 className="text-white text-xl font-bold leading-tight flex items-center gap-2">
                      <Grid className="text-[#0d93f2] w-6 h-6" />
                      Gear Grid Component
                    </h2>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="text-xs text-[#0d93f2] font-bold uppercase tracking-wider hover:text-white transition-colors flex items-center gap-1"
                    >
                      <PlusCircle className="w-4 h-4" /> Add Custom Fixture
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {gear.map((item) => (
                      <GearCard
                        key={item.id}
                        item={item}
                        onIncrement={handleIncrement}
                        onDecrement={handleDecrement}
                      />
                    ))}

                    {/* "Add New" Ghost Card */}
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="border border-dashed border-[#223949] rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-[#0d93f2]/50 hover:bg-[#0d93f2]/5 transition-all group min-h-[140px]"
                    >
                      <div className="p-3 rounded-full bg-[#1a2632] group-hover:bg-[#0d93f2] transition-colors text-white/50 group-hover:text-white">
                        <PlusCircle className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-bold text-white/50 group-hover:text-white">Add New Fixture</span>
                    </button>
                  </div>
                </section>

                <PlacementForm hazer={hazer} setHazer={setHazer} />

                <CrewMessenger />

              </div>

              {/* RIGHT COLUMN */}
              <RiderManifest gear={gear} hazer={hazer} />

            </div>
          )}
        </div>
      </main>

      {/* MODAL */}
      <AddFixtureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddNewFixture}
      />

    </div>
  );
}