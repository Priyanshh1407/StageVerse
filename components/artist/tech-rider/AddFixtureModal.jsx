'use client';

import { useState } from 'react';
import { X, Zap, Lightbulb, Scan, Speaker, Radio } from 'lucide-react';

export default function AddFixtureModal({ isOpen, onClose, onAdd }) {
    const [name, setName] = useState('');
    const [type, setType] = useState('Spot');
    const [iconType, setIconType] = useState('Lightbulb');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name) return;

        onAdd({ name, type, iconType });        setName('');
        setType('Spot');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1a2632] border border-[#223949] w-full max-w-md rounded-xl shadow-2xl overflow-hidden">

                {}
                <div className="flex justify-between items-center p-5 border-b border-[#223949]">
                    <h3 className="text-white font-bold text-lg">Add Custom Fixture</h3>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {}
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-wide">Fixture Name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Clay Paky Sharpy"
                            className="w-full bg-[#101b23] border border-[#223949] rounded-lg px-4 py-3 text-white text-sm focus:ring-1 focus:ring-[#0d93f2] outline-none transition-all"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-wide">Fixture Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full bg-[#101b23] border border-[#223949] rounded-lg px-4 py-3 text-white text-sm focus:ring-1 focus:ring-[#0d93f2] outline-none"
                        >
                            <option>Speakers/PA</option>
                            <option>Spot</option>
                            <option>Beam</option>
                            <option>Wash</option>
                            <option>Strobe</option>
                            <option>Laser</option>
                            <option>FX / Other</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-wide">Select Icon</label>
                        <div className="flex gap-3">
                            {['Lightbulb', 'Zap', 'Scan', 'Speaker', 'Radio'].map((icn) => (
                                <button
                                    key={icn}
                                    type="button"
                                    onClick={() => setIconType(icn)}
                                    className={`p-3 rounded-lg border transition-all ${iconType === icn ? 'bg-[#0d93f2] border-[#0d93f2] text-white' : 'bg-[#101b23] border-[#223949] text-white/50 hover:border-white/30'}`}
                                >
                                    {icn === 'Lightbulb' && <Lightbulb className="w-5 h-5" />}
                                    {icn === 'Zap' && <Zap className="w-5 h-5" />}
                                    {icn === 'Scan' && <Scan className="w-5 h-5" />}
                                    {icn === 'Speaker' && <Speaker className="w-5 h-5" />}
                                    {icn === 'Radio' && <Radio className="w-5 h-5" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="mt-2 w-full bg-[#0d93f2] hover:bg-[#0d93f2]/90 text-white font-bold py-3 rounded-lg transition-all active:scale-[0.98]"
                    >
                        Add to Grid
                    </button>
                </form>
            </div>
        </div>
    );
}