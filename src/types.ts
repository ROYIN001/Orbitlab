/**
 * Shared type definitions for vehicle, site, orbit and payload data.
 * All masses in kg, lengths in m, thrust in N, Isp in s, angles in degrees
 * unless the field name says otherwise.
 */

export interface EngineSpec {
  name: string;
  count: number;
  /** Sea-level thrust per engine, N */
  thrustSL: number;
  /** Vacuum thrust per engine, N */
  thrustVac: number;
  ispSL: number;
  ispVac: number;
  /** Minimum throttle fraction (1 = fixed thrust) */
  minThrottle?: number;
  /** Solid motor: cannot be shut down or throttled */
  solid?: boolean;
}

export interface BoosterGroupSpec {
  id: string;
  name: string;
  count: number;
  dryMass: number;
  propellantMass: number;
  engine: EngineSpec;
  diameter: number;
  length: number;
  /** Ignition time after liftoff, s (air-lit boosters) */
  igniteAt?: number;
  /** Delay between burnout and jettison, s */
  sepDelay?: number;
  color?: string;
  /** Conical top (Soyuz-style) */
  conicalTop?: boolean;
  /** Vertical offset of the booster base relative to the core base, m */
  baseOffset?: number;
}

export interface StageSpec {
  id: string;
  name: string;
  dryMass: number;
  propellantMass: number;
  engine: EngineSpec;
  diameter: number;
  length: number;
  /** Can be shut down and re-ignited in flight */
  restartable?: boolean;
  /** Seconds between cutoff of the previous stage and separation */
  sepDelay?: number;
  /** Seconds between separation and ignition of this stage */
  ignitionDelay?: number;
  /** Throttle fraction of this stage while parallel boosters are attached */
  throttleWithBoosters?: number;
  boosters?: BoosterGroupSpec[];
  color?: string;
  accentColor?: string;
  /** Simple visual hints */
  fins?: boolean;
  gridFins?: boolean;
  legs?: boolean;
  flaps?: boolean;
  /** Engine nozzle length for visuals */
  nozzleLength?: number;
  /** Synthetic stage representing the spacecraft's own propulsion */
  isSpacecraft?: boolean;
}

export interface FairingSpec {
  mass: number;
  diameter: number;
  length: number;
  /** Jettison altitude, m */
  sepAltitude: number;
  color?: string;
}

export interface VehicleSpec {
  id: string;
  name: string;
  country: string;
  manufacturer: string;
  height: number;
  /** Reference payload capability for the info panel, kg */
  payloadLEO: number;
  payloadGTO: number;
  payloadSSO?: number;
  /** Fairing, or null for an integrated payload bay (Starship) */
  fairing: FairingSpec | null;
  /** Serial stages in burn order (stage[0] is the first stage) */
  stages: StageSpec[];
  /** Launch site ids this vehicle can fly from */
  sites: string[];
  /** Structural dynamic-pressure limit, Pa */
  maxQ: number;
  /** Acceleration limit enforced by throttling, m/s^2 */
  maxAccel: number;
  /** Throttle bucket around max-Q for the first stage */
  maxQThrottle?: { qStart: number; qEnd: number; throttle: number };
  /** First stage recovery option */
  recoverable?: boolean;
  /** Fraction of first-stage propellant reserved for recovery */
  recoveryReserve?: number;
  /** Default guidance overrides (kick angle etc.) */
  guidanceDefaults?: Partial<GuidanceParams>;
  /** Reference drag area override (m^2); default from max diameter */
  dragArea?: number;
  /** Crewed launches supported */
  crewCapable?: boolean;
  notes?: string;
}

export interface LaunchSiteSpec {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  altitude: number;
  /** Minimum inclination reachable given range-safety azimuth limits, deg */
  minInclination: number;
  /** Allowed launch azimuth range (deg, clockwise from north) */
  azimuthMin: number;
  azimuthMax: number;
  /** Time zone label used for the info panel */
  tz: string;
}

export type OrbitKind = 'circular' | 'elliptical';

export interface OrbitSpec {
  id: string;
  name: string;
  /** Perigee altitude, m */
  perigee: number;
  /** Apogee altitude, m */
  apogee: number;
  /** Inclination, deg. 'sso' = sun-synchronous value, 'site' = minimum for the launch site. */
  inclination: number | 'sso' | 'site';
  /** Argument of perigee, deg (elliptical only) */
  argPerigee: number;
  /** RAAN targeting mode */
  raanMode: 'free' | 'fixed' | 'iss' | 'ltan';
  /** Fixed RAAN, deg (raanMode = 'fixed') */
  raan?: number;
  /** Local time of ascending node, hours (raanMode = 'ltan') */
  ltan?: number;
  description: string;
}

export type SatelliteKind =
  | 'comsat'
  | 'earthObs'
  | 'weather'
  | 'navigation'
  | 'science'
  | 'cubesats'
  | 'starlink'
  | 'crew';

export interface SatelliteSpec {
  id: string;
  kind: SatelliteKind;
  name: string;
  mass: number;
  /** Typical orbit preset id */
  typicalOrbit: string;
  description: string;
  crewed?: boolean;
  /** On-board propulsion used for orbit raising once the launcher is spent */
  propulsion?: { thrust: number; isp: number; propellantFraction: number };
  /** Approximate body dimensions for visuals, m */
  size?: { width: number; height: number; depth: number };
}

export interface GuidanceParams {
  /** Altitude above the pad at which pitch-over begins, m */
  pitchOverAltitude: number;
  /** Kick angle from vertical, deg */
  kickAngle: number;
  /** Seconds over which the kick angle is applied */
  kickDuration: number;
  /** Altitude at which zero-AoA gravity turn hands over to closed-loop guidance, m */
  gravityTurnEnd: number;
  /** Target altitude for the initial (parking) orbit, m */
  parkingAltitude: number;
  /** Closed-loop planning horizon cap, s (limits lofting for weak upper stages) */
  maxTimeToGo: number;
  /** Maximum pitch-down rate of the flight path during the gravity turn, deg/s (pitch program limit) */
  maxTurnRate: number;
  /** Loft: extra apex altitude (m) the booster stage aims for when the next stage is too weak to hold altitude */
  loftAltitude: number;
  /** Closed-loop pitch limits, deg */
  pitchMax: number;
  pitchMin: number;
  /** Maximum attitude slew rate, deg/s */
  slewRate: number;
  /** Acceleration limit override, m/s^2 (0 = vehicle default) */
  maxAccel: number;
}

export type FailureMode =
  | 'none'
  | 'engineOut'
  | 'thrustLoss'
  | 'prematureSep'
  | 'fairingStuck'
  | 'rangeSafety'
  | 'random';

export interface FailureConfig {
  mode: FailureMode;
  /** Mission time at which the failure is injected, s */
  time: number;
  /** Stage index affected (0-based) */
  stage: number;
}

export interface MissionConfig {
  vehicleId: string;
  satelliteId: string;
  siteId: string;
  orbit: OrbitSpec;
  /** Launch epoch (UTC) */
  launchTime: Date;
  guidance: GuidanceParams;
  failure: FailureConfig;
  /** Recover the first stage (reserves propellant) */
  boosterRecovery: boolean;
  /** Extra payload mass added by the user, kg */
  payloadMassOverride?: number;
  /**
   * `guidance` has already been merged with the vehicle's `guidanceDefaults`.
   * The simulation merges them itself when this is false/absent, so a caller
   * that only knows `DEFAULT_GUIDANCE` still flies each vehicle's own pitch
   * program; set it when a tuner deliberately sweeps parameters that happen to
   * equal the library defaults.
   */
  guidanceResolved?: boolean;
}
