/** Tuning constants of the mission sequencer. */
import { DEG } from '../constants';
import { ORBIT_INSERTION_FLOOR } from '../mission';

/**
 * Backstop for the closed-loop re-planner. The real stop is the residual (see
 * `replanRemainingBurns`); this only bounds a pathological case. It has to be
 * generous, because a low-thrust kick stage splits one apogee raising across
 * five or six perigee passes and every pass re-plans.
 */
export const MAX_REPLANS = 16;

/** How long before a scheduled burn the stack points at the burn attitude, s. */
export const BURN_PREORIENT_TIME = 240;

/** How close to the commanded direction the stack must be before a burn lights, rad. */
export const BURN_IGNITION_ALIGNMENT = 4 * DEG;

/**
 * Most telemetry samples a flight keeps. Past this the older half is thinned
 * 2:1 (see `sample`), which bounds the buffer without bounding the mission: a
 * geostationary delivery warped through several days of coasting used to grow
 * it without limit, and every chart redraw and CSV export walks all of it.
 */
export const TELEMETRY_CAP = 20000;

/**
 * Lowest periapsis the ascent may cut off at when the apoapsis is already on
 * target, m — the same floor `abandonInsertion` holds the post-ascent sequence
 * to, and deliberately the same constant rather than a second copy of 140 km.
 */
export const ASCENT_MIN_PERIAPSIS = ORBIT_INSERTION_FLOOR;

/**
 * Fraction of the acceptance band a single-shot ascent has to be inside before
 * it calls the mission done and shuts the engine off — see `singleShotCutoff`.
 */
export const SINGLE_SHOT_CUTOFF_BAND = 0.25;

/** Fairing placard: free-molecular heating limit, W/m^2 (0.1 BTU/ft^2/s). */
export const FAIRING_HEAT_FLUX_LIMIT = 1135;
/** Fairing placard: dynamic-pressure limit, Pa. */
export const FAIRING_Q_LIMIT = 1100;
/** Fairing placard: altitude floor below which the fairing is never dropped, m. */
export const FAIRING_ALTITUDE_FLOOR = 80e3;
