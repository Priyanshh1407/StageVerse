// On/off switches for the newer features, set in the environment (.env.local, or the host's settings).
// Every feature is ON unless its variable says otherwise: set it to "off" (or 0 / false / no) to
// remove the feature, and rebuild. The names are written out in full because Next.js only puts a
// NEXT_PUBLIC_ variable in the browser bundle when it sees its exact name.
const on = (value) => !['off', '0', 'false', 'no'].includes(String(value ?? '').trim().toLowerCase());

export const FEATURES = {
    // Phase 3: the audience (with LED wristbands) and the performer on stage
    crowd: on(process.env.NEXT_PUBLIC_FEATURE_CROWD),
    performer: on(process.env.NEXT_PUBLIC_FEATURE_PERFORMER),
    // Phase 5: links to a song and moment, the poster button, the "how it works" overlay
    share: on(process.env.NEXT_PUBLIC_FEATURE_SHARE),
    howItWorks: on(process.env.NEXT_PUBLIC_FEATURE_HOW_IT_WORKS),
    // Phase 6: the real city and events in the sections below the show
    liveSections: on(process.env.NEXT_PUBLIC_FEATURE_LIVE_SECTIONS),
    // Phase 7: the DMX monitor on the desk, a patch shown on the 3D stage, the live show on the 3D stage
    dmxMonitor: on(process.env.NEXT_PUBLIC_FEATURE_DMX_MONITOR),
    patchStage: on(process.env.NEXT_PUBLIC_FEATURE_PATCH_STAGE),
    liveStage: on(process.env.NEXT_PUBLIC_FEATURE_LIVE_STAGE),
};

export const featureOn = on;
