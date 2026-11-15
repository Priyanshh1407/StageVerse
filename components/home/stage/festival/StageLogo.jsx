'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

// The StageVerse logo as a lit sign on a festival stage: "Stage" in the sprayed face (white, with magenta and
// cyan offsets) and "Verse" in the script face (sunset gradient), on one line, drawn into a texture once the
// logo's fonts have loaded. One draw call.

function drawLogo(canvas, fonts) {
    const ctx = canvas.getContext('2d');
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    ctx.textBaseline = 'middle';
    const size = h * 0.62;
    // "Stage"
    ctx.save();
    ctx.translate(w * 0.27, h * 0.5);
    ctx.rotate(-0.07);
    ctx.textAlign = 'center';
    ctx.font = `${size}px ${fonts.tag}, sans-serif`;
    ctx.fillStyle = '#ff3df2';
    ctx.fillText('Stage', size * 0.035, size * 0.035);
    ctx.fillStyle = '#19d9ff';
    ctx.fillText('Stage', -size * 0.025, -size * 0.025);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Stage', 0, 0);
    ctx.restore();
    // "Verse"
    const gradient = ctx.createLinearGradient(0, h * 0.2, 0, h * 0.85);
    gradient.addColorStop(0, '#ffe066');
    gradient.addColorStop(0.4, '#ffb000');
    gradient.addColorStop(0.7, '#ff6a00');
    gradient.addColorStop(1, '#ff3d7a');
    ctx.textAlign = 'center';
    ctx.font = `${size * 1.08}px ${fonts.script}, cursive`;
    ctx.fillStyle = gradient;
    ctx.fillText('Verse', w * 0.71, h * 0.56);
}

/** Draw the logo into the canvas and tell the texture to upload it again. */
function paint(canvas, texture, fonts) {
    drawLogo(canvas, fonts);
    texture.needsUpdate = true;
}

export default function StageLogo({ position, size, logoFonts }) {
    const { canvas, texture } = useMemo(() => {
        const c = document.createElement('canvas');
        c.width = 1024;
        c.height = Math.round((1024 * size[1]) / size[0]);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        return { canvas: c, texture: t };
    }, [size]);

    useEffect(() => {
        let cancelled = false;
        const draw = () => {
            if (!cancelled) paint(canvas, texture, logoFonts);
        };
        const faces = [`400 100px ${logoFonts.tag}`, `400 100px ${logoFonts.script}`];
        if (document.fonts?.load) Promise.all(faces.map((f) => document.fonts.load(f))).then(draw, draw);
        else draw();
        return () => { cancelled = true; };
    }, [canvas, texture, logoFonts]);
    useEffect(() => () => texture.dispose(), [texture]);

    return (
        <mesh position={position}>
            <planeGeometry args={size} />
            <meshBasicMaterial map={texture} transparent toneMapped={false} color={new THREE.Color(1.6, 1.6, 1.6)} depthWrite={false} />
        </mesh>
    );
}
