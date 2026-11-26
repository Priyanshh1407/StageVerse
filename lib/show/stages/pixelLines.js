// Continuous LED lines from the stages' pixel bars. A stage lists its pixel bars one by one (1.6 m each, with gaps);
// on stage, every bar that has a neighbour in line with it is stretched to meet that neighbour, so a row of bars is
// drawn as one unbroken line of pixels (the chase already runs by world position, so it flows along the whole line).

const BAR = 1.6;

/** The direction a bar runs in (its local y axis) after its rotation (three.js Euler, order XYZ). */
export function barAxis(rot = [0, 0, 0]) {
    const [x, y, z] = rot;
    return [
        -Math.sin(z) * Math.cos(y),
        Math.cos(z) * Math.cos(x) - Math.sin(z) * Math.sin(y) * Math.sin(x),
        Math.cos(z) * Math.sin(x) + Math.sin(z) * Math.sin(y) * Math.cos(x),
    ];
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Each bar as a piece of a continuous line: { pos, rot, length }. A bar reaches halfway to the next bar in line
 * with it on either side (up to `reach` metres away); at the end of a line it keeps its own half length.
 */
export function continuousBars(bars, { reach = 6, bar = BAR } = {}) {
    const axes = bars.map((b) => barAxis(b.rot));
    return bars.map((b, i) => {
        const a = axes[i];
        let ahead = Infinity;
        let behind = Infinity;
        bars.forEach((o, j) => {
            if (j === i || Math.abs(dot(a, axes[j])) < 0.999) return;
            const d = [o.pos[0] - b.pos[0], o.pos[1] - b.pos[1], o.pos[2] - b.pos[2]];
            const along = dot(d, a);
            const off = Math.hypot(d[0] - a[0] * along, d[1] - a[1] * along, d[2] - a[2] * along);
            if (off > 0.05 || Math.abs(along) < 0.01 || Math.abs(along) > reach) return;
            if (along > 0) ahead = Math.min(ahead, along);
            else behind = Math.min(behind, -along);
        });
        const front = Number.isFinite(ahead) ? ahead / 2 : bar / 2;
        const back = Number.isFinite(behind) ? behind / 2 : bar / 2;
        const shift = (front - back) / 2;
        return { pos: b.pos.map((v, k) => v + a[k] * shift), rot: b.rot ?? [0, 0, 0], length: front + back };
    });
}
