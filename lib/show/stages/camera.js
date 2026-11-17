// A festival stage's camera during a song, in the stage's own frame: the one rule for its test page and for the
// homepage's festival grounds, so the two always film a stage the same way.
//   fireworks in the air (not the mines)  its sky shot, standing back and looking up
//   a stage that circles (the warehouse)  its circling camera (orbit.js), round the room once or twice a song
//   otherwise                             the shot the show calls, framed to the whole stage where it has a frame
//                                         (the mainstage)
// `ease`: how quickly the camera glides to it (seconds).

import { fitShot } from './index.js';
import { orbitShot } from './orbit.js';

const skyward = (look) => look?.fireworks?.some((f) => f.type !== 'mines') ?? false;

/** { pos, target, ease } for a stage, the look on it, the shot the show calls, and the song's time and length. */
export function stageCamera(stage, { look, shot, t = 0, duration = 0, aspect = 1.78, fov = 55 }) {
    const up = skyward(look);
    const circling = Boolean(stage.orbit) && duration > 0;
    const called = circling ? orbitShot(stage.orbit, t, duration) : (up ? stage.shots.sky : stage.shots[shot]) ?? stage.shots.wide;
    const framed = stage.frame && !up && !circling ? fitShot(called, stage.frame, aspect, fov) : called;
    return { pos: framed.pos, target: framed.target, ease: circling ? 0.9 : up ? 0.6 : 1.8 };
}
