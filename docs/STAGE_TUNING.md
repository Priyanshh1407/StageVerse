# Tuning the stages yourself

Where every number that shapes the light show lives, and what changing it does. Change a value, save, and the dev server reloads the page. Test on the stage pages (section 9) before touching the homepage.

There are two kinds of stage:
- **The homepage stage** (today's): `components/home/stage/` (`rigLayout.js`, `Fixtures.jsx`, ...).
- **The festival stages** (desert, warehouse, mainstage; test pages only for now): their layouts in `lib/show/stages/`, their renderer in `components/home/stage/festival/`.

The **shows** (cues, what each section does) are shared by both and live in `lib/show/program.js`.

## 1. How a moving head decides where it points

Every frame the beam shader (`components/home/stage/fixtureShader.js`, `aimDirection`) works out:

```
pan  = restPan * fan + sin(t) * sweep                                         (side to side, x)
tilt = restTilt + tiltShift + sin(2t) * sweep * 0.12 + cos(t) * tiltWave      (up and down, y)
t    = movement phase + (the head's place in its row) * phaseSpread * 2π
```

- **restPan / restTilt**: where the head points when nothing moves (its layout, section 2).
- **fan, sweep, speed, tiltShift, tiltWave, phaseSpread**: come from the cue's look (section 3), scaled per group (section 4).
- Angles are radians: 0.1 ≈ 6°, 0.5 ≈ 29°, 1.57 = 90°. Tilt 0 = straight down, 1.57 = level, more than 1.57 = upwards.
- `converge` (0 to 1) pulls every beam towards one point on the stage (the drop); `focusFloor` moves that point down onto the floor.

## 2. Where each light stands and where it rests (layouts)

**Festival stages**: `lib/show/stages/desertLayout.js`, `warehouseLayout.js`, `mainstageLayout.js`. Every light is one line:

```js
fx('beam', [x, y, z], aim(ax, ay, az), reach)
```

- `[x, y, z]`: where it stands, in metres. x = left (-) / right (+), y = height, z = towards the crowd (+) / back (-). The deck's front edge is z = 0.
- `aim(ax, ay, az)`: where it points at rest. The three numbers are a direction (only their ratio matters):
  - `ax`: sideways. 0 = straight at the crowd. Bigger = more to the right, negative = left.
  - `ay`: up/down. 0 = level, negative = down, positive = up. **The x and y movement on top of this comes from the cues.**
  - `az`: forward; keep it 1 and change the other two.
  - Example: `aim(0, -0.38, 1)` points at the crowd, about 21° down. `aim(0.3, 0, 1)` points level, about 17° to the right.
- `reach`: how long the beam preview is (lab pages only).
- Many rows compute the aim from x, e.g. the desert's roof rows: `dir: (x) => aim(x * 0.01, -0.38, 1)`. The `0.01` is **how much the row fans out sideways** (0 = all parallel), the `-0.38` **how far down they throw**.
- The type (`'beam'`, `'spot'`, `'wash'`, `'strobe'`, `'blinder'`, `'ledbar'`, `'laser'`, `'co2'`, ...) decides what is drawn. `turned(fx(...), [0, 0, Math.PI / 2])` stands a strobe or pixel bar on end.

Which group a head belongs to (aerial, sides, floor, wash; spots are their own group) is decided by `roleOf` in `lib/show/stages/index.js`, by height and type.

**Homepage stage**: `components/home/stage/rigLayout.js`, `GROUPS`: per group `tilt` (rest tilt, radians from straight down), `panSpread` (how much the row fans out), `cross` (neighbours crossing), `pan` (side towers' crossing angle), `facing` (washes turned towards the stage), `layout` (where the row hangs).

## 3. The cues: what each part of a song does (shared by every stage)

`lib/show/program.js`:

- **`POSITIONS`** (top of the file): `fan` (spreads every row sideways; negative mirrors the rows so they cross) and `tiltShift` (lifts (+) or lowers (-) every beam). Example: `audience: { fan: 0.9, tiltShift: -0.3 }` throws the beams out and down into the crowd; `sky: { tiltShift: 0.45 }` lifts them up.
- **`movesFor`** (just below): the movements. `sweep` = **how far they swing side to side (x)**, `tiltWave` = **how far they swing up and down (y)**, `phaseSpread` = 0 for every head together, 1 for a wave rolling along the row, `speed` = the cycle length in bars.
- **`SOLOS`**: each solo's look (which group is on, which position, which movement).
- Section looks (intro, groove, build, peak, breakdown, outro) and the hits (drop, strobe, blinder, burst) are built further down from these.

**After changing `program.js` (or `look.js`), rebuild the demo shows: `npm run demos`.** The songs' shows are built once into `public/shows/*.show.json`; the pages play those files, so a change in `program.js` shows up nowhere until they are rebuilt. Then reload the page and run `npm test`.

Every key a look can have, with its meaning and default, is in `lib/show/look.js` (`DEFAULT_LOOK`).

## 4. Per group: how strongly each group follows the cue

**Festival stages**: `components/home/stage/festival/StageHeads.jsx`, `ROLES`:

| Key | What it does |
|---|---|
| `sweep` | multiplies the cue's side-to-side swing (aerials 0.5: half as far as the cue says) |
| `speed` | multiplies the movement speed |
| `converge` | how much the group joins the drop's focus |
| `spread` | beam width (washes 4.5 = wide and soft, spots 1.7, beams 1) |
| `opacity` | **how powerful the beam looks** (aerials 1.8, sides 1.5, floor 1.3) |
| `haze` | extra smoke in the beam |
| `scale` | size of the fixture's body (default 2.3; the floor's 1.6 is smaller, the light is unchanged) |

Also in that file:
- `AERIAL_MAX_WAVE` (0.4): the most the aerial beams may swing up and down; `AERIAL_MAX_LIFT` (0.12): how far the top of that swing may rise above their rest angle (a bigger wave swings further down into the crowd instead, so they never go over the truss).
- The floor group has `noWave: true`: it sweeps side to side only (a sweep plus an up-and-down wave made it go round in circles). Remove it to bring the wave back.
- The floor group is `steady`: in every cue its direction stays close to "Peak · hook". `FLOOR` near the top of `StageHeads.jsx` sets the limits: `fan` (how far a cue may spread them, never mirrored), `tiltShift` (how far up or down), `sweep` (the most side-to-side swing). It takes no part in the focus or the drop's sideways throw (`converge: 0`). The fan breathe and the circle still move it. It is never dim: whenever a cue has it on at all, it runs at 85% or more of a nearly full intensity (the `groupLevel` / `intensity` lines in `driveRole`; in songs the brightness also follows the music's loudness, down to 40%, which made quiet bars dim).
- Side towers: the left and right towers are separate groups; with `sidesMirror: 1` in a look the right one sweeps the opposite way (both point in at the centre and move as mirror images). The shows pick one type per song (`sidesMirror` in the side towers solo in `program.js`).
- `sideScreenBeams` (desert): the moving heads under the side screens. `program.js` sets it to 0 in every riser into a peak and every peak's pinch (the `cues: cues.map(...)` line near the end), 1 everywhere else; the stage's `screenBeamsX` (28) says which heads count.
- In `driveRole`, the line `const shift = ...`: aerials take a cue's `tiltShift` only downwards (`Math.min(0, ...)`), so they never lift above the truss; the side towers only downwards and at most 0.3.

- Spots have `onPerformer: true`: no look's lift or wave moves them, so they stay on the performers (the follow spots from the front-of-house tower included).
- **The fan breathe** (`look.fanBreathe: 1`, in every "peak after solo"): the aerial and floor rows open out and close in on the beat (open, then closed two beats later), the beams otherwise held. Its range is the `0.3 + 1.1 * ...` in `StageHeads.jsx` (the fan goes from 0.3 to 1.4 times the cue's).
- **The circle** (`look.circle: 1`, radius `look.circleSize`, 0.35 rad): every beam traces a circle, each a little behind the last, so the rig rolls round like a ring. In a circle every beam stays on (alternate and sparkle are ignored) and the aerials and side towers ignore the cue's lift: their circle's top stays just under where they rest (below the truss). The aerials swing up and down 1.5 times the radius (their up-and-down is foreshortened from the crowd); the washes circle at 0.4 of the radius; spots don't. `program.js` puts it only where it fits (the `circleAt` block near the end): every peak's "all in"; a song without one gets a single circle in the second phrase of its longest peak, if that peak runs three phrases or more (BAND4BAND, Smack That and Yellow have none).

**Homepage stage**: the same `ROLES` in `components/home/stage/Fixtures.jsx` (without the festival limits).

## 5. Lasers, strobes, screens, pixel bars

- **Lasers**: `components/home/stage/Lasers.jsx` (homepage) and `festival/StageLasers.jsx`: `PER` (most beams per projector), `LENGTH`, `LOW`/`HIGH` (fan shares). Positions: the layout's `fx('laser', ...)` lines.
  - **How many laser beams the peaks light** (festival stages): `PEAK_LASERS` near the top of `lib/show/program.js` (0.4 = 40% of each fan; 1 = every beam), passed to the lasers as `look.laserMax`. Rebuild the shows after changing it. The homepage's lasers ignore it.
  - Festival lasers' intensity (`festival/StageLasers.jsx`, the glow layer is removed): the core's thickness `new THREE.BoxGeometry(0.05, 0.05, LENGTH)`, its brightness `vec3 hot = ... * 1.15 + 0.06` (the colour scaled so its strongest channel is full: pushing every channel past full turns a coloured laser white), the glow's width `HALO`, strength `* 0.22` (divided by how many beams the fan has lit, so overlapping glows never pile into a blob), where it starts (`away`, from 5% of the beam's length) and how fast it fades as a beam turns to the camera (`vSideOn`), the sparkle along the beam (`sparkle`), `TOTAL_CAP` (most beams on stage at once), and the sweep `* 0.42` in the `yaw` line.
- **Strobes and blinders**: `Strobes.jsx` / `festival/StageStrobes.jsx`: `WIDTH`, `BLINDER_WHITE`, `GLOW_TOTAL`, `GLOW_SPREAD`. The flash over the whole view and the room is `components/home/stage/flash.js` (`FLASH_BRIGHTNESS`, `REFERENCE_BLINDERS`).
- **LED screens (festival)**: which animation plays when, `lib/show/stages/screenFx.js`; the animations themselves, `SCREEN_FRAGMENT` in `festival/StageBuild.jsx` (patterns 0 to 5). The walls with the wordmark use the homepage's wall shader (`festival/StageLedWall.jsx`).
- **Pixel bars (festival)**: `BAR_FRAGMENT` in `festival/StageBuild.jsx` (chase speed `uBeat * 0.25`, sparkle, colour bands).

## 6. Cameras, crowd, performer, PA (festival stages)

`lib/show/stages/index.js`, each stage's definition:
- `shots: makeShots({ dist, height, eye })`: `dist` how far back the wide shot stands, `height` the height it looks at, **`eye` how high the cameras stand** (desert 5.5 m, warehouse 3.4 m).
- `crowd: { x, z0, z1 }`: the crowd's half-width and its front and back edges. Its height: `spot[i * 3 + 1] = ...` in `festival/StageCrowd.jsx`.
- `performerScale` (desert 1.6) and `performerAt`: the band or DJ's size and place.
- `pa` (line arrays and subs: `ARRAY_X`, `TOP`, `SUB_COUNT`, ...) and `barrier: { width, z }`.
- `focus`: where the drop focuses the beams.
- `fireworkPlace`: how firework launches move onto the stage (`sx` width, `lift` height of stage pyro, `pyroZ`, `shellZ`).

## 7. Bloom and the other switches

`.env.local` (restart the dev server after changing it): `NEXT_PUBLIC_FEATURE_BLOOM=on` brings back the glow; every other feature switch is listed in `.env.example`.

## 8. The light count

Festival test pages: the "Moving heads" buttons (64, 96, 160, all). `lib/show/stages/rig.js`, `rigHeads`, thins every group evenly. Homepage: the lighting desk's rig size (`BEAM_COUNTS` in `components/home/stage/useQualityTier.js`).

## 9. Testing a change

- `/lab/desert`, `/lab/warehouse` (`?layout=1` for the grey layout with every fixture marked):
  - **Look**: quick presets.
  - **Hits**: Drop, Strobe, Blinder, Burst, on top of whatever is showing.
  - `?only=aerial` (or `sides`, `floor`, `wash`) keeps one group on and everything else off (lasers and pixel bars too), to look at it alone.
  - `?cue=<name>` holds a cue straight away, e.g. `?cue=Circle · all beams` or `?cue=Solo · washes`.
  - **Every cue in the shows**: all 44 kinds of cue from the nine demo songs (intros, grooves, builds, every peak, every solo, focus, outros...). Click one to hold it on the stage.
  - **Play a song through it**; `?song=<slug>&t=<seconds>` starts one at a moment (e.g. `?song=yellow&t=222` for Yellow's finale).
  - **Camera follows the show**: cuts between the cue's shots and looks up for fireworks.
- `/lab/stage`: the homepage stage on its own.
- `npm test` after changing anything in `lib/`.

## Logo sign and the warehouse club rules
- The StageVerse logo sign on each stage: `logo: { position, size }` in its definition in `lib/show/stages/index.js` (desert: on the roof's front edge; mainstage: under the crown; the warehouse has none, only the wordmark on its back LED screen). Drawn by `components/home/stage/festival/StageLogo.jsx`.
- Warehouse only:
  - `club: true` plays every show as club looks (`lib/show/stages/club.js`): quiet parts a mirror-ball moment, grooves tight single-colour scans, builds a strobe and laser ramp, peaks a strobe hit on every bar and alternating beams. The thresholds are the `e < ...` lines.
  - `laserPitch: { offset, min }` aims the wall lasers down over the crowd (more negative = further down).
  - `confetti: false`: CO2 only, no confetti or streamers.
  - Extra camera views: `dj`, `djLeft`, `djRight`, `djWide` (from the booth), `crowd` (in the crowd), `rear` (back of the room), `wall` (side wall). They appear as buttons on `/lab/warehouse`, or use `?view=dj`. In songs (with "Camera follows the show" on) the camera does not cut between views: it circles the room one way, once or twice a song, and ends where it began (`orbit` in the warehouse's definition, `lib/show/stages/orbit.js`). `centre` and `radius` set the circle (x, z), `height` the camera's height at the back of the room and behind the DJ, `stage` and `crowd` what it looks at from the room and from behind the DJ, `lapSeconds` the shortest a lap may take (a song shorter than two of them gets one lap). One lap passes behind the DJ once, so never more than twice a song.
  - Strobes: `STROBE_LEVEL`, `BLINDER_LEVEL` and `STROBE_COLOR` at the top of `club.js` (softer and slightly yellow).
  - `co2Extra`: two more CO2 nozzles at the stage's front corners, each firing with the outermost floor jet (`follow`: 0 = far left, 5 = far right). Delete the line to remove them.
- Test pages: the **CO2** hit button fires every floor jet for 3 seconds.

## The mainstage's own cues
- `lib/show/stages/mainstageCues.js` holds 16 cues that only the mainstage has (sky spears, crossed swords, wide wings, starburst, scissors, pixel storm, wall of light, laser cathedral, crowd rake, ripple, low tide, odd-even chop, sunrise, the pyramid, silhouette, lone sweeper). Each is a `look` laid over the show's cue at that moment; the show files are not changed.
- `planMainstageCues` decides where they play in a song: the later phrases of a peak and every second "all in" (the peak list, in turn), every second laser moment (laser cathedral), the later phrases of a groove (the groove list), a build's first and third phrase (sunrise, the pyramid), every second calm section (silhouette) and plain breakdown (lone sweeper). A peak's landing, the named moments, the solos and the focus cues stay as the show has them.
- Their own keys: `aerialTilt` lifts (+) or lowers (-) the aerial beams freely, `floorFan` / `floorTilt` / `floorSweep` move the floor beams outside their usual limits (see `FLOOR`).
- They appear at the end of "Every cue in the shows" on `/lab/mainstage`, or hold one with `?cue=Mainstage · sky spears`.

## The warehouse's PA and strobes
- `pa` in the warehouse's definition is a club's PA, with no line arrays: `SUB_*` are the subs along the stage front (`SUB_STACK` high, `SUB_COUNT` stacks, `SUB_PITCH` apart), `STACKS` the stack at each side of the stage (`subs` on the floor with `tops` full-range boxes on them, `turn` = how far they face in), `HANGS` the small cluster hung from the grid on each side (`boxes`, `y` = its top, `grid` = the height it hangs from). `barrier` is the crowd barrier in front of the subs.
- `strobeScale: 0.7` makes the warehouse's strobe fixtures smaller (1 = a festival's). The strobe model is drawn two-sided on the festival stages, so a camera behind it sees a solid housing.

## Strobes as light sources (festival stages)
In `components/home/stage/festival/StageStrobes.jsx`:
- The panel blazes at full brightness on any flash (`lit` in the panel shader; `* 11.0` is how bright), so a softened strobe (the warehouse) dims the room's flash, not the lamp.
- `GLOW_EACH` is each firing strobe's own glow round its panel, `GLOW_SPREAD` how far it reaches (metres).
- `THROW_LENGTH` / `THROW_OPEN` shape the shaft of light out of each panel into the haze (`* 0.32` in the shaft shader is its strength). The random coloured strobes light their panel, glow and shaft in their own colour.
