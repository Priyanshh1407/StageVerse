// Camera positions the shows cut between, all from the audience area (front of house), like the
// reference photo.
export const SHOTS = {
    // Outside on the wet road, low, looking up at the gate (the reference photo's angle)
    outside: { pos: [-6, 1.1, 56], target: [0, 8.2, 34] },
    // In the arch, walking in
    doorway: { pos: [0, 1.8, 35.5], target: [0, 5, 0] },
    house: { pos: [0, 1.3, 31], target: [0, 5.5, -10] },
    wide: { pos: [0, 1.8, 26], target: [0, 7, -8] },
    dolly: { pos: [0, 2.2, 23.5], target: [0, 7.5, -10] },
    high: { pos: [0, 6.5, 27.5], target: [0, 6, -10] },
    left: { pos: [-6.5, 2.6, 24.5], target: [1.5, 7, -10] },
    right: { pos: [6.5, 2.6, 24.5], target: [-1.5, 7, -10] },
    drop: { pos: [0, 1.4, 22.5], target: [0, 8.5, -10] },
    // After the drop: higher, looking over the whole rig
    finale: { pos: [0, 5.5, 28], target: [0, 8, -10] },
    // Fireworks: further back and looking up, the whole rig and the sky behind it (to ~70 m) in view
    sky: { pos: [0, 2.0, 36], target: [0, 22, -20] },
};
