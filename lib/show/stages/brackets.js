// Brackets: every fixture of a layout attached to its structure. A fixture standing off the nearest surface (the wall
// top, the crown, a fin's edge) gets a short pipe from where it sits to the nearest point of that surface, so nothing
// hangs in the air; fixtures already on a surface get none. The fixtures stay where they are (the shows aim from
// there).

const sub = (a, b) => a.map((v, i) => v - b[i]);
const add = (a, b) => a.map((v, i) => v + b[i]);
const scale = (a, k) => a.map((v) => v * k);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(...a);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function closestOnSegment(p, a, b) {
    const ab = sub(b, a);
    const t = clamp(dot(sub(p, a), ab) / (dot(ab, ab) || 1), 0, 1);
    return add(a, scale(ab, t));
}

function inPolygon(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
}

/** The point of one structure piece nearest to p, or null for kinds that carry nothing. */
export function closestPoint(p, s) {
    if (s.kind === 'box') return p.map((v, i) => clamp(v, s.position[i] - s.size[i] / 2, s.position[i] + s.size[i] / 2));
    if (s.kind === 'truss') {
        const c = closestOnSegment(p, s.from, s.to);
        const d = sub(p, c);
        const r = (s.size ?? 0.5) / 2;
        return len(d) <= r ? p : add(c, scale(d, r / len(d)));
    }
    if (s.kind === 'rod') {
        const c = closestOnSegment(p, s.from, s.to);
        const d = sub(p, c);
        const r = s.radius?.[0] ?? 0.06;
        return len(d) <= r ? p : add(c, scale(d, r / len(d)));
    }
    if (s.kind === 'panel') {
        // a flat outline (x, y above its base) extruded `depth` along z around `z`
        const base = s.base ?? 0;
        const z = clamp(p[2], s.z - (s.depth ?? 0.5) / 2, s.z + (s.depth ?? 0.5) / 2);
        const y = p[1] - base;
        if (inPolygon(p[0], y, s.outline)) return [p[0], p[1], z];
        let best = null;
        s.outline.forEach((a, i) => {
            const b = s.outline[(i + 1) % s.outline.length];
            const c = closestOnSegment([p[0], y, 0], [a[0], a[1], 0], [b[0], b[1], 0]);
            if (!best || len(sub(c, [p[0], y, 0])) < len(sub(best, [p[0], y, 0]))) best = c;
        });
        return [best[0], best[1] + base, z];
    }
    return null;
}

/** The nearest point of the whole structure (and the ground) to p: { point, distance }. */
export function nearestStructure(p, structure) {
    let best = { point: [p[0], 0, p[2]], distance: Math.max(0, p[1]) };
    for (const s of structure) {
        if (s.drawnBy === 'barrier') continue;
        const c = closestPoint(p, s);
        if (!c) continue;
        const d = len(sub(p, c));
        if (d < best.distance) best = { point: c, distance: d };
    }
    return best;
}

/**
 * A pipe (a dark rod) for every fixture further than `gap` metres from the structure, from the fixture to the nearest
 * surface. `skip`: fixture types that stand on the ground on purpose (firework mortars, haze machines).
 */
export function bracketsFor(fixtures, structure, { gap = 0.3, skip = ['shell', 'haze'], radius = 0.06, color = '#1a1d24' } = {}) {
    const out = [];
    for (const f of fixtures) {
        if (skip.includes(f.type)) continue;
        const { point, distance } = nearestStructure(f.pos, structure);
        if (distance <= gap) continue;
        out.push({ kind: 'rod', from: f.pos, to: point, radius: [radius, radius], color, bracket: true });
    }
    return out;
}
