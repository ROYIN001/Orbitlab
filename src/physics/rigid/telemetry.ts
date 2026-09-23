import type { Vec3 } from '../vec3';
import type { Quat, Mat3 } from './math';
import { quatSlerp } from './math';
import { lerp } from '../vec3';
import type { WindScenario } from './aero';

/** Commands are inputs to finite actuators, never a replacement for body state. */
export interface RigidCommand {
  mode: 'auto' | 'manual';
  rates: Vec3;
  throttle: number;
}

/** Immutable recording payload. All angles and rates are radians internally. */
export interface RigidTelemetry {
  modelVersion: string;
  /** Vehicle data used for this sample; absent only in older recordings. */
  dataRevision?: string;
  /** Actual runtime weather profile, including sensitivity overrides. */
  windProfile?: WindScenario;
  /** Effective maximum RK substep, after the runtime's 10 ms ceiling. */
  integrationMaxStepS?: number;
  /** Maximum inertia finite-difference offset; actual offset also obeys outer dt/4. */
  flowDerivativeMaxStepS?: number;
  /** Explicit sensitivity assumption for rotational propellant mass flow. */
  massFlowModel?: 'quasiSteady' | 'reducedFlux';
  /** Stable physical body identity; configuration changes at discrete separation. */
  bodyId?: string;
  configurationId?: string;
  attitudeQ: Quat;
  omegaBody: Vec3;
  cgBody: Vec3;
  inertiaBody: Mat3;
  /** Current visible stack base relative to CG, body coordinates. */
  renderOffsetBody: Vec3;
  controlMode: 'auto' | 'manual';
  /** Accepted rate/throttle command, separate from measured rates and actuators. */
  commandRatesBody?: Vec3;
  commandThrottle?: number;
  engineDeflections: Record<string, number[]>;
  /** Applied chamber directions in this body's axes, after actuator limits. */
  engineDirectionsBody?: Record<string, Vec3>;
  /** Applied per-chamber throttle; includes engine-off/failure state. */
  engineThrottles?: Record<string, number>;
  /** Deflection of each aerodynamic control surface (grid fins), rad; absent on a body without them. */
  surfaceDeflections?: Record<string, number>;
  rcsPropellantKg: number;
  saturated: boolean;
  angleOfAttack: number;
  sideslip: number;
  aeroWithinEnvelope: boolean;
  windECI: Vec3;
  rawQuaternionNormError: number;
  /** Replay-only availability flag; false requires a retained-window warning. */
  replayAttitudeAvailable?: boolean;
}

export function cloneWindProfile(value: WindScenario | undefined): WindScenario | undefined {
  if (!value) return undefined;
  return { ...value,
    velocityENU: value.velocityENU ? { ...value.velocityENU } : undefined,
    shearPerMeterENU: value.shearPerMeterENU ? { ...value.shearPerMeterENU } : undefined,
    gustAmplitudeENU: value.gustAmplitudeENU ? { ...value.gustAmplitudeENU } : undefined,
    altitudeRangeM: value.altitudeRangeM ? [...value.altitudeRangeM] : undefined };
}

export function cloneRigidTelemetry(value: RigidTelemetry | undefined): RigidTelemetry | undefined {
  if (!value) return undefined;
  return { ...value, windProfile: cloneWindProfile(value.windProfile), attitudeQ: { ...value.attitudeQ }, omegaBody: { ...value.omegaBody },
    commandRatesBody: value.commandRatesBody ? { ...value.commandRatesBody } : undefined,
    cgBody: { ...value.cgBody }, inertiaBody: [...value.inertiaBody] as unknown as Mat3,
    renderOffsetBody: { ...value.renderOffsetBody }, windECI: { ...value.windECI },
    engineDeflections: Object.fromEntries(Object.entries(value.engineDeflections).map(([id, angles]) => [id, [...angles]])),
    engineDirectionsBody: value.engineDirectionsBody
      ? Object.fromEntries(Object.entries(value.engineDirectionsBody).map(([id, direction]) => [id, { ...direction }])) : undefined,
    engineThrottles: value.engineThrottles ? { ...value.engineThrottles } : undefined,
    surfaceDeflections: value.surfaceDeflections ? { ...value.surfaceDeflections } : undefined };
}

export function sameRigidConfiguration(a: RigidTelemetry | undefined, b: RigidTelemetry | undefined): boolean {
  return !!a && !!b && a.modelVersion === b.modelVersion && a.dataRevision === b.dataRevision && a.massFlowModel === b.massFlowModel
    && a.bodyId === b.bodyId && a.configurationId === b.configurationId;
}

/** Discrete modes/health and unknown/new actuator IDs belong to the left frame.
 * Separation never blends one body's attitude or mass geometry into another. */
export function interpolateRigidTelemetry(a: RigidTelemetry | undefined, b: RigidTelemetry | undefined, fraction: number): RigidTelemetry | undefined {
  const u = Math.max(0, Math.min(1, fraction));
  if (u >= 1) return cloneRigidTelemetry(b);
  const copy = cloneRigidTelemetry(a);
  if (!copy || !a || !b || !sameRigidConfiguration(a, b)) return copy;
  const mix = (x: number, y: number) => x + (y - x) * u;
  copy.attitudeQ = quatSlerp(a.attitudeQ, b.attitudeQ, u);
  copy.omegaBody = lerp(a.omegaBody, b.omegaBody, u);
  copy.windECI = lerp(a.windECI, b.windECI, u);
  copy.cgBody = lerp(a.cgBody, b.cgBody, u);
  copy.renderOffsetBody = lerp(a.renderOffsetBody, b.renderOffsetBody, u);
  copy.inertiaBody = a.inertiaBody.map((value, index) => mix(value, b.inertiaBody[index])) as unknown as Mat3;
  copy.rcsPropellantKg = mix(a.rcsPropellantKg, b.rcsPropellantKg);
  copy.angleOfAttack = mix(a.angleOfAttack, b.angleOfAttack);
  copy.sideslip = mix(a.sideslip, b.sideslip);
  for (const [id, angles] of Object.entries(copy.engineDeflections)) {
    const next = b.engineDeflections[id];
    if (next?.length === angles.length) copy.engineDeflections[id] = angles.map((angle, i) => mix(angle, next[i]));
  }
  for (const [id, direction] of Object.entries(copy.engineDirectionsBody ?? {})) {
    const next = b.engineDirectionsBody?.[id];
    if (next) {
      const blended = lerp(direction, next, u);
      const length = Math.hypot(blended.x, blended.y, blended.z);
      if (length > 1e-12) copy.engineDirectionsBody![id] = { x: blended.x / length, y: blended.y / length, z: blended.z / length };
    }
  }
  for (const [id, angle] of Object.entries(copy.surfaceDeflections ?? {})) {
    const next = b.surfaceDeflections?.[id];
    if (next !== undefined) copy.surfaceDeflections![id] = mix(angle, next);
  }
  for (const [id, throttle] of Object.entries(copy.engineThrottles ?? {})) {
    const next = b.engineThrottles?.[id];
    // Ignition and cutoff/failure are discrete. Do not preview a future firing
    // chamber or fade a failed engine before its recorded boundary.
    if (next !== undefined && throttle > 0 && next > 0) copy.engineThrottles![id] = mix(throttle, next);
  }
  return copy;
}
