'use client';

import { Power, Settings2, Sun, Zap, Music, Play, Square, RotateCcw, X, Lamp, SunDim } from 'lucide-react';

// The basic lighting palette (what a console's colour picker offers), plus a custom picker
const COLORS = [
    { value: '#ff0000', label: 'Red' },
    { value: '#ff6a00', label: 'Orange' },
    { value: '#ffb000', label: 'Amber' },
    { value: '#ffe600', label: 'Yellow' },
    { value: '#9dff00', label: 'Lime' },
    { value: '#00ff3c', label: 'Green' },
    { value: '#00ffc8', label: 'Teal' },
    { value: '#19d9ff', label: 'Cyan' },
    { value: '#0066ff', label: 'Blue' },
    { value: '#3b2bff', label: 'Deep blue' },
    { value: '#a855f7', label: 'Purple' },
    { value: '#ff3df2', label: 'Magenta' },
    { value: '#ff69b4', label: 'Pink' },
    { value: '#ffe8c8', label: 'Warm white' },
    { value: '#ffffff', label: 'White' },
];

const Toggle = ({ on, onClick, label, danger }) => (
    <button
        onClick={onClick}
        aria-pressed={on}
        className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider transition-colors ${on
            ? danger ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.6)]' : 'bg-cyan-400 text-black shadow-[0_0_12px_rgba(34,211,238,0.5)]'
            : 'bg-white/10 text-gray-400'}`}
    >
        {label || (on ? 'ON' : 'OFF')}
    </button>
);

const Slider = ({ label, value, min, max, step = 1, onChange }) => (
    <label className="block text-[11px] text-gray-400">
        <span className="flex justify-between"><span>{label}</span><span className="font-mono text-cyan-300">{Number(value).toFixed(step < 1 ? 2 : 0)}</span></span>
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-cyan-400" />
    </label>
);

const Swatches = ({ value, onChange, label }) => (
    <div className="flex gap-1.5 flex-wrap items-center" role="group" aria-label={label}>
        {COLORS.map((c) => (
            <button key={c.value} onClick={() => onChange(c.value)} aria-label={`${label}: ${c.label}`} title={c.label}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${value === c.value ? 'border-white scale-110' : 'border-white/10'}`}
                style={{ background: c.value }} />
        ))}
        {/* Any other colour */}
        <label title="Custom colour" className="relative w-5 h-5 rounded-full border-2 border-white/40 overflow-hidden cursor-pointer"
            style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}>
            <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label}: custom`}
                className="absolute inset-0 opacity-0 cursor-pointer" />
        </label>
    </div>
);

const Section = ({ icon: Icon, title, right, children }) => (
    <div className="space-y-2.5 py-3 border-t border-white/5 first:border-t-0">
        <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-sm font-bold text-white"><Icon className="w-4 h-4 text-cyan-300" />{title}</span>
            {right}
        </div>
        {children}
    </div>
);

/**
 * The lighting desk. Touching any control takes the lights over (manual mode) until
 * "Resume show". `desk` is the look being shown, `counts` the fixture counts.
 */
export default function LightingDesk({ open, onOpenChange, desk, counts, manual, onChange, onCounts, onMomentary, onResume, song }) {
    if (!open) {
        return (
            <button onClick={() => onOpenChange(true)}
                className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/70 backdrop-blur border border-white/15 text-white text-sm font-bold hover:border-cyan-400 hover:text-cyan-300 transition-colors">
                <Settings2 className="w-4 h-4" /> Lighting desk
            </button>
        );
    }

    const set = (patch) => onChange(patch);

    return (
        <div className="pointer-events-auto w-[calc(100vw-2rem)] sm:w-80 max-h-[70vh] overflow-y-auto rounded-2xl bg-black/85 backdrop-blur-xl border border-white/10 p-4 text-white shadow-2xl">
            <div className="flex items-center justify-between mb-1">
                <div>
                    <div className="text-sm font-black tracking-widest text-cyan-300">LIGHTING DESK</div>
                    <div className="text-[11px] text-gray-400">{manual ? 'You have the lights' : 'Touch any control to take over'}</div>
                </div>
                <button onClick={() => onOpenChange(false)} aria-label="Close lighting desk" className="p-1.5 rounded-full hover:bg-white/10"><X className="w-4 h-4" /></button>
            </div>

            {manual && (
                <button onClick={onResume}
                    className="w-full my-2 flex items-center justify-center gap-2 py-2 rounded-lg bg-cyan-400 text-black text-xs font-bold">
                    <RotateCcw className="w-3.5 h-3.5" /> Resume show
                </button>
            )}

            <Section icon={Power} title="Master" right={<Toggle on={desk.master > 0.5} danger label={desk.master > 0.5 ? 'SYSTEM ON' : 'BLACKOUT'} onClick={() => set({ master: desk.master > 0.5 ? 0 : 1 })} />}>
                <Slider label="Intensity" value={desk.intensity} min={0} max={2} step={0.05} onChange={(v) => set({ intensity: v })} />
            </Section>

            <Section icon={Sun} title="Moving heads">
                <div className="grid grid-cols-2 gap-1.5">
                    {[['beams', 'Aerial beams'], ['sides', 'Side towers'], ['floor', 'Floor'], ['wash', 'Stage wash']].map(([key, label]) => (
                        <button key={key} onClick={() => set({ [key]: desk[key] > 0.05 ? 0 : 1 })} aria-pressed={desk[key] > 0.05}
                            className={`py-1.5 rounded-md text-[11px] font-bold ${desk[key] > 0.05 ? 'bg-cyan-400 text-black' : 'bg-white/10 text-gray-400'}`}>
                            {label}
                        </button>
                    ))}
                </div>
                <Slider label="Count" value={counts.beams} min={10} max={100} onChange={(v) => onCounts({ beams: v })} />
                <Slider label="Spread" value={desk.fan ?? 1} min={0.3} max={1.6} step={0.01} onChange={(v) => set({ fan: v })} />
                <Slider label="Tilt" value={desk.tiltShift ?? 0} min={-0.6} max={0.8} step={0.01} onChange={(v) => set({ tiltShift: v })} />
                <Slider label="Sweep" value={desk.sweep} min={0} max={1} step={0.01} onChange={(v) => set({ sweep: v })} />
                <Slider label="Wave (0 = unison)" value={desk.phaseSpread ?? 0.25} min={0} max={1} step={0.01} onChange={(v) => set({ phaseSpread: v })} />
                <Slider label="Speed" value={desk.speed} min={0} max={3} step={0.05} onChange={(v) => set({ speed: v })} />
                <Slider label="Haze" value={desk.haze} min={0} max={1} step={0.01} onChange={(v) => set({ haze: v })} />
                <Swatches label="Beam colour A" value={desk.colorA} onChange={(c) => set({ colorA: c })} />
                <Swatches label="Beam colour B" value={desk.colorB} onChange={(c) => set({ colorB: c })} />
                <Swatches label="Wash colour" value={desk.washColor} onChange={(c) => set({ washColor: c, wash: Math.max(desk.wash, 1) })} />
            </Section>

            <Section icon={Zap} title="Lasers" right={<Toggle on={desk.laser > 0.05} onClick={() => set({ laser: desk.laser > 0.05 ? 0 : 1 })} />}>
                <Slider label="Count" value={counts.lasers} min={2} max={60} onChange={(v) => onCounts({ lasers: v })} />
                <Swatches label="Laser colour" value={desk.laserColor} onChange={(c) => set({ laserColor: c, laser: Math.max(desk.laser, 1) })} />
            </Section>

            <Section icon={Lamp} title="House lights" right={<Toggle on={desk.house > 0.05} onClick={() => set({ house: desk.house > 0.05 ? 0 : 1 })} />} />

            <Section icon={SunDim} title="Blinders" right={<Toggle on={desk.blinder > 0.05} onClick={() => set({ blinder: desk.blinder > 0.05 ? 0 : 1 })} />}>
                <Slider label="Count" value={counts.blinders} min={1} max={20} onChange={(v) => onCounts({ blinders: v })} />
            </Section>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5">
                <button
                    onPointerDown={() => onMomentary({ strobe: 1 }, true)}
                    onPointerUp={() => onMomentary({ strobe: 0 }, false)}
                    onPointerLeave={() => onMomentary({ strobe: 0 }, false)}
                    className="py-3 rounded-lg bg-white/10 active:bg-white active:text-black text-xs font-black tracking-widest select-none touch-none">
                    STROBE <span className="block text-[9px] font-normal text-gray-400">hold</span>
                </button>
                <button onClick={() => onMomentary({ converge: 1, intensity: 1.6, strobe: 1, blinder: 1, dropFx: 1, laserChase: 1 }, 'pulse')}
                    className="py-3 rounded-lg bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-black text-xs font-black tracking-widest">
                    DROP
                </button>
            </div>

            {song.available && (
                <Section icon={Music} title="Concert mode">
                    <p className="text-[11px] text-gray-400">{song.title}: a light show programmed from the song&apos;s beats and sections.</p>
                    <button onClick={song.playing ? song.stop : song.play}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold">
                        {song.playing ? <><Square className="w-3.5 h-3.5" /> Stop</> : <><Play className="w-3.5 h-3.5" /> Play with sound</>}
                    </button>
                </Section>
            )}
        </div>
    );
}
