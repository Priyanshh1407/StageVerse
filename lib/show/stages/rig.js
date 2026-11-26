// A stage definition turned into what the stage components draw: the moving heads in the shape the
// beam shader takes (base pan and tilt, mount, phase, colour, beat number), thinned to a light count
// evenly across every role, and the effect mounts in the numbers the shows fire (6 floor CO2 jets,
// 4 high ones, 4 confetti cannons, 3 streamer launchers). Pure: the tests check it.

import { CO2_JETS, CO2_TRUSS_JETS } from '../co2.js';
import { CONFETTI_UNITS, STREAMER_UNITS } from '../confetti.js';
import { ROLES } from './index.js';

const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };

/** Evenly spaced picks from a list (all of it if it is shorter). */
export function evenly(list, n) {
    if (list.length <= n) return list;
    return Array.from({ length: n }, (_, i) => list[Math.round((i * (list.length - 1)) / Math.max(1, n - 1))]);
}

/**
 * n heads picked evenly and as mirror images: the same number on the left and the right, each left one the mirror of a
 * right one (heads on the centre line kept first), so a thinned rig stays symmetric. A list with heads that have no
 * mirror image is picked evenly as it is.
 */
export function symmetric(list, n) {
    if (list.length <= n) return list;
    const near = (a, b) => Math.abs(a - b) < 0.05;
    const mirror = (h) => list.find((g) => g !== h && near(g.pos[0], -h.pos[0]) && near(g.pos[1], h.pos[1]) && near(g.pos[2], h.pos[2]));
    // heads on the centre line, and the odd one with no mirror image (a follow spot on a tower to one side): kept first
    const single = list.filter((h) => Math.abs(h.pos[0]) <= 0.05 || !mirror(h));
    // (in the rig's own order, as the shows number it, so the picks spread over every part of the group: picked in order
    // across the stage, the crown's beams were all dropped)
    const right = list.filter((h) => h.pos[0] > 0.05 && mirror(h)).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    const keepSingle = single.slice(0, Math.min(single.length, n));
    const pairs = Math.max(0, Math.floor((n - keepSingle.length) / 2));
    const chosen = new Set([...keepSingle, ...evenly(right, pairs).flatMap((h) => [h, mirror(h)])]);
    return list.filter((h) => chosen.has(h));
}

/**
 * Exactly n mounts from a list sorted left to right: evenly picked when there are more, and when
 * there are fewer, extra ones placed evenly between the outermost (same height and depth as their
 * nearest), so every unit a show fires has somewhere to fire from.
 */
export function mountsOf(list, n) {
    const sorted = [...list].sort((a, b) => a.pos[0] - b.pos[0]);
    if (sorted.length >= n) return evenly(sorted, n);
    const [first, last] = [sorted[0].pos[0], sorted.at(-1).pos[0]];
    return Array.from({ length: n }, (_, i) => {
        const x = n === 1 ? (first + last) / 2 : first + ((last - first) * i) / (n - 1);
        const near = sorted.reduce((a, b) => (Math.abs(b.pos[0] - x) < Math.abs(a.pos[0] - x) ? b : a));
        return { ...near, pos: [x, near.pos[1], near.pos[2]] };
    });
}

/** One head in the beam shader's terms. Pan and tilt are world directions (tilt 0 = straight down). */
function toFixture(head, phase) {
    const [ax, ay, az] = head.aim;
    let up = [0, 1, 0];
    let xAxis = [1, 0, 0];
    if (head.role === 'sides') {
        // clamped to an upright truss: the base on the truss, the head towards where it points
        up = Math.hypot(ax, az) > 0.05 ? norm([ax, 0, az]) : [-Math.sign(head.pos[0]) || 1, 0, 0];
        xAxis = [0, 1, 0];
    } else if (ay < -0.2 && head.mount !== 'standing') {
        up = [0, -1, 0]; // hanging under a truss (heads standing on top of the structure stay upright)
    }
    return {
        role: head.role,
        position: head.pos,
        up,
        xAxis,
        pan: Math.atan2(ax, az),
        tilt: Math.acos(Math.max(-1, Math.min(1, -ay))),
        phase,
        colorMix: head.index % 2,
        beatIndex: head.index,
        type: head.type,
    };
}

/**
 * The moving heads for `count` lights (all of them when count is larger): every role keeps its share
 * of the count, picked evenly along it, so a smaller rig is thinner everywhere and no role goes dark.
 */
export function rigHeads(stage, count = Infinity) {
    // the spots are their own group: sharp beams on the performers
    const groupOf = (h) => (h.type === 'spot' ? 'spot' : h.role);
    // The floor row is never thinned: a missing floor beam leaves a hole in a straight row along the deck front,
    // in every cue (the mainstage at 160 lost one in front of its right fins). The other groups share the rest.
    // (a stage may name more heads that are always drawn: stage.alwaysDrawn, e.g. the mainstage's crown)
    const fixed = (h) => groupOf(h) === 'floor' || Boolean(stage.alwaysDrawn?.(h));
    const always = stage.heads.filter(fixed).length;
    const total = stage.heads.length - always;
    const room = Math.max(0, count - always);
    const fixtures = [...ROLES, 'spot'].flatMap((role) => {
        const all = stage.heads.filter((h) => groupOf(h) === role).map((h) => ({ ...h, role })).sort((a, b) => a.index - b.index);
        const kept = all.filter(fixed);
        const mine = all.filter((h) => !fixed(h));
        const keep = room >= total ? mine.length : Math.max(mine.length ? 1 : 0, Math.round((room * mine.length) / total));
        // (thinned as mirror images, so a smaller rig has as many on the left as on the right; the always-drawn ones
        // added back, in the group's own order)
        const chosen = new Set([...kept, ...symmetric(mine, keep)]);
        const picked = all.filter((h) => chosen.has(h)).map((h, i) => ({ ...h, index: i }));
        return picked.map((h, i) => toFixture(h, picked.length > 1 ? i / (picked.length - 1) : 0));
    });
    // (the mainstage only: its aerial and floor rows as one rig; the other stages keep each row's own order)
    return stage.headTune?.oneRig ? asOneSystem(fixtures) : fixtures;
}

/**
 * The aerial and floor beams as one rig: each beam's place in a movement (its phase) is where it stands across
 * the stage, the same scale for both rows, so a wave or a sweep passes the aerial beam and the floor beam at the
 * same spot at the same moment; odd and even (the alternate cue and the two colours) by the same left-to-right
 * order across both rows. (Each row counted its own beams before, so the two rows moved and swapped colours out
 * of step.)
 */
export function asOneSystem(fixtures) {
    // (the side lights join the columns' odd/even and colours too, so the odd-even chop splits the whole rig cleanly)
    const rig = fixtures.filter((f) => f.role === 'aerial' || f.role === 'floor' || f.role === 'sides');
    if (rig.length < 2) return fixtures;
    const xs = rig.map((f) => f.position[0]);
    const lo = Math.min(...xs);
    const span = Math.max(...xs) - lo || 1;
    // odd and even: each row (aerial, floor, sides) counted from the middle of the stage outwards on each side, nearest
    // first (a column of beams at one spot counted bottom to top), so neighbours always alternate and the left half is
    // the right half's mirror image. (Counting columns across the whole rig gave neighbours the same number and the two
    // halves different ones.)
    const rank = new Map();
    for (const role of ['aerial', 'floor', 'sides']) {
        for (const side of [-1, 1]) {
            const half = rig.filter((f) => f.role === role && (side < 0 ? f.position[0] < 0 : f.position[0] >= 0));
            half.sort((a, b) => Math.abs(a.position[0]) - Math.abs(b.position[0]) || a.position[1] - b.position[1] || a.position[2] - b.position[2]);
            half.forEach((f, i) => rank.set(f, i));
        }
    }
    return fixtures.map((f) => {
        if (f.role !== 'aerial' && f.role !== 'floor' && f.role !== 'sides') return f;
        const c = rank.get(f);
        // (the side lights keep their own movement: only their odd/even and colour follow the count)
        return f.role === 'sides' ? { ...f, colorMix: c % 2, beatIndex: c } : { ...f, phase: (f.position[0] - lo) / span, colorMix: c % 2, beatIndex: c };
    });
}

/** Everything else the stage components need, from the definition. */
export function stageMounts(stage) {
    const low = (f) => f.pos[1] <= stage.deck + 1;
    // a confetti cannon fires up and a little in towards the middle; a stage may turn its outer ones further towards the
    // audience (stage.cannonForward: beyond that many metres out, that much more forward)
    const forward = stage.cannonForward;
    const cannonAim = (x) => (forward && Math.abs(x) > forward.beyond ? norm([-x * 0.004, 1.2, forward.z]) : norm([-x * 0.006, 1.4, 1]));
    const co2 = stage.effects.co2;
    const floorJets = mountsOf(co2.filter(low), CO2_JETS).map((j) => ({ pos: j.pos, dir: norm([0, 1, 0.05]) }));
    // the high jets point out over the crowd and down (40 degrees), the outer ones fanning out a little
    const highList = co2.filter((f) => !low(f));
    const highJets = mountsOf(highList.length ? highList : co2, CO2_TRUSS_JETS).map((j) => ({
        pos: j.pos, dir: norm([(j.pos[0] / 30) * 0.12, -Math.sin((40 * Math.PI) / 180), Math.cos((40 * Math.PI) / 180)]),
    }));
    const cannons = !stage.effects.confetti.length ? [] : mountsOf(stage.effects.confetti, CONFETTI_UNITS).map((c) => {
        const dir = cannonAim(c.pos[0]);
        const base = [c.pos[0], c.pos[1] - 0.3, c.pos[2]];
        return { pos: base.map((v, k) => v + 0.1 * (k === 1) + dir[k] * 0.9), dir, base, spot: 'front' };
    });
    const span = Math.max(...stage.effects.streamer.map((s) => Math.abs(s.pos[0])), 1);
    const launchers = !stage.effects.streamer.length ? [] : mountsOf(stage.effects.streamer, STREAMER_UNITS).map((l) => {
        const dir = norm([(l.pos[0] / span) * 0.4, 0.3, 1]);
        const base = [l.pos[0], l.pos[1], l.pos[2]];
        return { pos: base.map((v, k) => v + 0.1 * (k === 1) + dir[k] * 0.75), dir, base };
    });
    // (stage.moreEffects: every confetti cannon and streamer launcher fires, in sets of the units the shows fire,
    // each set spanning the stage left to right, all firing together)
    // (every set takes every k-th mount, so the sets never share one: set 0 is the stage's usual set)
    // (`most`: how many sets at most, picked evenly across them so the ones that fire still span the stage)
    // (`most`: how many sets at most: the mounts that fire are then picked evenly along the stage first)
    const setsOf = (list, units, make, most = Infinity) => {
        const all = [...list].sort((a, b) => a.pos[0] - b.pos[0]);
        const k = Math.min(Math.floor(all.length / units), most);
        if (!stage.moreEffects || k < 2) return null;
        const sorted = evenly(all, k * units);
        return Array.from({ length: k }, (_, j) => Array.from({ length: units }, (_, u) => make(sorted[j + u * k])));
    };
    const cannon = (c) => {
        const dir = cannonAim(c.pos[0]);
        const base = [c.pos[0], c.pos[1] - 0.3, c.pos[2]];
        return { pos: base.map((v, k) => v + 0.1 * (k === 1) + dir[k] * 0.9), dir, base, spot: 'front' };
    };
    const launcher = (l) => {
        const dir = norm([(l.pos[0] / span) * 0.4, 0.3, 1]);
        const base = [l.pos[0], l.pos[1], l.pos[2]];
        return { pos: base.map((v, k) => v + 0.1 * (k === 1) + dir[k] * 0.75), dir, base };
    };
    const cannonSets = setsOf(stage.effects.confetti, CONFETTI_UNITS, cannon);
    const launcherSets = setsOf(stage.effects.streamer, STREAMER_UNITS, launcher, stage.streamerSets);
    return {
        moreCannons: cannonSets ? cannonSets.slice(1) : [],
        moreLaunchers: launcherSets ? launcherSets.slice(1) : [],
        floorJets,
        highJets,
        cannons: cannonSets ? cannonSets[0] : cannons,
        launchers: launcherSets ? launcherSets[0] : launchers,
        // strobe panels and blinders both light as strobes ([x, y, z, rotation about z])
        strobes: [...stage.strobes, ...stage.blinders].map((s) => [...s.pos, s.rot?.[2] ?? 0]),
        lasers: stage.lasers.map((l) => ({ pos: l.pos, tower: low(l) ? 0 : 1, side: Math.sign(l.pos[0]) || 1 })).sort((a, b) => a.pos[0] - b.pos[0]),
        mines: stage.effects.pyro.filter(low).map((p) => ({ pos: p.pos })),
    };
}

/**
 * A song's hits with its streamers cut down to `max` moments (stage.maxStreamers): the first and the last
 * (the finale), then the ones between, in order. Every other hit stays.
 */
export function limitStreamers(hits, max) {
    if (!Number.isFinite(max)) return hits;
    const times = [...new Set(hits.filter((h) => h.kind === 'streamers').map((h) => h.t))].sort((a, b) => a - b);
    if (times.length <= max) return hits;
    const keep = new Set(max >= 2 ? [times[0], times.at(-1), ...times.slice(1, max - 1)] : times.slice(-max));
    return hits.filter((h) => h.kind !== 'streamers' || keep.has(h.t));
}

/**
 * Where a firework launch happens on this stage. Launches are worked out for today's stage (shells
 * from behind its LED wall, stage pyro from its 19 m truss); this moves them onto the stage's own:
 * x stretched to its width, stage pyro lifted onto its top and moved to its depth.
 */
export function placeFirework(stage, f) {
    const t = stage.fireworkPlace ?? { sx: 1, lift: 0, pyroZ: 0, shellZ: 0 };
    const high = f.y > 5;
    return [f.x * t.sx, high ? f.y + t.lift : f.y, f.z + (high ? t.pyroZ : t.shellZ)];
}
