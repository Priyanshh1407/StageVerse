'use client';
import React from 'react';
import { useEffect } from 'react';
import { X, Play, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function AllReleasesModal({ isOpen, onClose, releases }) {
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh]">

                {}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">New Releases & News</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Latest updates from artists you follow.</p>
                    </div>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {releases.map((item, index) => (
                        <Link
                            key={index}
                            href={`/artists/${item.id}`} // Links to the public artist page
                            className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1e2a35] border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
                        >
                            {}
                            <div className="w-16 h-16 rounded-lg relative overflow-hidden shrink-0 shadow-sm">
                                <Image src={item.image} alt={item.artist} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                            </div>

                            {}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white uppercase ${item.color || 'bg-slate-500'}`}>
                                        {item.type}
                                    </span>
                                    <span className="text-xs text-slate-500">• {item.timeAgo || 'Just now'}</span>
                                </div>
                                <h4 className="font-bold text-slate-900 dark:text-white truncate text-lg leading-tight">{item.artist}</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{item.title}</p>
                            </div>

                            {}
                            <div className="p-2 text-slate-300 group-hover:text-[#0d93f2] transition-colors">
                                <ArrowRight className="w-5 h-5" />
                            </div>
                        </Link>
                    ))}
                </div>

            </div>
        </div>
    );
}