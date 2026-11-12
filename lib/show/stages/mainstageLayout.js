import { COLORS, aim, along, box, cable, fx, panel, spread, truss, turned } from './blockoutKit.js';

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

// ---- the aerial rig: three massive arrows, hung from two masts behind the stage -----------------
// Three arrow-shaped trusses repeat the crown, each wider, lower and further forward than the last, so
// from the crowd they stack into a tunnel of arrows over the whole stage. They sit above the fin tips
// and above the crown, so they cross neither.
// They hang like a load from a crane: one lattice mast stands on the ground BEHIND the middle of the
// wall (nothing stands in front of a fin), with a jib reaching forward high over the stage, held back
// by three stay cables to ballast blocks behind. Every arrow hangs from the jib on steel cables.
const aerialFrom = { structure: structure.length, fixtures: fixtures.length };
const CHEVRONS = [
    { z: -22, half: 19, endY: D + 23, rise: 7, perArm: 7 },
    { z: -15, half: 24, endY: D + 22, rise: 7, perArm: 8 },
    { z: -8, half: 29, endY: D + 21, rise: 7, perArm: 9 },
];
const ARM = ['beam', 'beam', 'wash', 'beam', 'strobe', 'beam', 'wash', 'beam', 'beam'];
// a point on an arrow's arm, `along` it from the peak (0) to the end (1)
const onArm = (c, s, t) => [s * c.half * t, c.endY + c.rise * (1 - t), c.z - 2.5 * t];
CHEVRONS.forEach((c, k) => {
    for (const s of [-1, 1]) {
        structure.push(truss(onArm(c, s, 1), onArm(c, s, 0), 0.7));
        along(onArm(c, s, 1), onArm(c, s, 0), c.perArm, 0.06).forEach((q, n) => {
            fixtures.push(fx(ARM[(n + k) % ARM.length], [q[0], q[1] - 0.7, q[2]], aim(q[0] * 0.035, -1, 0.55 + 0.1 * k)));
        });
    }
    fixtures.push(fx('spot', [0, c.endY + c.rise - 0.8, c.z], aim(0, -1, 0.35)));
});
const MAST = { base: [0, 0, -37], top: [0, 56, -34], jib: [0, 48, -3], anchors: [[-22, 0, -60], [22, 0, -60], [0, 0, -66]] };
structure.push(truss(MAST.base, MAST.top, 2.4));                  // the mast, behind the middle of the wall
structure.push(truss(MAST.top, MAST.jib, 1.5));                   // its jib, out over the stage
structure.push(cable(MAST.top, [MAST.jib[0], MAST.jib[1] + 0.4, MAST.jib[2]]));
for (const anchor of MAST.anchors) {                              // stay cables back to ballast on the ground
    structure.push(cable(MAST.top, anchor));
    structure.push(box([3.5, 2.2, 3.5], [anchor[0], 1.1, anchor[2]], COLORS.dark));
}
// each arrow hangs from the jib above it: on both sides, a cable near the peak, one to the middle
// of the arm and one to its end
for (const c of CHEVRONS) {
    const t = (c.z - MAST.top[2]) / (MAST.jib[2] - MAST.top[2]);
    const hook = [0, MAST.top[1] + (MAST.jib[1] - MAST.top[1]) * t, c.z];
    for (const s of [-1, 1]) for (const reach of [0.22, 0.6, 1]) structure.push(cable(hook, onArm(c, s, reach)));
}
// the front arrow also carries the truss CO2 and the streamer launchers
for (const x of [-21, -8, 8, 21]) { const q = onArm(CHEVRONS[2], Math.sign(x), Math.abs(x) / CHEVRONS[2].half); fixtures.push(fx('co2', [q[0], q[1] + 0.6, q[2] + 0.6])); }
for (const x of [-24, -12, 0, 12, 24]) { const q = onArm(CHEVRONS[2], Math.sign(x) || 1, Math.abs(x) / CHEVRONS[2].half); fixtures.push(fx('streamer', [q[0], q[1] + 0.7, q[2]])); }

// That was the first aerial design. Its pieces are lifted out here so the page can switch between it
// and the second one below.
const hung = { key: 'hung', label: 'Hung from one mast', structure: structure.splice(aerialFrom.structure), fixtures: fixtures.splice(aerialFrom.fixtures) };

// ---- the second aerial design: arches from side towers ------------------------------------------
// Each arrow is a whole arch standing on the ground: a lattice tower at each side of the stage,
// outside the last fin, and a truss arm rising from the top of each tower to a peak over the centre.
// Three of them, the front one the widest and tallest and the rear one the smallest, so from the crowd
// they nest into a tunnel of arrows. Each arm climbs along the line of the fin tips, a few metres
// above them, so no arm crosses a fin; a ridge joins the three peaks and a rail joins the tower tops.
const arches = { key: 'arches', label: 'Arches from side towers', structure: [], fixtures: [] };
const ARCHES = [
    { z: -24, x: 48, top: 13.5, peak: 33.5, perArm: 10 },
    { z: -15, x: 51, top: 16, peak: 36.5, perArm: 11 },
    { z: -6, x: 54, top: 19, peak: 40, perArm: 12 },
];
ARCHES.forEach((a, k) => {
    const peak = [0, a.peak, a.z];
    for (const s of [-1, 1]) {
        const head = [s * a.x, a.top, a.z];
        arches.structure.push(truss([s * a.x, 0, a.z], head, 1.6));   // the side tower
        arches.structure.push(truss(head, peak, 0.9));                 // the arm, up to the peak
        along(head, peak, a.perArm, 0.05).forEach((q, n) => {
            arches.fixtures.push(fx(ARM[(n + k) % ARM.length], [q[0], q[1] - 0.8, q[2]], aim(q[0] * 0.02, -1, 0.5 + 0.1 * k)));
        });
        // beams up each tower, out over the crowd
        for (const y of spread(3, a.top - 2, 4)) arches.fixtures.push(fx('beam', [s * (a.x - 1.1), y, a.z + 0.7], aim(-s * 0.25, 0.45, 1)));
    }
    arches.fixtures.push(fx('spot', [0, a.peak - 0.9, a.z], aim(0, -1, 0.35)));
    if (k) {
        const before = ARCHES[k - 1];
        arches.structure.push(truss([0, before.peak, before.z], peak, 0.7));                                                     // the ridge
        for (const s of [-1, 1]) arches.structure.push(truss([s * before.x, before.top, before.z], [s * a.x, a.top, a.z], 0.7)); // the rail along the tower tops
    }
});
// the front arch also carries the truss CO2 and the streamer launchers
const FRONT = ARCHES[2];
const onFront = (x) => [x, FRONT.top + (FRONT.peak - FRONT.top) * (1 - Math.abs(x) / FRONT.x), FRONT.z];
for (const x of [-30, -12, 12, 30]) { const q = onFront(x); arches.fixtures.push(fx('co2', [q[0], q[1] + 0.7, q[2] + 0.6])); }
for (const x of [-36, -18, 0, 18, 36]) { const q = onFront(x); arches.fixtures.push(fx('streamer', [q[0], q[1] + 0.8, q[2]])); }

// ---- the third aerial design: no trusses at all ---------------------------------------------------
// Nothing is flown. The aerial lights sit on top of what is already there: along the top edges of
// every fin, along the top of the wall, up both slopes of the crown and on top of the PA towers.
const mounted = { key: 'none', label: 'No trusses: lights on the fins and crown', structure: [], fixtures: [] };
for (const f of FINS) {
    // three on each fin's top: half-way up the outer slope, just inside the tip, half-way down the inner slope
    const [outer, tip, inner] = [f.outline[2], f.outline[3], f.outline[4]];
    const spots = [[(outer[0] + tip[0]) / 2, (outer[1] + tip[1]) / 2, 'beam'], [tip[0] - f.s * 0.9, tip[1] - 0.5, 'beam'], [(inner[0] + tip[0]) / 2, (inner[1] + tip[1]) / 2, 'wash']];
    for (const [x, y, type] of spots) mounted.fixtures.push(fx(type, [x, D + y + 0.5, f.z + 0.9], aim(f.s * (0.12 + 0.05 * f.i), 0.55, 1)));
}
// beams between the spots along the top of the wall
for (const x of spread(-12.5, 12.5, 9)) mounted.fixtures.push(fx('beam', [x, D + WALL.height + 0.5, WALL.z + 1.6], aim(x * 0.03, 0.35, 1)));
// beams up both slopes of the crown, a spot on its peak, and the truss CO2 on its shoulders
for (const s of [-1, 1]) {
    along([s * WALL.topHalf, D + WALL.height + 1, WALL.z + 1.6], [0, D + WALL.height + CROWN.rise + 1, WALL.z + 1.6], 6, 0.12).forEach((q, n) => {
        mounted.fixtures.push(fx(n % 3 === 2 ? 'wash' : 'beam', q, aim(s * (0.35 - 0.05 * n), 0.6, 1)));
    });
    for (const x of [6, 12]) mounted.fixtures.push(fx('co2', [s * x, D + WALL.height + CROWN.rise * (1 - x / WALL.topHalf) + 1.6, WALL.z + 2]));
    // two beams on top of each PA tower
    for (const z of [-4.6, -3.4]) mounted.fixtures.push(fx('beam', [s * 47, 18.6, z], aim(-s * 0.4, 0.5, 1)));
}
mounted.fixtures.push(fx('spot', [0, D + WALL.height + CROWN.rise + 1.2, WALL.z + 1.6], aim(0, -0.5, 1)));
// the streamers fire from the top of the wall
for (const x of [-14, -7, 0, 7, 14]) mounted.fixtures.push(fx('streamer', [x, D + WALL.height + 0.6, WALL.z + 2.4]));

// ---- lights on the structure -------------------------------------------------------------------
for (const s of [-1, 1]) {
    // A ladder of lights in every gap between two fins, leaning with them: it runs up the middle of the
    // gap (half-way between one fin's outer edge and the next fin's inner edge) to the shoulder of the
    // shorter fin. Beams with a wash every third, and strobes stood on end like the ladder itself.
    for (let k = 1; k < FIN_COUNT; k++) {
        const a = fin(k, s);
        const b = fin(k + 1, s);
        const w = (s * FIN_WIDTH) / 2;
        const top = 0.88 * b.height;
        // the middle of the gap at height y (both edges are straight lines, so the ladder is one too)
        const midX = (y) => (a.x + w + a.lean * (y / (0.8 * a.height)) + b.x - w + 0.85 * b.lean * (y / (0.88 * b.height))) / 2;
        const z = (a.z + b.z) / 2;
        const tilt = Math.atan2(midX(top) - midX(0), top);
        structure.push(truss([midX(0), D, z], [midX(top), D + top, z]));
        const n = Math.floor(top / 2.3);
        for (let j = 0; j < n; j++) {
            const y = 1.3 + j * 2.3;
            const type = j === n - 1 || j === 2 ? 'strobe' : j % 3 === 1 ? 'wash' : 'beam';
            const fixture = fx(type, [midX(y), D + y, z + 0.5], aim(s * (0.25 + 0.07 * k), 0.75 - 0.05 * j, 0.6));
            fixtures.push(type === 'strobe' ? turned(fixture, [0, 0, Math.PI / 2 - tilt]) : fixture);
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
    // pixel bars end to end round the whole fin (every edge but the floor), so each fin has a lit border
    f.outline.forEach((from, e) => {
        if (e === 0) return;
        const to = f.outline[(e + 1) % f.outline.length];
        const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
        const n = Math.max(1, Math.round(length / 1.7));
        const angle = Math.atan2(to[1] - from[1], to[0] - from[0]) - Math.PI / 2;
        for (let j = 0; j < n; j++) {
            const t = (j + 0.5) / n;
            fixtures.push(turned(fx('ledbar', [from[0] + (to[0] - from[0]) * t, D + from[1] + (to[1] - from[1]) * t, f.z + 0.5]), [0, 0, angle]));
        }
    });
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
    meta: { deck: D, deckSize: DECK, wall: WALL, crownRise: CROWN.rise },
    title: 'Mainstage',
    subtitle: 'design E · home of EDM',
    structure,
    fixtures,
    // two designs for the aerial rig: the page switches between them
    variants: [hung, arches, mounted],
    ground: [260, 220],
    views: {
        audience: { label: 'Audience', pos: [0, 2.2, 64], target: [0, 19, -14] },
        front: { label: 'Front', pos: [0, 18, 112], target: [0, 20, -14] },
        quarter: { label: 'Three-quarter', pos: [-78, 24, 68], target: [0, 17, -18] },
        side: { label: 'Side', pos: [125, 22, -18], target: [0, 21, -18] },
        top: { label: 'Top', pos: [0, 125, 0.01], target: [0, 0, -12] },
    },
    notes: [
        'About 100 m wide, 30 m deep, 29 m to the top of the crown',
        'Fins: 6 a side, each 3.2 m further forward than the one inside it',
        'A leaning ladder of lights up the middle of every gap between fins',
        'Pixel bars round every fin, as a lit border',
        'Aerial rig, three designs to compare: arrows hung from one crane mast, arches on side towers, or no trusses',
        'Orange plate = the logo; blue-grey = LED screen; white = a person (1.8 m)',
    ],
};

export default layout;
