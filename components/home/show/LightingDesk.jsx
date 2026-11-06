'use client';

import { BEAM_COUNTS } from '@/components/home/stage/useQualityTier';
import { Settings2, Music, Play, Square, RotateCcw, X } from 'lucide-react';

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

// One channel per fixture type: an on/off switch and a flash (bump) button. `on` is the level the
// switch sets (the random strobes light a share of the strobes)
const CHANNELS = [
    { key: 'beams', label: 'Aerials' },
    { key: 'sides', label: 'Towers' },
    { key: 'floor', label: 'Floor' },
    { key: 'wash', label: 'Wash' },
    { key: 'pixel', label: 'LED bars' },
    { key: 'laser', label: 'Lasers' },
    { key: 'strobeRandom', label: 'Strobes', on: 0.3, flash: 0.6 },
];
const dmx = (v, max = 1) => Math.round(Math.max(0, Math.min(1, (v ?? 0) / max)) * 255);

/** A vertical channel fader with its DMX value on top and a flash (bump) button below. */
const Fader = ({ label, value, max = 1, onChange, onFlash, onRelease, accent = 'cyan' }) => (
    <div className="flex flex-col items-center gap-1.5 w-12 shrink-0">
        <span className={`font-mono text-[10px] tabular-nums ${accent === 'red' ? 'text-red-300' : 'text-cyan-300'}`}>{dmx(value, max)}</span>
        <input type="range" min={0} max={max} step={max / 255} value={value ?? 0} aria-label={`${label} level`} aria-valuetext={`${dmx(value, max)} of 255`}
            onChange={(e) => onChange(Number(e.target.value))}
            className={`h-28 w-6 cursor-pointer [writing-mode:vertical-lr] [direction:rtl] ${accent === 'red' ? 'accent-red-400' : 'accent-cyan-400'}`} />
        {onFlash ? (
            <button onPointerDown={onFlash} onPointerUp={onRelease} onPointerLeave={onRelease} aria-label={`Flash ${label}`}
                className="w-full py-1 rounded bg-white/10 hover:bg-white/20 active:bg-yellow-300 active:text-black text-[9px] font-black tracking-wider select-none touch-none">
                FLASH
            </button>
        ) : <span className="h-[22px]" />}
        <span className="text-[9px] uppercase tracking-wider text-gray-400 text-center leading-tight">{label}</span>
    </div>
);

/** A horizontal parameter control (a console's encoder), with its value. */
/** A fixture channel: its on/off switch and, below it, a flash (bump) button. */
const Channel = ({ label, on, onToggle, onFlash, onRelease }) => (
    <div className="flex flex-col gap-1 min-w-0">
        <button onClick={onToggle} aria-pressed={on} aria-label={`${label} ${on ? 'on' : 'off'}`}
            className={`rounded py-2 text-[10px] font-black tracking-wider transition-colors ${on ? 'bg-cyan-400 text-black shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-white/10 text-gray-400 hover:bg-white/15'}`}>
            {on ? 'ON' : 'OFF'}
        </button>
        <button onPointerDown={onFlash} onPointerUp={onRelease} onPointerLeave={onRelease} aria-label={`Flash ${label}`}
            className="rounded py-1 bg-white/10 hover:bg-white/20 active:bg-yellow-300 active:text-black text-[9px] font-black tracking-wider select-none touch-none">
            FLASH
        </button>
        <span className="text-[9px] uppercase tracking-wider text-gray-400 text-center leading-tight truncate">{label}</span>
    </div>
);

const Encoder = ({ label, hint, value, min, max, step = 0.01, onChange }) => (
    <label className="block text-[10px] text-gray-400">
        <span className="flex justify-between gap-2"><span>{label}{hint && <span className="text-gray-500"> · {hint}</span>}</span><span className="font-mono text-cyan-300">{Number(value ?? 0).toFixed(step < 1 ? 2 : 0)}</span></span>
        <input type="range" min={min} max={max} step={step} value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-cyan-400" />
    </label>
);

const Swatches = ({ value, onChange, label }) => (
    <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-[10px] text-gray-400">{label}</span>
        <div className="flex gap-1 flex-wrap items-center" role="group" aria-label={label}>
            {COLORS.map((c) => (
                <button key={c.value} onClick={() => onChange(c.value)} aria-label={`${label}: ${c.label}`} title={c.label}
                    className={`w-4 h-4 rounded-sm border transition-transform ${value === c.value ? 'border-white scale-125' : 'border-white/10'}`}
                    style={{ background: c.value }} />
            ))}
            <label title="Custom colour" className="relative w-4 h-4 rounded-sm border border-white/40 overflow-hidden cursor-pointer"
                style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}>
                <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label}: custom`}
                    className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
        </div>
    </div>
);

const Panel = ({ title, children, className = '' }) => (
    <section className={`rounded-lg border border-white/10 bg-white/[0.03] p-2.5 ${className}`}>
        <h3 className="mb-2 font-mono text-[10px] tracking-[0.25em] text-gray-400">{title}</h3>
        {children}
    </section>
);

const Key = ({ on, onClick, children, danger }) => (
    <button onClick={onClick} aria-pressed={on}
        className={`px-2 py-1.5 rounded text-[10px] font-bold tracking-wide transition-colors ${on
            ? danger ? 'bg-red-500 text-white' : 'bg-cyan-400 text-black'
            : 'bg-white/10 text-gray-300 hover:bg-white/15'}`}>
        {children}
    </button>
);

/**
 * The lighting desk, laid out like a DMX console (item 8): a grand master fader (DMX 0-255) with
 * blackout, an on/off switch and a flash button per fixture type, then the programmer
 * (position, effects, colour), the lasers and rig, and playback (strobe, the three drops, CO2 jets, confetti, streamers).
 * Touching any control takes the lights over (manual mode) until "Resume show". `desk` is the
 * look being shown, `counts` the fixture counts.
 */
// The pattern buttons next to each special effect's hold button
const ROW_PATTERNS = [
    ['chase', 'Chase', 'left to right and back'],
    ['outside-in', 'Outside in', 'outer, middle, inner'],
];
const CANNON_PATTERNS = [
    ['burst', 'Big burst', 'every cannon'],
    ['sweep', 'Sweep', 'left to right'],
];
// The fireworks the desk fires: [type, label, hint]
const SHELL_BUTTONS = [
    ['peony', 'Peony', 'a ball of stars'],
    ['chrysanthemum', 'Chrysanthemum', 'sparkling trails'],
    ['willow', 'Willow', 'golden rain'],
    ['palm', 'Palm', 'thick arms'],
    ['ring', 'Ring', 'a tilted ring'],
    ['crossette', 'Crossette', 'stars that split'],
    ['glitter', 'Glitter', 'crackling silver'],
];
const STAGE_BUTTONS = [
    ['comets', 'Roof comets', 'V and W fans'],
    ['mines', 'Mines', 'from the stage front'],
    ['candles', 'Roman candles', 'a chase on the truss'],
    ['chase', 'Comet chase', 'one by one: a V or a W'],
];
// Every special effect the desk fires, for the EVERYTHING row
const ALL_EFFECTS = ['co2', 'co2Truss', 'confetti', 'streamers'];

export default function LightingDesk({ open, onOpenChange, desk, counts, manual, onChange, onCounts, onMomentary, onResume, onDrop, onEffect, onEffectHold, onFirework, onFinale, fwOptions, onFwOptions, song }) {
    if (!open) {
        return (
            <button onClick={() => onOpenChange(true)}
                className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/80 border border-white/15 text-white text-sm font-bold hover:border-cyan-400 hover:text-cyan-300 transition-colors">
                <Settings2 className="w-4 h-4" /> Lighting desk
            </button>
        );
    }

    const set = (patch) => onChange(patch);
    const flash = (key, level = 1) => () => onMomentary({ [key]: level }, true);
    const release = (key) => () => onMomentary({ [key]: desk[key] ?? 0 }, false);

    return (
        <div className="pointer-events-auto w-[calc(100vw-2rem)] sm:w-[36rem] max-h-[78vh] overflow-y-auto overscroll-contain rounded-xl bg-[#07090d]/95 border border-white/15 px-3 pb-3 text-white shadow-2xl">
            {/* Console header, pinned: Resume is always in reach */}
            <div className="sticky top-0 z-10 -mx-3 px-3 pt-3 pb-2.5 mb-0.5 bg-[#07090d] flex items-center justify-between gap-3">
                <div>
                    <div className="font-mono text-xs font-black tracking-[0.3em] text-cyan-300">STAGEVERSE CONSOLE</div>
                    <div className="font-mono text-[10px] text-gray-500">DMX UNIVERSE 1 · {manual ? 'DESK LIVE' : 'SHOW RUNNING · touch any control to take over'}</div>
                </div>
                <div className="flex items-center gap-2">
                    {manual && (
                        <button onClick={onResume} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-cyan-400 text-black text-[10px] font-bold">
                            <RotateCcw className="w-3 h-3" /> Resume show
                        </button>
                    )}
                    <button onClick={() => onOpenChange(false)} aria-label="Close lighting desk" className="p-1.5 rounded hover:bg-white/10"><X className="w-4 h-4" /></button>
                </div>
            </div>

            {/* Master and the fixture channels */}
            <Panel title="FIXTURES">
                <div className="flex gap-3">
                    <div className="flex flex-col items-center gap-1.5 pr-3 border-r border-white/10">
                        <Fader label="Grand master" value={desk.intensity} max={2} accent="red" onChange={(v) => set({ intensity: v })} />
                        <button onClick={() => set({ master: desk.master > 0.5 ? 0 : 1 })} aria-pressed={desk.master < 0.5}
                            className={`w-12 py-1 rounded text-[9px] font-black ${desk.master < 0.5 ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-300'}`}>
                            {desk.master < 0.5 ? 'BO ON' : 'BLACKOUT'}
                        </button>
                    </div>
                    <div className="grid grid-cols-4 gap-x-2 gap-y-3 flex-1 content-start">
                        {CHANNELS.map((ch) => {
                            const on = (desk[ch.key] ?? 0) > 0.02;
                            return (
                                <Channel key={ch.key} label={ch.label} on={on} onToggle={() => set({ [ch.key]: on ? 0 : ch.on ?? 1 })}
                                    onFlash={flash(ch.key, ch.flash ?? 1)} onRelease={release(ch.key)} />
                            );
                        })}
                    </div>
                </div>
            </Panel>

            <div className="grid sm:grid-cols-2 gap-2 mt-2">
                <Panel title="POSITION">
                    <div className="space-y-1.5">
                        <Encoder label="Spread" hint="side to side" value={desk.fan ?? 1} min={0.2} max={3} onChange={(v) => set({ fan: v })} />
                        <Encoder label="Tilt" hint="up and down" value={desk.tiltShift ?? 0} min={-0.6} max={0.8} onChange={(v) => set({ tiltShift: v })} />
                    </div>
                </Panel>
                <Panel title="EFFECTS">
                    <div className="space-y-1.5">
                        <Encoder label="Sweep" value={desk.sweep} min={0} max={1} onChange={(v) => set({ sweep: v })} />
                        <Encoder label="Speed" value={desk.speed} min={0} max={3} step={0.05} onChange={(v) => set({ speed: v })} />
                        <Encoder label="Wave" hint="0 = unison" value={desk.phaseSpread ?? 0.25} min={0} max={1} onChange={(v) => set({ phaseSpread: v })} />
                        <Encoder label="Wave height" hint="up and down" value={desk.tiltWave ?? 0} min={0} max={0.5} onChange={(v) => set({ tiltWave: v })} />
                        <Encoder label="Haze" value={desk.haze} min={0} max={1} onChange={(v) => set({ haze: v })} />
                    </div>
                </Panel>
            </div>

            <Panel title="COLOUR" className="mt-2">
                <div className="space-y-1.5">
                    <Swatches label="Beams A" value={desk.colorA} onChange={(c) => set({ colorA: c })} />
                    <Swatches label="Beams B" value={desk.colorB} onChange={(c) => set({ colorB: c })} />
                    <Swatches label="Wash" value={desk.washColor} onChange={(c) => set({ washColor: c, wash: Math.max(desk.wash, 1) })} />
                    <Swatches label="Lasers" value={desk.laserColor} onChange={(c) => set({ laserColor: c, laser: Math.max(desk.laser, 1) })} />
                </div>
            </Panel>

            <div className="grid sm:grid-cols-2 gap-2 mt-2">
                <Panel title="LASERS">
                    <div className="grid grid-cols-2 gap-1 mb-2">
                        {[['laserFloor', 'Floor'], ['laserTower', 'Towers'], ['laserSeq', 'One by one'], ['laserCount', 'Breathing']].map(([key, label]) => {
                            const on = (desk[key] ?? (key === 'laserCount' ? 0 : 1)) > 0.5;
                            return <Key key={key} on={on} onClick={() => set({ [key]: on ? 0 : 1 })}>{label}</Key>;
                        })}
                    </div>
                    <Encoder label="Height" hint="low to high" value={desk.laserTilt ?? 0} min={-0.3} max={0.4} onChange={(v) => set({ laserTilt: v })} />
                    <Encoder label="Projector beams" value={counts.lasers} min={2} max={60} step={1} onChange={(v) => onCounts({ lasers: v })} />
                </Panel>
                <Panel title="RIG">
                    <div className="text-[10px] text-gray-400 mb-1">Moving heads</div>
                    <div className="grid grid-cols-3 gap-1 mb-2">
                        {BEAM_COUNTS.map((n, i) => (
                            <Key key={n} on={counts.beams === n} onClick={() => onCounts({ beams: n })}>
                                {n}<span className="block text-[8px] font-normal opacity-70">{['full rig', 'bigger', 'extreme'][i]}</span>
                            </Key>
                        ))}
                    </div>
                    <Encoder label="Strobe changes / s" value={desk.strobeRandomRate ?? 2} min={0.5} max={8} step={0.1} onChange={(v) => set({ strobeRandomRate: v })} />
                    <Encoder label="Blinders" value={counts.blinders} min={1} max={20} step={1} onChange={(v) => onCounts({ blinders: v })} />
                    <div className="grid grid-cols-2 gap-1 mt-1.5">
                        <Key on={desk.house > 0.05} onClick={() => set({ house: desk.house > 0.05 ? 0 : 1 })}>House lights</Key>
                        <Key on={desk.blinder > 0.05} onClick={() => set({ blinder: desk.blinder > 0.05 ? 0 : 1 })}>Blinders on</Key>
                    </div>
                </Panel>
            </div>

            {/* Playback: the hits */}
            <Panel title="PLAYBACK" className="mt-2">
                <div className="grid grid-cols-4 gap-1.5">
                    <button
                        onPointerDown={() => onMomentary({ strobe: 1 }, true)}
                        onPointerUp={() => onMomentary({ strobe: 0 }, false)}
                        onPointerLeave={() => onMomentary({ strobe: 0 }, false)}
                        className="py-2.5 rounded bg-white/10 active:bg-white active:text-black text-[11px] font-black tracking-widest select-none touch-none">
                        STROBE <span className="block text-[9px] font-normal text-gray-400">hold</span>
                    </button>
                    {[
                        ['spool', 'Laser spool', 'lasers open, then all in'],
                        ['slam', 'Slam', 'blackout, then everything'],
                        ['burst', 'Burst', 'pinch, then explode out'],
                    ].map(([style, label, hint]) => (
                        <button key={style} onClick={() => onDrop(style)}
                            className="py-2 px-1 rounded bg-gradient-to-b from-fuchsia-500/90 to-fuchsia-700/90 hover:from-fuchsia-400 text-white text-[11px] font-black tracking-wide">
                            DROP · {label.toUpperCase()}
                            <span className="block text-[9px] font-normal text-white/75 leading-tight">{hint}</span>
                        </button>
                    ))}
                </div>
                {/* Everything at once: to see the whole look and feel */}
                <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="font-mono text-[9px] tracking-[0.25em] text-gray-500 mb-1.5">EVERYTHING</div>
                    <div className="grid grid-cols-2 gap-1.5">
                        <button
                            onPointerDown={() => ALL_EFFECTS.forEach((k) => onEffectHold(k, true))}
                            onPointerUp={() => ALL_EFFECTS.forEach((k) => onEffectHold(k, false))}
                            onPointerLeave={() => ALL_EFFECTS.forEach((k) => onEffectHold(k, false))}
                            onPointerCancel={() => ALL_EFFECTS.forEach((k) => onEffectHold(k, false))}
                            className="py-2.5 rounded bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-300 active:from-white active:to-white text-black text-[11px] font-black tracking-widest select-none touch-none">
                            ALL EFFECTS <span className="block text-[9px] font-normal text-black/60">hold</span>
                        </button>
                        <button onClick={() => ALL_EFFECTS.forEach((k) => onEffect(k, 'burst'))}
                            className="py-2 px-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-black tracking-wide">
                            ALL · AT ONCE
                            <span className="block text-[9px] font-normal text-gray-400 leading-tight">one burst of each</span>
                        </button>
                    </div>
                </div>
                {/* Special effects: hold to keep every unit firing, or a pattern across the units */}
                {[
                    { kind: 'co2', title: 'CO2 JETS', hold: 'CO2 BLAST', name: 'CO2', className: 'from-sky-200/90 to-slate-400/90 active:from-white active:to-white text-black', hintClass: 'text-black/60' },
                    { kind: 'co2Truss', title: 'CO2 ON THE TRUSS', hold: 'TRUSS BLAST', name: 'TRUSS', className: 'from-sky-200/90 to-slate-400/90 active:from-white active:to-white text-black', hintClass: 'text-black/60' },
                    { kind: 'confetti', title: 'CONFETTI', hold: 'CONFETTI', name: 'CONFETTI', patterns: CANNON_PATTERNS, holdHint: 'hold: keeps pouring', className: 'from-fuchsia-300 to-cyan-300 active:from-white active:to-white text-black', hintClass: 'text-black/60' },
                    { kind: 'streamers', title: 'STREAMERS', hold: 'STREAMERS', name: 'STREAMERS', patterns: CANNON_PATTERNS, holdHint: 'hold for more', className: 'from-amber-200 to-slate-300 active:from-white active:to-white text-black', hintClass: 'text-black/60' },
                ].map((fx) => (
                    <div key={fx.kind} className="mt-2 pt-2 border-t border-white/10">
                        <div className="font-mono text-[9px] tracking-[0.25em] text-gray-500 mb-1.5">{fx.title}</div>
                        <div className="grid grid-cols-3 gap-1.5">
                            <button
                                onPointerDown={() => onEffectHold(fx.kind, true)}
                                onPointerUp={() => onEffectHold(fx.kind, false)}
                                onPointerLeave={() => onEffectHold(fx.kind, false)}
                                onPointerCancel={() => onEffectHold(fx.kind, false)}
                                className={`py-2.5 rounded bg-gradient-to-b ${fx.className} text-[11px] font-black tracking-widest select-none touch-none`}>
                                {fx.hold} <span className={`block text-[9px] font-normal ${fx.hintClass}`}>{fx.holdHint ?? 'hold'}</span>
                            </button>
                            {(fx.patterns ?? ROW_PATTERNS).map(([pattern, label, hint]) => (
                                <button key={pattern} onClick={() => onEffect(fx.kind, pattern)}
                                    className="py-2 px-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-black tracking-wide">
                                    {fx.name} · {label.toUpperCase()}
                                    <span className="block text-[9px] font-normal text-gray-400 leading-tight">{hint}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </Panel>

            {/* Fireworks: shells in the sky behind the stage, pyro on the stage, and the finale */}
            <Panel title="FIREWORKS" className="mt-2">
                <div className="font-mono text-[9px] tracking-[0.25em] text-gray-500 mb-1.5">SHELLS</div>
                <div className="grid grid-cols-4 gap-1.5">
                    {SHELL_BUTTONS.map(([type, label, hint]) => (
                        <button key={type} onClick={() => onFirework(type)}
                            className="py-2 px-1 rounded bg-white/10 hover:bg-white/20 text-[10px] font-black tracking-wide">
                            {label.toUpperCase()}
                            <span className="block text-[9px] font-normal text-gray-400 leading-tight">{hint}</span>
                        </button>
                    ))}
                </div>
                <div className="font-mono text-[9px] tracking-[0.25em] text-gray-500 mt-2 mb-1.5">STAGE PYRO</div>
                <div className="grid grid-cols-2 gap-1.5">
                    {STAGE_BUTTONS.map(([type, label, hint]) => (
                        <button key={type} onClick={() => onFirework(type)}
                            className="py-2 px-1 rounded bg-white/10 hover:bg-white/20 text-[10px] font-black tracking-wide">
                            {label.toUpperCase()}
                            <span className="block text-[9px] font-normal text-gray-400 leading-tight">{hint}</span>
                        </button>
                    ))}
                </div>
                <button onClick={onFinale}
                    className="mt-2 w-full py-2.5 rounded bg-gradient-to-r from-amber-400 via-fuchsia-500 to-cyan-400 hover:brightness-110 text-black text-[12px] font-black tracking-[0.3em]">
                    FINALE <span className="block text-[9px] font-normal tracking-normal text-black/70">a barrage building to one big closing volley</span>
                </button>
                <div className="flex items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400 mr-1">Colours</span>
                        {[['mixed', 'Mixed'], ['classic', 'Classic'], ['show', 'Show colours']].map(([scheme, label]) => (
                            <Key key={scheme} on={fwOptions.scheme === scheme} onClick={() => onFwOptions({ scheme })}>{label}</Key>
                        ))}
                    </div>
                    <Key on={fwOptions.sound} onClick={() => onFwOptions({ sound: !fwOptions.sound })}>{fwOptions.sound ? 'Sound on' : 'Sound off'}</Key>
                </div>
            </Panel>

            {song.available && (
                <Panel title="CONCERT MODE" className="mt-2">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-gray-400">{song.title}: a light show programmed from the song&apos;s beats and sections.</p>
                        <button onClick={song.playing ? song.stop : song.play}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-[11px] font-bold">
                            {song.playing ? <><Square className="w-3 h-3" /> Stop</> : <><Music className="w-3 h-3" /><Play className="w-3 h-3" /> Play</>}
                        </button>
                    </div>
                </Panel>
            )}
        </div>
    );
}
