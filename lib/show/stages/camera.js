// A festival stage's camera during a song, in the stage's own frame: the one rule for its test page and for the
// homepage's festival grounds, so the two always film a stage the same way.
//   fireworks in the air (not the mines)  its sky shot, standing back and looking up
//   a stage that circles (the warehouse)  its circling camera (orbit.js), round the room once or twice a song
//   otherwise                             the shot the show calls, framed to the whole stage where it has a frame
//                                         (the mainstage)
// `ease`: how quickly the camera glides to it (seconds).

import { audienceShot, fitShot } from './index.js';

export { audienceShot };
import { orbitShot } from './orbit.js';

const skyward = (look) => look?.fireworks?.some((f) => f.type !== 'mines') ?? false;
// the tower lasers on their own (a laser moment that leaves the floor lasers off, the tower-lasers solo)
const towerLasers = (look) => (look?.laser ?? 0) > 0.5 && (look?.laserFloor ?? 1) < 0.5 && (look?.laserTower ?? 1) > 0.5;

/** { pos, target, ease } for a stage, the look on it, the shot the show calls, and the song's time and length. */
// the views a visitor can pick during a song: they hold, whatever the show calls (no framing, no circling, no sky)
export const FIXED_VIEWS = new Set(['audience', 'artist']);

export function stageCamera(stage, { look, shot, t = 0, duration = 0, aspect = 1.78, fov = 55, view = null }) {
    // (a shot named after a view, as the test pages' camera buttons call it, is that view)
    if (!view && FIXED_VIEWS.has(shot)) view = shot;
    if (view === 'audience' && stage.audienceFrame) return { ...audienceShot(stage.audienceFrame, aspect, fov), ease: 1.2 };
    if (view && FIXED_VIEWS.has(view) && stage.shots[view]) return { ...stage.shots[view], ease: 1.2 };
    const up = skyward(look);
    const circling = Boolean(stage.orbit) && duration > 0;
    // the tower lasers alone: the side laser shot, left and right taking turns every 16 s of the song
    const lasers = !up && !circling && stage.laserShots && towerLasers(look);
    const name = lasers ? stage.laserShots[Math.floor(t / 16) % stage.laserShots.length] : shot;
    const called = circling ? orbitShot(stage.orbit, t, duration) : (up ? stage.shots.sky : stage.shots[name]) ?? stage.shots.wide;
    // (a stage with frameShots fits only those to the whole stage; the others keep their own framing)
    const fits = stage.frame && !up && !circling && !lasers && (!stage.frameShots || stage.frameShots.includes(name));
    const framed = fits ? fitShot(called, stage.frame, aspect, fov) : called;
    return { pos: framed.pos, target: framed.target, ease: circling ? 0.9 : up ? 0.6 : lasers ? 2.4 : 1.8 };
}
