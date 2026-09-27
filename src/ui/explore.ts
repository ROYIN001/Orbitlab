/**
 * The Explore level's precomputed settings.
 *
 * Explore flies exactly the physics the Engineer level flies: the same model,
 * the same vehicle, the same guidance law. What it does not do is hand the
 * student the numbers an engineer tunes. Those are computed and shown instead:
 *
 * - **the pitch programme** is the vehicle's own (`guidanceDefaults`, and
 *   `guidanceDefaultsSixDof` for a rigid flight, in src/data/vehicles.ts),
 *   the one `tests/fleet-defaults.test.ts` and the six-DOF fleet fly to every
 *   reference orbit each vehicle can reach — LEO, the ISS plane, SSO and GTO,
 *   at 25, 50 and 90 % of the rated payload — with no auto-tuning and with an
 *   empty list of known guidance failures;
 * - **the closed-loop limits** (pitch limits, slew rate, acceleration limit,
 *   planning horizon) are the vehicle's limits, and the parking orbit is the
 *   mission planner's;
 * - **the orbit's geometry** — argument of perigee, RAAN mode, LTAN — comes
 *   with the orbit preset;
 * - **the six-DOF internals** (autopilot gains, navigation, the flexible body,
 *   control failures, dispersions, the explicit upper-stage laws) stay at the
 *   vehicle's defaults.
 *
 * The level switch never touches a mission (src/ui/app-mode.ts), so anything
 * adjusted at the Engineer level is still flown here. Explore says so, and
 * offers the way back to the precomputed values; these functions are what it
 * reads to do that.
 */
import type { DynamicsConfig, GuidanceParams } from '../types';

/**
 * The guidance values Explore shows, as the setup panel's own field keys, in
 * the order the ascent uses them. The closed-loop limits and the parking
 * orbit are left out: they are the vehicle's and the planner's, not a
 * programme anyone chose.
 */
export const AUTO_GUIDANCE_FIELDS = [
  'pitchOverAltitude', 'kickAngle', 'kickDuration', 'maxTurnRate', 'gravityTurnEnd', 'loftAltitude',
] as const satisfies readonly (keyof GuidanceParams)[];
export type AutoGuidanceField = (typeof AUTO_GUIDANCE_FIELDS)[number];

/**
 * The vehicle's limits and the planner's parking orbit, which have fields at
 * the Engineer level: Explore lists one only when it has been changed there,
 * so that every value flown in place of a computed one is on screen.
 */
export const LIMIT_FIELDS = ['pitchMax', 'pitchMin', 'slewRate', 'maxAccel', 'parkingAltitude'] as const satisfies readonly (keyof GuidanceParams)[];
export type GuidanceField = AutoGuidanceField | (typeof LIMIT_FIELDS)[number];

/** Display scale of each shown value: the panel's own fields take kilometres for these. */
const SCALE: Partial<Record<GuidanceField, number>> = { gravityTurnEnd: 1e-3, loftAltitude: 1e-3, parkingAltitude: 1e-3 };

/** One row of the computed-guidance card: the value flown, in the unit its field label names. */
export interface AutoGuidanceRow {
  key: GuidanceField;
  value: number;
  /** adjusted at the Engineer level or by the auto-tuner, and flown instead of the precomputed value */
  adjusted: boolean;
}

export function autoGuidanceRows(flown: GuidanceParams, overrides: Partial<GuidanceParams>): AutoGuidanceRow[] {
  const row = (key: GuidanceField): AutoGuidanceRow => ({
    key,
    value: +(flown[key] * (SCALE[key] ?? 1)).toFixed(3),
    adjusted: overrides[key] !== undefined,
  });
  return [...AUTO_GUIDANCE_FIELDS.map(row), ...LIMIT_FIELDS.filter((key) => overrides[key] !== undefined).map(row)];
}

/**
 * The Engineer level's settings a flight's dynamics carries — each one off
 * unless set — in the order the Engineer panel lists them.
 */
export const ENGINEER_DYNAMICS = [
  'flex', 'control', 'navigation', 'controlFaults', 'explicitGuidance', 'dispersion',
] as const satisfies readonly (keyof DynamicsConfig)[];
export type EngineerSetting = (typeof ENGINEER_DYNAMICS)[number];

/** The panel section title that names each setting. */
export const ENGINEER_SETTING_TITLE: Record<EngineerSetting, string> = {
  flex: 'setup.flex.title', control: 'setup.control.title', navigation: 'setup.nav.title',
  controlFaults: 'setup.faults.title', explicitGuidance: 'setup.explicit.title', dispersion: 'setup.dispersion.title',
};

export function engineerSettings(dynamics: DynamicsConfig | undefined): EngineerSetting[] {
  return ENGINEER_DYNAMICS.filter((key) => dynamics?.[key] !== undefined);
}

/** The same dynamics with every Engineer-only setting off: the model, the wind and the seed are kept. */
export function withoutEngineerSettings(dynamics: DynamicsConfig): DynamicsConfig {
  const next = { ...dynamics };
  for (const key of ENGINEER_DYNAMICS) delete next[key];
  return next;
}

/** Whether anything flown differs from what Explore would compute. */
export function hasAdjustments(overrides: Partial<GuidanceParams>, dynamics: DynamicsConfig | undefined): boolean {
  return Object.keys(overrides).length > 0 || engineerSettings(dynamics).length > 0;
}
