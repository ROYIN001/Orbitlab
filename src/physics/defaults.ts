import type { GuidanceParams, FailureConfig, VehicleSpec, DynamicsConfig } from '../types';

/**
 * Library defaults. Each vehicle overrides the pitch program it needs through
 * `guidanceDefaults` in `src/data/vehicles.ts`; the simulation merges those into
 * every parameter still sitting at the value below, so a caller that only knows
 * `DEFAULT_GUIDANCE` still flies each launcher with its own program.
 *
 * The baseline itself is deliberately gentle (2.5° kick, 0.4°/s pitch program):
 * a slow turn is survivable for a low thrust-to-weight vehicle, whereas the old
 * 6° / 0.7°/s baseline flew several of them into the ground.
 */
export const DEFAULT_GUIDANCE: GuidanceParams = {
  pitchOverAltitude: 200,
  kickAngle: 2.5,
  kickDuration: 8,
  gravityTurnEnd: 65e3,
  parkingAltitude: 0,
  maxTimeToGo: 1500,
  maxTurnRate: 0.4,
  loftAltitude: 0,
  pitchMax: 30,
  pitchMin: -15,
  slewRate: 3,
  maxAccel: 0,
};

export const DEFAULT_FAILURE: FailureConfig = { mode: 'none', time: 60, stage: 0 };

/**
 * The fields that give way a vehicle's stored pitch programme: an operator's own
 * pitch-over (the vertical rise, the kick and the turn's rate limit), and an
 * acceleration limit, which throttles the vehicle off the thrust the programme
 * was computed for. A programme flown at a fixed pitch against time by a
 * throttled stack goes flat and low into dense air (Soyuz-2.1a held to 18 m/s²
 * met 45 kPa on it, against 37 kPa unthrottled); a pitch-over turns with the
 * velocity it actually has.
 */
export const PROGRAMME_FIELDS = ['pitchOverAltitude', 'kickAngle', 'kickDuration', 'maxTurnRate', 'maxAccel'] as const;

/**
 * Whether `g` replaces the vehicle's stored pitch programme with a pitch-over
 * of the operator's own: any of `PROGRAMME_FIELDS` set to something other than
 * the vehicle's value. A programme flies none of those fields, so an edit to
 * one would otherwise change nothing (`GuidanceParams.pitchProgram`).
 */
export function programmeOverridden(g: GuidanceParams, spec: VehicleSpec, model?: DynamicsConfig['model']): boolean {
  if (!g.pitchProgram) return false;
  const own = guidanceForVehicle(spec, DEFAULT_GUIDANCE, model);
  return PROGRAMME_FIELDS.some((k) => g[k] !== own[k]);
}

/**
 * The guidance a vehicle is actually flown with when nobody has touched the
 * controls: the library baseline with the vehicle's own program on top.
 *
 * A user interface that shows guidance numbers should show *these* — showing
 * `DEFAULT_GUIDANCE` while `Simulation` flies the vehicle's program is how the
 * panel came to display a 2.5° kick for a Falcon 9 that flies 1.5°. Passing the
 * result back in a `MissionConfig` (with `guidanceResolved: true`, or simply
 * because every value now differs from the library default) flies exactly what
 * was displayed.
 */
export function guidanceForVehicle(spec: VehicleSpec, base: GuidanceParams = DEFAULT_GUIDANCE,
  model?: DynamicsConfig['model']): GuidanceParams {
  // A physical attitude controller needs a flyable pitch programme rather
  // than the legacy instantaneous-direction trajectory (`guidanceDefaultsSixDof`).
  const rigid = model === 'sixDof' ? spec.guidanceDefaultsSixDof ?? {} : {};
  return { ...base, ...(spec.guidanceDefaults ?? {}), ...rigid };
}
