'use client';

import { useState, useRef, useEffect } from 'react';
import { PlayCircle, ChevronsRight, Vote, MousePointer2, Bell, Send, AlertTriangle, Ban, Check } from 'lucide-react';

export default function ActionGrid({ status, onStartShow, onEncorePoll, onWarning, onEmergency }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-[400px]">

            {/* 1. START SHOW (Slider) */}
            <ActionCard
                icon={PlayCircle}
                iconColor="text-[#0d93f2]"
                bgIcon="bg-[#0d93f2]/10"
                label="Master Control"
                title="Start Show"
                desc="Alerts production & lighting desk. Initiates Intro Sequence 01."
            >
                {status === 'Live' ? (
                    <div className="w-full h-14 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center gap-2 text-green-500 font-bold uppercase tracking-wider text-sm">
                        <Check className="w-5 h-5" /> Show is Live
                    </div>
                ) : (
                    <SlideToConfirm onConfirm={onStartShow} />
                )}
            </ActionCard>

            {/* 2. ENCORE POLL */}
            <ActionCard
                icon={Vote}
                iconColor="text-purple-500"
                bgIcon="bg-purple-500/10"
                label="Fan Interaction"
                title="Trigger Encore Poll"
                desc="Activates 'Live Pulse' system. Audience votes for the final track."
            >
                <SimpleButton
                    icon={MousePointer2}
                    label="Activate Poll"
                    onClick={onEncorePoll}
                />
            </ActionCard>

            {/* 3. 5 MIN WARNING */}
            {/* 3. LAST SONG ALERT (Replaces 5 Min Warning) */}
            <ActionCard
                icon={Bell}
                iconColor="text-orange-500"
                bgIcon="bg-orange-500/10"
                label="Communication"
                title="Last Song Alert"
                desc="Notify Stage, Pyro, and House Lights: Finale approaching."
            >
                <SimpleButton
                    icon={Send}
                    label="Send 'Last Song' Call"
                    onClick={onWarning}
                />
            </ActionCard>

            {/* 4. EMERGENCY PAUSE */}
            <div className={`p-1 rounded-xl border flex flex-col relative overflow-hidden transition-colors ${status === 'Paused' ? 'bg-red-500/10 border-red-500' : 'bg-white dark:bg-[#15232d] border-red-900/30'}`}>
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <AlertTriangle className="w-[120px] h-[120px] text-red-500" />
                </div>
                <div className="flex-1 p-5 flex flex-col justify-between relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-500/10 rounded-lg text-red-500">
                            <Ban className="w-8 h-8" />
                        </div>
                        <span className="text-xs font-bold text-red-500/50 uppercase tracking-widest">Emergency</span>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-red-500 uppercase mb-2">
                            {status === 'Paused' ? 'Show Paused' : 'Technical Pause'}
                        </h3>
                        <p className="text-slate-500 dark:text-[#90b2cb] text-sm leading-relaxed">Cuts audio, brings up house lights partially. Use only in emergencies.</p>
                    </div>
                </div>
                <div className="bg-red-500/5 p-4 rounded-b-lg border-t border-red-500/20 relative z-10">
                    <button
                        onClick={onEmergency}
                        className={`w-full h-14 border-2 rounded-lg font-bold uppercase tracking-wider text-sm transition-all flex items-center justify-center gap-2
              ${status === 'Paused'
                                ? 'bg-red-500 text-white border-red-500 animate-pulse'
                                : 'bg-transparent border-red-500/50 hover:bg-red-500 hover:text-white text-red-500'
                            }`}
                    >
                        <Ban className="w-5 h-5" />
                        {status === 'Paused' ? 'Resume Show (Hold)' : 'Emergency Pause'}
                    </button>
                </div>
            </div>

        </div>
    );
}

// --- CUSTOM SLIDER COMPONENT ---
function SlideToConfirm({ onConfirm }) {
    const [sliderWidth, setSliderWidth] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef(null);

    const handleMouseDown = (e) => {
        setIsDragging(true);
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        // Limit slide between 0 and max width
        const newWidth = Math.max(0, Math.min(offsetX, rect.width));
        setSliderWidth(newWidth);
    };

    const handleMouseUp = () => {
        if (!isDragging || !containerRef.current) return;
        setIsDragging(false);

        // Threshold to confirm (e.g., 90%)
        if (sliderWidth > containerRef.current.offsetWidth * 0.9) {
            onConfirm();
        }
        setSliderWidth(0); // Reset
    };

    // Add global event listeners for drag release outside element
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('mousemove', handleMouseMove);
        } else {
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mousemove', handleMouseMove);
        }
        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [isDragging, sliderWidth]);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-14 rounded-lg overflow-hidden border border-[#0d93f2]/30 bg-[#0d93f2]/5 select-none cursor-pointer"
        >
            {/* Dragged Background */}
            <div
                style={{ width: `${sliderWidth}px` }}
                className="absolute inset-y-0 left-0 bg-[#0d93f2] transition-all duration-75 ease-linear"
            ></div>

            {/* Slider Handle (The Arrow) */}
            <div
                onMouseDown={handleMouseDown}
                style={{ left: `${sliderWidth}px` }}
                className="absolute inset-y-0 w-14 bg-[#0d93f2] flex items-center justify-center cursor-grab active:cursor-grabbing hover:brightness-110 shadow-xl z-10 transition-all duration-75 ease-linear"
            >
                <ChevronsRight className="text-white w-6 h-6" />
            </div>

            {/* Text Label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <span className="pl-10 text-[#0d93f2] font-bold uppercase tracking-wider text-sm opacity-80">
                    Slide to Start
                </span>
            </div>
        </div>
    );
}

// --- HELPER COMPONENTS ---
function ActionCard({ children, icon: Icon, iconColor, bgIcon, label, title, desc }) {
    return (
        <div className="bg-white dark:bg-[#15232d] p-1 rounded-xl border border-slate-200 dark:border-[#223949] flex flex-col">
            <div className="flex-1 p-5 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-lg ${bgIcon} ${iconColor}`}>
                        <Icon className="w-8 h-8" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 dark:text-[#587386] uppercase tracking-widest">{label}</span>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white uppercase mb-2">{title}</h3>
                    <p className="text-slate-500 dark:text-[#90b2cb] text-sm leading-relaxed">{desc}</p>
                </div>
            </div>
            <div className="bg-slate-50 dark:bg-[#101b23] p-4 rounded-b-lg border-t border-slate-100 dark:border-[#223949]">
                {children}
            </div>
        </div>
    );
}

function SimpleButton({ icon: Icon, label, onClick }) {
    return (
        <button
            onClick={onClick}
            className="w-full h-14 bg-[#223949] hover:bg-[#2c4759] text-white rounded-lg font-bold uppercase tracking-wider text-sm transition-all flex items-center justify-center gap-2 active:scale-95"
        >
            <Icon className="w-5 h-5" />
            {label}
        </button>
    );
}