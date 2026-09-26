/** Shared validation of configuration data, separate from mission feasibility.
 * A valid but overweight or unreachable mission is still an experiment the
 * operator may launch. Only malformed or unsupported input is rejected here. */
import type { FailureConfig, FailureMode, GuidanceParams, OrbitSpec, RecoveryMode, RecoveryPlan, VehicleSpec } from '../types';
import { ALL_VEHICLES } from '../data/vehicles';
import { LANDING_ZONES } from '../data/landing-zones';
import { SATELLITES, satelliteById } from '../data/satellites';
import { SITES } from '../data/sites';
import { guidanceForVehicle } from '../physics/defaults';
import { supportsRigid } from '../physics/rigid/config';
import type { DynamicsConfig } from '../types';
import { FLEX_LIMITS } from '../physics/rigid/flex';
import { PROFILE_IDS, rendezvousAvailable } from '../physics/rendezvous/profiles';
import { PORT_IDS } from '../physics/rendezvous/ports';
import type { MissionConfig } from '../types';
import { CONTROL_CHANNEL_KEYS, CONTROL_CHANNELS, CONTROL_LIMITS, controlFieldKey, controlProblems } from '../physics/rigid/control-config';
import { AIDING_KEYS, AIDING_LIMITS, IMU_KEYS, NAV_FIELD_KEYS, navigationProblems } from '../physics/nav/config';
import { controlFaultsProblems } from '../physics/rigid/fault-config';
import { explicitGuidanceProblems } from '../physics/explicit-guidance';
import { IMU_LIMITS } from '../physics/nav/sensors';

export interface NumberLimits { min?: number; max?: number; integer?: boolean }
export type ValidationCode = 'required' | 'number' | 'minimum' | 'maximum' | 'integer' | 'date' | 'orbitOrder' | 'selection' | 'suborbital'
  /** a failure the vehicle cannot have: an abort without an escape system, a strap-on collision without strap-ons */
  | 'failureUnavailable'
  /** a rendezvous needs the station's orbit and a spacecraft with its own engine */
  | 'rendezvousUnavailable';
export interface ValidationIssue { field: string; code: ValidationCode; limit?: number }

/** Bounds are in the stored SI/degree units; UI and WebMCP convert at the edge. */
export const GUIDANCE_FIELDS: Record<string, { key: keyof GuidanceParams; scale: number; range: [number, number] }> = {
  pitchOverAltitudeM: { key: 'pitchOverAltitude', scale: 1, range: [20, 5000] },
  kickAngleDeg: { key: 'kickAngle', scale: 1, range: [0, 45] },
  kickDurationS: { key: 'kickDuration', scale: 1, range: [1, 60] },
  maxTurnRateDegS: { key: 'maxTurnRate', scale: 1, range: [0.1, 3] },
  loftAltitudeKm: { key: 'loftAltitude', scale: 1000, range: [0, 400000] },
  gravityTurnEndKm: { key: 'gravityTurnEnd', scale: 1000, range: [30000, 150000] },
  parkingAltitudeKm: { key: 'parkingAltitude', scale: 1000, range: [0, 2000000] },
  pitchMaxDeg: { key: 'pitchMax', scale: 1, range: [0, 80] },
  pitchMinDeg: { key: 'pitchMin', scale: 1, range: [-60, 0] },
  slewRateDegS: { key: 'slewRate', scale: 1, range: [0.5, 20] },
  maxAccelMs2: { key: 'maxAccel', scale: 1, range: [0, 100] },
  maxTimeToGoS: { key: 'maxTimeToGo', scale: 1, range: [60, 10000] },
};

export const NUMBER_FIELDS: Record<string, NumberLimits> = {
  'setup.dynamics.seed': { min: 0, max: 0xffffffff, integer: true },
  'setup.payloadMass': { min: 1 },
  'setup.perigee': { min: 100 },
  'setup.apogee': { min: 100 },
  'setup.inclination': { min: 0, max: 180 },
  'setup.argPerigee': { min: 0, max: 360 },
  'setup.raan': { min: 0, max: 360 },
  'setup.ltan': { min: 0, max: 24 },
  // from the countdown's first seconds (a fire on the pad) on
  'setup.failureTime': { min: -10, max: 2000 },
  // --- P05: the flexible body's tunable parameters, in the units the panel shows
  'setup.flex.imuStation': { min: FLEX_LIMITS.imuStation[0] * 100, max: FLEX_LIMITS.imuStation[1] * 100 },
  'setup.flex.notchZetaZero': { min: FLEX_LIMITS.notchZetaZero[0], max: FLEX_LIMITS.notchZetaZero[1] },
  'setup.flex.notchZetaPole': { min: FLEX_LIMITS.notchZetaPole[0], max: FLEX_LIMITS.notchZetaPole[1] },
  'setup.flex.notchFrequencyScale': { min: FLEX_LIMITS.notchFrequencyScale[0], max: FLEX_LIMITS.notchFrequencyScale[1] },
  'setup.flex.bandwidthRatio': { min: FLEX_LIMITS.bandwidthRatio[0], max: FLEX_LIMITS.bandwidthRatio[1] },
  'setup.flex.sloshDamping': { min: FLEX_LIMITS.sloshDamping[0] * 100, max: FLEX_LIMITS.sloshDamping[1] * 100 },
  'setup.flex.bendingDamping': { min: FLEX_LIMITS.bendingDamping[0] * 100, max: FLEX_LIMITS.bendingDamping[1] * 100 },
  // --- E04: the attitude autopilot's tuning, in the units the panel shows
  ...Object.fromEntries(CONTROL_CHANNELS.flatMap((channel) => CONTROL_CHANNEL_KEYS.map((key) =>
    [controlFieldKey(channel, key), { min: CONTROL_LIMITS[key][0], max: CONTROL_LIMITS[key][1] }]))),
  [controlFieldKey('feedForward')]: { min: CONTROL_LIMITS.feedForward[0] * 100, max: CONTROL_LIMITS.feedForward[1] * 100 },
  // --- G02: the navigation's figures, in the units the panel shows
  ...Object.fromEntries(IMU_KEYS.map((key) => [NAV_FIELD_KEYS[key], { min: IMU_LIMITS[key][0], max: IMU_LIMITS[key][1] }])),
  ...Object.fromEntries(AIDING_KEYS.map((key) => [NAV_FIELD_KEYS[key], { min: AIDING_LIMITS[key][0], max: AIDING_LIMITS[key][1] }])),
  [NAV_FIELD_KEYS.gnssOutageStart]: { min: 0, max: 1e6 },
  [NAV_FIELD_KEYS.gnssOutageEnd]: { min: 0, max: 1e6 },
  // --- G01: the explicit guidance's cycle
  'setup.explicit.cycle': { min: 0.1, max: 4 },
};

/** Vehicle programmes are trusted data, not fresh user overrides. Extending a
 * field to include its shipped default preserves programmes outside a generic
 * UI band and lets the user put the displayed default back after an edit. */
export function guidanceLimits(key: keyof GuidanceParams, spec?: VehicleSpec): NumberLimits {
  const def = Object.values(GUIDANCE_FIELDS).find((f) => f.key === key)!;
  const baseline = spec ? guidanceForVehicle(spec)[key] : undefined;
  return {
    min: baseline === undefined ? def.range[0] : Math.min(def.range[0], baseline),
    max: baseline === undefined ? def.range[1] : Math.max(def.range[1], baseline),
  };
}

export function numericIssue(value: unknown, field: string, limits: NumberLimits = {}): ValidationIssue | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return { field, code: 'number' };
  if (limits.min !== undefined && value < limits.min) return { field, code: 'minimum', limit: limits.min };
  if (limits.max !== undefined && value > limits.max) return { field, code: 'maximum', limit: limits.max };
  if (limits.integer && !Number.isInteger(value)) return { field, code: 'integer' };
  return null;
}

export function parseNumberField(raw: string, field: string, limits: NumberLimits = {}): { value: number; issue: ValidationIssue | null } {
  if (!raw.trim()) return { value: NaN, issue: { field, code: 'required' } };
  // Accept ordinary decimal/scientific notation, never Number('0x10') or junk.
  const decimal = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(raw.trim());
  const value = decimal ? Number(raw) : NaN;
  return { value, issue: numericIssue(value, field, limits) };
}

/** datetime-local fields represent UTC in this app. Check the calendar before
 * constructing a Date: Date.UTC normalizes February 30 instead of rejecting it. */
export function parseUtcDateTime(raw: string, requireZone = false): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?$/.exec(raw);
  if (!m || (requireZone && !m[8])) return null;
  const [year, month, day, hour, minute, second] = m.slice(1, 7).map((v) => Number(v ?? 0));
  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) return null;
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month, 0);
  if (day > calendar.getUTCDate()) return null;
  if (m[8] && m[8] !== 'Z') {
    const [zh, zm] = m[8].slice(1).split(':').map(Number);
    if (zh > 23 || zm > 59) return null;
  }
  const date = new Date(`${raw}${m[8] ? '' : 'Z'}`);
  return Number.isFinite(date.getTime()) ? date : null;
}

export interface ConfigInput {
  dynamics?: DynamicsConfig;
  vehicleId: string; satelliteId: string; siteId: string;
  orbit: OrbitSpec; launchTime: Date; payloadMass: number;
  guidanceOverrides: Partial<GuidanceParams>; failure: FailureConfig; boosterRecovery: boolean;
  /** where each recovered stage is flown back to (`boosterRecovery` has to be on for it to fly) */
  recoveryPlan?: RecoveryPlan;
  /** the site's launch pad, when the mission names one (`SiteExtra.pads`) */
  padId?: string;
  /** fly on to the station and dock (roadmap G07) */
  rendezvous?: MissionConfig['rendezvous'];
}

/**
 * Lowest perigee a suborbital target may name, km: the trajectory has to come
 * back down, and a kilometre or so below the surface is where a real one aims
 * (Flight 5 flew 213 × −15 km), but not a dive into the core.
 */
const SUBORBITAL_PERIGEE_MIN = -1000;

/**
 * The limits a numeric field has for this orbit: a suborbital target's
 * perigee is below the ground (and no higher), and its flight may carry no
 * payload at all; everything else is `NUMBER_FIELDS`.
 */
/** Every failure scenario, in the order the mission panel offers them. */
export const FAILURE_MODES: readonly FailureMode[] = ['none', 'engineOut', 'thrustLoss', 'prematureSep', 'fairingStuck', 'rangeSafety',
  'launchAbort', 'padFire', 'boosterCollision', 'stagingFailure', 'random'];

/**
 * Whether a vehicle can have this failure: a launch abort needs an escape
 * system and a crew for it (roadmap G06), a strap-on collision strap-ons, a
 * stage separation failure a second stage.
 */
export function failureAvailable(mode: FailureMode, spec: VehicleSpec, satelliteId: string): boolean {
  if (mode === 'launchAbort') return !!spec.escapeSystem && !!satelliteById(satelliteId)?.crewed;
  if (mode === 'boosterCollision') return !!spec.stages[0]?.boosters?.length;
  if (mode === 'stagingFailure') return spec.stages.filter((st) => !st.isSpacecraft).length > 1;
  return true;
}

export function fieldLimits(field: string, orbit?: Pick<OrbitSpec, 'suborbital'>): NumberLimits | undefined {
  if (orbit?.suborbital) {
    if (field === 'setup.perigee') return { min: SUBORBITAL_PERIGEE_MIN, max: 0 };
    if (field === 'setup.payloadMass') return { min: 0 };
  }
  return NUMBER_FIELDS[field];
}

/**
 * A suborbital target is a flight whose upper stage flies itself home from
 * the cut-off (src/physics/sim/ship-descent.ts), which only a stage with flaps
 * does.
 */
export function flightHomeCapable(spec: VehicleSpec | undefined): boolean {
  return !!spec?.stages.some((st) => st.flaps);
}

/**
 * The recovery plan: every stage it names flown to a place the flight can
 * reach from its site, on the hardware that place needs — legs for a pad or a
 * drone ship's deck; a tower's arms take a stage without them.
 */
function recoveryPlanInvalid(plan: RecoveryPlan, spec: VehicleSpec, siteId: string): boolean {
  if (typeof plan !== 'object' || plan === null || Array.isArray(plan)) return true;
  if (!spec.recoverable) return true;
  const core = spec.stages[0];
  const strapOns = core.boosters?.reduce((n, b) => n + b.count, 0) ?? 0;
  const bad = (mode: RecoveryMode | undefined, legs: boolean): boolean => {
    if (mode === undefined) return false;
    if (typeof mode !== 'object' || mode === null) return true;
    if (mode.kind === 'downrange' || mode.kind === 'expended') return false;
    if (mode.kind === 'droneShip') return !legs;
    if (mode.kind !== 'landingZone') return true;
    const zone = LANDING_ZONES.find((z) => z.id === mode.zoneId);
    if (!zone || !zone.siteIds.includes(siteId)) return true;
    return zone.kind === 'tower' ? legs : !legs;
  };
  if (plan.boosters !== undefined && (!Array.isArray(plan.boosters) || plan.boosters.length > strapOns)) return true;
  // Strap-ons carry no leg flag of their own: Falcon Heavy's are Falcon 9 cores.
  return bad(plan.core, !!core.legs) || (plan.boosters ?? []).some((m) => bad(m, true));
}

export function validateConfigInput(state: ConfigInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const check = (value: unknown, field: string, limits: NumberLimits = {}): void => {
    const issue = numericIssue(value, field, limits);
    if (issue) issues.push(issue);
  };
  const spec = ALL_VEHICLES.find((v) => v.id === state.vehicleId);
  if (state.padId !== undefined && !SITES.find((x) => x.id === state.siteId)?.pads?.some((p) => p.id === state.padId)) {
    issues.push({ field: 'setup.site', code: 'selection' });
  }
  if (state.rendezvous !== undefined) {
    const rv = state.rendezvous;
    if (!rv || !PROFILE_IDS.includes(rv.profile) || (rv.port !== undefined && !PORT_IDS.includes(rv.port))) issues.push({ field: 'setup.rendezvous', code: 'selection' });
    else if (!rendezvousAvailable(state.vehicleId, state.satelliteId, state.orbit)) issues.push({ field: 'setup.rendezvous', code: 'rendezvousUnavailable' });
  }
  if (state.dynamics !== undefined) {
    const d = state.dynamics;
    if (!d || typeof d !== 'object' || Array.isArray(d)) issues.push({ field: 'setup.dynamics.model', code: 'selection' });
    else {
      if (d.model !== 'pointMass' && !(d.model === 'sixDof' && supportsRigid(state.vehicleId))) {
        issues.push({ field: 'setup.dynamics.model', code: 'selection' });
      }
      if (!['calm', 'crosswind', 'shear'].includes(d.wind)) issues.push({ field: 'setup.dynamics.wind', code: 'selection' });
      check(d.seed, 'setup.dynamics.seed', NUMBER_FIELDS['setup.dynamics.seed']);
      if (d.flex !== undefined) issues.push(...flexIssues(d.flex));
      if (d.control !== undefined) issues.push(...controlIssues(d.control));
      if (d.navigation !== undefined) issues.push(...navigationProblems(d.navigation).map(({ field, value, limits }): ValidationIssue =>
        (limits ? numericIssue(value, field, { min: limits[0], max: limits[1] }) : null) ?? { field, code: 'selection' }));
      if (d.controlFaults !== undefined) issues.push(...controlFaultsProblems(d.controlFaults, { navigation: d.navigation !== undefined })
        .map(({ field, value, limits }): ValidationIssue => (limits ? numericIssue(value, field, { min: limits[0], max: limits[1] }) : null) ?? { field, code: 'selection' }));
      if (d.explicitGuidance !== undefined) issues.push(...explicitGuidanceProblems(d.explicitGuidance)
        .map(({ field, value, limits }): ValidationIssue => (limits ? numericIssue(value, field, { min: limits[0], max: limits[1] }) : null) ?? { field, code: 'selection' }));
    }
  }
  if (!spec) issues.push({ field: 'setup.vehicle', code: 'selection' });
  const satellite = SATELLITES.find((s) => s.id === state.satelliteId);
  // a payload only some vehicles carry (Crew Dragon: Falcon 9)
  if (!satellite || (satellite.carriers && !satellite.carriers.includes(state.vehicleId))) issues.push({ field: 'setup.satellite', code: 'selection' });
  if (!SITES.some((s) => s.id === state.siteId) || (spec && !spec.sites.includes(state.siteId))) issues.push({ field: 'setup.site', code: 'selection' });
  const orbit = state.orbit;
  // A suborbital test flight may carry nothing at all (Flight 5 did not).
  check(state.payloadMass, 'setup.payloadMass', fieldLimits('setup.payloadMass', orbit));
  if (orbit.suborbital && spec && !flightHomeCapable(spec)) issues.push({ field: 'setup.perigee', code: 'suborbital' });
  check(orbit.perigee / 1000, 'setup.perigee', fieldLimits('setup.perigee', orbit));
  check(orbit.apogee / 1000, 'setup.apogee', NUMBER_FIELDS['setup.apogee']);
  if (Number.isFinite(orbit.perigee) && Number.isFinite(orbit.apogee) && orbit.perigee > orbit.apogee) {
    issues.push({ field: 'setup.perigee', code: 'orbitOrder' });
    issues.push({ field: 'setup.apogee', code: 'orbitOrder' });
  }
  if (orbit.inclination !== 'site' && orbit.inclination !== 'sso') check(orbit.inclination, 'setup.inclination', NUMBER_FIELDS['setup.inclination']);
  check(orbit.argPerigee, 'setup.argPerigee', NUMBER_FIELDS['setup.argPerigee']);
  if (!['free', 'fixed', 'iss', 'ltan'].includes(orbit.raanMode)) issues.push({ field: 'setup.raanMode', code: 'selection' });
  if (orbit.raanMode === 'fixed') check(orbit.raan ?? 0, 'setup.raan', NUMBER_FIELDS['setup.raan']);
  if (orbit.raanMode === 'ltan') check(orbit.ltan ?? 10.5, 'setup.ltan', NUMBER_FIELDS['setup.ltan']);
  if (!(state.launchTime instanceof Date) || !Number.isFinite(state.launchTime.getTime())) issues.push({ field: 'setup.launchTime', code: 'date' });
  for (const [key, value] of Object.entries(state.guidanceOverrides)) {
    if (!Object.values(GUIDANCE_FIELDS).some((f) => f.key === key)) issues.push({ field: 'setup.guidance', code: 'selection' });
    else {
      const def = Object.values(GUIDANCE_FIELDS).find((f) => f.key === key)!;
      const limits = guidanceLimits(def.key, spec);
      const issue = numericIssue(value, `setup.${key}`, limits);
      if (issue) issues.push({ ...issue, limit: issue.limit === undefined ? undefined : issue.limit / def.scale });
    }
  }
  if (!(FAILURE_MODES as readonly string[]).includes(state.failure.mode)) issues.push({ field: 'setup.failureMode', code: 'selection' });
  else if (spec && !failureAvailable(state.failure.mode, spec, state.satelliteId)) issues.push({ field: 'setup.failureMode', code: 'failureUnavailable' });
  check(state.failure.time, 'setup.failureTime', NUMBER_FIELDS['setup.failureTime']);
  check(state.failure.stage, 'setup.failureStage', { min: 0, max: spec ? spec.stages.length - 1 : 0, integer: true });
  if (typeof state.boosterRecovery !== 'boolean' || (state.boosterRecovery && spec && !spec.recoverable)) issues.push({ field: 'setup.boosterRecovery', code: 'selection' });
  else if (state.recoveryPlan !== undefined && spec && recoveryPlanInvalid(state.recoveryPlan, spec, state.siteId)) {
    issues.push({ field: 'setup.boosterRecovery', code: 'selection' });
  }
  return issues;
}

/** The flexible body (roadmap P05): booleans, and each tunable within its range. */
function flexIssues(flex: unknown): ValidationIssue[] {
  if (!flex || typeof flex !== 'object' || Array.isArray(flex)) return [{ field: 'setup.flex.title', code: 'selection' }];
  const f = flex as Record<string, unknown>, issues: ValidationIssue[] = [];
  for (const key of ['slosh', 'bending', 'notch']) {
    if (f[key] !== undefined && typeof f[key] !== 'boolean') issues.push({ field: `setup.flex.${key}`, code: 'selection' });
  }
  for (const [key, [min, max]] of Object.entries(FLEX_LIMITS)) {
    if (f[key] === undefined) continue;
    const issue = numericIssue(f[key], `setup.flex.${key}`, { min, max });
    if (issue) issues.push(issue);
  }
  return issues;
}

/** The attitude autopilot's tuning (roadmap E04): each setting within its range. */
function controlIssues(control: unknown): ValidationIssue[] {
  return controlProblems(control).map(({ field, value, limits }): ValidationIssue => {
    if (!limits) return { field, code: 'selection' };
    const scale = field === controlFieldKey('feedForward') ? 100 : 1;
    return numericIssue(typeof value === 'number' ? value * scale : value, field, { min: limits[0] * scale, max: limits[1] * scale })
      ?? { field, code: 'selection' };
  });
}

export function issueText(issue: ValidationIssue): string {
  switch (issue.code) {
    case 'required': return `${issue.field} is required`;
    case 'number': return `${issue.field} must be a finite number`;
    case 'minimum': return `${issue.field} must be at least ${issue.limit}`;
    case 'maximum': return `${issue.field} must be at most ${issue.limit}`;
    case 'integer': return `${issue.field} must be an integer`;
    case 'date': return `${issue.field} must be a valid ISO 8601 date-time`;
    case 'orbitOrder': return 'Custom orbit perigee must not exceed apogee';
    case 'selection': return `${issue.field} is not a valid selection`;
    case 'suborbital': return 'A suborbital target needs a vehicle whose upper stage flies itself home (Starship)';
    case 'failureUnavailable': return 'This vehicle cannot have that failure: a launch abort needs a crewed Soyuz, a strap-on collision strap-ons, a stage separation failure a second stage';
    case 'rendezvousUnavailable': return 'A flight to the station needs the crewed spacecraft on a Soyuz-2.1a and the ISS orbit';
  }
}

export function assertConfigInput(state: ConfigInput): void {
  const issues = validateConfigInput(state);
  if (issues.length) throw new Error(issues.map(issueText).join('; '));
}
