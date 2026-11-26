import { COLORS, aim, box, fx, rod, spread, truss, turned } from './blockoutKit.js';
import { bracketsFor } from './brackets.js';

// The warehouse, home of rap: an indoor arena in the style of the big indoor festival stages with a kinetic LED
// ceiling (an original StageVerse design, no festival's name or logo): a truss grid over the crowd with the kinetic
// LED sky hanging under it; one stage the full width of the hall with one large LED screen across it, a truss on top
// of the screen and a second flown over the DJ (beams on both, lasers on the second); tilting beam bars along the
// whole front of the stage (stage.extras); LED lines, lasers, strobes and haze. No fireworks indoors.
// (Made bigger for the kinetic LED sky, 2026-11-26: 56 m wide (first 38), 68 m long (58), 16 m high (9.5), the grid
// at 13.5 m (8), so the sky's tiles move between about 8 and 11 m, under the grid's fixtures and well over the crowd.)

const ROOM = { width: 56, back: -12, front: 56, height: 16 };
const HALF = ROOM.width / 2;
const D = 1.1;                         // a low stage
const GRID_Y = 13.5;                   // the truss grid, over the kinetic LED sky
const LENGTH = ROOM.front - ROOM.back;
const MID_Z = (ROOM.front + ROOM.back) / 2;
const STAGE_W = ROOM.width - 0.4;      // the stage: the hall's full width
const STAGE_FRONT = -3;                // its front edge (it runs back to the back wall)

const structure = [];
const fixtures = [];

// ---- the room ------------------------------------------------------------------------------------
structure.push(box([ROOM.width, ROOM.height, 0.4], [0, ROOM.height / 2, ROOM.back], COLORS.dark));
for (const s of [-1, 1]) structure.push(box([0.4, ROOM.height, LENGTH], [s * ROOM.width / 2, ROOM.height / 2, MID_Z], COLORS.dark));
// steel roof beams (the roof itself is left open so the top view can see in)
for (const z of spread(ROOM.back + 3, ROOM.front - 3, 10)) structure.push(box([ROOM.width, 0.35, 0.35], [0, ROOM.height, z], COLORS.scenery));
// the stage, the DJ booth and a person; a person in the crowd for scale
structure.push(box([STAGE_W, D, STAGE_FRONT - ROOM.back], [0, D / 2, (STAGE_FRONT + ROOM.back) / 2], COLORS.deck));
// (a low, wide booth: the DJ stands in front of the walls, not behind a desk)
structure.push(box([9, 1.1, 1.8], [0, D + 0.55, -6.5], COLORS.screen));
structure.push(box([0.5, 1.8, 0.3], [0, D + 0.9, -7.8], COLORS.person));
structure.push(box([0.5, 1.8, 0.3], [4, 0.9, 4], COLORS.person));
// one large LED screen across the back of the stage, a truss resting on top of it (beams standing on it, firing up and
// out over the crowd), and a second truss flown over the DJ from the roof (beams hanging under it, and the lasers)
const WALL = { width: 46, height: 9.5, bottom: D + 0.8 };
const WALL_TOP = WALL.bottom + WALL.height;
structure.push(box([WALL.width, WALL.height, 0.3], [0, WALL.bottom + WALL.height / 2, ROOM.back + 0.5], COLORS.screen, { ledWall: 'main' }));
const TOP_TRUSS = { y: WALL_TOP + 0.3, z: ROOM.back + 0.5 };
structure.push(truss([-(WALL.width / 2 + 0.5), TOP_TRUSS.y, TOP_TRUSS.z], [WALL.width / 2 + 0.5, TOP_TRUSS.y, TOP_TRUSS.z]));
const DJ_TRUSS = { y: 12.6, z: -7.5 };
structure.push(truss([-25, DJ_TRUSS.y, DJ_TRUSS.z], [25, DJ_TRUSS.y, DJ_TRUSS.z]));
for (const x of [-24, -12, 0, 12, 24]) structure.push(rod([x, DJ_TRUSS.y + 0.3, DJ_TRUSS.z], [x, ROOM.height, DJ_TRUSS.z], [0.04, 0.04]));
// (the ceiling's LED lines lie on the cross trusses)
for (const x of spread(-20, 20, 5)) structure.push(box([0.3, 0.15, 54], [x, GRID_Y + 0.82, 18], COLORS.screen));

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

// ---- LED lines: down the room, up the walls, round the stage (each row of bars is one continuous line on stage) ------
// along the three trusses that run the length of the room, so three lines of light race from the stage out over the crowd
for (const x of [-(HALF - 2), 0, HALF - 2]) for (const z of spread(-3.6, 37.2, 24)) fixtures.push(turned(fx('ledbar', [x, GRID_Y + 0.15, z]), [Math.PI / 2, 0, 0]));
// columns up both side walls, floor to grid, every 6.5 m
for (const s of [-1, 1]) for (const z of [-6, 0.5, 7, 13.5, 20, 26.5, 33, 39.5, 46]) for (const y of spread(1.1, GRID_Y - 0.9, 6)) fixtures.push(fx('ledbar', [s * (HALF - 0.4), y, z]));
// a line along the front edge of the stage (none round the screen)
for (const x of spread(-26.5, 26.5, 30)) fixtures.push(turned(fx('ledbar', [x, D - 0.3, STAGE_FRONT + 0.08]), [0, 0, Math.PI / 2]));

// ---- lasers, wall lights and the floor ---------------------------------------------------------
// the stage's two trusses: beams standing on the screen's truss and hanging under the DJ truss (all aimed out over the
// audience, never up: stage.headTune.aerial.aimDown), the lasers on the DJ truss
for (const x of spread(-22, 22, 12)) fixtures.push(fx('beam', [x, TOP_TRUSS.y + 0.45, TOP_TRUSS.z], aim(x * 0.01, -0.35, 1)));
for (const x of spread(-22, 22, 12)) fixtures.push(fx('beam', [x, DJ_TRUSS.y - 0.6, DJ_TRUSS.z], aim(x * 0.012, -1, 0.4)));
for (const x of [-16, -8, 8, 16]) fixtures.push(fx('laser', [x, DJ_TRUSS.y - 0.55, DJ_TRUSS.z], aim(x * -0.01, -0.05, 1)));
// (under the LED sky: the lasers sweep between the crowd and the tiles)
for (const s of [-1, 1]) for (const z of [4, 20, 36]) fixtures.push(fx('laser', [s * (HALF - 0.7), 7, z], aim(-s, -0.08, 0.15)));
for (const s of [-1, 1]) {
    // vertical strobes and uplighting washes along the side walls
    for (const z of [-2.5, 3.8, 10.2, 16.8, 23.2, 29.8, 36.2, 42.8]) fixtures.push(turned(fx('strobe', [s * (HALF - 0.6), 5.6, z]), [0, 0, Math.PI / 2]));
    for (const z of [4, 14, 24, 34, 44]) fixtures.push(fx('wash', [s * (HALF - 1), 0.4, z], aim(-s * 0.15, 1, 0)));
}
// strobes along the whole stage lip (no floor beams and no strobes on the booth: the tilting beam bars, stage.extras,
// stand along the front instead)
for (const x of spread(-24, 24, 11)) fixtures.push(fx('strobe', [x, D + 0.25, STAGE_FRONT - 0.35]));

// ---- effects (no pyro and no shells indoors) --------------------------------------------------
for (const x of [-24, -16, -8, 8, 16, 24]) fixtures.push(fx('co2', [x, D + 0.3, STAGE_FRONT - 0.7]));
// (the grid's CO2 nozzles on the second truss, between two fixtures, firing down through a gap in the LED sky)
const MID = XS.slice(1).map((x, i) => (x + XS[i]) / 2);
for (const x of [MID[1], MID[4], MID[5], MID[8]]) fixtures.push(fx('co2', [x, GRID_Y - 0.1, CROSS[1]]));
for (const [x, z] of [[-(HALF - 1.5), 14], [HALF - 1.5, 14], [-(HALF - 1.5), 36], [HALF - 1.5, 36]]) fixtures.push(fx('haze', [x, 0.3, z]));
for (const x of [-14, 14]) fixtures.push(fx('haze', [x, D + 0.3, -10.5]));

// every fixture standing off a surface gets a bracket to it: nothing floats
structure.push(...bracketsFor(fixtures, structure));

const layout = {
    key: 'warehouse',
    // (the grid's fixture columns and rows: the kinetic LED sky's tiles hang in between them)
    meta: { deck: D, room: ROOM, gridY: GRID_Y, gridXs: XS, gridZs: CROSS, wall: WALL, stageWidth: STAGE_W, stageFront: STAGE_FRONT },
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
        'Room 56 m wide, 68 m long, 16 m high; the stage the full width of the hall, 1.1 m high',
        'Truss grid 13.5 m up: seven trusses across the room (11 fixtures each), three down its length; the kinetic LED sky hangs under it (about 8-11 m), its tiles between the grid fixtures',
        'One LED screen 46 x 9.5 m; a truss on top of it and one flown over the DJ, beams on both; tilting beam bars along the stage front',
        'Lasers on the DJ truss and both side walls; every fixture on a truss, a wall or the deck',
        'LED lines: three down the room, columns up both walls, frames round the wall and stage',
        'No fireworks, confetti or streamers indoors: CO2 (floor and grid) and haze',
        'Blue-grey = LED screen and strips; white = a person (1.8 m)',
    ],
};

export default layout;
