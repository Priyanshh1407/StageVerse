'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { track } from '@vercel/analytics';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Orbitron } from 'next/font/google';
import { ChevronDown, ChevronUp, Headphones, Music, Square, Upload, Settings2, Loader2, Play, SunMedium, Flame, Zap, Sparkles, SunDim, Lamp, Power, ArrowRight, ArrowLeft } from 'lucide-react';
import { DEFAULT_LOOK, mixHex } from '@/lib/show/look';
import { prepareSongShow } from '@/lib/show/timeline';
import { buildIdleShow } from '@/lib/show/program';
import { CO2_JETS, CO2_TRUSS_JETS, co2Pattern, co2TrussPattern } from '@/lib/show/co2';
import { CONFETTI_UNITS, STREAMER_UNITS, confettiPattern, streamerPattern } from '@/lib/show/confetti';
import { defaultGrid, finale, fireOne, rng as fwRng } from '@/lib/show/fireworks';
import { FEATURES } from '@/lib/features';
import { HowItWorks, ShareButtons } from './SongExtras';
import { readSongLink } from '@/lib/show/share';
import { primeFireworkSound, setFireworkSound } from './fireworkSound';
import { buildScrollSheet, ENCORE_CHOICES, phaseAt, roleAt, screenAt, STOPS, stopAt } from './scrollShow';
import { CHAIN, PLAY_STAGES, WALK_SECONDS, playStep as nextPlayStop } from './tour';
import { currentState, HOUSE_UP_MS, songTime } from './director';
import LightingDesk from './LightingDesk';
import { logoTag, logoScript } from '@/components/brand/Logo';
import GenrePicker from './GenrePicker';
import { DEFAULT_GENRE, GENRE_KEYS, GENRES } from '@/lib/show/genres';
import BiggerScreenNotice from './BiggerScreenNotice';
import LoadingScreen from './LoadingScreen';
import { markReady, resetReady } from './stageReady';
import { BEAM_COUNTS } from '@/components/home/stage/useQualityTier';

// The 3D stage is client-only and loads after the page (the headline below is plain HTML)
const ShowStage = dynamic(() => import('./ShowStage'), { ssr: false });

// Display face for the LED wall and the venue sign (drawn into canvases, so it's passed by name)
const orbitron = Orbitron({ subsets: ['latin'], weight: ['700', '900'], display: 'swap' });
// The special effects the desk fires: how many units, their patterns, the shortest burst when held
const DESK_EFFECTS = {
    co2: { units: CO2_JETS, pattern: co2Pattern, minHold: 0.4 },
    co2Truss: { units: CO2_TRUSS_JETS, pattern: co2TrussPattern, minHold: 0.4 },
    confetti: { units: CONFETTI_UNITS, pattern: confettiPattern, minHold: 0.4 },
    streamers: { units: STREAMER_UNITS, pattern: streamerPattern, minHold: 0.4 },
};
// Live during a song's light show (the show carries on): the space bar fires the CO2 (floor and
// truss), shift the confetti; each fires while held, at least a short burst
// the camera views during a song, in key order: 1, 2, 3
const VIEWS = [['show', 'Show'], ['audience', 'Audience'], ['artist', 'Artist']];

const LIVE_FX = {
    co2: { kinds: ['co2', 'co2Truss'], label: 'CO2', key: 'Space' },
    confetti: { kinds: ['confetti'], label: 'Confetti', key: 'Shift' },
};
// The logo's two faces, for the LED wall and the gate sign (drawn into canvases, so passed by name)
const LOGO_FONTS = { tag: logoTag.style.fontFamily, script: logoScript.style.fontFamily };

// Shown wherever the demo songs are offered or playing (commercial recordings, see README)
const SONG_NOTICE = 'Songs on this site are used for educational, non-commercial purposes only. All rights belong to their respective owners.';

// Demo songs, up to 2 per genre, listed by `npm run demos` from public/audio/<genre>/. Only this small
// list loads with the page; a song's programmed show is fetched when it's picked.
const DEMO_INDEX = '/shows/index.json';
const SECTION_COLORS = { intro: '#3b5bff', calm: '#3b5bff', groove: '#a855f7', build: '#ff8a00', peak: '#ff3df2', outro: '#3b5bff' };
const MAX_UPLOAD_MB = 80;
// The show section's height (vh): the stage scrolls this minus one screen. Taller = more scroll per section
const SHOW_VH = 800;
// Moving a section at a time: every glide takes STEP_MS; the one through the riser and the drop
// colours takes DROP_MS; scroll events closer together than GESTURE_GAP_MS belong to the same gesture
const STEP_MS = 1600;
const DROP_MS = 4200;
const GESTURE_GAP_MS = 220;
// After a song: the house lights come up, hold, then the playground returns (ms, including the fade)
const AFTER_SHOW_MS = HOUSE_UP_MS + 5000;
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// A hidden overlay is inert: its buttons can't take taps or focus. pointer-events-none alone isn't enough,
// because a child with pointer-events-auto (the playground card) still catches taps,
// and on a phone those invisible cards cover the overlay that is showing.
// each persona's sign-up role, and its article ("an organizer")
const ROLE_SIGNUP = { Crew: 'production', Organizer: 'organizer', Fan: 'fan', Artist: 'artist' };
const ROLE_ARTICLE = { Crew: 'a', Organizer: 'an', Fan: 'a', Artist: 'an' };
// which stage plays which genre (the playground walks to it)
const STAGE_GENRES = PLAY_STAGES.filter((st) => st.genres.length)
    .map((st) => `${st.genres.map((g) => GENRES[g]?.label ?? g).join(' and ')} play${st.genres.length > 1 ? '' : 's'} on the ${st.title}`)
    .join(', ') + '.';

/** The playground on a phone: what it is, and a link to open it on a bigger screen. */
function PhonePlayground() {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try { await navigator.clipboard.writeText(window.location.origin + '/'); setCopied(true); } catch { setCopied(false); }
    };
    return (
        <>
            <h2 className="text-2xl font-black mb-2">Play a song and run the lights.</h2>
            <p className="text-sm text-gray-300">Pick a song and watch the stage light up to it, or run the lights yourself. It needs a laptop or desktop with the sound on.</p>
            <button type="button" onClick={copy} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white font-bold text-black">
                {copied ? 'Link copied: open it on your computer' : 'Copy the link for your computer'}
            </button>
        </>
    );
}

function Fade({ show, children, className = '' }) {
    return (
        <div aria-hidden={!show} inert={!show} className={`absolute inset-0 flex transition-opacity duration-500 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${className}`}>
            {children}
        </div>
    );
}

/**
 * Decode an audio file in the browser and resample it to 22.05 kHz stereo for analysis (the left
 * and right channels let the vocal detection find what's mixed to the centre).
 */
async function decodeForAnalysis(file) {
    const ctx = new AudioContext();
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    ctx.close();
    const rate = 22050;
    const offline = new OfflineAudioContext(2, Math.ceil(decoded.duration * rate), rate);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return { channels: [rendered.getChannelData(0).slice(), rendered.getChannelData(1).slice()], sampleRate: rate, duration: decoded.duration };
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
function analyseInWorker(channels, sampleRate, title, genre) {
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
        worker.postMessage({ channels, sampleRate, title, genre }, channels.map((c) => c.buffer));
    });
}

/**
 * "The Show": the homepage hero. A tall section with a sticky full-screen stage; scrolling runs
 * the cue stack (scrollShow.js): outside the venue, through the doors, the rig coming up, a look
 * per role on the LED wall, the drop, then the playground (the lighting desk, the
 * demo song, or the visitor's own song, analysed in their browser).
 */
function ShowExperience({ events = [], isPhone = false }) {
    const section = useRef(null);
    const stage = useRef(null);
    const fileInput = useRef(null);
    // The genre of the visitor's own song (each is analysed and lit its own way)
    const [genre, setGenre] = useState(DEFAULT_GENRE);
    const look = useRef(DEFAULT_LOOK);
    const control = useRef({ mode: 'scroll', progress: 0, sheet: buildScrollSheet(), idle: prepareSongShow(buildIdleShow()), shot: 'outside' });

    const [phase, setPhase] = useState('outside');
    const [role, setRole] = useState(null);
    const [screen, setScreen] = useState({ kind: 'brand' });
    const [cueName, setCueName] = useState('');
    const [visible, setVisible] = useState(true);
    const [mode, setMode] = useState('scroll');
    const [desk, setDesk] = useState(DEFAULT_LOOK);
    const [deskOpen, setDeskOpen] = useState(false);
    const [counts, setCounts] = useState({ beams: null, lasers: 40, blinders: 8 });
    // demos: the demo songs' shows (only those whose track exists); current: the show playing;
    // ready: an uploaded song analysed and waiting for "Start the show"
    const [song, setSong] = useState({ demos: [], current: null, ready: null, playing: false, time: 0, status: null, error: null });
    const [fullscreen, setFullscreen] = useState(false);
    const [brightnessTip, setBrightnessTip] = useState(false); // shown for the first seconds of a show
    const [screenNotice, setScreenNotice] = useState(false); // phones: the playground is for bigger screens
    const [playStep, setPlayStep] = useState('genre'); // the playground: 'genre', then 'songs', then 'lights'
    // the playground's stage (the festival grounds): which one, and whether the camera is walking there
    const [playStage, setPlayStage] = useState('home');
    const [walkingTo, setWalkingTo] = useState(null);
    // during a song: the show's own camera, or the audience's or the artist's view held (control.view)
    const [view, setView] = useState('show');
    const pickView = useCallback((v) => { setView(v); control.current.view = v; }, []);
    // a panel that holds the show still while it is open (the genre help): only the panel scrolls
    const holdScroll = useCallback((on) => { control.current.scrollHeld = on; }, []);
    const [explain, setExplain] = useState(false); // the "how it works" overlay during a song
    const [linked, setLinked] = useState(null);    // a song and moment asked for by the page's link (?song=&t=)
    const [stopKey, setStopKey] = useState(STOPS[0].key); // the section dot that's lit
    // The loading screen starts over each time the homepage mounts. Done while rendering, before the
    // stage's effects run, so nothing they report is wiped.
    useState(resetReady);
    // the faces the LED wall and the venue sign are drawn with
    useEffect(() => {
        let alive = true;
        document.fonts?.ready.then(() => { if (alive) markReady('fonts'); }) ?? markReady('fonts');
        return () => { alive = false; };
    }, []);

    // Scroll progress through the section drives the show (no re-render unless an overlay changes)
    useEffect(() => {
        const c0 = control.current;
        // A paced scroll to `toY` over `ms` (ease in and out). Snapping is paused meanwhile, and the
        // visitor's wheel, touch or keys take over at once.
        const glide = (toY, ms) => {
            const c = control.current;
            const html = document.documentElement;
            const fromY = window.scrollY;
            const t0 = performance.now();
            c.gliding = true;
            html.style.scrollSnapType = 'none';
            const stop = () => {
                c.gliding = false;
                cancelAnimationFrame(c.glideFrame);
                html.style.scrollSnapType = '';
                window.removeEventListener('pointerdown', stop);
                c.settleFromY = window.scrollY;
            };
            // (dragging the scrollbar takes over; wheel, keys and touch move a section at a time: see stepTo below)
            window.addEventListener('pointerdown', stop, { passive: true });
            const step = (now) => {
                const k = Math.min(1, (now - t0) / ms);
                const eased = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
                window.scrollTo({ top: fromY + (toY - fromY) * eased, behavior: 'instant' });
                if (k < 1) c.glideFrame = requestAnimationFrame(step);
                else stop();
            };
            c.glideFrame = requestAnimationFrame(step);
            c.stopGlide = stop;
        };
        // The show plays the dot it is at (control.dot, an index into STOPS), not the raw scroll position: each dot is
        // a fixed moment on a fixed stage (the gate, the house lights, the cues, each persona, the
        // playground). Reaching a dot (a scroll gesture, a key, a swipe, a click on it) moves the show there in a
        // set time (control.dotMove, played by the director) and the camera to that dot's stage, whatever the
        // scroll does meanwhile. The overlays follow the dot too.
        const showDot = (index) => {
            const at = STOPS[index].at;
            setPhase(phaseAt(at));
            // (leaving the playground, the camera walks back to the live stage: so does the stage picker)
            if (phaseAt(at) !== 'play') setPlayStage('home');
            setStopKey(STOPS[index].key);
            setRole(roleAt(at)?.key ?? null);
            setScreen((prev) => {
                const next = screenAt(at);
                return prev.kind === next.kind && prev.key === next.key ? prev : next;
            });
            const c = control.current;
            if (c.sheet) {
                let name = c.sheet.cues[0]?.name ?? '';
                for (const q of c.sheet.cues) if (q.t + q.fade / 2 <= at) name = q.name;
                setCueName(name);
            }
        };
        const moveToDot = (index, ms) => {
            const c = control.current;
            if (index === c.dot && c.dotMove) return;
            const from = c.smoothProgress ?? STOPS[c.dot ?? index].at;
            // (`jump`: past other dots, e.g. Crew to the playground: the lights fade straight to the new dot's look, from
            // the one on stage now, instead of playing every section between)
            const jump = c.dot !== undefined && Math.abs(index - c.dot) > 1;
            c.dot = index;
            c.dotMove = { from, to: STOPS[index].at, t0: performance.now(), ms, jump, fromLook: jump ? c.tourLook ?? null : null };
            showDot(index);
        };
        c0.moveToDot = moveToDot;
        const nearestDot = (p) => STOPS.reduce((best, s, i) => (Math.abs(s.at - p) < Math.abs(STOPS[best].at - p) ? i : best), 0);
        const onScroll = () => {
            const el = section.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const progress = Math.min(1, Math.max(0, -rect.top / (rect.height - window.innerHeight)));
            const c = control.current;
            c.progress = progress;
            if (c.dot === undefined) {
                // the page opened part-way down: the dot nearest to where it is, with no move to play
                c.dot = nearestDot(progress);
                c.dotMove = { from: STOPS[c.dot].at, to: STOPS[c.dot].at, t0: 0, ms: 1 };
                showDot(c.dot);
            }
            // a scroll the page did not glide itself (the scrollbar dragged, a jump): once it rests, the show moves
            // to the nearest dot and the page settles on it
            if (c.gliding) return;
            clearTimeout(c.settleTimer);
            c.settleTimer = setTimeout(() => {
                if (c.mode !== 'scroll' || c.gliding) return;
                // (below the playground the visitor is reading the rest of the page: never pulled back into the show)
                if (c.progress > STOPS[STOPS.length - 1].at + 0.004) return;
                const index = nearestDot(c.progress);
                if (index !== c.dot) moveToDot(index, STEP_MS);
                const y = yOf(STOPS[index]);
                if (Math.abs(window.scrollY - y) > 2) glide(y, 600);
            }, 180);
        };
        // Section to section: inside the show, every scroll gesture, arrow key or swipe moves exactly one section,
        // as a glide of a set length (STEP_MS), however fast or hard the visitor scrolls; it never rests in between.
        // The rest of a gesture (a trackpad's coasting, a second flick during the glide) is ignored, so a gesture
        // can't skip a section. Down past the last section (the playground), the page scrolls on as usual.
        const yOf = (stop) => {
            const el = section.current;
            return el.getBoundingClientRect().top + window.scrollY + stop.at * (el.offsetHeight - window.innerHeight);
        };
        const inShow = () => {
            const el = section.current;
            if (!el) return false;
            const r = el.getBoundingClientRect();
            return r.top <= 2 && r.bottom >= window.innerHeight - 2;
        };
        // the glide's length: the same for every section, longer only for the riser and the drop
        const msBetween = (from, to) => ((from.key === 'artist' && to.key === 'play') ? DROP_MS : STEP_MS);
        const stepTo = (to) => {
            const c = control.current;
            if (!to) return false;
            const from = STOPS[c.dot ?? 0];
            const ms = msBetween(from, to);
            c.glideDir = Math.sign(STOPS.indexOf(to) - STOPS.indexOf(from)) || Math.sign(to.at - (c.progress ?? 0));
            moveToDot(STOPS.indexOf(to), ms);
            c.stopGlide?.();
            glide(yOf(to), ms);
            return true;
        };
        const step = (dir) => {
            const c = control.current;
            // the other way during a glide (a change of mind, even during the drop's long glide): it turns back
            if (c.gliding && dir === c.glideDir) return false;
            const here = STOPS[c.dot ?? 0];
            const p = c.progress ?? 0;
            // the page away from its dot in the way it is going (back up from below the show, a scrollbar drag):
            // that dot first
            if (!c.gliding && ((dir < 0 && p > here.at + 0.004) || (dir > 0 && p < here.at - 0.004))) return stepTo(here);
            return stepTo(STOPS[(c.dot ?? 0) + dir]);
        };
        c0.stepTo = stepTo;
        c0.step = step;
        // whether this direction stays in the show (down from the last section, or up from the first, leaves it)
        const staysIn = (dir) => {
            const c = control.current;
            const dot = c.dot ?? 0;
            const p = c.progress ?? 0;
            // (up: also when below the last dot's place, so coming back up from below lands on the playground)
            return dir > 0 ? dot < STOPS.length - 1 : dot > 0 || p > STOPS[dot].at + 0.004;
        };
        // 8: a panel or list under the pointer that can still scroll that way scrolls itself, not the show
        const scrollsItself = (target, dir) => {
            for (let el = target; el && el !== section.current && el !== document.body; el = el.parentElement) {
                const { overflowY } = getComputedStyle(el);
                if (!/(auto|scroll)/.test(overflowY) || el.scrollHeight <= el.clientHeight + 1) continue;
                if (dir < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
            }
            return false;
        };
        const onWheel = (e) => {
            const c = control.current;
            const dir = Math.sign(e.deltaY);
            if (!dir || e.ctrlKey || !inShow()) return;
            // a list that can scroll that way scrolls itself; a panel holding the show (the genre help) or a song
            // playing (7) keeps the page where it is
            if (scrollsItself(e.target, dir)) return;
            if (c.scrollHeld || c.mode === 'song') { e.preventDefault(); return; }
            if (c.mode !== 'scroll' || !staysIn(dir)) return;
            e.preventDefault();
            const now = performance.now();
            // a new gesture: after a pause, or (5) the other way, even mid-coast
            if (now - (c.lastWheel ?? 0) > GESTURE_GAP_MS || dir !== c.wheelDir) c.gestureStepped = false;
            c.lastWheel = now;
            c.wheelDir = dir;
            if (c.gestureStepped) return;
            c.gestureStepped = step(dir) || c.gliding;
        };
        const onKey = (e) => {
            const c = control.current;
            if (c.mode !== 'scroll' || c.scrollHeld || !inShow() || e.altKey || e.ctrlKey || e.metaKey) return;
            // (typing in a field: its own keys; a focused button keeps Space and Enter, the arrows still move sections)
            if (e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
            if (e.key === ' ' && e.target?.closest?.('button')) return;
            const down = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey);
            const up = e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey);
            const dir = down ? 1 : up ? -1 : 0;
            if (!dir || !staysIn(dir)) return;
            e.preventDefault();
            if (!e.repeat) step(dir);
        };
        const touch = { y: null, stepped: false };
        const onTouchStart = (e) => { touch.y = e.touches[0]?.clientY ?? null; touch.stepped = false; };
        const onTouchMove = (e) => {
            const c = control.current;
            if (touch.y === null || !inShow()) return;
            const dy = touch.y - (e.touches[0]?.clientY ?? touch.y);
            const dir = Math.sign(dy);
            if (!dir || scrollsItself(e.target, dir)) return;
            if (c.scrollHeld || c.mode === 'song') { e.preventDefault(); return; }
            if (c.mode !== 'scroll' || !staysIn(dir)) return;
            e.preventDefault();
            if (!touch.stepped && Math.abs(dy) > 40) touch.stepped = step(dir);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        window.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('keydown', onKey);
        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            window.removeEventListener('wheel', onWheel);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
            clearTimeout(c0.settleTimer);
            if (c0.gliding) c0.stopGlide?.();
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

    // The demo song list (each song's show loads when it's picked)
    useEffect(() => {
        let cancelled = false;
        const c = control.current;
        fetch(DEMO_INDEX).then((r) => (r.ok ? r.json() : null)).then((index) => {
            if (!cancelled && Array.isArray(index?.demos)) setSong((s) => ({ ...s, demos: index.demos }));
        }).catch(() => {}).finally(() => markReady('songs'));
        return () => {
            cancelled = true;
            c.audio?.pause();
            if (c.objectUrl) URL.revokeObjectURL(c.objectUrl);
        };
    }, []);

    /** Walk to the next stage round the grounds (dir -1 or +1); its preferred genre is picked for the songs. */
    const shiftStage = (dir) => {
        const c = control.current;
        if (walkingTo || !c.tourState) return;
        const next = nextPlayStop(c.tourState, dir);
        if (next === null) return;
        c.playWanted = next;
        const key = CHAIN[next];
        setWalkingTo(key);
        setTimeout(() => { setPlayStage(key); setWalkingTo(null); }, WALK_SECONDS * 1000 + 300);
        const preferred = PLAY_STAGES.find((st) => st.key === key)?.genres[0];
        if (preferred) setGenre(preferred);
    };

    /** Glide to one of the show's sections (the same set pace as scrolling a section at a time). */
    const goToStop = (stop) => {
        const c = control.current;
        if (c.stepTo) { c.stopGlide?.(); c.stepTo(stop); return; }
        const el = section.current;
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top + stop.at * (el.offsetHeight - window.innerHeight), behavior: 'smooth' });
    };

    // --- Lighting desk -------------------------------------------------------------------
    // While the show runs, the open desk mirrors it (switches, faders and encoders show what's on
    // stage now), like a console following a playback; touching any control takes over from there
    useEffect(() => {
        if (!deskOpen || mode === 'manual') return undefined;
        const tick = () => setDesk(currentState(control.current).look);
        tick();
        const id = setInterval(tick, 300);
        return () => clearInterval(id);
    }, [deskOpen, mode]);

    const takeOver = () => {
        const c = control.current;
        if (c.mode === 'manual') return;
        const { look: now } = currentState(c);
        c.desk = { ...now, pulse: 0, strobe: 0, blinder: now.blinder > 0.5 ? 1 : 0, dropFx: 0, laserChase: 0 };
        c.mode = 'manual';
        setMode('manual');
        setDesk(c.desk);
        setCounts((n) => ({ ...n, beams: n.beams ?? BEAM_COUNTS[0] }));
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

    // The drop, from the desk or the playground, three ways real shows land one (each ~2.6 s, then
    // back to exactly what the desk had; a new drop cancels one still running):
    //   spool  everything dark but the lasers, which open up from the centre, then the rig slams in
    //   slam   half a second of total blackout, then everything at full, fanned over the crowd
    //   burst  every beam pinched onto the centre, then exploding out wide
    const fireDrop = (style = 'slam') => {
        takeOver();
        const c = control.current;
        (c.dropTimers || []).forEach(clearTimeout);
        const saved = c.dropSaved && c.dropTimers?.length ? c.dropSaved : { ...c.desk };
        c.dropSaved = saved;
        const at = (ms, patch) => setTimeout(() => { c.desk = { ...c.desk, ...patch }; }, ms);
        const full = { master: 1, beams: 1, sides: 1, floor: 1, wash: 1, pixel: 1, laser: 1, laserSeq: 0, laserAmount: 1, laserSpread: 1.8, intensity: 1.6 };
        if (style === 'spool') {
            c.desk = { ...c.desk, beams: 0, sides: 0, floor: 0, wash: 0, pixel: 0, laser: 1, laserSeq: 0, laserAmount: 0.08, laserSpread: 1.8, strobe: 0, blinder: 0 };
            c.dropTimers = [at(150, { laserAmount: 1 }), at(1500, { ...full, ...{ fan: 1.4, converge: 0 }, blinder: 1, strobe: 1 }), at(1850, { blinder: 0 }), at(2300, { strobe: 0 })];
        } else if (style === 'burst') {
            c.desk = { ...c.desk, ...full, converge: 1, focusFloor: 0, sweep: 0.05, strobe: 1, blinder: 0 };
            c.dropTimers = [at(450, { converge: 0, fan: 1.8, tiltShift: -0.05, sweep: 0.5, blinder: 1 }), at(800, { blinder: 0 }), at(1400, { strobe: 0 })];
        } else {
            c.desk = { ...c.desk, master: 0, strobe: 0, blinder: 0 };
            c.dropTimers = [at(500, { ...full, fan: 1.5, tiltShift: -0.1, converge: 0, blinder: 1, strobe: 1 }), at(850, { blinder: 0 }), at(1700, { strobe: 0 })];
        }
        c.dropTimers.push(setTimeout(() => { c.desk = { ...saved }; c.dropTimers = []; c.dropSaved = null; }, 2600));
    };
    const nextDrop = useRef(0);

    // Special effects from the desk (CO2 jets, confetti, streamers): hold to keep every unit firing (at least a
    // short burst), or fire a pattern. Each firing is { unit, at, len }, kept per effect in
    // control.fired; the director turns them into the units' state.
    const fireEffect = (kind, pattern) => {
        takeOver();
        const c = control.current;
        const now = performance.now();
        const fx = DESK_EFFECTS[kind];
        const fresh = fx.pattern(pattern).map((f) => ({ unit: f.unit, at: now + f.delay, len: f.len }));
        const old = (c.fired?.[kind] || []).filter((f) => f.len === null || now - f.at < (f.len + 2) * 1000);
        c.fired = { ...c.fired, [kind]: [...old, ...fresh] };
    };
    const holdEffect = (kind, down) => {
        const c = control.current;
        const now = performance.now();
        const fx = DESK_EFFECTS[kind];
        const list = c.fired?.[kind] || [];
        if (down) {
            takeOver();
            c.fired = { ...c.fired, [kind]: [...list, ...Array.from({ length: fx.units }, (_, unit) => ({ unit, at: now, len: null }))] };
        } else if (list.some((f) => f.len === null)) {
            // let go: every held unit fires for as long as it was held, at least a short burst
            c.fired = { ...c.fired, [kind]: list.map((f) => (f.len === null ? { ...f, len: Math.max(fx.minHold, (now - f.at) / 1000) } : f)) };
        }
    };

    // Fireworks from the desk: one kind per press, or the FINALE. Colours: the scheme picked on the
    // desk (mixed, classic firework colours, or the show's colours); sound on or off.
    const [fwOptions, setFwOptions] = useState({ scheme: 'mixed', sound: true });
    const changeFwOptions = (patch) => {
        setFwOptions((o) => {
            const next = { ...o, ...patch };
            setFireworkSound(next.sound);
            return next;
        });
    };
    const fwRandom = useRef(null);
    const launchFireworks = (volley) => {
        takeOver();
        primeFireworkSound(); // a click: the browser now allows sound
        const c = control.current;
        const now = performance.now() / 1000;
        c.fireworks = [...(c.fireworks || []), ...volley.map(({ at, launch }) => ({ ...launch, at: now + at }))];
    };
    const fireworkOpts = () => ({ scheme: fwOptions.scheme, show: [control.current.desk?.colorA ?? '#19d9ff', control.current.desk?.colorB ?? '#ff3df2'] });
    const randomFw = () => (fwRandom.current ??= fwRng(Math.random()));
    const fireFirework = (type) => launchFireworks(fireOne(type, randomFw(), fireworkOpts()).map((launch) => ({ at: 0, launch })));
    // the desk's finale: the same choreography, on a 128 BPM grid, building steadily
    const fireFinale = () => launchFireworks(finale(randomFw(), fireworkOpts(), defaultGrid(128), { genre: 'edm', bpm: 128 }));

    // One-tap lighting for the playground's "Run the lights" step (the same actions as the desk)
    const manual = mode === 'manual';
    const isOn = (key) => manual && desk[key] > 0.05;
    const toggle = (key) => changeDesk({ [key]: isOn(key) ? 0 : 1 });
    const QUICK = [
        // each tap lands the drop a different way: slam, burst, laser spool
        { key: 'drop', label: 'Drop', icon: Flame, hint: 'The big moment', tap: () => fireDrop(['slam', 'burst', 'spool'][nextDrop.current++ % 3]) },
        { key: 'strobe', label: 'Strobe', icon: Zap, hint: 'Hold', hold: true },
        { key: 'laser', label: 'Lasers', icon: Sparkles, hint: 'On / off', tap: () => toggle('laser'), active: isOn('laser') },
        { key: 'blinder', label: 'Blinders', icon: SunDim, hint: 'On / off', tap: () => toggle('blinder'), active: isOn('blinder') },
        { key: 'house', label: 'House lights', icon: Lamp, hint: 'Light the venue', tap: () => toggle('house'), active: isOn('house') },
        { key: 'blackout', label: 'Blackout', icon: Power, hint: 'All off', tap: () => changeDesk({ master: manual && desk.master < 0.5 ? 1 : 0 }), active: manual && desk.master < 0.5 },
    ];
    const pickColors = (c) => changeDesk({ colorA: c.a, colorB: c.b, washColor: mixHex(c.a, c.b, 0.5), laserColor: c.a, master: 1 });

    const resume = () => {
        const c = control.current;
        c.mode = c.audio && !c.audio.paused ? 'song' : 'scroll';
        setMode(c.mode);
        setCounts((n) => ({ ...n, beams: null }));
    };

    // --- Live effects during a song (space bar: CO2, shift: confetti) ---------------------
    // Only while a song's light show runs; the show isn't taken over (unlike the lighting desk)
    const [liveOn, setLiveOn] = useState({ co2: false, confetti: false });
    const liveHold = useCallback((which, down) => {
        const c = control.current;
        if (down && c.mode !== 'song') return;
        const now = performance.now();
        c.live = c.live || {};
        let changed = false;
        for (const kind of LIVE_FX[which].kinds) {
            const fx = DESK_EFFECTS[kind];
            const list = c.live[kind] || [];
            const held = list.some((f) => f.len === null);
            if (down && !held) {
                const recent = list.filter((f) => now - f.at < (f.len + 20) * 1000);
                c.live[kind] = [...recent, ...Array.from({ length: fx.units }, (_, unit) => ({ unit, at: now, len: null }))];
                changed = true;
            } else if (!down && held) {
                // let go: every unit fires for as long as it was held, at least a short burst
                c.live[kind] = list.map((f) => (f.len === null ? { ...f, len: Math.max(fx.minHold, (now - f.at) / 1000) } : f));
                changed = true;
            }
        }
        if (changed) setLiveOn((o) => ({ ...o, [which]: down }));
    }, []);

    // The keys, while a song's light show runs (not while typing in a field): held = firing
    useEffect(() => {
        if (mode !== 'song' || !song.playing) return undefined;
        const which = (e) => (e.code === 'Space' ? 'co2' : e.key === 'Shift' ? 'confetti' : null);
        const typing = (e) => {
            const t = e.target;
            return t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
        };
        const down = (e) => {
            // 1, 2, 3: the show's camera, the audience's view, the artist's view
            const n = ['1', '2', '3'].indexOf(e.key);
            if (n >= 0 && !typing(e) && !e.altKey && !e.ctrlKey && !e.metaKey) { pickView(VIEWS[n][0]); return; }
            const w = which(e);
            if (!w || typing(e)) return;
            e.preventDefault(); // the space bar mustn't scroll the page or press a focused button
            if (!e.repeat) liveHold(w, true);
        };
        const up = (e) => {
            const w = which(e);
            if (!w) return;
            if (!typing(e)) e.preventDefault();
            liveHold(w, false);
        };
        const release = () => { liveHold('co2', false); liveHold('confetti', false); };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        window.addEventListener('blur', release); // switching window mid-hold: let go
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
            window.removeEventListener('blur', release);
            release();
        };
    }, [mode, song.playing, liveHold, pickView]);

    // --- Concert mode --------------------------------------------------------------------
    const stopSong = useCallback(() => {
        const c = control.current;
        c.live = null; // anything still held stops with the song
        setLiveOn({ co2: false, confetti: false });
        // effects still in the air carry on to their end (unless the song had already ended: then they already are)
        if (c.mode === 'song' && c.song && c.audio && !c.houseUpAt) c.linger = { song: c.song, t: songTime(c), at: performance.now() };
        clearTimeout(c.afterShow);
        c.houseUpAt = null;
        c.audio?.pause();
        if (c.audio) c.audio.currentTime = 0;
        if (c.mode === 'song') c.mode = 'scroll';
        setMode(c.mode);
        setSong((s) => ({ ...s, playing: false, time: 0 }));
        exitShowMode();
    }, []);

    /** Play a programmed show with its audio (a URL, or an object URL for an uploaded file). */
    const playShow = (show, url, objectUrl = null, startAt = 0) => {
        const c = control.current;
        c.audio?.pause();
        if (c.objectUrl && c.objectUrl !== objectUrl) URL.revokeObjectURL(c.objectUrl);
        c.objectUrl = objectUrl;
        c.song = prepareSongShow(show);
        // every song starts on the show's own camera (the audience's or the artist's view only when picked)
        pickView('show');
        c.clock = null;
        c.live = null;
        clearTimeout(c.afterShow);
        c.houseUpAt = null;
        const audio = new Audio(url);
        // a shared link starts at its moment
        if (startAt > 0) audio.addEventListener('loadedmetadata', () => { audio.currentTime = Math.min(startAt, Math.max(0, audio.duration - 5)); }, { once: true });
        audio.addEventListener('timeupdate', () => setSong((s) => ({ ...s, time: audio.currentTime })));
        // The last note: house lights up and hold for a moment, like the end of a concert, then back to the playground
        audio.addEventListener('ended', () => {
            c.houseUpAt = performance.now();
            c.linger = { song: c.song, t: audio.duration || audio.currentTime, at: performance.now() };
            c.afterShow = setTimeout(stopSong, AFTER_SHOW_MS);
        });
        c.audio = audio;
        primeFireworkSound(); // playing a song is a click: the fireworks in it may make sound
        audio.play().catch(() => stopSong());
        c.mode = 'song';
        setMode('song');
        setSong((s) => ({ ...s, current: show, ready: null, playing: true, status: null, error: null }));
        setDeskOpen(false);
        enterShowMode(stage.current); // must run inside the click that started the show
        setBrightnessTip(true);
        setTimeout(() => setBrightnessTip(false), 6000);
    };

    // A demo's show, fetched the first time it's picked
    const demoShows = useRef(new Map());
    const playDemo = async (demo, startAt = 0) => {
        track('Play song', { song: demo.title, genre: demo.genre ?? '' });
        try {
            let show = demoShows.current.get(demo.slug);
            if (!show) {
                const res = await fetch(demo.show);
                if (!res.ok) throw new Error('missing');
                show = { ...(await res.json()), artist: demo.artist, demo: true, slug: demo.slug };
                demoShows.current.set(demo.slug, show);
            }
            playShow(show, encodeURI(show.audio), null, startAt);
        } catch {
            setSong((s) => ({ ...s, error: `Couldn't load ${demo.title}. Try again in a moment.` }));
        }
    };

    // The playground (lighting desk, demo songs, "Light up your song") is made for bigger screens: on a
    // phone, a tap explains that instead of starting it. The scroll show itself plays everywhere.
    // straight past the show to the events below it (the page doesn't settle back into the show from there)
    const skipToEvents = () => {
        const el = document.getElementById('events');
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'instant' });
    };
    const bigScreenOnly = (action) => () => (isPhone ? setScreenNotice(true) : action());
    const bigScreenOnly2 = (action) => (arg) => (isPhone ? setScreenNotice(true) : action(arg));
    const genreDemos = song.demos.filter((d) => d.genre === genre);
    const closeScreenNotice = useCallback(() => setScreenNotice(false), []);
    // A link to a song and moment: offered as one button (a browser only plays sound after a click)
    useEffect(() => {
        if (!FEATURES.share) return;
        const asked = readSongLink(window.location.search);
        if (asked) setLinked(asked);
    }, []);
    const linkedDemo = linked ? song.demos.find((d) => d.slug === linked.slug) : null;

    // The visitor's own song: decoded and analysed in their browser, never uploaded anywhere
    const analyseUpload = async (file) => {
        if (file) track('Light up own song');
        if (!file) return;
        if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
            setSong((s) => ({ ...s, error: `That file is over ${MAX_UPLOAD_MB} MB.` }));
            return;
        }
        const title = file.name.replace(/\.[^.]+$/, '');
        try {
            setSong((s) => ({ ...s, status: 'Reading your song…', error: null }));
            const { channels, sampleRate, duration } = await decodeForAnalysis(file);
            if (duration > 15 * 60) throw new Error('Songs up to 15 minutes, please.');
            setSong((s) => ({ ...s, status: `Finding the tempo, beats and sections (${GENRES[genre].label})…` }));
            const show = await analyseInWorker(channels, sampleRate, title, genre);
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
    const deskCounts = { ...counts, beams: counts.beams ?? BEAM_COUNTS[0] };
    const showOverlays = mode !== 'song';
    // The lighting desk offers the first demo song
    const firstDemo = song.demos[0];
    const songControls = { available: Boolean(firstDemo), title: firstDemo?.title, playing: song.playing, play: () => firstDemo && playDemo(firstDemo), stop: stopSong };

    return (
        <section ref={section} className="relative bg-[#010208]" style={{ height: `${SHOW_VH}vh` }} aria-label="StageVerse live show">
            <LoadingScreen />
            {/* Where the scroll can rest: the page settles gently on these (html has scroll-snap-type: y proximity).
                The stage scrolls SHOW_VH − 100 vh (the section minus one screen), so a stop at progress p sits that far × p down. */}
            {STOPS.map((s) => (
                <div key={s.key} aria-hidden className="absolute left-0 h-px w-px" style={{ top: `${s.at * (SHOW_VH - 100)}vh`, scrollSnapAlign: 'start' }} />
            ))}
            <div ref={stage} className="sticky top-0 h-screen w-full overflow-hidden bg-[#010208]">
                <ShowStage control={control} look={look} visible={visible} counts={counts} events={events} screen={screen} font={orbitron.style.fontFamily} logoFonts={LOGO_FONTS} />

                {/* Phones: tapping a playground control explains it's made for bigger screens */}
                <BiggerScreenNotice open={screenNotice} onClose={closeScreenNotice} />

                {/* Start of a show: recommend headphones and full screen brightness (a page can't set it itself) */}
                <div aria-live="polite" className={`absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur border border-white/15 text-sm text-white pointer-events-none transition-opacity duration-700 ${brightnessTip ? 'opacity-100' : 'opacity-0'}`}>
                    <Headphones className="w-4 h-4 text-amber-300" aria-hidden />
                    <SunMedium className="w-4 h-4 text-yellow-300" aria-hidden />
                    {brightnessTip && 'For the full experience, put on headphones and turn your screen brightness all the way up'}
                </div>

                {/* While the show runs in the browser's full screen */}
                {fullscreen && (
                    <div className="absolute top-4 right-4 z-30 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur border border-white/15 text-xs text-white/80 pointer-events-none">
                        Press <kbd className="px-1.5 py-0.5 mx-0.5 rounded bg-white/15 font-mono text-xs text-white">Esc</kbd> to exit full screen
                    </div>
                )}

                {/* Section dots (small): where you are, and a jump to any section */}
                {/* (not on phones: they swipe, the dots would cover the text, and Skip to events is always there) */}
                {showOverlays && !isPhone && (
                    <nav aria-label="Show sections" className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-end gap-0">
                        <button type="button" onClick={() => control.current.step?.(-1)} disabled={stopKey === STOPS[0].key} aria-label="Previous section"
                            className="mb-1 grid place-items-center w-10 h-10 rounded-full bg-black/50 border border-white/20 text-white/85 hover:bg-white/15 disabled:opacity-30">
                            <ChevronUp className="w-4 h-4" aria-hidden />
                        </button>
                        {STOPS.map((s) => {
                            const active = stopKey === s.key;
                            return (
                                <button key={s.key} onClick={() => goToStop(s)} aria-label={`Go to: ${s.label}`} aria-current={active ? 'step' : undefined}
                                    className="group flex min-h-7 min-w-10 items-center justify-end gap-1.5 px-2.5 py-1">
                                    <span className={`hidden sm:block text-xs font-medium text-white/90 bg-black/50 backdrop-blur px-1.5 py-0.5 rounded transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{s.label}</span>
                                    <span className={`block rounded-full transition-all ${active ? 'w-2 h-2 bg-amber-300 shadow-[0_0_6px_rgba(255,176,0,0.9)]' : 'w-1.5 h-1.5 bg-white/40 group-hover:bg-white/80'}`} />
                                </button>
                            );
                        })}
                        <button type="button" onClick={() => control.current.step?.(1)} disabled={stopKey === STOPS[STOPS.length - 1].key} aria-label="Next section"
                            className="mt-1 grid place-items-center w-10 h-10 rounded-full bg-black/50 border border-white/20 text-white/85 hover:bg-white/15 disabled:opacity-30">
                            <ChevronDown className="w-4 h-4" aria-hidden />
                        </button>
                    </nav>
                )}

                {/* Readability: darken the top and bottom edges behind the text */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/50 via-transparent to-black/60" />

                {/* The role on the LED wall is drawn in a canvas; this is the same text for screen readers */}
                <p className="sr-only" aria-live="polite">{role ? `For the ${role}: ${screen.line ?? ''}` : ''}</p>

                {showOverlays && (
                    <div className="absolute inset-0 pointer-events-none text-white">
                        {/* Welcome banner, framed in the gate's doorway like a lit sign inside */}
                        <Fade show={phase === 'outside'} className="flex-col items-center justify-end text-center px-4 pb-[18vh]">
                            <div className="relative px-6 sm:px-10 py-4 sm:py-5 bg-[#071226]/70 backdrop-blur-[2px] border-y border-purple-300/50 shadow-[0_0_40px_rgba(255,176,0,0.25)]">
                                <h1 className={`${orbitron.className} text-2xl sm:text-4xl lg:text-5xl font-bold tracking-wide text-amber-100 drop-shadow-[0_0_14px_rgba(255,176,0,0.85)]`}>
                                    WELCOME TO STAGEVERSE
                                </h1>
                                <p className="mt-3 max-w-xl mx-auto text-sm sm:text-base text-white/90">Find shows, vote on the setlist and run the production: one place for fans, artists, organizers and crew.</p>
                            </div>
                            <div className="pointer-events-auto mt-5 flex flex-wrap justify-center gap-3">
                                <button type="button" onClick={() => control.current.step?.(1)}
                                    className="min-h-12 rounded-full bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] px-6 font-bold text-black shadow-lg shadow-[#ff6a00]/25 hover:brightness-110">
                                    Watch the show
                                </button>
                                <button type="button" onClick={skipToEvents}
                                    className="min-h-12 rounded-full border border-white/30 bg-black/50 px-6 font-bold text-white hover:bg-white/15">
                                    Find events
                                </button>
                            </div>
                            <p className="mt-3 flex items-center gap-1 text-xs tracking-[0.2em] text-white/70"><ChevronDown className="w-4 h-4 animate-bounce" aria-hidden /> OR SCROLL</p>
                        </Fade>

                        <Fade show={phase === 'cues'} className="items-end justify-start p-6 sm:p-12 pb-24">
                            <div>
                                <div className="font-mono text-amber-300 text-xs sm:text-sm tracking-[0.3em] mb-2">{cueName?.toUpperCase()} · GO</div>
                                <h2 className="text-3xl sm:text-5xl font-bold max-w-xl drop-shadow-xl">Every show runs on cues.</h2>
                                <p className="mt-3 text-gray-300 max-w-md">StageVerse puts the whole production on one timeline, from the first booking to the last blackout.</p>
                            </div>
                        </Fade>

                        {/* Each persona's line, as text (it is also on the LED wall), with where to start */}
                        <Fade show={phase === 'roles' && Boolean(role)} className="items-end justify-start p-6 sm:p-12 pb-24 sm:pb-24">
                            <div className="max-w-md rounded-2xl bg-black/60 backdrop-blur-sm border border-white/10 p-5">
                                <div className="font-mono text-amber-300 text-xs tracking-[0.3em] mb-2">FOR THE {String(role ?? '').toUpperCase()}</div>
                                <p className="text-lg sm:text-xl font-bold leading-snug">{screen.line}</p>
                                <Link href={`/signup?role=${ROLE_SIGNUP[role] ?? 'fan'}`} className="pointer-events-auto mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-amber-300 hover:underline">
                                    Sign up as {ROLE_ARTICLE[role] ?? 'a'} {String(role ?? '').toLowerCase()} <ArrowRight className="w-4 h-4" aria-hidden />
                                </Link>
                            </div>
                        </Fade>

                        {/* 3. past the show at any point: straight to the events */}
                        {phase !== 'outside' && phase !== 'play' && (
                            <button type="button" onClick={skipToEvents}
                                className="pointer-events-auto absolute bottom-5 left-1/2 -translate-x-1/2 flex min-h-11 items-center gap-1 rounded-full border border-white/20 bg-black/60 px-4 text-sm font-semibold text-white/90 backdrop-blur hover:bg-white/15">
                                Skip to events <ChevronDown className="w-4 h-4" aria-hidden />
                            </button>
                        )}

                        {/* The playground, in three steps: pick a genre, play one of its songs (or your own), run the lights */}
                        <Fade show={phase === 'play'} className="flex-col items-start justify-end px-4 sm:px-12 pb-24 sm:pb-12">
                            <div className="pointer-events-auto w-full max-w-md rounded-2xl bg-black/80 border border-white/10 p-5 sm:p-6">
                                <div className="flex items-center justify-between font-mono text-xs tracking-[0.3em] mb-2">
                                    <span className="text-amber-300">YOUR TURN</span>
                                    {!isPhone && <span className="text-gray-400">STEP {playStep === 'genre' ? 1 : playStep === 'songs' ? 2 : 3} OF 3</span>}
                                </div>

                                {isPhone ? (
                                    <PhonePlayground />
                                ) : playStep === 'genre' ? (
                                    <>
                                        {/* the stage: walk round the grounds with the arrows, then pick a genre and a song to play there */}
                                        {FEATURES.festival && (() => {
                                            const here = PLAY_STAGES.find((st) => st.key === (walkingTo ?? playStage)) ?? PLAY_STAGES[0];
                                            return (
                                                <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
                                                    <button type="button" onClick={() => shiftStage(-1)} disabled={Boolean(walkingTo)} aria-label="Previous stage"
                                                        className="grid place-items-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40"><ArrowLeft className="w-4 h-4" /></button>
                                                    <div className="min-w-0 flex-1 text-center">
                                                        <p className="text-sm font-bold truncate">{walkingTo ? `Walking to the ${here.title}...` : here.title}</p>
                                                        <p className="text-xs text-gray-400 truncate">{here.genres.length ? `Best for ${here.genres.map((g) => GENRES[g]?.label ?? g).join(' and ')}` : 'Any genre'}</p>
                                                    </div>
                                                    <button type="button" onClick={() => shiftStage(1)} disabled={Boolean(walkingTo)} aria-label="Next stage"
                                                        className="grid place-items-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40"><ArrowRight className="w-4 h-4" /></button>
                                                </div>
                                            );
                                        })()}
                                        <h2 className="text-2xl sm:text-3xl font-black mb-1">Play a song.</h2>
                                        <p className="text-sm text-gray-300 mb-1">Pick a genre first: each one is analysed and lit its own way.</p>
                                        {FEATURES.festival && <p className="text-xs text-gray-400 mb-4">{STAGE_GENRES}</p>}
                                        <GenrePicker value={genre} onHelpChange={holdScroll} counts={Object.fromEntries(GENRE_KEYS.map((g) => [g, song.demos.filter((d) => d.genre === g).length]))}
                                            onChange={bigScreenOnly2((g) => { setGenre(g); setPlayStep('songs'); })} />
                                        <button onClick={bigScreenOnly(() => setPlayStep('lights'))}
                                            className="mt-3 flex min-h-11 items-center gap-1 text-sm text-gray-300 hover:text-white">
                                            <Settings2 className="w-4 h-4" /> Skip to running the lights <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : playStep === 'songs' ? (
                                    <>
                                        <button onClick={() => setPlayStep('genre')} className="mb-2 flex items-center gap-1 text-xs text-gray-400 hover:text-white">
                                            <ArrowLeft className="w-3.5 h-3.5" /> All genres
                                        </button>
                                        <h2 className="text-2xl sm:text-3xl font-black mb-1">{GENRES[genre].label}</h2>
                                        <p className="flex items-center gap-1.5 text-xs text-yellow-200/90 mb-3">
                                            <Headphones className="w-3.5 h-3.5" aria-hidden /><SunMedium className="w-3.5 h-3.5" aria-hidden /> For the best experience, use headphones and turn your screen brightness and volume up.
                                        </p>
                                        {genreDemos.length > 0 && (
                                            <div className="flex flex-col gap-2 mb-3">
                                                {genreDemos.map((demo) => (
                                                    <button key={demo.slug} onClick={bigScreenOnly(() => playDemo(demo))} title={demo.artist ? `${demo.title} by ${demo.artist}` : demo.title}
                                                        className="flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3 text-left font-bold text-black hover:bg-amber-300 transition-colors">
                                                        <Play className="w-5 h-5 shrink-0" aria-hidden />
                                                        <span className="min-w-0">{demo.title}{demo.artist && <span className="block text-xs font-medium text-black/60">{demo.artist}</span>}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <button onClick={bigScreenOnly(() => fileInput.current?.click())} disabled={Boolean(song.status)}
                                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-400 text-black text-sm font-bold disabled:opacity-60">
                                            {song.status ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Light up your own {GENRES[genre].label} song
                                        </button>
                                        <p className="mt-2 text-xs text-gray-400">We find its beats and sections and program a show for it in your browser. Your file never leaves your device.</p>
                                        {song.status && <p className="mt-3 text-xs text-amber-200" role="status">{song.status}</p>}
                                        {song.ready && (
                                            <button onClick={() => playShow(song.ready.show, song.ready.url, song.ready.url)}
                                                className="mt-3 flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-sm font-bold hover:bg-amber-300">
                                                <Play className="w-4 h-4" /> Start the show: {song.ready.show.title}
                                            </button>
                                        )}
                                        {song.error && <p className="mt-3 text-xs text-red-300" role="alert">{song.error}</p>}
                                        {genreDemos.length > 0 && <p className="mt-3 text-xs leading-snug text-gray-400">{SONG_NOTICE}</p>}
                                        {/* There's more: the lights are the next step */}
                                        <button onClick={bigScreenOnly(() => setPlayStep('lights'))}
                                            className="mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold text-gray-200 hover:text-white">
                                            <Settings2 className="w-4 h-4" aria-hidden /> Next: run the lights yourself <ArrowRight className="w-4 h-4" aria-hidden />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <h2 className="text-2xl sm:text-3xl font-black mb-1">Run the lights.</h2>
                                        <p className="text-sm text-gray-300 mb-4">Tap a button and the rig answers. Hold <b>Strobe</b> for as long as you like.</p>
                                        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Quick lighting controls">
                                            {QUICK.map(({ key, label, icon: Icon, hint, tap, hold, active }) => (
                                                <button key={key} aria-pressed={active ?? undefined}
                                                    {...(hold
                                                        ? { onPointerDown: () => momentary({ strobe: 1 }, true), onPointerUp: () => momentary({ strobe: 0 }, false), onPointerLeave: () => momentary({ strobe: 0 }, false) }
                                                        : { onClick: tap })}
                                                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-sm font-bold transition-colors select-none ${active ? 'bg-amber-300 text-black border-purple-300' : key === 'drop' ? 'bg-gradient-to-br from-fuchsia-500 to-orange-400 text-black border-transparent' : 'bg-white/5 border-white/15 hover:border-white/50'}`}>
                                                    <Icon className="w-5 h-5" aria-hidden />
                                                    {label}
                                                    <span className={`text-xs font-medium ${active || key === 'drop' ? 'text-black/70' : 'text-gray-400'}`}>{hint}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <div className="mt-4 text-xs text-gray-400 mb-2">Colours</div>
                                        <div className="flex flex-wrap gap-2" role="group" aria-label="Rig colour">
                                            {ENCORE_CHOICES.map((c) => (
                                                <button key={c.label} onClick={() => pickColors(c)} aria-label={`Rig colour ${c.label}`} title={c.label} aria-pressed={manual && desk.colorA === c.a}
                                                    className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 ${manual && desk.colorA === c.a ? 'border-white scale-110' : 'border-white/20'}`}
                                                    style={{ background: `linear-gradient(135deg, ${c.a}, ${c.b})` }} />
                                            ))}
                                        </div>
                                        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                                            <button onClick={() => setPlayStep('songs')} className="flex items-center gap-1 text-gray-300 hover:text-white">
                                                <ArrowLeft className="w-4 h-4" /> Back to songs
                                            </button>
                                            <button onClick={() => setDeskOpen(true)} className="flex items-center gap-1 font-bold text-amber-300 hover:underline">
                                                <Settings2 className="w-4 h-4" /> More controls
                                            </button>
                                            {manual && <button onClick={resume} className="text-gray-300 hover:text-white">Hand back the lights</button>}
                                        </div>
                                    </>
                                )}
                                <input ref={fileInput} type="file" accept="audio/*" className="hidden"
                                    onChange={(e) => { analyseUpload(e.target.files?.[0]); e.target.value = ''; }} />
                                <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-x-5 text-sm">
                                    <Link href="/signup" className="flex min-h-11 items-center font-bold text-amber-300 hover:underline">Create a free account →</Link>
                                    <button type="button" onClick={skipToEvents} className="flex min-h-11 items-center text-gray-300 hover:underline">Find events</button>
                                </div>
                            </div>
                        </Fade>
                    </div>
                )}

                {FEATURES.howItWorks && explain && mode !== 'scroll' && song.playing && now && <HowItWorks show={now} control={control} onClose={() => setExplain(false)} />}
                {/* Opened from a shared link: one click starts that song at that moment */}
                {linkedDemo && !song.playing && (
                    <div className="absolute left-1/2 top-24 z-30 -translate-x-1/2 rounded-2xl border border-white/10 bg-black/80 p-4 text-center text-white backdrop-blur-md">
                        <p className="text-xs text-gray-300">Someone shared a moment with you</p>
                        <button type="button" onClick={bigScreenOnly(() => { const d = linkedDemo; const t = linked.t; setLinked(null); playDemo(d, t); })}
                            className="mx-auto mt-2 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] px-5 py-2.5 text-sm font-bold text-black">
                            <Play className="h-4 w-4" /> Play {linkedDemo.title}{linked.t > 0 ? ` from ${fmt(linked.t)}` : ''}
                        </button>
                        <button type="button" onClick={() => setLinked(null)} className="mt-2 text-xs text-gray-400 hover:text-white">Not now</button>
                    </div>
                )}
                {/* Concert mode: now playing, with the programmed timeline (click to seek) */}
                {mode !== 'scroll' && song.playing && now && (
                    <div className="absolute left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[30rem] bottom-20 sm:bottom-4 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 px-3 py-2 text-white">
                        <div className="flex items-center justify-between gap-3 text-sm mb-1.5">
                            <div className="min-w-0">
                                <div className="font-bold truncate leading-tight">{now.title}</div>
                                {now?.demo && <div className="text-xs leading-tight text-gray-400 truncate">{now.artist ? `${now.artist} · ` : ''}educational, non-commercial use only</div>}
                            </div>
                            <div className="flex shrink-0 items-center gap-2 font-mono text-xs text-gray-300">
                                <span className="hidden sm:inline text-gray-400">{now.bpm} BPM · {songSection ? (songSection.label ?? songSection.kind).toUpperCase() : ''}{mode === 'manual' ? ' · DESK' : ''}</span>
                                <span>{fmt(song.time)} / {fmt(now.duration)}</span>
                                <button onClick={stopSong} aria-label="Stop concert mode" className="p-1.5 rounded-full bg-white/10 hover:bg-white/20"><Square className="w-3 h-3" /></button>
                            </div>
                        </div>
                        <div onClick={seek} role="slider" aria-label="Song position" aria-valuemin={0} aria-valuemax={Math.round(now.duration)} aria-valuenow={Math.round(song.time)} tabIndex={0}
                            className="relative h-5 rounded overflow-hidden cursor-pointer bg-white/5">
                            {now.sections.map((s) => (
                                <div key={s.start} title={`${s.label ?? s.kind} ${fmt(s.start)}`} className="absolute top-0 bottom-0 border-r border-black/60"
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
                        {/* the camera: the show's own, or the audience's or the artist's view held (keys 1, 2, 3) */}
                        {mode === 'song' && (
                            <div role="group" aria-label="Camera view" className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg bg-white/5 p-0.5">
                                {VIEWS.map(([v, label], i) => (
                                    <button key={v} type="button" onClick={() => pickView(v)} aria-pressed={view === v} aria-keyshortcuts={String(i + 1)}
                                        className={`flex items-center justify-center gap-1.5 rounded-md py-1 text-xs font-semibold ${view === v ? 'bg-amber-300 text-black' : 'text-gray-300 hover:bg-white/10'}`}>
                                        <kbd className={`font-mono text-xs px-1 rounded ${view === v ? 'bg-black/15' : 'bg-white/10 text-gray-400'}`}>{i + 1}</kbd>{label}
                                    </button>
                                ))}
                            </div>
                        )}
                        {/* one row: share, how it works, and the live effects */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {(FEATURES.share || FEATURES.howItWorks) && (
                            <>
                                {FEATURES.share && <ShareButtons show={now} time={song.time} stage={stage} />}
                                {FEATURES.howItWorks && (
                                    <button type="button" onClick={() => setExplain((x) => !x)} aria-pressed={explain}
                                        className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold ${explain ? 'border-transparent bg-[#ff6a00] text-black' : 'border-white/15 bg-white/10 hover:bg-white/20'}`}>
                                        How it works
                                    </button>
                                )}
                            </>
                        )}
                        {/* Live effects on top of the show (it carries on): hold to fire, or hold the key */}
                        {mode === 'song' && (
                            <>
                                {Object.entries(LIVE_FX).map(([which, fx]) => (
                                    <button key={which} type="button" aria-pressed={liveOn[which]} aria-keyshortcuts={fx.key === 'Space' ? 'Space' : 'Shift'}
                                        onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); liveHold(which, true); }}
                                        onPointerUp={() => liveHold(which, false)} onPointerCancel={() => liveHold(which, false)} onLostPointerCapture={() => liveHold(which, false)}
                                        onContextMenu={(e) => e.preventDefault()}
                                        title="Hold to fire. The show carries on."
                                        className={`select-none touch-none px-2.5 py-1 rounded-lg border text-xs font-black tracking-wider transition-colors ${liveOn[which] ? 'bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] text-black border-purple-300' : 'bg-white/10 border-white/15 hover:bg-white/20'}`}>
                                        {fx.label} <kbd className={`ml-0.5 px-1 py-0.5 rounded font-mono text-xs font-normal ${liveOn[which] ? 'bg-black/20' : 'bg-white/15'}`}>{fx.key}</kbd>
                                    </button>
                                ))}
                            </>
                        )}
                        </div>
                    </div>
                )}

                <div className={`absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20 flex flex-col items-end gap-3 pointer-events-none ${isPhone ? 'hidden' : ''}`}>
                    <LightingDesk
                        onDrop={fireDrop}
                        onEffect={fireEffect}
                        onEffectHold={holdEffect}
                        onFirework={fireFirework}
                        onFinale={fireFinale}
                        fwOptions={fwOptions}
                        onFwOptions={changeFwOptions}
                        open={deskOpen}
                        onOpenChange={(open) => (open ? bigScreenOnly(() => { track('Open lighting desk'); setDeskOpen(true); })() : setDeskOpen(false))}
                        desk={desk}
                        counts={deskCounts}
                        manual={mode === 'manual'}
                        onChange={changeDesk}
                        onCounts={changeCounts}
                        onMomentary={momentary}
                        onResume={resume}
                        song={songControls}
                        look={look}
                    />
                </div>
            </div>
        </section>
    );
}

// Phones: narrow screens, or a phone held sideways
const PHONE_QUERY = '(max-width: 767px), (pointer: coarse) and (max-height: 500px)';
const subscribePhone = (onChange) => {
    const mq = window.matchMedia(PHONE_QUERY);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
};

/** The homepage hero. On phones the scroll show plays as normal; the playground asks for a bigger screen. */
export default function ShowSection(props) {
    const isPhone = useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE_QUERY).matches, () => false);
    return <ShowExperience {...props} isPhone={isPhone} />;
}
