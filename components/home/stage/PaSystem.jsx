'use client';

import { useMemo } from 'react';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import { DECK_HEIGHT, TOP_Y, TOWER_FRONT_Z } from './trussGeometry';

// The PA (item 13), as at big festivals:
// - Line arrays: 16 boxes flown just outside each side tower from an outrigger arm off the top of
//   the tower, curving into a "J" (the lower boxes angled further down toward the audience) and
//   turned a little toward the centre. Steel rigging frames down each side catch the light, so the
//   arrays read against the night sky.
// - Subwoofers: sub stacks on the ground along the front of the stage, below the deck
//   top (the stage is raised for this): separate stacks of 3 with gaps between them, with the
//   photo pit and the crowd barrier in front of them.
// Cabinets, grilles and steel are three merged geometries: 3 draw calls for the whole PA.
const TOWER_X = 15.6;           // side tower centre line
const ARRAY_X = 18.3;           // the arrays hang just outside the towers
const ARRAY_Z = TOWER_FRONT_Z + 1.4;
const TOP = 16.6;               // the top of the array (bumper underneath the outrigger)
const BOX = { w: 1.5, h: 0.42, d: 0.75 };
const SPLAY = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 7, 8, 9];  // degrees between boxes: straight at the top, curling at the bottom
const TOE_IN = 0.14;            // radians, turned toward the centre of the audience

const SUB = { w: 1.35, h: 0.55, d: 0.7 };   // touring sub proportions
const SUB_STACK = 3;            // 3 high (1.65 m) still stays under the deck top, so the stage edge shows
const SUB_COUNT = 12;           // separate stacks across the front of the stage
const SUB_PITCH = 2.4;          // centre to centre: about a metre of gap between stacks
const SUB_Z = 0.06 + SUB.d / 2; // just in front of the deck
export const SUB_FRONT_Z = SUB_Z + SUB.d / 2;
export const BARRIER_Z = SUB_FRONT_Z + 2.4;   // the photo pit between the subs and the barrier

function createPa() {
    const cabinets = [];
    const grilles = [];
    const steel = [];
    const place = (g, matrix) => { g.applyMatrix4(matrix); g.deleteAttribute('uv'); return g; };
    const at = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);

    for (const side of [-1, 1]) {
        const turn = new THREE.Matrix4().makeRotationY(-side * TOE_IN);
        const toWorld = (local) => at(side * ARRAY_X, TOP, ARRAY_Z).multiply(turn).multiply(local);

        // The boxes hinge at their rear top corners: each one hangs below the last, angled further down
        let angle = 0;
        const hinge = new THREE.Vector3(0, 0, -BOX.d / 2);   // rear top corner of the current box (array space)
        for (const deg of SPLAY) {
            angle += THREE.MathUtils.degToRad(deg);
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
        const len = TOP_Y - (TOP + 0.11);
        for (const z of [-0.25, 0.25]) steel.push(place(new THREE.CylinderGeometry(0.025, 0.025, len, 6), toWorld(at(0, 0.11 + len / 2, z))));
        // Outrigger: an arm out from the top of the tower, and a short one back to the front column
        const reach = ARRAY_X - TOWER_X + 0.5;
        steel.push(place(new THREE.BoxGeometry(reach, 0.14, 0.14), at(side * (TOWER_X + reach / 2 - 0.2), TOP_Y, ARRAY_Z)));
        steel.push(place(new THREE.BoxGeometry(0.14, 0.14, ARRAY_Z - TOWER_FRONT_Z), at(side * TOWER_X, TOP_Y, (ARRAY_Z + TOWER_FRONT_Z) / 2)));
    }

    // The subs along the front of the stage, styled after a large touring sub (two 18" drivers
    // side by side behind a full-width grille, steel rigging plates down both front edges)
    const front = SUB.d / 2;
    for (let i = 0; i < SUB_COUNT; i++) {
        const x = (i - (SUB_COUNT - 1) / 2) * SUB_PITCH;
        for (let j = 0; j < SUB_STACK; j++) {
            const m = at(x, SUB.h / 2 + j * SUB.h, SUB_Z);
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
    return { cabinets: mergeGeometries(cabinets), grilles: mergeGeometries(grilles), steel: mergeGeometries(steel) };
}

// The subs have to stay under the deck top, or they'd cover the floor fixtures
if (SUB.h * SUB_STACK > DECK_HEIGHT) throw new Error('PA: the sub stacks are taller than the stage');

export default function PaSystem() {
    const pa = useMemo(() => createPa(), []);
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
