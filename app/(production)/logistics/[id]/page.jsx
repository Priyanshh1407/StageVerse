'use client';

import React, { useState, useEffect, use } from 'react';
import { MapPin, FileText, Download, Search, Layout, Table, Loader2, Map, Grid, Cable, Clipboard, Box } from 'lucide-react';

import StudioNavbar from '@/components/production/StudioNavbar'; // Ensure correct path to your shared navbar
import LogisticsSidebar from '@/components/production/logistics/LogisticsSidebar';
import KanbanBoard from '@/components/production/logistics/KanbanBoard';

// --- MOCK DATABASE ---
const MOCK_LOGISTICS_DATA = {
    '101': {
        id: '101',
        showName: 'Hamlet World Tour',
        venue: 'Globe Theatre, London',
        phase: 'Technical Rehearsals',
        docs: [
            { icon: Map, color: "text-blue-400", bgColor: "bg-blue-900/20", title: "Light Plot v4.2", time: "2h ago" },
            { icon: Grid, color: "text-green-400", bgColor: "bg-green-900/20", title: "Magic Sheet", time: "1d ago" },
        ],
        crew: [
            { name: "James Hold (ME)", status: "Updating Patch", color: "bg-green-500" },
            { name: "Sarah Jenkins (ALD)", status: "Focusing LX2", color: "bg-green-500" },
            { name: "Mike Ross (Rigging)", status: "Break", color: "bg-amber-500" }
        ],
        kanban: [
            {
                id: 'preprod', title: 'Pre-Production', dotColor: 'bg-slate-400', count: 2,
                cards: [
                    { id: 1, tag: 'Admin', tagColor: 'bg-purple-500/10 text-purple-400 border border-purple-500/20', title: 'Finalize Truck Pack Diagram', date: 'Oct 24' },
                    { id: 2, tag: 'Electric', tagColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', title: 'Print & Laminate Magic Sheets', date: 'Tomorrow' },
                ]
            },
            {
                id: 'loadin', title: 'Load-In', dotColor: 'bg-amber-400', count: 1,
                cards: [
                    { id: 3, tag: 'Rigging', tagColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', title: 'Hang Main Truss (LX 1-4)', date: '08:00 AM', urgent: true },
                ]
            },
            { id: 'focus', title: 'Focus', dotColor: 'bg-blue-500', count: 0, cards: [] },
            { id: 'loadout', title: 'Load-Out', dotColor: 'bg-red-400', count: 0, cards: [], isGhost: true }
        ]
    },
    '102': {
        id: '102',
        showName: 'Coachella Main Stage',
        venue: 'Empire Polo Club, CA',
        phase: 'Load-Out',
        docs: [
            { icon: Clipboard, color: "text-amber-400", bgColor: "bg-amber-900/20", title: "Manifest", time: "10m ago" },
            { icon: Box, color: "text-red-400", bgColor: "bg-red-900/20", title: "Truck Plan", time: "1h ago" },
        ],
        crew: [
            { name: "Tom (Lead)", status: "Directing Trucks", color: "bg-green-500" },
            { name: "Lisa (lx)", status: "Coiling Feeder", color: "bg-green-500" }
        ],
        kanban: [
            { id: 'preprod', title: 'Pre-Production', dotColor: 'bg-slate-400', count: 0, cards: [] },
            { id: 'show', title: 'Show', dotColor: 'bg-blue-500', count: 0, cards: [] },
            {
                id: 'loadout', title: 'Load-Out (Active)', dotColor: 'bg-red-400', count: 3,
                cards: [
                    { id: 10, tag: 'Trucks', tagColor: 'bg-red-500/10 text-red-400 border border-red-500/20', title: 'Load Truck 1 (Audio)', date: 'Now', urgent: true },
                    { id: 11, tag: 'Rigging', tagColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', title: 'Drop Motors', date: 'Next' },
                    { id: 12, tag: 'Lighting', tagColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', title: 'Strike FOH Towers', date: 'Pending' },
                ]
            }
        ]
    }
};

export default function LogisticsPage(props) {
    const params = use(props.params);
    const showId = params.id;
    const [isLoading, setIsLoading] = useState(true);
    const [showData, setShowData] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            const data = MOCK_LOGISTICS_DATA[showId] || MOCK_LOGISTICS_DATA['101'];
            setShowData(data);
            setIsLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, [showId]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full bg-[#0F0F10] items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!showData) return null;

    return (
        // FIX: Main Background #0F0F10
        <div className="flex flex-col h-screen w-full bg-[#0F0F10] font-sans text-slate-300 overflow-hidden">

            {/* Scrollbar Styles Updated to match Dark Theme */}
            <style jsx global>{`
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: #0F0F10; }
                ::-webkit-scrollbar-thumb { background: #27272A; border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
                * { scrollbar-width: thin; scrollbar-color: #27272A #0F0F10; }
            `}</style>

            <StudioNavbar />

            <div className="flex flex-1 overflow-hidden relative">
                
                {/* CENTER CONTENT */}
                <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0F0F10] relative">
                    
                    {/* Header Section */}
                    {/* FIX: Borders #27272A, BG #0F0F10 */}
                    <div className="flex flex-col gap-0 border-b border-[#27272A] bg-[#0F0F10] z-10 shadow-sm">
                        <div className="px-6 py-5 flex flex-wrap justify-between items-end gap-4">
                            <div className="flex min-w-72 flex-col gap-2">
                                <div className="flex items-center gap-2 text-blue-500 text-sm font-bold uppercase tracking-wider">
                                    <MapPin className="w-4 h-4" />
                                    {showData.venue}
                                </div>
                                <h1 className="text-white text-4xl font-bold leading-tight tracking-tight">Logistics: {showData.showName}</h1>
                                <p className="text-gray-500 text-base font-normal leading-normal">Production Phase: <span className="text-white font-medium">{showData.phase}</span></p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#27272A] hover:bg-[#3F3F46] text-white gap-2 text-xs font-bold uppercase leading-normal tracking-wide transition-all border border-[#3F3F46]">
                                    <FileText className="w-4 h-4" />
                                    <span>Report</span>
                                </button>
                                <button className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-blue-600 hover:bg-blue-500 text-white gap-2 text-xs font-bold uppercase leading-normal tracking-wide shadow-lg shadow-blue-500/20 transition-all">
                                    <Download className="w-4 h-4" />
                                    <span>Export</span>
                                </button>
                            </div>
                        </div>

                        {/* Toolbar */}
                        <div className="px-6 pb-4 pt-2 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                            <div className="flex flex-1 w-full max-w-xl items-center gap-4">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                        <Search className="w-4 h-4" />
                                    </div>
                                    {/* FIX: Input Background #18181B */}
                                    <input className="block w-full rounded-lg border-none bg-[#18181B] py-2.5 pl-10 pr-3 text-sm placeholder:text-gray-600 focus:ring-1 focus:ring-blue-500 text-white" placeholder="Search tasks..." type="text" />
                                </div>
                                <div className="flex bg-[#18181B] rounded-lg p-1 border border-[#27272A] hidden md:flex">
                                    <button className="p-1.5 rounded bg-[#27272A] text-white border border-[#3F3F46]"><Layout className="w-4 h-4" /></button>
                                    <button className="p-1.5 rounded text-gray-500 hover:text-white"><Table className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-2 xl:pb-0 scrollbar-hide w-full xl:w-auto">
                                <FilterButton label="All Tasks" active />
                                <FilterButton label="My Tasks" />
                                <FilterButton label="Urgent" color="text-red-400" />
                            </div>
                        </div>
                    </div>

                    <KanbanBoard columns={showData.kanban} />

                </main>

                <LogisticsSidebar crew={showData.crew} docs={showData.docs} />

            </div>
        </div>
    );
}

function FilterButton({ label, active, color }) {
    return (
        <button className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg border px-3 transition-colors ${active 
            ? 'bg-[#18181B] border-blue-500/50 text-blue-400' 
            : 'bg-[#18181B] border-[#27272A] hover:border-[#3F3F46] ' + (color || 'text-gray-400')
            }`}>
            <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </button>
    )
}