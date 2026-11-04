'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DECK_DEPTH, DECK_HEIGHT } from './trussGeometry';
import { roomFlash } from './flash';

// Item 3, option 1: the deck's front and sides dressed in black pleated stage skirt (instead of bare,
// lit-up board), with a thin LED strip along the top front edge in the show's two colours.
// Two draw calls; the pleats and the strip's colour drift are computed in the shaders.
const DECK_WIDTH = 30;
const HALF_W = DECK_WIDTH / 2;

function createSkirtGeometry() {
    const front = new THREE.PlaneGeometry(DECK_WIDTH, DECK_HEIGHT).translate(0, DECK_HEIGHT / 2, 0.006);
    const side = (sign) => new THREE.PlaneGeometry(DECK_DEPTH, DECK_HEIGHT)
        .rotateY(sign * Math.PI / 2)
        .translate(sign * (HALF_W + 0.006), DECK_HEIGHT / 2, -DECK_DEPTH / 2);
    return mergeGeometries([front, side(-1), side(1)]);
}

function createSkirtMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: new THREE.Color('#3b5bff') },
            uLight: { value: 0 },
            uFlash: { value: 0 },
        },
        vertexShader: /* glsl */ `
            varying vec3 vWorld;
            varying float vY;
            void main() {
                vec4 w = modelMatrix * vec4(position, 1.0);
                vWorld = w.xyz;
                vY = position.y / ${DECK_HEIGHT.toFixed(2)};
                gl_Position = projectionMatrix * viewMatrix * w;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform vec3 uColor;
            uniform float uLight;
            uniform float uFlash;
            varying vec3 vWorld;
            varying float vY;
            void main() {
                // Pleats every ~12 cm: soft folds catching a little light on one side
                float s = sin((vWorld.x + vWorld.z) * 52.0);
                float fold = 0.55 + 0.45 * s * s * sign(s + 0.3);
                // Darker toward the floor, a faint wash of the show's colour near the top edge
                vec3 base = vec3(0.012, 0.013, 0.017) * fold * (0.6 + 0.4 * vY);
                vec3 tint = uColor * 0.035 * uLight * vY * vY * fold;
                gl_FragColor = vec4(base + tint + vec3(0.05) * uFlash * fold, 1.0);
            }
        `,
    });
}

function createStripMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uColorA: { value: new THREE.Color('#19d9ff') },
            uColorB: { value: new THREE.Color('#ff3df2') },
            uLevel: { value: 0 },
        },
        vertexShader: /* glsl */ `
            varying float vX;
            void main() {
                vX = position.x / ${HALF_W.toFixed(1)};
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform vec3 uColorA;
            uniform vec3 uColorB;
            uniform float uLevel;
            varying float vX;
            void main() {
                // The two colours drift slowly along the edge, mirrored from the centre
                float m = 0.5 + 0.5 * sin(abs(vX) * 4.0 - uTime * 0.6);
                vec3 c = mix(uColorA, uColorB, m);
                gl_FragColor = vec4(c * uLevel, 1.0);
            }
        `,
        toneMapped: false,
    });
}

export default function StageSkirt({ look, blinders }) {
    const skirt = useMemo(() => ({ geometry: createSkirtGeometry(), material: createSkirtMaterial() }), []);
    const strip = useMemo(() => createStripMaterial(), []);
    const skirtMesh = useRef();
    const stripMesh = useRef();
    const colors = useRef({ a: new THREE.Color(), b: new THREE.Color() });

    useFrame(({ clock }) => {
        if (!skirtMesh.current || !stripMesh.current) return;
        const target = look.current;
        const t = clock.elapsedTime;
        const light = (target.master ?? 1) * Math.min(target.intensity, 1.4);

        const s = skirtMesh.current.material.uniforms;
        s.uColor.value.copy(colors.current.a.set(target.colorA).lerp(colors.current.b.set(target.colorB), 0.5));
        s.uLight.value = light;
        s.uFlash.value = Math.min(1, roomFlash(target, t, blinders).total);

        const u = stripMesh.current.material.uniforms;
        u.uTime.value = t;
        u.uColorA.value.set(target.colorA);
        u.uColorB.value.set(target.colorB);
        // Dim enough to read as an edge, not a light source; dark in a blackout, faint with the house lights up
        u.uLevel.value = 0.08 + 0.55 * light * (1 - 0.7 * (target.house ?? 0));
    });

    return (
        <>
            <mesh ref={skirtMesh} geometry={skirt.geometry} material={skirt.material} />
            <mesh ref={stripMesh} position={[0, DECK_HEIGHT - 0.02, 0.03]} material={strip}>
                <boxGeometry args={[DECK_WIDTH, 0.04, 0.04]} />
            </mesh>
        </>
    );
}
