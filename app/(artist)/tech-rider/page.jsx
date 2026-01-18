'use client';

import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const [hazer, setHazer] = useState(false);
  const [plotData, setPlotData] = useState({}); // New Plot State
  const [selectedLD, setSelectedLD] = useState(null); // New: Assigned LD
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Event Selection State
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);

  // 1. FETCH EVENTS
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch('/api/artist/day-sheet', { cache: 'no-store' });
        const json = await res.json();
        if (json.success) {
          setEvents(json.data);
          // Default to first event if none selected
          if (json.data.length > 0 && !selectedEventId) {
            setSelectedEventId(json.data[0]._id);
          }
        }
      } catch (e) {
        console.error("Failed to load events", e);
      }
    }
    loadEvents();
  }, []);

  // 2. LOAD RIDER DATA (When Event Changes)
  useEffect(() => {
    if (!selectedEventId) return;

    async function loadRiderData() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/artist/rider?eventId=${selectedEventId}`, { cache: 'no-store' });
        const json = await res.json();

        if (json.success && json.data) {
          // Gear
          if (json.data.gear) {
            const processedData = json.data.gear.map(item => ({
              ...item,
              icon: ICON_MAP[item.iconKey] || Lightbulb
            }));
            setGear(processedData);
          } else {
            setGear([]);
          }
          // Plot Data
          setHazer(json.data.hazer || false);
          setPlotData({
            stageLocation: json.data.stageLocation,
            mountingPreference: json.data.mountingPreference,
            placementNotes: json.data.placementNotes
          });

          // Pre-fill Assigned LD if exists
          if (json.assignedTo) {
            setSelectedLD(json.assignedTo);
          } else {
            setSelectedLD(null);
          }
        } else {
          // Reset defaults if no rider found for this event
          setGear([]);
          setHazer(false);
          setPlotData({});
          setSelectedLD(null);
        }
      } catch (e) {
        console.error("Rider load error", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadRiderData();
  }, [selectedEventId]);

  // 3. HANDLERS
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
    // Generate numeric ID. If gear empty, start at 1.
    const newId = gear.length > 0 ? Math.max(...gear.map(g => g.id || 0)) + 1 : 1;
    const newItem = {
      id: newId,
      name: newItemData.name,
      type: newItemData.type,
      icon: ICON_MAP[newItemData.iconType] || Lightbulb,
      count: 1,
    };
    setGear(prev => [...prev, newItem]);
  };

  const handleSaveAndSend = async () => {
    if (!selectedEventId) return alert("Please select an event first.");
    setIsSaving(true);

    const payload = {
      eventId: selectedEventId,
      gear: gear.filter(g => g.count > 0).map(g => ({
        id: g.id,
        name: g.name,
        type: g.type,
        count: g.count,
        iconKey: Object.keys(ICON_MAP).find(key => ICON_MAP[key] === g.icon) || 'Lightbulb'
      })),
      stageLocation: plotData.stageLocation,
      mountingPreference: plotData.mountingPreference,
      placementNotes: plotData.placementNotes,
      hazer: hazer,
      // Pass Assignment Info
      assigneeId: selectedLD ? selectedLD._id : null,
      assigneeName: selectedLD ? selectedLD.name : null
    };

    try {
      const res = await fetch('/api/artist/rider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Rider Saved & Assigned to Event!");
      } else {
        alert("Failed to save.");
      }
    } catch (e) {
      alert("Error saving rider.");
    }

    setIsSaving(false);
  };

  // 4. PDF GENERATION
  const handleDownloadPDF = () => {
    if (!selectedEventId) return;
    const event = events.find(e => e._id === selectedEventId);
    if (!event) return;

    const doc = new jsPDF();

    // Title
    doc.setFontSize(22);
    doc.text(`${event.title} - Tech Rider`, 14, 20);

    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`${event.city} • ${new Date(event.date).toLocaleDateString()}`, 14, 28);
    doc.text(`Venue: ${event.venue || 'TBA'}`, 14, 34);

    // Section 1: Gear List
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("1. Fixture Manifest", 14, 45);

    const gearRows = gear.filter(g => g.count > 0).map(g => [g.name, g.type || 'Standard', g.count]);

    autoTable(doc, {
      startY: 50,
      head: [['Fixture Name', 'Type', 'Count']],
      body: gearRows,
      theme: 'striped',
      headStyles: { fillColor: [13, 147, 242] } // Brand Blue
    });

    // Section 2: Stage Plot (Below Table)
    const finalY = doc.lastAutoTable.finalY + 15;

    doc.setFontSize(14);
    doc.text("2. Stage Plot & Requirements", 14, finalY);

    doc.setFontSize(11);
    doc.text(`Stage Location: ${plotData.stageLocation || 'Not Specified'}`, 14, finalY + 10);
    doc.text(`Mounting Preference: ${plotData.mountingPreference || 'Not Specified'}`, 14, finalY + 18);
    doc.text(`Hazer Requested: ${hazer ? 'Yes' : 'No'}`, 14, finalY + 26);

    if (plotData.placementNotes) {
      doc.text("Additional Notes:", 14, finalY + 36);
      doc.setFontSize(10);
      doc.setTextColor(80);
      const splitNotes = doc.splitTextToSize(plotData.placementNotes, 180);
      doc.text(splitNotes, 14, finalY + 42);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Generated via StageVerse Digital Rider", 14, 285);

    doc.save(`TechRider-${event.title.replace(/\s+/g, '-')}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#101b23] text-white font-sans flex flex-col overflow-x-hidden">

      <ArtistNavbar />

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-10 lg:px-20 py-8">
        <div className="flex flex-col max-w-[1200px] mx-auto w-full flex-1">

          <RiderHeader
            onSave={handleSaveAndSend}
            isSaving={isSaving}
            events={events}
            selectedEventId={selectedEventId}
            onEventChange={setSelectedEventId}
            selectedLD={selectedLD}
            onLDSelect={setSelectedLD}
          />

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

                <PlacementForm
                  hazer={hazer}
                  setHazer={setHazer}
                  plotData={plotData}
                  setPlotData={setPlotData}
                />

                <CrewMessenger />

              </div>


              {/* RIGHT COLUMN */}
              <RiderManifest
                gear={gear}
                hazer={hazer}
                onDownloadPDF={handleDownloadPDF} // Pass Handler Here
              />

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