import { COLORS, aim, box, fx, spread, truss, turned } from './blockoutKit.js';

// The warehouse, home of rap: an indoor hall with a low roof, a tight truss grid over the crowd, LED
// strips, lasers, strobes and haze. No fireworks indoors. A rough layout only.

const ROOM = { width: 38, back: -12, front: 46, height: 9.5 };
const D = 1.1;                         // a low stage
const GRID_Y = 8;                      // the truss grid, close over the crowd's heads
const LENGTH = ROOM.front - ROOM.back;
const MID_Z = (ROOM.front + ROOM.back) / 2;

const structure = [];
const fixtures = [];

// ---- the room ------------------------------------------------------------------------------------
structure.push(box([ROOM.width, ROOM.height, 0.4], [0, ROOM.height / 2, ROOM.back], COLORS.dark));
for (const s of [-1, 1]) structure.push(box([0.4, ROOM.height, LENGTH], [s * ROOM.width / 2, ROOM.height / 2, MID_Z], COLORS.dark));
// steel roof beams (the roof itself is left open so the top view can see in)
for (const z of spread(ROOM.back + 3, ROOM.front - 3, 8)) structure.push(box([ROOM.width, 0.35, 0.35], [0, ROOM.height, z], COLORS.scenery));
// the stage, the DJ booth and a person; a person in the crowd for scale
structure.push(box([22, D, 8], [0, D / 2, -8], COLORS.deck));
structure.push(box([7, 1.3, 1.8], [0, D + 0.65, -6.5], COLORS.screen));
structure.push(box([0.5, 1.8, 0.3], [0, D + 0.9, -7.8], COLORS.person));
structure.push(box([0.5, 1.8, 0.3], [4, 0.9, 4], COLORS.person));
structure.push(box([24, 1.1, 0.2], [0, 0.55, -2.4], COLORS.dark));
// the screens: a small wall behind the DJ, tall LED strips either side of it, LED lines down the ceiling
structure.push(box([12, 4.6, 0.3], [0, D + 1 + 2.3, ROOM.back + 0.5], COLORS.screen));
for (const s of [-1, 1]) for (const x of [8, 10.5, 13, 15.5]) structure.push(box([0.5, 7.4, 0.2], [s * x, 0.9 + 3.7, ROOM.back + 0.5], COLORS.screen));
for (const x of spread(-12, 12, 5)) structure.push(box([0.3, 0.15, 44], [x, GRID_Y + 0.9, 14], COLORS.screen));
// a mirror ball over the middle of the floor
structure.push({ kind: 'sphere', radius: 0.9, position: [0, GRID_Y - 1.4, 13], color: COLORS.structure });

// ---- the truss grid ------------------------------------------------------------------------------
const CROSS = [-4.5, 3, 10, 17, 24, 31];
const CYCLE = ['beam', 'strobe', 'beam', 'wash', 'beam', 'strobe', 'beam', 'wash', 'beam'];
CROSS.forEach((z, k) => {
    structure.push(truss([-17, GRID_Y + 0.5, z], [17, GRID_Y + 0.5, z]));
    spread(-15.5, 15.5, 9).forEach((x, i) => {
        // the first truss (over the stage front) lights the DJ; the rest point down into the crowd
        const type = k === 0 ? ['spot', 'blinder', 'beam', 'wash', 'spot', 'wash', 'beam', 'blinder', 'spot'][i] : CYCLE[(i + k) % CYCLE.length];
        fixtures.push(fx(type, [x, GRID_Y - 0.1, z], aim(x * 0.02, -1, k === 0 ? -0.6 : (k % 2 ? 0.35 : -0.35))));
    });
});
for (const x of [-17, 0, 17]) structure.push(truss([x, GRID_Y + 0.5, CROSS[0]], [x, GRID_Y + 0.5, CROSS.at(-1)]));
// ---- pixel bars: lines down the room, columns up the walls, frames round the stage ------------
// end to end along the three trusses that run the length of the room, so three lines of light race
// from the stage out over the crowd
for (const x of [-17, 0, 17]) for (const z of spread(-3.6, 30.2, 20)) fixtures.push(turned(fx('ledbar', [x, GRID_Y + 0.15, z]), [Math.PI / 2, 0, 0]));
// columns up both side walls, floor to grid, every 6.5 m
for (const s of [-1, 1]) for (const z of [-6, 0.5, 7, 13.5, 20, 26.5, 33]) for (const y of spread(1.1, 7.1, 4)) fixtures.push(fx('ledbar', [s * 18.6, y, z]));
// a frame round the LED wall, and a line along the front edge of the stage
for (const y of [D + 0.7, D + 5.9]) for (const x of spread(-5.2, 5.2, 7)) fixtures.push(turned(fx('ledbar', [x, y, ROOM.back + 0.8]), [0, 0, Math.PI / 2]));
for (const s of [-1, 1]) for (const y of spread(D + 1.7, D + 4.9, 3)) fixtures.push(fx('ledbar', [s * 6.3, y, ROOM.back + 0.8]));
for (const x of spread(-10, 10, 12)) fixtures.push(turned(fx('ledbar', [x, D - 0.3, -3.92]), [0, 0, Math.PI / 2]));

// ---- lasers, wall lights and the floor ---------------------------------------------------------
// lasers from the back wall over the DJ, and from both side walls across the room
for (const x of [-15, -5, 5, 15]) fixtures.push(fx('laser', [x, 7.2, ROOM.back + 0.8], aim(x * -0.01, -0.05, 1)));
for (const s of [-1, 1]) for (const z of [2, 14, 26]) fixtures.push(fx('laser', [s * 18.3, 6.8, z], aim(-s, -0.08, 0.15)));
// pin spots on the mirror ball
for (const s of [-1, 1]) fixtures.push(fx('spot', [s * 9, GRID_Y - 0.1, 13], aim(-s, -0.14, 0)));
for (const s of [-1, 1]) {
    // vertical strobes and uplighting washes along the side walls
    for (const z of [-2.5, 3.8, 10.2, 16.8, 23.2, 29.8]) fixtures.push(turned(fx('strobe', [s * 18.4, 4.5, z]), [0, 0, Math.PI / 2]));
    for (const z of [4, 14, 24, 34]) fixtures.push(fx('wash', [s * 18, 0.4, z], aim(-s * 0.15, 1, 0)));
}
// beams and strobes along the stage lip, blinders on the booth
for (const x of spread(-9.5, 9.5, 8)) fixtures.push(fx('beam', [x, D + 0.5, -4.6], aim(x * 0.03, 0.9, 0.5)));
for (const x of spread(-8, 8, 5)) fixtures.push(fx('strobe', [x, D + 0.25, -4.1]));
for (const x of [-2.6, -0.9, 0.9, 2.6]) fixtures.push(fx('blinder', [x, D + 1.5, -5.5]));

// ---- effects (no pyro and no shells indoors) --------------------------------------------------
for (const x of [-8, -3, 3, 8]) fixtures.push(fx('co2', [x, D + 0.3, -4.3]));
for (const x of [-11, -4, 4, 11]) fixtures.push(fx('co2', [x, GRID_Y - 0.4, 3.6]));
for (const [x, z] of [[-10, -10.5], [10, -10.5], [-17.5, 12], [17.5, 12], [-17.5, 30], [17.5, 30]]) fixtures.push(fx('haze', [x, 0.3, z]));

const layout = {
    key: 'warehouse',
    meta: { deck: D, room: ROOM, gridY: GRID_Y },
    title: 'Warehouse',
    subtitle: 'home of rap',
    structure,
    fixtures,
    ground: [ROOM.width, LENGTH + 40],
    groundZ: MID_Z,
    beamScale: 0.42,
    views: {
        audience: { label: 'Crowd', pos: [0, 1.9, 30], target: [0, 4.5, -8] },
        front: { label: 'From the back', pos: [0, 5, 45], target: [0, 4, -8] },
        quarter: { label: 'Three-quarter', pos: [-34, 30, 62], target: [0, 3, 10] },
        side: { label: 'DJ view', pos: [0, 3.4, -8.5], target: [0, 3.5, 20] },
        top: { label: 'Top', pos: [0, 78, 17.01], target: [0, 0, 17] },
    },
    notes: [
        'Room 38 m wide, 58 m long, 9.5 m high; stage 22 m wide and 1.1 m high',
        'Truss grid 8 m up: six trusses across the room, three down its length',
        'Lasers from the back wall and both side walls; a mirror ball mid-floor',
        'Pixel bars: three lines down the room, columns up both walls, frames round the wall and stage',
        'No fireworks, confetti or streamers indoors: CO2 (floor and grid) and haze',
        'Blue-grey = LED screen and strips; white = a person (1.8 m)',
    ],
};

export default layout;
