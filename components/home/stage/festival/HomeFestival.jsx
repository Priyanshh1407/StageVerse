// The festival grounds on the homepage: the warehouse, the desert stage and the mainstage standing outside the
// gate (components/home/show/tour.js SITE). Each is its test page's own scene (FestivalScene, embedded: every
// fixture, effect, the crowd and the performer, as many as on its test page), turned to face the avenue, and lit
// by its own level (control.levels, set by the director as the camera walks between them):
// - on the walk through the personas, a lit stage plays its persona's own look with every light group on but low,
//   its persona on the LED wall as the focus; an unlit one keeps a faint standby glow
// - in the playground, the stage the camera is at plays what the playground plays there (the idle show, the
//   lighting desk, or a song with that stage's own cues: control.siteLook)

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { STAGES } from '@/lib/show/stages';
import { toGround } from '@/lib/show/stages/festival';
import { SITE, personaAt } from '@/components/home/show/tour';
import { sampleCueSheet } from '@/lib/show/timeline';
import FestivalScene from './FestivalScene';

const STANDBY = 0.05; // how lit an unlit stage stays
/**
 * This stage's look: its persona's own look from the scroll (the role's held look, whatever the scroll is doing
 * while the camera is still walking), every light group on as on the homepage's stage but kept low, so the
 * persona on the screen is the focus; at its own light level.
 */
function dim(own, look, control, key) {
    const c = control.current;
    const level = c?.levels?.[key] ?? 0;
    // the playground at this stage: what it plays here (the idle show, the desk, or a song with this stage's cues)
    if (c?.siteKey === key && c.siteLook) {
        own.current = { ...c.siteLook, master: (c.siteLook.master ?? 1) * Math.max(STANDBY, level) };
        return;
    }
    const role = personaAt(key);
    const base = role && c?.sheet ? sampleCueSheet(c.sheet, role.at + role.hold / 2).look : look.current;
    own.current = { ...base, ...LOW, master: (base.master ?? 1) * Math.max(STANDBY, level) };
}
// every group on, low (the persona looks' own levels), the floor beams allowed to be dim (dimRig), no lasers or strobes
const LOW = { beams: 0.2, sides: 0.2, floor: 0.2, wash: 0.32, pixel: 0.28, laser: 0, strobe: 0, blinder: 0, strobeRandom: 0, dimRig: 1, house: 0 };

function SiteStage({ siteKey, look, control, count, quality }) {
    const place = SITE[siteKey];
    const stage = STAGES[place.stage];
    const own = useRef(look.current);
    useFrame(() => dim(own, look, control, siteKey));
    // its persona on the LED wall
    const screen = useMemo(() => { const r = personaAt(siteKey); return r ? { kind: 'role', key: r.key, line: r.line } : { kind: 'brand' }; }, [siteKey]);
    // the point the beams focus on, on the grounds (the rig itself is turned with the stage)
    const focus = useMemo(() => toGround(place, stage.focus), [place, stage]);
    return (
        <group position={place.position} rotation={[0, place.turn, 0]}>
            <FestivalScene stage={stage} look={own} count={count} quality={quality} control={control} bloom={false} embedded focusWorld={focus} screen={screen} />
        </group>
    );
}

/** The three stages on the grounds outside the gate. `count`: moving heads per stage (as on the test pages). */
export default function HomeFestival({ look, control, count = 96, quality = 'low' }) {
    return Object.keys(SITE).map((key) => (
        <SiteStage key={key} siteKey={key} look={look} control={control} count={count} quality={quality} />
    ));
}
