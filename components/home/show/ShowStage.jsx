'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { easing } from 'maath';
import * as THREE from 'three';
import StageScene from '@/components/home/stage/StageScene';
import { useQualityTier, TIER_SETTINGS } from '@/components/home/stage/useQualityTier';
import { ConcertLights } from '@/components/ConcertLights';
import { SHOTS } from '@/lib/show/shots';
import { currentState, songTime } from './director';
import { mixLooks } from '@/lib/show/look';
import { HOME_ONLY, SITE, siteSongShot, stepTour } from './tour';
import { PLAY_FROM } from './scrollShow';
import { STAGES } from '@/lib/show/stages';
import { festivalColours } from '@/lib/show/stages/palettes';
import { limitStreamers } from '@/lib/show/stages/rig';
import { FEATURES } from '@/lib/features';
import { markReady } from './stageReady';
import hero from '@/public/images/hero.jpg';

// Fireworks going up into the sky (shells, roman candles, roof comets, the comet chase): the camera
// looks up. The mines are a low spray from the stage front, so they keep the camera's shot.
const skyward = (look) => look.fireworks?.some((f) => f.type !== 'mines') ?? false;

/**
 * What one of the other stages plays while the playground is there: the scroll's look (the idle show, the desk),
 * or a song with that stage's own touches, as on its test page: the festival colours, its streamer limit and (the
 * mainstage) its own cues. The song is adapted once, the first time it plays there. (The warehouse turns it into
 * club looks itself.)
 */
function siteLookFor(control, key, state, shown) {
    if (control.mode !== 'song' || !control.song) return shown;
    const stage = STAGES[SITE[key].stage];
    if (control.song.festivalFor !== key) {
        const song = control.song;
        control.song = {
            ...song,
            sheet: festivalColours(song.sheet, Math.round(song.duration ?? 0)),
            hits: limitStreamers(song.hits, stage.maxStreamers),
            plan: stage.cuePlan ? stage.cuePlan(song.sheet.cues) : null,
            festivalFor: key,
        };
    }
    const own = control.song.plan?.[state.index];
    return own ? { ...shown, ...own.look } : shown;
}

/** One frame of the show: put the current look on the rig and fly the camera toward its shot. */
function directFrame(control, look, camera, aim, delta) {
    // Glide toward the scroll position instead of jumping a wheel notch at a time: a critically damped
    // spring (~1 s), so a cue change eases in and eases out, at a pace you can watch even after a quick
    // scroll. The step is capped at 1/30 s, so a stalled frame can't turn into a jump.
    // Scrolling the show: it plays the move to its dot (control.dotMove, set by the page), in a set time with an
    // ease in and out, whatever the scroll does; otherwise (a song, the desk) the raw progress
    const move = control.mode === 'scroll' ? control.dotMove : null;
    let eased = 1;
    if (move) {
        const k = Math.min(1, Math.max(0, (performance.now() - move.t0) / move.ms));
        eased = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
        // a jump past other dots is at the new dot at once (its look fades in below); a step plays the way there
        control.smoothProgress = move.jump ? move.to : move.from + (move.to - move.from) * eased;
    } else {
        const raw = control.progress;
        if (control.smoothProgress === undefined) control.smoothProgress = raw;
        else easing.damp(control, 'smoothProgress', raw, 0.55, Math.min(delta, 1 / 30));
    }
    const state = currentState(control);
    // a jump: the look on stage when it started, fading to the new dot's
    const look0 = move?.jump && move.fromLook && eased < 1 ? mixLooks(move.fromLook, state.look, eased) : state.look;
    // In full screen the show runs ~30% brighter (a page can't raise the screen's own brightness)
    const shown = control.fullscreen ? { ...look0, intensity: look0.intensity * 1.3 } : look0;
    // The festival grounds (scrolling, from the personas to the drop): the camera walks to each persona's stage;
    // the stages' light levels follow it, this stage dark while it is away (components/home/show/tour.js)
    // (the stage follows the dot being gone to, not the sections passed on the way: Crew to the encore stays put)
    const p = move ? move.to : control.smoothProgress ?? control.progress ?? 0;
    // The festival grounds. Scrolling through the personas: the scroll says which stage to go to and the camera
    // walks there in its own time (components/home/show/tour.js). In the playground (and its songs and desk), the
    // stage is the one the visitor walked to with the arrows (control.playWanted). The stages' light levels follow
    // the camera: this stage is dark while it is away.
    const inPlay = control.mode !== 'scroll' || p >= PLAY_FROM - 0.005;
    if (!inPlay) control.playWanted = null;
    let tour = null;
    if (FEATURES.festival) {
        const tourState = (control.tourState ??= {});
        const opts = inPlay ? { wanted: control.playWanted ?? tourState.at ?? null, home: SHOTS.finale } : {};
        tour = stepTour(tourState, p, Math.min(delta, 0.1), camera.aspect, opts);
    }
    control.levels = tour?.levels ?? HOME_ONLY;
    control.tourLook = shown;
    // the playground at one of the other stages: it plays there what this stage would (a song with that stage's cues)
    const siteKey = inPlay && tour && SITE[tour.where] ? tour.where : null;
    control.siteKey = siteKey;
    control.siteLook = siteKey ? siteLookFor(control, siteKey, state, shown) : null;
    const home = control.levels.home;
    look.current = home >= 1 ? shown : { ...shown, master: (shown.master ?? 1) * Math.max(0.05, home) };
    if (tour && tour.where !== 'home') {
        // a song at that stage: its own camera shots (the warehouse's circling camera); otherwise its view or the walk
        const song = siteKey && control.mode === 'song' && control.audio;
        const goal = song ? siteSongShot(siteKey, state.shot, songTime(control), control.audio.duration || control.song?.duration || 0, camera.aspect) : tour;
        if (!aim.placed) { camera.position.set(...goal.pos); aim.target.set(...goal.target); aim.placed = true; }
        // (a light smoothing on the walk, which keeps its own pace; a song's shots glide as on this stage)
        const glide = song ? (STAGES[SITE[siteKey].stage].orbit ? 0.9 : 1.8) : 0.25;
        easing.damp3(camera.position, goal.pos, glide, delta);
        easing.damp3(aim.target, goal.target, glide, delta);
        camera.lookAt(aim.target);
        return;
    }
    if (control.mode !== 'manual') control.shot = state.shot;
    // While fireworks are in the air the camera stands back and looks up, so the whole sky is in view
    const sky = skyward(state.look);
    const shot = (sky ? SHOTS.sky : SHOTS[control.shot]) || SHOTS.wide;
    if (!aim.placed) {
        // First frame: start on the shot instead of flying in from the default camera
        camera.position.set(...shot.pos);
        aim.target.set(...shot.target);
        aim.placed = true;
    }
    // No handheld sway: a constantly moving camera makes every sub-pixel detail (truss bracing,
    // LED pixels, fixture vents) crawl, which reads as flicker
    // During a song's show the camera sits a little higher, over the whole rig
    const lift = control.mode === 'song' ? 2.2 : 0;
    aim.pos[0] = shot.pos[0];
    aim.pos[1] = shot.pos[1] + lift;
    aim.pos[2] = shot.pos[2];
    aim.look[0] = shot.target[0];
    aim.look[1] = shot.target[1] + lift * 0.4;
    aim.look[2] = shot.target[2];
    // From the rig coming up (the 3rd section) to the encore (the second to last), the camera
    // stands 5 m further back along its view, so the top truss isn't cut by the navbar; it eases
    // in before the rig section and back out after the encore (the gate, the house lights and the
    // playground keep their framing)
    if (control.mode === 'scroll') {
        const p = control.smoothProgress ?? control.progress ?? 0;
        const ramp = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };
        const k = ramp((p - 0.33) / 0.04) * (1 - ramp((p - 0.885) / 0.035));
        const back = 5 * k;
        // and looks a little higher, so the whole rig sits below the navbar (there's floor to spare)
        aim.look[1] += 1.8 * k;
        if (back > 0) {
            const dx = aim.pos[0] - aim.look[0];
            const dy = aim.pos[1] - aim.look[1];
            const dz = aim.pos[2] - aim.look[2];
            const len = Math.hypot(dx, dy, dz) || 1;
            aim.pos[0] += (dx / len) * back;
            aim.pos[1] += (dy / len) * back;
            aim.pos[2] += (dz / len) * back;
        }
    }
    // fireworks: a quick move to the sky shot (a shell bursts 1.3 s after it fires), the usual glide back
    const glide = sky ? 0.6 : 1.8;
    easing.damp3(camera.position, aim.pos, glide, delta);
    easing.damp3(aim.target, aim.look, glide, delta);
    camera.lookAt(aim.target);
}

/** Inside the canvas: runs the show every frame. */
function Director({ control, look }) {
    const aim = useRef({ target: new THREE.Vector3(), pos: [0, 0, 0], look: [0, 0, 0], placed: false });
    useFrame(({ camera }, delta) => directFrame(control.current, look, camera, aim.current, delta));
    return null;
}

// Automatic step-down when the frame rate can't keep up: bloom off, then a little lower resolution,
// then lower again. The number of fixtures never changes while the show runs (it's set once, from
// the quality tier or the lighting desk): fixtures vanishing and the rig re-spacing mid-show shows.
const MAX_STEP = 3;
const STEP_DPR = { 2: 0.85, 3: 0.75 };

function Stage3D({ tier, control, look, visible, counts, events, screen, font, logoFonts }) {
    const [step, setStep] = useState(0);
    const settings = TIER_SETTINGS[tier];
    const beams = counts.beams ?? settings.beams;
    const bloom = settings.bloom && step < 1;
    const dpr = STEP_DPR[step] ?? settings.dpr;

    return (
        <Canvas
            frameloop={visible ? 'always' : 'never'}   // nothing renders while scrolled away
            dpr={dpr}
            camera={{ position: SHOTS.house.pos, fov: 55, near: 0.5, far: 1600 }} // (far: the festival grounds reach 600 m out)
            gl={{ antialias: !bloom, powerPreference: 'high-performance' }} // MSAA only without bloom (the composer does SMAA)
            // In production, don't check each shader for errors as it's built: the check makes the main
            // thread wait for every compile (over a second of frozen page on integrated graphics), while
            // without it the compiles overlap with everything else. Development keeps the check.
            onCreated={({ gl }) => { gl.debug.checkShaderErrors = process.env.NODE_ENV !== 'production'; }}
        >
            <PerformanceMonitor flipflops={3} onDecline={() => setStep((s) => Math.min(s + 1, MAX_STEP))} />
            <Director control={control} look={look} />
            <StageScene beams={beams} bloom={bloom} look={look} events={events} lasers={counts.lasers} blinders={counts.blinders} screen={screen} font={font} logoFonts={logoFonts} effects={tier >= 2 ? 'high' : 'low'} control={control} />
        </Canvas>
    );
}

/** Tier 0 without "reduce motion": the 2D lights, following the show a few times a second. */
function Stage2D({ control, counts }) {
    const [lights, setLights] = useState(null);
    useEffect(() => {
        let last = '';
        const id = setInterval(() => {
            const { look } = currentState(control.current);
            const next = {
                masterOn: look.master > 0.5,
                beams: { on: look.beams > 0.5 && look.intensity > 0.3, count: Math.round(4 + look.sweep * 10), color: look.colorA },
                lasers: { on: look.laser > 0.3, count: counts.lasers, color: look.laserColor },
                blinders: { on: look.blinder > 0.3 || look.strobe > 0.3, count: counts.blinders },
            };
            const key = JSON.stringify(next);
            if (key !== last) {
                last = key;
                setLights(next);
            }
        }, 250);
        return () => clearInterval(id);
    }, [control, counts.lasers, counts.blinders]);
    return lights && <ConcertLights {...lights} />;
}

/**
 * The visual layer of the show. Picks a quality tier on the client, then renders the 3D stage,
 * or for tier 0 the poster with 2D lights (or the poster alone when "reduce motion" is set).
 */
export default function ShowStage({ control, look, visible, counts, events, screen, font, logoFonts }) {
    const tier = useQualityTier();
    const [reducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    // The loading screen: the tier is known; for the poster (tier 0) there's no 3D stage to wait for
    useEffect(() => {
        if (tier === null) return;
        markReady('tier');
        if (tier === 0) markReady('stage', 'fixtures', 'effects');
    }, [tier]);

    if (tier === null) return null; // deciding (a few hundred ms); the HTML headline is already up
    if (tier === 0) {
        return (
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: `url("${hero.src}")` }} />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80" />
                {!reducedMotion && <div className="absolute inset-0 pointer-events-none"><Stage2D control={control} counts={counts} /></div>}
            </div>
        );
    }
    return (
        <div className="absolute inset-0 animate-[fadeIn_1.2s_ease-out]">
            <Stage3D tier={tier} control={control} look={look} visible={visible} counts={counts} events={events} screen={screen} font={font} logoFonts={logoFonts} />
        </div>
    );
}
