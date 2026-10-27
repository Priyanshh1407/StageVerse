# The homepage show (UPG-04)

The homepage opens on a 3D concert stage. Scrolling runs the lighting cue stack, a lighting desk lets
visitors take the lights over, and concert mode plays a song with a light show programmed from that
song's beats and sections. It runs at a locked 60 FPS on an Intel Iris Xe (integrated graphics).

## How it stays fast on integrated graphics

The `/test-3d` prototype used ~89 real lights (drei volumetric SpotLights and pointLights),
3 `RenderTexture` scenes re-rendered every frame and hundreds of draw calls. In three.js every lit
pixel loops over every light, so that cost scales with pixels × lights. The new stage fakes the
light instead of computing it:

| | Prototype (`/test-3d`) | The show |
|---|---|---|
| Real lights | ~89 | 1 (a hemisphere light for the steel) |
| Beams | a SpotLight + volumetric cone each | one `InstancedMesh` of additive cones |
| Beam movement | JavaScript per fixture | vertex shader (pan/tilt/convergence from uniforms) |
| LED screens | 3 `RenderTexture` scenes per frame | a procedural shader + one canvas texture |
| Draw calls | hundreds (estimate) | 12, plus lasers/blinders (1 each, skipped while off) and bloom |

- **Beams** (`stage/beamShader.js`): open cones with additive blending and `depthWrite: false`, a
  fresnel core and length fade, and world-space value noise for haze. The moving-head bodies use the
  same aiming code, so a head always points where its beam goes.
- **Truss** (`stage/trussGeometry.js`): every bar merged into one geometry (one draw call).
- **Crowd** (`stage/crowdTexture.js`): silhouettes drawn into a canvas from a seed; one alpha-tested
  plane that follows the camera.
- **Quality tiers** (`stage/useQualityTier.js`): `detect-gpu` (its benchmark data is self-hosted in
  `public/gpu-benchmarks`, so there is no third-party request) picks a tier, and `?tier=0|1|2` forces one.
  drei's `PerformanceMonitor` steps down live: first bloom off, then 70% beams, then lower resolution.
  - Tier 2: 100 beams + bloom
  - Tier 1: 72 beams, no bloom
  - Tier 0: no WebGL, or "reduce motion": the poster plus the 2D lights, or the poster alone
- **Nothing renders off-screen**: the canvas `frameloop` is `never` while the section is scrolled
  away (IntersectionObserver).
- **The headline is HTML**, server-rendered; the canvas is a lazy client-only chunk that fades in.

## One engine, three drivers

Everything on stage is a **look** (`lib/show/look.js`: intensity, sweep, speed, convergence, haze,
colours, lasers, blinders, strobe, LED "stars", beat pulse). Each frame the director
(`show/director.js`) asks who is in charge:

1. **Scroll** (`show/scrollShow.js`): a cue sheet where `t` is scroll progress. House lights down,
   then cues 1–3, then one look per role (fan, artist, organizer, crew), then a riser, the drop, and
   the encore, whose colour the visitor picks. Scrolling back scrubs the show back.
2. **Song** (concert mode): the same cue-sheet engine with `t` in seconds from the audio clock, plus
   a beat pulse and timed hits (strobe and blinders on each drop).
3. **Lighting desk** (`show/LightingDesk.jsx`): touching any control copies the current look onto
   the desk and takes over (manual mode). "Resume show" hands the lights back.

Cue sheets track like a real console: a cue changes only what it names, and fades from whatever was
on stage when it fired (`lib/show/timeline.js`). The rig eases toward the look each frame by
mutating shader uniforms, so React never re-renders for animation.

## Programming a song

```bash
# put the song in public/audio/ (gitignored: recordings are copyrighted and never committed)
npm run analyse:song -- "public/audio/A Sky Full of Stars.mp3" sky-full-of-stars "A Sky Full of Stars"
```

This writes `public/shows/sky-full-of-stars.show.json`, which contains timings and numbers only, no audio.

**Analysis** (`lib/show/analysis.js`, self-written: no essentia.js, which is AGPL; only `audio-decode`
(MIT) to decode the MP3):

1. Downmix and decimate to ~24 kHz; 1024-point FFT frames every 256 samples (~94 frames/s).
2. **Onsets**: spectral flux on log magnitudes, minus a local average. The bass band gets equal
   weight. Summed over linear FFT bins, flux is dominated by treble, and in testing that pulled the beat
   onto the hi-hats (the off-beat).
3. **Tempo**: autocorrelation of the onset envelope, weighted toward 120 BPM to avoid half/double
   tempo, then refined with a parabolic fit.
4. **Beats**: dynamic programming (Ellis 2007) that rewards strong onsets spaced close to the period.
   Frames are timed at their centre, because an onset registers mid-window. Timing them at frame
   start made every beat ~25 ms early.
5. **Downbeats**: the beat phase (of 4) carrying the most bass onset energy.
6. **Sections**: per-bar loudness, brightness and onset density. A boundary is where the 4 bars before
   and after differ most, snapped to 4-bar phrases. Each section is labelled by relative loudness
   (intro, calm, groove, build, peak, outro).

**Programming** (`lib/show/program.js`): quiet sections get wide, slow, hazy looks in blues. A long build
grooves first and only builds over its last 8 bars. A 2-bar riser tightens the beams before each peak, and
each peak opens with a drop hit (strobe + blinders) in a new colour pair. Inside sections, the camera
cuts and the colours swap on 8-bar phrases.

Result for *A Sky Full of Stars* (4:27): **125.1 BPM** (the published tempo is 125), 559 beats, 140 bars,
10 sections, 22 cues and 9 hits, analysed in ~12 s on the dev laptop. Drops land at 0:46, 1:17 and 2:49.

Concert mode only appears where the song file exists: the page sends a HEAD request for it first. A deployed
site without the file simply doesn't offer it. A public demo needs a royalty-free track.

## Tests

`tests/unit/show.test.js` builds a synthetic click track (kick on every beat, accented on beat 1,
hi-hats off-beat, a quiet half and a loud half) and checks the following:
- the tempo (120 ± 2) and the beats land within 35 ms of the clicks
- the bar lines and the quiet-to-loud boundary are found
- cue tracking and fades work, including a cue interrupting a fade
- beat pulses, drop hits, risers and phrase cuts behave as programmed
- a full programmed show samples cleanly from start to blackout

`truss.test.js`, `crowd.test.js` and `rigLayout.test.js` cover the geometry.

## Measured (Intel Iris Xe, production build, 60 Hz display)

Step-1 benchmark (beams only, DPR 1): 56, 72, 100 and 140 beams, and 72 beams with bloom, all held
**60 FPS average, 59 FPS 1% low, 17 ms worst frame** (`bench/results/stage-step1-iris-xe.json`). GPU time
at 72 beams + bloom was ~1.7 ms per frame. The full-scene benchmark (truss, screens, crowd, lasers, native
DPR) runs from the **Benchmark** button on `/lab/stage`.
