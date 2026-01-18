'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, User, X, Check, Loader2 } from 'lucide-react';

export default function LDSelector({ selectedLD, onSelect }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    // Search Debounce
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setIsLoading(true);
                try {
                    const res = await fetch(`/api/users/search?query=${query}`);
                    const json = await res.json();
                    if (json.success) {
                        setResults(json.data);
                        setIsOpen(true);
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (user) => {
        onSelect(user);
        setQuery('');
        setIsOpen(false);
    };

    const handleClear = () => {
        onSelect(null);
    };

    if (selectedLD) {
        return (
            <div className="flex items-center gap-3 bg-[#1a2632] border border-[#d6a200]/50 rounded-lg px-4 py-2 mt-4 md:mt-0 md:ml-4 shadow-lg shadow-[#d6a200]/10 animate-in fade-in slide-in-from-top-2">
                <div className="bg-[#d6a200] text-black w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                    {selectedLD.name.charAt(0)}
                </div>
                <div className="flex flex-col">
                    <span className="text-xs text-white/50 uppercase tracking-wide">Assigned LD</span>
                    <span className="text-white font-medium text-sm leading-none">{selectedLD.name}</span>
                </div>
                <button
                    onClick={handleClear}
                    className="ml-2 text-white/30 hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="relative w-full max-w-sm mt-4 md:mt-0 md:ml-4" ref={wrapperRef}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Assign to Lighting Designer..."
                    className="w-full bg-[#1a2632] border border-[#223949] text-white text-sm rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#0d93f2] focus:ring-1 focus:ring-[#0d93f2] transition-all"
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 text-[#0d93f2] animate-spin" />
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a2632] border border-[#223949] rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="text-xs text-white/30 px-3 py-2 uppercase font-bold tracking-wider bg-[#101b23]">Production Crew</div>
                    {results.map((user) => (
                        <button
                            key={user._id}
                            onClick={() => handleSelect(user)}
                            className="w-full text-left px-4 py-3 hover:bg-[#223949] transition-colors flex items-center gap-3 group"
                        >
                            <div className="w-8 h-8 rounded-full bg-[#223949] group-hover:bg-[#0d93f2] flex items-center justify-center text-white/70 group-hover:text-white font-bold text-xs transition-colors">
                                {user.name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white font-medium text-sm">{user.name}</span>
                                <span className="text-white/40 text-xs">Production</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
