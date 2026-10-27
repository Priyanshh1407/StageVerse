'use client';

import { Users, Search, Mail, MapPin, Calendar, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function GuestlistPanel({ eventId }) {
    const [guests, setGuests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedGuest, setSelectedGuest] = useState(null);
    useEffect(() => {
        if (eventId) {
            fetchGuests();
        } else {
            setGuests([]);
        }
        setSelectedGuest(null);
    }, [eventId]);

    const fetchGuests = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/artist/guestlist?eventId=${eventId}`);
            const json = await res.json();
            if (json.success) {
                setGuests(json.guests);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [notesBuffer, setNotesBuffer] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (selectedGuest) {
            setNotesBuffer(selectedGuest.notes || "");
            setIsEditingNotes(false);
        }
    }, [selectedGuest]);

    const handleSaveNotes = async () => {
        if (!selectedGuest) return;
        try {
            setActionLoading(true);
            const res = await fetch(`/api/artist/guestlist/${selectedGuest._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: notesBuffer })
            });
            const json = await res.json();
            if (json.success) {
                setGuests(prev => prev.map(g => g._id === selectedGuest._id ? json.guest : g));
                setSelectedGuest(json.guest);
                setIsEditingNotes(false);
                toast.success("Notes updated successfully");
            } else {
                toast.error("Failed to update notes");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(false);
        }
    };

    const handleRevoke = async () => {
        if (!selectedGuest) return;
        if (!confirm(`Are you sure you want to remove ${selectedGuest.name}?`)) return;

        try {
            setActionLoading(true);
            const res = await fetch(`/api/artist/guestlist/${selectedGuest._id}`, {
                method: 'DELETE'
            });
            const json = await res.json();
            if (json.success) {
                setGuests(prev => prev.filter(g => g._id !== selectedGuest._id));
                setSelectedGuest(null);
                toast.success("Access revoked");
            } else {
                toast.error("Failed to revoke access");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="bg-[#0b1217] rounded-3xl overflow-hidden flex flex-col h-full shadow-2xl border border-[#315168]/30 relative">
            {}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#0d93f2]/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

            {}
            <div className="p-5 border-b border-[#315168]/30 bg-[#0b1217]/60 backdrop-blur-xl flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#0d93f2]/10 rounded-xl">
                        <Users className="w-5 h-5 text-[#0d93f2]" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg tracking-tight">Guestlist</h3>
                        <p className="text-[#90b2cb] text-xs font-medium uppercase tracking-wider">
                            {guests.length} Approved Guests
                        </p>
                    </div>
                </div>
            </div>

            {}
            <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden relative z-10">

                {}
                <div className={`w-full md:w-[400px] border-r border-[#315168]/30 flex flex-col bg-[#0b1217]/40 backdrop-blur-sm ${selectedGuest ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-[#315168]/30">
                        <div className="relative group">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#90b2cb] group-focus-within:text-[#0d93f2] transition-colors" />
                            <input
                                type="text"
                                placeholder="Search guests..."
                                className="w-full bg-[#101b23] border border-[#315168]/50 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-[#587b94] focus:outline-none focus:border-[#0d93f2] focus:ring-1 focus:ring-[#0d93f2]/50 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-1">
                        {loading ? (
                            <div className="p-8 text-center text-[#90b2cb] text-sm animate-pulse">Loading list...</div>
                        ) : guests.length > 0 ? (
                            guests.map(guest => (
                                <div
                                    key={guest._id}
                                    onClick={() => setSelectedGuest(guest)}
                                    className={`p-3 rounded-xl cursor-pointer transition-all duration-200 border border-transparent group ${selectedGuest?._id === guest._id
                                        ? 'bg-[#0d93f2]/10 border-[#0d93f2]/30 shadow-[0_0_15px_rgba(13,147,242,0.1)]'
                                        : 'hover:bg-[#182934] hover:border-[#315168]/30'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white uppercase shadow-lg ring-2 ring-offset-2 ring-offset-[#0b1217] transition-all ${selectedGuest?._id === guest._id ? 'bg-[#0d93f2] ring-[#0d93f2]' : 'bg-slate-700 ring-slate-700 group-hover:ring-slate-600'}`}>
                                            {guest.name?.substring(0, 2)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className={`text-sm font-bold truncate ${selectedGuest?._id === guest._id ? 'text-white' : 'text-slate-200'}`}>
                                                    {guest.name}
                                                </p>
                                                {guest.status === 'approved' && (
                                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                                )}
                                            </div>
                                            <p className="text-[#90b2cb] text-xs truncate max-w-[200px]">{guest.email}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-[#90b2cb] opacity-50">
                                <Users className="w-12 h-12 mb-3 stroke-1" />
                                <p className="text-sm">No guests found</p>
                            </div>
                        )}
                    </div>
                </div>

                {}
                <div className={`flex-1 bg-[#101b23]/30 p-6 md:p-10 flex flex-col ${!selectedGuest ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
                    {selectedGuest ? (
                        <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">

                            {}
                            <button
                                onClick={() => setSelectedGuest(null)}
                                className="md:hidden text-[#90b2cb] hover:text-white text-sm mb-6 flex items-center gap-2 font-bold"
                            >
                                ← Back to List
                            </button>

                            {}
                            <div className="bg-gradient-to-br from-[#182934]/80 to-[#101b23]/80 backdrop-blur-xl border border-[#315168]/50 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                                {}
                                <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#0d93f2]/20 rounded-full blur-[80px]" />

                                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10 text-center md:text-left">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#0d93f2] to-[#0066cc] flex items-center justify-center text-3xl font-bold text-white uppercase shadow-[0_0_30px_rgba(13,147,242,0.3)] ring-4 ring-[#0b1217]">
                                        {selectedGuest.name?.substring(0, 2)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
                                            <div>
                                                <h2 className="text-3xl font-bold text-white tracking-tight">{selectedGuest.name}</h2>
                                                <div className="flex items-center gap-2 mt-2 justify-center md:justify-start">
                                                    <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)] flex items-center gap-1.5">
                                                        <CheckCircle className="w-3.5 h-3.5" /> Approved
                                                    </span>
                                                    <span className="bg-[#315168]/30 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-[#315168]/30">
                                                        + {selectedGuest.plusOnes || 0} Guest
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="hidden md:block text-right">
                                                <p className="text-[#90b2cb] text-xs font-bold uppercase tracking-wider mb-1">Added On</p>
                                                <p className="text-white font-mono text-sm opacity-90">{new Date(selectedGuest.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                                    <div className="bg-[#0b1217]/50 rounded-2xl p-4 border border-[#315168]/30 flex items-start gap-4 hover:border-[#0d93f2]/30 transition-colors group">
                                        <div className="p-2.5 bg-[#0d93f2]/10 rounded-xl text-[#0d93f2] group-hover:scale-110 transition-transform">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[#587b94] text-xs font-bold uppercase tracking-wider mb-1">Contact Email</p>
                                            <p className="text-white text-sm font-medium">{selectedGuest.email}</p>
                                        </div>
                                    </div>
                                    <div className="bg-[#0b1217]/50 rounded-2xl p-4 border border-[#315168]/30 flex items-start gap-4 hover:border-[#0d93f2]/30 transition-colors group">
                                        <div className="p-2.5 bg-[#0d93f2]/10 rounded-xl text-[#0d93f2] group-hover:scale-110 transition-transform">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[#587b94] text-xs font-bold uppercase tracking-wider mb-1">Event Status</p>
                                            <p className="text-white text-sm font-medium">Valid Entry Ticket</p>
                                        </div>
                                    </div>
                                </div>

                                {}
                                <div className="mt-6 bg-[#0b1217]/50 rounded-2xl p-5 border border-[#315168]/30">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[#587b94] text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#0d93f2]" /> Internal Notes
                                        </p>
                                        {!isEditingNotes && (
                                            <button
                                                onClick={() => setIsEditingNotes(true)}
                                                className="text-xs text-[#0d93f2] hover:text-white font-bold transition-colors"
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </div>

                                    {isEditingNotes ? (
                                        <div className="animate-in fade-in duration-200">
                                            <textarea
                                                value={notesBuffer}
                                                onChange={e => setNotesBuffer(e.target.value)}
                                                className="w-full bg-[#101b23] border border-[#315168] rounded-xl p-3 text-white text-sm focus:outline-none focus:border-[#0d93f2] min-h-[100px] shadow-inner font-normal leading-relaxed"
                                                placeholder="Add notes about this guest..."
                                                autoFocus
                                            />
                                            <div className="flex gap-3 mt-3 justify-end">
                                                <button
                                                    onClick={() => setIsEditingNotes(false)}
                                                    className="px-4 py-1.5 rounded-lg text-xs font-bold text-[#90b2cb] hover:text-white hover:bg-[#182934] transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleSaveNotes}
                                                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#0d93f2] text-white hover:bg-[#0b84db] shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                                                    disabled={actionLoading}
                                                >
                                                    {actionLoading ? 'Saving...' : 'Save Notes'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-slate-300 text-sm leading-relaxed italic opacity-80">
                                            "{selectedGuest.notes || 'No internal notes added.'}"
                                        </p>
                                    )}
                                </div>
                            </div>

                            {}
                            <div className="mt-8 flex justify-end">
                                <button
                                    onClick={handleRevoke}
                                    disabled={actionLoading}
                                    className="group relative px-6 py-3 rounded-xl overflow-hidden font-bold text-sm text-red-500 transition-all hover:text-white"
                                >
                                    <div className="absolute inset-0 bg-red-500/10 group-hover:bg-red-500 transition-colors duration-300" />
                                    <span className="relative flex items-center gap-2">
                                        {actionLoading ? 'Processing...' : (
                                            <>Revoke Access <span className="text-lg leading-none">×</span></>
                                        )}
                                    </span>
                                </button>
                            </div>

                        </div>
                    ) : (
                        <div className="text-center text-[#90b2cb]/50">
                            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#0d93f2]/5 flex items-center justify-center animate-pulse">
                                <Users className="w-10 h-10 opacity-50" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Select a Guest</h2>
                            <p className="text-sm max-w-xs mx-auto">Click on any guest from the list to view their full profile and manage access.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
