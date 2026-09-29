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
import type { DynamicsConfig, FailureConfig, FailureMode, GuidanceParams } from '../types';
import type { TelemetrySample } from '../physics/sim/types';
import type { MissionResultModel, ResultCause, ResultOutcome } from './result-content';

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

// ─── challenges ────────────────────────────────────────────────────────────

/**
 * Explore's failure scenarios, as challenges: each with the moment it is set
 * for, so the student picks what goes wrong and not when. The times are the
 * ones the lessons and the viewer's launches fly — an engine out at T+80 s
 * (lessons 2.2 and 3.1), the abort at T+60 s (3.3), the pad fire six seconds
 * before liftoff (Soyuz T-10-1) — and the separation failures are set off by
 * their separations, whatever the time says (src/physics/sim/failures.ts).
 */
export const CHALLENGE_PRESETS: Record<Exclude<FailureMode, 'none'>, { time: number; stage: number }> = {
  engineOut: { time: 80, stage: 0 },
  thrustLoss: { time: 100, stage: 0 },
  prematureSep: { time: 90, stage: 0 },
  fairingStuck: { time: 60, stage: 0 },
  rangeSafety: { time: 70, stage: 0 },
  launchAbort: { time: 60, stage: 0 },
  padFire: { time: -6, stage: 0 },
  boosterCollision: { time: 0, stage: 0 },
  stagingFailure: { time: 0, stage: 0 },
  random: { time: 60, stage: 0 },
};

/** Dictionary key of what each challenge does, in a sentence. */
export const CHALLENGE_TEXT: Record<FailureMode, string> = {
  none: 'setup.challenge.none', engineOut: 'setup.challenge.engineOut', thrustLoss: 'setup.challenge.thrustLoss',
  prematureSep: 'setup.challenge.prematureSep', fairingStuck: 'setup.challenge.fairingStuck', rangeSafety: 'setup.challenge.rangeSafety',
  launchAbort: 'setup.challenge.launchAbort', padFire: 'setup.challenge.padFire', boosterCollision: 'setup.challenge.boosterCollision',
  stagingFailure: 'setup.challenge.stagingFailure', random: 'setup.challenge.random',
};

/** When a failure strikes: at its time, at a separation, or not at a moment at all. */
export function challengeTiming(failure: FailureConfig): 'time' | 'separation' | 'strapOns' | 'none' {
  switch (failure.mode) {
    case 'none': case 'fairingStuck': case 'random': return 'none';
    case 'boosterCollision': return 'strapOns';
    case 'stagingFailure': return 'separation';
    default: return 'time';
  }
}

// ─── the flight's debrief ──────────────────────────────────────────────────

/** Where the ascent's Δv went, from the flight's own loss book-keeping. */
export interface DebriefLoss { key: 'gravity' | 'drag' | 'steering'; dv: number; share: number }

export interface DebriefModel {
  outcome: ResultOutcome;
  cause: ResultCause;
  /** Δv left when the outcome was recorded, and at liftoff, m/s */
  dvLeft: number | null;
  dvStart: number | null;
  losses: DebriefLoss[];
}

/**
 * The Explore level's card at the end of a flight: the outcome and its cause
 * (src/ui/result-content.ts, the same assessment the result panel shows), the
 * Δv left, and the three losses as shares of their sum.
 */
export function debriefModel(result: MissionResultModel,
  losses: { gravity: number; drag: number; steering: number },
  telemetry: readonly Pick<TelemetrySample, 't' | 'dvRemaining'>[]): DebriefModel {
  const upTo = telemetry.filter((s) => s.t <= result.outcomeTime + 1e-6);
  const last = upTo[upTo.length - 1] ?? telemetry[telemetry.length - 1];
  const keys = ['gravity', 'drag', 'steering'] as const;
  const total = keys.reduce((sum, k) => sum + Math.max(0, losses[k]), 0);
  return {
    outcome: result.outcome,
    cause: result.cause,
    dvLeft: last && Number.isFinite(last.dvRemaining) ? last.dvRemaining : null,
    dvStart: telemetry[0] && Number.isFinite(telemetry[0].dvRemaining) ? telemetry[0].dvRemaining : null,
    losses: keys.map((key) => ({ key, dv: Math.max(0, losses[key]), share: total > 0 ? Math.max(0, losses[key]) / total : 0 })),
  };
}

// ─── the verdict's payload fix ─────────────────────────────────────────────

/**
 * The heaviest payload, in whole `step`s up to `current`, that `passes` —
 * found by bisection, since a lighter payload is never harder to fly — or
 * null when not even one step does (the orbit or the site is what stops the
 * mission, not the mass).
 */
export function heaviestPassing(current: number, step: number, passes: (mass: number) => boolean): number | null {
  let hi = Math.floor(current / step);
  if (hi < 1 || !passes(step)) return null;
  let lo = 1;
  if (passes(hi * step)) return hi * step;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (passes(mid * step)) lo = mid; else hi = mid;
  }
  return lo * step;
}
