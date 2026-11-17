'use client';

// The festival grounds on the homepage: the warehouse, the desert stage and the mainstage standing outside the
// gate (components/home/show/tour.js SITE), each lit by its own level (control.levels, set by the director as the
// camera walks between them). A lit stage plays the scroll's look, the same as this stage would (a persona's
// look: the rig dimmed, the persona on the LED wall); an unlit one keeps a faint standby glow, so it reads as a
// stage at night from across the grounds. Each stage: its steel, screens, LED wall, pixel bars, moving heads,
// strobes, lasers, PA and (the desert) its logo sign, as many as on its test page.

import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { STAGES } from '@/lib/show/stages';
import { rigHeads, stageMounts } from '@/lib/show/stages/rig';
import { toGround } from '@/lib/show/stages/festival';
import { SITE, personaAt } from '@/components/home/show/tour';
import { sampleCueSheet } from '@/lib/show/timeline';
import { StagePixelBars, StageScreens, StageStructure } from './StageBuild';
import StageHeads from './StageHeads';
import StageLedWall from './StageLedWall';
import StagePa from './StagePa';
import StageLogo from './StageLogo';
import StageStrobes from './StageStrobes';
import StageLasers from './StageLasers';

const STANDBY = 0.05; // how lit an unlit stage stays
const PIXEL = 0.11;   // LED pixel pitch on the walls (m)
const NO_TUNE = {};

/** The stage's LED walls that carry the wordmark (or a persona) and visuals. */
function ledWalls(stage) {
    return stage.screens.filter((p) => p.ledWall && p.kind === 'box').map((p, i) => ({
        key: p.ledWall,
        position: [p.position[0], p.position[1], p.position[2] + p.size[2] / 2 + 0.01],
        rotation: [0, 0, 0],
        size: [p.size[0], p.size[1]],
        grid: [Math.round(p.size[0] / PIXEL), Math.round(p.size[1] / PIXEL)],
        text: p.ledWall === 'main',
        seed: i * 3,
    }));
}

/**
 * This stage's look: its persona's own look from the scroll (the role's held look, whatever the scroll is doing
 * while the camera is still walking), every light group on as on the homepage's stage but kept low, so the
 * persona on the screen is the focus; at its own light level.
 */
function dim(own, look, control, key) {
    const c = control.current;
    const level = c?.levels?.[key] ?? 0;
    const role = personaAt(key);
    const base = role && c?.sheet ? sampleCueSheet(c.sheet, role.at + role.hold / 2).look : look.current;
    own.current = { ...base, ...LOW, master: (base.master ?? 1) * Math.max(STANDBY, level) };
}
// every group on, low (the persona looks' own levels), the floor beams allowed to be dim (dimRig), no lasers or strobes
const LOW = { beams: 0.2, sides: 0.2, floor: 0.2, wash: 0.32, pixel: 0.28, laser: 0, strobe: 0, blinder: 0, strobeRandom: 0, dimRig: 1, house: 0 };

function SiteStage({ siteKey, look, control, font, logoFonts, count }) {
    // its persona on the LED wall, always
    const screen = useMemo(() => { const r = personaAt(siteKey); return r ? { kind: 'role', key: r.key, line: r.line } : { kind: 'brand' }; }, [siteKey]);
    const place = SITE[siteKey];
    const stage = STAGES[place.stage];
    const own = useRef(look.current);
    useFrame(() => dim(own, look, control, siteKey));
    const heads = useMemo(() => rigHeads(stage, count), [stage, count]);
    const mounts = useMemo(() => stageMounts(stage), [stage]);
    const walls = useMemo(() => ledWalls(stage), [stage]);
    // the point the beams focus on, on the grounds (the rig itself is turned with the stage)
    const focus = useMemo(() => toGround(place, stage.focus), [place, stage]);
    return (
        <group position={place.position} rotation={[0, place.turn, 0]}>
            <StageStructure stage={stage} />
            <StageScreens stage={stage} look={own} />
            {walls.length > 0 && <StageLedWall screens={walls} look={own} screen={screen} font={font} logoFonts={logoFonts} visuals={stage.visuals ?? null} />}
            {stage.pixelBars.length > 0 && <StagePixelBars stage={stage} look={own} />}
            {stage.pa && <StagePa settings={stage.pa} />}
            {stage.logo && <StageLogo position={stage.logo.position} size={stage.logo.size} logoFonts={logoFonts} />}
            <Suspense fallback={null}>
                <StageHeads heads={heads} look={own} focus={focus} screenBeamsX={stage.screenBeamsX} tune={stage.headTune ?? NO_TUNE} />
                <StageStrobes positions={mounts.strobes} look={own} blinders={Math.min(16, mounts.strobes.length)} scale={stage.strobeScale ?? 1} floorY={stage.deck + 1} clearFront />
            </Suspense>
            <StageLasers look={own} projectors={mounts.lasers} pitch={stage.laserPitch ?? null} strength={stage.laserStrength ?? null} />
        </group>
    );
}

/** The three stages on the grounds outside the gate. `count`: moving heads per stage (as on the test pages). */
export default function HomeFestival({ look, control, font, logoFonts, count = 96 }) {
    return Object.keys(SITE).map((key) => (
        <SiteStage key={key} siteKey={key} look={look} control={control} font={font} logoFonts={logoFonts} count={count} />
    ));
}
