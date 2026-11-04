'use client';

import { useMemo } from 'react';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import { TOWER_FRONT_Z } from './trussGeometry';

// Item 13: a visible PA. Left and right of the stage a line array (10 boxes) is flown just outside
// each side tower, hung from an outrigger arm off the top of the tower. It curves into a "J" (the
// lower boxes angled further down toward the audience) and is turned a little toward the centre,
// the way real arrays are hung. A stack of 3 subwoofers stands on the floor under each array.
// Cabinets and grilles are two merged geometries: 2 draw calls for the whole PA.
const TOWER_X = 15.6;           // side tower centre line
const ARRAY_X = 17.7;           // the arrays hang just outside the towers
const ARRAY_Z = TOWER_FRONT_Z + 1.4;
const TOP = 15.4;               // the top of the array (bumper underneath the outrigger)
const BOX = { w: 1.25, h: 0.36, d: 0.62 };
const SPLAY = [0, 1, 1, 2, 2, 3, 4, 5, 6, 7];  // degrees between boxes: straight at the top, curling at the bottom
const TOE_IN = 0.14;            // radians, turned toward the centre of the audience
const SUB = { w: 1.3, h: 0.66, d: 0.95 };

function createPa() {
    const cabinets = [];
    const grilles = [];
    const steel = [];
    const place = (g, matrix) => { g.applyMatrix4(matrix); g.deleteAttribute('uv'); return g; };

    for (const side of [-1, 1]) {
        const turn = new THREE.Matrix4().makeRotationY(-side * TOE_IN);
        const origin = new THREE.Vector3(side * ARRAY_X, TOP, ARRAY_Z);
        const toWorld = (local) => new THREE.Matrix4().makeTranslation(origin.x, origin.y, origin.z).multiply(turn).multiply(local);

        // The boxes hinge at their rear top corners: each one hangs below the last, angled further down
        let angle = 0;
        const hinge = new THREE.Vector3(0, 0, -BOX.d / 2);   // rear top corner of the current box (array space)
        for (const deg of SPLAY) {
            angle += THREE.MathUtils.degToRad(deg);
            const rot = new THREE.Matrix4().makeRotationX(angle);
            // centre = hinge + rotated offset from the rear top corner to the box centre
            const offset = new THREE.Vector3(0, -BOX.h / 2, BOX.d / 2).applyMatrix4(rot);
            const centre = hinge.clone().add(offset);
            const local = new THREE.Matrix4().makeTranslation(centre.x, centre.y, centre.z).multiply(rot);
            cabinets.push(place(new THREE.BoxGeometry(BOX.w, BOX.h - 0.012, BOX.d), toWorld(local)));
            const grille = new THREE.Matrix4().makeTranslation(0, 0, BOX.d / 2 + 0.006);
            grilles.push(place(new THREE.BoxGeometry(BOX.w - 0.06, BOX.h - 0.06, 0.01), toWorld(local.clone().multiply(grille))));
            hinge.add(new THREE.Vector3(0, -BOX.h, 0).applyMatrix4(rot));
        }
        // Bumper (the frame the array hangs from) and the two hoist chains up to the outrigger
        steel.push(place(new THREE.BoxGeometry(BOX.w + 0.1, 0.08, BOX.d + 0.1), toWorld(new THREE.Matrix4().makeTranslation(0, 0.05, 0))));
        for (const z of [-0.2, 0.2]) {
            const len = 18.4 - (TOP + 0.1);
            steel.push(place(new THREE.CylinderGeometry(0.02, 0.02, len, 6), toWorld(new THREE.Matrix4().makeTranslation(0, 0.1 + len / 2, z))));
        }
        // Outrigger: an arm out from the top of the tower, and a short one back to the front column
        const arm = new THREE.BoxGeometry(ARRAY_X - TOWER_X + 0.5, 0.12, 0.12);
        steel.push(place(arm, new THREE.Matrix4().makeTranslation(side * (TOWER_X + (ARRAY_X - TOWER_X + 0.5) / 2 - 0.2), 18.4, ARRAY_Z)));
        const back = new THREE.BoxGeometry(0.12, 0.12, ARRAY_Z - TOWER_FRONT_Z);
        steel.push(place(back, new THREE.Matrix4().makeTranslation(side * TOWER_X, 18.4, (ARRAY_Z + TOWER_FRONT_Z) / 2)));

        // Subwoofers: a stack of 3 on the floor under the array, facing the audience
        for (let i = 0; i < 3; i++) {
            const m = new THREE.Matrix4().makeTranslation(side * ARRAY_X, SUB.h / 2 + i * SUB.h, ARRAY_Z + 0.2);
            cabinets.push(place(new THREE.BoxGeometry(SUB.w, SUB.h - 0.012, SUB.d), m));
            grilles.push(place(new THREE.BoxGeometry(SUB.w - 0.08, SUB.h - 0.08, 0.01), m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, SUB.d / 2 + 0.006))));
        }
    }
    return {
        cabinets: mergeGeometries([...cabinets, ...steel]),
        grilles: mergeGeometries(grilles),
    };
}

export default function PaSystem() {
    const pa = useMemo(() => createPa(), []);
    return (
        <>
            <mesh geometry={pa.cabinets}>
                <meshLambertMaterial color="#202228" emissive="#050608" />
            </mesh>
            {/* Grilles: perforated steel fronts, a shade lighter and catching the light */}
            <mesh geometry={pa.grilles}>
                <meshLambertMaterial color="#34373f" emissive="#07080a" />
            </mesh>
        </>
    );
}
