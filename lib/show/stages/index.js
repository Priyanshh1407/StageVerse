// The festival's stages as plain data, built from their layouts (the same files the /lab test pages
// draw). Nothing here touches the browser, so the stage renderer, the shows and the tests share it.
//
// A stage definition:
//   key, title, homeGenres     which genres play here by default
//   indoor, fireworks, sky     the warehouse is indoors: no sky, no fireworks
//   performer                  'dj' or 'band'
//   deck                       the deck's height (m)
//   structure                  the layout's pieces (boxes, panels, trusses, cables)
//   screens                    the LED surfaces among them
//   heads                      the moving heads: { type, pos, aim, reach, role, index }
//                              role is the group the shows drive (aerial, sides, floor, wash);
//                              index numbers each head within its role for beat effects
//   strobes, blinders, lasers, pixelBars    { pos, aim?, rot? }
//   effects                    { co2, confetti, streamer, pyro, shell, haze }: lists of { pos }
//   crowd                      where the audience stands: { x (half-width), z0, z1 }
//   focus                      the centre of the stage floor (where the drop focuses the beams)
//   performerAt                where the performer set stands, relative to the homepage stage's
//   fireworkPlace              how firework launches move onto this stage (lib/show/stages/rig.js)
//   shots                      the camera shots the shows cut between
//   views, beamScale           for the lab pages

import { COLORS } from './blockoutKit.js';
import mainstageLayout from './mainstageLayout.js';
import desertLayout from './desertLayout.js';
import warehouseLayout from './warehouseLayout.js';
import { mainstageTestCues, patchFor, planMainstageCues } from './mainstageCues.js';

export const ROLES = ['aerial', 'sides', 'floor', 'wash'];
// spots are their own group on the festival stages (sharp beams on the performers), driven like the washes
export const HEAD_TYPES = ['beam', 'spot', 'wash'];
export const LIGHT_TYPES = ['beam', 'spot', 'wash', 'strobe', 'blinder', 'ledbar', 'laser'];
export const EFFECT_TYPES = ['co2', 'confetti', 'streamer', 'pyro', 'shell', 'haze'];

/**
 * The camera shots for a stage, scaled from today's stage (about 40 m wide, looked at from 26 m):
 * `dist` is how far in front of the stage the wide shot stands, `height` the height it looks at.
 */
/**
 * A shot moved along its own line of sight so `frame` (centre [x, y, z], half [width, height] in metres) just
 * fills a camera of this aspect and vertical field of view: the whole stage in view whatever the window.
 */
export function fitShot(shot, frame, aspect, fovDeg) {
    const d = shot.pos.map((v, i) => v - shot.target[i]);
    const len = Math.hypot(...d) || 1;
    const tan = Math.tan(((fovDeg ?? 55) * Math.PI) / 360);
    // (frame.margin: how much room is left round the stage, 1 = edge to edge)
    const dist = Math.max(frame.half[1] / tan, frame.half[0] / (tan * Math.max(0.2, aspect || 1.6))) * (frame.margin ?? 1.04);
    return { pos: frame.centre.map((c, i) => c + (d[i] / len) * dist), target: [...frame.centre] };
}

/** The performer's own view: from the booth (or the singer's spot), looking out over the crowd. */
export const djShot = (deck, z, crowdZ) => ({ pos: [0, deck + 1.9, z], target: [0, deck + 0.8, crowdZ] });

export function makeShots({ dist, height, eye = 1.8, sky = true }) {
    const k = dist / 26;
    const lift = eye - 1.8; // how much higher than today's stage the cameras stand
    const shots = {
        house: { pos: [0, 1.3 + lift, dist * 1.19], target: [0, height * 0.79, -10 * k] },
        wide: { pos: [0, 1.8 + lift, dist], target: [0, height, -8 * k] },
        dolly: { pos: [0, 2.2 + lift, dist * 0.9], target: [0, height * 1.07, -10 * k] },
        high: { pos: [0, 6.5 * k + lift, dist * 1.06], target: [0, height * 0.86, -10 * k] },
        left: { pos: [-6.5 * k, 2.6 + lift, dist * 0.94], target: [1.5 * k, height, -10 * k] },
        right: { pos: [6.5 * k, 2.6 + lift, dist * 0.94], target: [-1.5 * k, height, -10 * k] },
        drop: { pos: [0, 1.4 + lift, dist * 0.87], target: [0, height * 1.21, -10 * k] },
        finale: { pos: [0, 5.5 * k + lift, dist * 1.08], target: [0, height * 1.14, -10 * k] },
    };
    // fireworks: further back and looking up (indoors there are none, so it is the finale shot)
    shots.sky = sky ? { pos: [0, 2.0 + lift, dist * 1.38], target: [0, height * 3.1, -20 * k] } : shots.finale;
    return shots;
}

const round = (v) => Math.round(v * 1000) / 1000;
const point = (f) => ({ pos: f.pos.map(round), ...(f.aim ? { aim: f.aim.map(round) } : {}), ...(f.rot ? { rot: f.rot } : {}), ...(f.reach ? { reach: f.reach } : {}) });

/**
 * Number the heads of each role for beat effects: rows from one side to the other (front rows
 * first), and towers and ladders by height, left and right alternating, so a chase runs up them.
 */
function numberHeads(heads) {
    for (const role of ROLES) {
        const mine = heads.filter((h) => h.role === role);
        const order = role === 'sides'
            ? [...mine].sort((a, b) => a.pos[1] - b.pos[1] || a.pos[0] - b.pos[0])
            : [...mine].sort((a, b) => b.pos[2] - a.pos[2] || a.pos[0] - b.pos[0]);
        order.forEach((h, i) => { h.index = i; });
    }
    return heads;
}

/** A stage definition from a layout. `roleOf(fixture, fromVariant)` gives a moving head its role. */
function defineStage(layout, { variant, roleOf, standing, ...rest }) {
    const extra = layout.variants?.find((v) => v.key === variant);
    const tagged = [...layout.fixtures.map((f) => ({ f, fromVariant: false })), ...(extra?.fixtures ?? []).map((f) => ({ f, fromVariant: true }))];
    const of = (type) => tagged.filter(({ f }) => f.type === type).map(({ f }) => point(f));
    const heads = numberHeads(tagged
        .filter(({ f }) => HEAD_TYPES.includes(f.type))
        .map(({ f, fromVariant }) => ({ type: f.type, ...point(f), role: roleOf(f, fromVariant), ...(standing?.(f, fromVariant) ? { mount: 'standing' } : {}) })));
    const structure = [...layout.structure, ...(extra?.structure ?? [])];
    return {
        key: layout.key,
        title: layout.title,
        deck: layout.meta.deck,
        structure,
        screens: structure.filter((p) => p.color === COLORS.screen),
        heads,
        strobes: of('strobe'),
        blinders: of('blinder'),
        lasers: of('laser'),
        pixelBars: of('ledbar'),
        effects: Object.fromEntries(EFFECT_TYPES.map((t) => [t, of(t)])),
        views: layout.views,
        beamScale: layout.beamScale ?? 1,
        meta: layout.meta,
        ...rest,
    };
}

// ---- the three stages ------------------------------------------------------------------------------

const MD = mainstageLayout.meta.deck;
export const mainstage = defineStage(mainstageLayout, {
    // its own cues on top of the shows' (lib/show/stages/mainstageCues.js): swapped in when a song plays here
    cuePlan: planMainstageCues,
    extraCues: mainstageTestCues,
    cuePatch: patchFor,
    // the "no trusses" design: the aerial lights sit on the fins, the wall, the crown and the PA
    variant: 'none',
    // washes and spots light the stage and the DJ; beams on the deck are the floor row; the beams
    // standing on the fins, the wall, the crown and the PA are the aerials; the ladders between the
    // fins are the sides
    roleOf: (f, fromVariant) => (f.type !== 'beam' ? 'wash' : f.pos[1] <= MD + 1 ? 'floor' : fromVariant ? 'aerial' : 'sides'),
    homeGenres: ['edm'],
    indoor: false,
    fireworks: true,
    sky: 'night',
    performer: 'dj',
    crowd: { x: 40, z0: 4.4, z1: 30 },
    focus: [0, MD, -12],
    performerAt: [0, 1.0, -3.7],
    fireworkPlace: { sx: 2.2, lift: 5, pyroZ: -24, shellZ: -6 },
    shots: makeShots({ dist: 62, height: 14, eye: 6.5 }),
    // the aerials stand on top of the fins, the wall and the crown (they don't hang)
    standing: (f, fromVariant) => fromVariant,
    // the DJ, bigger than life, on the riser behind the LED booth
    performerScale: 1.4,
    // line arrays sized to the stage: 20 boxes at 1.6 times the homepage's, flown in front of the truss towers
    pa: { TOWER_X: 45.4, TOP_Y: 23, TOWER_FRONT_Z: -4, ARRAY_X: 47.6, ARRAY_Z: -2, TOP: 21.6, SCALE: 1.6, BOXES: 20, CURVE: 0.3, SUB_Z: 0.41, SUB_PITCH: 2.4, SUB_COUNT: 34, SUB_STACK: 3 },
    // the whole stage and its PA fill the screen in every view (lib/show/stages/index.js fitShot)
    frame: { centre: [0, 15.5, -12], half: [50, 15], margin: 1.38 },
    // no glossy floor: the views keep to the stage
    glossFloor: false,
    // bigger beams for a bigger stage: every beam reads whenever it is on; the floor row reaches further
    headTune: { aerial: { opacity: 1.35 }, sides: { opacity: 1.8, spread: 1.15 }, floor: { opacity: 1.3, length: 1.6 }, washOnStage: true, floorCircleLift: 0.3 },
    // the lasers keep their strength far out: thicker, fading later, brighter
    laserStrength: { width: 2.2, fade: 0.45, boost: 1.4 },
    // more confetti and streamers: every cannon and launcher fires (lib/show/stages/rig.js)
    moreEffects: true,
    // (but only two sets of streamers fire: six launchers; all twelve together were too many)
    streamerSets: 2,
    // and streamers at most twice a song: the first big moment and the finale
    maxStreamers: 2,
    // its own screen content, across the wall, the fins and the crown as one canvas centred on the DJ
    // (components/home/stage/festival/mainstageVisuals.js): centre [x, y] and half-height in metres
    visuals: { centre: [0, MD + 10], scale: 13 },
    // more fireworks in the finale: every shell gets a mirrored twin (components/home/stage/festival/FestivalScene.jsx)
    finaleEcho: true,
    // two more CO2 nozzles on the roof: the ends of the wall top, firing with the outer high jets
    co2TrussExtra: [-1, 1].map((s) => ({ pos: [s * 15.6, MD + mainstageLayout.meta.wall.height + 0.7, mainstageLayout.meta.wall.z + 2], follow: s < 0 ? 0 : 3 })),
    // more CO2: nozzles between the floor jets and at the ends, each firing with its neighbour
    co2Extra: [-40, -29.6, -14.8, 0, 14.8, 29.6, 40].map((x, k) => ({ pos: [x, MD + 0.3, -0.9], follow: [0, 0, 1, 2, 4, 5, 5][k] })),
    barrier: { width: 92, z: 3.2 },
});

const DD = desertLayout.meta.deck;
const ROOF = desertLayout.meta.roofY;
export const desert = defineStage(desertLayout, {
    // beams on the deck are the floor rows, beams under the roof the aerials, the ladders up both
    // sides the sides; washes and spots (and the follow spots out front) light the band
    roleOf: (f) => (f.type !== 'beam' ? 'wash' : f.pos[1] <= DD + 1 ? 'floor' : f.pos[1] >= ROOF - 3 ? 'aerial' : 'sides'),
    homeGenres: ['pop', 'bollywood'],
    indoor: false,
    fireworks: true,
    sky: 'dusk',
    performer: 'band',
    crowd: { x: 30, z0: 4.4, z1: 26 },
    focus: [0, DD, -8],
    performerAt: [0, 0, 0],
    fireworkPlace: { sx: 1.4, lift: 4, pyroZ: 2, shellZ: 0 },
    // (its default view stands further back, so the whole stage and its side screens are in it)
    shots: (() => {
        const shots = makeShots({ dist: 44, height: 11, eye: 5.5 });
        const back = (shot, metres) => {
            const d = shot.pos.map((v, i) => v - shot.target[i]);
            const len = Math.hypot(...d);
            return { pos: shot.pos.map((v, i) => v + (d[i] / len) * metres), target: shot.target };
        };
        return { ...shots, wide: back(shots.wide, 14) };
    })(),
    // (no logo sign on the roof: the wordmark is on the LED wall)
    // the band, bigger than life so it reads over the floor lights
    performerScale: 1.6,
    // the moving heads under the side screens (|x| beyond this) can be switched on their own (look.sideScreenBeams)
    screenBeamsX: 28,
    // a real PA: line arrays flown off the front legs, sub stacks along the deck front, a steel barrier
    // (line-array boxes 1.5x the homepage's, in proportion to the wider stage: 16 of them reach from 20 m to about 10 m)
    pa: { TOWER_X: 24.5, TOP_Y: ROOF - 0.6, TOWER_FRONT_Z: 0, ARRAY_X: 27.3, ARRAY_Z: 2.8, TOP: 20.2, SCALE: 1.5, SUB_Z: 0.41, SUB_PITCH: 2.4, SUB_COUNT: 18, SUB_STACK: 3 },
    barrier: { width: 58, z: 3.2 },
});

const GRID = warehouseLayout.meta.gridY;
export const warehouse = defineStage(warehouseLayout, {
    // everything on the truss grid is aerial, the uplighters along the walls are the sides, the beams
    // on the stage lip the floor; the washes and pin spots on the grid's front truss light the DJ
    roleOf: (f) => {
        if (Math.abs(f.pos[0]) >= 17.5) return 'sides';
        if (f.pos[1] >= GRID - 1) return f.type === 'beam' ? 'aerial' : 'wash';
        return f.type === 'beam' ? 'floor' : 'wash';
    },
    homeGenres: ['rap'],
    indoor: true,
    fireworks: false,
    sky: 'indoor',
    performer: 'dj',
    crowd: { x: 17, z0: -1, z1: 18 },
    // a club's PA, no line arrays: subs along the stage front (two high, level with the low stage) behind the
    // crowd barrier, a stack at each side of the stage (subs with full-range boxes on top, turned in at the
    // floor), and a small cluster hung from the grid on each side
    pa: {
        SUB_Z: -3.55, SUB_PITCH: 2.4, SUB_COUNT: 8, SUB_STACK: 2,
        STACKS: [{ x: 14.6, z: -3.3, subs: 3, tops: 3, turn: 0.35 }],
        HANGS: [{ x: 15.2, y: 7.3, z: 1.5, boxes: 4, grid: 8.5, turn: 0.4 }],
    },
    barrier: { width: 24, z: -2.3 },
    // smaller strobe fixtures than a festival's
    strobeScale: 0.7,
    focus: [0, warehouseLayout.meta.deck, -7],
    performerAt: [0, -0.7, -0.9],
    // a club: the DJ's own views, and views from inside the room
    shots: {
        ...makeShots({ dist: 28, height: 4.5, eye: 3.4, sky: false }),
        dj: { pos: [0, warehouseLayout.meta.deck + 2.5, -7.6], target: [0, 3, 18] },
        djLeft: { pos: [-2.2, warehouseLayout.meta.deck + 1.8, -8], target: [-10, 2, 12] },
        djRight: { pos: [2.2, warehouseLayout.meta.deck + 1.8, -8], target: [10, 2, 12] },
        djWide: { pos: [0, warehouseLayout.meta.deck + 2.6, -10.5], target: [0, 2.5, 16] },
        crowd: { pos: [3, 1.7, 9], target: [0, 3.2, -7] },
        rear: { pos: [0, 5.6, 42], target: [0, 3, -6] },
        wall: { pos: [-17, 2.4, 6], target: [3, 3.5, -4] },
        // high and finale stay under the truss grid (at 8 m they stood inside it)
        high: { pos: [-3, 6.2, 30], target: [0, 2.8, -6] },
        finale: { pos: [3, 5.8, 32], target: [0, 3.4, -6] },
        sky: { pos: [3, 5.8, 32], target: [0, 3.4, -6] },
    },
    // in the songs the camera circles the room, one way round, once or twice a song (lib/show/stages/orbit.js):
    // from the back of the room along one side, behind the DJ (at most twice a song), back along the other
    orbit: { centre: [0, 11], radius: [13.5, 20.8], height: [4.8, 3.7], stage: [0, 2.6, -6.5], crowd: [0, 2.4, 14], lapSeconds: 75 },
    // (no logo sign: the wordmark is on the back LED screen)
    // CO2 only: no confetti or streamers indoors
    confetti: false,
    // two more CO2 nozzles at the stage's front corners (where confetti cannons stand elsewhere), firing with the
    // outermost floor jets, so the line of CO2 spans the whole stage front
    co2Extra: [{ pos: [-12.5, 0.4, -1.6], follow: 0 }, { pos: [12.5, 0.4, -1.6], follow: 5 }],
    // the lasers sit high on the walls and fire down over the crowd, as in a club
    laserPitch: { offset: -0.62, min: -0.8 },
    // the shows play as club looks (lib/show/stages/club.js)
    club: true,
});

export const STAGES = { mainstage, desert, warehouse };

/** How wide a stage is (m): its deck, or the room. */
export const widthOf = (stage) => stage.meta.deckSize?.width ?? stage.meta.room?.width ?? 40;

/** The stage a genre plays on by default. */
export const homeStageFor = (genre) => Object.values(STAGES).find((s) => s.homeGenres.includes(genre))?.key ?? 'mainstage';
