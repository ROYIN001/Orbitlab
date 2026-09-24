/**
 * The flexible body of roadmap P05: propellant slosh, the first bending mode
 * and the notch filter, coupled to the six-DOF rigid body. Off by default; a
 * runtime without it runs the rigid code path untouched.
 *
 * Equations (docs/PHYSICS.md §2b). The body frame's origin O is the stack's
 * centre of mass with every liquid at rest, the point the rigid model flies.
 * Each sloshing tank i contributes a point mass mᵢ at ρᵢ = pᵢ + sᵢ, free across
 * its tank on a spring and damper fᵢ = −kᵢsᵢ − cᵢṡᵢ, carried along the tank
 * axis eᵢ by a constraint force Nᵢ. The rest of the stack, B (mass m_B, centre b,
 * inertia I_B about b), is rigid; the bending mode is orthogonal to its rigid
 * motion. With a = the non-gravitational acceleration of O and α = ω̇, in body
 * axes:
 *
 *   B:  m_B(a + α×b + ω×(ω×b)) = F − Σ(fᵢ + Nᵢeᵢ)
 *       I_B α + ω×I_Bω = M_O − b×F − Σ(ρᵢ − b)×(fᵢ + Nᵢeᵢ)
 *   mᵢ: mᵢ(a + α×ρᵢ + ω×(ω×ρᵢ) + 2ω×ṡᵢ + s̈ᵢ + φ(xᵢ)η̈) = fᵢ + Nᵢeᵢ
 *   η:  M_g(η̈ + 2ζωη̇ + ω²η) = Σₖ φ(xₖ)F_k,lat
 *
 * The axial row of each tank's equation gives Nᵢ linear in (a, α); the body's
 * six equations are then solved exactly, every time the integrator evaluates
 * them. Gravity acts alike on every part and drops out of all of it.
 */
import { vehicleById } from '../../data/vehicles';
import type { FlexConfig } from '../../types';
import { add, cross, dot, norm, scale, sub, v3, type Vec3 } from '../vec3';
import type { EngineWrench } from './actuators';
import type { ControlGains } from './control';
import { buildBeam, firstBendingMode, lineSegment, modeDeflection, modeSlope, type BendingMode } from './bending';
import { matVecMul, quatFromAxisAngle, quatMultiply, quatRotate, type Mat3, type Quat } from './math';
import type { RigidVehicleSnapshot } from './mass';
import { BiquadChannel, notchCoefficients, type Biquad } from './notch';
import { sloshTanks, type SloshTank } from './slosh';
import type { RcsThrusterGeometry } from './vehicle-data';

/** What the six-DOF runtime is asked to model (all off: the rigid body). */
export interface FlexOptions {
  slosh: boolean;
  bending: boolean;
  notch: boolean;
  /** IMU station as a fraction of the stack from its aft end; absent, the instrument bay. */
  imuStation?: number;
  notchZetaZero: number;
  notchZetaPole: number;
  /** notch centre per predicted bending frequency (1: tuned) */
  notchFrequencyScale: number;
  /** with the filter on, the attitude loop's rate gain is held to the bending frequency over this */
  bandwidthRatio: number;
  sloshDamping: number;
  bendingDamping: number;
}
export const FLEX_DEFAULTS = {
  notchZetaZero: 0.02, notchZetaPole: 0.3, notchFrequencyScale: 1, bandwidthRatio: 6, sloshDamping: 0.03, bendingDamping: 0.005,
} as const;

/** Allowed ranges of the tunable parameters, as configured. */
export const FLEX_LIMITS = {
  imuStation: [0, 1], notchZetaZero: [0, 1], notchZetaPole: [0.05, 1], notchFrequencyScale: [0.5, 2], bandwidthRatio: [2, 12],
  sloshDamping: [0, 0.2], bendingDamping: [0, 0.2],
} as const satisfies Record<string, readonly [number, number]>;

/** Whether a configured flexible body is well formed (every field optional). */
export function validFlexConfig(value: unknown): value is FlexConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const f = value as Record<string, unknown>;
  for (const key of ['slosh', 'bending', 'notch'] as const) if (f[key] !== undefined && typeof f[key] !== 'boolean') return false;
  for (const [key, [lo, hi]] of Object.entries(FLEX_LIMITS)) {
    const x = f[key];
    if (x !== undefined && (typeof x !== 'number' || !Number.isFinite(x) || x < lo || x > hi)) return false;
  }
  return true;
}

/** The runtime's options for a configured flexible body; undefined when nothing is modelled. */
export function resolveFlexOptions(config: FlexConfig | undefined): FlexOptions | undefined {
  if (!config || !(config.slosh || config.bending || config.notch)) return undefined;
  return { slosh: !!config.slosh, bending: !!config.bending, notch: !!config.notch,
    ...(config.imuStation !== undefined ? { imuStation: config.imuStation } : {}),
    notchZetaZero: config.notchZetaZero ?? FLEX_DEFAULTS.notchZetaZero, notchZetaPole: config.notchZetaPole ?? FLEX_DEFAULTS.notchZetaPole,
    notchFrequencyScale: config.notchFrequencyScale ?? FLEX_DEFAULTS.notchFrequencyScale,
    bandwidthRatio: config.bandwidthRatio ?? FLEX_DEFAULTS.bandwidthRatio,
    sloshDamping: config.sloshDamping ?? FLEX_DEFAULTS.sloshDamping, bendingDamping: config.bendingDamping ?? FLEX_DEFAULTS.bendingDamping };
}

/** The liquid settles and sloshes only under at least this much thrust, m/s² (≈ 0.1 g). */
export const SLOSH_MIN_ACCEL = 1;
/**
 * A mode faster than this, per integration step (ω·h), is carried
 * quasi-statically: RK4 cannot follow it (its limit is 2.8), and nothing the
 * autopilot or its actuators do reaches it. At the 0.01 s step: 16 Hz.
 */
export const DYNAMIC_MODE_LIMIT = 1;
/** Bending mode (and the notch centre) is recomputed on this grid of flight time, s. */
export const MODE_UPDATE_S = 0.5;
/** Effective failure stress of the load-bearing shells, Pa (docs/PHYSICS.md §2b). */
export const SHELL_ALLOWABLE_STRESS = 250e6;

export interface FlexTelemetry {
  slosh?: { active: boolean; tanks: { id: string; stationX: number; massKg: number; frequencyHz: number; displacementM: number }[] };
  bending?: {
    /** in flight, under the current thrust; and of the unloaded structure */
    frequencyHz: number; structuralFrequencyHz: number; generalizedMassKg: number; modal: { y: number; z: number };
    /** largest deflection of the stack, m */
    deflectionM: number;
    /** mode shape, every fourth beam node: stations (body x) and deflection per unit modal coordinate */
    shapeX: number[]; shapeW: number[];
    imuStationX: number; imuSlope: number;
    /** attitude the IMU reads off the rigid body's, rad */
    sensorErrorRad: number;
    /** largest shell stress over the allowable, and where */
    loadRatio: number; loadStationX: number;
  };
  notch?: { centerHz: number; zetaZero: number; zetaPole: number; active: boolean };
}

interface TankState { u: number; w: number; du: number; dw: number }
interface StepContext {
  tanks: SloshTank[];
  axialAccel: number;
  mode?: BendingMode;
  imuX: number;
  /** the mode's frequency under this step's thrust, rad/s (what the notch is centred on) */
  loadedFrequency: number;
  /** the mode is integrated; otherwise it is too stiff for the step and follows its load (quasi-static) */
  dynamicBending: boolean;
}
export interface FlexLoadsInput {
  snapshot: RigidVehicleSnapshot;
  attitudeQ: Quat;
  omegaBody: Vec3;
  flex: readonly number[];
  engine: EngineWrench;
  enginePositions: readonly Vec3[];
  rcsJets: readonly RcsThrusterGeometry[];
  rcsDuties: readonly number[];
  /** RCS wrench about the step's starting centre of mass, already shifted to this snapshot's */
  rcsForceBody: Vec3;
  rcsMomentBody: Vec3;
  aeroForceBody: Vec3;
  aeroMomentBody: Vec3;
  gravityECI: Vec3;
  flowMomentBody: Vec3;
}
export interface FlexLoadsResult {
  accelerationECI: Vec3;
  omegaDotBody: Vec3;
  rates: number[];
  forceBody: Vec3;
  momentBody: Vec3;
  /** shell stress over allowable, when bending is modelled */
  loadRatio?: number;
  loadStationX?: number;
}

const X = v3(1, 0, 0);
const shiftTensor = (d: Vec3, m: number): number[] => {
  const d2 = dot(d, d), p = [d.x, d.y, d.z];
  return [0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => m * ((row === col ? d2 : 0) - p[row] * p[col])));
};

/** Solve a small dense system by Gaussian elimination with partial pivoting. */
export function solveDense(A: number[][], b: number[]): number[] {
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[pivot][c])) pivot = r;
    if (!(Math.abs(M[pivot][c]) > 0)) throw new RangeError('Singular flexible-body system');
    [M[c], M[pivot]] = [M[pivot], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      if (f !== 0) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

const launcherStages = new Map<string, Set<string>>();
function launcherStageIds(vehicleId: string): Set<string> {
  let ids = launcherStages.get(vehicleId);
  if (!ids) {
    ids = new Set<string>();
    try { for (const stage of vehicleById(vehicleId).stages) if (!stage.isSpacecraft) ids.add(stage.id); } catch { /* synthetic vehicle */ }
    launcherStages.set(vehicleId, ids);
  }
  return ids;
}

/** The instrument bay: the forward end of the uppermost launcher stage still attached. */
export function instrumentBayStation(snapshot: RigidVehicleSnapshot): number {
  const launchers = launcherStageIds(snapshot.geometry.vehicleId);
  let top = -Infinity;
  for (const part of snapshot.components) {
    if (part.kind !== 'structure' || !launchers.has(part.ownerId)) continue;
    const segment = lineSegment(part);
    top = Math.max(top, segment.to - 0.01 * (segment.to - segment.from));
  }
  if (Number.isFinite(top)) return top;
  return snapshot.cg.x;
}

export class FlexBody {
  private readonly tanks = new Map<string, TankState>();
  private eta = { y: 0, z: 0, dy: 0, dz: 0 };
  private readonly notchY = new BiquadChannel();
  private readonly notchZ = new BiquadChannel();
  private notchPrimed = false;
  private notchFilter: Biquad | null = null;
  private mode?: BendingMode;
  private modeKey = '';
  private modeConfiguration = '';
  private lastEnd?: number;
  private context?: StepContext;
  private lastLoads?: { ratio: number; station: number };
  private sloshActive = false;
  private sensorError = 0;
  /** the tanks of each mass snapshot the integrator evaluates (a step reuses a few) */
  private readonly tanksBySnapshot = new WeakMap<RigidVehicleSnapshot, SloshTank[]>();
  /** the quasi-static deflection of a mode too stiff to integrate, at the step's start */
  private staticEta?: { y: number; z: number };

  constructor(readonly options: FlexOptions) {}

  get modelsBending(): boolean { return this.options.bending || this.options.notch; }

  /**
   * Start one control step: pick up the tanks that slosh and the current bending
   * mode, and return the flexible state the integrator carries through the step.
   */
  begin(time: number, dt: number, start: RigidVehicleSnapshot, aeroForceBody: Vec3, integrationStep = 0.01): number[] {
    // A step that does not continue the last one (a held coast, a re-synchronised
    // body) starts the flexible motion from rest: the autopilot was idle and the
    // body settled.
    if (this.lastEnd !== undefined && Math.abs(time - this.lastEnd) > 1e-6) this.resetMotion();
    let thrust = 0;
    for (const engine of start.engines) thrust += engine.thrustBudgetN * engine.directionBody.x;
    const axialAccel = (thrust + aeroForceBody.x) / start.mass;
    const active = this.options.slosh && axialAccel >= SLOSH_MIN_ACCEL;
    if (!active) this.tanks.clear();
    const tanks = active ? sloshTanks(start.components, start.geometry.vehicleId) : [];
    const ids = new Set(tanks.map((tank) => tank.id));
    for (const id of [...this.tanks.keys()]) if (!ids.has(id)) this.tanks.delete(id);
    if (active !== this.sloshActive) this.modeKey = '';
    this.sloshActive = active;
    let mode: BendingMode | undefined;
    if (this.modelsBending) {
      const configuration = start.components.map((part) => part.id).join('|');
      const key = `${configuration}#${Math.floor(time / MODE_UPDATE_S + 1e-9)}`;
      if (key !== this.modeKey || !this.mode) {
        // A separation changes the structure: its bending starts from rest, and
        // its mode is found afresh (the same structure's last mode starts the search).
        const same = configuration === this.modeConfiguration;
        if (!same) this.eta = { y: 0, z: 0, dy: 0, dz: 0 };
        this.modeConfiguration = configuration;
        const scaleLiquid = new Map(tanks.map((tank) => [tank.id, 1 - tank.massKg / tank.liquidMassKg]));
        this.mode = firstBendingMode(buildBeam(start.components, scaleLiquid), same ? this.mode : undefined);
        this.modeKey = key;
      }
      mode = this.mode;
    }
    const beam = mode?.beam;
    const imuX = beam && this.options.imuStation !== undefined
      ? beam.x[0] + this.options.imuStation * (beam.x[beam.x.length - 1] - beam.x[0]) : instrumentBayStation(start);
    const loadedFrequency = mode ? thrustLoadedFrequency(mode, start, axialAccel) : 0;
    const dynamicBending = this.options.bending && !!mode && loadedFrequency * integrationStep <= DYNAMIC_MODE_LIMIT;
    if (this.options.bending && !dynamicBending) { this.eta.dy = 0; this.eta.dz = 0; }
    this.context = { tanks, axialAccel: Math.max(axialAccel, SLOSH_MIN_ACCEL), mode, imuX, loadedFrequency, dynamicBending };
    if (this.options.notch && mode) {
      this.notchFilter = notchCoefficients(loadedFrequency * this.options.notchFrequencyScale,
        this.options.notchZetaZero, this.options.notchZetaPole, dt > 0 ? dt : 0.01);
    }
    const flex: number[] = [];
    for (const tank of tanks) {
      const s = this.tanks.get(tank.id) ?? { u: 0, w: 0, du: 0, dw: 0 };
      flex.push(s.u, s.w, s.du, s.dw);
    }
    if (dynamicBending) flex.push(this.eta.y, this.eta.z, this.eta.dy, this.eta.dz);
    return flex;
  }

  /** G02: what the IMU's case reads, as `sensed`, without recording it (the navigation's truth at a step's end). */
  imuCase(attitudeQ: Quat, omegaBody: Vec3): { attitudeQ: Quat; omegaBody: Vec3 } {
    const recorded = this.sensorError, reading = this.sensed(attitudeQ, omegaBody);
    this.sensorError = recorded;
    return reading;
  }

  /** Keep the state at the end of the step. */
  end(time: number, flex: readonly number[] | undefined): void {
    const context = this.context;
    this.lastEnd = time;
    if (!context || !flex) return;
    context.tanks.forEach((tank, i) => this.tanks.set(tank.id, { u: flex[4 * i], w: flex[4 * i + 1], du: flex[4 * i + 2], dw: flex[4 * i + 3] }));
    if (context.dynamicBending) {
      const at = 4 * context.tanks.length;
      this.eta = { y: flex[at], z: flex[at + 1], dy: flex[at + 2], dz: flex[at + 3] };
    } else if (this.options.bending && this.staticEta) this.eta = { y: this.staticEta.y, z: this.staticEta.z, dy: 0, dz: 0 };
  }

  resetMotion(): void {
    this.tanks.clear();
    this.eta = { y: 0, z: 0, dy: 0, dz: 0 };
    this.notchY.reset(); this.notchZ.reset(); this.notchPrimed = false;
  }

  /** What the IMU reads: the rigid attitude and rate plus the bending at its station. */
  sensed(attitudeQ: Quat, omegaBody: Vec3): { attitudeQ: Quat; omegaBody: Vec3 } {
    const mode = this.context?.mode;
    if (!this.options.bending || !mode) { this.sensorError = 0; return { attitudeQ, omegaBody }; }
    const slope = modeSlope(mode, this.context!.imuX);
    // Deflection v = φη_y turns the local axis about +z by v′, w = φη_z about +y by −w′.
    const tilt = v3(0, -slope * this.eta.z, slope * this.eta.y), angle = norm(tilt);
    this.sensorError = angle;
    return { attitudeQ: angle > 0 ? quatMultiply(attitudeQ, quatFromAxisAngle(scale(tilt, 1 / angle), angle)) : attitudeQ,
      omegaBody: add(omegaBody, v3(0, -slope * this.eta.dz, slope * this.eta.dy)) };
  }

  /**
   * The autopilot for a flexible vehicle: with the bending filter on, its rate
   * gain stays a set ratio below the predicted bending frequency, and its
   * attitude gain half that, so the loop gain is below one where the notch
   * does not reach (docs/PHYSICS.md §2b).
   */
  limitGains(gains: ControlGains): ControlGains {
    const frequency = this.context?.loadedFrequency;
    if (!this.options.notch || !frequency) return gains;
    const rate = frequency / this.options.bandwidthRatio, cap = (value: number, limit: number) => Math.min(value, limit);
    return { ...gains, rateGain: v3(gains.rateGain.x, cap(gains.rateGain.y, rate), cap(gains.rateGain.z, rate)),
      attitudeGain: v3(gains.attitudeGain.x, cap(gains.attitudeGain.y, rate / 2), cap(gains.attitudeGain.z, rate / 2)) };
  }

  /** G04: this step's flexible state layout, the IMU's view of the bending, and the notch, for the linearised loop. */
  linearContext(): { tanks: string[]; bending: boolean; imuSlope: number; notch?: Biquad } {
    const c = this.context;
    if (!c) return { tanks: [], bending: false, imuSlope: 0 };
    return { tanks: c.tanks.map((tank) => tank.id), bending: c.dynamicBending,
      imuSlope: this.options.bending && c.mode ? modeSlope(c.mode, c.imuX) : 0,
      ...(this.options.notch && this.notchFilter ? { notch: { ...this.notchFilter } } : {}) };
  }

  /** The notch on the pitch and yaw torque the autopilot asks for. */
  filterMoment(moment: Vec3): Vec3 {
    const filter = this.notchFilter;
    if (!this.options.notch || !filter) return moment;
    if (!this.notchPrimed) { this.notchY.settle(moment.y, filter); this.notchZ.settle(moment.z, filter); this.notchPrimed = true; }
    return v3(moment.x, this.notchY.step(moment.y, filter), this.notchZ.step(moment.z, filter));
  }

  /**
   * Accelerations of the coupled body at one integrator evaluation. `loads`
   * also computes the shell stresses (force summation) when asked.
   */
  loads(input: FlexLoadsInput, withStress = false): FlexLoadsResult {
    const context = this.context!;
    const { snapshot, omegaBody: w, flex } = input;
    const cg = snapshot.cg, bent = this.options.bending ? context.mode : undefined;
    // An integrated mode tilts the thrust and the tanks; a quasi-static one only
    // follows its load (its tilt is of the order of its tiny deflection).
    const mode = context.dynamicBending ? bent : undefined;
    const at = 4 * context.tanks.length;
    const eta = mode ? { y: flex[at], z: flex[at + 1], dy: flex[at + 2], dz: flex[at + 3] } : { y: 0, z: 0, dy: 0, dz: 0 };
    // Lateral point loads on the structure: station, force (body), position.
    const pointLoads: { x: number; position: Vec3; force: Vec3 }[] = [];
    // Engines: thrust follows the local slope of the bent structure.
    let forceBody = add(input.rcsForceBody, input.aeroForceBody), momentBody = add(input.rcsMomentBody, input.aeroMomentBody);
    input.engine.engines.forEach((engine, k) => {
      const position = input.enginePositions[k];
      let force = engine.forceBody;
      if (mode && engine.thrust > 0) {
        const slope = modeSlope(mode, position.x);
        force = add(force, scale(v3(0, slope * eta.y, slope * eta.z), engine.thrust));
      }
      forceBody = add(forceBody, force);
      momentBody = add(momentBody, cross(sub(position, cg), force));
      pointLoads.push({ x: position.x, position, force });
    });
    input.rcsJets.forEach((jet, k) => {
      const duty = input.rcsDuties[k] ?? 0;
      if (duty > 0) pointLoads.push({ x: jet.positionBody.x, position: jet.positionBody, force: scale(jet.directionBody, jet.maxThrust * duty / norm(jet.directionBody)) });
    });
    // Aerodynamic normal force, lumped at its centre of pressure.
    const aeroLateral = v3(0, input.aeroForceBody.y, input.aeroForceBody.z), lateral2 = dot(aeroLateral, aeroLateral);
    const cpX = lateral2 > 0 ? cg.x + (input.aeroMomentBody.z * aeroLateral.y - input.aeroMomentBody.y * aeroLateral.z) / lateral2 : cg.x;
    pointLoads.push({ x: cpX, position: v3(cpX, cg.y, cg.z), force: input.aeroForceBody });

    // Slosh masses and the rigid remainder.
    let stageTanks = this.tanksBySnapshot.get(snapshot);
    if (!stageTanks) {
      stageTanks = context.tanks.length ? sloshTanks(snapshot.components, snapshot.geometry.vehicleId) : [];
      this.tanksBySnapshot.set(snapshot, stageTanks);
    }
    const tanks = context.tanks.map((start, i) => {
      const tank = stageTanks.find((t) => t.id === start.id) ?? start;
      const omega2 = tank.stiffnessPerAccel * context.axialAccel, zeta = this.options.sloshDamping;
      const s = v3(0, flex[4 * i], flex[4 * i + 1]), ds = v3(0, flex[4 * i + 2], flex[4 * i + 3]);
      const p = sub(tank.stationBody, cg), rho = add(p, s);
      const slope = mode ? modeSlope(mode, tank.stationBody.x) : 0;
      const e = mode ? v3(1, slope * eta.y, slope * eta.z) : X;
      const spring = sub(scale(s, -tank.massKg * omega2), scale(ds, 2 * zeta * tank.massKg * Math.sqrt(omega2)));
      const q = add(cross(w, cross(w, rho)), scale(cross(w, ds), 2));
      return { tank, m: tank.massKg, p, s, ds, rho, e, spring, q };
    });
    let mB = snapshot.mass, first = v3();
    for (const t of tanks) { mB -= t.m; first = add(first, scale(t.p, t.m)); }
    const b = scale(first, -1 / mB);
    const IB = [...snapshot.inertia] as number[];
    const subtract = (tensor: number[]) => tensor.forEach((value, index) => { IB[index] -= value; });
    subtract(shiftTensor(b, mB));
    for (const t of tanks) subtract(shiftTensor(t.p, t.m));

    // Six equations in a and α.
    const A = Array.from({ length: 6 }, () => Array<number>(6).fill(0));
    const rhs = Array<number>(6).fill(0);
    const skewB = [[0, -b.z, b.y], [b.z, 0, -b.x], [-b.y, b.x, 0]];
    for (let r = 0; r < 3; r++) {
      A[r][r] += mB;
      for (let c = 0; c < 3; c++) { A[r][3 + c] -= mB * skewB[r][c]; A[3 + r][3 + c] += IB[3 * r + c]; }
    }
    const wIw = cross(w, matVecMul(IB as unknown as Mat3, w));
    const wwb = cross(w, cross(w, b));
    const trans = sub(forceBody, scale(wwb, mB));
    let rot = add(sub(sub(momentBody, cross(b, forceBody)), wIw), input.flowMomentBody);
    let transAcc = trans;
    for (const t of tanks) {
      const d = sub(t.rho, b), k = t.m / t.e.x, rxe = cross(t.rho, X), dxe = cross(d, t.e);
      const E = [t.e.x, t.e.y, t.e.z], D = [dxe.x, dxe.y, dxe.z], R = [rxe.x, rxe.y, rxe.z];
      for (let r = 0; r < 3; r++) {
        A[r][0] += k * E[r];
        A[3 + r][0] += k * D[r];
        for (let c = 0; c < 3; c++) { A[r][3 + c] += k * E[r] * R[c]; A[3 + r][3 + c] += k * D[r] * R[c]; }
      }
      transAcc = sub(sub(transAcc, t.spring), scale(t.e, k * t.q.x));
      rot = sub(sub(rot, cross(d, t.spring)), scale(dxe, k * t.q.x));
    }
    rhs[0] = transAcc.x; rhs[1] = transAcc.y; rhs[2] = transAcc.z; rhs[3] = rot.x; rhs[4] = rot.y; rhs[5] = rot.z;
    const solution = solveDense(A, rhs);
    const a = v3(solution[0], solution[1], solution[2]), alpha = v3(solution[3], solution[4], solution[5]);

    // Constraint forces, then the bending mode, then the slosh accelerations.
    const reactions = tanks.map((t) => {
      const N = t.m / t.e.x * (a.x + dot(cross(t.rho, X), alpha) + t.q.x);
      const onMass = add(t.spring, scale(t.e, N));
      pointLoads.push({ x: t.tank.stationBody.x, position: add(t.p, cg), force: scale(onMass, -1) });
      return onMass;
    });
    let etaAcc = { y: 0, z: 0 };
    if (bent && !mode && withStress) {
      let qy = 0, qz = 0, follower = 0;
      for (const load of pointLoads) { const phi = modeDeflection(bent, load.x); qy += phi * load.force.y; qz += phi * load.force.z; }
      input.engine.engines.forEach((engine, k) => { const x = input.enginePositions[k].x; follower += engine.thrust * modeDeflection(bent, x) * modeSlope(bent, x); });
      const stiffness = Math.max(bent.frequencyRadS ** 2 * bent.generalizedMassKg - follower - a.x * bent.compressionIntegral,
        0.04 * bent.frequencyRadS ** 2 * bent.generalizedMassKg);
      this.staticEta = { y: qy / stiffness, z: qz / stiffness };
    }
    if (mode) {
      let qy = 0, qz = 0;
      for (const load of pointLoads) { const phi = modeDeflection(mode, load.x); qy += phi * load.force.y; qz += phi * load.force.z; }
      // The axial compression softens the bent stack (geometric stiffness); the
      // follower thrust above stiffens it back, and the two largely cancel
      // (Beal, AIAA J. 3(3), 1965).
      const geometric = a.x * mode.compressionIntegral;
      qy += geometric * eta.y; qz += geometric * eta.z;
      const wn = mode.frequencyRadS, zeta = this.options.bendingDamping;
      etaAcc = { y: qy / mode.generalizedMassKg - 2 * zeta * wn * eta.dy - wn * wn * eta.y,
        z: qz / mode.generalizedMassKg - 2 * zeta * wn * eta.dz - wn * wn * eta.z };
    }
    const rates: number[] = [];
    tanks.forEach((t, i) => {
      const phi = mode ? modeDeflection(mode, t.tank.stationBody.x) : 0;
      const acc = sub(scale(reactions[i], 1 / t.m), add(add(a, cross(alpha, t.rho)), t.q));
      rates.push(t.ds.y, t.ds.z, acc.y - phi * etaAcc.y, acc.z - phi * etaAcc.z);
    });
    if (mode) rates.push(eta.dy, eta.dz, etaAcc.y, etaAcc.z);
    const result: FlexLoadsResult = { accelerationECI: add(input.gravityECI, quatRotate(input.attitudeQ, a)), omegaDotBody: alpha, rates, forceBody, momentBody };
    if (withStress && bent) {
      const stress = shellLoads(bent, pointLoads, a, alpha, w, etaAcc, cg);
      result.loadRatio = stress.ratio; result.loadStationX = stress.station;
      this.lastLoads = stress;
    }
    return result;
  }

  telemetry(): FlexTelemetry {
    const context = this.context, out: FlexTelemetry = {};
    if (this.options.slosh) {
      out.slosh = { active: this.sloshActive, tanks: (context?.tanks ?? []).map((tank) => {
        const s = this.tanks.get(tank.id) ?? { u: 0, w: 0, du: 0, dw: 0 };
        return { id: tank.id, stationX: tank.stationBody.x, massKg: tank.massKg,
          frequencyHz: Math.sqrt(tank.stiffnessPerAccel * context!.axialAccel) / (2 * Math.PI), displacementM: Math.hypot(s.u, s.w) };
      }) };
    }
    const mode = context?.mode;
    if (this.options.bending && mode) {
      let largest = 0;
      for (const value of mode.w) largest = Math.max(largest, Math.abs(value));
      out.bending = { frequencyHz: context!.loadedFrequency / (2 * Math.PI), structuralFrequencyHz: mode.frequencyRadS / (2 * Math.PI),
        generalizedMassKg: mode.generalizedMassKg,
        modal: { y: this.eta.y, z: this.eta.z }, deflectionM: largest * Math.hypot(this.eta.y, this.eta.z),
        shapeX: [...mode.beam.x].filter((_, i) => i % 4 === 0), shapeW: [...mode.w].filter((_, i) => i % 4 === 0), imuStationX: context!.imuX, imuSlope: modeSlope(mode, context!.imuX),
        sensorErrorRad: this.sensorError, loadRatio: this.lastLoads?.ratio ?? 0, loadStationX: this.lastLoads?.station ?? 0 };
    }
    if (this.options.notch && mode) {
      out.notch = { centerHz: context!.loadedFrequency * this.options.notchFrequencyScale / (2 * Math.PI),
        zetaZero: this.options.notchZetaZero, zetaPole: this.options.notchZetaPole, active: !!this.notchFilter };
    }
    return out;
  }
}

/**
 * The bending frequency in flight: the structure's, less the geometric
 * softening of the axial compression, plus the stiffening of thrust that
 * follows the local slope at each engine. It is what the flight software
 * predicts, and where the notch goes.
 */
export function thrustLoadedFrequency(mode: BendingMode, snapshot: RigidVehicleSnapshot, axialAccel: number): number {
  let follower = 0;
  for (const engine of snapshot.engines) {
    if (!(engine.thrustBudgetN > 0)) continue;
    follower += engine.thrustBudgetN * modeDeflection(mode, engine.positionBody.x) * modeSlope(mode, engine.positionBody.x);
  }
  const stiffness = mode.frequencyRadS ** 2 * mode.generalizedMassKg - follower - axialAccel * mode.compressionIntegral;
  return Math.sqrt(Math.max(stiffness, 0.04 * mode.frequencyRadS ** 2 * mode.generalizedMassKg) / mode.generalizedMassKg);
}

/**
 * Shell stresses by force summation: at each element's middle, the axial force
 * and bending moment the part aft of it carries — its external loads and its
 * inertia, rigid and elastic — over the section's wall area and modulus.
 */
function shellLoads(mode: BendingMode, pointLoads: readonly { x: number; position: Vec3; force: Vec3 }[],
  a: Vec3, alpha: Vec3, w: Vec3, etaAcc: { y: number; z: number }, cg: Vec3): { ratio: number; station: number } {
  const beam = mode.beam, n = beam.x.length - 1, l = beam.elementLength, x0 = beam.x[0];
  const points = [...pointLoads].sort((p, q) => p.x - q.x);
  // Sums of the loads aft of the section: force, and moment (y, z) about the body origin.
  let fx = 0, fy = 0, fz = 0, my = 0, mz = 0;
  const addLoad = (px: number, py: number, pz: number, Fx: number, Fy: number, Fz: number): void => {
    fx += Fx; fy += Fy; fz += Fz; my += pz * Fx - px * Fz; mz += px * Fy - py * Fx;
  };
  const w2 = w.x * w.x + w.y * w.y + w.z * w.z;
  let ratio = 0, station = x0, j = 0;
  for (let e = 0; e < n; e++) {
    const xm = x0 + (e + 0.5) * l;
    while (j < points.length && points[j].x < xm) {
      const p = points[j++];
      addLoad(p.position.x, p.position.y, p.position.z, p.force.x, p.force.y, p.force.z);
    }
    if (e > 0) {
      // The previous element's inertia, rigid and elastic, lumped at its middle.
      const x = xm - l, rx = x - cg.x, phi = modeDeflection(mode, x), m = -beam.lineMass[e - 1] * l;
      addLoad(x, cg.y, cg.z, m * (a.x + w.x * w.x * rx - rx * w2), m * (a.y + alpha.z * rx + w.y * w.x * rx + phi * etaAcc.y),
        m * (a.z - alpha.y * rx + w.z * w.x * rx + phi * etaAcc.z));
    }
    if (!(beam.wallArea[e] > 0)) continue;
    // Moment about the section's point on the axis.
    const sy = my - (cg.z * fx - xm * fz), sz = mz - (xm * fy - cg.y * fx);
    const r = (Math.abs(fx) / beam.wallArea[e] + Math.hypot(sy, sz) / beam.sectionModulus[e]) / SHELL_ALLOWABLE_STRESS;
    if (r > ratio) { ratio = r; station = xm; }
  }
  return { ratio, station };
}
