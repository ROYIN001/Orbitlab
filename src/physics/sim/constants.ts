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
 * The same for a six-DOF stack, rad. Its autopilot holds attitude to about a
 * quarter of a degree, and a burn short enough to lie wholly inside the
 * terminal steering freeze is flown at the attitude it lit at: Electron's 4 s
 * Curie trims at 4° off ended 13 km outside their apoapsis band.
 */
export const RIGID_BURN_IGNITION_ALIGNMENT = 1 * DEG;

/**
 * Most telemetry samples a flight keeps. Past this the older half is thinned
 * 2:1 (see `sample`), which bounds the buffer without bounding the mission: a
 * geostationary delivery warped through several days of coasting used to grow
 * it without limit, and every chart redraw and CSV export walks all of it.
 */
export const TELEMETRY_CAP = 20000;

/**
 * Longest step while an engine is spinning up or tailing off, s. The thrust is
 * averaged over each step (so the impulse is right at any length), but a coast
 * or an orbit would otherwise swallow a whole tail-off in one 10-30 s step and
 * the plume would vanish a frame after cut-off.
 */
export const TRANSIENT_DT = 0.25;

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

/**
 * Six-DOF terminal steering freeze for orbital burns, s. In the last seconds
 * of a burn the direction of the Δv still to go stops meaning anything — it
 * swings as the residual goes to zero — and a gimballed engine follows it: a
 * Briz-M cut off turning at 1.1 °/s, more than its 13 N attitude thrusters
 * could stop before the next burn. Real terminal guidance holds its steering
 * constant here (PEG freezes it for the last seconds), and so does the six-DOF
 * autopilot: once less than this much burning is left the command stays where
 * it was, and the still-thrusting engine brings the body to rest on it. Four
 * seconds is what a gimbal needs for that. The ascent has no reliable
 * time-to-go (its cut-off is decided on the orbit, not on a speed), so it is
 * bounded by the rate ceiling below instead; a twelve-second ascent freeze was
 * tried and cost a thrust-limited Centaur with 17 t the apoapsis control its
 * guidance was still flying (1 144 km instead of 500 at cut-off).
 */
export const RIGID_STEERING_FREEZE_S = 4;

/**
 * Six-DOF vacuum ascent: the guidance command swings no faster than this, rad/s.
 * Near its cut-off the ascent guidance can swing its command at 3-4 °/s (Vulcan's
 * apoapsis ceiling took its Centaur V from 40° to 12° in eight seconds); a
 * gimballed stage follows and coasts away turning that fast, which 27 N attitude
 * thrusters take minutes to stop. A cap on how fast the stage turns, sized on
 * those thrusters, was tried and was too tight for a heavy Centaur that needs to
 * pitch down quickly to hold its apoapsis; this caps only the command's swing,
 * and only at a rate no normal steering reaches.
 */
export const RIGID_ASCENT_COMMAND_RATE = 1 * Math.PI / 180;
