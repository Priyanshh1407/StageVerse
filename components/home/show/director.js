import { sampleCueSheet, sampleSongShow } from '@/lib/show/timeline';
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

/** The look and shot on stage now. */
export function currentState(control) {
    if (control.mode === 'manual' && control.desk) return { look: control.desk, shot: control.shot || 'wide', name: 'Lighting desk' };
    if (control.mode === 'song' && control.song && control.audio) return sampleSongShow(control.song, songTime(control));
    // The director smooths scroll progress (wheel notches arrive in jumps); fall back to the raw value
    const progress = control.smoothProgress ?? control.progress;
    // In the playground the rig runs its own looping show until the visitor takes over
    if (control.idle && progress >= PLAY_FROM) {
        const state = sampleSongShow(control.idle, (performance.now() / 1000) % control.idle.duration);
        return { ...state, shot: 'finale' };
    }
    return sampleCueSheet(control.sheet, progress);
}
