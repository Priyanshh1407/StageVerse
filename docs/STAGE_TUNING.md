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


After changing `program.js`, rebuild the demo shows: `npm run demos` (it rewrites `public/shows/*.show.json`), then `npm test`.

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
- `AERIAL_MAX_WAVE` (0.12): the most the aerial beams may swing up and down.
- In `driveRole`, the line `const shift = ...`: aerials take a cue's `tiltShift` only downwards (`Math.min(0, ...)`), so they never lift above the truss; the side towers only downwards and at most 0.3.

**Homepage stage**: the same `ROLES` in `components/home/stage/Fixtures.jsx` (without the festival limits).

## 5. Lasers, strobes, screens, pixel bars

- **Lasers**: `components/home/stage/Lasers.jsx` (homepage) and `festival/StageLasers.jsx`: `PER` (most beams per projector), `LENGTH`, `LOW`/`HIGH` (fan shares). Positions: the layout's `fx('laser', ...)` lines.
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
  - **Every cue in the shows**: all 44 kinds of cue from the nine demo songs (intros, grooves, builds, every peak, every solo, focus, outros...). Click one to hold it on the stage.
  - **Play a song through it**; `?song=<slug>&t=<seconds>` starts one at a moment (e.g. `?song=yellow&t=222` for Yellow's finale).
  - **Camera follows the show**: cuts between the cue's shots and looks up for fireworks.
- `/lab/stage`: the homepage stage on its own.
- `npm test` after changing anything in `lib/`.

## Mainstage-only settings (in its definition, lib/show/stages/index.js)
- `frame`: the box (centre, half width and height in metres) every view is fitted to, so the whole stage and its PA fill the window (`fitShot`). `glossFloor: false` drops the glossy floor in front of the crowd.
- `headTune`: per group multipliers. `aerial` / `sides` / `floor` take `opacity`, `spread` and `length` (the floor beams 1.6 times longer); `washOnStage` keeps every wash on the stage (never lifted, barely moving); `floorCircleLift` centres the floor's circle higher.
- `laserStrength`: `width` (thicker beams), `fade` (below 1 = they keep their strength further out), `boost`.
- `pa`: `SCALE` and `BOXES` size the line arrays to the stage; they hang in front of a straight truss tower each side, with the tower's washes behind them facing the stage.
- `moreEffects`: every confetti cannon and streamer launcher fires (in sets); `co2Extra`: extra CO2 nozzles, each firing with the floor jet it `follow`s.
- Cue patches (`PATCHES` in `mainstageCues.js`): Focus without the floor beams; Focus · two colours with the colours meeting `focusSplit` metres either side of the centre.
- Look keys of its own cues: `mirrorSweep` (scissors: each side sweeps the opposite way), `floorWave` (the floor rides the aerials' wave).

The layout (lib/show/stages/mainstageLayout.js): `FLARE` is how far each aerial is flared left or right in turn; the floor row leans out at the crowd (`aim(x * 0.006, 1, 0.5)`); every wash is aimed at the deck (`onStage`).

All festival stages: an idle strobe shows a clear dark front (no grey box); a faint leftover of the room flash no longer lights the panels.

## The mainstage's screen visuals
`components/home/stage/festival/mainstageVisuals.js`: the wall, the fins and the crown play one picture together (`visuals: { centre, scale }` in the mainstage's definition: the canvas centre [x, y] and half-height in metres). Eleven visuals: tunnel, kaleido, warp, horizon, spectrum, plasma, hexes, shockwave, glitch, chevrons, starfield. `SETS` says which ones each part of a song takes turns with and how many beats each plays (peaks every 16 beats, grooves every 32...); a drop plays the glitch with strobe frames. Each visual is one GLSL function in `VISUALS_GLSL`. On the test page `?visual=tunnel` (any name) holds one. The other stages keep their screens as they were.
