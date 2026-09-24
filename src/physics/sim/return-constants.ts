/**
 * Limits shared by both flight models' returns (sim/debris.ts,
 * rigid/debris-runtime.ts).
 */

/** Fastest a booster may be moving, down and across, when a tower's arms close on it, m/s (estimates). */
export const CATCH_VERTICAL_SPEED = 3;
export const CATCH_HORIZONTAL_SPEED = 2;
