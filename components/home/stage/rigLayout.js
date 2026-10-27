// Where the beam fixtures hang and where they point at rest, as plain data.
// Modelled on the reference look: a top fan spreading up and out over the crowd, side towers
// firing sideways, two mid rows inside the stage frame alternating colours, a front truss,
// and floor fixtures firing up. `count` is split across the groups, so lower quality tiers
// simply get fewer fixtures per group.
//
// Directions: tilt is measured from straight down (0 = down, PI/2 = horizontal, PI = up);
// pan rotates around the vertical axis (0 = towards the audience, +x is stage left).

export const GROUPS = [
    // name, share of fixtures, how fixtures are spread, resting aim
    { name: 'topFan', share: 0.22, layout: { y: 16, z: -6, width: 22 }, tilt: 2.05, panSpread: 1.5 },
    { name: 'sideTowers', share: 0.22, layout: { towers: true, x: 15, z: -4, yFrom: 3, yTo: 14 }, tilt: 1.72, pan: 1.15 },
    { name: 'midRows', share: 0.26, layout: { rows: [11, 8.5], z: -10, width: 16 }, tilt: 0.5, cross: 0.28 },
    { name: 'frontTruss', share: 0.12, layout: { y: 12.5, z: -3, width: 20 }, tilt: 0.62, panSpread: 0.5 },
    { name: 'floor', share: 0.18, layout: { y: 0.5, z: 0, width: 24 }, tilt: 2.4, panSpread: 1.0 },
];

const spread = (i, n, width) => (n === 1 ? 0 : -width / 2 + (width * i) / (n - 1));

function placeGroup(group, n, groupIndex) {
    const { layout } = group;
    const out = [];
    for (let i = 0; i < n; i++) {
        let position;
        let pan;
        if (layout.towers) {
            // Alternate left/right tower, stacking upward
            const side = i % 2 === 0 ? -1 : 1;
            const level = Math.floor(i / 2);
            const levels = Math.max(1, Math.ceil(n / 2) - 1);
            const y = layout.yFrom + ((layout.yTo - layout.yFrom) * level) / levels;
            position = [side * layout.x, y, layout.z];
            pan = side * group.pan; // fire outward and towards the audience
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
            pan = (x / (layout.width / 2 || 1)) * (group.panSpread / 2); // fan outward from centre
        }
        out.push({
            group: group.name,
            position,
            pan,
            tilt: group.tilt,
            phase: i * 0.61 + groupIndex * 1.7,
            colorMix: (i + groupIndex) % 2, // alternate the two show colours
        });
    }
    return out;
}

/** Fixtures for `count` beams, spread over the groups by share (every group gets at least one). */
export function rigLayout(count) {
    const total = Math.max(GROUPS.length, Math.round(count));
    const sizes = GROUPS.map((g) => Math.max(1, Math.floor(total * g.share)));
    // Give any rounding remainder to the groups in order, so sizes always sum to `total`
    for (let i = 0; sizes.reduce((a, b) => a + b, 0) < total; i = (i + 1) % GROUPS.length) sizes[i]++;
    return GROUPS.flatMap((g, gi) => placeGroup(g, sizes[gi], gi));
}
