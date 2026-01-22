'use client';
import React, { useState, useEffect } from 'react';
import { X, Bell, Mail, Smartphone, Check } from 'lucide-react';

export default function CreateAlertModal({ isOpen, onClose }) {
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
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setSuccess(true);        setTimeout(() => {
            setSuccess(false);
            onClose();
        }, 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">

                {}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#0d93f2]/10 rounded-lg text-[#0d93f2]">
                            <Bell className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New Alert</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {}
                <div className="p-6">
                    {success ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 text-green-500">
                                <Check className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Alert Created!</h3>
                            <p className="text-slate-500 text-sm mt-1">We'll notify you when tickets drop.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-slate-900 dark:text-white">Notify me about:</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="flex items-center gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-[#0d93f2] transition-colors">
                                        <input type="checkbox" className="accent-[#0d93f2]" defaultChecked />
                                        <span className="text-sm text-slate-600 dark:text-slate-300">Tour Dates</span>
                                    </label>
                                    <label className="flex items-center gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-[#0d93f2] transition-colors">
                                        <input type="checkbox" className="accent-[#0d93f2]" defaultChecked />
                                        <span className="text-sm text-slate-600 dark:text-slate-300">New Music</span>
                                    </label>
                                </div>
                            </div>

                            {}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-slate-900 dark:text-white">Send notifications via:</label>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#151f28] rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <Mail className="w-5 h-5 text-slate-400" />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</span>
                                        </div>
                                        <input type="checkbox" className="toggle accent-[#0d93f2]" defaultChecked />
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#151f28] rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <Smartphone className="w-5 h-5 text-slate-400" />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Push Notification</span>
                                        </div>
                                        <input type="checkbox" className="toggle accent-[#0d93f2]" />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="w-full py-3 bg-[#0d93f2] hover:bg-[#0d93f2]/90 text-white font-bold rounded-xl shadow-lg shadow-[#0d93f2]/20 transition-all">
                                Save Alert
                            </button>
                        </form>
                    )}
                </div>

            </div>
        </div>
    );
}