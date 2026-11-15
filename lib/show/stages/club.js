// The warehouse plays every show the way clubs light a room, not like a festival main stage. The show's cues
// still decide when things change (and their colours); this turns each moment into a club look by how much
// energy the song has there (look.crowd: intro and outro 0.12, breakdown 0.15, verse 0.25, groove 0.4, build
// 0.5, peak 1; a held cue without a song is judged by its intensity):
//   quiet       a mirror-ball moment: the beams off, the room in one deep colour, the pin spots on the ball, the
//               lasers a thin slow sheet low over the heads, thick haze
//   groove      tight scans: the beams in one colour, close together, sweeping slowly over the crowd as one;
//               the lasers sparse, the pixel lines chasing
//   build       the ramp: everything faster, the strobes stepping up through the build, the lasers chasing,
//               the pixel lines sparkling
//   peak        club peak: every group on, the beams alternating on the beat, a strobe hit at the start of every bar, the
//               lasers chasing low over the crowd (a strobe hit on every bar, not every beat)
// The drop, strobe and blinder hits of the show still come through on top.

const GROUP_LEVEL = { aerial: 'beams', sides: 'sides', floor: 'floor', wash: 'wash' };
/**
 * The test pages' ?only=<group>: every other group, the lasers and the pixel bars off. The look keeps `only`,
 * so the warehouse applies it again after turning the look into a club look.
 */
export function onlyGroup(look, only) {
    if (!GROUP_LEVEL[only]) return look;
    const off = Object.fromEntries(Object.values(GROUP_LEVEL).filter((k) => k !== GROUP_LEVEL[only]).map((k) => [k, 0]));
    return { ...look, ...off, laser: 0, pixel: 0, [GROUP_LEVEL[only]]: Math.max(0.8, look[GROUP_LEVEL[only]] ?? 0), only };
}

const energyOf = (look) => look.crowd ?? (look.intensity >= 1.1 ? 1 : look.intensity >= 0.85 ? 0.5 : 0.2);

/** The club version of a look at song time t (seconds). */
export function clubLook(look) {
    const e = energyOf(look);
    const beat = look.beatPos ?? 0;
    const onBar = (beat % 4) < 0.1; // the start of every bar (a hit on every beat whited out the room)
    if (look.house > 0.5) return look;
    if (e < 0.2) {
        return {
            ...look, beams: 0, sides: 0.12, floor: 0, wash: 0.55, washColor: look.colorB,
            laser: Math.max(0.3, look.laser ?? 0) * 0.6, laserAmount: 0.2, laserChase: 0, laserSpread: 1.6,
            pixel: 0.35, pixelChase: 0, pixelSparkle: 0, strobe: Math.max(look.strobe ?? 0, 0), strobeRandom: 0,
            sweep: 0.1, speed: 0.3, haze: 0.95, intensity: Math.max(0.7, look.intensity), alternate: 0, circle: 0, fanBreathe: 0,
        };
    }
    if (e < 0.45) {
        return {
            ...look, beams: 1, sides: 0.5, floor: 0, wash: 0.4, colorB: look.colorA, fan: 0.45, tiltShift: -0.2,
            sweep: 0.35, phaseSpread: 0, alternate: 0, sparkle: 0, laser: 0.5, laserAmount: 0.35, laserChase: 0,
            pixel: 0.8, pixelChase: 1, pixelSparkle: 0, strobeRandom: 0.12, haze: 0.8, intensity: Math.max(0.9, look.intensity), circle: 0, fanBreathe: 0,
        };
    }
    if (e < 0.9) {
        return {
            ...look, beams: 1, sides: 0.8, floor: 0.6, wash: 0.3, fan: 0.7, sweep: 0.45, speed: Math.max(1.8, look.speed ?? 1),
            phaseSpread: 0.4, alternate: 0, laser: 0.8, laserChase: 1, laserAmount: 0.6, pixel: 1, pixelSparkle: 0.8,
            strobeRandom: Math.max(0.35, look.strobeRandom ?? 0), haze: 0.7, intensity: Math.max(1, look.intensity), circle: 0, fanBreathe: 0,
        };
    }
    return {
        ...look, beams: 1, sides: 1, floor: 1, wash: 0.6, fan: 1.1, sweep: 0.55, phaseSpread: 0.5, alternate: 1,
        laser: 1, laserChase: 1, laserAmount: 0.8, pixel: 1, pixelSparkle: 0.5,
        strobe: Math.max(look.strobe ?? 0, onBar ? 0.5 : 0), haze: 0.6, intensity: Math.max(1.2, look.intensity),
    };
}
