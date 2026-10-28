'use client';

import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerformanceMonitor } from '@react-three/drei';
import StageScene from './StageScene';
import { useQualityTier, TIER_SETTINGS } from './useQualityTier';
import { DEFAULT_LOOK } from '@/lib/show/look';

// FPS / draw-call overlay, loaded only on this page
const Perf = lazy(() => import('r3f-perf').then((m) => ({ default: m.Perf })));

// Looks the show's cues will use later; here they're quick previews
const PRESETS = {
    Calm: { sweep: 0.15, converge: 0, intensity: 0.55, speed: 0.25, haze: 0.8 },
    Build: { sweep: 0.45, converge: 0, intensity: 0.9, speed: 1.2, haze: 0.5 },
    Drop: { sweep: 0.1, converge: 1, intensity: 1.4, speed: 2.2, haze: 0.3 },
    Breakdown: { sweep: 0.6, converge: 0, intensity: 0.7, speed: 0.4, haze: 0.9 },
};
const PALETTE = [
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
].map((c) => c.value);

// Automatic step-down when the frame rate can't keep up (each level keeps the previous ones)
const ADAPTIVE_LEVELS = ['full quality', 'bloom off', '70% beams', 'lower resolution'];

// Full-scene configurations the benchmark steps through (1.5 s warm-up, then 6 s measured)
const BENCH_CONFIGS = [
    { label: '72 beams · DPR 1', beams: 72, bloom: 'off', dpr: '1' },
    { label: '100 + bloom · DPR 1', beams: 100, bloom: 'on', dpr: '1' },
    { label: '72 beams · native DPR', beams: 72, bloom: 'off', dpr: 'native' },
    { label: '100 + bloom · native DPR', beams: 100, bloom: 'on', dpr: 'native' },
    { label: '140 beams · native DPR', beams: 140, bloom: 'off', dpr: 'native' },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Record frame-to-frame times for `ms` and summarise them. */
function measureFrames(ms) {
    return new Promise((resolve) => {
        const times = [];
        let last = null;
        const start = performance.now();
        const tick = (now) => {
            if (last !== null) times.push(now - last);
            last = now;
            if (now - start < ms) requestAnimationFrame(tick);
            else {
                const sorted = [...times].sort((a, b) => a - b);
                const avg = times.reduce((s, t) => s + t, 0) / times.length;
                const p99 = sorted[Math.floor(sorted.length * 0.99)];
                resolve({
                    avgFps: Math.round(1000 / avg),
                    low1Fps: Math.round(1000 / p99),          // FPS of the slowest 1% of frames
                    worstMs: Math.round(sorted[sorted.length - 1]),
                    frames: times.length,
                });
            }
        };
        requestAnimationFrame(tick);
    });
}

const shortDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');

function Slider({ label, value, min, max, step, onChange, format = (v) => v }) {
    return (
        <label className="block text-xs text-slate-300 mb-3">
            <span className="flex justify-between mb-1">
                <span>{label}</span>
                <span className="font-mono text-cyan-300">{format(value)}</span>
            </span>
            <input type="range" min={min} max={max} step={step} value={value}
                onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-cyan-400" />
        </label>
    );
}

function Swatches({ label, value, onChange }) {
    return (
        <div className="mb-3">
            <div className="text-xs text-slate-300 mb-1">{label}</div>
            <div className="flex gap-1.5">
                {PALETTE.map((c) => (
                    <button key={c} onClick={() => onChange(c)} aria-label={`${label} ${c}`}
                        className={`w-6 h-6 rounded-full border-2 ${value === c ? 'border-white' : 'border-transparent'}`}
                        style={{ background: c }} />
                ))}
            </div>
        </div>
    );
}

function Choice({ label, options, value, onChange }) {
    return (
        <div className="flex gap-2 mb-2 text-xs items-center">
            <span className="text-slate-300 w-14">{label}</span>
            {options.map((o) => (
                <button key={o} onClick={() => onChange(o)}
                    className={`px-2 py-0.5 rounded ${value === o ? 'bg-cyan-500 text-black' : 'bg-white/10'}`}>{o}</button>
            ))}
        </div>
    );
}

export default function LabStage() {
    const tier = useQualityTier();
    const [beamCount, setBeamCount] = useState(null); // null = the tier's default
    const [dprChoice, setDprChoice] = useState('auto');
    const [bloomChoice, setBloomChoice] = useState('auto');
    const [adaptive, setAdaptive] = useState(true);
    const [adaptiveLevel, setAdaptiveLevel] = useState(0);
    const [showPerf, setShowPerf] = useState(true);
    const [events, setEvents] = useState([]);
    const [look, setLookState] = useState({ ...DEFAULT_LOOK, ...PRESETS.Build });
    const lookRef = useRef(look); // read by the rig every frame, without re-rendering it
    const controls = useRef();
    const [bench, setBench] = useState({ running: false, step: '', results: [] });

    // Real upcoming events for the LED wall (public endpoint)
    useEffect(() => {
        fetch('/api/events')
            .then((r) => (r.ok ? r.json() : { events: [] }))
            .then((json) => setEvents((json.events || []).map((e) => ({ title: e.title, city: e.city, date: shortDate(e.date) }))))
            .catch(() => {});
    }, []);

    const setLook = (patch) => {
        const next = { ...lookRef.current, ...patch };
        lookRef.current = next;
        setLookState(next);
    };

    // Step through BENCH_CONFIGS with the FPS overlay and auto step-down off (they'd skew results)
    const runBenchmark = async () => {
        const restore = { beamCount, bloomChoice, showPerf, dprChoice, adaptive };
        setShowPerf(false);
        setAdaptive(false);
        setAdaptiveLevel(0);
        const results = [];
        for (const config of BENCH_CONFIGS) {
            setBench({ running: true, step: config.label, results });
            setBeamCount(config.beams);
            setBloomChoice(config.bloom);
            setDprChoice(config.dpr === 'native' ? String(window.devicePixelRatio) : config.dpr);
            await sleep(1500); // let shaders compile and the frame rate settle
            results.push({ config: config.label, dpr: config.dpr === 'native' ? window.devicePixelRatio : 1, ...(await measureFrames(6000)) });
        }
        setBench({ running: false, step: '', results: [...results] });
        setBeamCount(restore.beamCount);
        setBloomChoice(restore.bloomChoice);
        setShowPerf(restore.showPerf);
        setDprChoice(restore.dprChoice);
        setAdaptive(restore.adaptive);
    };

    if (tier === null) {
        return <div className="h-screen grid place-items-center bg-[#02030a] text-cyan-300 font-mono">Detecting GPU…</div>;
    }

    const effectiveTier = tier === 0 ? 1 : tier; // the lab always renders; tier 0 is noted below
    const settings = TIER_SETTINGS[effectiveTier];
    const level = adaptive ? adaptiveLevel : 0;
    const baseBeams = beamCount ?? settings.beams;
    const count = level >= 2 ? Math.round(baseBeams * 0.7) : baseBeams;
    const baseBloom = bloomChoice === 'auto' ? settings.bloom : bloomChoice === 'on';
    const bloom = level >= 1 ? false : baseBloom;
    const baseDpr = dprChoice === 'auto' ? settings.dpr : Number(dprChoice);
    const dpr = level >= 3 ? 0.75 : baseDpr;
    const dprOptions = ['auto', '0.75', '1', '1.25', '1.5'];

    return (
        <div className="relative h-screen w-full bg-[#010208] overflow-hidden">
            <Canvas
                dpr={dpr}
                camera={{ position: [0, 1.8, 26], fov: 55, near: 0.5, far: 200 }}
                gl={{ antialias: !bloom, powerPreference: 'high-performance' }} // MSAA only without bloom (the composer does SMAA)
            >
                <PerformanceMonitor
                    flipflops={3}
                    onDecline={() => adaptive && setAdaptiveLevel((l) => Math.min(l + 1, ADAPTIVE_LEVELS.length - 1))}
                />
                <StageScene beams={count} bloom={bloom} look={lookRef} events={events} />
                <OrbitControls ref={controls} target={[0, 7, -6]} enableDamping />
                {showPerf && (
                    <Suspense fallback={null}>
                        <Perf position="top-left" />
                    </Suspense>
                )}
            </Canvas>

            <aside className="absolute top-3 right-3 w-72 max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-xl bg-black/75 backdrop-blur p-4 text-white border border-white/10">
                <h1 className="text-sm font-bold tracking-wider text-cyan-300 mb-1">STAGE LAB</h1>
                <p className="text-[11px] text-slate-400 mb-3">
                    Detected tier <b className="text-white">{tier}</b>
                    {tier === 0 && ' (the homepage would show the 2D fallback; rendering tier 1 here)'}
                    {' · '}{count} beams · bloom {bloom ? 'on' : 'off'} · DPR {Array.isArray(dpr) ? dpr.join('–') : dpr}.
                    {' '}Force a tier with <code>?tier=1</code>.
                </p>

                <div className="grid grid-cols-4 gap-1.5 mb-4">
                    {Object.keys(PRESETS).map((name) => (
                        <button key={name} onClick={() => setLook(PRESETS[name])}
                            className="text-[11px] py-1.5 rounded bg-white/10 hover:bg-cyan-500/30">{name}</button>
                    ))}
                </div>

                <h2 className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Performance</h2>
                <Slider label="Beams" value={baseBeams} min={10} max={140} step={1} onChange={setBeamCount} />
                <Choice label="DPR" options={dprOptions} value={dprChoice} onChange={setDprChoice} />
                <Choice label="Bloom" options={['auto', 'on', 'off']} value={bloomChoice} onChange={setBloomChoice} />
                <div className="flex gap-2 mb-4 text-xs items-center">
                    <span className="text-slate-300 w-14">Auto</span>
                    <button onClick={() => { setAdaptive((a) => !a); setAdaptiveLevel(0); }}
                        className={`px-2 py-0.5 rounded ${adaptive ? 'bg-cyan-500 text-black' : 'bg-white/10'}`}>
                        {adaptive ? 'on' : 'off'}
                    </button>
                    <span className="text-[11px] text-slate-400">{adaptive ? ADAPTIVE_LEVELS[level] : 'step-down disabled'}</span>
                </div>

                <h2 className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Look</h2>
                <Slider label="Intensity" value={look.intensity} min={0} max={2} step={0.05} onChange={(v) => setLook({ intensity: v })} />
                <Slider label="Sweep" value={look.sweep} min={0} max={1} step={0.01} onChange={(v) => setLook({ sweep: v })} />
                <Slider label="Speed" value={look.speed} min={0} max={3} step={0.05} onChange={(v) => setLook({ speed: v })} />
                <Slider label="Converge (drop)" value={look.converge} min={0} max={1} step={0.01} onChange={(v) => setLook({ converge: v })} />
                <Slider label="Haze" value={look.haze} min={0} max={1} step={0.01} onChange={(v) => setLook({ haze: v })} />
                <Swatches label="Colour A" value={look.colorA} onChange={(c) => setLook({ colorA: c })} />
                <Swatches label="Colour B" value={look.colorB} onChange={(c) => setLook({ colorB: c })} />

                <h2 className="text-[11px] uppercase tracking-wider text-slate-500 mt-4 mb-2">Benchmark (full scene)</h2>
                <button onClick={runBenchmark} disabled={bench.running}
                    className="w-full py-2 rounded bg-cyan-500 text-black font-bold text-xs disabled:opacity-60">
                    {bench.running ? `Measuring: ${bench.step}…` : 'Run benchmark (~40 s, keep this tab in front)'}
                </button>
                {bench.results.length > 0 && (
                    <div className="mt-2">
                        <table className="w-full text-[11px] font-mono">
                            <thead className="text-slate-400">
                                <tr><th className="text-left">config</th><th>avg</th><th>1% low</th><th>worst</th></tr>
                            </thead>
                            <tbody>
                                {bench.results.map((r) => (
                                    <tr key={r.config}>
                                        <td className="pr-1">{r.config}</td>
                                        <td className="text-center">{r.avgFps}</td>
                                        <td className="text-center">{r.low1Fps}</td>
                                        <td className="text-center">{r.worstMs}ms</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!bench.running && (
                            <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(bench.results, null, 2))}
                                className="mt-2 w-full py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs">Copy results</button>
                        )}
                    </div>
                )}

                <div className="flex gap-2 mt-4 text-xs">
                    <button onClick={() => controls.current?.reset()} className="flex-1 py-1.5 rounded bg-white/10 hover:bg-white/20">Hero camera</button>
                    <button onClick={() => setShowPerf((v) => !v)} className="flex-1 py-1.5 rounded bg-white/10 hover:bg-white/20">
                        {showPerf ? 'Hide' : 'Show'} FPS
                    </button>
                </div>
            </aside>
        </div>
    );
}
