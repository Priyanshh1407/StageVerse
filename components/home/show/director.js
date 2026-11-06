import { EFFECT_KEYS, sampleCueSheet, sampleSongShow, songEffectsAt } from '@/lib/show/timeline';
import { smoothstep, venueLit } from '@/lib/show/look';
import { CO2_FADE, CO2_JETS, CO2_TRUSS_JETS, co2FromFirings, co2TrussFromFirings } from '@/lib/show/co2';
import { CONFETTI_LIFE, CONFETTI_UNITS, STREAMER_LIFE, confettiFromFirings, streamersFromFirings } from '@/lib/show/confetti';
import { firingsDone, mergeStates } from '@/lib/show/effects';
import { activeFireworks, fireworkDuration } from '@/lib/show/fireworks';
import { PLAY_FROM } from './scrollShow';

// Who is running the lights right now, read every frame by the 3D director (and a few times a
// second by the 2D fallback). `control` is a plain mutable object held in a ref:
//   mode      'scroll' | 'song' | 'manual'
//   progress  scroll progress 0..1
//   sheet     resolved scroll cue sheet
//   song      prepared song show, audio: its HTMLAudioElement
//   desk      the lighting desk's look (manual mode)

/** Song time from the audio element, smoothed between its (coarse) clock updates. */
export function songTime(control, now = performance.now()) {
    const audio = control.audio;
    if (!audio) return 0;
    const clock = control.clock || (control.clock = { last: -1, at: 0 });
    if (audio.paused) return audio.currentTime;
    if (audio.currentTime !== clock.last) {
        clock.last = audio.currentTime;
        clock.at = now;
    }
    return clock.last + Math.min(0.25, (now - clock.at) / 1000) + (control.song?.offset || 0);
}

// Where scrolling moves inside the venue: before it, the sky beams outside the gate keep running
// under the house lights; from it, house lights mean the venue is lit (see venueLit)
const INSIDE_FROM = 0.09;

// After a song ends: the house lights come up over this long (ms), like the end of a concert
export const HOUSE_UP_MS = 3000;

/**
 * The look and shot on stage now. When the house lights are up in the scroll show or on the lighting
 * desk, the rig lights the venue (warm washes and strobes, beams off, nothing moving). Song shows
 * keep their own programming.
 */
export function currentState(control) {
    const state = baseState(control);
    return control.linger ? { ...state, look: withLingering(control, state.look) } : state;
}

/**
 * A song's effects still in the air after it ends or is stopped (`control.linger`: the show, the
 * song time it ended at and when) carry on in their own time, over whatever comes next (the house
 * lights, the scroll show, the desk), until every one has finished: streamers reach the floor,
 * confetti settles, the last shells burn out. An effect the stage is running itself takes priority.
 */
function withLingering(control, look) {
    const { song, t, at } = control.linger;
    const fx = songEffectsAt(song, t + (performance.now() - at) / 1000);
    let out = look;
    let any = false;
    for (const key of EFFECT_KEYS) {
        if (!fx[key]) continue;
        any = true;
        if (look[key]) continue;
        if (out === look) out = { ...look };
        out[key] = fx[key];
    }
    if (!any) control.linger = null;
    return out;
}

// What the visitor can fire live during a song's light show (space bar: the floor and truss CO2;
// shift: the confetti), on top of the song's own programming
const LIVE = [
    ['co2', co2FromFirings, CO2_JETS, CO2_FADE],
    ['co2Truss', co2TrussFromFirings, CO2_TRUSS_JETS, CO2_FADE],
    ['confetti', confettiFromFirings, CONFETTI_UNITS, CONFETTI_LIFE],
];

/**
 * The visitor's live firings (`control.live`: { kind: [{ unit, at, len }] }, like the desk's) added to
 * a song's look: the show carries on as programmed, every one of its own firings included; per jet
 * or cannon the newer firing shows.
 */
function withLive(control, look) {
    const live = control.live;
    if (!live) return look;
    const now = performance.now();
    let out = look;
    for (const [kind, toState, count, fade] of LIVE) {
        const fired = live[kind];
        if (!fired?.length) continue;
        const state = toState(fired, now);
        if (state) {
            if (out === look) out = { ...look };
            out[kind] = mergeStates(look[kind], state, count);
        } else if (firingsDone(fired, now, fade)) {
            live[kind] = [];
        }
    }
    return out;
}

function baseState(control) {
    if (control.mode === 'manual' && control.desk) {
        const look = { ...venueLit(control.desk, control.desk.house ?? 0) }; // a copy: never write onto the desk
        // Special effects fired from the desk (CO2 jets on the floor and the truss, confetti, streamers)
        const now = performance.now();
        for (const [kind, toState, fade] of [['co2', co2FromFirings, CO2_FADE], ['co2Truss', co2TrussFromFirings, CO2_FADE],
            ['confetti', confettiFromFirings, CONFETTI_LIFE], ['streamers', streamersFromFirings, STREAMER_LIFE]]) {
            const fired = control.fired?.[kind];
            if (!fired?.length) continue;
            const state = toState(fired, now);
            if (state) look[kind] = state;
            // forget the firings once every one has fired and faded (not before a pattern's later steps)
            else if (firingsDone(fired, now, fade)) control.fired = { ...control.fired, [kind]: [] };
        }
        // Fireworks fired from the desk (each launch has `at`, in seconds; the finale's are spread out)
        if (control.fireworks?.length) {
            const t = now / 1000;
            const live = activeFireworks(control.fireworks, t);
            if (live.length) look.fireworks = live;
            control.fireworks = control.fireworks.filter((f) => t - f.at < fireworkDuration(f));
        }
        return { look, shot: control.shot || 'wide', name: 'Lighting desk' };
    }
    if (control.mode === 'song' && control.song && control.audio) {
        const state = sampleSongShow(control.song, songTime(control));
        // The song has ended: house lights up over the final blackout, lighting the venue
        if (control.houseUpAt) {
            const k = smoothstep((performance.now() - control.houseUpAt) / HOUSE_UP_MS);
            const look = { ...state.look, master: Math.max(state.look.master ?? 1, k), house: Math.max(state.look.house ?? 0, k) };
            // the effects come from the lingering ones, which keep moving (the song's clock has stopped)
            for (const key of EFFECT_KEYS) delete look[key];
            return { ...state, look: withLive(control, venueLit(look, k)), name: 'House lights' };
        }
        return control.live ? { ...state, look: withLive(control, state.look) } : state;
    }
    // The director smooths scroll progress (wheel notches arrive in jumps); fall back to the raw value
    const progress = control.smoothProgress ?? control.progress;
    // In the playground the rig runs its own looping show until the visitor takes over
    if (control.idle && progress >= PLAY_FROM) {
        const state = sampleSongShow(control.idle, (performance.now() / 1000) % control.idle.duration);
        return { ...state, shot: 'finale' };
    }
    const state = sampleCueSheet(control.sheet, progress);
    const inside = smoothstep((progress - INSIDE_FROM) / 0.03);
    return { ...state, look: venueLit(state.look, (state.look.house ?? 0) * inside) };
}
