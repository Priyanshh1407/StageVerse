// The show clock, kept with the show's state so any screen that (re)opens or re-syncs can get
// back on track. Stored as the seconds banked before the current run (`elapsed`) plus when the
// current run started (`liveSince`, only while Live), so it doesn't need writing every second.

const MAX_SECONDS = 24 * 3600;

/** Seconds into the show at `now`. */
export function elapsedAt(clock, status, now = new Date()) {
    const banked = clock?.elapsed ?? 0;
    if (status !== 'Live' || !clock?.liveSince) return Math.floor(banked);
    const running = Math.max(0, (now.getTime() - new Date(clock.liveSince).getTime()) / 1000);
    return Math.min(MAX_SECONDS, Math.floor(banked + running));
}

/**
 * The clock after a status change. `time` is the artist's own timer when it sent one: the
 * artist's screen is the reference, so it overrides what the server worked out.
 */
export function advanceClock(clock, from, to, now = new Date(), time) {
    const reported = Number.isInteger(time) && time >= 0 && time <= MAX_SECONDS ? time : null;
    if (to === 'Standby') return { elapsed: 0, liveSince: null };
    if (to === 'Paused') {
        return { elapsed: reported ?? elapsedAt(clock, from, now), liveSince: null };
    }
    // Live: starting from Standby begins at zero; resuming carries on from the banked time
    if (from === 'Live' && clock?.liveSince) {
        return reported === null ? clock : { elapsed: reported, liveSince: now };
    }
    const base = from === 'Standby' ? 0 : (clock?.elapsed ?? 0);
    return { elapsed: reported ?? base, liveSince: now };
}
