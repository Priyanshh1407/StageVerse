import { DECK_HEIGHT, ROWS, TOWER_FRONT_Z, TOWER_MID_Z, TOWER_REAR_Z } from './trussGeometry';

// Where every moving head is mounted, which job it does, and where it points at rest, as plain
// data. Like a real rig, each group has one purpose (see ROLES): aerial beams fan up from the top
// truss and cross down from the mid trusses, the side towers cross in over the stage, floor
// fixtures fire up from the deck, and washes on the front truss colour the stage itself.
// `count` is split across the groups, so lower quality tiers get fewer fixtures per group.
//
// Directions: tilt is measured from straight down (0 = down, PI/2 = horizontal, PI = up);
// pan rotates around the vertical axis (0 = towards the audience, +x is stage left).
// Mount: 'standing' on its base, 'hanging' under a truss, or 'side' clamped to a vertical tower.
// In the shader it becomes two vectors: `up` (the direction from the base to the head, i.e. the
// model's +Z) and `xAxis` (where the model's +X, the tilt axis at rest, points).
const MOUNTS = {
    standing: { up: [0, 1, 0], xAxis: [1, 0, 0] },
    hanging: { up: [0, -1, 0], xAxis: [1, 0, 0] },
};
const sideMount = (side) => ({ up: [-side, 0, 0], xAxis: [0, 1, 0] }); // base on the tower, head toward the stage

// The moving-head model's base sits under the truss tube (half the 0.45 m section)
const UNDER = 0.255; // + a 3 cm gap so the base and the tube never z-fight

// Washes face back toward the stage (pan 0 faces the audience)
const TOWARD_STAGE = Math.PI;

export const GROUPS = [
    // Row 1: aerials hanging upside down under the highest truss, beams out over the audience
    { name: 'topFan', role: 'aerial', mount: 'hanging', share: 0.18, layout: { y: ROWS[0].y - UNDER, z: ROWS[0].z, width: 28 }, tilt: 1.3, panSpread: 1.3 },
    // Clamped sideways to the inner face of each tower box's rear column, crossing over the stage:
    // the left tower's beams go to the right and the right tower's to the left (look.sidesAim
    // swings them further across, or back out toward the audience)
    { name: 'sideTowers', role: 'sides', mount: 'side', share: 0.16, layout: { towers: true, x: 15.6 - UNDER, z: TOWER_REAR_Z, yFrom: 2.5, yTo: 11 }, tilt: 1.72, pan: 0.85 },
    // Rows 2 and 3: washes hanging underneath, pointed down onto the stage
    { name: 'washFront', role: 'wash', mount: 'hanging', share: 0.16, layout: { y: ROWS[1].y - UNDER, z: ROWS[1].z, width: 22 }, tilt: 0.35, facing: TOWARD_STAGE, panSpread: 0.4 },
    { name: 'washMid', role: 'wash', mount: 'hanging', share: 0.16, layout: { y: ROWS[2].y - UNDER, z: ROWS[2].z, width: 22 }, tilt: 0.15, facing: TOWARD_STAGE, panSpread: 0.3 },
    // Row 4: aerials hanging under the lowest truss (above the LED wall), neighbours crossing
    { name: 'lowFan', role: 'aerial', mount: 'hanging', share: 0.16, layout: { rows: [ROWS[3].y - UNDER], z: ROWS[3].z, width: 28 }, tilt: 1.42, cross: 0.35 },
    // Standing on the front of the deck, firing up
    { name: 'floor', role: 'floor', mount: 'standing', share: 0.18, layout: { y: DECK_HEIGHT + 0.03, z: -0.6, width: 24 }, tilt: 2.4, panSpread: 1.0 },
];

const spread = (i, n, width) => (n === 1 ? 0 : -width / 2 + (width * i) / (n - 1));

function placeGroup(group, n, groupIndex) {
    const { layout } = group;
    const out = [];
    for (let i = 0; i < n; i++) {
        let position;
        let pan;
        let mount = MOUNTS[group.mount];
        let colorMix = (i + groupIndex) % 2; // alternate the two colours along the row
        // the fixture's number for beat effects (odd/even alternating, random sparkle): its place in the row
        let beatIndex = i;
        if (layout.towers) {
            // Alternate left/right tower, stacking upward
            const side = i % 2 === 0 ? -1 : 1;
            mount = sideMount(side);
            const level = Math.floor(i / 2);
            // alternate colours up each tower, the same on both sides (not one colour per tower)
            colorMix = (level + groupIndex) % 2;
            const levels = Math.max(1, Math.ceil(n / 2) - 1);
            const y = layout.yFrom + ((layout.yTo - layout.yFrom) * level) / levels;
            position = [side * layout.x, y, layout.z];
            pan = -side * group.pan; // fire inward, across the stage, and towards the audience
            // numbered by height, so odd/even alternates up each tower, mirrored on both sides
            // (by place in the row, odd/even was left tower/right tower: one side went dark at a time)
            beatIndex = level + (side > 0 ? 500 : 0);
        } else if (layout.rows) {
            // Split across rows; beams alternate inward/outward so neighbours cross
            const row = i % layout.rows.length;
            const inRow = Math.floor(i / layout.rows.length);
            const perRow = Math.ceil(n / layout.rows.length);
            const x = spread(inRow, perRow, layout.width);
            position = [x, layout.rows[row], layout.z];
            pan = (inRow % 2 === 0 ? 1 : -1) * group.cross;
        } else {
            const x = spread(i, n, layout.width);
            position = [x, layout.y, layout.z];
            pan = (group.facing ?? 0) + (x / (layout.width / 2 || 1)) * (group.panSpread / 2); // fan outward from centre
        }
        out.push({
            group: group.name,
            role: group.role,
            mount: group.mount,
            up: mount.up,
            xAxis: mount.xAxis,
            position,
            pan,
            tilt: group.tilt,
            phase: n > 1 ? i / (n - 1) : 0, // place along the row: movement waves travel along it
            colorMix,
            beatIndex,
        });
    }
    return out;
}

/** Fixtures for `count` moving heads, spread over the groups by share (every group gets at least one). */
export function rigLayout(count) {
    const total = Math.max(GROUPS.length, Math.round(count));
    const sizes = GROUPS.map((g) => Math.max(1, Math.floor(total * g.share)));
    // Give any rounding remainder to the groups in order, so sizes always sum to `total`
    for (let i = 0; sizes.reduce((a, b) => a + b, 0) < total; i = (i + 1) % GROUPS.length) sizes[i]++;
    // The side towers are mirrored left and right, so they take an even number (the spare one goes to the floor row)
    const sides = GROUPS.findIndex((g) => g.name === 'sideTowers');
    const floor = GROUPS.findIndex((g) => g.name === 'floor');
    if (sizes[sides] % 2 && sizes[sides] > 1) { sizes[sides]--; sizes[floor]++; }
    return GROUPS.flatMap((g, gi) => placeGroup(g, sizes[gi], gi));
}

/**
 * Strobe positions, in the gaps between moving heads (like a real rig alternating beams and
 * strobes): hanging under the top and lowest truss rows, plus a few standing vertically on the
 * inner face of each side tower's middle column. Each is [x, y, z, rotation about Z] at the strobe's
 * centre (it's ~0.7 m tall; 0 = horizontal, PI/2 = vertical). None on the deck: the truss strobes
 * are the source of strobe and blinder light.
 */
export const STROBE_DROP = 0.225 + 0.36 + 0.03; // truss half-section + half the strobe + a gap
// Tower strobes: standing on end against the inner face of the middle column, a few heights up
const TOWER_STROBE_HEIGHTS = [4.2, 7.8, 11.4];
const TOWER_STROBE_X = 15.6 - 0.225 - 0.45;
export function strobeLayout(count) {
    const fixtures = rigLayout(count);
    const between = (xs) => xs.slice(1).map((x, i) => (x + xs[i]) / 2);
    const xsOf = (group, y) => fixtures.filter((f) => f.group === group && (y === undefined || f.position[1] === y))
        .map((f) => f.position[0]).sort((a, b) => a - b);
    const top = between(xsOf('topFan')).map((x) => [x, ROWS[0].y - STROBE_DROP, ROWS[0].z, 0]);
    const low = between(xsOf('lowFan')).map((x) => [x, ROWS[3].y - STROBE_DROP, ROWS[3].z, 0]);
    const towers = [-1, 1].flatMap((side) => TOWER_STROBE_HEIGHTS.map((y) => [side * TOWER_STROBE_X, y, TOWER_MID_Z, Math.PI / 2]));
    return [...top, ...low, ...towers];
}

// Laser projectors: aperture height on the deck (0.3 m above the deck top), and the tower ones clamped to the
// inner face of the front columns (column face, a 12 cm rod, then half the 0.75 m housing)
const LASER_DECK_Y = DECK_HEIGHT + 0.3;
const LASER_TOWER_X = 15.6 - 0.225 - 0.12 - 0.375;
const LASER_TOWER_HEIGHTS = [5.5, 9.5];

/** The projectors: aperture position, whether it's on a tower, and its order left to right. */
export function laserLayout(fixtureCount) {
    // Floor: the gaps between the floor moving heads nearest x = -9, -3, 3, 9
    const xs = rigLayout(fixtureCount).filter((f) => f.group === 'floor').map((f) => f.position[0]).sort((a, b) => a - b);
    const gaps = xs.slice(1).map((x, i) => (x + xs[i]) / 2);
    const floorXs = [];
    for (const want of [-9, -3, 3, 9]) {
        const free = gaps.filter((g) => !floorXs.includes(g));
        floorXs.push(free.length ? free.reduce((best, g) => (Math.abs(g - want) < Math.abs(best - want) ? g : best)) : want);
    }
    // A projector (0.75 m wide) needs ~0.7 m from the heads either side; when the row is packed too
    // tightly for that (the desk's biggest rigs), the lasers stand a little ahead of the row instead
    const roomy = gaps.length && (xs[1] - xs[0]) / 2 >= 0.7;
    const floor = floorXs.map((x) => ({ pos: [x, LASER_DECK_Y, roomy ? -0.38 : 0.35], tower: 0 }));
    const towers = [-1, 1].flatMap((side) => LASER_TOWER_HEIGHTS.map((y) => ({ pos: [side * LASER_TOWER_X, y, TOWER_FRONT_Z + 0.1], tower: 1, side })));
    return [...floor, ...towers].sort((a, b) => a.pos[0] - b.pos[0] || a.pos[1] - b.pos[1]);
}

// CO2 jets: 6 nozzles along the stage front, where nothing else stands. A nozzle (and the base of its
// plume) needs CO2_CLEAR from a floor moving head's centre and CO2_LASER_CLEAR from a floor laser's
// centre (its housing reaches almost to the deck edge). It stands in a free gap between two floor
// heads near where it's wanted; when there's no such gap (a laser in it, or heads packed too tightly),
// it moves forward to the deck's front lip, in front of the lights, still sliding clear of any laser.
export const CO2_CLEAR = 0.75;
export const CO2_LASER_CLEAR = 0.9;
export const CO2_ROW_Z = -0.6;    // in line with the floor heads
export const CO2_FRONT_Z = -0.08; // the front lip of the deck (it ends at z = 0), ahead of the heads
const CO2_WANT = [-10.5, -6, -1.5, 1.5, 6, 10.5];
const CO2_REACH = 2.5;            // how far from where it's wanted a gap may be

/** The nozzles, left to right: { pos: [x, y, z] (the nozzle top), front: moved ahead of the lights }. */
export function co2Layout(fixtureCount) {
    const heads = rigLayout(fixtureCount).filter((f) => f.group === 'floor').map((f) => f.position[0]).sort((a, b) => a - b);
    const lasers = laserLayout(fixtureCount).filter((l) => !l.tower).map((l) => l.pos[0]);
    const clearOfLasers = (x) => lasers.every((l) => Math.abs(l - x) >= CO2_LASER_CLEAR - 0.001);
    const gaps = heads.slice(1).map((x, i) => (x + heads[i]) / 2)
        // (not the centre gap: the jets come in mirrored pairs)
        .filter((g) => Math.abs(g) > 0.01 && Math.min(...heads.map((h) => Math.abs(h - g))) >= CO2_CLEAR - 0.001 && clearOfLasers(g));
    const used = [];
    const nozzleY = DECK_HEIGHT + 0.36;
    return CO2_WANT.map((want) => {
        const free = gaps.filter((g) => !used.includes(g) && Math.abs(g - want) <= CO2_REACH);
        if (free.length) {
            const x = free.reduce((best, g) => (Math.abs(g - want) < Math.abs(best - want) ? g : best));
            used.push(x);
            return { pos: [x, nozzleY, CO2_ROW_Z], front: false };
        }
        // in front of the lights: slide off any laser, toward the stage centre
        let x = want;
        for (const l of lasers) if (Math.abs(l - x) < CO2_LASER_CLEAR) x = Math.abs(l) > CO2_LASER_CLEAR ? l - Math.sign(l) * CO2_LASER_CLEAR : l + Math.sign(want) * CO2_LASER_CLEAR;
        return { pos: [x, nozzleY, CO2_FRONT_Z], front: true };
    });
}

// Pyro on the stage front (the fireworks' mines): 6 spots on the deck's front lip (always in front of
// the lights), each clear of everything else on the front of the stage, so a burst never rises
// through a light, a laser or a CO2 plume:
// - not straight in front of a floor moving head or a CO2 nozzle back in the row (PYRO_FRONT_CLEAR
//   from its centre);
// - PYRO_CLEAR from anything standing on the lip itself: a floor laser's housing (it reaches almost
//   to the deck edge) and a CO2 nozzle moved forward onto the lip;
// - PYRO_SPACING from each other.
// Preferably centred in a gap of the floor row, near where it's wanted.
export const PYRO_Z = -0.18;
export const PYRO_FRONT_CLEAR = 0.45;
export const PYRO_CLEAR = 0.9;
export const PYRO_SPACING = 1.5;
const PYRO_WANT = [-12, -8.6, -4, 4, 8.6, 12];

/** The pyro spots on the stage front, left to right: { pos: [x, y, z] } (y: the top of the mortar). */
export function pyroLayout(fixtureCount) {
    const heads = rigLayout(fixtureCount).filter((f) => f.group === 'floor').map((f) => f.position[0]).sort((a, b) => a - b);
    const lasers = laserLayout(fixtureCount).filter((l) => !l.tower).map((l) => l.pos[0]);
    const jets = co2Layout(fixtureCount);
    const onLip = [...lasers, ...jets.filter((j) => j.front).map((j) => j.pos[0])];
    const behind = [...heads, ...jets.filter((j) => !j.front).map((j) => j.pos[0])];
    const placed = [];
    const ok = (x) => behind.every((o) => Math.abs(o - x) >= PYRO_FRONT_CLEAR - 0.001)
        && onLip.every((o) => Math.abs(o - x) >= PYRO_CLEAR - 0.001)
        && placed.every((o) => Math.abs(o - x) >= PYRO_SPACING - 0.001)
        && Math.abs(x) <= 13.5;
    const gaps = heads.slice(1).map((x, i) => (x + heads[i]) / 2);
    for (const want of PYRO_WANT) {
        // a free gap near where it's wanted, else the nearest free spot along the lip (5 cm steps)
        let x = gaps.filter((g) => Math.abs(g - want) <= 1.2 && ok(g)).sort((a, b) => Math.abs(a - want) - Math.abs(b - want))[0];
        for (let d = 0; x === undefined && d <= 3; d += 0.05) {
            // (toward the stage centre first, so the two sides come out mirrored)
            for (const c of [want - Math.sign(want) * d, want + Math.sign(want) * d]) if (x === undefined && ok(c)) x = Math.round(c * 100) / 100;
        }
        placed.push(x ?? want);
    }
    return placed.map((x) => ({ pos: [x, DECK_HEIGHT + 0.3, PYRO_Z] }));
}
// CO2 jets on the aerial truss: 4 nozzles clamped to the front face of the top truss,
// half-way up it, between its two LED pixel bars (the bars run along the top and bottom chords), so
// nothing on the truss is covered. Each lines up with one of the strobes hanging between the aerial
// heads, so its plume leaves between two heads' beams. They're aimed out over the audience and down
// (CO2_TRUSS_DOWN below level), the outer ones fanning out a little; from the front face the plume
// moves away from the truss, never back past the heads hanging underneath.
// (25 degrees came almost straight at the audience camera: the plumes read as round puffs; 40 shows
// the jet sweeping down over the crowd, as truss CO2 does at festivals)
export const CO2_TRUSS_DOWN = (40 * Math.PI) / 180;
const CO2_TRUSS_WANT = [-10.5, -3.5, 3.5, 10.5];
const TRUSS_HALF = 0.225; // half the truss section

/** The truss nozzles, left to right: { pos: [x, y, z] (the nozzle tip), dir: unit vector of the jet }. */
export function co2TrussLayout(fixtureCount) {
    const strobes = strobeLayout(fixtureCount).filter((s) => s[1] > ROWS[0].y - 1).map((s) => s[0]);
    const used = [];
    return CO2_TRUSS_WANT.map((want) => {
        const free = strobes.filter((s) => !used.includes(s));
        const x = free.length ? free.reduce((best, s) => (Math.abs(s - want) < Math.abs(best - want) ? s : best)) : want;
        used.push(x);
        const fan = (x / 15) * 0.12; // the outer jets angled a little outward
        const d = [fan, -Math.sin(CO2_TRUSS_DOWN), Math.cos(CO2_TRUSS_DOWN)];
        const len = Math.hypot(...d);
        return { pos: [x, ROWS[0].y, ROWS[0].z + TRUSS_HALF + 0.3], dir: d.map((v) => v / len) };
    });
}

// Confetti cannons: 4 on the ground in front of the stage. Two in the middle, each sitting in one of
// the two gaps between the sub stacks either side of centre (the stacks stand SUB_PITCH apart and
// SUB_WIDTH wide, so each gap is ~1 m: room for a 0.5 m cannon base), fired steeply so the paper clears
// the crowd barrier and fills the middle of the crowd; and one at each side, standing under each
// flown line array, angled in over the sides of the crowd. Together they cover every region evenly.
// (The sub and line-array positions mirror PaSystem.jsx; a test keeps them in step.)
export const SUB_PITCH = 2.4;
export const SUB_WIDTH = 1.35;
export const SUB_Z = 0.06 + 0.7 / 2;
export const ARRAY_X = 18.3;
export const ARRAY_Z = TOWER_FRONT_Z + 1.4;
const CONFETTI_BARREL = 0.9;

/** The confetti cannons, left to right: { pos: [x, y, z] (the muzzle), dir, base: [x, y, z] (base centre), spot }. */
export function confettiLayout() {
    const cannons = [
        { x: -ARRAY_X, z: ARRAY_Z, aim: [0.32, 1.3, 1.0], spot: 'line array' },
        { x: -SUB_PITCH, z: SUB_Z, aim: [-0.08, 1.45, 1.0], spot: 'sub gap' },
        { x: SUB_PITCH, z: SUB_Z, aim: [0.08, 1.45, 1.0], spot: 'sub gap' },
        { x: ARRAY_X, z: ARRAY_Z, aim: [-0.32, 1.3, 1.0], spot: 'line array' },
    ];
    return cannons.map(({ x, z, aim, spot }) => {
        const len = Math.hypot(...aim);
        const dir = aim.map((v) => v / len);
        const base = [x, 0.1, z];
        const pivot = [x, 0.2, z];
        return { pos: pivot.map((v, k) => v + dir[k] * CONFETTI_BARREL), dir, base, spot };
    });
}

// Streamer launchers: 3 standing on top of the aerial (top) truss, left, centre and right, so the
// ribbons come from the stage itself. Nothing else is on top of the truss (the aerial heads and
// strobes hang below it, the LED bars and truss CO2 nozzles are on its front face), and the bases sit
// within the truss's depth, clear of the front-face LED bar. They fire up and out over the audience,
// each covering its own third of the crowd: the left one angled left, the centre one straight out,
// the right one angled right.
export const STREAMER_X = [-9, 0, 9];
const STREAMER_BARREL = 0.75;
const TOP_OF_TRUSS = ROWS[0].y + 0.225; // the truss is 0.45 m deep

/** The streamer launchers, left to right: { pos: [x, y, z] (the muzzle), dir, base: [x, y, z] (base centre) }. */
export function streamerLayout() {
    return STREAMER_X.map((x) => {
        // forward and only a little up: from 19 m they arc out over the front and middle of the crowd
        const d = [(x / 9) * 0.4, 0.3, 1.0];
        const len = Math.hypot(...d);
        const dir = d.map((v) => v / len);
        const base = [x, TOP_OF_TRUSS + 0.1, ROWS[0].z];
        const pivot = [x, TOP_OF_TRUSS + 0.2, ROWS[0].z];
        return { pos: pivot.map((v, k) => v + dir[k] * STREAMER_BARREL), dir, base };
    });
}
