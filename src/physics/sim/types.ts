/** Types shared by the simulation and everything that reads its state. */
import type { RendezvousState } from './rendezvous';
import type { RigidTelemetry } from '../rigid/telemetry';
import type { EngineSpec } from '../../types';
import type { Vec3 } from '../vec3';
import type { OrbitalElements } from '../orbital';
import type { AscentPhase } from '../guidance';
import type { BurnPlan } from '../mission';
import type { EomRecord } from '../eom';
import type { ExplicitGuidanceRecord } from '../explicit-guidance';
import type { ReturnTarget } from './return-guidance';
import type { EscapeStatus } from '../rigid/escape';

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

/**
 * `descent`: after a suborbital cut-off the last stage flies itself back — the
 * coast, the entry, the flip and the landing burn (`ShipDescent`). `landed`: it
 * has come down on the surface, intact or not, and the clock runs on with it
 * sitting there. Neither is ever reached by a flight to orbit.
 */
export type SimStatus = 'prelaunch' | 'ascent' | 'coast' | 'burn' | 'orbit' | 'descent' | 'abort' | 'rendezvous' | 'landed' | 'failed';

/**
 * Where a returning ship is in its descent: coasting above the air, entering
 * belly first, falling belly first below the speed of sound, swinging upright
 * on its engines, and braking to the surface.
 */
export type DescentPhase = 'coast' | 'entry' | 'bellyflop' | 'flip' | 'landing';

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
  /** G01: the explicit ascent guidance's record at this sample, during the ascent. */
  explicitGuidance?: ExplicitGuidanceRecord;
}

export interface DebrisVisual {
  diameter: number;
  length: number;
  color: string;
  conicalTop?: boolean;
  /** `StageSpec.profile`, so a spent stage keeps the shape it was drawn with */
  profile?: 'r7Core' | 'r7Upper';
  kind: 'stage' | 'booster' | 'fairing' | 'upperStage'
    /** after an abort: the tower (if still on), the upper fairing and the orbital module; the orbital and service modules */
    | 'escapeHead' | 'modules';
  /** `escapeHead`: the tower was still on it */
  tower?: boolean;
  /** `fairing`: its own adapter cone's height, m, down to `baseDiameter` (`FairingSpec.adapter`) */
  adapter?: number;
  baseDiameter?: number;
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
    /**
     * Airspeed a drone-ship stage's entry burn ends at, m/s: set when the ship
     * is stationed, from the propellant the stage carries above its landing
     * reserve (`DebrisManager.planReturn`). Absent, the fixed defaults.
     */
    entryTargetSpeed?: number;
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
  /**
   * Once it has landed: the mission time its stored state is for. From there
   * it only turns with the Earth (see `DebrisTracker.stepDebris`).
   */
  restT?: number;
}

export interface Losses {
  dvThrust: number;
  gravity: number;
  drag: number;
  steering: number;
}

export interface SimState {
  rigid?: RigidTelemetry;
  /** The equations of motion as the last flight step solved them (roadmap E02); absent outside powered and atmospheric flight. */
  eom?: EomRecord;
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
  /** a suborbital flight's return, while its status is `descent` */
  descentPhase?: DescentPhase | null;
  /** a launch abort (roadmap G06): the escape's progress, from the command to the descent module at rest */
  abort?: AbortState;
  /** a rendezvous with the station (roadmap G07), from the spacecraft's separation to the hooks closed */
  rendezvous?: RendezvousState;
}

/** A launch abort as the frame carries it (src/physics/sim/abort.ts). */
export interface AbortState extends EscapeStatus {
  /** event key of what set it off */
  cause: string;
  /** where and when the rocket was lost, for the drawing; absent for a commanded abort that leaves it flying */
  rocketLost?: { r: Vec3; t: number };
}

export interface PendingAction {
  t: number;
  fn: () => void;
  label: string;
}
