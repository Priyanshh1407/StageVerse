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

// Stage depth: the tower boxes run from the front columns back to the rear columns, with the LED
// wall further back still, so the rows of fixtures have room between them
// Each side tower has three columns: front, middle and rear, the middle one splitting the depth in two.
export const TOWER_FRONT_Z = -4;
export const TOWER_MID_Z = -9;
export const TOWER_REAR_Z = -14;
export const SCREEN_Z = -17.2;           // the main LED wall
export const DECK_DEPTH = 18;            // the stage deck runs from its front edge (z = 0) back to z = -18

// Every bar in the rig: [from, to]
// The four horizontal rows, top to bottom, all above the LED wall (top edge y = 11.2).
// Each spans the full width and lands on the tower boxes (directly on a column, or on a side tie).
export const ROWS = [
    { y: 18.4, z: TOWER_MID_Z },    // 1: aerials hanging underneath, facing the audience (sits on the middle columns)
    { y: 15.8, z: TOWER_FRONT_Z },  // 2: stage wash, hanging (sits on the front columns)
    { y: 14.3, z: -11.5 },          // 3: stage wash, hanging
    { y: 12.9, z: TOWER_REAR_Z },   // 4: aerials hanging underneath (sits on the rear columns)
];

export const TRUSS_BARS = [
    ...ROWS.map(({ y, z }) => [[-15.6, y, z], [15.6, y, z]]),
    // Side towers: on each side three columns (front, middle, rear) tied together at the top,
    // middle and bottom; the ties run through the middle column, so it's one structure. The top
    // truss sits on the middle columns. Side moving heads hang on the rear columns' inner faces.
    ...[TOWER_FRONT_Z, TOWER_MID_Z, TOWER_REAR_Z].flatMap((z) => [
        [[-15.6, 0, z], [-15.6, 19, z]],
        [[15.6, 0, z], [15.6, 19, z]],
    ]),
    ...[18.4, 14.3, 8.5, 0.6].flatMap((y) => [
        [[-15.6, y, TOWER_FRONT_Z], [-15.6, y, TOWER_REAR_Z]],
        [[15.6, y, TOWER_FRONT_Z], [15.6, y, TOWER_REAR_Z]],
    ]),
    // Frame around the main LED wall
    [[-10.5, 11.55, SCREEN_Z - 0.1], [10.5, 11.55, SCREEN_Z - 0.1]],
];

export function createTrussGeometry(bars = TRUSS_BARS) {
    const pieces = bars.map(([from, to]) => trussBar(from, to));
    const merged = mergeGeometries(pieces);
    pieces.forEach((p) => p.dispose());
    merged.computeBoundingSphere();
    return merged;
}
