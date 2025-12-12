'use client';
import React, { useState } from 'react';
import { Users, Calendar, Wrench, Power, Settings2, Sliders, Zap, Sun } from 'lucide-react';
import { ConcertLights } from '@/components/ConcertLights';

const Hero = () => {
    const [showControls, setShowControls] = useState(false);

    // --- MASTER STATE ---
    const [masterOn, setMasterOn] = useState(true);

    // --- BEAMS CONFIG (Moving Heads) ---
    const [beams, setBeams] = useState({
        on: false,
        count: 6,
        color: "#06b6d4" // Cyan
    });

    // --- BLINDERS CONFIG (Strobes) ---
    const [blinders, setBlinders] = useState({
        on: false,
        count: 8
    });

    // --- LASERS CONFIG ---
    const [lasers, setLasers] = useState({
        on: false,
        count: 30,
        color: "#39ff14" // Laser Green
    });

    // Helper to update specific configs
    const updateBeams = (key, val) => setBeams(prev => ({ ...prev, [key]: val }));
    const updateBlinders = (key, val) => setBlinders(prev => ({ ...prev, [key]: val }));
    const updateLasers = (key, val) => setLasers(prev => ({ ...prev, [key]: val }));

    const roles = [
        { icon: Users, label: "Fan" },
        { icon: Calendar, label: "Organizer" },
        { icon: Wrench, label: "Crew" },
    ];

    const colors = [
        { value: "#06b6d4", label: "Cyan" },
        { value: "#a855f7", label: "Purple" },
        { value: "#ff0099", label: "Pink" },
        { value: "#ef4444", label: "Red" },
        { value: "#39ff14", label: "Green" },
        { value: "#ffffff", label: "White" },
    ];

    return (
        <div className="relative w-full min-h-screen bg-black overflow-hidden font-sans">

            {/* BACKGROUND & LIGHTS */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 z-10" />
                <div className="absolute inset-0 bg-[url('/images/hero.jpg')] bg-cover bg-center opacity-60" />

                {/* Pass individual configs to the engine */}
                <div className="absolute inset-0 z-10">
                    <ConcertLights
                        masterOn={masterOn}
                        beams={beams}
                        blinders={blinders}
                        lasers={lasers}
                    />
                </div>
            </div>

            {/* --- FLOATING LIGHTING CONSOLE (FIXED MOBILE POSITION) --- */}
            {/* CHANGED: bottom-4 right-4 for mobile, sm:bottom-8 sm:right-8 for desktop */}
            <div className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 flex flex-col items-end gap-3">
                <button
                    onClick={() => setShowControls(!showControls)}
                    className="p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-all"
                >
                    <Settings2 className={`w-6 h-6 ${showControls ? 'text-cyan-400' : 'text-gray-400'}`} />
                </button>

                {showControls && (
                    <div className="
                        bg-black/90 backdrop-blur-xl border border-white/10 
                        p-4 sm:p-5 rounded-2xl shadow-2xl 
                        w-72 sm:w-80  /* CHANGED: Narrower width (w-72) on mobile */
                        animate-in slide-in-from-bottom-5 fade-in duration-300 
                        max-h-[60vh] sm:max-h-[80vh] /* CHANGED: Shorter max-height on mobile */
                        overflow-y-auto custom-scrollbar
                    ">

                        {/* MASTER SWITCH */}
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                            <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Master Control</span>
                            <Toggle
                                isOn={masterOn}
                                onClick={() => setMasterOn(!masterOn)}
                                label={masterOn ? "SYSTEM ON" : "OFF"}
                                color="red"
                            />
                        </div>

                        {/* 1. BEAMS CONTROL */}
                        <div className="mb-6 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 text-cyan-400">
                                    <Sun className="w-4 h-4" />
                                    <span className="text-sm font-bold">Beams</span>
                                </div>
                                <Toggle isOn={beams.on} onClick={() => updateBeams('on', !beams.on)} />
                            </div>

                            {beams.on && (
                                <div className="pl-2 space-y-3 border-l-2 border-white/5 animate-in fade-in slide-in-from-left-2">
                                    <Slider value={beams.count} onChange={(v) => updateBeams('count', v)} min={0} max={12} />
                                    <ColorPicker selected={beams.color} onSelect={(c) => updateBeams('color', c)} colors={colors} />
                                </div>
                            )}
                        </div>

                        {/* 2. LASERS CONTROL */}
                        <div className="mb-6 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 text-green-400">
                                    <Zap className="w-4 h-4" />
                                    <span className="text-sm font-bold">Lasers</span>
                                </div>
                                <Toggle isOn={lasers.on} onClick={() => updateLasers('on', !lasers.on)} />
                            </div>

                            {lasers.on && (
                                <div className="pl-2 space-y-3 border-l-2 border-white/5 animate-in fade-in slide-in-from-left-2">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Intensity</span>
                                        <Slider value={lasers.count} onChange={(v) => updateLasers('count', v)} min={2} max={60} />
                                    </div>
                                    <ColorPicker selected={lasers.color} onSelect={(c) => updateLasers('color', c)} colors={colors} />
                                </div>
                            )}
                        </div>

                        {/* 3. BLINDERS CONTROL */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 text-white">
                                    <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
                                    <span className="text-sm font-bold">Blinders</span>
                                </div>
                                <Toggle isOn={blinders.on} onClick={() => updateBlinders('on', !blinders.on)} />
                            </div>

                            {blinders.on && (
                                <div className="pl-2 space-y-3 border-l-2 border-white/5 animate-in fade-in slide-in-from-left-2">
                                    <Slider value={blinders.count} onChange={(v) => updateBlinders('count', v)} min={0} max={20} />
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Color: Fixed White</div>
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>

            {/* HERO CONTENT */}
            <div className="relative z-20 h-full min-h-screen flex flex-col items-center justify-center px-4 py-20 pointer-events-none">
                <div className="text-center mb-12 md:mb-16 max-w-5xl pointer-events-auto">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                        <span className="text-white drop-shadow-lg">The Entire Concert</span><br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-cyan-500 to-blue-600 drop-shadow-2xl">
                            Ecosystem. One Platform.
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-cyan-100/60 font-light tracking-wide max-w-2xl mx-auto">
                        From discovery to production.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center w-full max-w-3xl px-4 pointer-events-auto">
                    {roles.map((role) => {
                        const Icon = role.icon;
                        return (
                            <button
                                key={role.label}
                                className="group relative px-8 py-4 rounded-full min-w-[160px] sm:min-w-[180px] backdrop-blur-sm border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(6,182,212,0.4)]"
                                style={{ background: 'linear-gradient(135deg, hsl(200, 80%, 20%) 0%, hsl(190, 80%, 35%) 100%)' }}
                            >
                                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-200/20 to-transparent opacity-50" />
                                <div className="flex items-center gap-3 justify-center relative z-10">
                                    <Icon className="w-5 h-5 text-cyan-50 group-hover:text-white transition-colors" strokeWidth={2} />
                                    <span className="text-base font-semibold text-cyan-50 group-hover:text-white tracking-wide transition-colors">{role.label}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS FOR UI ---

const Toggle = ({ isOn, onClick, label, color = "green" }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all ${isOn
                ? color === "red"
                    ? "bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                    : "bg-green-500/20 text-green-400 border border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                : "bg-gray-800 text-gray-500 border border-white/10 hover:bg-gray-700"
            }`}
    >
        <Power className="w-3 h-3" />
        {label || (isOn ? "ON" : "OFF")}
    </button>
);

const Slider = ({ value, onChange, min, max }) => (
    <div className="flex items-center gap-3">
        <span className="text-[10px] text-gray-500 w-4">{value}</span>
        <input
            type="range" min={min} max={max} value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white hover:accent-gray-200"
        />
    </div>
);

const ColorPicker = ({ selected, onSelect, colors }) => (
    <div className="flex flex-wrap gap-2">
        {colors.map((c) => (
            <button
                key={c.value}
                onClick={() => onSelect(c.value)}
                className={`w-5 h-5 rounded-full border transition-all hover:scale-110 ${selected === c.value ? "border-white scale-110 shadow-md" : "border-transparent opacity-40 hover:opacity-100"
                    }`}
                style={{ backgroundColor: c.value, boxShadow: selected === c.value ? `0 0 10px ${c.value}` : 'none' }}
            />
        ))}
    </div>
);

export default Hero;