'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { createCrowdTexture, CROWD_CANVAS } from './crowdTexture';

/**
 * The audience in front of the camera: one textured plane. It's opaque (alpha-tested), so it
 * writes depth and correctly hides the beams behind it. It stays 5 units in front of the camera
 * whichever shot the show cuts to, sways gently and jumps on the beat.
 */
export default function Crowd({ seed = 7, look, distance = 5, width = 15 }) {
    const texture = useMemo(() => createCrowdTexture(seed), [seed]);
    useEffect(() => () => texture.dispose(), [texture]);
    const mesh = useRef();
    const time = useRef(0);

    useFrame(({ camera }, delta) => {
        if (!mesh.current) return;
        time.current += delta;
        const target = look?.current;
        const energy = target ? Math.min(target.intensity, 1.5) : 1;
        const bob = Math.abs(Math.sin(time.current * 2.4)) * 0.03 * energy + (target?.pulse ?? 0) * 0.12;
        // Heads line up with the stage edge from the hero camera (y = 1.8 -> plane centre y = 1.75)
        mesh.current.position.set(camera.position.x * 0.92, camera.position.y - 0.05 + bob, camera.position.z - distance);
        mesh.current.rotation.y = Math.atan2(camera.position.x - mesh.current.position.x, distance);
    });

    return (
        <mesh ref={mesh} renderOrder={-1}>
            <planeGeometry args={[width, (width * CROWD_CANVAS.height) / CROWD_CANVAS.width]} />
            <meshBasicMaterial map={texture} alphaTest={0.5} toneMapped={false} />
        </mesh>
    );
}
