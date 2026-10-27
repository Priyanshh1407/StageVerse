'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import ArtistNavbar from '@/components/artist/ArtistNavbar';
import ShowHeader from '@/components/artist/daysheet/ShowHeader';
import Timeline from '@/components/artist/daysheet/Timeline';
import VenueIntel from '@/components/artist/daysheet/VenueIntel';

import { useParams } from 'next/navigation';

export default function DaySheetDetailPage() {
    const params = useParams();
    const id = params?.id;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        async function loadData() {
            try {
                const res = await fetch(`/api/artist/day-sheet/${id}`, { cache: 'no-store' });
                const json = await res.json();
                if (json.success) {
                    setData(json.data);
                }
            } catch (e) {
                console.error("Failed to load day sheet", e);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id]);
    const handleUpdateSchedule = async (newSchedule, notify = false) => {
        try {
            await fetch(`/api/artist/day-sheet/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schedule: newSchedule,
                    notifyTeam: notify
                })
            });
        } catch (e) {
            console.error("Failed to save schedule", e);
        }
    };

    const handleUpdateIntel = async (newIntel) => {
        try {
            await fetch(`/api/artist/day-sheet/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ venueIntel: newIntel })
            });
        } catch (e) {
            console.error("Failed to save intel", e);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f5f7f8] dark:bg-[#101b22] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#0d93f2]" />
            </div>
        );
    }

    if (!data) return (
        <div className="min-h-screen bg-[#f5f7f8] dark:bg-[#101b22] flex items-center justify-center text-slate-500">
            <p>Event not found.</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f5f7f8] dark:bg-[#101b22] font-sans text-slate-900 dark:text-white transition-colors duration-200 flex flex-col">
            <ArtistNavbar />
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-10 py-6 lg:py-10">
                <ShowHeader
                    city={data.event.city}
                    venue={data.event.venue}
                    date={data.event.date}
                />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
                    <Timeline
                        initialSchedule={data.schedule}
                        onUpdate={handleUpdateSchedule}
                    />
                    <VenueIntel
                        intel={data.venueIntel}
                        onUpdate={handleUpdateIntel}
                    />
                </div>
            </main>
        </div>
    );
}
