// Cold spark machines (item 15): fountains of golden sparks shooting up from machines on the
// stage's front lip for as long as they're fired, falling back as they cool. For now they fire from
// the lighting desk; song programming comes later.
//
// A machine's state is { age, len } like the CO2 jets (see effects.js); on a look, `sparks` is the
// flat array [age0, len0, ...] for the machines left to right. After a machine stops, the sparks
// already in the air keep falling for up to SPARK_LIFE seconds.
import { firingsState, patternFirings, stateActive } from './effects.js';

export const SPARK_UNITS = 6;
export const SPARK_LIFE = 1.9;    // seconds a spark flies (and so how long the last ones take to fall)
export const SPARK_BURST = 1.0;   // a normal burst, in seconds

/** Whether any machine still has sparks in the air. */
export const sparksActive = (state) => stateActive(state, SPARK_UNITS, SPARK_LIFE);

/** Desk firings ({ unit, at, len }) into the machines' state, or null when none has sparks in the air. */
export const sparksFromFirings = (fired, now) => firingsState(fired, now, SPARK_UNITS, SPARK_LIFE);

/**
 * The desk's spark patterns: [{ unit, delay (ms), len (s) }].
 *   chase       left to right and back
 *   outside-in  outer pair, middle pair, inner pair
 *   anything else: every machine at once
 */
export const sparkPattern = (name) => patternFirings(name, SPARK_UNITS, { step: 140, short: 0.4, pairStep: 260, pairLen: 0.6, blast: SPARK_BURST });
