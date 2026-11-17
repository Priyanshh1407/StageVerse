import * as THREE from 'three';

// One subwoofer cabinet, for every stage's PA (the homepage's own and the festival stages'): styled after a large
// touring sub. A black cabinet; a dark charcoal grille across the whole front, inset in a thin frame of the
// cabinet; two 18" drivers showing faintly through it (a shadowed cone, the surround ring round it, the dust cap);
// a recessed handle on each side; a darker skid strip along the bottom. Built into three lists (body, grille,
// trim), each merged into one mesh by its PA, so a whole line of subs is three draw calls.

export const SUB_COLORS = { body: '#111317', grille: '#1e2127', trim: '#353943' };

const place = (g, matrix) => {
    g.applyMatrix4(matrix);
    g.deleteAttribute('uv');
    return g;
};
const at = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);

/** Add one sub, centred on `matrix` and facing +z, of size `SUB` ({ w, h, d }), to `parts` ({ body, grille, trim }). */
export function addSub(parts, matrix, SUB) {
    const on = (dx, dy, dz) => matrix.clone().multiply(at(dx, dy, dz));
    const front = SUB.d / 2;
    parts.body.push(place(new THREE.BoxGeometry(SUB.w, SUB.h - 0.02, SUB.d), matrix));
    // the grille, inset in a thin frame of the cabinet
    parts.grille.push(place(new THREE.BoxGeometry(SUB.w - 0.07, SUB.h - 0.08, 0.016), on(0, 0, front + 0.008)));
    // the drivers, seen through the grille: subtle, close to its colour
    for (const dx of [-SUB.w * 0.23, SUB.w * 0.23]) {
        parts.body.push(place(new THREE.CircleGeometry(SUB.h * 0.34, 32), on(dx, 0, front + 0.0175)));
        parts.trim.push(place(new THREE.RingGeometry(SUB.h * 0.34, SUB.h * 0.39, 32), on(dx, 0, front + 0.018)));
        parts.trim.push(place(new THREE.CircleGeometry(SUB.h * 0.1, 20), on(dx, 0, front + 0.0185)));
    }
    // recessed handles on both sides
    for (const s of [-1, 1]) parts.trim.push(place(new THREE.BoxGeometry(0.012, SUB.h * 0.22, SUB.d * 0.32), on(s * (SUB.w / 2 + 0.004), SUB.h * 0.12, 0)));
    // the skid strip along the bottom of the front
    parts.trim.push(place(new THREE.BoxGeometry(SUB.w - 0.02, 0.025, 0.02), on(0, -SUB.h / 2 + 0.023, front + 0.006)));
}

/** The three merged meshes' geometries (null when there are no subs). */
export function mergeSubs(parts, merge) {
    return parts.body.length ? { body: merge(parts.body), grille: merge(parts.grille), trim: merge(parts.trim) } : null;
}
