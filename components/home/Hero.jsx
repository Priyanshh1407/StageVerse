'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // 1. Import useRouter
import { Users, Calendar, Wrench, Power, Settings2, Sun, Zap, Music } from 'lucide-react';
import { motion } from 'framer-motion';import { ConcertLights } from '@/components/ConcertLights';
import hero from '@/public/images/hero.jpg';

export default function Hero() {
    const router = useRouter();
    const [showControls, setShowControls] = useState(false);

    const [masterOn, setMasterOn] = useState(true);

    const [beams, setBeams] = useState({
        on: false,
        count: 6,
        color: "#06b6d4" // Cyan
    });    const [blinders, setBlinders] = useState({
        on: false,
        count: 8
    });    const [lasers, setLasers] = useState({
        on: false,
        count: 30,
        color: "#39ff14" // Laser Green
    });    const updateBeams = (key, val) => setBeams(prev => ({ ...prev, [key]: val }));
    const updateBlinders = (key, val) => setBlinders(prev => ({ ...prev, [key]: val }));
    const updateLasers = (key, val) => setLasers(prev => ({ ...prev, [key]: val }));

    const roles = [
        { icon: Users, label: "Fan" },
        { icon: Calendar, label: "Organizer" },
        { icon: Wrench, label: "Crew" },
        { icon: Music, label: "Artist" },
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
        <section className="relative w-full h-screen bg-black overflow-hidden font-sans">

            {}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 z-10" />
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-85"
                    style={{ backgroundImage: `url("${hero.src}")` }}
                />

                {}
                <div className="absolute inset-0 z-10 pointer-events-none">
                    <ConcertLights
                        masterOn={masterOn}
                        beams={beams}
                        blinders={blinders}
                        lasers={lasers}
                    />
                </div>
            </div>

            {}
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
                        w-72 sm:w-80 
                        animate-in slide-in-from-bottom-5 fade-in duration-300 
                        max-h-[60vh] sm:max-h-[80vh]
                        overflow-y-auto custom-scrollbar
                    ">

                        {}
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                            <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Master Control</span>
                            <Toggle
                                isOn={masterOn}
                                onClick={() => setMasterOn(!masterOn)}
                                label={masterOn ? "SYSTEM ON" : "OFF"}
                                color="red"
                            />
                        </div>

                        {}
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

                        {}
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

                        {}
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
            </div>            import {motion} from 'framer-motion';

            {}
            <div className="relative z-20 h-full flex flex-col items-center justify-center px-4 py-20 pointer-events-none">
                <div className="text-center mb-12 md:mb-16 max-w-5xl pointer-events-auto mt-20">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    >
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold mb-6 leading-[1.1] tracking-tight">
                            <span className="text-white drop-shadow-2xl">The Entire Concert</span><br />
                            <motion.span
                                initial={{ backgroundPosition: "0% 50%" }}
                                animate={{ backgroundPosition: "100% 50%" }}
                                transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
                                className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-cyan-500 to-blue-600 drop-shadow-2xl bg-[length:200%_auto]"
                            >
                                Ecosystem. One Platform.
                            </motion.span>
                        </h1>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="text-lg md:text-2xl text-cyan-100/80 font-light tracking-wide max-w-2xl mx-auto drop-shadow-md"
                    >
                        From discovery to production. Join the revolution in live events.
                    </motion.p>
                </div>

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: {
                                staggerChildren: 0.15,
                                delayChildren: 0.8
                            }
                        }
                    }}
                    className="flex flex-col items-center gap-4 justify-center w-full max-w-5xl px-4 pointer-events-auto lg:flex-row lg:gap-6 pb-24 lg:pb-0"
                >
                    {roles.map((role) => {
                        const Icon = role.icon;
                        return (
                            <motion.button
                                key={role.label}
                                variants={{
                                    hidden: { opacity: 0, y: 30 },
                                    visible: { opacity: 1, y: 0 }
                                }}
                                whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(6, 182, 212, 0.4)" }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => router.push('/login')}
                                className="w-full max-w-xs lg:w-auto lg:max-w-none group relative px-8 py-4 rounded-full min-w-[160px] sm:min-w-[180px] backdrop-blur-md border border-white/10 transition-all duration-300 hover:bg-cyan-500 hover:border-cyan-400 hover:text-black"
                                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)' }}
                            >
                                <div className="flex items-center gap-3 justify-center relative z-10">
                                    <Icon className="w-6 h-6 text-white group-hover:text-black transition-colors" />
                                    <span className="text-lg font-bold text-white group-hover:text-black tracking-wide transition-colors">{role.label}</span>
                                </div>
                            </motion.button>
                        );
                    })}
                </motion.div>
            </div>
        </section>
    );
};

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