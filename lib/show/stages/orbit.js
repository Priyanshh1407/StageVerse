// A camera that circles a venue once or twice over a song, always the same way round, and ends where it began:
// the warehouse's song camera. It starts at the back of the room looking at the stage, travels along one side,
// passes behind the DJ looking out over the crowd, and comes back along the other side. One lap takes it behind
// the DJ once, so with at most two laps a song the camera is behind the DJ at most twice.
//
// orbit = { centre: [x, z], radius: [rx, rz], height: [at the back of the room, behind the DJ],
//           stage: [x, y, z] (looked at from the room), crowd: [x, y, z] (looked at from behind the DJ),
//           lapSeconds: the shortest a lap may take (shorter songs get one lap) }

const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

/** How many laps a song of `duration` seconds gets: 2, or 1 when two would be faster than lapSeconds each. */
export const orbitLaps = (orbit, duration) => (duration >= 2 * (orbit.lapSeconds ?? 75) ? 2 : 1);

/** The camera at song time t: { pos, target, angle } (angle 0 = the back of the room, pi = behind the DJ). */
export function orbitShot(orbit, t, duration) {
    const progress = duration > 0 ? Math.min(1, Math.max(0, t / duration)) : 0;
    const angle = progress * orbitLaps(orbit, duration) * 2 * Math.PI;
    const [cx, cz] = orbit.centre;
    const [rx, rz] = orbit.radius;
    const [yRoom, yBooth] = orbit.height;
    const c = Math.cos(angle);
    const pos = [cx + rx * Math.sin(angle), yBooth + (yRoom - yBooth) * (0.5 + 0.5 * c), cz + rz * c];
    // from the room the camera looks at the stage; coming round behind the DJ it turns to look out at the crowd
    const behind = smooth(-0.3, -0.92, c);
    const target = orbit.stage.map((v, i) => v + (orbit.crowd[i] - v) * behind);
    return { pos, target, angle };
}
