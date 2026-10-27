'use client';

import { Suspense, lazy, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import Beams from './Beams';
import { useQualityTier, TIER_SETTINGS } from './useQualityTier';

// FPS / draw-call overlay, loaded only on this page
const Perf = lazy(() => import('r3f-perf').then((m) => ({ default: m.Perf })));

// Looks the show's cues will use later; here they're quick previews
const PRESETS = {
    Calm: { sweep: 0.15, converge: 0, intensity: 0.55, speed: 0.25, haze: 0.8 },
    Build: { sweep: 0.45, converge: 0, intensity: 0.9, speed: 1.2, haze: 0.5 },
    Drop: { sweep: 0.1, converge: 1, intensity: 1.4, speed: 2.2, haze: 0.3 },
    Breakdown: { sweep: 0.6, converge: 0, intensity: 0.7, speed: 0.4, haze: 0.9 },
};
const PALETTE = ['#19d9ff', '#ff3df2', '#a855f7', '#ff0099', '#39ff14', '#ffffff', '#ef4444'];

// Configurations the benchmark steps through (each: 1.5 s warm-up, then 6 s of measurement)
const BENCH_CONFIGS = [
    { label: '56 beams, no bloom', beams: 56, bloom: 'off' },
    { label: '72 beams, no bloom', beams: 72, bloom: 'off' },
    { label: '72 beams, bloom', beams: 72, bloom: 'on' },
    { label: '100 beams, no bloom', beams: 100, bloom: 'off' },
    { label: '140 beams, no bloom', beams: 140, bloom: 'off' },
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

export default function LabStage() {
    const tier = useQualityTier();
    const [beamCount, setBeamCount] = useState(null); // null = the tier's default
    const [dprChoice, setDprChoice] = useState('auto');
    const [bloomChoice, setBloomChoice] = useState('auto');
    const [showPerf, setShowPerf] = useState(true);
    const [look, setLookState] = useState({ ...PRESETS.Build, colorA: '#19d9ff', colorB: '#ff3df2' });
    const lookRef = useRef(look); // read by the rig every frame, without re-rendering it
    const controls = useRef();
    const [bench, setBench] = useState({ running: false, step: '', results: [] });

    // Step through BENCH_CONFIGS with the FPS overlay hidden (it costs frames itself)
    const runBenchmark = async () => {
        const restore = { beamCount, bloomChoice, showPerf };
        setShowPerf(false);
        setDprChoice('1');
        const results = [];
        for (const config of BENCH_CONFIGS) {
            setBench({ running: true, step: config.label, results });
            setBeamCount(config.beams);
            setBloomChoice(config.bloom);
            await sleep(1500); // let shaders compile and the frame rate settle
            results.push({ config: config.label, ...(await measureFrames(6000)) });
        }
        setBench({ running: false, step: '', results: [...results] });
        setBeamCount(restore.beamCount);
        setBloomChoice(restore.bloomChoice);
        setShowPerf(restore.showPerf);
    };

    const setLook = (patch) => {
        const next = { ...lookRef.current, ...patch };
        lookRef.current = next;
        setLookState(next);
    };

    if (tier === null) {
        return <div className="h-screen grid place-items-center bg-[#02030a] text-cyan-300 font-mono">Detecting GPU…</div>;
    }

    const effectiveTier = tier === 0 ? 1 : tier; // the lab always renders; tier 0 is noted below
    const settings = TIER_SETTINGS[effectiveTier];
    const count = beamCount ?? settings.beams;
    const dpr = dprChoice === 'auto' ? settings.dpr : Number(dprChoice);
    const bloom = bloomChoice === 'auto' ? settings.bloom : bloomChoice === 'on';

    return (
        <div className="relative h-screen w-full bg-[#02030a] overflow-hidden">
            <Canvas
                dpr={dpr}
                camera={{ position: [0, 1.8, 26], fov: 55, near: 0.1, far: 200 }}
                gl={{ antialias: false, powerPreference: 'high-performance' }}
            >
                <color attach="background" args={['#02030a']} />
                {/* Stage floor and backdrop: unlit, so they cost almost nothing */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -4]}>
                    <planeGeometry args={[80, 50]} />
                    <meshBasicMaterial color="#05060c" />
                </mesh>
                <mesh position={[0, 9, -15]}>
                    <planeGeometry args={[60, 24]} />
                    <meshBasicMaterial color="#04071a" />
                </mesh>

                <Beams count={count} look={lookRef} />

                {bloom && (
                    <EffectComposer multisampling={0}>
                        <Bloom mipmapBlur luminanceThreshold={0.15} intensity={1.1} resolutionScale={0.5} />
                    </EffectComposer>
                )}
                <OrbitControls ref={controls} target={[0, 7, -6]} enableDamping />
                {showPerf && (
                    <Suspense fallback={null}>
                        <Perf position="top-left" />
                    </Suspense>
                )}
            </Canvas>

            <aside className="absolute top-3 right-3 w-72 max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-xl bg-black/75 backdrop-blur p-4 text-white border border-white/10">
                <h1 className="text-sm font-bold tracking-wider text-cyan-300 mb-1">STAGE LAB · step 1</h1>
                <p className="text-[11px] text-slate-400 mb-3">
                    Detected tier <b className="text-white">{tier}</b>
                    {tier === 0 && ' (the homepage would show the 2D fallback; rendering tier 1 here)'}
                    {' · '}{count} beams · bloom {bloom ? 'on' : 'off'}. Force a tier with <code>?tier=1</code>.
                </p>

                <div className="grid grid-cols-4 gap-1.5 mb-4">
                    {Object.keys(PRESETS).map((name) => (
                        <button key={name} onClick={() => setLook(PRESETS[name])}
                            className="text-[11px] py-1.5 rounded bg-white/10 hover:bg-cyan-500/30">{name}</button>
                    ))}
                </div>

                <h2 className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Performance</h2>
                <Slider label="Beams" value={count} min={10} max={140} step={1} onChange={setBeamCount} />
                <div className="flex gap-2 mb-2 text-xs">
                    <span className="text-slate-300 w-12">DPR</span>
                    {['auto', '0.75', '1', '1.5'].map((d) => (
                        <button key={d} onClick={() => setDprChoice(d)}
                            className={`px-2 py-0.5 rounded ${dprChoice === d ? 'bg-cyan-500 text-black' : 'bg-white/10'}`}>{d}</button>
                    ))}
                </div>
                <div className="flex gap-2 mb-4 text-xs">
                    <span className="text-slate-300 w-12">Bloom</span>
                    {['auto', 'on', 'off'].map((b) => (
                        <button key={b} onClick={() => setBloomChoice(b)}
                            className={`px-2 py-0.5 rounded ${bloomChoice === b ? 'bg-cyan-500 text-black' : 'bg-white/10'}`}>{b}</button>
                    ))}
                </div>

                <h2 className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Look</h2>
                <Slider label="Intensity" value={look.intensity} min={0} max={2} step={0.05} onChange={(v) => setLook({ intensity: v })} />
                <Slider label="Sweep" value={look.sweep} min={0} max={1} step={0.01} onChange={(v) => setLook({ sweep: v })} />
                <Slider label="Speed" value={look.speed} min={0} max={3} step={0.05} onChange={(v) => setLook({ speed: v })} />
                <Slider label="Converge (drop)" value={look.converge} min={0} max={1} step={0.01} onChange={(v) => setLook({ converge: v })} />
                <Slider label="Haze" value={look.haze} min={0} max={1} step={0.01} onChange={(v) => setLook({ haze: v })} />
                <Swatches label="Colour A" value={look.colorA} onChange={(c) => setLook({ colorA: c })} />
                <Swatches label="Colour B" value={look.colorB} onChange={(c) => setLook({ colorB: c })} />

                <h2 className="text-[11px] uppercase tracking-wider text-slate-500 mt-4 mb-2">Benchmark</h2>
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
