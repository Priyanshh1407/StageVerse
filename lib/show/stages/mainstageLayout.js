import { COLORS, aim, along, box, fx, panel, spread, truss, turned } from './blockoutKit.js';

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
structure.push(box([WALL.topHalf * 2, WALL.height, 0.5], [0, D + WALL.height / 2, WALL.z], COLORS.screen, { ledWall: 'main' }));
// the crown: the upper band of a wide triangle across the whole wall, with the logo under it
const CROWN = { rise: 6, band: 2.3, innerHalf: 13.2 };
structure.push(panel([[-WALL.topHalf, WALL.height], [0, WALL.height + CROWN.rise], [WALL.topHalf, WALL.height], [CROWN.innerHalf, WALL.height], [0, WALL.height + CROWN.rise - CROWN.band], [-CROWN.innerHalf, WALL.height]], WALL.z + 0.4, COLORS.screen, 0.8, D));
// the fins: every one its own LED screen
for (const f of FINS) structure.push(panel(f.outline, f.z, COLORS.screen, 0.7, D));
// the DJ riser and booth (LED front)
structure.push(box([16, 1, 6], [0, D + 0.5, -13], COLORS.dark));
structure.push(box([11, 1.5, 2.2], [0, D + 1.75, -11.5], COLORS.screen));
structure.push(box([0.5, 1.8, 0.3], [0, D + 1.9, -13], COLORS.person));
// PA: a straight truss tower each side, the washes on it facing the stage, the line array flown in front of it
const PA_X = 45.4;
const PA_TOP = 23;
for (const s of [-1, 1]) {
    structure.push(truss([s * PA_X, 0, -4], [s * PA_X, PA_TOP, -4], 0.6));
    structure.push(box([1.6, 10, 1.4], [s * 47.6, 15, -2], COLORS.dark, { drawnBy: 'pa' }));
}
// the crowd barrier and a person at it, for scale
structure.push(box([92, 1.2, 0.2], [0, 0.6, 3.2], COLORS.dark, { drawnBy: 'barrier' }));
structure.push(box([0.5, 1.8, 0.3], [6, 0.9, 7], COLORS.person));

// ---- the aerial lights: no trusses (the design chosen) ---------------------------------------------
// Nothing is flown. The aerial lights sit on top of what is already there: along the top edges of
// every fin, along the top of the wall, up both slopes of the crown and on top of the PA towers.
// the aerials point straight out at the audience, each flared a little to one side or the other in turn
// (pointing dead at the audience a beam is seen end on and almost disappears)
const FLARE = 0.1;
const mounted = { key: 'none', label: 'No trusses: lights on the fins and crown', structure: [], fixtures: [] };
// They stand on top of the structure and throw down and out at the crowd: like every aerial beam,
// never up into the sky (only the floor beams fire upwards)
for (const f of FINS) {
    // three on each fin's top: half-way up the outer slope, just inside the tip, half-way down the inner slope
    const [outer, tip, inner] = [f.outline[2], f.outline[3], f.outline[4]];
    const spots = [[(outer[0] + tip[0]) / 2, (outer[1] + tip[1]) / 2, 'beam'], [tip[0] - f.s * 0.9, tip[1] - 0.5, 'beam'], [(inner[0] + tip[0]) / 2, (inner[1] + tip[1]) / 2, 'wash']];
    spots.forEach(([x, y, type], n) => mounted.fixtures.push(fx(type, [x, D + y + 0.5, f.z + 0.9], aim(FLARE * ((f.i + n) % 2 ? 1 : -1), -0.22 - y * 0.006, 1))));
}
// beams between the spots along the top of the wall
spread(-12.5, 12.5, 9).forEach((x, n) => mounted.fixtures.push(fx('beam', [x, D + WALL.height + 0.5, WALL.z + 1.6], aim(FLARE * (n % 2 ? 1 : -1), -0.3, 1))));
// beams up both slopes of the crown, a spot on its peak, and the truss CO2 on its shoulders
for (const s of [-1, 1]) {
    along([s * WALL.topHalf, D + WALL.height + 1, WALL.z + 1.6], [0, D + WALL.height + CROWN.rise + 1, WALL.z + 1.6], 6, 0.12).forEach((q, n) => {
        mounted.fixtures.push(fx(n % 3 === 2 ? 'wash' : 'beam', q, aim(FLARE * (n % 2 ? s : -s), -0.3, 1)));
    });
    for (const x of [6, 12]) mounted.fixtures.push(fx('co2', [s * x, D + WALL.height + CROWN.rise * (1 - x / WALL.topHalf) + 1.6, WALL.z + 2]));
    // three beams on top of each PA tower, turned in toward the middle of the crowd
    for (const [z, k] of [[-4.7, 0.45], [-4, 0.6], [-3.3, 0.75]]) mounted.fixtures.push(fx('beam', [s * PA_X, PA_TOP + 0.5, z], aim(-s * k, -0.18, 1)));
}
mounted.fixtures.push(fx('spot', [0, D + WALL.height + CROWN.rise + 1.2, WALL.z + 1.6], aim(0, -0.75, 1)));
// the streamers fire from the top of the wall
for (const x of spread(-15, 15, 9)) mounted.fixtures.push(fx('streamer', [x, D + WALL.height + 0.6, WALL.z + 2.4]));
// and from the tops of the outer fins
for (const f of FINS.filter((q) => q.i >= 5)) mounted.fixtures.push(fx('streamer', [f.x + 1.3 * f.lean, D + f.height - 0.6, f.z + 1.2]));

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
        const n = Math.floor(top / 1.75);
        for (let j = 0; j < n; j++) {
            const y = 1.3 + j * 1.75;
            const type = j === n - 1 || j === 2 ? 'strobe' : j % 3 === 1 ? 'wash' : 'beam';
            const fixture = fx(type, [midX(y), D + y, z + 0.5], aim(s * (0.12 + 0.03 * k), 0.06 + j * 0.006, 1));
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
// (on a low riser, D + 0.95: they stand clear of the sub stacks and their strobes in front of the deck, 4 subs high)
for (const x of spread(-36, 36, 18)) fixtures.push(fx('beam', [x, D + 0.95, -1.8], aim(x * 0.006, 1, 0.5)));
for (const x of spread(-33, 33, 10)) fixtures.push(fx('strobe', [x, D + 0.25, -0.5])); // (LIP_STROBES below)
for (const x of [-30, -18, -6, 6, 18, 30]) fixtures.push(fx('laser', [x, D + 0.3, -1], aim(x * 0.01, 0.9, 0.35)));
// blinders across the DJ booth, and beams fanning up from behind it
for (const x of spread(-4.5, 4.5, 6)) fixtures.push(fx('blinder', [x, D + 1.8, -10.3]));
// (flared out left and right in turn, and leaning a little toward the crowd: straight up they were hard to see)
spread(-13, 13, 8).forEach((x, n) => fixtures.push(fx('beam', [x, D + 0.5, -24], aim((n % 2 ? 1 : -1) * 0.3, 1, 0.4))));
// washes up the PA towers
for (const s of [-1, 1]) for (const y of [5, 9, 13, 17]) fixtures.push(fx('wash', [s * PA_X, y, -4.7], aim(-s, 0, 0)));

// strobes standing on top of the sub line (4 subs high, so it shows above the deck), each on a sub stack (34 stacks,
// 2.4 m apart) and none in front of a strobe on the deck's lip (from the crowd one hid the other)
const SUB_STACKS = Array.from({ length: 34 }, (_, i) => (i - 16.5) * 2.4);
const LIP_STROBES = spread(-33, 33, 10);
const clear = SUB_STACKS.filter((x) => LIP_STROBES.every((d) => Math.abs(x - d) >= 2.2));
for (let k = 0; k < 12; k++) fixtures.push(fx('strobe', [clear[Math.round((k * (clear.length - 1)) / 11)], 4 * 0.55 + 0.25, 0.41]));

// ---- effects -----------------------------------------------------------------------------------
for (const x of spread(-34.5, 34.5, 8)) fixtures.push(fx('co2', [x, D + 0.3, -0.9]));
for (const x of spread(-27, 27, 6)) fixtures.push(fx('pyro', [x, D + 0.2, -0.3]));
for (const x of spread(-42, 42, 12)) fixtures.push(fx('confetti', [x, 0.4, 3]));
for (const x of spread(-30, 30, 12)) fixtures.push(fx('shell', [x, 0.5, -38]));
for (const x of [-38, -14, 14, 38]) fixtures.push(fx('haze', [x, D + 0.3, -20]));

// every wash lights the stage: aimed at the deck (spread across it by where the wash stands), none into the sky
const onStage = (f) => (f.type !== 'wash' ? f : { ...f, aim: aim(Math.max(-22, Math.min(22, f.pos[0] * 0.4)) - f.pos[0], D + 1.5 - f.pos[1], -12 - f.pos[2]) });
fixtures.splice(0, fixtures.length, ...fixtures.map(onStage));
mounted.fixtures.splice(0, mounted.fixtures.length, ...mounted.fixtures.map(onStage));

const layout = {
    key: 'mainstage',
    meta: { deck: D, deckSize: DECK, wall: WALL, crownRise: CROWN.rise },
    title: 'Mainstage',
    subtitle: 'design E · home of EDM',
    structure,
    fixtures,
    // two designs for the aerial rig: the page switches between them
    variants: [mounted],
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
        'No aerial trusses: the aerial lights stand on the fins, the wall, the crown and the PA',
        'Orange plate = the logo; blue-grey = LED screen; white = a person (1.8 m)',
    ],
};

export default layout;
