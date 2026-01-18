'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Check } from 'lucide-react'; // Keep Check as it's used in the new code

export default function LivePollCard({ eventId, onComplete }) {
    const [poll, setPoll] = useState(null);
    const [loading, setLoading] = useState(true);
    const [votedOptionId, setVotedOptionId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);
    const [isVisible, setIsVisible] = useState(true);

    // Fetch Poll
    useEffect(() => {
        if (!eventId) return;

        async function fetchPoll() {
            try {
                const res = await fetch(`/api/fan/poll?eventId=${eventId}`);
                const json = await res.json();
                if (json.success && json.poll) {
                    setPoll(json.poll);
                }
            } catch (e) {
                console.error("Error fetching poll", e);
            } finally {
                setLoading(false);
            }
        }

        fetchPoll();
        const interval = setInterval(fetchPoll, 5000); // Polling every 5s for live updates
        return () => clearInterval(interval);
    }, [eventId]);

    // Timer Logic
    useEffect(() => {
        if (!poll) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Timer Finished
                    setTimeout(() => {
                        setIsVisible(false);
                        if (onComplete) onComplete();
                    }, 1000);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [poll, onComplete]);

    const handleVote = async (optionId) => {
        if (votedOptionId || isSubmitting) return;

        setIsSubmitting(true);

        try {
            await fetch('/api/fan/poll/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pollId: poll._id, optionId })
            });

            const res = await fetch(`/api/fan/poll?eventId=${eventId}`);
            const json = await res.json();
            if (json.success && json.poll) {
                setPoll(json.poll);
                setVotedOptionId(optionId); // Set voted option after successful vote and poll refresh
                toast.success("Vote Cast!");
            } else {
                toast.error("Failed to vote");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error voting");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading || !poll || !isVisible) return null;

    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);

    return (
        <div className="fixed inset-0 z-[100] bg-[#050505] flex items-center justify-center font-sans animate-in fade-in duration-500">
            {/* Dynamic Fonts via style injection since we can't edit layout easily */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;900&display=swap');
                .font-display { font-family: 'Space Grotesk', sans-serif; }
                .animate-float { animation: float 6s ease-in-out infinite; }
                @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
            `}</style>

            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,240,255,0.15),transparent_70%)] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#00f0ff]/5 rounded-full blur-3xl pointer-events-none" />

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-md p-6 flex flex-col items-center text-center font-display">

                {/* Header */}
                <div className="inline-flex items-center justify-center gap-2 mb-4">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                    </span>
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">Live Poll Active</span>
                </div>

                <h1 className="text-4xl md:text-5xl font-black uppercase leading-tight tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
                    {poll.question}
                </h1>
                <p className="text-slate-400 font-medium text-sm mb-8">Tap your choice below to cast your vote.</p>

                {/* Options Grid */}
                <div className="w-full flex flex-col gap-4 mb-8">
                    {poll.options.map((opt, index) => {
                        const isSelected = votedOptionId === opt._id;
                        const percent = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;

                        return (
                            <button
                                key={opt._id}
                                onClick={() => handleVote(opt._id)}
                                disabled={!!votedOptionId}
                                className={`
                                    relative w-full h-24 rounded-2xl px-6 flex items-center justify-between overflow-hidden transition-all duration-200 group/card text-left
                                    border-2 ${isSelected ? 'border-[#00f0ff] bg-[#00f0ff]/10 shadow-[0_0_30px_rgba(0,240,255,0.2)] scale-[0.98]' : 'border-white/10 bg-[#121212] hover:border-white/20'}
                                `}
                            >
                                {/* Hover Gradient */}
                                {!isSelected && <div className="absolute inset-0 bg-gradient-to-br from-[#00f0ff]/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />}

                                {/* Track Info */}
                                <div className="relative z-10 flex flex-col items-start">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Option 0{index + 1}</span>
                                    <h2 className="text-xl font-bold uppercase leading-none text-white">{opt.text}</h2>
                                </div>

                                {/* Checkmark / Percent */}
                                <div className="relative z-10 flex items-center gap-3">
                                    {!!votedOptionId && (
                                        <span className="text-[#00f0ff] text-lg font-black animate-in fade-in">{percent}%</span>
                                    )}
                                    <div className={`
                                        w-8 h-8 rounded-full bg-[#00f0ff] text-black flex items-center justify-center transition-all duration-200
                                        ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50 group-hover/card:opacity-20'}
                                    `}>
                                        <Check className="w-5 h-5 font-bold" strokeWidth={4} />
                                    </div>
                                </div>

                                {/* Vote Progress Bar (Visible after voting) */}
                                {!!votedOptionId && (
                                    <div className="absolute bottom-0 left-0 h-1 bg-[#00f0ff] transition-all duration-1000 ease-out" style={{ width: `${percent}%` }} />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Footer Timer */}
                <div className="w-full bg-[#121212] rounded-xl p-4 border border-white/10 shadow-lg relative overflow-hidden">
                    <div className="flex justify-between items-end mb-2 relative z-10">
                        <span className="text-xs font-bold text-slate-400 uppercase">Voting Closes In</span>
                        <span className="font-mono text-xl font-bold text-[#00f0ff]">00:{timeLeft.toString().padStart(2, '0')}</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden relative z-10">
                        <div
                            className="h-full bg-[#00f0ff] shadow-[0_0_10px_#00f0ff] transition-all duration-1000 linear"
                            style={{ width: `${(timeLeft / 30) * 100}%` }}
                        />
                    </div>
                </div>

                <p className="text-center text-[10px] text-slate-600 mt-4 uppercase tracking-widest font-bold">Powered by StageVerse Live</p>

                {/* Floating Elements Background */}
                <div className="absolute top-1/4 -left-12 w-24 h-24 bg-[#00f0ff]/20 rounded-full blur-xl animate-float" />
                <div className="absolute bottom-1/3 -right-8 w-16 h-16 bg-purple-500/20 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }} />
            </div>
        </div>
    );
}
