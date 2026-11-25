import { COLORS, aim, along, box, fx, rod, spread, truss, turned } from './blockoutKit.js';

// The desert live stage, home of pop and Bollywood: a wide black roof stage for a band, one big LED
// wall, two giant portrait side screens, in a desert festival ground. A rough layout only.

const D = 1.8;                         // deck height
// the two lasers on each front leg's inner face (metres above the deck), a CO2 nozzle half-way between them
const TOWER_LASERS = [2.8, 7.6];
const DECK = { width: 46, depth: 20 };
const ROOF_Y = D + 20;                 // underside of the roof
// the side screens' centre line: out past the line arrays (they hang between the stage's legs and the screens)
const SCREEN_X = 35.5;
const WALL = { width: 46.6, height: ROOF_Y - D, z: -18.5, bottom: D };   // fills the whole opening

const structure = [];
const fixtures = [];

// ---- structure -------------------------------------------------------------------------------
structure.push(box([DECK.width, D, DECK.depth], [0, D / 2, -DECK.depth / 2], COLORS.deck));
structure.push(box([WALL.width, WALL.height, 0.5], [0, WALL.bottom + WALL.height / 2, WALL.z], COLORS.screen, { ledWall: 'main' }));
// the roof: a clean black slab on four legs, with a deep black header across its front
structure.push(box([52, 1.6, 24], [0, ROOF_Y + 0.8, -10], COLORS.dark));
structure.push(box([52, 2.6, 0.6], [0, ROOF_Y - 1.3, 1.7], COLORS.dark));
for (const s of [-1, 1]) for (const z of [0, -19]) structure.push(box([2.2, ROOF_Y, 2.2], [s * 24.5, ROOF_Y / 2, z], COLORS.dark));
// the giant portrait side screens, turned a little towards the crowd
for (const s of [-1, 1]) structure.push(box([11, 18, 0.6], [s * SCREEN_X, 3 + 9, 1], COLORS.screen, { ledWall: s < 0 ? 'left' : 'right' }));
// each screen stands on two legs, with a plinth in front for the moving heads at its foot
for (const s of [-1, 1]) {
    for (const e of [-4.5, 4.5]) structure.push(box([0.6, 3, 0.6], [s * SCREEN_X + e, 1.5, 1], COLORS.dark));
    structure.push(box([11, 2.4, 1.8], [s * SCREEN_X, 1.2, 2.4], COLORS.dark));
}
// PA, flown between the stage and the side screens
for (const s of [-1, 1]) structure.push(box([1.6, 10, 1.4], [s * 27.2, 14, 2.5], COLORS.dark, { drawnBy: 'pa' }));
// the band: a drum riser, a keys riser, five people
structure.push(box([6, 0.7, 4.5], [0, D + 0.35, -12], COLORS.booth));
structure.push(box([4, 0.5, 3], [-11, D + 0.25, -10], COLORS.booth));
for (const [x, z, lift] of [[0, -4, 0], [-6, -6, 0], [6, -6, 0], [0, -12, 0.7], [-11, -10, 0.5]]) structure.push(box([0.5, 1.8, 0.3], [x, D + lift + 0.9, z], COLORS.person));
// the crowd barrier, a person at it, and a front-of-house tower for the follow spots
structure.push(box([70, 1.2, 0.2], [0, 0.6, 3.2], COLORS.dark, { drawnBy: 'barrier' }));
structure.push(box([0.5, 1.8, 0.3], [6, 0.9, 7], COLORS.person));
// (off the centre line, so it never stands between the crowd's cameras and the stage)
structure.push(box([6, 6, 5], [-27, 3, 34], COLORS.dark));
// the desert around it: palm trees, mountains on the horizon, a ferris wheel
for (const [x, z, h] of [[-48, 4, 13], [-56, -8, 16], [-62, 12, 11], [48, 4, 14], [57, -10, 12], [64, 10, 16], [-44, -30, 15], [46, -32, 13]]) {
    structure.push({ kind: 'cylinder', radius: [0.3, 0.45], height: h, position: [x, h / 2, z], color: COLORS.scenery });
    // nine fronds arching out from the crown and drooping at their tips
    for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2 + x;
        const top = [x, h + 0.2, z];
        const mid = [x + Math.cos(a) * 2.2, h + 0.9, z + Math.sin(a) * 2.2];
        structure.push(rod(top, mid, [0.32, 0.22]), rod(mid, [x + Math.cos(a) * 4.3, h - 1.1, z + Math.sin(a) * 4.3], [0.22, 0.04]));
    }
}
for (const [x, r, h] of [[-90, 60, 34], [-20, 75, 42], [60, 65, 30], [130, 70, 38]]) structure.push({ kind: 'cone', radius: r, height: h, position: [x, h / 2, -190], color: COLORS.scenery });
structure.push({ kind: 'torus', radius: 15, tube: 0.5, position: [78, 19, -70], color: COLORS.truss });
structure.push(box([1, 19, 1], [78, 9.5, -70], COLORS.truss));

// ---- the roof rig: four straight trusses, each with its own job -------------------------------
const ROWS = [
    // the front truss lights the band's faces and blinds the crowd
    { z: -1, y: ROOF_Y - 1.6, cycle: ['spot', 'blinder', 'spot', 'wash', 'spot', 'blinder', 'spot'], dir: (x) => aim(x * -0.02, -1, -0.42), reach: 19 },
    { z: -6.5, y: ROOF_Y - 1.2, cycle: ['beam', 'wash', 'beam', 'strobe', 'beam', 'wash', 'beam'], dir: (x) => aim(x * 0.01, -0.38, 1), washDir: (x) => aim(x * -0.01, -1, 0.1), reach: 46, washReach: 18 },
    { z: -12, y: ROOF_Y - 1.2, cycle: ['beam', 'strobe', 'beam', 'wash', 'beam', 'strobe', 'beam'], dir: (x) => aim(x * 0.01, -0.32, 1), washDir: (x) => aim(x * -0.01, -1, 0.15), reach: 50, washReach: 18 },
    // the rear truss throws beams over the band into the crowd
    { z: -17.5, y: ROOF_Y - 1.2, cycle: ['beam', 'beam', 'strobe', 'beam', 'beam', 'strobe', 'beam'], dir: (x) => aim(x * 0.008, -0.27, 1), reach: 54 },
];
// (the truss sits right on top of its fixtures, which hang from its underside: truss 0.5 m deep, centre 0.25 m up;
// drop pipes hang it from the roof)
const dropPipes = (y, z, xs) => xs.forEach((x) => structure.push(rod([x, y + 0.5, z], [x, ROOF_Y, z], [0.07, 0.07])));
for (const row of ROWS) {
    structure.push(truss([-21, row.y + 0.25, row.z], [21, row.y + 0.25, row.z]));
    dropPipes(row.y, row.z, [-20, -10, 0, 10, 20]);
    spread(-20, 20, 16).forEach((x, i) => {
        const type = row.cycle[i % row.cycle.length];
        const wash = type === 'wash' && row.washDir;
        fixtures.push(fx(type, [x, row.y, row.z], wash ? row.washDir(x) : row.dir(x), wash ? row.washReach : row.reach));
    });
}
// two short trusses running front to back join the rows into a grid and carry washes
for (const s of [-1, 1]) {
    structure.push(truss([s * 10.5, ROOF_Y - 0.95, -1], [s * 10.5, ROOF_Y - 0.95, -17.5]));
    dropPipes(ROOF_Y - 1.2, -9.25, [s * 10.5]);
    along([s * 10.5, ROOF_Y - 1.2, -1], [s * 10.5, ROOF_Y - 1.2, -17.5], 4, 0.18).forEach((p) => fixtures.push(fx('wash', p, aim(-s * 0.2, -1, 0.2), 18)));
}

// ---- the side towers -----------------------------------------------------------------------------
for (const s of [-1, 1]) {
    // three ladders of beams up each side of the stage, a strobe on top of each
    for (const z of [-3.5, -9.5, -15.5]) {
        structure.push(truss([s * 22.6, D, z], [s * 22.6, ROOF_Y - 1.6, z]));
        // (on the truss's front face, not beside it)
        for (const y of spread(3, 16, 6)) fixtures.push(fx('beam', [s * 22.6, D + y, z + 0.3], aim(-s * 0.3, (y - 9) * 0.006 - 0.02, 1), 44));
        fixtures.push(turned(fx('strobe', [s * 22.6, D + 17.2, z + 0.4]), [0, 0, Math.PI / 2]));
        // and two more half-way up, stood on end
        for (const y of [6.9, 12.1]) fixtures.push(turned(fx('strobe', [s * 22.6, D + y, z + 0.4]), [0, 0, Math.PI / 2]));
    }
    // lasers on the front leg's inner face, a CO2 nozzle between them (index.js co2Extra)
    for (const y of TOWER_LASERS) fixtures.push(fx('laser', [s * 23.15, D + y, -1], aim(-s * 0.45, 0.05, 1)));
    // strobes and washes framing the side screens
    for (const x of [-4, 0, 4]) fixtures.push(fx('strobe', [s * SCREEN_X + x, 22.2, 1.4]));
    // blinders up the front legs, facing the crowd
    for (const y of [6, 10, 14]) fixtures.push(fx('blinder', [s * 24.5, y, 1.35]));
    // moving heads along the bottom of each side screen, firing up and out over the crowd
    // turned like the outermost beam of the main floor row on their side (x = 20), so they move with it in every
    // cue, and a little steeper (about 52 degrees up, the row about 34): far out to the side, perspective made the
    // same angle look lower and slanted from the crowd
    // (standing on a black plinth in front of the screen, which stands on two legs)
    for (const x of [-4.5, -1.5, 1.5, 4.5]) { const from = [s * SCREEN_X + x, 2.4, 2.4]; fixtures.push(fx('beam', from, aim(-s * 20 * 0.012, 1.3, 1), 42)); }
    // a column of beams up each edge of the side screen, on its own truss, firing out over the crowd
    for (const e of [-1, 1]) {
        const x = s * SCREEN_X + e * 6.4;
        structure.push(truss([x, 0, 1], [x, 21.6, 1]));
        for (const y of spread(4.5, 19.5, 6)) fixtures.push(fx('beam', [x, y, 1.3], aim(-s * (e * s > 0 ? 0.1 : 0.3), 0.05 + (y - 12) * 0.004, 1), 44));
    }
}

// ---- the floor -----------------------------------------------------------------------------------
// a row of beams along the front of the deck, between the lip washes, fanning up and out over the crowd
// (standing on the deck: a fixture's position is where its base sits)
for (const x of spread(-20, 20, 12)) fixtures.push(fx('beam', [x, D, -2.4], aim(-x * 0.012, 0.7, 1), 42));
// more beams on the floor behind the band; washes and lasers on the front lip
// (turned a little in towards the middle of the crowd: fanned out, they were thrown off to the sides)
for (const x of spread(-17, 17, 12)) fixtures.push(fx('beam', [x, D, -16.5], aim(-x * 0.012, 0.55, 1), 46));
for (const x of spread(-19, 19, 6)) fixtures.push(fx('wash', [x, D, -1.2], aim(0, 0.45, -1), 12));
for (const x of [-16, -6, 6, 16]) fixtures.push(fx('laser', [x, D + 0.3, -0.8], aim(x * 0.03, 0.55, 1)));
for (const x of spread(-3, 3, 4)) fixtures.push(fx('blinder', [x, D + 0.3, -9.6]));
// follow spots from the front-of-house tower
for (const x of [-29, -25]) fixtures.push(fx('spot', [x, 6.6, 34], aim(-x, -3.6, -40), 52));

// ---- blinders and strobes across the roof header, facing the crowd ------------------------------
spread(-22, 22, 23).forEach((x, i) => fixtures.push(fx(i % 2 ? 'strobe' : 'blinder', [x, ROOF_Y - 1.3, 2.1])));

// ---- pixel bars: clean unbroken lines that draw the stage's shape -------------------------------
const flat = (pos) => turned(fx('ledbar', pos), [0, 0, Math.PI / 2]);   // a bar lying along x
// the proscenium: along the bottom edge of the roof header and down the front of both front legs
for (const x of spread(-23.3, 23.3, 28)) fixtures.push(flat([x, ROOF_Y - 2.75, 2.05]));
for (const s of [-1, 1]) for (const y of spread(1, ROOF_Y - 3.6, 11)) fixtures.push(fx('ledbar', [s * 24.5, y, 1.2]));
// a frame round each side screen
for (const s of [-1, 1]) {
    for (const y of [2.6, 21.4]) for (const x of spread(-4.6, 4.6, 6)) fixtures.push(flat([s * SCREEN_X + x, y, 1.6]));
    for (const edge of [-5.8, 5.8]) for (const y of spread(3.6, 20.4, 10)) fixtures.push(fx('ledbar', [s * SCREEN_X + edge, y, 1.6]));
}

// ---- effects -------------------------------------------------------------------------------------
for (const x of spread(-18, 18, 6)) fixtures.push(fx('co2', [x, D + 0.3, -0.6]));
for (const x of [-15, -5, 5, 15]) fixtures.push(fx('co2', [x, ROOF_Y - 2.9, 2.2]));
// two sets of four confetti cannons along the front, each set spanning the stage (they fire together: stage.moreEffects)
for (const x of [-34, -26, -17.5, -9, 9, 17.5, 26, 34]) fixtures.push(fx('confetti', [x, 0.4, 3]));
for (const x of [-16, 0, 16]) fixtures.push(fx('streamer', [x, ROOF_Y + 0.3, 2]));
for (const x of spread(-22, 22, 8)) fixtures.push(fx('pyro', [x, ROOF_Y + 1.8, -2]));
for (const x of spread(-16, 16, 6)) fixtures.push(fx('pyro', [x, D + 0.2, -0.2]));
for (const x of spread(-24, 24, 10)) fixtures.push(fx('shell', [x, 0.5, -30]));
for (const x of [-20, -7, 7, 20]) fixtures.push(fx('haze', [x, D + 0.3, -15]));

const layout = {
    key: 'desert',
    meta: { deck: D, deckSize: DECK, wall: WALL, roofY: ROOF_Y, towerLasers: TOWER_LASERS },
    title: 'Desert live stage',
    subtitle: 'home of pop and Bollywood',
    structure,
    fixtures,
    ground: [420, 420],
    views: {
        audience: { label: 'Audience', pos: [0, 2.2, 36], target: [0, 11, -8] },
        front: { label: 'Front', pos: [0, 13, 84], target: [0, 11, -8] },
        quarter: { label: 'Three-quarter', pos: [-58, 17, 50], target: [0, 9, -8] },
        side: { label: 'Side', pos: [95, 11, -8], target: [0, 10, -8] },
        top: { label: 'Top', pos: [0, 115, 0.01], target: [0, 0, -6] },
    },
    notes: [
        'Stage 46 m wide, 20 m deep, roof 22 m up; about 80 m across with the side screens',
        'Roof rig: four trusses (front lights the band, rear throws beams into the crowd)',
        'Three ladders of beams up each side; follow spots from the tower in the crowd',
        'Pixel bars outline the roof opening, the LED wall and both side screens',
        'Blinders and strobes across the roof header; floor beams front and back',
        'Palms, mountains and a ferris wheel around it (scenery, no lights)',
        'Blue-grey = LED screen; white = a person (1.8 m)',
    ],
};

export default layout;
