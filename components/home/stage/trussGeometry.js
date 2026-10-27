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
export const TRUSS_BARS = [
    // Top truss carrying the top fan, spanning between the towers
    [[-15.6, 16.6, -6], [15.6, 16.6, -6]],
    // Side towers (stage left / right) and their tops
    [[-15.6, 0, -4], [-15.6, 17, -4]],
    [[15.6, 0, -4], [15.6, 17, -4]],
    [[-15.6, 16.6, -4], [-15.6, 16.6, -6]],
    [[15.6, 16.6, -4], [15.6, 16.6, -6]],
    // Front truss
    [[-13, 13.1, -3], [13, 13.1, -3]],
    // Mid-row trusses inside the stage frame, with their posts
    [[-10.5, 11.6, -10], [10.5, 11.6, -10]],
    [[-10.5, 9.1, -10], [10.5, 9.1, -10]],
    [[-10.5, 0, -10], [-10.5, 12, -10]],
    [[10.5, 0, -10], [10.5, 12, -10]],
    // Frame around the main LED wall
    [[-10.5, 12.2, -12.6], [10.5, 12.2, -12.6]],
];

export function createTrussGeometry(bars = TRUSS_BARS) {
    const pieces = bars.map(([from, to]) => trussBar(from, to));
    const merged = mergeGeometries(pieces);
    pieces.forEach((p) => p.dispose());
    merged.computeBoundingSphere();
    return merged;
}
