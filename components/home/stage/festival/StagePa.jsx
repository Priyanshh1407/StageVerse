'use client';

// A copy of ../PaSystem.jsx for the festival stages (the homepage keeps the original, unchanged): the arrays and the subs are placed from `settings`.

import { useMemo } from 'react';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from 'three';

// The PA (item 13), as at big festivals:
// - Line arrays: 16 boxes flown just outside each side tower from an outrigger arm off the top of
//   the tower, curving into a "J" (the lower boxes angled further down toward the audience) and
//   turned a little toward the centre. Steel rigging frames down each side catch the light, so the
//   arrays read against the night sky.
// - Subwoofers: sub stacks on the ground along the front of the stage, below the deck
//   top (the stage is raised for this): separate stacks of 3 with gaps between them, with the
//   photo pit and the crowd barrier in front of them.
// Cabinets, grilles and steel are three merged geometries: 3 draw calls for the whole PA.
// where the arrays hang (just outside the towers) and the sub stacks stand: shared with rigLayout,
// which places the confetti cannons under the arrays and in the gaps between the middle stacks
const LINE_BOX = { w: 1.5, h: 0.42, d: 0.75 };
const SPLAY = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 7, 8, 9];  // degrees between boxes: straight at the top, curling at the bottom
const TOE_IN = 0.14;            // radians, turned toward the centre of the audience

const SUB = { w: 1.35, h: 0.55, d: 0.7 };   // touring sub proportions
const TOP_BOX = { w: 1.05, h: 0.38, d: 0.62 }; // a club's full-range box (on the sub stacks and in the small hangs)

function createPa(P) {
    // the line-array boxes scaled to the stage (P.SCALE: 1 = the homepage's)
    const BOX = { w: LINE_BOX.w * (P.SCALE ?? 1), h: LINE_BOX.h * (P.SCALE ?? 1), d: LINE_BOX.d * (P.SCALE ?? 1) };
    const cabinets = [];
    const grilles = [];
    const steel = [];
    const place = (g, matrix) => { g.applyMatrix4(matrix); g.deleteAttribute('uv'); return g; };
    const at = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);

    // (a stage without ARRAY_X has no line arrays: a club, see STACKS and HANGS below)
    for (const side of P.ARRAY_X === undefined ? [] : [-1, 1]) {
        const turn = new THREE.Matrix4().makeRotationY(-side * TOE_IN);
        const toWorld = (local) => at(side * P.ARRAY_X, P.TOP, P.ARRAY_Z).multiply(turn).multiply(local);

        // The boxes hinge at their rear top corners: each one hangs below the last, angled further down
        let angle = 0;
        const hinge = new THREE.Vector3(0, 0, -BOX.d / 2);   // rear top corner of the current box (array space)
        // (P.BOXES: more boxes on a bigger stage, the splay's last angle repeated)
        for (const deg of Array.from({ length: P.BOXES ?? SPLAY.length }, (_, k) => SPLAY[Math.min(k, SPLAY.length - 1)] * (P.BOXES > SPLAY.length ? SPLAY.length / P.BOXES : 1))) {
            // (P.CURVE scales the curl: below 1 the array hangs nearly straight, its bottom boxes not turned in so far)
            angle += THREE.MathUtils.degToRad(deg * (P.CURVE ?? 1));
            const rot = new THREE.Matrix4().makeRotationX(angle);
            const centre = hinge.clone().add(new THREE.Vector3(0, -BOX.h / 2, BOX.d / 2).applyMatrix4(rot));
            const local = at(centre.x, centre.y, centre.z).multiply(rot);
            cabinets.push(place(new THREE.BoxGeometry(BOX.w - 0.08, BOX.h - 0.014, BOX.d), toWorld(local)));
            grilles.push(place(new THREE.BoxGeometry(BOX.w - 0.14, BOX.h - 0.07, 0.012), toWorld(local.clone().multiply(at(0, 0, BOX.d / 2 + 0.006)))));
            // Rigging frames down both sides of the box
            for (const s of [-1, 1]) steel.push(place(new THREE.BoxGeometry(0.04, BOX.h - 0.01, BOX.d * 0.9), toWorld(local.clone().multiply(at(s * (BOX.w / 2 - 0.02), 0, -0.02)))));
            hinge.add(new THREE.Vector3(0, -BOX.h, 0).applyMatrix4(rot));
        }
        // Bumper (the frame the array hangs from) and the two hoist chains up to the outrigger
        steel.push(place(new THREE.BoxGeometry(BOX.w + 0.1, 0.1, BOX.d + 0.1), toWorld(at(0, 0.06, 0))));
        const len = P.TOP_Y - (P.TOP + 0.11);
        for (const z of [-0.25, 0.25]) steel.push(place(new THREE.CylinderGeometry(0.025, 0.025, len, 6), toWorld(at(0, 0.11 + len / 2, z))));
        // Outrigger: an arm out from the top of the tower, and a short one back to the front column
        const reach = P.ARRAY_X - P.TOWER_X + 0.5;
        steel.push(place(new THREE.BoxGeometry(reach, 0.14, 0.14), at(side * (P.TOWER_X + reach / 2 - 0.2), P.TOP_Y, P.ARRAY_Z)));
        steel.push(place(new THREE.BoxGeometry(0.14, 0.14, P.ARRAY_Z - P.TOWER_FRONT_Z), at(side * P.TOWER_X, P.TOP_Y, (P.ARRAY_Z + P.TOWER_FRONT_Z) / 2)));
    }

    // The subs along the front of the stage, styled after a large touring sub (two 18" drivers
    // side by side behind a full-width grille, steel rigging plates down both front edges)
    const front = SUB.d / 2;
    for (let i = 0; i < P.SUB_COUNT; i++) {
        const x = (i - (P.SUB_COUNT - 1) / 2) * P.SUB_PITCH;
        for (let j = 0; j < P.SUB_STACK; j++) {
            const m = at(x, SUB.h / 2 + j * SUB.h, P.SUB_Z);
            const on = (dx, dy, dz) => m.clone().multiply(at(dx, dy, dz));
            cabinets.push(place(new THREE.BoxGeometry(SUB.w, SUB.h - 0.02, SUB.d), m));
            grilles.push(place(new THREE.BoxGeometry(SUB.w - 0.14, SUB.h - 0.08, 0.012), on(0, 0, front + 0.006)));
            // The two drivers showing through the grille: dark cones with a lighter dust cap
            for (const dx of [-0.31, 0.31]) {
                cabinets.push(place(new THREE.CircleGeometry(0.2, 28), on(dx, 0, front + 0.014)));
                grilles.push(place(new THREE.CircleGeometry(0.065, 16), on(dx, 0, front + 0.016)));
            }
            // Rigging plates down both front edges
            for (const s of [-1, 1]) steel.push(place(new THREE.BoxGeometry(0.05, SUB.h - 0.03, 0.08), on(s * (SUB.w / 2 - 0.025), 0, front - 0.02)));
        }
    }
    // A club's PA: at each side of the stage a stack of subs on the floor with a few full-range boxes on top,
    // turned in at the dance floor (STACKS: { x, z, subs, tops, turn }, mirrored left and right) ...
    for (const stack of P.STACKS ?? []) {
        for (const side of [-1, 1]) {
            const base = at(side * stack.x, 0, stack.z).multiply(new THREE.Matrix4().makeRotationY(-side * (stack.turn ?? 0.3)));
            const on = (dx, dy, dz) => base.clone().multiply(at(dx, dy, dz));
            for (let j = 0; j < stack.subs; j++) {
                const y = SUB.h / 2 + j * SUB.h;
                cabinets.push(place(new THREE.BoxGeometry(SUB.w, SUB.h - 0.02, SUB.d), on(0, y, 0)));
                grilles.push(place(new THREE.BoxGeometry(SUB.w - 0.14, SUB.h - 0.08, 0.012), on(0, y, front + 0.006)));
                for (const dx of [-0.31, 0.31]) {
                    cabinets.push(place(new THREE.CircleGeometry(0.2, 28), on(dx, y, front + 0.014)));
                    grilles.push(place(new THREE.CircleGeometry(0.065, 16), on(dx, y, front + 0.016)));
                }
                for (const e of [-1, 1]) steel.push(place(new THREE.BoxGeometry(0.05, SUB.h - 0.03, 0.08), on(e * (SUB.w / 2 - 0.025), y, front - 0.02)));
            }
            for (let j = 0; j < stack.tops; j++) {
                const y = stack.subs * SUB.h + TOP_BOX.h / 2 + j * TOP_BOX.h;
                cabinets.push(place(new THREE.BoxGeometry(TOP_BOX.w, TOP_BOX.h - 0.015, TOP_BOX.d), on(0, y, 0)));
                grilles.push(place(new THREE.BoxGeometry(TOP_BOX.w - 0.1, TOP_BOX.h - 0.06, 0.012), on(0, y, TOP_BOX.d / 2 + 0.006)));
                for (const e of [-1, 1]) steel.push(place(new THREE.BoxGeometry(0.035, TOP_BOX.h - 0.02, TOP_BOX.d * 0.9), on(e * (TOP_BOX.w / 2 - 0.018), y, -0.01)));
            }
        }
    }
    // ... and a small cluster hung from the grid on each side, a few boxes curving down at the floor
    // (HANGS: { x, y (the top), z, boxes, grid (the height it hangs from) }, mirrored)
    for (const hang of P.HANGS ?? []) {
        for (const side of [-1, 1]) {
            const base = at(side * hang.x, hang.y, hang.z).multiply(new THREE.Matrix4().makeRotationY(-side * (hang.turn ?? 0.35)));
            let angle = 0.12;
            const hinge = new THREE.Vector3(0, 0, -TOP_BOX.d / 2);
            for (let j = 0; j < hang.boxes; j++) {
                angle += THREE.MathUtils.degToRad(5);
                const rot = new THREE.Matrix4().makeRotationX(angle);
                const centre = hinge.clone().add(new THREE.Vector3(0, -TOP_BOX.h / 2, TOP_BOX.d / 2).applyMatrix4(rot));
                const local = base.clone().multiply(at(centre.x, centre.y, centre.z)).multiply(rot);
                cabinets.push(place(new THREE.BoxGeometry(TOP_BOX.w, TOP_BOX.h - 0.015, TOP_BOX.d), local));
                grilles.push(place(new THREE.BoxGeometry(TOP_BOX.w - 0.1, TOP_BOX.h - 0.06, 0.012), local.clone().multiply(at(0, 0, TOP_BOX.d / 2 + 0.006))));
                for (const e of [-1, 1]) steel.push(place(new THREE.BoxGeometry(0.035, TOP_BOX.h - 0.02, TOP_BOX.d * 0.9), local.clone().multiply(at(e * (TOP_BOX.w / 2 - 0.018), 0, -0.01))));
                hinge.add(new THREE.Vector3(0, -TOP_BOX.h, 0).applyMatrix4(rot));
            }
            steel.push(place(new THREE.BoxGeometry(TOP_BOX.w + 0.08, 0.08, TOP_BOX.d + 0.08), base.clone().multiply(at(0, 0.05, 0))));
            const len = Math.max(0.1, hang.grid - hang.y - 0.09);
            for (const z of [-0.2, 0.2]) steel.push(place(new THREE.CylinderGeometry(0.02, 0.02, len, 6), base.clone().multiply(at(0, 0.09 + len / 2, z))));
        }
    }
    return { cabinets: mergeGeometries(cabinets), grilles: mergeGeometries(grilles), steel: mergeGeometries(steel) };
}


/**
 * `settings`: TOWER_X (the column the arrays hang off), TOP_Y (its top), TOWER_FRONT_Z, ARRAY_X, ARRAY_Z,
 * TOP (the top of each array), SUB_Z (the subs' centre line), SUB_PITCH, SUB_COUNT, SUB_STACK.
 * A club (no ARRAY_X): STACKS (subs with boxes on top at the sides) and HANGS (small clusters from the grid).
 */
export default function StagePa({ settings }) {
    const pa = useMemo(() => createPa(settings), [settings]);
    return (
        <>
            <mesh geometry={pa.cabinets}>
                <meshLambertMaterial color="#2b2e35" emissive="#06070a" />
            </mesh>
            {/* Grilles: perforated steel fronts, lighter than the cabinets */}
            <mesh geometry={pa.grilles}>
                <meshLambertMaterial color="#4d525c" emissive="#0a0b0e" />
            </mesh>
            {/* Rigging steel: the brightest part, outlining the arrays */}
            <mesh geometry={pa.steel}>
                <meshLambertMaterial color="#8d939e" emissive="#0c0d10" />
            </mesh>
        </>
    );
}
