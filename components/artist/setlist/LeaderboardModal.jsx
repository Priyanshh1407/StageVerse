'use client';

import { X, Trophy, User, Medal } from 'lucide-react';
import { useEffect } from 'react';

export default function LeaderboardModal({
    isOpen,
    onClose,
    winners = [],
    loading,
    onAddToGuestlist,
    guestlistUser,
    onConfirmGuestlist,
    guestlistLoading,
    onCancelGuestlist
}) {
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-[#101b23] rounded-2xl border border-[#315168] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">

                {}
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-center relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-white text-2xl font-black uppercase tracking-wider flex items-center justify-center gap-2">
                            <Trophy className="w-6 h-6 text-white" />
                            Setlist Winners
                        </h2>
                        <p className="text-orange-100 text-sm font-medium mt-1">Top 3 Predictors</p>
                    </div>
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                </div>

                <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10 z-20">
                    <X className="w-5 h-5" />
                </button>

                {}
                <div className="p-6">
                    {}
                    {guestlistUser ? (
                        <div className="bg-[#182934] p-6 rounded-xl border border-[#315168] text-center animate-in fade-in zoom-in-95">
                            <div className="w-16 h-16 bg-[#0d93f2]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#0d93f2]/20">
                                <Medal className="w-8 h-8 text-[#0d93f2]" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Add {guestlistUser.name} to Guestlist?</h3>

                            {}
                            <div className="bg-[#101b23] p-4 rounded-lg text-left mb-6 text-sm border border-[#315168]/50">
                                <div className="grid grid-cols-[80px_1fr] gap-2">
                                    <span className="text-[#90b2cb]">Email:</span>
                                    <span className="text-white font-mono select-all">{guestlistUser.email}</span>

                                    <span className="text-[#90b2cb]">Location:</span>
                                    <span className="text-white">{guestlistUser.location || "N/A"}</span>

                                    <span className="text-[#90b2cb]">ID:</span>
                                    <span className="text-white font-mono text-xs">{guestlistUser._id}</span>
                                </div>
                            </div>

                            <p className="text-[#90b2cb] text-sm mb-6">
                                They will receive a notification immediately.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={onCancelGuestlist}
                                    className="flex-1 py-3 px-4 rounded-lg border border-[#315168] text-[#90b2cb] hover:text-white hover:bg-[#223949] font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={onConfirmGuestlist}
                                    disabled={guestlistLoading}
                                    className="flex-1 py-3 px-4 rounded-lg bg-[#0d93f2] hover:bg-[#0b84db] text-white font-bold transition-colors disabled:opacity-50"
                                >
                                    {guestlistLoading ? "Adding..." : "Confirm Add"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        
                        loading ? (
                            <div className="text-center py-8 text-[#90b2cb]">
                                <div className="animate-spin w-8 h-8 border-2 border-[#0d93f2] border-t-transparent rounded-full mx-auto mb-2" />
                                Calculating Scores...
                            </div>
                        ) : winners.length > 0 ? (
                            <div className="space-y-3">
                                {winners.map((winner, index) => (
                                    <div key={winner._id} className="flex items-center gap-4 bg-[#182934] p-4 rounded-xl border border-[#315168]/50 relative overflow-hidden group">
                                        {}
                                        <div className={`flex-none w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border-2 
                          ${index === 0 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/50' :
                                                index === 1 ? 'bg-slate-400/10 text-slate-300 border-slate-400/50' :
                                                    'bg-orange-700/10 text-orange-400 border-orange-700/50'}`}>
                                            {index + 1}
                                        </div>

                                        {}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-bold truncate">{winner.userId?.name || 'Fan'}</p>
                                            <p className="text-[#90b2cb] text-xs truncate">{winner.userId?.email}</p>
                                        </div>

                                        {}
                                        <div className="text-right">
                                            <p className="text-[#0d93f2] font-black text-xl">{winner.score}</p>
                                            <p className="text-[#90b2cb] text-[10px] uppercase font-bold tracking-wider">PTS</p>
                                        </div>

                                        {}
                                        <button
                                            onClick={() => onAddToGuestlist && onAddToGuestlist(winner.userId)}
                                            className="ml-2 p-2 bg-[#0d93f2]/10 hover:bg-[#0d93f2] text-[#0d93f2] hover:text-white rounded-lg transition-colors"
                                            title="Add to Guestlist"
                                        >
                                            <Medal className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-[#90b2cb]">
                                No predictions found for this event yet.
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
