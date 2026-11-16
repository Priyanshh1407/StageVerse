'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { easing } from 'maath';
import * as THREE from 'three';
import { DEFAULT_LOOK } from '@/lib/show/look';
import { prepareSongShow, sampleSongShow } from '@/lib/show/timeline';
import { onlyGroup } from '@/lib/show/stages/club';
import { orbitShot } from '@/lib/show/stages/orbit';
import { STAGES } from '@/lib/show/stages';
import { HITS, collectCues } from '@/lib/show/stages/cues';
import { useQualityTier, TIER_SETTINGS } from '../useQualityTier';
import FestivalScene from './FestivalScene';

// The test page for a built festival stage: the stage lit and running, with looks to switch between,
// the demo songs to play through it, camera shots, the light count and the FPS overlay. The homepage
// does not use any of this yet.


const PRESETS = {
    Calm: { sweep: 0.15, converge: 0, intensity: 0.55, speed: 0.25, haze: 0.8, crowd: 0.12, laser: 0, pixelChase: 0.3 },
    Groove: { sweep: 0.35, converge: 0, intensity: 0.85, speed: 0.9, haze: 0.6, crowd: 0.4, laser: 0.6, phaseSpread: 0.5 },
    Build: { sweep: 0.45, converge: 0, intensity: 0.95, speed: 1.6, haze: 0.5, crowd: 0.5, tiltWave: 0.25, laser: 0.8, strobeRandom: 0.3 },
    Peak: { sweep: 0.6, converge: 0, intensity: 1.3, speed: 2, haze: 0.4, crowd: 1, laser: 1, laserChase: 1, pixelSparkle: 0.5 },
    Drop: { sweep: 0.1, converge: 1, intensity: 1.4, speed: 2.2, haze: 0.3, crowd: 1, dropFx: 1, strobe: 1, laser: 1 },
    'House lights': { house: 1, intensity: 0.8, beams: 0, sides: 0, floor: 0, wash: 1, washColor: '#ffb347', washDown: 1, washSweep: 0, sweep: 0, laser: 0, pixel: 0, strobe: 0, strobeSteady: 0, strobeRandom: 0, blinder: 0, crowd: undefined },
};
const COUNTS = [64, 96, 160, 400];

/**
 * One frame: the song's look when one is playing; otherwise the chosen preset or cue (`source`) on a
 * 120 BPM beat, with any hit fired from the panel on top while it runs.
 */
function driveLook(look, source, song, clock, delta, stage) {
    clock.t += delta;
    const s = song.current;
    if (s?.audio && !s.audio.paused) {
        const sample = sampleSongShow(s.show, s.audio.currentTime);
        // (a stage with cues of its own plays some of the show's cues as those: the mainstage)
        if (stage.cuePlan) s.plan ??= stage.cuePlan(s.show.sheet.cues);
        const own = s.plan?.[sample.index];
        look.current = onlyGroup(own ? { ...sample.look, ...own.look } : sample.look, source.current.only);
        look.shot = sample.shot;
        look.song = { t: s.audio.currentTime, duration: s.audio.duration || s.show.duration || 0 };
        return;
    }
    look.shot = null;
    look.song = null;
    const beat = clock.t * 2;
    const { look: p, shot, hit } = source.current;
    let next = { ...DEFAULT_LOOK, ...p, beatPos: p.house ? undefined : beat, pulse: p.house ? 0 : Math.exp(-(beat % 1) * 9) * (p.pulseAmount ?? 0.4) };
    if (hit) {
        const progress = (clock.t - hit.at) / HITS[hit.kind].dur;
        if (progress < 1) next = { ...next, ...HITS[hit.kind].apply(next, Math.max(0, progress)) };
        else source.current.hit = null;
    }
    look.current = onlyGroup(next, source.current.only);
    look.shot = shot ?? null;
}


function Driver({ look, source, song, clock, stage }) {
    useFrame((_, delta) => driveLook(look, source, song, clock.current, delta, stage));
    return null;
}

/** Count frames and write the rate into the overlay twice a second (r3f-perf crashed Turbopack's dev build). */
function countFrames(meter, state, delta) {
    state.frames++;
    state.time += delta;
    if (state.time < 0.5 || !meter.current) return;
    meter.current.textContent = `${Math.round(state.frames / state.time)} FPS`;
    state.frames = 0;
    state.time = 0;
}

function FpsMeter({ meter }) {
    const state = useRef({ frames: 0, time: 0 });
    useFrame((_, delta) => countFrames(meter, state.current, delta));
    return null;
}

/** The camera following the show: the cue's shot, the sky shot while fireworks are up (not for mines). */
function followShow(stage, look, camera, controls, aim, delta) {
    const up = look.current.fireworks?.some((f) => f.type !== 'mines');
    // (the warehouse: during a song the camera circles the room instead of cutting between the show's shots)
    const circling = stage.orbit && look.song?.duration > 0;
    const shot = circling ? orbitShot(stage.orbit, look.song.t, look.song.duration)
        : (up ? stage.shots.sky : stage.shots[look.shot]) ?? stage.shots.wide;
    aim.pos.set(...shot.pos);
    aim.look.set(...shot.target);
    const ease = circling ? 0.9 : up ? 0.6 : 1.8;
    easing.damp3(camera.position, aim.pos, ease, delta);
    if (controls.current) {
        easing.damp3(controls.current.target, aim.look, ease, delta);
        controls.current.update();
    }
}

function AutoCamera({ stage, look, controls }) {
    const aim = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
    useFrame(({ camera }, delta) => followShow(stage, look, camera, controls, aim.current, Math.min(delta, 0.1)));
    return null;
}

function ViewRig({ shot, controls }) {
    const camera = useThree((s) => s.camera);
    useEffect(() => {
        if (!shot) return;
        camera.position.set(...shot.pos);
        controls.current?.target.set(...shot.target);
        controls.current?.update();
    }, [shot, camera, controls]);
    return null;
}

export default function FestivalLab({ stageKey }) {
    const stage = STAGES[stageKey];
    const tier = useQualityTier();
    const controls = useRef(null);
    const look = useRef(DEFAULT_LOOK);
    const song = useRef(null);
    const meter = useRef(null);
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const [preset, setPreset] = useState(PRESETS[params?.get('look')] ? params.get('look') : 'Build');
    // what the stage shows when no song plays: a preset or one of the shows' cues (and a hit on top)
    const source = useRef({ look: PRESETS[preset], shot: null, hit: null, only: params?.get('only') });
    const clock = useRef({ t: 0 });
    const [cues, setCues] = useState(null);
    const [cueKindOn, setCueKindOn] = useState(null);
    const choosePreset = (name) => { setPreset(name); setCueKindOn(null); source.current = { ...source.current, look: PRESETS[name], shot: null, hit: null }; };
    const chooseCue = (cue) => { setCueKindOn(cue.kind); source.current = { ...source.current, look: cue.look, shot: cue.shot, hit: null }; };
    const fireHit = (kind) => { source.current = { ...source.current, hit: { kind, at: clock.current.t } }; };
    // the cues of every demo song, loaded the first time the list is opened
    const loadCues = async () => {
        if (cues) return;
        const shows = await Promise.all(demos.map((d) => fetch(d.show).then((r) => r.json()).catch(() => null)));
        const all = collectCues(shows.filter(Boolean));
        setCues([...all, ...(stage.extraCues?.(all) ?? [])]);
    };
    const [shotName, setShotName] = useState(stage.shots[params?.get('view')] ? params.get('view') : 'wide');
    // ?cam=x,y,z&target=x,y,z: a camera of your own (a camera button returns to the stage's shots)
    const [custom, setCustom] = useState(() => {
        const read = (key) => params?.get(key)?.split(',').map(Number);
        const cam = read('cam');
        const target = read('target');
        return cam?.length === 3 && cam.every(Number.isFinite) ? { pos: cam, target: target?.length === 3 && target.every(Number.isFinite) ? target : stage.shots.wide.target } : null;
    });
    const [count, setCount] = useState(Number(params?.get('lights')) || null);
    const [perf, setPerf] = useState(params?.get('perf') !== '0');
    const [panel, setPanel] = useState(params?.get('panel') !== '0');
    const [follow, setFollow] = useState(params?.get('follow') === '1');
    const [demos, setDemos] = useState([]);
    const [playing, setPlaying] = useState(null);
    // the performer: a band on the desert stage, a DJ elsewhere (the Performer component reads the genre)
    const control = useRef({ mode: 'song', song: { genre: stage.performer === 'band' ? 'pop' : 'edm' } });

    const play = async (demo, startAt = 0) => {
        song.current?.audio?.pause();
        const show = prepareSongShow(await (await fetch(demo.show)).json());
        const audio = new Audio(encodeURI(show.audio));
        if (startAt > 0) audio.addEventListener('loadedmetadata', () => { audio.currentTime = Math.min(startAt, audio.duration - 1); }, { once: true });
        // the last note: the house lights come up (the washes only, warm yellow), as at the end of a concert
        audio.addEventListener('ended', () => { setPlaying(null); setPreset('House lights'); setCueKindOn(null); source.current = { ...source.current, look: PRESETS['House lights'], shot: null, hit: null }; });
        song.current = { show, audio };
        await audio.play().catch(() => {});
        setPlaying(demo.slug);
    };
    const stop = () => { song.current?.audio?.pause(); song.current = null; setPlaying(null); };

    useEffect(() => {
        // ?song=<slug>&t=<seconds> starts a song straight away (for checking a moment, e.g. a finale)
        const asked = params?.get('song');
        fetch('/shows/index.json').then((r) => r.json()).then((index) => {
            setDemos(index.demos ?? []);
            const demo = index.demos?.find((d) => d.slug === asked);
            if (demo) play(demo, Number(params.get('t')) || 0);
            // ?cue=<name> holds one of the shows' cues (e.g. ?cue=Circle · all beams)
            const askedCue = params?.get('cue');
            if (askedCue && !demo) {
                Promise.all((index.demos ?? []).map((d) => fetch(d.show).then((r) => r.json()).catch(() => null))).then((shows) => {
                    const shared = collectCues(shows.filter(Boolean));
                    const all = [...shared, ...(stage.extraCues?.(shared) ?? [])];
                    setCues(all);
                    const cue = all.find((c) => c.kind.toLowerCase() === askedCue.toLowerCase());
                    if (cue) chooseCue(cue);
                });
            }
        }).catch(() => {});
        return () => song.current?.audio?.pause();
    }, []);

    if (tier === null) return <div className="grid h-screen place-items-center bg-[#02030a] font-mono text-amber-300">Loading stage…</div>;
    const settings = TIER_SETTINGS[tier === 0 ? 1 : tier];
    const lights = count ?? (tier >= 2 ? 160 : 96);
    const button = (on) => `rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${on ? 'bg-[#ff6a00] text-black' : 'bg-white/10 text-white hover:bg-white/20'}`;
    const shot = custom ?? stage.shots[shotName];

    return (
        <div className="relative h-screen w-full bg-[#010208]">
            <Canvas camera={{ position: shot.pos, fov: 55, near: 0.5, far: 1200 }} dpr={settings.dpr} gl={{ antialias: !settings.bloom, powerPreference: 'high-performance' }}
                onCreated={({ gl }) => { gl.debug.checkShaderErrors = true; }}>
                <Driver look={look} source={source} song={song} clock={clock} stage={stage} />
                <FestivalScene stage={stage} look={look} count={lights} bloom={settings.bloom} quality={tier >= 2 ? 'high' : 'low'} control={control} />
                <OrbitControls ref={controls} makeDefault target={shot.target} />
                <ViewRig shot={shot} controls={controls} />
                {follow && <AutoCamera stage={stage} look={look} controls={controls} />}
                {perf && <FpsMeter meter={meter} />}
            </Canvas>

            {perf && <div ref={meter} className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2.5 py-1 font-mono text-sm text-amber-300">… FPS</div>}
            <div className="absolute left-3 top-3 max-h-[calc(100vh-1.5rem)] w-[18rem] overflow-y-auto rounded-xl border border-white/10 bg-black/75 p-3 text-white backdrop-blur">
                <div className="flex items-start justify-between gap-2">
                    <h1 className="text-sm font-bold">{stage.title} <span className="font-normal text-white/60">· built</span></h1>
                    <button type="button" className={button(false)} onClick={() => setPanel((o) => !o)}>{panel ? 'Hide' : 'Show'}</button>
                </div>
                {panel && (
                    <>
                        <p className="mt-1 text-[11px] text-white/55">Test page only: the homepage does not use this stage yet.</p>
                        <p className="mt-3 text-[11px] uppercase tracking-wider text-white/50">Look</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                            {Object.keys(PRESETS).map((name) => <button key={name} type="button" className={button(!playing && !cueKindOn && preset === name)} onClick={() => { stop(); choosePreset(name); }}>{name}</button>)}
                        </div>
                        <p className="mt-3 text-[11px] uppercase tracking-wider text-white/50">Hits (on top of the look)</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                            {Object.keys(HITS).map((kind) => <button key={kind} type="button" className={button(false)} onClick={() => fireHit(kind)}>{kind}</button>)}
                        </div>
                        <details className="mt-3" onToggle={(e) => e.currentTarget.open && loadCues()}>
                            <summary className="cursor-pointer text-[11px] uppercase tracking-wider text-white/50">Every cue in the shows{cues ? ` (${cues.length})` : ''}</summary>
                            {!cues && <p className="mt-1 text-[11px] text-white/50">Loading the cues of the demo songs…</p>}
                            <div className="mt-1 flex flex-wrap gap-1.5">
                                {cues?.map((cue) => (
                                    <button key={cue.kind} type="button" title={`from ${cue.song}, ${Math.floor(cue.t / 60)}:${String(Math.floor(cue.t % 60)).padStart(2, '0')}`}
                                        className={button(!playing && cueKindOn === cue.kind)} onClick={() => { stop(); chooseCue(cue); }}>{cue.kind}</button>
                                ))}
                            </div>
                        </details>
                        <p className="mt-3 text-[11px] uppercase tracking-wider text-white/50">Play a song through it</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                            {demos.map((d) => <button key={d.slug} type="button" className={button(playing === d.slug)} onClick={() => (playing === d.slug ? stop() : play(d))}>{d.title}</button>)}
                        </div>
                        <p className="mt-3 text-[11px] uppercase tracking-wider text-white/50">Camera</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                            {Object.keys(stage.shots).map((name) => <button key={name} type="button" className={button(shotName === name)} onClick={() => { setCustom(null); setShotName(name); }}>{name}</button>)}
                        </div>
                        <p className="mt-3 text-[11px] uppercase tracking-wider text-white/50">Moving heads ({stage.heads.length} in the layout)</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                            {COUNTS.map((n) => <button key={n} type="button" className={button(lights === n || (n === 400 && lights >= stage.heads.length))} onClick={() => setCount(n)}>{n === 400 ? 'All' : n}</button>)}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            <button type="button" className={button(follow)} onClick={() => setFollow((f) => !f)}>Camera follows the show</button>
                            <button type="button" className={button(perf)} onClick={() => setPerf((p) => !p)}>FPS</button>
                            <Link href={`/lab/${stageKey}?layout=1`} className={button(false)}>Layout view</Link>
                        </div>
                        <p className="mt-3 text-[11px] text-white/50">Tier {tier}: {settings.bloom ? 'bloom on' : 'bloom off'}. Drag to orbit, scroll to zoom.</p>
                    </>
                )}
            </div>
        </div>
    );
}
