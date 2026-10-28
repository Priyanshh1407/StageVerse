import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// The steel structure, built from box-truss bars (4 chords + zig-zag bracing on two faces)
// and merged into ONE geometry, so the whole rig is a single draw call.
// Positions line up with rigLayout.js: the fixtures hang just under these bars.

const SECTION = 0.45;   // truss width/height
const CHORD = 0.06;     // tube thickness

/** A straight truss bar from `from` to `to` (both [x, y, z]). */
function trussBar(from, to) {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const length = a.distanceTo(b);
    const parts = [];
    const half = SECTION / 2;

    // Four chords along the bar (built along +X, rotated into place below)
    for (const [y, z] of [[half, half], [half, -half], [-half, half], [-half, -half]]) {
        const chord = new THREE.BoxGeometry(length, CHORD, CHORD);
        chord.translate(length / 2, y, z);
        parts.push(chord);
    }
    // Zig-zag bracing on the front and back faces
    const steps = Math.max(1, Math.floor(length / SECTION));
    const diag = Math.hypot(length / steps, SECTION);
    const angle = Math.atan2(SECTION, length / steps);
    for (let i = 0; i < steps; i++) {
        for (const z of [half, -half]) {
            const brace = new THREE.BoxGeometry(diag, CHORD * 0.7, CHORD * 0.7);
            brace.rotateZ(i % 2 === 0 ? angle : -angle);
            brace.translate((i + 0.5) * (length / steps), 0, z);
            parts.push(brace);
        }
    }

    const bar = mergeGeometries(parts);
    parts.forEach((p) => p.dispose());
    // Rotate +X onto the bar's direction, then move it into place
    const dir = b.clone().sub(a).normalize();
    bar.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir));
    bar.translate(a.x, a.y, a.z);
    return bar;
}

// Every bar in the rig: [from, to]
// The four horizontal rows, top to bottom, all above the LED wall (top edge y = 11.2).
// Each spans the full width and lands on the tower boxes (directly on a column, or on a side tie).
export const ROWS = [
    { y: 17.4, z: -6 },     // 1: aerials hanging underneath, facing the audience
    { y: 15.8, z: -4 },     // 2: stage wash, hanging (sits on the front columns)
    { y: 14.3, z: -7.5 },   // 3: stage wash, hanging
    { y: 12.9, z: -10 },    // 4: aerials hanging underneath (sits on the rear columns)
];

export const TRUSS_BARS = [
    ...ROWS.map(({ y, z }) => [[-15.6, y, z], [15.6, y, z]]),
    // Side towers: a box on each side, a front and a rear column tied together at the top,
    // middle and bottom (the top truss lands on the top tie). Side moving heads hang on the rear
    // columns' inner faces.
    [[-15.6, 0, -4], [-15.6, 18, -4]],
    [[15.6, 0, -4], [15.6, 18, -4]],
    [[-15.6, 0, -10], [-15.6, 18, -10]],
    [[15.6, 0, -10], [15.6, 18, -10]],
    ...[17.4, 14.3, 8.5, 0.6].flatMap((y) => [
        [[-15.6, y, -4], [-15.6, y, -10]],
        [[15.6, y, -4], [15.6, y, -10]],
    ]),
    // Frame around the main LED wall
    [[-10.5, 11.55, -13.6], [10.5, 11.55, -13.6]],
];

export function createTrussGeometry(bars = TRUSS_BARS) {
    const pieces = bars.map(([from, to]) => trussBar(from, to));
    const merged = mergeGeometries(pieces);
    pieces.forEach((p) => p.dispose());
    merged.computeBoundingSphere();
    return merged;
}
