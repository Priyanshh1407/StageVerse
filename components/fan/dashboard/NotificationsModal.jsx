'use client';

import { X, Bell, ExternalLink, Calendar, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function NotificationsModal({ isOpen, onClose }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    async function fetchNotifications() {
        try {
            setLoading(true);
            const res = await fetch('/api/fan/notifications');
            const json = await res.json();
            if (json.success) {
                setNotifications(json.notifications);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: syncing with the server is what this effect is for
            fetchNotifications();
        }
    }, [isOpen]);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-end sm:justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full h-full sm:h-auto sm:max-w-md bg-white dark:bg-[#1a2632] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right sm:slide-in-from-bottom duration-300">

                { }
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#1a2632] z-10">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Bell className="w-5 h-5 text-[#0d93f2]" />
                        Notifications
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                { }
                <div className="flex-1 overflow-y-auto p-0 bg-slate-50 dark:bg-[#101b22]">
                    {loading ? (
                        <div className="p-10 text-center text-slate-500">Loading updates...</div>
                    ) : notifications.length > 0 ? (
                        <div className="divide-y divide-slate-200 dark:divide-slate-800">
                            {notifications.map((note) => (
                                <div key={note._id} className={`p-4 hover:bg-white dark:hover:bg-[#1a2632] transition-colors ${!note.read ? 'bg-blue-50/50 dark:bg-[#0d93f2]/5' : ''}`}>
                                    <div className="flex gap-3">
                                        <div className={`mt-1 flex-none w-2 h-2 rounded-full ${!note.read ? 'bg-[#0d93f2]' : 'bg-transparent'}`} />
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{note.title}</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">{note.message}</p>
                                            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(note.createdAt).toLocaleDateString()}
                                            </p>

                                            {note.link && (
                                                <Link href={note.link} onClick={onClose} className="inline-flex items-center gap-1 text-xs font-bold text-[#0d93f2] hover:underline mt-2">
                                                    View Details <ExternalLink className="w-3 h-3" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                            <CheckCircle className="w-12 h-12 mb-4 opacity-20" />
                            <p>No new notifications</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
