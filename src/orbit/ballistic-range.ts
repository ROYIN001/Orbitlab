/**
 * The ballistic coefficients anything in orbit has, B = C_D·A/m (P2.5, M03;
 * roadmap D06): from a dense sphere, 1e-4 m²/kg, to a sheet of foil, 1 m²/kg.
 *
 * Its own module, with nothing imported, so that a checker on the launch side
 * (src/config/satellite-spec.ts, which the flight worker and the setup panel
 * read) can hold a satellite's C_D·A/m to the same range the fitted B of
 * src/orbit/ballistic.ts is held to without taking in the propagator that
 * module fits with: one range, one place. src/orbit/ballistic.ts re-exports
 * it under its old name.
 */

/** B's plausible range, m²/kg: a dense sphere to a sheet of foil. */
export const B_RANGE = [1e-4, 1] as const;
