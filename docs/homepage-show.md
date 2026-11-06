# The homepage show (UPG-04)

The homepage opens on a 3D concert stage. Scrolling runs the lighting cue stack, a lighting desk lets
visitors take the lights over, and concert mode plays a song with a light show programmed from that
song's beats and sections. It runs at 56–60 FPS on an Intel Iris Xe (integrated graphics), measured at
every scroll stop in a production build.

The stage is a festival main stage: a 1.8 m raised deck under four ladder-stepped truss rows and two
three-column side towers, a large LED wall down to the deck, 64 moving heads, LED pixel bars, truss and
tower strobes, 8 laser projectors, flown 16-box line arrays, and a line of subwoofer stacks with a crowd
barrier on the ground in front. Nine hand-marked demo songs (EDM, pop, rap, Bollywood) play with their
own programmed shows, and any song a visitor picks is analysed in the browser with its genre's settings.

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
| Draw calls | hundreds (estimate) | instanced per fixture group (~31 for the original rig), static stage merged; not re-counted since the PA, barrier and stage dressing were added |

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
  - **strobes**: the real strobe model (eventdesignws, CC BY 4.0), horizontal panels on the truss rows and vertical ones on the side towers (none on the deck). They are the visible source of every strobe and blinder flash: the whole panel lights up, facing the audience. They also fire one at a time in colour (random coloured strobes)
  - **blinders**: audience hits in a warm tungsten white (`#ffe2a6`), drawn as the truss strobes flooding together (no separate blinder lamps)
  - **LED pixel bars**: on every truss, in one or two colours, chasing, sparkling or alternating per truss
  - **lasers**: 8 projectors, 4 on the deck front and 2 clamped to each side tower; fan sheets scanning over the audience, never lower than 0.14 rad above the crowd, with a cap on the total beam count
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
  drei's `PerformanceMonitor` steps down live: first bloom off, then lower resolution. The fixture count never changes mid-show.
  - Every machine gets the same rig: **64 moving heads** (the desk offers 96 and 140). A stronger GPU gets sharper rendering, not more fixtures
  - Tier 2 (discrete GPUs): bloom, DPR up to 1.5
  - Tier 1 (integrated GPUs, e.g. Iris Xe): half-resolution bloom, DPR 1
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
# demo songs: put the song in its genre's folder, public/audio/<edm|pop|rap|bollywood>/ (up to 3 each)
npm run demos
# any other song (stays local)
npm run analyse:song -- "public/audio/My Song.mp3" my-song "My Song"
```

`npm run demos` analyses every song in the genre folders with that genre's settings, writes
`public/shows/<slug>.show.json` for each (timings and numbers only, no audio) and lists them in
`public/shows/index.json`, which is all the homepage loads up front; a song's show is fetched when it's
picked. The slug is the file name in lower case with dashes; `public/shows/<slug>.extras.json` gives
the title and artist shown on the site, plus any per-song touches (below).

**Genres** (`lib/show/genres.js`): the analysis was built around EDM. Visitors pick their song's genre
(a help button lists artists per genre), and each genre is analysed and lit its own way. EDM runs the
original analysis unchanged; pop, rap and Bollywood add:

- **Structure by repetition** (`lib/show/structure.js`): per-bar chroma (pitch classes from spectral
  peaks, 100 Hz-2.5 kHz), a bar self-similarity matrix, Foote novelty for boundaries, sections grouped
  by which repeat (on a contrast-normalised matrix, never across a big loudness gap), labelled
  verse / pre-chorus / chorus / bridge. Only sung groups can be the chorus.
- **Vocals** (`lib/show/vocals.js`): a rough singing/rapping curve from centre-panned voice-band energy
  and syllable-rate wobble (stereo input); no ML model, so it's a lighting signal, not a transcription.
- **Rap** (`lib/show/rhythm.js`): "beat cuts out and slams back" moments, a half/double tempo check,
  beat-switch novelty from the per-bar drum pattern. Hooks slam in with strobes.
- **Bollywood**: tempo following (8 s windows, beat tracking with a period per frame), rhythms in 3s
  (only when clearly stronger than 4s), beatless intros lit free-flowing, dense percussion as peaks.
- **Lighting style**: an EDM peak opens with the blackout-and-spool drop; a pop or Bollywood chorus lifts
  in with a blinder; a rap hook slams in with strobes.

**Test set** (`tests/songs/`, `npm run score:analysis`): hand-marked structures (timings and labels
only; the audio stays local). Each song is analysed as EDM and as its genre, and scored on boundaries,
peaks, chorus, tempo and meter. The structure settings (`TUNING` in `lib/show/analysis.js`) were picked by
a grid search against it. Tuned on the 2 pop songs marked at the time, pop vs EDM: boundaries 38% -> 53%,
peaks 64% -> 65%, chorus 25% -> 59%. The set now holds 3 songs (A Sky Full of Stars and Yellow marked as pop,
High On Life as EDM). Rap and Bollywood have synthetic tests only until songs are marked.

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
~12 s on the dev laptop. *Yellow* (4:27): **86.8 BPM** (published about 87), 387 beats. The programmed demo
shows, with their hand-marked structures (below):

| Genre | Song | BPM | Length | Sections | Cues | Hits |
|---|---|---|---|---|---|---|
| EDM | A Sky Full of Stars (Coldplay) | 125.1 | 4:28 | 14 | 63 | 17 |
| EDM | Closer (The Chainsmokers feat. Halsey) | 95.0 | 4:05 | 14 | 51 | 17 |
| EDM | High On Life (Martin Garrix feat. Bonn) | 127.9 | 3:51 | 12 | 51 | 23 |
| Pop | Smack That (Akon feat. Eminem) | 119.1 | 3:32 | 14 | 46 | 24 |
| Pop | Yellow (Coldplay) | 86.8 | 4:27 | 13 | 52 | 26 |
| Rap | BAND4BAND (Central Cee & Lil Baby) | 69.9 | 2:21 | 4 | 25 | 13 |
| Rap | goosebumps (Travis Scott) | 130.2 | 4:04 | 13 | 58 | 46 |
| Bollywood | Subha Hone Na De (Pritam, *Desi Boyz*) | 131.8 | 4:49 | 11 | 52 | 26 |
| Bollywood | Uff Teri Adaa (Shankar-Ehsaan-Loy, *Karthik Calling Karthik*) | 132.2 | 5:04 | 12 | 62 | 38 |

### Demo songs

The demo songs are the tracks in the genre folders, `public/audio/<genre>/` (up to 3 per genre,
`MAX_PER_GENRE` in `scripts/build-demos.mjs`), grouped by genre in the playground: the 9 above. They're the only tracks committed (`.gitignore` ignores audio loose in
`public/audio/`), so the live site can play them. They're commercial recordings used for educational,
non-commercial purposes only: the playground, the now-playing bar during a demo song (with the song's
artist), the site footer and the README all say so, with a takedown contact. Any other song stays local.

### Hand-annotated structure for the demo songs

Automatic sections are good but not perfect on real recordings (a quiet bridge can look like a breakdown;
a chorus repeated after a peak can be mislabelled). For every demo song, the structure was marked with
`npm run song:bars -- <file>` (bar-by-bar loudness, drum density, brightness and bass) and stored
in `public/shows/<slug>.extras.json` as `sections: [{ fromBar, kind }]`, using the analysis's own bar
lines so cues still land on beats (`free: true` on an intro lights it off the beat). `npm run analyse:song`
and `npm run demos` read the extras file automatically. Each extras file also gives its song a colour story
(`paletteSpans`, `tintAtDrops`). The marks came from the loudness, drum and vocal data rather than from
listening alone, so a boundary can be a bar off; listen through and correct any that are. Uploaded songs
always use the automatic analysis.

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

`truss.test.js` and `rigLayout.test.js` cover the geometry (fixture jobs, mounting, tower direction, strobes between heads),
`flash.test.js` the strobe and blinder light, `scrollShow.test.js` the scroll stops, and `genres.test.js` the genre
analysis (structure by repetition, vocals, rap moments, tempo following, meter) on synthetic songs.

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
- **Strobes** (1.5 m) sit between the moving heads on rows 1 and 4, and vertically on the side towers (the deck row was removed). **Laser projectors**: 4 on the deck front and 2 clamped to each side tower, with the fans leaving their apertures.
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

1. **Outside the venue:** a dark 10 m facade with a neon-framed doorway and the StageVerse logo as a neon sign, warm house light spilling out. The aerial and floor fixtures search the sky above the venue in white, the feeling of waiting at the gate. Scrolling walks you through the doors (the camera glides from the plaza through the doorway); the sky beams go out behind you.
2. **House lights, then the rig comes up** one group at a time (washes, side towers, aerials and floor).
3. **One section per role (Fan, Artist, Organizer, Crew), shown on the LED wall** (no pop-up). Each has its own position and colour. Cues *arrive* at their scroll position and *hold*: the rig glides into the look as you approach, holds it while you read, and glides on as you scroll past.
4. **Riser, the drop, the encore** (pick the colour).
5. **The playground:**
   - take the lighting desk
   - pick a genre and play one of its demo songs
   - or **"Light up your song"**: the file is decoded and resampled in the browser (`OfflineAudioContext`), then analysed and programmed in a Web Worker (`show/analysisWorker.js`, the same code as `npm run analyse:song`). It never leaves the device.

   Until the visitor takes over, the rig runs a looping 124 BPM idle show (`buildIdleShow`), so it's never still.

**The LED wall** draws its content as three masks (headline, neon glow, small text) in one texture's colour channels. The shader fills the headline with the live show colours and a moving shine, and crossfades when the content changes. The brand screen shows the StageVerse logo: "Stage" as a white spray tag (in the small-text mask) with "Verse" in a script sweeping under it (in the headline mask, so it takes the show's colours). The faces are Orbitron, Sedgwick Ave Display and Yellowtail (`next/font`, all loaded before drawing). Text is recoloured with canvas compositing, not a per-pixel loop.

**Programming** (`lib/show/program.js`) uses a concert vocabulary of positions (wide, tight, audience, sky, cross, vee) and movements (hold, sway, wave, chase, ballyhoo). Movement cycle lengths are in bars, so they lock to the song's tempo. A phrase is 8 bars, or 4 in peaks, and each changes the position and movement. Peaks swap colours and hit (strobe/blinder) on every phrase.

**Rig sizes:** 64 moving heads for everyone; the desk offers 96 and 140.

## Song programming rules (latest)

`lib/show/program.js`; each rule is pinned by tests in `tests/unit/show.test.js`:

| Section | What it does |
|---|---|
| Intro | Starts in **blackout**; groups join step by step as the energy rises; brightness follows the loudness (`energyFollow`) |
| Calm | Slow sway or drift (never frozen), often a single group lit (the tower lasers alone, washes alone), sometimes alternating beams |
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
  - The final breakdown is the tower lasers alone, fanning out wide and gathering in again, then fading out.
  - Several hits on the same beat now all apply.
- **Endings match the song:**
  - A song that winds down through a breakdown gets the tower-laser ending: the tower lasers alone over a soft wash, narrow, fanning out, gathering in, fading.
  - A song that ends straight out of a peak gets a big finish: the whole rig on the centre with blinders, strobes and lasers, then a quick fade.
  - A quiet ending gets a soft fade of washes and side towers.
  - Songs without an outro get a 5-second one, chosen the same way.
- **Solos:** every song gives each fixture type and effect a solo at full: side towers, aerial beams, floor, washes, floor lasers, tower lasers and the random coloured strobes, plus the fireworks (stage pyro only) and the CO2 where there is room (CO2 keeps its place when slots are short). No solo lands in the finale. A solo is 4 bars, or 2 when a bar is longer than 3 s. The LED bars have no solo: alone they looked plain.
- **Build-ups** are found bar by bar (rising loudness plus drum density before a peak).

## Show mode (latest)

- **Full screen** while a song plays: the browser goes full screen with the site's navbar hidden, a "Press Esc
  to exit full screen" hint in the corner, rendering 30% brighter, and a screen wake lock. A web page can't set
  the device's screen brightness, so the playground recommends headphones and turning brightness and volume up.
- **Demo buttons** for every demo song, grouped by genre, and "Light up your song" for any file (analysed in a Web Worker; the
  file never leaves the device). An analysed upload shows a "Start the show" button.
- **Rig**: side towers alternate colours up each tower, mirrored left and right.

## Scroll stops and section dots

The scroll has 9 places it can rest, where each section's look holds (`STOPS` in `show/scrollShow.js`): the gate,
house lights, the rig comes up, Fan, Artist, Organizer, Crew, the encore and your turn (the playground). The drop
isn't a stop: it plays on the way from Crew to the encore, and if the visitor stops scrolling inside it, the
page carries on to the next section in the direction they were going (the encore going down, Crew going up).
Each is a CSS scroll-snap target inside the show section, and the page uses `scroll-snap-type: y proximity`: when
the visitor stops scrolling near a stop the page settles on it, so its animation finishes and holds; a quick scroll
passes straight through. Small dots on the right edge show the current section (`stopAt`), name it on hover, and
jump to any section when clicked.

Transitions are paced to be seen: the show section is 800vh tall (so sections are far apart in scroll), the rig
follows a smoothed scroll position (critically damped, 0.55 s smooth time, frame step capped at 1/30 s so a
dropped frame never makes it jump), and camera moves glide with a 1.8 s damping. From Crew to the encore the
page glides on by itself through the drop (an eased animation; snapping is off while it runs, and any wheel,
touch or key input cancels it). The "CUE · GO" label names the last cue that is at least halfway through its
fade, so it neither lags nor runs ahead of the lights. Between the rig coming up and the encore the camera
stands 5 m further back and looks a little higher, so the top truss clears the navbar.

While a role (Fan, Artist, Organizer, Crew) is on the LED wall, the moving heads drop to a faint glow (18%, washes
30%) and the lasers are off, so the screen is the focus; the riser brings the rig back for the drop. With the house
lights up, the washes point straight down onto the stage (`washDown`).

## The playground: three steps

After the encore, the playground card is in three steps, inside the page (no pop-up):

1. **Pick a genre**: four tiles (EDM, Pop, Rap, Bollywood), each with a line about the style and how many
   demo songs it has, plus **Which genre is my song?** (artists per genre) and a skip link to the lights.
2. **Play a song**: that genre's demo songs and "Light up your song" (analysed with that genre's settings),
   ending with **Next: run the lights yourself →**.
3. **Run the lights**: one-tap buttons (Drop, which cycles the three drop styles; Strobe while held; Lasers;
   Blinders; House lights; Blackout) and a row of colours, using the same actions as the lighting desk.
   **More controls** opens the full desk, **Hand back the lights** returns them to the show, and **Back to
   songs** goes back.

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

## The stage (Nov 2026)

- **Raised deck**: the stage floor is 1.8 m up (`DECK_HEIGHT`), with a black pleated skirt and a thin LED
  edge along the front, and a glossy black floor that reflects the wall and beams.
- **On the ground in front**: 12 subwoofer stacks, 3 high with gaps between them, in a touring-sub style
  (twin 18" drivers, rigging plates), then the crowd barrier with an empty photo pit behind it.
- **Flown PA**: a 16-box line array outside each side tower on an outrigger, in a J curve and toed in, hung
  from a steel rigging frame.
- **Structure**: four truss rows stepping down like a ladder from front to back; the top truss sits at 19 m
  (0.6 m higher than before, so its aerials and strobes clearly hang below it). Each side tower has three
  columns (front, middle, rear). The LED wall runs down to the deck.
- **Low fog** lies on the floor and catches the colours. It uses a small noise texture in 2 layers and is
  hidden when the stage is dark. The floor nearest the camera fades to black.
- **Floor reflections follow the light**: the floor only glows when the aerial moving heads are on and
  pointing down at the audience (`uLight` = aerial level × how far down they point × (1 − convergence)).
  With only the floor fixtures or the lasers on, the floor stays dark.
- **Side towers never point at the sky**: their tilt is clamped to level or below.
- **The gate sign** is the logo in neon: a cyan "Stage" tag and an orange script "Verse".

## Lighting (Nov 2026)

- **Lasers**: groups (sometimes only the tower lasers, sometimes only the floor ones, sometimes all), a
  one-by-one turn-on, beam counts that change at random on the beat (up and down), side-to-side sweeps,
  and a breathing beam count that changes one beam at a time.
- **Random coloured strobes** in calm and groove sections, ramping up through builds into the drop.
- **Focus**: phrases 1 and 3 in one colour (as before), phrases 2 and 4 in two colours. **Vocal focus**: up to
  two phrases per song where the singing is strongest outside the peaks (`analysis.vocals`), with the beams
  gathered on centre stage and pulsing on the beat.
- **Wave**: the wave now swings the beams up and down by 0.3 rad (`tiltWave`), so it reads as a wave.
- **Smoother peaks**: 1-2 bar unified sweeps, soft crossfades when beams alternate or sparkle, beams that
  barely flicker with the strobes, the drop's convergence eased rather than snapped, and at most one burst
  per 8 bars.
- **Three drop styles**, rotating through an EDM song's drops: **spool** (everything dark, the lasers spool up
  from the centre, then the rig slams in), **slam** (a full beat of blackout, then everything at once) and
  **burst** (every beam pinched onto one point, exploding out over the crowd on the next beat). A pop or
  Bollywood chorus lifts in with a blinder; a rap hook slams in with strobes.

## The lighting desk: STAGEVERSE CONSOLE (Nov 2026)

A DMX-style desk (`show/LightingDesk.jsx`):
- **Grand master** fader and **blackout**.
- **Channels**: an ON/OFF switch and a FLASH button per fixture type (aerials, side towers, floor, washes,
  LED bars, strobes, blinders, lasers).
- **Panels**: Position (spread 0.2-3 side to side, tilt up and down), Effects (movement, wave height, haze),
  Colour, Lasers, Rig (moving-head count) and Playback (strobe while held, and DROP in the three styles).
- While the show runs, the desk **mirrors the live state** (refreshed every 300 ms), so its switches are never
  stale. Touching a control takes over; Resume hands the lights back. The header is sticky and the panel's
  scrolling is contained, so scrolling it never moves the page.

## Performance work (Nov 2026)

Measured on the Iris Xe in a production build: **56–60 FPS at every scroll stop**, and about 1.1 s of startup
long tasks in total.
- **Shader warm-up**: each stage group compiles its shaders for both targets (into the bloom buffer and
  straight to the screen) before it is shown, then polls until the programs are linked (it's shown after 4 s
  at the latest). This replaced three's `compileAsync`, which crashed when a material was swapped
  mid-compile (the LED wall redrawn once its fonts loaded) and left the wall hidden.
- Shader error checks are off in production; the stage dressing loads after the first frames.
- LED wall text is packed with canvas compositing (no pixel loop).
- The low fog was shrunk (2 layers, smaller, hidden when dark) after an A/B build showed it cost about a
  third of a frame.

## Special effects (Nov 2026)

Every effect is drawn the same way as the rest of the stage: instanced quads whose motion is worked out in
the vertex shader, one draw call per effect, nothing drawn while idle, and no real lights. Effect state on a
look is a flat array `[age, len, ...]` per unit (`lib/show/effects.js`), built from song hits
(`hitsState`) or from desk presses (`firingsState`), so the songs, the desk and the live keys share one model.

| Effect | Where | Notes |
|---|---|---|
| **CO2 jets** (`Co2Jets.jsx`, `lib/show/co2.js`) | 6 on the floor in the free gaps (never in front of a light), 4 on the front face of the top truss angled 40° down at the crowd (14 m reach) | Dense, partly additive plumes so they show over the LED wall. A full floor blast brings the truss jets in with it |
| **Confetti** (`Confetti.jsx`, `lib/show/confetti.js`) | 4 cannons: one under each line array, two in the middle sub gaps | Fired with CO2 (a push of the confetti mount). Held = continuous CO2 and a steady stream of paper, covering the whole crowd evenly |
| **Streamers** (`Streamers.jsx`) | 3 launchers on top of the top truss (left, centre, right) | Fixed-length ribbons that flutter, drift and lie on the floor; each firing lands at random spots across its region, reshuffled every firing. One burst per firing in songs, two at most when held on the desk; ribbons sink at 1.6-2.3 m/s |
| **Fireworks** (`Fireworks.jsx`, `lib/show/fireworks.js`) | Shells burst 40-50 m up behind the stage; stage pyro on and above the stage | See below |

Removed after trying them: flames (never looked real), cold sparks (looked like a toy), the waterfall and
shaped shells.

### Fireworks

- **Shells** (7): peony, chrysanthemum, willow, palm, ring, crossette, glitter.
- **Stage pyro** (4): roof comets (two fan cakes on the truss, a V or a W), mines (a low spray from the
  stage-front pyro spots), roman candles (six along the truss in a chase) and the **comet chase** (ten comets
  along the truss fired one by one, left to right, drawing a V or a W).
- **Look**: motion trails that cool from a white-hot head to embers, a soft glow and smoke per shell lit by
  the next bursts, a sky glow and a tint of each burst's colour on the rig (`fireworkLight`, capped). Web Audio
  booms and crackle (`fireworkSound.js`), switchable on the desk.
- **Camera**: anything going into the sky (shells, candles, roof comets, the chase) moves the camera to the
  `sky` shot in 0.6 s; the mines stay on the stage, so the camera keeps its shot.
- **Rendering**: a slot pool (40 x 320 particles on strong GPUs, 28 x 224 on the Iris Xe), the newest
  launches in the slots, every particle's path computed in the shader. 60 FPS through the desk FINALE.
  (A reserved GLSL word, `half`, once broke the whole shader silently in production, where shader error
  checks are off: check new shader code in a development build.)

### How a song uses them (`lib/show/program.js`)

- **CO2 goes with the lights**, not only in its solo: every drop's blast, a short hit on each new phrase of a
  chorus or drop (cycling all jets, the outer pair, an outside-in chase, the inner pair), every jet on each
  sudden jump in energy, and an outside-in chase on the last bar of a riser (beats 1-3: a drop's pause
  stays clear).
- **Shells are kept for the finale.** During the song only stage pyro fires:
  - the **biggest drop**: the comet chase across the bar before it, then mines and roman candles on the
    drop and roof comet fans on the next beats, with confetti and streamers;
  - **other big drops** (up to four, clear of the climax and the finale): mines, the comet chase or the
    candles leading in, confetti, and streamers on every other one;
  - **energy bursts**: mines (up to five);
  - the **fireworks solo** (a song with room for it): candles, then the comet chase, then a roof comet fan.
- **The finale** runs over 8 "finale bars" ending on the song's last strong bar (a song that fades out closes
  before the fade; one that carries on loud follows it to the end):
  - as it starts: the confetti pours for 5-8 s (to a finale bar line), the streamers fire and the CO2 blasts;
  - bars 1-2: stage pyro alone, in one of **10 openings** (5 sequences, each also mirrored), picked from the
    song's title, length and tempo, so every song opens its own way (`extras.finaleOpening` pins one; the nine
    demos all differ);
  - bars 3-6: shells, each bar's pattern (single, pairs, alternate, sweep, roll, rush) ranked by how loud that
    bar is; the genre picks the shells (EDM palms and crossettes, pop peonies and willows, rap crossettes and
    glitter, Bollywood chrysanthemums and rings); the tempo picks the pace (only fast songs rush);
  - bars 7-8 build (roll, rush), then the closing volley, sized by how hard the song ends, with mines;
  - every firework is snapped to the song's real eighth-note grid (within 1 ms in all nine demos).
- **Every song and every upload gets every effect**: a song without a peak uses its loudest section as the
  climax. Uploads get the same programming (`analysisWorker.js` passes `extras: { co2: true }`).
- **Effects finish after the song**: whatever is in the air when a song ends or is stopped (streamers,
  confetti, CO2, the last stars) carries on in its own time over the house lights and whatever comes next.
- **Per-song extras** (`public/shows/<slug>.extras.json`): `co2`, `finaleOpening` (0-9), `finaleBeatsPerBar`
  (Closer's finale plays slowly through its whole final drop), plus the existing structure and colours.

### The desk and the live keys

- **Desk** (EFFECTS and FIREWORKS panels): CO2 floor, CO2 truss, confetti and streamers with patterns and
  hold; an EVERYTHING row; a button per shell and per stage pyro; FINALE; colours (mixed, classic, the
  show's); sound on/off. The desk takes the lights over.
- **Live keys during a song's light show only**: **Space** fires the floor and truss CO2, **Shift** the
  confetti, while held (a tap is a short burst); two buttons under the player bar do the same for mouse and
  touch. The show is not taken over: it carries on as programmed and its own CO2 and confetti still fire; per
  jet or cannon the newer firing shows (`mergeStates`). The space bar doesn't scroll the page meanwhile, keys
  are ignored while typing, and switching window or the song ending lets go.

## Loading screen (Nov 2026)

The page is covered (`show/LoadingScreen.jsx`) until the stage and the show are ready, and can't scroll
meanwhile. A small store (`show/stageReady.js`) collects six parts: the quality tier, the stage (venue, truss,
LED wall, lasers, haze), the fixtures (models loaded), the effects, the fonts and the demo song list. The
3D parts report once their shaders are compiled (the existing `Warm` groups). Then two frames are drawn and
the loader fades out, so the first thing seen is the finished stage. It reveals after 20 s at the latest, and
the poster tier doesn't wait for 3D. Measured: revealed at about 6 s on the Iris Xe (production build).

## Lighting refinements (Nov 2026, later)

- **Beam movement** follows the cues on a critically damped spring (`maath` `easing.damp`, 0.3 s), so a cue
  that snaps eases in and out instead of jumping to full speed. The drop's convergence keeps its instant hit.
- **Side towers**: beat effects number them by height, so alternating looks run up and down each tower,
  mirrored on both sides (numbered left/right, one tower went dark at a time).
- **Aerial beams** 1.2x denser with more smoke in them; the haze 40% thicker; in songs, brightness following
  the music never drops below ~40% of the cue.
- **Vocal focus**: the aerial beams pulse on the beat while the washes hold steady (`pulseBeams`, `pulseWash`).
- **Tower lasers** more often: alone in calm parts, with the side towers and floor in grooves, and as the
  song's ending (fanning out and gathering in). The side towers keep their one solo.
- **CO2 solo**: the aerial beams fill the space softly (lifted into the sky, drifting), the jets the focus.
- **Tip**: "use headphones and turn your screen brightness and volume up", in the playground's song list and
  briefly as a song starts.
- **Closer** corrected by ear: drops at 1:11, 2:30 and 3:33 (its sung choruses are louder than its drops, so the
  analysis took them for the drops).
