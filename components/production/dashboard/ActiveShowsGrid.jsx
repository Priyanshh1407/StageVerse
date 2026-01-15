'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Film, MapPin, Settings2, MoreVertical, Plus, Archive, PlayCircle, Loader2, Inbox, CheckCircle2 } from 'lucide-react';
import CreateShowModal from './CreateShowModal';

export default function ActiveShowsGrid({ initialActiveShows = [] }) {
    const [view, setView] = useState('active'); // 'active', 'archived', 'requested'
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Filter shows based on the current view
    const displayedShows = initialActiveShows.filter(show => {
        if (view === 'active') return show.status === 'active'; // Strict active
        if (view === 'archived') return show.status === 'archived';
        if (view === 'requested') return show.status === 'requested';
        return false;
    });

    const pendingCount = initialActiveShows.filter(s => s.status === 'requested').length;

    const handleSaveNewShow = (newShowData) => {
        setIsCreateModalOpen(false);
        window.location.reload();
    };

    return (
        <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {view === 'active' && <Film className="w-5 h-5 text-blue-500" />}
                    {view === 'archived' && <Archive className="w-5 h-5 text-gray-500" />}
                    {view === 'requested' && <Inbox className="w-5 h-5 text-amber-500" />}

                    {view === 'active' && 'Active Shows'}
                    {view === 'archived' && 'Show Archive'}
                    {view === 'requested' && 'Pending Requests'}
                </h2>

                {/* TAB SWITCHER */}
                <div className="bg-[#18181B] p-1 rounded-lg border border-[#27272A] flex self-start sm:self-auto gap-1">
                    <TabButton
                        active={view === 'active'}
                        onClick={() => setView('active')}
                        icon={PlayCircle}
                        label="Active"
                    />

                    {/* REQUESTS TAB (with Badge) */}
                    <button
                        onClick={() => setView('requested')}
                        className={`relative flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${view === 'requested'
                            ? 'bg-[#27272A] text-white shadow-sm border border-[#3F3F46]'
                            : 'text-gray-500 hover:text-white'
                            }`}
                    >
                        <Inbox className="w-3.5 h-3.5" />
                        Requests
                        {pendingCount > 0 && (
                            <span className="ml-1 bg-amber-500 text-black px-1.5 py-0.5 rounded-full text-[9px] font-extrabold">
                                {pendingCount}
                            </span>
                        )}
                    </button>

                    <TabButton
                        active={view === 'archived'}
                        onClick={() => setView('archived')}
                        icon={Archive}
                        label="Archived"
                    />
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {displayedShows.length > 0 ? (
                    displayedShows.map((show) => (
                        <ShowCard key={show.id} show={show} isRequested={view === 'requested'} />
                    ))
                ) : (
                    view !== 'active' && (
                        <div className="col-span-full py-12 text-center text-gray-500 bg-[#18181B] border border-[#27272A] border-dashed rounded-xl">
                            <p>No {view} found.</p>
                        </div>
                    )
                )}

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

            {isCreateModalOpen && (
                <CreateShowModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onSave={handleSaveNewShow}
                />
            )}
        </>
    );
}

function TabButton({ active, onClick, icon: Icon, label }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${active
                ? 'bg-[#27272A] text-white shadow-sm border border-[#3F3F46]'
                : 'text-gray-500 hover:text-white'
                }`}
        >
            <Icon className="w-3.5 h-3.5" /> {label}
        </button>
    );
}

function ShowCard({ show, isRequested }) {
    const isArchived = show.status === 'archived';
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isAccepting, setIsAccepting] = useState(false);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this show? This cannot be undone.')) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/production/events/${show.eventId || show.id}`, { method: 'DELETE' });
            if (res.ok) window.location.reload();
        } catch (e) { console.error(e); }
        finally { setIsDeleting(false); }
    };

    const handleArchive = async () => {
        const newStatus = isArchived ? 'active' : 'archived';
        try {
            const res = await fetch(`/api/production/events/${show.eventId || show.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) window.location.reload();
        } catch (e) { console.error(e); }
    };

    const handleAcceptRequest = async () => {
        setIsAccepting(true);
        try {
            const res = await fetch(`/api/production/events/${show.eventId || show.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'active' }) // Activate!
            });
            if (res.ok) window.location.reload();
        } catch (e) { console.error(e); }
        finally { setIsAccepting(false); }
    };

    return (
        <div className={`group flex flex-col rounded-xl bg-[#18181B] border border-[#27272A] overflow-hidden transition-all shadow-sm ${isArchived ? 'opacity-75 hover:opacity-100' : 'hover:border-blue-500/50'}`}>
            <div className="h-32 w-full bg-cover bg-center relative" style={{ backgroundImage: `url(${show.image})` }}>
                <div className="absolute inset-0 bg-linear-to-t from-[#18181B] to-transparent opacity-90"></div>
                <div className="absolute bottom-3 left-4">
                    <span className={`${show.typeColor} text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider`}>
                        {show.type}
                    </span>
                    {isRequested && (
                        <span className="ml-2 bg-amber-500 text-black text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider animate-pulse">
                            Action Required
                        </span>
                    )}
                </div>
                {isArchived && (
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-gray-300 border border-white/10">
                        ARCHIVED
                    </div>
                )}
            </div>

            <div className="p-5 flex flex-col gap-4 flex-1 relative">
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

                    {isRequested ? (
                        <button
                            onClick={handleAcceptRequest}
                            disabled={isAccepting}
                            className="flex-1 h-9 flex items-center justify-center gap-2 text-sm font-bold rounded transition-colors bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20"
                        >
                            {isAccepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Accept Request
                        </button>
                    ) : (
                        <Link
                            href={`/patch-studio/${show.eventId || show.id}`}
                            className={`flex-1 h-9 flex items-center justify-center gap-2 text-sm font-bold rounded transition-colors ${isArchived
                                ? 'bg-[#27272A] text-gray-400 hover:text-white'
                                : 'bg-blue-600 hover:bg-blue-500 text-white'
                                }`}
                        >
                            <Settings2 className="w-4 h-4" />
                            {isArchived ? 'View Archive' : 'Patch Studio'}
                        </Link>
                    )}

                    {!isRequested && (
                        <div className="relative">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="size-9 flex items-center justify-center rounded border border-[#27272A] text-gray-400 hover:text-white hover:bg-[#27272A] hover:border-gray-500 transition-colors"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>

                            {isMenuOpen && (
                                <div className="absolute right-0 bottom-10 w-40 bg-[#18181B] border border-[#27272A] rounded-lg shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <button
                                        onClick={handleArchive}
                                        className="px-4 py-3 text-left text-xs font-bold text-gray-300 hover:bg-[#27272A] hover:text-white transition-colors border-b border-[#27272A]"
                                    >
                                        {isArchived ? 'Unarchive' : 'Archive Show'}
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="px-4 py-3 text-left text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors"
                                    >
                                        {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                                    </button>
                                </div>
                            )}
                            {isMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}