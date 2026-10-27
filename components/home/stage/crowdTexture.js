import * as THREE from 'three';

// Crowd silhouettes drawn into a canvas once: backs of heads, shoulders, about a third with
// arms up, a few holding glowing phones. Seeded, so the same seed always draws the same crowd.

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

/** Where every person in the crowd goes; pure data, so it can be tested without a canvas. */
export const CROWD_CANVAS = { width: 2048, height: 400 };

export function crowdPeople(seed, { width = CROWD_CANVAS.width, height = CROWD_CANVAS.height } = {}) {
    const rand = seededRandom(seed);
    const people = [];
    // Back row (smaller, further away) first, then the front row on top
    // Front-row heads land at ~40% of the height, so they overlap the lit stage edge, not the dark floor
    for (const row of [{ scale: 1.1, baseline: height * 0.62, spacing: 60, shade: '#06070e' }, { scale: 1.55, baseline: height + 10, spacing: 92, shade: '#000000' }]) {
        for (let x = -20; x < width + 20; x += row.spacing * (0.75 + rand() * 0.5)) {
            const r = (22 + rand() * 8) * row.scale;
            const armsUp = rand() < 0.33;
            people.push({
                x, r, baseline: row.baseline, shade: row.shade,
                armsUp,
                arms: armsUp ? (rand() < 0.5 ? 'one' : 'both') : 'none',
                reach: 5.2 + rand() * 1.6,
                lean: (rand() - 0.5) * 1.2,
                phone: armsUp && rand() < 0.25,
            });
        }
    }
    return people;
}

export function createCrowdTexture(seed = 7) {
    const { width, height } = CROWD_CANVAS;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';

    for (const p of crowdPeople(seed, { width, height })) {
        const { x, r, baseline } = p;
        ctx.fillStyle = p.shade;
        ctx.strokeStyle = p.shade;
        // Shoulders and head
        ctx.beginPath();
        ctx.ellipse(x, baseline - r * 0.6, r * 1.7, r * 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, baseline - r * 2.7, r, 0, Math.PI * 2);
        ctx.fill();

        // Raised arms
        const arms = p.arms === 'both' ? [-1, 1] : p.arms === 'one' ? [p.lean >= 0 ? 1 : -1] : [];
        ctx.lineWidth = r * 0.55;
        for (const side of arms) {
            const sx = x + side * r * 1.25;
            const sy = baseline - r * 1.7;
            const hx = x + side * r * (0.7 + Math.abs(p.lean)) ;
            const hy = baseline - r * p.reach;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(hx, hy);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(hx, hy, r * 0.33, 0, Math.PI * 2);
            ctx.fill();
            if (p.phone && side === arms[0]) {
                ctx.fillStyle = '#e8f6ff'; // a phone screen catching the light
                ctx.fillRect(hx - r * 0.25, hy - r * 0.95, r * 0.5, r * 0.8);
                ctx.fillStyle = p.shade;
            }
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}
