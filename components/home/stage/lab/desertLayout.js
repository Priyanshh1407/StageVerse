import { COLORS, aim, along, box, fx, spread, truss } from './blockoutKit.js';

// The desert live stage, home of pop and Bollywood: a wide black roof stage for a band, one big LED
// wall, two giant portrait side screens, in a desert festival ground. A rough layout only.

const D = 1.8;                         // deck height
const DECK = { width: 46, depth: 20 };
const ROOF_Y = D + 20;                 // underside of the roof
const WALL = { width: 32, height: 14, z: -18.5, bottom: D + 1.2 };

const structure = [];
const fixtures = [];

// ---- structure -------------------------------------------------------------------------------
structure.push(box([DECK.width, D, DECK.depth], [0, D / 2, -DECK.depth / 2], COLORS.deck));
structure.push(box([WALL.width, WALL.height, 0.5], [0, WALL.bottom + WALL.height / 2, WALL.z], COLORS.screen));
// the roof: a clean black slab on four legs, with a deep black header across its front
structure.push(box([52, 1.6, 24], [0, ROOF_Y + 0.8, -10], COLORS.dark));
structure.push(box([52, 2.6, 0.6], [0, ROOF_Y - 1.3, 1.7], COLORS.dark));
for (const s of [-1, 1]) for (const z of [0, -19]) structure.push(box([2.2, ROOF_Y, 2.2], [s * 24.5, ROOF_Y / 2, z], COLORS.dark));
// the giant portrait side screens, turned a little towards the crowd
for (const s of [-1, 1]) structure.push(box([11, 18, 0.6], [s * 34, 3 + 9, 1], COLORS.screen, { rotation: [0, -s * 0.22, 0] }));
// PA, flown between the stage and the side screens
for (const s of [-1, 1]) structure.push(box([1.6, 10, 1.4], [s * 27.2, 14, 2.5], COLORS.dark));
// the band: a drum riser, a keys riser, five people
structure.push(box([6, 0.7, 4.5], [0, D + 0.35, -12], COLORS.booth));
structure.push(box([4, 0.5, 3], [-11, D + 0.25, -10], COLORS.booth));
for (const [x, z, lift] of [[0, -4, 0], [-6, -6, 0], [6, -6, 0], [0, -12, 0.7], [-11, -10, 0.5]]) structure.push(box([0.5, 1.8, 0.3], [x, D + lift + 0.9, z], COLORS.person));
// the crowd barrier, a person at it, and a front-of-house tower for the follow spots
structure.push(box([70, 1.2, 0.2], [0, 0.6, 6], COLORS.dark));
structure.push(box([0.5, 1.8, 0.3], [6, 0.9, 7], COLORS.person));
structure.push(box([6, 6, 5], [0, 3, 46], COLORS.dark));
// the desert around it: palm trees, mountains on the horizon, a ferris wheel
for (const [x, z, h] of [[-48, 4, 13], [-56, -8, 16], [-62, 12, 11], [48, 4, 14], [57, -10, 12], [64, 10, 16], [-44, -30, 15], [46, -32, 13]]) {
    structure.push({ kind: 'cylinder', radius: [0.3, 0.45], height: h, position: [x, h / 2, z], color: COLORS.scenery });
    structure.push({ kind: 'sphere', radius: 2.6, position: [x, h + 0.8, z], color: COLORS.scenery, scale: [1.4, 0.45, 1.4] });
}
for (const [x, r, h] of [[-90, 60, 34], [-20, 75, 42], [60, 65, 30], [130, 70, 38]]) structure.push({ kind: 'cone', radius: r, height: h, position: [x, h / 2, -190], color: COLORS.scenery });
structure.push({ kind: 'torus', radius: 15, tube: 0.5, position: [78, 19, -70], color: COLORS.truss });
structure.push(box([1, 19, 1], [78, 9.5, -70], COLORS.truss));

// ---- the roof rig: four straight trusses, each with its own job -------------------------------
const ROWS = [
    // the front truss lights the band's faces and blinds the crowd
    { z: -1, y: ROOF_Y - 1.6, cycle: ['spot', 'blinder', 'spot', 'wash', 'spot', 'blinder', 'spot'], dir: (x) => aim(x * -0.02, -1, -0.5) },
    { z: -6.5, y: ROOF_Y - 1.2, cycle: ['beam', 'wash', 'beam', 'strobe', 'beam', 'wash', 'beam'], dir: (x) => aim(x * 0.03, -1, 0.45) },
    { z: -12, y: ROOF_Y - 1.2, cycle: ['beam', 'strobe', 'beam', 'wash', 'beam', 'strobe', 'beam'], dir: (x) => aim(x * 0.03, -1, 0.6) },
    // the rear truss throws beams over the band into the crowd
    { z: -17.5, y: ROOF_Y - 1.2, cycle: ['beam', 'beam', 'ledbar', 'beam', 'strobe', 'beam', 'ledbar'], dir: (x) => aim(x * 0.035, -0.8, 1) },
];
for (const row of ROWS) {
    structure.push(truss([-21, row.y + 0.6, row.z], [21, row.y + 0.6, row.z]));
    spread(-20, 20, 16).forEach((x, i) => fixtures.push(fx(row.cycle[i % row.cycle.length], [x, row.y, row.z], row.dir(x))));
}
// two short trusses running front to back join the rows into a grid and carry washes
for (const s of [-1, 1]) {
    structure.push(truss([s * 10.5, ROOF_Y - 0.6, -1], [s * 10.5, ROOF_Y - 0.6, -17.5]));
    along([s * 10.5, ROOF_Y - 1.2, -1], [s * 10.5, ROOF_Y - 1.2, -17.5], 4, 0.18).forEach((p) => fixtures.push(fx('wash', p, aim(-s * 0.2, -1, 0.2))));
}

// ---- the side towers -----------------------------------------------------------------------------
for (const s of [-1, 1]) {
    // three ladders of beams up each side of the stage, a strobe on top of each
    for (const z of [-3.5, -9.5, -15.5]) {
        structure.push(truss([s * 22.6, D, z], [s * 22.6, ROOF_Y - 1.6, z]));
        for (const y of spread(3, 16, 6)) fixtures.push(fx('beam', [s * 22, D + y, z], aim(-s * 0.9, 0.25 - y * 0.03, 0.55)));
        fixtures.push(fx('strobe', [s * 22, D + 17.8, z]));
    }
    // lasers half-way up, and pixel bars down the front legs
    for (const y of [9, 14]) fixtures.push(fx('laser', [s * 22, D + y, -1], aim(-s * 0.7, 0.2, 0.7)));
    for (const y of spread(4, 17, 5)) fixtures.push(fx('ledbar', [s * 23.3, y, 1.3]));
    // strobes and washes framing the side screens
    for (const x of [-4, 0, 4]) fixtures.push(fx('strobe', [s * 34 + x, 21.6, 1.4]));
    for (const x of [-4.5, 4.5]) fixtures.push(fx('wash', [s * 34 + x, 2.4, 2.4], aim(0, 1, -0.05)));
}

// ---- the floor -----------------------------------------------------------------------------------
// beams on the floor behind the band, pixel bars under the wall, washes and lasers on the front lip
for (const x of spread(-17, 17, 12)) fixtures.push(fx('beam', [x, D + 0.5, -16.5], aim(x * 0.03, 1, 0.35)));
for (const x of spread(-14, 14, 8)) fixtures.push(fx('ledbar', [x, D + 0.9, -17.9]));
for (const x of spread(-19, 19, 8)) fixtures.push(fx('wash', [x, D + 0.4, -1.2], aim(0, 0.8, -0.6)));
for (const x of [-16, -6, 6, 16]) fixtures.push(fx('laser', [x, D + 0.3, -0.8], aim(x * 0.02, 0.9, 0.3)));
for (const x of spread(-3, 3, 4)) fixtures.push(fx('blinder', [x, D + 0.9, -9.6]));
// follow spots from the front-of-house tower
for (const x of [-2, 2]) fixtures.push(fx('spot', [x, 6.6, 46], aim(-x * 0.02, -0.04, -1)));

// ---- effects -------------------------------------------------------------------------------------
for (const x of spread(-18, 18, 6)) fixtures.push(fx('co2', [x, D + 0.3, -0.6]));
for (const x of [-15, -5, 5, 15]) fixtures.push(fx('co2', [x, ROOF_Y - 2.9, 2.2]));
for (const x of [-26, -9, 9, 26]) fixtures.push(fx('confetti', [x, 0.4, 3]));
for (const x of [-16, 0, 16]) fixtures.push(fx('streamer', [x, ROOF_Y + 0.3, 2]));
for (const x of spread(-22, 22, 8)) fixtures.push(fx('pyro', [x, ROOF_Y + 1.8, -2]));
for (const x of spread(-16, 16, 6)) fixtures.push(fx('pyro', [x, D + 0.2, -0.2]));
for (const x of spread(-24, 24, 10)) fixtures.push(fx('shell', [x, 0.5, -30]));
for (const x of [-20, -7, 7, 20]) fixtures.push(fx('haze', [x, D + 0.3, -15]));

const layout = {
    key: 'desert',
    title: 'Desert live stage',
    subtitle: 'home of pop and Bollywood',
    structure,
    fixtures,
    ground: [420, 420],
    views: {
        audience: { label: 'Audience', pos: [0, 2.2, 44], target: [0, 11, -8] },
        front: { label: 'Front', pos: [0, 13, 84], target: [0, 11, -8] },
        quarter: { label: 'Three-quarter', pos: [-58, 17, 50], target: [0, 9, -8] },
        side: { label: 'Side', pos: [95, 11, -8], target: [0, 10, -8] },
        top: { label: 'Top', pos: [0, 115, 0.01], target: [0, 0, -6] },
    },
    notes: [
        'Stage 46 m wide, 20 m deep, roof 22 m up; about 80 m across with the side screens',
        'Roof rig: four trusses (front lights the band, rear throws beams into the crowd)',
        'Three ladders of beams up each side; follow spots from the tower in the crowd',
        'Palms, mountains and a ferris wheel around it (scenery, no lights)',
        'Blue-grey = LED screen; white = a person (1.8 m)',
    ],
};

export default layout;
