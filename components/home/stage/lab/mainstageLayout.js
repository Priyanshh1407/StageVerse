import { COLORS, aim, along, box, fx, panel, spread, truss } from './blockoutKit.js';

// The mainstage (design E, "winged fins"), home of EDM. A rough layout: the structure, and where
// every light and effect would go. Nothing here is used by the homepage.

const D = 1.8;                       // deck height
const DECK = { width: 100, depth: 30 };
const WALL = { bottomHalf: 15.2, topHalf: 16.7, height: 19.7, z: -28 };
const FIN_COUNT = 6;
const FIN_WIDTH = 2.9;
const FIN_STEP_Z = 3.2;              // each fin stands this much further forward than the one inside it

/** Fin i (1 = next to the wall … 6 = outermost) on side s (-1 left, 1 right). */
function fin(i, s) {
    const x = 16.5 + (i - 1) * 4.6;
    const height = 22.4 - (i - 1) * 2.7;
    const lean = 1.0 + i * 0.9;
    const w = FIN_WIDTH / 2;
    // base, base, outer shoulder, tip, inner shoulder (where the inner edge starts running straight down)
    const outline = [[x - w, 0], [x + w, 0], [x + w + lean, 0.8 * height], [x + 1.3 * lean, height], [x - w + 0.85 * lean, 0.88 * height]].map(([px, py]) => [s * px, py]);
    return { i, s, x: s * x, lean: s * lean, height, outline, z: WALL.z + 1 + (i - 1) * FIN_STEP_Z };
}
const FINS = [-1, 1].flatMap((s) => Array.from({ length: FIN_COUNT }, (_, k) => fin(k + 1, s)));

const structure = [];
const fixtures = [];

// ---- structure -------------------------------------------------------------------------------
structure.push(box([DECK.width, D, DECK.depth], [0, D / 2, -DECK.depth / 2], COLORS.deck));
// the back LED wall, down to the stage floor
structure.push(panel([[-WALL.bottomHalf, 0], [WALL.bottomHalf, 0], [WALL.topHalf, WALL.height], [-WALL.topHalf, WALL.height]], WALL.z, COLORS.screen, 0.5, D));
// the crown: the upper band of a wide triangle across the whole wall, with the logo under it
const CROWN = { rise: 6, band: 2.3, innerHalf: 13.2 };
structure.push(panel([[-WALL.topHalf, WALL.height], [0, WALL.height + CROWN.rise], [WALL.topHalf, WALL.height], [CROWN.innerHalf, WALL.height], [0, WALL.height + CROWN.rise - CROWN.band], [-CROWN.innerHalf, WALL.height]], WALL.z + 0.4, COLORS.screen, 0.8, D));
structure.push(box([9, 1.5, 0.3], [0, D + WALL.height + 1.05, WALL.z + 0.9], COLORS.logo));
// the fins: every one its own LED screen
for (const f of FINS) structure.push(panel(f.outline, f.z, COLORS.screen, 0.7, D));
// the DJ riser and booth (LED front)
structure.push(box([16, 1, 6], [0, D + 0.5, -13], COLORS.dark));
structure.push(box([11, 1.5, 2.2], [0, D + 1.75, -11.5], COLORS.screen));
structure.push(box([0.5, 1.8, 0.3], [0, D + 1.9, -13], COLORS.person));
// PA, flown outside the wings
for (const s of [-1, 1]) structure.push(box([1.6, 10, 1.4], [s * 47, 13, -4], COLORS.dark));
// the crowd barrier and a person at it, for scale
structure.push(box([92, 1.2, 0.2], [0, 0.6, 6], COLORS.dark));
structure.push(box([0.5, 1.8, 0.3], [6, 0.9, 7], COLORS.person));

// ---- the aerial rig: three flown chevrons -----------------------------------------------------
// Not one bar on top of the screen: three arrow-shaped trusses that repeat the crown, each one
// wider, lower and further forward than the last, so from the crowd they stack into a tunnel of
// arrows over the DJ. (Flown from a ground-support grid hidden behind the fins.)
const CHEVRONS = [
    { z: -22, half: 19, endY: D + 20, rise: 7.5, perArm: 7 },
    { z: -15, half: 24, endY: D + 18.5, rise: 7.5, perArm: 8 },
    { z: -8, half: 29, endY: D + 17, rise: 7.5, perArm: 9 },
];
const ARM = ['beam', 'beam', 'wash', 'beam', 'strobe', 'beam', 'wash', 'beam', 'beam'];
CHEVRONS.forEach((c, k) => {
    for (const s of [-1, 1]) {
        const end = [s * c.half, c.endY, c.z - 2.5];
        const apex = [0, c.endY + c.rise, c.z];
        structure.push(truss(end, apex));
        along(end, apex, c.perArm, 0.06).forEach((p, j) => {
            const type = ARM[(j + k) % ARM.length];
            fixtures.push(fx(type, [p[0], p[1] - 0.6, p[2]], aim(p[0] * 0.035, -1, 0.55 + 0.1 * k)));
        });
    }
    fixtures.push(fx('spot', [0, c.endY + c.rise - 0.7, c.z], aim(0, -1, 0.35)));
});
// the front chevron also carries the truss CO2 and the streamer launchers
along([-CHEVRONS[2].half, CHEVRONS[2].endY, -10.5], [0, CHEVRONS[2].endY + 7.5, -8], 2, 0.3).forEach((p) => {
    for (const s of [-1, 1]) fixtures.push(fx('co2', [s * Math.abs(p[0]), p[1] + 0.5, p[2] + 0.6]));
});
for (const x of [-24, -12, 0, 12, 24]) fixtures.push(fx('streamer', [x, CHEVRONS[2].endY + 7.5 * (1 - Math.abs(x) / 29) + 0.6, -8 - 2.5 * (Math.abs(x) / 29)]));

// ---- lights on the structure -------------------------------------------------------------------
for (const s of [-1, 1]) {
    // a ladder of lights standing in every gap between two fins, from the floor up to the shoulder of
    // the shorter fin (as tall as the screens beside it): beams with a wash every third, a strobe on top
    for (let k = 1; k < FIN_COUNT; k++) {
        const a = fin(k, s);
        const b = fin(k + 1, s);
        const x = (a.x + b.x) / 2 + s * 0.6;
        const z = (a.z + b.z) / 2;
        const top = 0.88 * b.height;
        const n = Math.floor(top / 2.3);
        structure.push(truss([x, D, z], [x + s * 0.12 * top, D + top, z]));
        for (let j = 0; j < n; j++) {
            const y = 1.3 + j * 2.3;
            const type = j === n - 1 ? 'strobe' : j % 3 === 2 ? 'wash' : 'beam';
            fixtures.push(fx(type, [x + s * 0.12 * y, D + y, z + 0.5], aim(s * (0.25 + 0.07 * k), 0.75 - 0.05 * j, 0.6)));
        }
    }
}
for (const f of FINS) {
    const tip = [f.x + 1.3 * f.lean, D + f.height, f.z];
    // a laser on every fin tip, firing up and out
    fixtures.push(fx('laser', [tip[0], tip[1] + 0.2, tip[2]], aim(f.s * (0.2 + 0.09 * f.i), 0.8, 0.5)));
    // pyro on every fin's outer shoulder (the comets and candles fire from here)
    fixtures.push(fx('pyro', [f.x + f.s * FIN_WIDTH / 2 + f.lean, D + 0.8 * f.height + 0.3, f.z]));
    // a wash at the foot of every fin, lighting it from below when its screen is dark
    fixtures.push(fx('wash', [f.x, D + 0.4, f.z + 1.6], aim(f.lean * 0.05, 1, -0.12)));
    // pixel bars up the inner edge of every fin
    for (const t of [0.2, 0.42, 0.64]) fixtures.push(fx('ledbar', [f.x - f.s * FIN_WIDTH / 2 + 0.85 * f.lean * (t / 0.88), D + t * f.height, f.z + 0.5]));
}
// spots along the top of the wall, under the crown (the key light on the DJ and the front washes)
for (const x of spread(-14, 14, 10)) fixtures.push(fx('spot', [x, D + WALL.height - 0.6, WALL.z + 0.9], aim(x * -0.02, -0.55, 1)));
// strobes along the crown, and two lasers at its peak
for (const s of [-1, 1]) {
    along([s * WALL.topHalf, D + WALL.height + 0.3, WALL.z + 1], [0, D + WALL.height + CROWN.rise + 0.3, WALL.z + 1], 6, 0.1).forEach((p) => fixtures.push(fx('strobe', p)));
    fixtures.push(fx('laser', [s * 0.8, D + WALL.height + CROWN.rise + 0.5, WALL.z + 1], aim(s * 0.25, 0.3, 1)));
}

// ---- the floor ---------------------------------------------------------------------------------
// a row of beams along the deck's front, strobes on its lip, lasers between them
for (const x of spread(-36, 36, 18)) fixtures.push(fx('beam', [x, D + 0.5, -1.8], aim(x * 0.012, 1, -0.25)));
for (const x of spread(-33, 33, 10)) fixtures.push(fx('strobe', [x, D + 0.25, -0.5]));
for (const x of [-30, -18, -6, 6, 18, 30]) fixtures.push(fx('laser', [x, D + 0.3, -1], aim(x * 0.01, 0.9, 0.35)));
// blinders across the DJ booth, and beams fanning up from behind it
for (const x of spread(-4.5, 4.5, 6)) fixtures.push(fx('blinder', [x, D + 1.8, -10.3]));
for (const x of spread(-13, 13, 8)) fixtures.push(fx('beam', [x, D + 0.5, -24], aim(x * 0.03, 1, 0.1)));
// washes up the PA towers
for (const s of [-1, 1]) for (const y of [4, 8, 12, 16]) fixtures.push(fx('wash', [s * 45.4, y, -3], aim(-s * 0.6, 0.3, 0.7)));

// ---- effects -----------------------------------------------------------------------------------
for (const x of spread(-34.5, 34.5, 8)) fixtures.push(fx('co2', [x, D + 0.3, -0.9]));
for (const x of spread(-27, 27, 6)) fixtures.push(fx('pyro', [x, D + 0.2, -0.3]));
for (const x of [-40, -24, -8, 8, 24, 40]) fixtures.push(fx('confetti', [x, 0.4, 3]));
for (const x of spread(-30, 30, 12)) fixtures.push(fx('shell', [x, 0.5, -38]));
for (const x of [-38, -14, 14, 38]) fixtures.push(fx('haze', [x, D + 0.3, -20]));

const layout = {
    key: 'mainstage',
    title: 'Mainstage',
    subtitle: 'design E · home of EDM',
    structure,
    fixtures,
    ground: [260, 220],
    views: {
        audience: { label: 'Audience', pos: [0, 2.2, 52], target: [0, 13, -14] },
        front: { label: 'Front', pos: [0, 14, 92], target: [0, 13, -14] },
        quarter: { label: 'Three-quarter', pos: [-62, 18, 54], target: [0, 10, -14] },
        side: { label: 'Side', pos: [105, 12, -12], target: [0, 11, -14] },
        top: { label: 'Top', pos: [0, 125, 0.01], target: [0, 0, -12] },
    },
    notes: [
        'About 100 m wide, 30 m deep, 29 m to the top of the crown',
        'Fins: 6 a side, each 3.2 m further forward than the one inside it',
        'A ladder of lights in every gap between fins, floor to shoulder',
        'Aerial rig: three flown chevrons repeating the crown, stepping forward',
        'Orange plate = the logo; blue-grey = LED screen; white = a person (1.8 m)',
    ],
};

export default layout;
