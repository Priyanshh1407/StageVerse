import { ROWS } from './trussGeometry';

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
    { name: 'topFan', role: 'aerial', mount: 'hanging', share: 0.2, layout: { y: ROWS[0].y - UNDER, z: ROWS[0].z, width: 24 }, tilt: 1.3, panSpread: 1.3 },
    // Clamped sideways to the inner face of each tower box's rear column, crossing in over the stage
    { name: 'sideTowers', role: 'sides', mount: 'side', share: 0.18, layout: { towers: true, x: 15.6 - UNDER, z: -10, yFrom: 2.5, yTo: 11 }, tilt: 1.72, pan: 1.15 },
    // Rows 2 and 3: washes hanging underneath, pointed down onto the stage
    { name: 'washFront', role: 'wash', mount: 'hanging', share: 0.12, layout: { y: ROWS[1].y - UNDER, z: ROWS[1].z, width: 22 }, tilt: 0.35, facing: TOWARD_STAGE, panSpread: 0.4 },
    { name: 'washMid', role: 'wash', mount: 'hanging', share: 0.12, layout: { y: ROWS[2].y - UNDER, z: ROWS[2].z, width: 22 }, tilt: 0.15, facing: TOWARD_STAGE, panSpread: 0.3 },
    // Row 4: aerials hanging under the lowest truss (above the LED wall), neighbours crossing
    { name: 'lowFan', role: 'aerial', mount: 'hanging', share: 0.18, layout: { rows: [ROWS[3].y - UNDER], z: ROWS[3].z, width: 24 }, tilt: 1.42, cross: 0.35 },
    // Standing on the front of the deck, firing up
    { name: 'floor', role: 'floor', mount: 'standing', share: 0.2, layout: { y: 0.53, z: -0.6, width: 24 }, tilt: 2.4, panSpread: 1.0 },
];

const spread = (i, n, width) => (n === 1 ? 0 : -width / 2 + (width * i) / (n - 1));

function placeGroup(group, n, groupIndex) {
    const { layout } = group;
    const out = [];
    for (let i = 0; i < n; i++) {
        let position;
        let pan;
        let mount = MOUNTS[group.mount];
        if (layout.towers) {
            // Alternate left/right tower, stacking upward
            const side = i % 2 === 0 ? -1 : 1;
            mount = sideMount(side);
            const level = Math.floor(i / 2);
            const levels = Math.max(1, Math.ceil(n / 2) - 1);
            const y = layout.yFrom + ((layout.yTo - layout.yFrom) * level) / levels;
            position = [side * layout.x, y, layout.z];
            pan = -side * group.pan; // fire inward, across the stage, and towards the audience
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
            colorMix: (i + groupIndex) % 2, // alternate the two colours of the group's role
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
    return GROUPS.flatMap((g, gi) => placeGroup(g, sizes[gi], gi));
}

/**
 * Strobe positions, in the gaps between moving heads (like a real rig alternating beams and
 * strobes): hanging under the top and lowest truss rows, and standing on the front of the deck
 * between the floor fixtures. Positions are the strobe's centre (it's ~0.7 m tall).
 */
export const STROBE_DROP = 0.225 + 0.36 + 0.03; // truss half-section + half the strobe + a gap
export function strobeLayout(count) {
    const fixtures = rigLayout(count);
    const between = (xs) => xs.slice(1).map((x, i) => (x + xs[i]) / 2);
    const xsOf = (group, y) => fixtures.filter((f) => f.group === group && (y === undefined || f.position[1] === y))
        .map((f) => f.position[0]).sort((a, b) => a - b);
    const top = between(xsOf('topFan')).map((x) => [x, ROWS[0].y - STROBE_DROP, ROWS[0].z]);
    const low = between(xsOf('lowFan')).map((x) => [x, ROWS[3].y - STROBE_DROP, ROWS[3].z]);
    const floor = between(xsOf('floor')).map((x) => [x, 0.5 + 0.36, -0.6]); // on the deck (strobe ~0.7 m tall)
    return [...top, ...low, ...floor];
}
