/** Types shared by the simulation and everything that reads its state. */
import type { RigidTelemetry } from '../rigid/telemetry';
import type { EngineSpec } from '../../types';
import type { Vec3 } from '../vec3';
import type { OrbitalElements } from '../orbital';
import type { AscentPhase } from '../guidance';
import type { BurnPlan } from '../mission';
import type { ReturnTarget } from './return-guidance';

/** What a returning stage's guidance carries from one step to the next. */
export interface ReturnGuidanceMemory {
  /** mission time of the last solution, s */
  t: number;
  /** thrust direction it asked for (ECI) */
  dir: Vec3;
  /** horizontal velocity still needed, m/s */
  dvNeeded: number;
  /** the burn is down to its trim on the centre engine */
  trim: boolean;
  /** the entry burn's horizontal correction, m/s² (ECI) */
  lateral?: Vec3;
}

export type SimStatus = 'prelaunch' | 'ascent' | 'coast' | 'burn' | 'orbit' | 'failed';

export type EventSeverity = 'info' | 'major' | 'warn' | 'fail' | 'success';

export interface SimEvent {
  t: number;
  key: string;
  params?: Record<string, string | number>;
  severity: EventSeverity;
}

export interface TelemetrySample {
  rigid?: RigidTelemetry;
  t: number;
  alt: number;
  vInertial: number;
  vAir: number;
  q: number;
  mach: number;
  gLoad: number;
  mass: number;
  thrust: number;
  throttle: number;
  pitch: number;
  ap: number;
  pe: number;
  inc: number;
  dvRemaining: number;
  downrange: number;
  lat: number;
  lon: number;
  stage: number;
  phase: string;
}

export interface DebrisVisual {
  diameter: number;
  length: number;
  color: string;
  conicalTop?: boolean;
  kind: 'stage' | 'booster' | 'fairing' | 'upperStage';
}

export interface Debris {
  rigid?: RigidTelemetry;
  id: number;
  name: string;
  r: Vec3;
  v: Vec3;
  /** thrust/attitude axis for rendering */
  dir: Vec3;
  mass: number;
  area: number;
  cd: number;
  visual: DebrisVisual;
  alive: boolean;
  createdAt: number;
  recovery?: {
    /**
     * Engine of the returning stage, so the number of engines burning can be
     * re-chosen for the landing. Optional: a frame-backed view of a recorded
     * flight rebuilds the phase and the flags, not the propulsion.
     */
    engine?: EngineSpec;
    propellant: number; thrustVac: number; thrustSL: number; mdot: number;
    burning: boolean; landed: boolean;
    /** propellant held back for the landing burn, kg */
    landingReserve: number;
    /** the landing burn has begun (its bang-bang throttling keeps the plume lit) */
    landingStarted?: boolean;
    /**
     * `flip` and `boostback` are flown only by a stage returning to a landing
     * zone: it turns round after separation and burns back towards the site.
     */
    phase: 'coast' | 'flip' | 'boostback' | 'entry' | 'landing';
    /** where the stage is flown to; absent, it lands wherever it comes down */
    target?: ReturnTarget;
    /** horizontal distance from the target at touchdown, m */
    missDistance?: number;
    /** a targeted return has fired its entry burn (it waits `armed` until then) */
    entryFlown?: boolean;
    /** a tower's arms closed on the booster */
    caught?: boolean;
    /** the booster came down past the tower's catch height outside its arms */
    catchPassed?: boolean;
    /** @internal the boostback solution in use and when it was made */
    guidance?: ReturnGuidanceMemory;
  };
  outcome?: 'impact' | 'landed' | 'orbit' | 'burnup';
  impact?: { lat: number; lon: number };
}

export interface Losses {
  dvThrust: number;
  gravity: number;
  drag: number;
  steering: number;
}

export interface SimState {
  rigid?: RigidTelemetry;
  t: number;
  r: Vec3;
  v: Vec3;
  /** unit thrust/body axis direction (ECI) */
  dir: Vec3;
  status: SimStatus;
  ascentPhase: AscentPhase | null;
  throttle: number;
  /**
   * What the engines are actually running at, as opposed to what guidance
   * commanded (`throttle`): the minimum-throttle clamp, the
   * `throttleWithBoosters` clamp and a solid motor's thrust profile are all
   * already in these. Output only — nothing in the physics reads them back;
   * they exist so the renderer's plumes can be driven from the frame instead of
   * from a second copy of the clamping rules (`ThrustResult.coreThrottle`).
   */
  coreThrottle: number;
  boosterThrottle: number;
  thrust: number;
  mass: number;
  q: number;
  mach: number;
  gLoad: number;
  altitude: number;
  altitudeAGL: number;
  airspeed: number;
  speed: number;
  downrange: number;
  lat: number;
  lon: number;
  elements: OrbitalElements;
  maxQ: { value: number; t: number; alt: number };
  losses: Losses;
  currentBurn: BurnPlan | null;
  burnStartTime: number;
  burnDvRemaining: number;
  /** target orbit-plane normal fixed at burn start (plane-change burns) */
  burnPlaneNormal: Vec3 | null;
  nextBurnTime: number;
  payloadSeparated: boolean;
  destroyed: boolean;
  liftoff: boolean;
  /** local sidereal angle of Greenwich at time t */
  theta: number;
  pitchCmd: number;
  predictedApoapsis: number;
  /** vertical speed, m/s */
  vz: number;
  /** progress note key for the HUD */
  note: string;
}

export interface PendingAction {
  t: number;
  fn: () => void;
  label: string;
}
