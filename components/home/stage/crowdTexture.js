import * as THREE from 'three';

// The audience: heads and the tops of shoulders only, drawn into a canvas once. Seeded, so the
// same seed always draws the same crowd. Three rows, smaller toward the back, for depth.

export const CROWD_CANVAS = { width: 2048, height: 256 };

/** Small deterministic PRNG (mulberry32): returns a function giving floats in [0, 1). */
export function seededRandom(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Where every head goes; pure data, so it can be tested without a canvas. */
export function crowdPeople(seed, { width = CROWD_CANVAS.width, height = CROWD_CANVAS.height } = {}) {
    const rand = seededRandom(seed);
    const people = [];
    const rows = [
        { r: 9, top: height * 0.02, spacing: 17 },    // far back: small heads by the stage
        { r: 15, top: height * 0.14, spacing: 29 },   // middle
        { r: 34, top: height * 0.3, spacing: 64 },    // front row
    ];
    rows.forEach((row, rowIndex) => {
        for (let x = -30; x < width + 30; x += row.spacing * (0.7 + rand() * 0.6)) {
            const r = row.r * (0.85 + rand() * 0.3);
            people.push({
                row: rowIndex,
                x,
                r,
                headY: row.top + r + rand() * row.r * 0.5, // heads at slightly different heights
                tilt: (rand() - 0.5) * 0.25,
            });
        }
    });
    return people;
}

/** White silhouettes on transparent: the shader colours them (dark, with a rim light). */
export function createCrowdTexture(seed = 7) {
    const { width, height } = CROWD_CANVAS;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';

    for (const p of crowdPeople(seed, { width, height })) {
        // Head (slightly taller than wide), neck, then shoulders running off the bottom edge
        ctx.beginPath();
        ctx.ellipse(p.x, p.headY, p.r * 0.82, p.r, p.tilt, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(p.x - p.r * 0.4, p.headY, p.r * 0.8, p.r * 1.3);
        ctx.beginPath();
        ctx.ellipse(p.x, p.headY + p.r * 2.4, p.r * 2.1, p.r * 1.2, 0, Math.PI, 0);
        ctx.lineTo(p.x + p.r * 2.1, height);
        ctx.lineTo(p.x - p.r * 2.1, height);
        ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}
