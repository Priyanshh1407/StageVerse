'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Film, MapPin, Settings2, MoreVertical, Package, Plus, Archive, PlayCircle, Loader2 } from 'lucide-react';
import CreateShowModal from './CreateShowModal';

export default function ActiveShowsGrid({ initialActiveShows }) {
    const [view, setView] = useState('active'); // 'active' or 'archived'
    const [shows, setShows] = useState(initialActiveShows); // The list currently displayed
    const [isLoading, setIsLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const handleSaveNewShow = (newShowData) => {
        setShows([newShowData, ...shows]);
        setIsCreateModalOpen(false);
    };

    // LOGIC: Fetch data when the 'view' changes
    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);

            // SIMULATING SERVER FETCH
            // In real life: await fetch(`/api/shows?status=${view}`)

            setTimeout(() => {
                if (view === 'active') {
                    // Reset to the initial active shows passed from the parent
                    setShows(initialActiveShows);
                } else {
                    // Load Mock Archived Data
                    setShows([
                        {
                            id: '901', title: 'Old 2023 Tour', venue: 'Wembley', date: 'Jan 2023',
                            type: 'Archived', typeColor: 'bg-gray-600', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnVj5hRL8AOfL32wFRk1t6vNfXjCJGtYEdyHYBibnuH2byrvZsXsL1qovr4Is69A7PA7tIOYblHGsCqwynXXVJzbew0GlvIPmmvwId9pB0aUd4C7ZqsJBXgE5l1YCnOH7Xwx9UJ_TGCjgg1YyovrOkWh7oruXuzYUPltvT5dl45lFB25khObV__7ZuXqhGhuTWgopTGWHAsw8tWiAn00JaNlLYauRfrbfiZ0geMjsPWRkJGBVsw8dxrgxc55wDKaGmmtVDghJ_X7Tg', status: 'archived'
                        },
                        {
                            id: '902', title: 'Corporate Gig 2022', venue: 'Hilton', date: 'Dec 2022',
                            type: 'Archived', typeColor: 'bg-gray-600', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDGVyKiqTzz6dYasHoxqAR8XdR3qhWhpmQIgMwWhxTKTxr8bz62u6Cuq6zDLbVXXDd57OznD-lLWlAld2R-XFLSrfyNP4xm-vzK1KWT9Yv6zToHn-wh6RXNqoilPSDIHcgEpd9f60Sxjo56EdQb7CF5hczRm5WCBNHdWc0dpnNSM06rV-Z9wEOg4J5F2R-Qq1rEIMukmHK9YOyUfHMG6eRv9_n_vUNwyT_gDyAIA94RWMF2E3dxkuo3BG0fKPpthcM4i9pm3K17dIix', status: 'archived'
                        }
                    ]);
                }
                setIsLoading(false);
            }, 600); // 600ms fake delay
        }

        fetchData();
    }, [view, initialActiveShows]);

    return (
        <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {view === 'active' ? <Film className="w-5 h-5 text-blue-500" /> : <Archive className="w-5 h-5 text-gray-500" />}
                    {view === 'active' ? 'Active Shows' : 'Show Archive'}
                </h2>

                {/* TAB SWITCHER */}
                <div className="bg-[#18181B] p-1 rounded-lg border border-[#27272A] flex self-start sm:self-auto">
                    <button
                        onClick={() => setView('active')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${view === 'active'
                                ? 'bg-[#27272A] text-white shadow-sm border border-[#3F3F46]'
                                : 'text-gray-500 hover:text-white'
                            }`}
                    >
                        <PlayCircle className="w-3.5 h-3.5" /> Active
                    </button>
                    <button
                        onClick={() => setView('archived')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${view === 'archived'
                                ? 'bg-[#27272A] text-white shadow-sm border border-[#3F3F46]'
                                : 'text-gray-500 hover:text-white'
                            }`}
                    >
                        <Archive className="w-3.5 h-3.5" /> Archived
                    </button>
                </div>
            </div>

            {/* CONTENT AREA */}
            {isLoading ? (
                <div className="h-64 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {shows.map((show) => (
                        <ShowCard key={show.id} show={show} />
                    ))}

                    {/* Only show 'Create New' if we are in Active View */}
                    {view === 'active' && (
                        <button onClick={() => setIsCreateModalOpen(true)} className="group flex flex-col items-center justify-center rounded-xl bg-transparent border-2 border-dashed border-[#27272A] hover:border-blue-500 hover:bg-blue-500/5 transition-all min-h-[250px] gap-3">
                            <div className="size-12 rounded-full bg-[#18181B] group-hover:bg-blue-500/20 flex items-center justify-center text-gray-500 group-hover:text-blue-500 transition-colors">
                                <Plus className="w-7 h-7" />
                            </div>
                            <p className="text-gray-500 font-bold group-hover:text-blue-500 transition-colors">Create New Show</p>
                        </button>
                    )}
                </div>
            )}

            {isCreateModalOpen && (
                <CreateShowModal
                    onClose={() => setIsCreateModalOpen(false)} 
                    onSave={handleSaveNewShow}
                />
            )}
        </>
    );
}

function ShowCard({ show }) {
    const isArchived = show.status === 'archived';

    return (
        <div className={`group flex flex-col rounded-xl bg-[#18181B] border border-[#27272A] overflow-hidden transition-all shadow-sm ${isArchived ? 'opacity-75 hover:opacity-100' : 'hover:border-blue-500/50'}`}>
            <div className="h-32 w-full bg-cover bg-center relative" style={{ backgroundImage: `url(${show.image})` }}>
                <div className="absolute inset-0 bg-linear-to-t from-[#18181B] to-transparent opacity-90"></div>
                <div className="absolute bottom-3 left-4">
                    <span className={`${show.typeColor} text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider`}>
                        {show.type}
                    </span>
                </div>
                {isArchived && (
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-gray-300 border border-white/10">
                        ARCHIVED
                    </div>
                )}
            </div>

            <div className="p-5 flex flex-col gap-4 flex-1">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-white leading-tight mb-1">{show.title}</h3>
                        <p className="text-gray-400 text-sm flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {show.venue}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-white font-medium text-sm">{show.date}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-auto pt-2">
                    {/* Active: Go to Studio | Archived: Read Only */}
                    <Link
                        href={`/patch-studio/${show.id}`}
                        className={`flex-1 h-9 flex items-center justify-center gap-2 text-sm font-bold rounded transition-colors ${isArchived
                                ? 'bg-[#27272A] text-gray-400 hover:text-white'
                                : 'bg-blue-600 hover:bg-blue-500 text-white'
                            }`}
                    >
                        <Settings2 className="w-4 h-4" />
                        {isArchived ? 'View Read-Only' : 'Patch Studio'}
                    </Link>

                    <button className="size-9 flex items-center justify-center rounded border border-[#27272A] text-gray-400 hover:text-white hover:bg-[#27272A] hover:border-gray-500 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}