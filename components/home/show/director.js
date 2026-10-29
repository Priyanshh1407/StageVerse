import { sampleCueSheet, sampleSongShow } from '@/lib/show/timeline';
import { smoothstep, venueLit } from '@/lib/show/look';
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

/**
 * The look and shot on stage now. When the house lights are up in the scroll show or on the lighting
 * desk, the rig lights the venue (warm washes and strobes, beams off, nothing moving). Song shows
 * keep their own programming.
 */
export function currentState(control) {
    if (control.mode === 'manual' && control.desk) {
        return { look: venueLit(control.desk, control.desk.house ?? 0), shot: control.shot || 'wide', name: 'Lighting desk' };
    }
    if (control.mode === 'song' && control.song && control.audio) return sampleSongShow(control.song, songTime(control));
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
