'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, User } from 'lucide-react';
import Image from 'next/image';

export default function UserSearchInput({
    label = "Search User",
    placeholder = "Type name...",
    role = "", // 'artist', 'production', etc.
    onSelect,
    initialValue = null,
    required = false
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // If editing, we might have an initial value (just a name or an object)
    const [selectedUser, setSelectedUser] = useState(initialValue);
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (initialValue && typeof initialValue === 'object') {
            setSelectedUser(initialValue);
            setSearchTerm(initialValue.name);
        } else if (initialValue && typeof initialValue === 'string') {
            // Fallback for string only legacy data
            setSearchTerm(initialValue);
        }
    }, [initialValue]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    // Debounce Search
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.length >= 2 && !selectedUser) {
                setIsLoading(true);
                try {
                    const res = await fetch(`/api/users/search?query=${searchTerm}&role=${role}`);
                    const data = await res.json();
                    if (data.success) {
                        setResults(data.users);
                        setShowDropdown(true);
                    }
                } catch (error) {
                    console.error("Search failed", error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setResults([]);
                setShowDropdown(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, role, selectedUser]);

    const handleSelect = (user) => {
        setSelectedUser(user);
        setSearchTerm(user.name);
        setShowDropdown(false);
        if (onSelect) onSelect(user);
    };

    const handleClear = () => {
        setSelectedUser(null);
        setSearchTerm('');
        if (onSelect) onSelect(null);
        // Re-focus input if desired
    };

    const handleChange = (e) => {
        setSearchTerm(e.target.value);
        if (selectedUser) {
            // If user modifies the text after selection, invalidates the selection
            setSelectedUser(null);
            if (onSelect) onSelect(null);
        }
    };

    return (
        <div className="flex flex-col gap-2 relative w-full" ref={wrapperRef}>
            <label className="text-sm font-medium text-[#90a4cb]">
                {label} {required && <span className="text-red-500">*</span>}
            </label>

            <div className="relative">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={handleChange}
                    onFocus={() => searchTerm.length >= 2 && !selectedUser && setShowDropdown(true)}
                    className={`w-full h-12 bg-[#182234] border ${selectedUser ? 'border-green-500/50' : 'border-[#314368]'} rounded-lg pl-10 pr-10 text-white focus:border-[#0d93f2] outline-none placeholder-[#314368] transition-colors`}
                    placeholder={placeholder}
                />

                <Search className="absolute left-3 top-3.5 text-[#90a4cb] w-5 h-5" />

                {isLoading ? (
                    <Loader2 className="absolute right-3 top-3.5 text-[#0d93f2] w-5 h-5 animate-spin" />
                ) : selectedUser ? (
                    <button onClick={handleClear} className="absolute right-3 top-3.5 text-green-500 hover:text-red-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                ) : null}

                {/* Dropdown Results */}
                {showDropdown && results.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-[#182234] border border-[#314368] rounded-lg shadow-xl overflow-hidden z-[100] max-h-60 overflow-y-auto">
                        {results.map((user) => (
                            <div
                                key={user._id}
                                onClick={() => handleSelect(user)}
                                className="px-4 py-3 hover:bg-[#2c3b47] cursor-pointer border-b border-[#314368]/50 flex items-center gap-3 last:border-none"
                            >
                                <div className="w-8 h-8 rounded-full bg-[#314368] flex items-center justify-center overflow-hidden shrink-0">
                                    {user.avatar ? (
                                        <Image src={user.avatar} alt={user.name} width={32} height={32} className="object-cover w-full h-full" />
                                    ) : (
                                        <User className="w-4 h-4 text-[#90a4cb]" />
                                    )}
                                </div>
                                <div>
                                    <div className="text-white font-medium text-sm">{user.name}</div>
                                    <div className="text-xs text-[#90a4cb] capitalize">{user.role} • {user.email}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {showDropdown && results.length === 0 && !isLoading && searchTerm.length >= 2 && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-[#182234] border border-[#314368] rounded-lg shadow-xl p-4 text-center text-sm text-[#90a4cb] z-[100]">
                        No users found.
                    </div>
                )}
            </div>
        </div>
    );
}
