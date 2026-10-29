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
| Real lights | ~89 | 3 cheap ones for the steel (sky fill, front fill, coloured bounce from below) |
| Beams | a SpotLight + volumetric cone each | one `InstancedMesh` of additive cones |
| Beam movement | JavaScript per fixture | vertex shader (pan/tilt/convergence from uniforms) |
| LED screens | 3 `RenderTexture` scenes per frame | a procedural shader + one canvas texture |
| Draw calls | hundreds (estimate) | ~31 (5 per fixture group), plus lasers, blinders and house lights (skipped while off) and bloom |

- **Fixtures are a real model.** The moving heads are Lord Henry's detailed "Moving Head Beam" model
  (CC BY 4.0, credits in `public/fixtures/CREDITS.md`), drawn instanced: base, yoke and head are one
  draw call each per fixture group. The vertex shader works out where each fixture should point,
  solves the pan and tilt that aim the model's lens there, and turns the yoke by pan and the head by
  tilt, so every head visibly points along its own beam. The beam starts at the lens.
- **Every light has one job**, like a real rig (`stage/rigLayout.js`, `stage/Fixtures.jsx`), each with its
  own level in the look and its own movement character:
  - **aerial beams**: hanging under truss rows 1 and 4, facing the audience; movement and the drop
  - **side towers**: crossing in over the stage
  - **floor**: up-lights on the deck
  - **wash**: wide, soft, nearly still, colouring the stage (the deck takes their colour)
  - **strobes**: the real strobe model (eventdesignws, CC BY 4.0) in the gaps between moving heads; they only fire on strobe cues and hits
  - **blinders**: audience hits
  - **lasers**: a fan sheet from two projectors on the deck, scanning up over the audience (40 beams by default)
  - **house lights**: warm lamps on the ceiling and walls. On before the show; a cue can bring them up (`house` in the look)
- **Truss** (`stage/trussGeometry.js`): every bar merged into one geometry (one draw call).

### Making it look real, not like a game
- **Lenses flare only toward the camera.** A lens is dim tinted glass from the side and a white-hot
  point (plus a glow sprite) when its beam sweeps across you.
- **Beams** are tight, near-white where they leave the lens and saturate with distance, carry
  two-scale billowing haze grain, and soften close to the camera.
- **Haze** (`stage/Haze.jsx`): three drifting, domain-warped noise layers tinted by the show colours
  (warm when the house lights are up). Their bottom edges sit on the floor.
- **Steel** is dark and lit by a coloured bounce from below; the **floor** catches spill from the stage.
- **Bloom** on integrated GPUs too, and a slow, tiny handheld camera sway.
- **Quality tiers** (`stage/useQualityTier.js`): `detect-gpu` (its benchmark data is self-hosted in
  `public/gpu-benchmarks`, so there is no third-party request) picks a tier, and `?tier=0|1|2` forces one.
  drei's `PerformanceMonitor` steps down live: first bloom off, then 70% beams, then lower resolution.
  - Tier 2 (discrete GPUs): 80 moving heads, bloom, DPR up to 1.5
  - Tier 1 (integrated GPUs, e.g. Iris Xe): 52 moving heads, half-resolution bloom, DPR 1
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
# put the song in public/audio/ (gitignored, except the two demo songs; see "Demo songs" below)
npm run analyse:song -- "public/audio/A Sky Full of Stars.mp3" sky-full-of-stars "A Sky Full of Stars"
```

This writes `public/shows/sky-full-of-stars.show.json`, which contains timings and numbers only, no audio.

**Analysis** (`lib/show/analysis.js`, self-written: no essentia.js, which is AGPL; only `audio-decode`
(MIT) to decode the MP3):

1. Downmix and decimate to 22,050 Hz (by an integer factor: 44.1 kHz → 22,050 Hz); 1024-point FFT frames
   (46 ms, Hann window) every 256 samples (11.6 ms, ~86 frames/s).
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

Result for *A Sky Full of Stars* (4:28): **125.1 BPM** (the published tempo is 125), 559 beats, analysed in
~12 s on the dev laptop. *Yellow* (4:27): **86.8 BPM** (published about 87), 387 beats. With their
hand-annotated structure (below), the programmed shows have 14 sections, 62 cues and 21 hits (A Sky Full of
Stars) and 13 sections, 54 cues and 31 hits (Yellow).

Concert mode only appears where the song file exists: for each demo show the page sends a HEAD request
for its track first, and offers a button only for the tracks that are there.

### Demo songs

*A Sky Full of Stars* and *Yellow* (Coldplay) are the only tracks committed (`.gitignore` excludes
`public/audio/*` except these two), so the live site can play them. They're commercial recordings used for
educational, non-commercial purposes only: the playground, the now-playing bar during a demo song, the site
footer and the README all say so, with a takedown contact. Any other song stays local.

### Hand-annotated structure for the demo songs

Automatic sections are good but not perfect on real recordings (a quiet bridge can look like a breakdown;
a chorus repeated after a peak can be mislabelled). For the two demo songs, the structure was annotated by
ear with `npm run song:bars -- <file>` (bar-by-bar loudness, drum density, brightness and bass) and stored
in `public/shows/<slug>.extras.json` as `sections: [{ fromBar, kind }]`, using the analysis's own bar
lines so cues still land on beats. `npm run analyse:song` reads the extras file automatically. Uploaded
songs always use the automatic analysis.

Yellow's extras also carry its colour story (Yellow only, never uploaded songs): every lit fixture turns
yellow at the drops and on the lyric, strong yellow from 1:27, yellow strobes at 1:50, 1:52 and 1:54, mostly
shades of yellow from 1:54, and only yellows from 3:15 to the end (`tintAtDrops`, `tints`, `paletteSpans`).

## Tests

`tests/unit/show.test.js` builds a synthetic click track (kick on every beat, accented on beat 1,
hi-hats off-beat, a quiet half and a loud half) and checks the following:
- the tempo (120 ± 2) and the beats land within 35 ms of the clicks
- the bar lines and the quiet-to-loud boundary are found
- cue tracking and fades work, including a cue interrupting a fade
- beat pulses, drop hits, risers and phrase cuts behave as programmed
- a full programmed show samples cleanly from start to blackout

`truss.test.js` and `rigLayout.test.js` cover the geometry (fixture jobs, mounting, tower direction, strobes between heads).

## Measured (Intel Iris Xe, production build, 60 Hz display)

Step-1 benchmark (beams only, DPR 1): 56, 72, 100 and 140 beams, and 72 beams with bloom, all held
**60 FPS average, 59 FPS 1% low, 17 ms worst frame** (`bench/results/stage-step1-iris-xe.json`). GPU time
at 72 beams + bloom was ~1.7 ms per frame.

Full-scene benchmark, before the switch to the detailed fixture model (truss, fixtures, screens; the **Benchmark** button on `/lab/stage`): 72 beams
and 100 beams + bloom at DPR 1, and 72 beams, 100 + bloom and 140 beams at native DPR 1.25, all **60 FPS
average, 58–59 FPS 1% low, 17–21 ms worst frame** (`bench/results/stage-step2-iris-xe.json`). That's why
tier 1 gets bloom. The 60 Hz display caps every reading, so the remaining headroom isn't visible.

## Rig layout and effects (latest)

- **Four truss rows, stacked above the LED wall** (`trussGeometry.js` `ROWS`), landing on two **tower boxes** (front and rear column per side, tied at the top, middle and bottom):
  - row 1: aerial heads hanging underneath, facing the audience
  - rows 2–3: washes hanging underneath, aimed down onto the stage
  - row 4: aerial heads hanging underneath, above the top edge of the LED wall (nothing hangs in front of the screen)

  The screens sit behind the truss.
- **Side moving heads** are clamped sideways to the rear tower columns (the mount is a full basis: standing, hanging or sideways).
- **Strobes** (1.5 m) sit between the moving heads on rows 1 and 4, plus a row standing on the deck. **Laser projectors** sit on the deck front, with the fans leaving their apertures.
- **Strobes and blinders light the room** (`flash.js`). On one clock, the strobe panels, blinders, steel, deck, floor and haze go white, and the camera's exposure blows out. More blinders throw more light.
- **DROP** (desk button, scroll drop and every song drop hit):
  - a white blast, then ~1.5 s of hard strobing
  - every aerial and side beam focuses on the stage centre
  - the floor fixtures swing fully sideways
  - the lasers chase on and off in sequence
  - then everything releases
- **Colours**: every colour control offers 15 basic lighting colours plus a custom picker.
- **Anti-flicker**:
  - every `pow`/`normalize`/`atan` in the shaders is guarded against NaN (bloom smears NaN pixels into flashing blocks)
  - the camera holds still
  - the LED pixel grid fades out when its cells get smaller than ~3 px (moiré)
  - SMAA runs with bloom
  - the near plane is 0.5 and fixture bases sit 3 cm clear of the truss (no z-fighting)
- **Positions and coordinated movement, like a programmed show.** Each cue is a *position* (`fan` width and `tiltShift` lift) plus at most one movement effect. A sweep shared by the whole row, offset by `phaseSpread`: 0 is unison, 1 is a wave travelling along the row (each head's phase is its place in the row). The aerials hang upside down under rows 1 and 4, facing the audience. On the drop, the floor fixtures swing out and up into a V.
- **Silky transitions:**
  - Movement uses an *accumulated* phase. Computing `sin(time × speed)` made every beam leap whenever a cue changed the speed, because time has been counting since page load.
  - The scroll position is smoothed before it drives the show, since wheel notches arrive in jumps.
  - Cues ease in and out (smoothstep), and camera moves glide (1.4 s damping).

## The journey (scroll)

1. **Outside the venue:** a dark 10 m facade with a neon-framed doorway and a STAGEVERSE sign, warm house light spilling out. The aerial and floor fixtures search the sky above the venue in white, the feeling of waiting at the gate. Scrolling walks you through the doors (the camera glides from the plaza through the doorway); the sky beams go out behind you.
2. **House lights, then the rig comes up** one group at a time (washes, side towers, aerials and floor).
3. **One section per role (Fan, Artist, Organizer, Crew), shown on the LED wall** (no pop-up). Each has its own position and colour. Cues *arrive* at their scroll position and *hold*: the rig glides into the look as you approach, holds it while you read, and glides on as you scroll past.
4. **Riser, the drop, the encore** (pick the colour).
5. **The playground:**
   - take the lighting desk
   - play the demo song
   - or **"Light up your song"**: the file is decoded and resampled in the browser (`OfflineAudioContext`), then analysed and programmed in a Web Worker (`show/analysisWorker.js`, the same code as `npm run analyse:song`). It never leaves the device.

   Until the visitor takes over, the rig runs a looping 124 BPM idle show (`buildIdleShow`), so it's never still.

**The LED wall** draws its content as three masks (headline, neon glow, small text) in one texture's colour channels. The shader fills the headline with the live show colours and a moving shine, and crossfades when the content changes. The face is Orbitron (`next/font`, loaded before drawing).

**Programming** (`lib/show/program.js`) uses a concert vocabulary of positions (wide, tight, audience, sky, cross, vee) and movements (hold, sway, wave, chase, ballyhoo). Movement cycle lengths are in bars, so they lock to the song's tempo. A phrase is 8 bars, or 4 in peaks, and each changes the position and movement. Peaks swap colours and hit (strobe/blinder) on every phrase.

**Rig sizes:** the desk offers 52 (the full-rig minimum), 80 or 120 (extreme) moving heads.

## Song programming rules (latest)

`lib/show/program.js`; each rule is pinned by tests in `tests/unit/show.test.js`:

| Section | What it does |
|---|---|
| Intro | Starts in **blackout**; groups join step by step as the energy rises; brightness follows the loudness (`energyFollow`) |
| Calm | Slow sway or drift (never frozen), often a single group lit (side towers alone, washes alone), sometimes alternating beams |
| Groove | 4-bar phrases of waves, chases and alternating beams, colour changes, lasers in; clearly livelier than calm |
| Build | Opens with the **lasers alone**, then every 2 bars faster, wider and brighter; a 2-bar riser tightens into the peak |
| Peak | Drop hit, with **one or two lasers growing to the full fan**; a new colour pair every phrase; the biggest movements (ballyhoo, frenzy); strobe/blinder every 2 bars plus a strobe burst on every energy jump. A peak right after a peak carries on (no second drop) |
| Focus | At the biggest energy burst inside the song's loudest peak: everything on, aimed at the centre, beams randomly flicking on and off and changing colour (`sparkle`) |
| Breakdown | The section after a peak: **blinders alone**, then **washes alone**, then the movement slows phrase by phrase |
| Outro | Fades slowly into blackout |

Two further rules:
- The energy climbs in steps: a quiet section leading into a build or peak grooves for its second half (calm, then groove, then build).
- A section only counts as a build if its energy actually rises (last quarter louder than the first).
- **Latest tuning:**
  - The camera sits higher during song shows.
  - Side towers aim out at the audience with a slight inward angle; their own `sidesAim` swings them in to cross, and wide or mirrored positions never throw them outside the towers.
  - Grooves have no lasers; builds are dimmer.
  - Peaks open with the rig dark while the lasers spool from the centre one or two to the full, wider fan, then the rig slams in; energy bursts go full on.
  - Focus: washes and floor off, beams converging on the centre of the stage floor.
  - The final breakdown is the side towers alone, swinging from crossing inside out to the audience, then fading out.
  - Several hits on the same beat now all apply.
- **Endings match the song:**
  - A song that winds down through a breakdown gets the side-tower ending: towers alone, crossing, flaring out, back to the audience, crossing again, fading.
  - A song that ends straight out of a peak gets a big finish: the whole rig on the centre with blinders, strobes and lasers, then a quick fade.
  - A quiet ending gets a soft fade of washes and side towers.
  - Songs without an outro get a 5-second one, chosen the same way.
- **Solos:** every song gives each fixture type (side towers, aerial beams, floor, washes, lasers) 4 bars alone at full.
- **Build-ups** are found bar by bar (rising loudness plus drum density before a peak).

## Show mode (latest)

- **Full screen** while a song plays: the browser goes full screen with the site's navbar hidden, a "Press Esc
  to exit full screen" hint in the corner, rendering 30% brighter, and a screen wake lock. A web page can't set
  the device's screen brightness, so the playground recommends turning brightness and volume up.
- **Demo buttons** for both demo songs, and "Light up your song" for any file (analysed in a Web Worker; the
  file never leaves the device). An analysed upload shows a "Start the show" button.
- **Rig**: lasers default to 40; side towers alternate colours up each tower, mirrored left and right.

## Scroll stops and section dots

The scroll has 10 places it can rest, where each section's look holds (`STOPS` in `show/scrollShow.js`): the gate,
house lights, the rig comes up, Fan, Artist, Organizer, Crew, the drop, the encore and your turn (the playground).
Each is a CSS scroll-snap target inside the show section, and the page uses `scroll-snap-type: y proximity`: when
the visitor stops scrolling near a stop the page settles on it, so its animation finishes and holds; a quick scroll
passes straight through. Small dots on the right edge show the current section (`stopAt`), name it on hover, and
jump to any section when clicked.

While a role (Fan, Artist, Organizer, Crew) is on the LED wall, the moving heads drop to a faint glow (18%, washes
30%) and the lasers are off, so the screen is the focus; the riser brings the rig back for the drop. With the house
lights up, the washes point straight down onto the stage (`washDown`).

## The playground: two steps

After the encore, the playground card is in two steps, so it's clear the experience continues:

1. **Play a song**: the demo songs and "Light up your song", ending with a large **Next: run the lights
   yourself →** button.
2. **Run the lights**: six one-tap buttons (Drop, Strobe while held, Lasers, Blinders, House lights,
   Blackout) and a row of colours, using the same actions as the lighting desk. **More controls** opens the
   full desk, **Hand back the lights** returns them to the show, and **Back to songs** goes back to step 1.

The floating **Lighting desk** button stays available throughout the scroll.

## House lights light the venue

Like a real venue before or after a show, when the house lights are up the rig lights the room instead of
performing: stage washes full in the house colour (warm tungsten `#ffb347`), strobes glowing steadily in it as
work lights, and every moving head, beam and laser off, with nothing moving (`venueLit()` in
`lib/show/look.js`, applied by `currentState()` in `show/director.js`). It blends with the house-light level.

- **Scroll show and lighting desk:** whenever the house lights are up (the walk in from the gate, or the
  desk's House lights). Outside the gate, the white sky beams keep running under the house lights.
- **Song shows:** never during the song; its own programming runs unchanged. **When a song ends**, after the
  final fade to black, the house lights come up over 3 s, the venue is lit, and after 5 s the playground
  returns. Stopping the song, or starting another, cancels it.
- The house lamps are bright, hot points with a warm halo, and the room, floor and haze take their warmth.

## Phones

The scroll show plays on phones as normal (gate, stage, roles, drop, encore). The playground controls (the
lighting desk, the demo songs, "Light up your song", "Next: run the lights") open a "Best enjoyed on a bigger
screen" message instead, with a copy-link button. Phones are screens under 768 px wide, or a touch screen
held sideways (under 500 px tall).

Hidden overlays are `inert`, so an invisible card never catches taps meant for the one on screen (on
phones the playground card used to cover the encore colours).

## LED wall: up next

The brand screen lists two upcoming shows: featured events first (`Event.featured`), then the soonest.
The homepage only lists upcoming events. Each line is title, city (left out when the title already names
it) and date; the line shrinks to fit, and if it still doesn't fit only the title is shortened, so the city
and date always show. The seed features Sunburn Festival 2026 (Mumbai) and India Sneaker Festival 2026
(New Delhi).
