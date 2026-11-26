import { COLORS, aim, box, fx, spread, truss, turned } from './blockoutKit.js';

// The warehouse, home of rap: an indoor arena in the style of the big indoor festival stages with a kinetic LED
// ceiling (an original StageVerse design, no festival's name or logo): a truss grid over the crowd with the kinetic
// LED sky hanging under it, layered LED walls behind a low DJ booth (a wide centre wall, a layer of wings either side
// and a taller outer layer in front of those), a row of floor lights behind the booth backlighting the DJ, LED lines,
// lasers, strobes and haze. No fireworks indoors.
// (Made bigger for the kinetic LED sky, 2026-11-26: 56 m wide (first 38), 68 m long (58), 16 m high (9.5), the grid
// at 13.5 m (8), so the sky's tiles move between about 8 and 11 m, under the grid's fixtures and well over the crowd.)

const ROOM = { width: 56, back: -12, front: 56, height: 16 };
const HALF = ROOM.width / 2;
const D = 1.1;                         // a low stage
const GRID_Y = 13.5;                   // the truss grid, over the kinetic LED sky
const LENGTH = ROOM.front - ROOM.back;
const MID_Z = (ROOM.front + ROOM.back) / 2;
const STAGE_W = 30;                    // the stage's width

const structure = [];
const fixtures = [];

// ---- the room ------------------------------------------------------------------------------------
structure.push(box([ROOM.width, ROOM.height, 0.4], [0, ROOM.height / 2, ROOM.back], COLORS.dark));
for (const s of [-1, 1]) structure.push(box([0.4, ROOM.height, LENGTH], [s * ROOM.width / 2, ROOM.height / 2, MID_Z], COLORS.dark));
// steel roof beams (the roof itself is left open so the top view can see in)
for (const z of spread(ROOM.back + 3, ROOM.front - 3, 10)) structure.push(box([ROOM.width, 0.35, 0.35], [0, ROOM.height, z], COLORS.scenery));
// the stage, the DJ booth and a person; a person in the crowd for scale
structure.push(box([STAGE_W, D, 8], [0, D / 2, -8], COLORS.deck));
// (a low, wide booth: the DJ stands in front of the walls, not behind a desk)
structure.push(box([9, 1.1, 1.8], [0, D + 0.55, -6.5], COLORS.screen));
structure.push(box([0.5, 1.8, 0.3], [0, D + 0.9, -7.8], COLORS.person));
structure.push(box([0.5, 1.8, 0.3], [4, 0.9, 4], COLORS.person));
// the layered LED walls: a wide wall behind the DJ, a layer of wings either side of it a little further forward, and a
// taller outer layer further forward again, so the screens step out towards the crowd; LED lines down the ceiling
const WALL = { width: 22, height: 8.5 };
structure.push(box([WALL.width, WALL.height, 0.3], [0, D + 1 + WALL.height / 2, ROOM.back + 0.5], COLORS.screen, { ledWall: 'main' }));
for (const s of [-1, 1]) {
    structure.push(box([8, 10.5, 0.3], [s * 16, 1 + 5.25, ROOM.back + 1.6], COLORS.screen, { ledWall: s < 0 ? 'left' : 'right' }));
    structure.push(box([6, 13, 0.3], [s * 23.5, 0.5 + 6.5, ROOM.back + 3.2], COLORS.screen, { ledWall: s < 0 ? 'outerLeft' : 'outerRight' }));
}
for (const x of spread(-20, 20, 5)) structure.push(box([0.3, 0.15, 54], [x, GRID_Y + 0.9, 18], COLORS.screen));

// ---- the truss grid ------------------------------------------------------------------------------
// seven trusses across the room, eleven fixtures on each; the kinetic LED sky's tiles hang between them
const CROSS = [-4.5, 3, 10, 17, 24, 31, 38];
const XS = spread(-(HALF - 3.5), HALF - 3.5, 11);
const FRONT = ['spot', 'blinder', 'beam', 'wash', 'spot', 'beam', 'spot', 'wash', 'beam', 'blinder', 'spot'];
const CYCLE = ['beam', 'strobe', 'beam', 'wash', 'beam', 'strobe', 'beam', 'wash', 'beam', 'strobe', 'beam'];
CROSS.forEach((z, k) => {
    structure.push(truss([-(HALF - 2), GRID_Y + 0.5, z], [HALF - 2, GRID_Y + 0.5, z]));
    XS.forEach((x, i) => {
        // the first truss (over the stage front) lights the DJ; the rest point down into the crowd
        // (the pattern mirrored about the middle of each truss, so its left half is the right half's mirror image)
        const type = k === 0 ? FRONT[i] : CYCLE[(Math.min(i, XS.length - 1 - i) + k) % CYCLE.length];
        fixtures.push(fx(type, [x, GRID_Y - 0.1, z], aim(x * 0.016, -1, k === 0 ? -0.6 : (k % 2 ? 0.35 : -0.35))));
    });
});
for (const x of [-(HALF - 2), 0, HALF - 2]) structure.push(truss([x, GRID_Y + 0.5, CROSS[0]], [x, GRID_Y + 0.5, CROSS.at(-1)]));
// a mirror ball over the middle of the floor (over the LED sky's highest tiles, in a gap between them)
const BALL_Z = 13.5;
structure.push({ kind: 'sphere', radius: 0.9, position: [0, GRID_Y - 1.0, BALL_Z], color: COLORS.structure });

// ---- LED lines: down the room, up the walls, round the stage (each row of bars is one continuous line on stage) ------
// along the three trusses that run the length of the room, so three lines of light race from the stage out over the crowd
for (const x of [-(HALF - 2), 0, HALF - 2]) for (const z of spread(-3.6, 37.2, 24)) fixtures.push(turned(fx('ledbar', [x, GRID_Y + 0.15, z]), [Math.PI / 2, 0, 0]));
// columns up both side walls, floor to grid, every 6.5 m
for (const s of [-1, 1]) for (const z of [-6, 0.5, 7, 13.5, 20, 26.5, 33, 39.5, 46]) for (const y of spread(1.1, GRID_Y - 0.9, 6)) fixtures.push(fx('ledbar', [s * (HALF - 0.4), y, z]));
// a frame round the centre LED wall, and a line along the front edge of the stage
for (const y of [D + 0.7, D + 1.3 + WALL.height]) for (const x of spread(-10.6, 10.6, 12)) fixtures.push(turned(fx('ledbar', [x, y, ROOM.back + 0.8]), [0, 0, Math.PI / 2]));
for (const s of [-1, 1]) for (const y of spread(D + 1.8, D + WALL.height + 0.2, 5)) fixtures.push(fx('ledbar', [s * (WALL.width / 2 + 0.3), y, ROOM.back + 0.8]));
for (const x of spread(-14, 14, 16)) fixtures.push(turned(fx('ledbar', [x, D - 0.3, -3.92]), [0, 0, Math.PI / 2]));

// ---- lasers, wall lights and the floor ---------------------------------------------------------
// lasers from over the LED walls out over the DJ, and from both side walls across the room
for (const x of [-18, -6, 6, 18]) fixtures.push(fx('laser', [x, 12, ROOM.back + 4.4], aim(x * -0.01, -0.05, 1)));
// (under the LED sky: the lasers sweep between the crowd and the tiles)
for (const s of [-1, 1]) for (const z of [4, 20, 36]) fixtures.push(fx('laser', [s * (HALF - 0.7), 7, z], aim(-s, -0.08, 0.15)));
// pin spots on the mirror ball
for (const s of [-1, 1]) fixtures.push(fx('spot', [s * 9.8, GRID_Y - 0.1, BALL_Z], aim(-s, -0.14, 0)));
for (const s of [-1, 1]) {
    // vertical strobes and uplighting washes along the side walls
    for (const z of [-2.5, 3.8, 10.2, 16.8, 23.2, 29.8, 36.2, 42.8]) fixtures.push(turned(fx('strobe', [s * (HALF - 0.6), 5.6, z]), [0, 0, Math.PI / 2]));
    for (const z of [4, 14, 24, 34, 44]) fixtures.push(fx('wash', [s * (HALF - 1), 0.4, z], aim(-s * 0.15, 1, 0)));
}
// beams and strobes along the stage lip, blinders on the booth
for (const x of spread(-13, 13, 10)) fixtures.push(fx('beam', [x, D + 0.5, -4.6], aim(x * 0.025, 0.9, 0.5)));
for (const x of spread(-11, 11, 7)) fixtures.push(fx('strobe', [x, D + 0.25, -4.1]));
for (const x of [-2.6, -0.9, 0.9, 2.6]) fixtures.push(fx('blinder', [x, D + 1.3, -5.5]));
// a row of floor lights on the stage behind the booth, backlighting the DJ against the walls and fanning up
for (const x of spread(-10, 10, 14)) fixtures.push(fx('beam', [x, D + 0.15, -9.4], aim(x * 0.02, 1, 0.12)));

// ---- effects (no pyro and no shells indoors) --------------------------------------------------
for (const x of [-11, -4, 4, 11]) fixtures.push(fx('co2', [x, D + 0.3, -4.3]));
// (the grid's CO2 nozzles fire down through gaps in the LED sky: under the grid's fixture columns, between two tile rows)
for (const x of [XS[2], XS[4], XS[6], XS[8]]) fixtures.push(fx('co2', [x, GRID_Y - 0.4, 0.5]));
for (const [x, z] of [[-12, -10.5], [12, -10.5], [-(HALF - 1.5), 14], [HALF - 1.5, 14], [-(HALF - 1.5), 36], [HALF - 1.5, 36]]) fixtures.push(fx('haze', [x, 0.3, z]));

const layout = {
    key: 'warehouse',
    // (the grid's fixture columns and rows: the kinetic LED sky's tiles hang in between them)
    meta: { deck: D, room: ROOM, gridY: GRID_Y, gridXs: XS, gridZs: CROSS, wall: WALL, stageWidth: STAGE_W },
    title: 'Warehouse',
    subtitle: 'home of rap',
    structure,
    fixtures,
    ground: [ROOM.width, LENGTH + 40],
    groundZ: MID_Z,
    beamScale: 0.42,
    views: {
        audience: { label: 'Crowd', pos: [0, 1.9, 34], target: [0, 5, -8] },
        front: { label: 'From the back', pos: [0, 6, 54], target: [0, 5, -8] },
        quarter: { label: 'Three-quarter', pos: [-42, 36, 76], target: [0, 3, 14] },
        side: { label: 'DJ view', pos: [0, 3.4, -8.5], target: [0, 3.5, 20] },
        top: { label: 'Top', pos: [0, 92, 22.01], target: [0, 0, 22] },
    },
    notes: [
        'Room 56 m wide, 68 m long, 16 m high; stage 30 m wide and 1.1 m high',
        'Truss grid 13.5 m up: seven trusses across the room (11 fixtures each), three down its length; the kinetic LED sky hangs under it (about 8-11 m), its tiles between the grid fixtures',
        'Layered LED walls: 22 x 8.5 m behind the DJ, 8 x 10.5 m wings, 6 x 13 m outer wings stepping towards the crowd',
        'Lasers over the walls and on both side walls; a mirror ball mid-floor; floor lights behind the booth',
        'LED lines: three down the room, columns up both walls, frames round the wall and stage',
        'No fireworks, confetti or streamers indoors: CO2 (floor and grid) and haze',
        'Blue-grey = LED screen and strips; white = a person (1.8 m)',
    ],
};

export default layout;
