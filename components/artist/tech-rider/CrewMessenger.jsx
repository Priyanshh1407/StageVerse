'use client';
import { useState } from 'react';
import { MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export default function CrewMessenger() {
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('idle'); // idle, sending, success, error

    const handleSend = async () => {
        if (!message.trim()) return;
        setStatus('sending');
        try {
            const res = await fetch('/api/artist/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            if (res.ok) {
                setStatus('success');
                setMessage('');
                setTimeout(() => setStatus('idle'), 3000);
            } else {
                setStatus('error');
            }
        } catch (e) {
            setStatus('error');
        }
    };

    return (
        <div id="crew-messenger" className="bg-[#1a2632] border border-[#223949] rounded-2xl p-6 relative overflow-hidden group">
            {/* Background Gradient */}
            <div className="absolute top-0 right-0 p-8 opacity-10 blur-3xl rounded-full bg-[#0d93f2]" />

            <div className="relative z-10 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-[#0d93f2]" />
                            Message Crew
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">Send a high-priority note to the production team.</p>
                    </div>
                </div>

                <div className="relative">
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="e.g. We need to check the drum riser height..."
                        className="w-full h-24 bg-[#101b23] border border-[#223949] rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:border-[#0d93f2] resize-none transition-colors"
                        disabled={status === 'sending'}
                    />
                    {status === 'success' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#101b23]/80 backdrop-blur-sm rounded-xl">
                            <div className="flex flex-col items-center gap-2 text-green-400 animate-in fade-in zoom-in duration-300">
                                <CheckCircle2 className="w-8 h-8" />
                                <span className="font-bold">Sent!</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={handleSend}
                        disabled={status === 'sending' || !message.trim()}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#0d93f2] hover:bg-[#0d93f2]/90 disabled:opacity-50 disabled:hover:bg-[#0d93f2] text-white font-bold rounded-lg transition-all active:scale-95"
                    >
                        {status === 'sending' ? (
                            <span className="animate-pulse">Sending...</span>
                        ) : (
                            <>
                                Send to Dashboard <Send className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
