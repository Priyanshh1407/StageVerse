'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Calculator, Calendar, Zap, ArrowRight, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function GlobalSearchModal({ isOpen, onClose }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const router = useRouter();
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setQuery('');
            setResults(null);
            setSelectedIndex(0);
        }
    }, [isOpen]);
    useEffect(() => {
        if (!query || query.length < 2) {
            setResults(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/production/search?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                if (data.success) {
                    setResults(data.data);
                    setSelectedIndex(0); // Reset selection on new results
                }
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setIsLoading(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [query]);
    const flatResults = useMemo(() => {
        if (!results) return [];
        const list = [];

        results.events?.forEach(item => list.push({ type: 'event', data: item, path: `/patch-sheet/${item.eventId || item._id}` }));
        results.tasks?.forEach(item => list.push({ type: 'task', data: item, path: `/logistics/${item.eventId?.eventId || item.eventId?._id || '101'}` }));
        results.patches?.forEach(item => list.push({ type: 'patch', data: item, path: `/patch-studio/${item.eventId?.eventId || item.eventId?._id || '101'}` }));

        return list;
    }, [results]);
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % Math.max(1, flatResults.length));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + Math.max(1, flatResults.length)) % Math.max(1, flatResults.length));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (flatResults[selectedIndex]) {
                    const item = flatResults[selectedIndex];
                    onClose();
                    router.push(item.path);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, flatResults, selectedIndex, router, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-start justify-center pt-32 px-4 animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="w-full max-w-2xl bg-[#0F0F10] border border-[#2c3e50] rounded-xl shadow-2xl overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {}
                <div className="flex items-center gap-3 p-4 border-b border-[#2c3e50]">
                    <Search className="w-5 h-5 text-gray-500" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder-gray-600"
                        placeholder="Search shows, tasks, patches..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <button onClick={onClose} className="p-1 hover:bg-[#1a1a1a] rounded text-gray-500 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {}
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar bg-[#16202a]">

                    {isLoading && (
                        <div className="flex items-center justify-center p-12 text-gray-500">
                            <Loader2 className="w-6 h-6 animate-spin mr-2" />
                            Searching...
                        </div>
                    )}

                    {!isLoading && results && (
                        <div className="p-2 space-y-4">

                            {}
                            {flatResults.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    No results found for "{query}"
                                </div>
                            )}

                            {}
                            {results.events.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-3 py-2">Shows</h3>
                                    {results.events.map((event, idx) => {
                                        const absIndex = idx;
                                        const isSelected = selectedIndex === absIndex;

                                        return (
                                            <Link
                                                key={event._id}
                                                href={`/patch-sheet/${event.eventId || event._id}`}
                                                onClick={onClose}
                                                className={`flex items-center gap-3 p-3 rounded-lg group transition-colors cursor-pointer
                                                    ${isSelected ? 'bg-[#00d4ff]/10 border border-[#00d4ff]/30' : 'hover:bg-white/5 border border-transparent'}
                                                `}
                                                onMouseEnter={() => setSelectedIndex(absIndex)}
                                            >
                                                <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-white/10 group-hover:border-[#00d4ff]/30">
                                                    <Calendar className="w-4 h-4 text-purple-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-sm font-bold truncate ${isSelected ? 'text-[#00d4ff]' : 'text-white'}`}>{event.title}</div>
                                                    <div className="text-[11px] text-gray-500 truncate">{event.artist} • {event.city}</div>
                                                </div>
                                                {isSelected && <ArrowRight className="w-4 h-4 text-[#00d4ff]" />}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}

                            {}
                            {results.tasks.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-3 py-2">Logistics Tasks</h3>
                                    {results.tasks.map((task, idx) => {
                                        const absIndex = (results.events?.length || 0) + idx;
                                        const isSelected = selectedIndex === absIndex;

                                        return (
                                            <Link
                                                key={task._id}
                                                href={`/logistics/${task.eventId?._id || '101'}`}
                                                onClick={onClose}
                                                className={`flex items-center gap-3 p-3 rounded-lg group transition-colors cursor-pointer
                                                    ${isSelected ? 'bg-[#00d4ff]/10 border border-[#00d4ff]/30' : 'hover:bg-white/5 border border-transparent'}
                                                `}
                                                onMouseEnter={() => setSelectedIndex(absIndex)}
                                            >
                                                <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-white/10 group-hover:border-[#00d4ff]/30">
                                                    <Calculator className="w-4 h-4 text-amber-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-sm font-bold truncate ${isSelected ? 'text-[#00d4ff]' : 'text-white'}`}>{task.title}</div>
                                                    <div className="text-[11px] text-gray-500 truncate">{task.assignee || 'Unassigned'} • Due {task.dueDate || 'Soon'}</div>
                                                </div>
                                                {isSelected && <ArrowRight className="w-4 h-4 text-[#00d4ff]" />}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}

                            {}
                            {results.patches.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-3 py-2">Patches</h3>
                                    {results.patches.map((patch, idx) => {
                                        const absIndex = (results.events?.length || 0) + (results.tasks?.length || 0) + idx;
                                        const isSelected = selectedIndex === absIndex;

                                        return (
                                            <Link
                                                key={patch._id}
                                                href={`/patch-studio/${patch.eventId}`}
                                                onClick={onClose}
                                                className={`flex items-center gap-3 p-3 rounded-lg group transition-colors cursor-pointer
                                                    ${isSelected ? 'bg-[#00d4ff]/10 border border-[#00d4ff]/30' : 'hover:bg-white/5 border border-transparent'}
                                                `}
                                                onMouseEnter={() => setSelectedIndex(absIndex)}
                                            >
                                                <div className="w-8 h-8 rounded bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-white/10 group-hover:border-[#00d4ff]/30">
                                                    <Zap className="w-4 h-4 text-green-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-sm font-bold truncate ${isSelected ? 'text-[#00d4ff]' : 'text-white'}`}>{patch.showName}</div>
                                                    <div className="text-[11px] text-gray-500 truncate">Version {patch.version}</div>
                                                </div>
                                                {isSelected && <ArrowRight className="w-4 h-4 text-[#00d4ff]" />}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}

                        </div>
                    )}

                    {}
                    {!query && (
                        <div className="p-8 text-center bg-[#16202a]">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1e2a36] mb-4">
                                <Search className="w-6 h-6 text-gray-500" />
                            </div>
                            <h3 className="text-white font-bold mb-1">Search the Studio</h3>
                            <p className="text-xs text-gray-500 max-w-xs mx-auto">
                                Find shows, logistics, tasks, and lighting patches instantly.
                            </p>
                        </div>
                    )}

                </div>

                {}
                <div className="bg-[#141b22] px-4 py-2 border-t border-[#2c3e50] flex items-center justify-between text-[10px] text-gray-500 font-mono">
                    <div className="flex gap-4">
                        <span><kbd className="bg-[#27272A] px-1 rounded border border-[#3F3F46] text-gray-300">↑↓</kbd> Navigate</span>
                        <span><kbd className="bg-[#27272A] px-1 rounded border border-[#3F3F46] text-gray-300">Enter</kbd> Select</span>
                    </div>
                    <span><kbd className="bg-[#27272A] px-1 rounded border border-[#3F3F46] text-gray-300">Esc</kbd> Close</span>
                </div>

            </div>
        </div>
    );
}
