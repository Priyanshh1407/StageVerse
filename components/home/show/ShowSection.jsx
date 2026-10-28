'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Orbitron } from 'next/font/google';
import { ChevronDown, Music, Square, Upload, Settings2, Loader2, Play } from 'lucide-react';
import { DEFAULT_LOOK } from '@/lib/show/look';
import { prepareSongShow } from '@/lib/show/timeline';
import { buildIdleShow } from '@/lib/show/program';
import { buildScrollSheet, ENCORE_CHOICES, phaseAt, roleAt, screenAt } from './scrollShow';
import { currentState } from './director';
import LightingDesk from './LightingDesk';

// The 3D stage is client-only and loads after the page (the headline below is plain HTML)
const ShowStage = dynamic(() => import('./ShowStage'), { ssr: false });

// Display face for the LED wall and the venue sign (drawn into canvases, so it's passed by name)
const orbitron = Orbitron({ subsets: ['latin'], weight: ['700', '900'], display: 'swap' });

const SONG_SHOW = '/shows/sky-full-of-stars.show.json';
const SECTION_COLORS = { intro: '#3b5bff', calm: '#3b5bff', groove: '#a855f7', build: '#ff8a00', peak: '#ff3df2', outro: '#3b5bff' };
const MAX_UPLOAD_MB = 80;
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function Fade({ show, children, className = '' }) {
    return (
        <div aria-hidden={!show} className={`absolute inset-0 flex transition-opacity duration-500 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${className}`}>
            {children}
        </div>
    );
}

/** Decode an audio file in the browser and resample it to mono 22.05 kHz for analysis. */
async function decodeForAnalysis(file) {
    const ctx = new AudioContext();
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    ctx.close();
    const rate = 22050;
    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return { pcm: rendered.getChannelData(0).slice(), sampleRate: rate, duration: decoded.duration };
}

/**
 * While a light show plays: the stage goes full screen and the navbar is hidden (the class also
 * hides it where full screen isn't available). Leaving brings both back.
 */
let wakeLock = null; // keeps the screen from dimming or sleeping during a show
function enterShowMode(element) {
    document.documentElement.classList.add('show-immersive');
    element?.requestFullscreen?.().catch(() => {});
    navigator.wakeLock?.request('screen').then((lock) => { wakeLock = lock; }, () => {});
}
function exitShowMode() {
    document.documentElement.classList.remove('show-immersive');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    wakeLock?.release().catch(() => {});
    wakeLock = null;
}

/** Run the analysis and programming in a worker, so the page stays smooth meanwhile. */
function analyseInWorker(pcm, sampleRate, title) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('./analysisWorker.js', import.meta.url), { type: 'module' });
        worker.onmessage = ({ data }) => {
            worker.terminate();
            if (data.ok) resolve(data.show);
            else reject(new Error(data.error));
        };
        worker.onerror = (e) => {
            worker.terminate();
            reject(new Error(e.message || 'Analysis failed'));
        };
        worker.postMessage({ pcm, sampleRate, title }, [pcm.buffer]);
    });
}

/**
 * "The Show": the homepage hero. A tall section with a sticky full-screen stage; scrolling runs
 * the cue stack (scrollShow.js): outside the venue, through the doors, the rig coming up, a look
 * per role on the LED wall, the drop, the encore, then the playground (the lighting desk, the
 * demo song, or the visitor's own song, analysed in their browser).
 */
export default function ShowSection({ events = [] }) {
    const section = useRef(null);
    const stage = useRef(null);
    const fileInput = useRef(null);
    const look = useRef(DEFAULT_LOOK);
    const control = useRef({ mode: 'scroll', progress: 0, sheet: buildScrollSheet(), idle: prepareSongShow(buildIdleShow()), shot: 'outside' });

    const [phase, setPhase] = useState('outside');
    const [role, setRole] = useState(null);
    const [screen, setScreen] = useState({ kind: 'brand' });
    const [cueName, setCueName] = useState('');
    const [visible, setVisible] = useState(true);
    const [encore, setEncore] = useState(ENCORE_CHOICES[0]);
    const [mode, setMode] = useState('scroll');
    const [desk, setDesk] = useState(DEFAULT_LOOK);
    const [deskOpen, setDeskOpen] = useState(false);
    const [counts, setCounts] = useState({ beams: null, lasers: 24, blinders: 8 });
    // bundled: the demo song's show (only where its file exists); current: the show playing;
    // ready: an uploaded song analysed and waiting for "Start the show"
    const [song, setSong] = useState({ bundled: null, current: null, ready: null, playing: false, time: 0, status: null, error: null });
    const [fullscreen, setFullscreen] = useState(false);

    // Scroll progress through the section drives the show (no re-render unless an overlay changes)
    useEffect(() => {
        const onScroll = () => {
            const el = section.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const progress = Math.min(1, Math.max(0, -rect.top / (rect.height - window.innerHeight)));
            const c = control.current;
            c.progress = progress;
            setPhase(phaseAt(progress));
            setRole(roleAt(progress)?.key ?? null);
            setScreen((prev) => {
                const next = screenAt(progress);
                return prev.kind === next.kind && prev.key === next.key ? prev : next;
            });
            if (c.mode === 'scroll') setCueName(currentState(c).name);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, []);

    // Leaving full screen (Esc) brings the navbar back; the music keeps playing
    useEffect(() => {
        const onChange = () => {
            setFullscreen(Boolean(document.fullscreenElement));
            control.current.fullscreen = Boolean(document.fullscreenElement);
            if (!document.fullscreenElement) document.documentElement.classList.remove('show-immersive');
        };
        document.addEventListener('fullscreenchange', onChange);
        return () => {
            document.removeEventListener('fullscreenchange', onChange);
            exitShowMode();
        };
    }, []);

    // Stop rendering the 3D stage while it's scrolled out of view
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
        observer.observe(section.current);
        return () => observer.disconnect();
    }, []);

    // The demo song is offered only where its file exists (it's local-only: copyrighted)
    useEffect(() => {
        let cancelled = false;
        const c = control.current;
        fetch(SONG_SHOW)
            .then((r) => (r.ok ? r.json() : null))
            .then(async (show) => {
                if (!show?.audio || cancelled) return;
                const head = await fetch(encodeURI(show.audio), { method: 'HEAD' });
                if (head.ok && !cancelled) setSong((s) => ({ ...s, bundled: show }));
            })
            .catch(() => {});
        return () => {
            cancelled = true;
            c.audio?.pause();
            if (c.objectUrl) URL.revokeObjectURL(c.objectUrl);
        };
    }, []);

    const pickEncore = (choice) => {
        setEncore(choice);
        control.current.sheet = buildScrollSheet(choice);
    };

    // --- Lighting desk -------------------------------------------------------------------
    const takeOver = () => {
        const c = control.current;
        if (c.mode === 'manual') return;
        const { look: now } = currentState(c);
        c.desk = { ...now, pulse: 0, strobe: 0, blinder: now.blinder > 0.5 ? 1 : 0, dropFx: 0, laserChase: 0 };
        c.mode = 'manual';
        setMode('manual');
        setDesk(c.desk);
        setCounts((n) => ({ ...n, beams: n.beams ?? 52 }));
    };

    const changeDesk = (patch) => {
        takeOver();
        const c = control.current;
        c.desk = { ...c.desk, ...patch };
        setDesk(c.desk);
    };

    const changeCounts = (patch) => {
        takeOver();
        setCounts((n) => ({ ...n, ...patch }));
    };

    // Strobe (held) and DROP (a hit that releases by itself) don't touch the desk's saved settings
    const momentary = (patch, kind) => {
        takeOver();
        const c = control.current;
        if (kind === 'pulse') {
            // DROP: white blast, ~1.5 s of hard strobing with every beam on the stage centre, the
            // floor fixtures thrown sideways and the lasers chasing, then back to the desk's look
            const saved = { converge: c.desk.converge, intensity: c.desk.intensity, laser: c.desk.laser, blinder: c.desk.blinder, strobe: 0, dropFx: 0, laserChase: 0 };
            c.desk = { ...c.desk, ...patch, laser: Math.max(c.desk.laser, 1) };
            setTimeout(() => { c.desk = { ...c.desk, blinder: saved.blinder }; }, 350);
            setTimeout(() => { c.desk = { ...c.desk, strobe: 0 }; }, 1500);
            setTimeout(() => { c.desk = { ...c.desk, ...saved }; }, 2600);
        } else {
            c.desk = { ...c.desk, ...patch };
        }
    };

    const resume = () => {
        const c = control.current;
        c.mode = c.audio && !c.audio.paused ? 'song' : 'scroll';
        setMode(c.mode);
        setCounts((n) => ({ ...n, beams: null }));
    };

    // --- Concert mode --------------------------------------------------------------------
    const stopSong = useCallback(() => {
        const c = control.current;
        c.audio?.pause();
        if (c.audio) c.audio.currentTime = 0;
        if (c.mode === 'song') c.mode = 'scroll';
        setMode(c.mode);
        setSong((s) => ({ ...s, playing: false, time: 0 }));
        exitShowMode();
    }, []);

    /** Play a programmed show with its audio (a URL, or an object URL for an uploaded file). */
    const playShow = (show, url, objectUrl = null) => {
        const c = control.current;
        c.audio?.pause();
        if (c.objectUrl && c.objectUrl !== objectUrl) URL.revokeObjectURL(c.objectUrl);
        c.objectUrl = objectUrl;
        c.song = prepareSongShow(show);
        c.clock = null;
        const audio = new Audio(url);
        audio.addEventListener('timeupdate', () => setSong((s) => ({ ...s, time: audio.currentTime })));
        audio.addEventListener('ended', stopSong);
        c.audio = audio;
        audio.play().catch(() => stopSong());
        c.mode = 'song';
        setMode('song');
        setSong((s) => ({ ...s, current: show, ready: null, playing: true, status: null, error: null }));
        setDeskOpen(false);
        enterShowMode(stage.current); // must run inside the click that started the show
    };

    const playDemo = () => song.bundled && playShow(song.bundled, encodeURI(song.bundled.audio));

    // The visitor's own song: decoded and analysed in their browser, never uploaded anywhere
    const analyseUpload = async (file) => {
        if (!file) return;
        if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
            setSong((s) => ({ ...s, error: `That file is over ${MAX_UPLOAD_MB} MB.` }));
            return;
        }
        const title = file.name.replace(/\.[^.]+$/, '');
        try {
            setSong((s) => ({ ...s, status: 'Reading your song…', error: null }));
            const { pcm, sampleRate, duration } = await decodeForAnalysis(file);
            if (duration > 15 * 60) throw new Error('Songs up to 15 minutes, please.');
            setSong((s) => ({ ...s, status: 'Finding the tempo, beats and sections…' }));
            const show = await analyseInWorker(pcm, sampleRate, title);
            // Browsers only allow full screen from a click, so the visitor starts the show
            setSong((s) => ({ ...s, status: null, ready: { show, url: URL.createObjectURL(file) } }));
        } catch (error) {
            setSong((s) => ({ ...s, status: null, error: error.message || 'Could not read that file.' }));
        }
    };

    const seek = (e) => {
        const c = control.current;
        const rect = e.currentTarget.getBoundingClientRect();
        if (c.audio && song.current) c.audio.currentTime = ((e.clientX - rect.left) / rect.width) * song.current.duration;
    };

    const now = song.current;
    const songSection = now?.sections.find((s) => song.time >= s.start && song.time < s.end);
    const deskCounts = { ...counts, beams: counts.beams ?? 52 };
    const showOverlays = mode !== 'song';
    const songControls = { available: Boolean(song.bundled), title: song.bundled?.title, playing: song.playing, play: playDemo, stop: stopSong };

    return (
        <section ref={section} className="relative h-[520vh] bg-[#010208]" aria-label="StageVerse live show">
            <div ref={stage} className="sticky top-0 h-screen w-full overflow-hidden bg-[#010208]">
                <ShowStage control={control} look={look} visible={visible} counts={counts} events={events} screen={screen} font={orbitron.style.fontFamily} />

                {/* While the show runs in the browser's full screen */}
                {fullscreen && (
                    <div className="absolute top-4 right-4 z-30 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur border border-white/15 text-xs text-white/80 pointer-events-none">
                        Press <kbd className="px-1.5 py-0.5 mx-0.5 rounded bg-white/15 font-mono text-[11px] text-white">Esc</kbd> to exit full screen
                    </div>
                )}

                {/* Readability: darken the top and bottom edges behind the text */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/50 via-transparent to-black/60" />

                {/* The role on the LED wall is drawn in a canvas; this is the same text for screen readers */}
                <p className="sr-only" aria-live="polite">{role ? `For the ${role}: ${screen.line ?? ''}` : ''}</p>

                {showOverlays && (
                    <div className="absolute inset-0 pointer-events-none text-white">
                        {/* Welcome banner, framed in the gate's doorway like a lit sign inside */}
                        <Fade show={phase === 'outside'} className="flex-col items-center justify-end text-center px-4 pb-[18vh]">
                            <div className="relative px-6 sm:px-10 py-4 sm:py-5 bg-[#071226]/70 backdrop-blur-[2px] border-y border-cyan-300/50 shadow-[0_0_40px_rgba(34,211,238,0.25)]">
                                <h1 className={`${orbitron.className} text-2xl sm:text-4xl lg:text-5xl font-bold tracking-wide text-cyan-100 drop-shadow-[0_0_14px_rgba(103,232,249,0.85)]`}>
                                    WELCOME TO STAGEVERSE
                                </h1>
                                <p className="mt-2 text-xs sm:text-sm tracking-[0.3em] text-white/85">SCROLL TO ENTER THE EXPERIENCE</p>
                                <p className="sr-only">The entire concert ecosystem, one platform: from discovery to production.</p>
                            </div>
                            <ChevronDown className="mt-4 w-7 h-7 text-cyan-300 animate-bounce" aria-hidden />
                        </Fade>

                        <Fade show={phase === 'cues'} className="items-end justify-start p-6 sm:p-12 pb-24">
                            <div>
                                <div className="font-mono text-cyan-300 text-xs sm:text-sm tracking-[0.3em] mb-2">{cueName?.toUpperCase()} · GO</div>
                                <h2 className="text-3xl sm:text-5xl font-bold max-w-xl drop-shadow-xl">Every show runs on cues.</h2>
                                <p className="mt-3 text-gray-300 max-w-md">StageVerse puts the whole production on one timeline, from the first ticket to the last blackout.</p>
                            </div>
                        </Fade>

                        <Fade show={phase === 'encore'} className="flex-col items-center justify-end text-center px-4 pb-28 sm:pb-32">
                            <h2 className="text-4xl sm:text-6xl font-black drop-shadow-2xl">You call the encore.</h2>
                            <p className="mt-3 text-gray-300">Pick the colour for the finale.</p>
                            <div className="pointer-events-auto mt-5 flex flex-wrap justify-center gap-3 max-w-md" role="group" aria-label="Encore colour">
                                {ENCORE_CHOICES.map((c) => (
                                    <button key={c.label} onClick={() => pickEncore(c)} aria-label={`Encore colour ${c.label}`} aria-pressed={encore.label === c.label}
                                        className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 ${encore.label === c.label ? 'border-white scale-110' : 'border-white/20'}`}
                                        style={{ background: `linear-gradient(135deg, ${c.a}, ${c.b})`, boxShadow: `0 0 24px ${c.a}88` }} />
                                ))}
                            </div>
                        </Fade>

                        {/* The playground: the visitor takes the lights */}
                        <Fade show={phase === 'play'} className="flex-col items-start justify-end px-4 sm:px-12 pb-24 sm:pb-12">
                            <div className="pointer-events-auto max-w-md rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 p-5 sm:p-6">
                                <div className="font-mono text-cyan-300 text-xs tracking-[0.3em] mb-2">YOUR TURN</div>
                                <h2 className="text-2xl sm:text-3xl font-black mb-2">Run the show yourself.</h2>
                                <p className="text-sm text-gray-300 mb-4">Take the lighting desk, or drop in a song: we find its beats and sections and program a light show for it, right here in your browser. Your file never leaves your device.</p>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => setDeskOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-sm font-bold hover:bg-cyan-300">
                                        <Settings2 className="w-4 h-4" /> Take the desk
                                    </button>
                                    <button onClick={() => fileInput.current?.click()} disabled={Boolean(song.status)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-black text-sm font-bold disabled:opacity-60">
                                        {song.status ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Light up your song
                                    </button>
                                    {song.bundled && (
                                        <button onClick={playDemo} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/30 text-sm font-bold hover:border-white">
                                            <Music className="w-4 h-4" /> {song.bundled.title}
                                        </button>
                                    )}
                                </div>
                                <input ref={fileInput} type="file" accept="audio/*" className="hidden"
                                    onChange={(e) => { analyseUpload(e.target.files?.[0]); e.target.value = ''; }} />
                                {song.status && <p className="mt-3 text-xs text-cyan-200" role="status">{song.status}</p>}
                                {song.ready && (
                                    <button onClick={() => playShow(song.ready.show, song.ready.url, song.ready.url)}
                                        className="mt-3 flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-sm font-bold hover:bg-cyan-300">
                                        <Play className="w-4 h-4" /> Start the show: {song.ready.show.title}
                                    </button>
                                )}
                                {song.error && <p className="mt-3 text-xs text-red-300" role="alert">{song.error}</p>}
                                <div className="mt-4 flex gap-3 text-sm">
                                    <Link href="/login" className="font-bold text-cyan-300 hover:underline">Get started →</Link>
                                    <a href="#events" className="text-gray-300 hover:underline">Explore events</a>
                                </div>
                            </div>
                        </Fade>
                    </div>
                )}

                {/* Concert mode: now playing, with the programmed timeline (click to seek) */}
                {mode !== 'scroll' && song.playing && now && (
                    <div className="absolute left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[36rem] bottom-20 sm:bottom-6 rounded-2xl bg-black/75 backdrop-blur-md border border-white/10 p-4 text-white">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <div className="min-w-0">
                                <div className="font-bold truncate">{now.title}</div>
                                <div className="text-[11px] text-gray-400 font-mono">
                                    {now.bpm} BPM · {songSection ? songSection.kind.toUpperCase() : ''}{mode === 'manual' ? ' · desk has the lights' : ''}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-xs text-gray-300">{fmt(song.time)} / {fmt(now.duration)}</span>
                                <button onClick={stopSong} aria-label="Stop concert mode" className="p-2 rounded-full bg-white/10 hover:bg-white/20"><Square className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>
                        <div onClick={seek} role="slider" aria-label="Song position" aria-valuemin={0} aria-valuemax={Math.round(now.duration)} aria-valuenow={Math.round(song.time)} tabIndex={0}
                            className="relative h-8 rounded-md overflow-hidden cursor-pointer bg-white/5">
                            {now.sections.map((s) => (
                                <div key={s.start} title={`${s.kind} ${fmt(s.start)}`} className="absolute top-0 bottom-0 border-r border-black/60"
                                    style={{ left: `${(s.start / now.duration) * 100}%`, width: `${((s.end - s.start) / now.duration) * 100}%`, background: `${SECTION_COLORS[s.kind]}55` }} />
                            ))}
                            {now.energy?.length > 1 && (
                                <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${now.energy.length} 1`} preserveAspectRatio="none" aria-hidden>
                                    <polyline fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="0.04" vectorEffect="non-scaling-stroke"
                                        points={now.energy.map((e, i) => `${i},${1 - e * 0.9}`).join(' ')} />
                                </svg>
                            )}
                            <div className="absolute top-0 bottom-0 w-0.5 bg-white" style={{ left: `${(song.time / now.duration) * 100}%` }} />
                        </div>
                    </div>
                )}

                <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20 flex flex-col items-end gap-3 pointer-events-none">
                    <LightingDesk
                        open={deskOpen}
                        onOpenChange={setDeskOpen}
                        desk={desk}
                        counts={deskCounts}
                        manual={mode === 'manual'}
                        onChange={changeDesk}
                        onCounts={changeCounts}
                        onMomentary={momentary}
                        onResume={resume}
                        song={songControls}
                    />
                </div>
            </div>
        </section>
    );
}
