// Camera positions the shows cut between, all from the audience area (front of house), like the
// reference photo.
export const SHOTS = {
    // Outside the venue (wall at z = 34), looking up a little so the sky beams show over it
    outside: { pos: [0, 1.8, 60], target: [0, 9, 20] },
    // At the doorway, walking in
    doorway: { pos: [0, 1.9, 36.5], target: [0, 5, 0] },
    house: { pos: [0, 1.3, 31], target: [0, 5.5, -8] },
    wide: { pos: [0, 1.8, 26], target: [0, 7, -6] },
    dolly: { pos: [0, 2.2, 23.5], target: [0, 7.5, -8] },
    high: { pos: [0, 6.5, 27.5], target: [0, 6, -8] },
    left: { pos: [-6.5, 2.6, 24.5], target: [1.5, 7, -8] },
    right: { pos: [6.5, 2.6, 24.5], target: [-1.5, 7, -8] },
    drop: { pos: [0, 1.4, 22.5], target: [0, 8.5, -8] },
};
