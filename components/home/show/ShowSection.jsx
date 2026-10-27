'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ChevronDown, Users, Calendar, Wrench, Music, Square } from 'lucide-react';
import { DEFAULT_LOOK } from '@/lib/show/look';
import { prepareSongShow } from '@/lib/show/timeline';
import { buildScrollSheet, ENCORE_CHOICES, ROLES, phaseAt, roleAt } from './scrollShow';
import { currentState } from './director';
import LightingDesk from './LightingDesk';

// The 3D stage is client-only and loads after the page (the headline below is plain HTML)
const ShowStage = dynamic(() => import('./ShowStage'), { ssr: false });

const SONG_SHOW = '/shows/sky-full-of-stars.show.json';
const ROLE_ICONS = { Fan: Users, Artist: Music, Organizer: Calendar, Crew: Wrench };
const SECTION_COLORS = { intro: '#3b5bff', calm: '#3b5bff', groove: '#a855f7', build: '#ff8a00', peak: '#ff3df2', outro: '#3b5bff' };
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function Fade({ show, children, className = '' }) {
    return (
        <div aria-hidden={!show} className={`absolute inset-0 flex transition-opacity duration-500 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${className}`}>
            {children}
        </div>
    );
}

/**
 * "The Show": the homepage hero. A 400vh section with a sticky full-screen stage; scrolling
 * runs the cue stack (scrollShow.js). The lighting desk takes the lights over by hand, and
 * concert mode plays a song with its programmed light show.
 */
export default function ShowSection({ events = [] }) {
    const section = useRef(null);
    const look = useRef(DEFAULT_LOOK);
    const control = useRef({ mode: 'scroll', progress: 0, sheet: buildScrollSheet(), shot: 'house' });

    const [phase, setPhase] = useState('intro');
    const [role, setRole] = useState(null);
    const [cueName, setCueName] = useState('House lights down');
    const [visible, setVisible] = useState(true);
    const [encore, setEncore] = useState(ENCORE_CHOICES[0]);
    const [mode, setMode] = useState('scroll');
    const [desk, setDesk] = useState(DEFAULT_LOOK);
    const [deskOpen, setDeskOpen] = useState(false);
    const [counts, setCounts] = useState({ beams: null, lasers: 24, blinders: 8 });
    const [song, setSong] = useState({ available: false, show: null, playing: false, time: 0 });

    // Scroll progress through the section drives the show (no re-render unless the overlay changes)
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

    // Stop rendering the 3D stage while it's scrolled out of view
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
        observer.observe(section.current);
        return () => observer.disconnect();
    }, []);

    // Concert mode is offered only where the song file exists (it's local-only: copyrighted)
    useEffect(() => {
        let cancelled = false;
        const c = control.current;
        fetch(SONG_SHOW)
            .then((r) => (r.ok ? r.json() : null))
            .then(async (show) => {
                if (!show?.audio || cancelled) return;
                const head = await fetch(encodeURI(show.audio), { method: 'HEAD' });
                if (head.ok && !cancelled) setSong((s) => ({ ...s, available: true, show }));
            })
            .catch(() => {});
        return () => {
            cancelled = true;
            c.audio?.pause();
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
        c.desk = { ...now, pulse: 0, strobe: 0, blinder: now.blinder > 0.5 ? 1 : 0 };
        c.mode = 'manual';
        setMode('manual');
        setDesk(c.desk);
        setCounts((n) => ({ ...n, beams: n.beams ?? 72 }));
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
            const saved = { converge: c.desk.converge, intensity: c.desk.intensity, strobe: 0, blinder: c.desk.blinder };
            c.desk = { ...c.desk, ...patch };
            setTimeout(() => { c.desk = { ...c.desk, strobe: 0, blinder: saved.blinder }; }, 450);
            setTimeout(() => { c.desk = { ...c.desk, ...saved }; }, 1600);
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
    }, []);

    const playSong = () => {
        const c = control.current;
        if (!song.show) return;
        if (!c.audio) {
            c.song = prepareSongShow(song.show);
            c.audio = new Audio(encodeURI(song.show.audio));
            c.audio.addEventListener('timeupdate', () => setSong((s) => ({ ...s, time: c.audio.currentTime })));
            c.audio.addEventListener('ended', stopSong);
        }
        c.audio.currentTime = 0;
        c.audio.play().catch(() => stopSong());
        c.mode = 'song';
        setMode('song');
        setSong((s) => ({ ...s, playing: true }));
        setDeskOpen(false);
    };

    const seek = (e) => {
        const c = control.current;
        const rect = e.currentTarget.getBoundingClientRect();
        if (c.audio && song.show) c.audio.currentTime = ((e.clientX - rect.left) / rect.width) * song.show.duration;
    };

    const songSection = song.show?.sections.find((s) => song.time >= s.start && song.time < s.end);
    const deskCounts = { ...counts, beams: counts.beams ?? 72 };
    const showOverlays = mode !== 'song';
    const currentRole = role && { ...ROLES.find((r) => r.key === role), Icon: ROLE_ICONS[role] };

    return (
        <section ref={section} className="relative h-[400vh] bg-[#010208]" aria-label="StageVerse live show">
            <div className="sticky top-0 h-screen w-full overflow-hidden">
                <ShowStage control={control} look={look} visible={visible} counts={counts} events={events} />

                {/* Readability: darken the top and bottom edges behind the text */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/50 via-transparent to-black/60" />

                {showOverlays && (
                    <div className="absolute inset-0 pointer-events-none text-white">
                        <Fade show={phase === 'intro'} className="flex-col items-center justify-center text-center px-4 pt-16">
                            <h1 className="text-4xl sm:text-6xl lg:text-8xl font-bold leading-[1.05] tracking-tight drop-shadow-2xl">
                                The Entire Concert<br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-cyan-400 to-fuchsia-400">Ecosystem. One Platform.</span>
                            </h1>
                            <p className="mt-6 text-lg md:text-2xl text-cyan-100/80 font-light max-w-2xl">From discovery to production. Scroll to run the show.</p>
                            <ChevronDown className="mt-10 w-8 h-8 text-cyan-300 animate-bounce" aria-hidden />
                        </Fade>

                        <Fade show={phase === 'cues'} className="items-end justify-start p-6 sm:p-12 pb-24">
                            <div>
                                <div className="font-mono text-cyan-300 text-xs sm:text-sm tracking-[0.3em] mb-2">{cueName?.toUpperCase()} · GO</div>
                                <h2 className="text-3xl sm:text-5xl font-bold max-w-xl drop-shadow-xl">Every show runs on cues.</h2>
                                <p className="mt-3 text-gray-300 max-w-md">StageVerse puts the whole production on one timeline, from the first ticket to the last blackout.</p>
                            </div>
                        </Fade>

                        <Fade show={phase === 'roles' && Boolean(currentRole)} className="items-center justify-center sm:justify-start px-4 sm:px-16">
                            {currentRole && (
                                <div key={currentRole.key} className="pointer-events-auto max-w-md rounded-2xl bg-black/55 backdrop-blur-md border border-white/10 p-6 sm:p-8 animate-[fadeIn_0.5s_ease-out]">
                                    <div className="flex items-center gap-3 mb-3">
                                        <currentRole.Icon className="w-7 h-7" style={{ color: currentRole.colors?.[0] }} />
                                        <span className="text-xs font-mono tracking-[0.3em] text-gray-400">FOR THE</span>
                                    </div>
                                    <h3 className="text-4xl sm:text-5xl font-black mb-3" style={{ color: currentRole.colors?.[0] }}>{currentRole.key}</h3>
                                    <p className="text-gray-200 mb-5">{currentRole.line}</p>
                                    <Link href="/login" className="inline-block px-6 py-2.5 rounded-full bg-white text-black font-bold text-sm hover:bg-cyan-300 transition-colors">
                                        Join as {currentRole.key.toLowerCase()}
                                    </Link>
                                </div>
                            )}
                        </Fade>

                        <Fade show={phase === 'encore'} className="flex-col items-center justify-end text-center px-4 pb-28 sm:pb-32">
                            <h2 className="text-4xl sm:text-6xl font-black drop-shadow-2xl">You call the encore.</h2>
                            <p className="mt-3 text-gray-300">Pick the colour for the finale.</p>
                            <div className="pointer-events-auto mt-5 flex gap-3" role="group" aria-label="Encore colour">
                                {ENCORE_CHOICES.map((c) => (
                                    <button key={c.label} onClick={() => pickEncore(c)} aria-label={`Encore colour ${c.label}`} aria-pressed={encore.label === c.label}
                                        className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 ${encore.label === c.label ? 'border-white scale-110' : 'border-white/20'}`}
                                        style={{ background: `linear-gradient(135deg, ${c.a}, ${c.b})`, boxShadow: `0 0 24px ${c.a}88` }} />
                                ))}
                            </div>
                            <div className="pointer-events-auto mt-8 flex gap-3">
                                <Link href="/login" className="px-6 py-3 rounded-full bg-cyan-400 text-black font-bold hover:bg-cyan-300">Get started</Link>
                                <a href="#events" className="px-6 py-3 rounded-full border border-white/30 font-bold hover:border-white">Explore events</a>
                            </div>
                        </Fade>
                    </div>
                )}

                {/* Concert mode: now playing, with the programmed timeline (click to seek) */}
                {mode !== 'scroll' && song.playing && song.show && (
                    <div className="absolute left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[36rem] bottom-20 sm:bottom-6 rounded-2xl bg-black/75 backdrop-blur-md border border-white/10 p-4 text-white">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <div>
                                <div className="font-bold">{song.show.title}</div>
                                <div className="text-[11px] text-gray-400 font-mono">
                                    {song.show.bpm} BPM · {songSection ? songSection.kind.toUpperCase() : ''}{mode === 'manual' ? ' · desk has the lights' : ''}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-xs text-gray-300">{fmt(song.time)} / {fmt(song.show.duration)}</span>
                                <button onClick={stopSong} aria-label="Stop concert mode" className="p-2 rounded-full bg-white/10 hover:bg-white/20"><Square className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>
                        <div onClick={seek} role="slider" aria-label="Song position" aria-valuemin={0} aria-valuemax={Math.round(song.show.duration)} aria-valuenow={Math.round(song.time)} tabIndex={0}
                            className="relative h-8 rounded-md overflow-hidden cursor-pointer bg-white/5">
                            {song.show.sections.map((s) => (
                                <div key={s.start} title={`${s.kind} ${fmt(s.start)}`} className="absolute top-0 bottom-0 border-r border-black/60"
                                    style={{ left: `${(s.start / song.show.duration) * 100}%`, width: `${((s.end - s.start) / song.show.duration) * 100}%`, background: `${SECTION_COLORS[s.kind]}55` }} />
                            ))}
                            <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${song.show.energy.length} 1`} preserveAspectRatio="none" aria-hidden>
                                <polyline fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="0.04" vectorEffect="non-scaling-stroke"
                                    points={song.show.energy.map((e, i) => `${i},${1 - e * 0.9}`).join(' ')} />
                            </svg>
                            <div className="absolute top-0 bottom-0 w-0.5 bg-white" style={{ left: `${(song.time / song.show.duration) * 100}%` }} />
                        </div>
                    </div>
                )}

                <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20 flex flex-col items-end gap-3 pointer-events-none">
                    {song.available && !song.playing && !deskOpen && (
                        <button onClick={playSong}
                            className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-black text-sm font-bold">
                            <Music className="w-4 h-4" /> Play the show with sound
                        </button>
                    )}
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
                        song={{ available: song.available, title: song.show?.title, playing: song.playing, play: playSong, stop: stopSong }}
                    />
                </div>
            </div>
        </section>
    );
}
