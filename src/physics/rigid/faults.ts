/**
 * Failures of the control system, and the FDIR that meets them (roadmap G08).
 *
 * The runtime (src/physics/rigid/runtime.ts) asks this layer, at each step,
 * what its sensors read, what its actuators do with a command, and which jets
 * it may fire; the layer answers with the failures that have struck by then.
 * With none struck it hands back the very objects it was given, so a flight
 * that carries the layer flies bit for bit as one without it until the first
 * failure.
 *
 * Sensors: three redundant IMUs. Each reads the body rate — through its
 * failures — and integrates its own attitude from that rate (a strapdown
 * unit), so a gyro that reads wrong drifts the unit's attitude too. The
 * flight computer reads IMU 1 alone; with the FDIR on it votes: the per-axis
 * median of three, and a unit whose rate, attitude or acceleration stays away
 * from the others' — or that flags itself failed — is isolated. With two left
 * it takes their mean (it can see a disagreement but not tell which is wrong);
 * with none, it opens the loop and holds the nozzles still. A failure every
 * unit shares (a common-mode failure) outvotes nothing.
 *
 * Actuators: a nozzle stuck where it stood, driven to its stop (hard-over),
 * slowed, or moving against its command (polarity); an RCS jet stuck on or
 * dead. The FDIR runs a model of each healthy actuator beside it, fed the same
 * commands, and a nozzle that stays away from its model for 0.3 s has failed:
 * on a stage with more than one engine it is shut down and the others steer;
 * on a single engine there is nothing to do. A jet that fires unasked is
 * closed off; one that does not fire when asked is left out of the allocation.
 *
 * The flight computer: a hold (a reboot) freezes its outputs where they were;
 * with the FDIR on, the backup computer takes over after 0.2 s. A gain loaded
 * with the wrong sign reverses the control moment about its axis — and the
 * backup computer runs the same software.
 */
import type { ControlFaultKind, ControlFaultSpec } from '../../types';
import { DEG, G0 } from '../constants';
import { add, dot, norm, scale, sub, v3, type Vec3 } from '../vec3';
import { NormalStream } from '../nav/sensors';
import type { NavigationFaultHooks } from '../nav/navigation';
import { stepEngineActuators, type EngineActuatorSpec, type EngineActuatorState, type EngineCommand, type RcsThrusterSpec } from './actuators';
import type { ControlDemand } from './control';
import { quatFromAxisAngle, quatMultiply, type Quat } from './math';
import { FAULT_GROUP, FAULT_MAGNITUDE, IMU_UNIT_COUNT, NAVIGATION_FAULTS, type ControlFaultOptions } from './fault-config';

/** The FDIR's thresholds and persistence times. */
export const FDIR = {
  /** IMU voting: a unit this far from the median, for this long, is isolated */
  rateDegS: 0.5, attitudeDeg: 2, accelMg: 5, sensorPersistenceS: 0.1,
  /** the gimbal monitor: a nozzle this far from its model (the larger of the two), for this long, has failed */
  gimbalDeg: 0.5, gimbalFraction: 0.1, gimbalPersistenceS: 0.3,
  /** a jet firing unasked, or silent when asked, for this long */
  jetOnPersistenceS: 0.2, jetOffPersistenceS: 0.3,
  /** the backup computer takes over a held one after this long */
  backupSwitchS: 0.2,
} as const;
/**
 * A launcher that loses control in the air breaks up under its lateral load: q·α, the dynamic
 * pressure times the total angle of attack, kPa·°. The fleet's healthy ascents stay under 135;
 * every six-DOF ascent breaks up past this.
 */
export const BREAKUP_Q_ALPHA_KPA_DEG = 300;
/** A failed unit's attitude output: its diagnostic word flown as data (Ariane 501), a large fixed error, rad. */
export const GARBAGE_ATTITUDE = v3(0, 0, -0.6);

/** ISO 1151 body axes (roll x, pitch y, yaw z) in the simulator's: x the nose, pitch about −z, yaw about y. */
export const ISO_AXIS: Readonly<Record<'roll' | 'pitch' | 'yaw', Vec3>> = { roll: v3(1, 0, 0), pitch: v3(0, 0, -1), yaw: v3(0, 1, 0) };

export type ImuUnitState = 'ok' | 'faulty' | 'isolated' | 'failed';
export type EngineFaultState = 'stuck' | 'hardover' | 'slow' | 'polarity' | 'failed' | 'shut';
export type JetFaultState = 'stuckOn' | 'failedOff' | 'isolated' | 'excluded';
/** What the telemetry carries of the failures and the FDIR. */
export interface ControlFaultRecord {
  fdir: boolean;
  /** The failures struck so far: kind, time, and their targets (engines, jets, IMU units, 1-based). */
  active: { kind: ControlFaultKind; since: number; engines?: number[]; jets?: number[]; units?: number[]; axis?: string; missed?: boolean }[];
  /** Each IMU unit, and those the computer reads. */
  units: ImuUnitState[];
  selected: number[];
  /** No IMU left: the loop is open. */
  openLoop: boolean;
  computer: 'primary' | 'hold' | 'backup';
  engines: { engine: number; stage: string; state: EngineFaultState }[];
  jets: { jet: number; state: JetFaultState }[];
  /** What the computer reads against the truth: rates, rad/s, and the attitude error of the sensors, rad (body axes). */
  sensedRateBody?: Vec3;
  trueRateBody?: Vec3;
  sensorAttitudeErrorBody?: Vec3;
}
export interface FaultEvent { t: number; key: string; severity: 'info' | 'warn' | 'fail'; params: Record<string, string | number> }
export interface EngineShutdown { stageId: string; engineIndex: number; t: number }
/** The actuators' side of a step: the specs and commands the hardware flies, and the computer's own commands. */
export interface FaultDrive { specs: readonly EngineActuatorSpec[]; commands: readonly EngineCommand[]; computer: readonly EngineCommand[]; frozen: ReadonlyMap<number, number[]> }

interface Struck {
  spec: ControlFaultSpec;
  since: number;
  /** Engine spec ids and 1-based numbers; jet ids and numbers; unit indices (0-based). */
  engines: string[]; engineNumbers: number[];
  jets: string[]; jetNumbers: number[];
  units: number[];
  missed: boolean;
  /** gyroStuck: the rate it stuck at */
  stuckRate?: Vec3;
  /** gimbalStuck: where each nozzle stuck */
  frozen?: Map<string, number[]>;
}
interface Unit { valid: boolean; isolated: boolean; e: Vec3; eNext: Vec3; rateError: Vec3; accelError: Vec3; timer: number }
interface Monitor { model: EngineActuatorState; timer: number; failed: boolean; shut: boolean; stageId: string; engineIndex: number; number: number }

const ZERO = (): Vec3 => v3();
const expQ = (phi: Vec3): Quat => {
  const a = norm(phi);
  return a < 1e-15 ? { w: 1, x: phi.x / 2, y: phi.y / 2, z: phi.z / 2 } : quatFromAxisAngle(scale(phi, 1 / a), a);
};
const inf = (v: Vec3) => Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));
const median3 = (a: number, b: number, c: number) => Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
const engineIndexOf = (spec: EngineActuatorSpec) => (spec as { engineIndex?: number }).engineIndex ?? 0;

export class ControlFaults implements NavigationFaultHooks {
  fdir: boolean;
  private readonly pending: ControlFaultSpec[];
  private readonly struck: Struck[] = [];
  private readonly noise: NormalStream;
  private readonly units: Unit[] = Array.from({ length: IMU_UNIT_COUNT }, () => ({ valid: true, isolated: false, e: ZERO(), eNext: ZERO(), rateError: ZERO(), accelError: ZERO(), timer: 0 }));
  private sensorsStruck = false;
  private selected: number[] = [0];
  private navE: Vec3 = ZERO();
  private disagreeReported = false;
  openLoop = false;
  private sensedRate?: Vec3;
  private trueRate?: Vec3;
  private sensorAttitude?: Vec3;
  // The computer.
  private holding = false;
  private holdUntil = 0;
  private holdSince = 0;
  private backup = false;
  private lastComputer = new Map<string, EngineCommand>();
  private lastDuties = new Map<string, number>();
  // The FDIR's monitors.
  private readonly monitors = new Map<string, Monitor>();
  private readonly jetTimers = new Map<string, { on: number; off: number }>();
  private readonly isolatedJets = new Map<string, number>();
  private readonly excludedJets = new Map<string, number>();
  private readonly events: FaultEvent[] = [];
  private readonly shutdowns: EngineShutdown[] = [];
  /** The flying stage, set by the simulation before each step. */
  stage = 0;
  stageId = '';

  constructor(options: ControlFaultOptions) {
    this.fdir = options.fdir;
    this.pending = options.faults.map((f) => ({ ...f, ...(Array.isArray(f.units) ? { units: [...f.units] } : {}) })).sort((a, b) => a.time - b.time);
    this.noise = new NormalStream(options.seed);
  }

  /** Add a failure (a live injection); it strikes at its time, or at the next step. */
  add(fault: ControlFaultSpec): void {
    this.pending.push({ ...fault, ...(Array.isArray(fault.units) ? { units: [...fault.units] } : {}) });
    this.pending.sort((a, b) => a.time - b.time);
  }
  get failures(): readonly ControlFaultSpec[] { return [...this.struck.map((s) => s.spec), ...this.pending]; }
  takeEvents(): FaultEvent[] { return this.events.splice(0); }
  takeShutdowns(): EngineShutdown[] { return this.shutdowns.splice(0); }
  /** The simulation shut an engine down: its monitor stops. */
  engineShut(stageId: string, engineIndex: number): void {
    for (const m of this.monitors.values()) if (m.stageId === stageId && m.engineIndex === engineIndex) m.shut = true;
  }
  private event(t: number, key: string, severity: FaultEvent['severity'], params: Record<string, string | number> = {}): void {
    this.events.push({ t, key, severity, params });
  }

  // ------------------------------------------------------------ onset
  /** Strike the failures due at `time`, against the flying stage's engines and jets and the engines' states now. */
  begin(time: number, specs: readonly EngineActuatorSpec[], states: ReadonlyMap<string, EngineActuatorState>, jets: readonly RcsThrusterSpec[], trueRate: Vec3): void {
    this.now = time;
    for (let k = 0; k < this.pending.length;) {
      if (!(time + 1e-9 >= this.pending[k].time && (this.pending[k].stage ?? 0) <= this.stage)) { k++; continue; }
      const spec = this.pending.splice(k, 1)[0];
      const s: Struck = { spec, since: time, engines: [], engineNumbers: [], jets: [], jetNumbers: [], units: [], missed: false };
      const group = FAULT_GROUP[spec.kind];
      if (spec.engine !== undefined) {
        for (const e of specs) {
          if (!e.id.startsWith(`${this.stageId}.`)) continue;
          const index = engineIndexOf(e);
          if (spec.engine !== 'all' && index !== spec.engine - 1) continue;
          if (spec.kind !== 'gimbalStuck' && !e.gimbalAxesBody.length) continue;
          s.engines.push(e.id);
          if (!s.engineNumbers.includes(index + 1)) s.engineNumbers.push(index + 1);
        }
        s.missed = !s.engines.length;
        if (spec.kind === 'gimbalStuck') s.frozen = new Map(s.engines.map((id) => [id, [...(states.get(id)?.deflections ?? [])]]));
      }
      if (spec.jet !== undefined) {
        jets.forEach((j, i) => { if (spec.jet === 'all' || spec.jet === i + 1) { s.jets.push(j.id); s.jetNumbers.push(i + 1); } });
        s.missed = !s.jets.length;
      }
      if (group === 'sensor' && !NAVIGATION_FAULTS.includes(spec.kind) || spec.kind === 'accelBias') {
        s.units = spec.units === 'all' ? [0, 1, 2] : (spec.units ?? [1]).map((n) => n - 1);
        this.sensorsStruck = true;
      }
      if (spec.kind === 'gyroStuck') s.stuckRate = { ...trueRate };
      if (spec.kind === 'imuFailure') for (const u of s.units) { this.units[u].valid = false; this.units[u].e = { ...GARBAGE_ATTITUDE }; }
      if (spec.kind === 'computerHold') {
        this.holding = true;
        this.holdSince = time;
        this.holdUntil = time + (spec.magnitude ?? FAULT_MAGNITUDE.computerHold!.value);
      }
      this.struck.push(s);
      if (s.missed) { this.event(time, 'evt.controlFaultMissed', 'info', { faultKind: spec.kind }); continue; }
      this.event(time, 'evt.controlFault', 'warn', {
        faultKind: spec.kind,
        ...(s.engineNumbers.length ? { engine: spec.engine === 'all' ? 'all' : s.engineNumbers.join(',') } : {}),
        ...(s.jetNumbers.length ? { jet: spec.jet === 'all' ? 'all' : s.jetNumbers.join(',') } : {}),
        ...(s.units.length ? { units: spec.units === 'all' ? 'all' : s.units.map((u) => u + 1).join(',') } : {}),
        ...(spec.axis ? { faultAxis: spec.axis } : {}),
      });
    }
    // The computer: held until its hold ends, or — with the FDIR — until the backup takes over.
    if (this.holding && this.fdir && !this.backup && time + 1e-9 >= this.holdSince + FDIR.backupSwitchS) {
      this.backup = true;
      this.holding = false;
      this.event(time, 'evt.fdirBackupComputer', 'warn');
    } else if (this.holding && time + 1e-9 >= this.holdUntil) {
      this.holding = false;
      this.event(time, 'evt.computerResumed', 'info');
    }
  }
  private get held(): boolean { return this.holding; }
  private active(kind: ControlFaultKind): Struck[] { return this.struck.filter((s) => s.spec.kind === kind && !s.missed); }

  // ------------------------------------------------------------ sensors
  /**
   * What the computer reads: the IMU case (the truth, or with P05 the bent
   * structure at the IMU's station) through the units' failures and the vote.
   * With no sensor failure struck, the very object it was given.
   */
  sense(dt: number, truth: { attitudeQ: Quat; omegaBody: Vec3 }): { attitudeQ: Quat; omegaBody: Vec3 } {
    this.trueRate = truth.omegaBody;
    if (!this.sensorsStruck) return truth;
    const w0 = truth.omegaBody;
    this.units.forEach((unit, index) => {
      let w = { ...w0 }, acc = ZERO();
      for (const s of this.struck) {
        if (!s.units.includes(index)) continue;
        const f = s.spec, a = f.axis ? ISO_AXIS[f.axis] : undefined;
        switch (f.kind) {
          case 'rateInverted': w = a ? sub(w, scale(a, 2 * dot(w, a))) : scale(w, -1); break;
          case 'gyroStuck': w = a ? add(sub(w, scale(a, dot(w, a))), scale(a, dot(s.stuckRate!, a))) : { ...s.stuckRate! }; break;
          case 'gyroBias': {
            const size = (f.magnitude ?? FAULT_MAGNITUDE.gyroBias!.value) * DEG;
            w = add(w, a ? scale(a, size) : v3(size, size, size));
            break;
          }
          case 'gyroNoise': {
            const sigma = (f.magnitude ?? FAULT_MAGNITUDE.gyroNoise!.value) * DEG;
            w = add(w, v3(sigma * this.noise.next(), sigma * this.noise.next(), sigma * this.noise.next()));
            break;
          }
          case 'imuFailure': w = ZERO(); break;
          case 'accelBias': {
            const size = (f.magnitude ?? FAULT_MAGNITUDE.accelBias!.value) * 1e-3 * G0;
            acc = add(acc, a ? scale(a, size) : v3(size, size, size));
            break;
          }
          default: break;
        }
      }
      unit.rateError = sub(w, w0);
      unit.accelError = acc;
      unit.eNext = unit.valid ? add(unit.e, scale(unit.rateError, dt)) : unit.e;
    });
    this.vote(dt);
    const rateError = this.combine((u) => u.rateError), e = this.combine((u) => u.e);
    this.sensorAttitude = e;
    const reading = { attitudeQ: quatMultiply(truth.attitudeQ, expQ(e)), omegaBody: add(w0, rateError) };
    this.sensedRate = reading.omegaBody;
    return reading;
  }

  /** The units the computer reads, and whether the loop is still closed. */
  private vote(dt: number): void {
    if (!this.fdir) { this.selected = [0]; this.openLoop = false; return; }
    for (let i = 0; i < IMU_UNIT_COUNT; i++) {
      const u = this.units[i];
      if (!u.valid && !u.isolated) { u.isolated = true; this.event(this.now, 'evt.fdirImuIsolated', 'warn', { unit: i + 1, fdirReason: 'flag' }); }
    }
    let candidates = this.units.map((u, i) => (u.isolated ? -1 : i)).filter((i) => i >= 0);
    if (candidates.length >= 3) {
      const med = (pick: (u: Unit) => Vec3) => {
        const [a, b, c] = candidates.map((i) => pick(this.units[i]));
        return v3(median3(a.x, b.x, c.x), median3(a.y, b.y, c.y), median3(a.z, b.z, c.z));
      };
      const mr = med((u) => u.rateError), me = med((u) => u.e), ma = med((u) => u.accelError);
      let worst = -1, worstDev = 1;
      for (const i of candidates) {
        const u = this.units[i];
        const dev = Math.max(inf(sub(u.rateError, mr)) / (FDIR.rateDegS * DEG), inf(sub(u.e, me)) / (FDIR.attitudeDeg * DEG),
          inf(sub(u.accelError, ma)) / (FDIR.accelMg * 1e-3 * G0));
        if (dev > worstDev) { worstDev = dev; worst = i; }
      }
      for (const i of candidates) this.units[i].timer = i === worst ? this.units[i].timer + dt : 0;
      if (worst >= 0 && this.units[worst].timer + 1e-9 >= FDIR.sensorPersistenceS) {
        this.units[worst].isolated = true;
        this.event(this.now, 'evt.fdirImuIsolated', 'warn', { unit: worst + 1, fdirReason: 'vote' });
        candidates = candidates.filter((i) => i !== worst);
      }
    } else if (candidates.length === 2 && !this.disagreeReported) {
      const [a, b] = candidates.map((i) => this.units[i]);
      const dev = Math.max(inf(sub(a.rateError, b.rateError)) / (FDIR.rateDegS * DEG), inf(sub(a.e, b.e)) / (FDIR.attitudeDeg * DEG));
      a.timer = dev > 1 ? a.timer + dt : 0;
      if (a.timer + 1e-9 >= FDIR.sensorPersistenceS) {
        this.disagreeReported = true;
        this.event(this.now, 'evt.fdirImuDisagree', 'warn', { units: candidates.map((i) => i + 1).join(',') });
      }
    }
    this.selected = candidates;
    if (!candidates.length && !this.openLoop) this.event(this.now, 'evt.fdirImuLost', 'fail');
    this.openLoop = !candidates.length;
  }
  /** The vote of the selected units: the median of three, the mean of two, or the one. */
  private combine(pick: (u: Unit) => Vec3): Vec3 {
    const sel = this.selected.map((i) => pick(this.units[i]));
    if (sel.length >= 3) return v3(median3(sel[0].x, sel[1].x, sel[2].x), median3(sel[0].y, sel[1].y, sel[2].y), median3(sel[0].z, sel[1].z, sel[2].z));
    if (sel.length === 2) return scale(add(sel[0], sel[1]), 0.5);
    return sel[0] ? { ...sel[0] } : ZERO();
  }
  /** The step's clock, for the events `sense` raises. */
  private now = 0;

  /** G02's navigation: the selected units' errors since its last update. */
  increment(t0: number, t1: number): { dTheta: Vec3; dV: Vec3 } | undefined {
    if (!this.sensorsStruck) return undefined;
    const e = this.combine((u) => u.eNext), dTheta = sub(e, this.navE);
    this.navE = e;
    return { dTheta, dV: scale(this.combine((u) => u.accelError), t1 - t0) };
  }
  aidingLost(t: number): { gnss: boolean; starTracker: boolean } {
    return { gnss: this.struck.some((s) => s.spec.kind === 'gnssLoss' && t + 1e-9 >= s.since),
      starTracker: this.struck.some((s) => s.spec.kind === 'starTrackerLoss' && t + 1e-9 >= s.since) };
  }

  // ------------------------------------------------------------ the computer
  /** The control law's output through the computer's failures: a gain of the wrong sign, or an open loop. */
  demand(demand: ControlDemand): ControlDemand {
    if (this.openLoop) return { ...demand, momentBody: ZERO() };
    const wrong = this.active('gainSign');
    if (!wrong.length) return demand;
    let m = demand.momentBody;
    for (const s of wrong) {
      const a = s.spec.axis ? ISO_AXIS[s.spec.axis] : undefined;
      m = a ? sub(m, scale(a, 2 * dot(m, a))) : scale(m, -1);
    }
    return { ...demand, momentBody: m };
  }

  // ------------------------------------------------------------ actuators
  /** The commands the nozzles receive and the hardware they move: held by a frozen computer, driven by failed actuators. */
  drive(specs: readonly EngineActuatorSpec[], commands: readonly EngineCommand[]): FaultDrive {
    const computer = this.held && this.lastComputer.size
      ? specs.map((spec, i) => this.lastComputer.get(spec.id) ?? commands[i]) : commands;
    let sent: EngineCommand[] | readonly EngineCommand[] = computer, plant: EngineActuatorSpec[] | readonly EngineActuatorSpec[] = specs;
    const frozen = new Map<number, number[]>();
    const hinge = (spec: EngineActuatorSpec, axis: 'roll' | 'pitch' | 'yaw' | undefined) => {
      if (!axis) return undefined;
      const a = ISO_AXIS[axis];
      let best = 0;
      spec.gimbalAxesBody.forEach((h, j) => { if (Math.abs(dot(h, a)) > Math.abs(dot(spec.gimbalAxesBody[best], a))) best = j; });
      return { index: best, sign: Math.sign(dot(spec.gimbalAxesBody[best], a)) || 1 };
    };
    for (const s of this.struck) {
      if (s.missed || !s.engines.length) continue;
      specs.forEach((spec, i) => {
        if (!s.engines.includes(spec.id)) return;
        const f = s.spec;
        if (f.kind === 'gimbalStuck') { const d = s.frozen?.get(spec.id); if (d?.length === spec.gimbalAxesBody.length) frozen.set(i, d); return; }
        if (f.kind === 'gimbalSlow') {
          if (plant === specs) plant = [...specs];
          const k = f.magnitude ?? FAULT_MAGNITUDE.gimbalSlow!.value;
          (plant as EngineActuatorSpec[])[i] = { ...spec, maxGimbalRateRadS: spec.maxGimbalRateRadS * k, timeConstantS: spec.timeConstantS / k };
          return;
        }
        if (sent === computer) sent = computer.map((c) => ({ ...c, deflections: [...c.deflections] }));
        const c = (sent as EngineCommand[])[i];
        if (f.kind === 'gimbalHardover') {
          const h = hinge(spec, f.axis ?? 'pitch');
          c.deflections = spec.gimbalAxesBody.map((_, j) => (j === h!.index ? (f.sign ?? 1) * h!.sign * spec.maxGimbalRad : 0));
        } else if (f.kind === 'actuatorPolarity') {
          const h = hinge(spec, f.axis);
          c.deflections = c.deflections.map((d, j) => (!h || j === h.index ? -d : d));
        }
      });
    }
    return { specs: plant, commands: sent, computer, frozen };
  }
  /** The nozzles after `elapsed`: the hardware's own response to what it received, then a stuck one where it stuck. Pure. */
  actuate(drive: FaultDrive, states: readonly EngineActuatorState[], elapsed: number): EngineActuatorState[] {
    const out = stepEngineActuators(drive.specs, states, drive.commands, elapsed);
    for (const [i, d] of drive.frozen) out[i] = { ...out[i], deflections: [...d] };
    return out;
  }

  /**
   * The nozzles as the computer believes them: their position sensors' readings. A nozzle wired
   * the wrong way round reads its position the wrong way round too (so its monitor sees nothing
   * amiss); every other failure reads true. The same list when no nozzle is miswired.
   */
  reported(states: readonly EngineActuatorState[], specs: readonly EngineActuatorSpec[]): readonly EngineActuatorState[] {
    const wrong = this.active('actuatorPolarity');
    if (!wrong.length) return states;
    return states.map((state, i) => (wrong.some((s) => s.engines.includes(specs[i].id))
      ? { ...state, deflections: state.deflections.map((d) => -d) } : state));
  }

  /** The jets the allocator may use: without the ones the FDIR closed off or left out. The same list when none. */
  usableJets(jets: readonly RcsThrusterSpec[]): readonly RcsThrusterSpec[] {
    if (!this.isolatedJets.size && !this.excludedJets.size) return jets;
    return jets.filter((j) => !this.isolatedJets.has(j.id) && !this.excludedJets.has(j.id));
  }
  /**
   * The computer's duty for every jet (the allocation spread back over the full list), and what
   * the jets do with it. The allocation's own list when nothing touches them.
   */
  jetDuties(jets: readonly RcsThrusterSpec[], used: readonly RcsThrusterSpec[], duties: readonly number[]): { computer: number[]; actual: number[] } {
    let computer = used === jets ? duties as number[] : jets.map((j) => { const k = used.indexOf(j); return k >= 0 ? duties[k] : 0; });
    if (this.held && this.lastDuties.size) computer = jets.map((j) => this.lastDuties.get(j.id) ?? 0);
    const stuckOn = this.active('rcsStuckOn'), dead = this.active('rcsFailedOff');
    if (!stuckOn.length && !dead.length && !this.isolatedJets.size) return { computer, actual: computer };
    const actual = jets.map((j, i) => {
      if (this.isolatedJets.has(j.id) || dead.some((s) => s.jets.includes(j.id))) return 0;
      return stuckOn.some((s) => s.jets.includes(j.id)) ? 1 : computer[i];
    });
    return { computer, actual };
  }

  // ------------------------------------------------------------ the step's end
  /** Take the step: the units' attitudes move on, the FDIR's monitors judge, the computer's outputs are kept. */
  commit(time: number, dt: number, step: { specs: readonly EngineActuatorSpec[]; drive: FaultDrive; start: readonly EngineActuatorState[];
    actual: readonly EngineActuatorState[]; jets: readonly RcsThrusterSpec[]; computerDuties: readonly number[]; actualDuties: readonly number[]; gas: boolean }): void {
    for (const u of this.units) u.e = u.eNext;
    const held = this.held;
    // The model of each healthy nozzle, fed the computer's commands.
    const polarity = new Set(this.active('actuatorPolarity').flatMap((s) => s.engines));
    const live = new Set<string>(), failedNow: Monitor[] = [];
    step.specs.forEach((spec, i) => {
      if (!spec.gimbalAxesBody.length) return;
      live.add(spec.id);
      let m = this.monitors.get(spec.id);
      if (!m) {
        const index = engineIndexOf(spec), stageId = spec.id.slice(0, spec.id.lastIndexOf('.', spec.id.lastIndexOf('.') - 1));
        m = { model: { deflections: [...step.start[i].deflections], throttle: step.start[i].throttle }, timer: 0, failed: false, shut: false,
          stageId: stageId || spec.id, engineIndex: index, number: index + 1 };
        this.monitors.set(spec.id, m);
      }
      m.model = stepEngineActuators([spec], [m.model], [step.drive.computer[i]], dt)[0];
      if (!this.fdir || held || m.failed || m.shut || !(spec.maxThrust > 0)) { m.timer = 0; return; }
      const reported = polarity.has(spec.id) ? step.actual[i].deflections.map((d) => -d) : step.actual[i].deflections;
      const miss = Math.hypot(...reported.map((d, j) => d - (m!.model.deflections[j] ?? 0)));
      m.timer = miss > Math.max(FDIR.gimbalDeg * DEG, FDIR.gimbalFraction * spec.maxGimbalRad) ? m.timer + dt : 0;
      if (m.timer + 1e-9 < FDIR.gimbalPersistenceS) return;
      m.failed = true;
      failedNow.push(m);
    });
    for (const id of [...this.monitors.keys()]) if (!live.has(id)) this.monitors.delete(id);
    // An engine whose nozzle has failed is shut down, if the stage can spare it: others left that
    // steer, and no more engines out than a quarter of the stage's (at least one).
    const decided = new Set<string>(), failedNumbers: number[] = [], keptNumbers: number[] = [];
    for (const m of failedNow) {
      const key = `${m.stageId}#${m.engineIndex}`;
      if (decided.has(key)) continue;
      decided.add(key);
      failedNumbers.push(m.number);
      const stage = step.specs.filter((o) => o.id.startsWith(`${m.stageId}.`));
      const engines = new Set(stage.map(engineIndexOf)).size;
      const steering = stage.some((o) => engineIndexOf(o) !== m.engineIndex && o.maxThrust > 0 && o.gimbalAxesBody.length
        && !this.monitors.get(o.id)?.failed);
      const out = new Set([...this.monitors.values()].filter((o) => o.stageId === m.stageId && o.shut).map((o) => o.engineIndex));
      for (const sd of this.shutdowns) if (sd.stageId === m.stageId) out.add(sd.engineIndex);
      if (m.stageId === this.stageId && steering && out.size < Math.max(1, Math.floor(engines / 4))) {
        this.shutdowns.push({ stageId: m.stageId, engineIndex: m.engineIndex, t: time + dt });
      } else keptNumbers.push(m.number);
    }
    if (failedNumbers.length) this.event(time + dt, 'evt.fdirGimbalFailed', 'warn', { engine: failedNumbers.join(',') });
    if (keptNumbers.length) this.event(time + dt, 'evt.fdirNoEngineOut', 'warn', { engine: keptNumbers.join(',') });
    // Jets: firing unasked, or silent when asked.
    if (this.fdir && !held && step.gas) {
      const closed: number[] = [], left: number[] = [];
      step.jets.forEach((j, i) => {
        if (this.isolatedJets.has(j.id) || this.excludedJets.has(j.id)) return;
        const c = step.computerDuties[i] ?? 0, a = step.actualDuties[i] ?? 0;
        const timer = this.jetTimers.get(j.id) ?? { on: 0, off: 0 };
        timer.on = a > 0.5 && c < 0.05 ? timer.on + dt : 0;
        timer.off = c > 0.2 && a < 0.01 ? timer.off + dt : 0;
        this.jetTimers.set(j.id, timer);
        if (timer.on + 1e-9 >= FDIR.jetOnPersistenceS) {
          this.isolatedJets.set(j.id, i + 1);
          closed.push(i + 1);
        } else if (timer.off + 1e-9 >= FDIR.jetOffPersistenceS) {
          this.excludedJets.set(j.id, i + 1);
          left.push(i + 1);
        }
      });
      if (closed.length) this.event(time + dt, 'evt.fdirJetIsolated', 'warn', { jet: closed.join(',') });
      if (left.length) this.event(time + dt, 'evt.fdirJetExcluded', 'warn', { jet: left.join(',') });
    }
    // The computer's outputs, for a hold to freeze.
    if (!held) {
      this.lastComputer = new Map(step.specs.map((spec, i) => [spec.id, step.drive.computer[i]]));
      this.lastDuties = new Map(step.jets.map((j, i) => [j.id, step.computerDuties[i] ?? 0]));
    }
  }

  /** The telemetry's record of this instant. */
  record(): ControlFaultRecord {
    const faultyUnits = new Set(this.struck.filter((s) => !s.missed).flatMap((s) => s.units));
    const engineState = new Map<string, { engine: number; stage: string; state: EngineFaultState }>();
    for (const s of this.struck) {
      if (s.missed) continue;
      const state = ({ gimbalStuck: 'stuck', gimbalHardover: 'hardover', gimbalSlow: 'slow', actuatorPolarity: 'polarity' } as const)[s.spec.kind as 'gimbalStuck'];
      if (state) for (const id of s.engines) {
        const m = this.monitors.get(id);
        const number = m?.number ?? (s.engineNumbers[0] ?? 0);
        const key = `${m?.stageId ?? ''}#${number}`;
        engineState.set(key, { engine: number, stage: m?.stageId ?? this.stageId, state });
      }
    }
    for (const m of this.monitors.values()) {
      if (m.failed || m.shut) engineState.set(`${m.stageId}#${m.number}`, { engine: m.number, stage: m.stageId, state: m.shut ? 'shut' : 'failed' });
    }
    const jetState: { jet: number; state: JetFaultState }[] = [];
    const seen = new Set<string>();
    const note = (id: string, jet: number, state: JetFaultState) => { if (!seen.has(id)) { seen.add(id); jetState.push({ jet, state }); } };
    for (const [id, n] of this.isolatedJets) note(id, n, 'isolated');
    for (const [id, n] of this.excludedJets) note(id, n, 'excluded');
    for (const s of this.struck) {
      if (s.missed) continue;
      if (s.spec.kind === 'rcsStuckOn') s.jets.forEach((id, k) => note(id, s.jetNumbers[k], 'stuckOn'));
      if (s.spec.kind === 'rcsFailedOff') s.jets.forEach((id, k) => note(id, s.jetNumbers[k], 'failedOff'));
    }
    return {
      fdir: this.fdir,
      active: this.struck.map((s) => ({ kind: s.spec.kind, since: s.since,
        ...(s.engineNumbers.length ? { engines: [...s.engineNumbers] } : {}), ...(s.jetNumbers.length ? { jets: [...s.jetNumbers] } : {}),
        ...(s.units.length ? { units: s.units.map((u) => u + 1) } : {}), ...(s.spec.axis ? { axis: s.spec.axis } : {}), ...(s.missed ? { missed: true } : {}) })),
      units: this.units.map((u, i) => (!u.valid ? 'failed' : u.isolated ? 'isolated' : faultyUnits.has(i) ? 'faulty' : 'ok')),
      selected: this.sensorsStruck ? this.selected.map((i) => i + 1) : this.fdir ? [1, 2, 3] : [1],
      openLoop: this.openLoop,
      computer: this.held ? 'hold' : this.backup ? 'backup' : 'primary',
      engines: [...engineState.values()],
      jets: jetState,
      ...(this.sensedRate ? { sensedRateBody: { ...this.sensedRate } } : {}),
      ...(this.sensorsStruck && this.trueRate ? { trueRateBody: { ...this.trueRate } } : {}),
      ...(this.sensorAttitude ? { sensorAttitudeErrorBody: { ...this.sensorAttitude } } : {}),
    };
  }
}
