'use client';

// The festival grounds on the homepage: the warehouse, the desert stage and the mainstage standing outside the
// gate (components/home/show/tour.js SITE), each lit by its own level (control.levels, set by the director as the
// camera walks between them). A lit stage plays the scroll's look, the same as this stage would (a persona's
// look: the rig dimmed, the persona on the LED wall); an unlit one keeps a faint standby glow, so it reads as a
// stage at night from across the grounds. Each stage: its steel, screens, LED wall, pixel bars, moving heads, PA
// and (the desert) its logo sign; no crowd, effects or lasers.

import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { STAGES } from '@/lib/show/stages';
import { rigHeads } from '@/lib/show/stages/rig';
import { toGround } from '@/lib/show/stages/festival';
import { SITE } from '@/components/home/show/tour';
import { StagePixelBars, StageScreens, StageStructure } from './StageBuild';
import StageHeads from './StageHeads';
import StageLedWall from './StageLedWall';
import StagePa from './StagePa';
import StageLogo from './StageLogo';

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

/** This stage's look: the scroll's (before this stage's own dimming, control.tourLook), at its own light level. */
function dim(own, look, control, key) {
    const level = control.current?.levels?.[key] ?? 0;
    const source = control.current?.tourLook ?? look.current;
    own.current = { ...source, master: (source.master ?? 1) * Math.max(STANDBY, level) };
}

function SiteStage({ siteKey, look, control, screen, font, logoFonts, count }) {
    const place = SITE[siteKey];
    const stage = STAGES[place.stage];
    const own = useRef(look.current);
    useFrame(() => dim(own, look, control, siteKey));
    const heads = useMemo(() => rigHeads(stage, count), [stage, count]);
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
            </Suspense>
        </group>
    );
}

/** The three stages on the grounds outside the gate. `count`: moving heads per stage. */
export default function HomeFestival({ look, control, screen, font, logoFonts, count = 48 }) {
    return Object.keys(SITE).map((key) => (
        <SiteStage key={key} siteKey={key} look={look} control={control} screen={screen} font={font} logoFonts={logoFonts} count={count} />
    ));
}
