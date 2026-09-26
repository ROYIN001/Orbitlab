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
  /**
   * Solid motors: published peak thrust / mean thrust. The mean thrust is what
   * `thrustVac` carries (so that propellant / mass flow reproduces the published
   * burn time), and this is the head of the regressive profile the simulation
   * flies on top of it — P120C 4 323/2 846 = 1.52, SRB-A 1.22, Zefiro 40 1.16.
   * Default 1.2, the value every solid used before the field existed.
   */
  peakFactor?: number;
  /**
   * The engine has no sea-level operating point at all (an RL10 nozzle would not
   * flow full at sea level) and never ignites inside the atmosphere. Its
   * `thrustSL` / `ispSL` fields are placeholders, not data: with this flag set
   * the model uses the vacuum figures everywhere and never lets the invented
   * sea-level pair reach a trajectory.
   */
  vacuumOnly?: boolean;
  /**
   * Start-up transient: time from ignition to full thrust, s. Defaults to
   * `LIQUID_STARTUP_S` / `SOLID_STARTUP_S` in src/physics/vehicle.ts.
   */
  startupS?: number;
  /**
   * Shutdown tail-off: time constant of the exponential thrust decay after the
   * engine is shut down or runs dry, s. Defaults to `LIQUID_TAILOFF_S` /
   * `SOLID_TAILOFF_S`.
   */
  tailoffS?: number;
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
  /**
   * How the stage is drawn when it is not a plain cylinder (render only):
   * `r7Core` is the R-7 family's Blok A, tapering to its engines below the
   * booster tips and topped by the open truss the next stage fires through;
   * `r7Upper` is Blok I, whose aft skirt falls away after staging.
   */
  profile?: 'r7Core' | 'r7Upper';
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
  /**
   * Published jettison time, s after liftoff, for an operator who releases the
   * fairing on the mission timeline rather than on a heating placard.
   *
   * This replaces a per-vehicle `heatFluxLimit` (review follow-up). That field
   * was documented as "the free-molecular heating rate the operator releases
   * the fairing at", with the industry 0.1 BTU/ft²·s (1135 W/m²) as the fleet
   * default — but the four values that shipped were Ariane 64 = 900, Vega-C =
   * 75, Long March 2D = 50 and H-IIA 202 = 14 W/m². The last three are 15×, 23×
   * and 81× below the standard criterion (about 0.0012 BTU/ft²·s for the
   * H-IIA), which is not a placard any operator flies; they had been back-solved
   * from the jettison times they were supposed to predict, and a physical
   * criterion bent by 80× is a fitted constant wearing a physicist's coat.
   *
   * So the mechanism is modelled instead of the criterion being bent. These
   * operators publish a jettison time and fly it, and docs/PHYSICS.md already
   * conceded exactly that for Soyuz. A vehicle with no published callout keeps
   * the physical placard — `FAIRING_HEAT_FLUX_LIMIT`, unmodified — and the
   * altitude floor still applies to both, so a trajectory that is still deep in
   * the atmosphere at its published time does not shed the fairing there.
   */
  sepTime?: number;
  /**
   * Height of the fairing's own lower cone, m, down to the diameter of the
   * stage it stands on, counted in `length`: that stage then carries no
   * interstage adapter of its own. Soyuz-2.1a's 4.11 × 11.43 m unit includes
   * its transition section.
   */
  adapter?: number;
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
  /** The launch escape system a crewed launch carries (roadmap G06): Soyuz's tower and fairing motors. */
  escapeSystem?: 'soyuz';
  /**
   * A payload flown in the open on top of the last stage instead of inside the
   * fairing (Crew Dragon; roadmap C01): its outer shape, which is then the
   * stack's nose. Never in the catalogue; set by `missionVehicle`, which also
   * leaves the fairing off.
   */
  exposedPayload?: { diameter: number; length: number; noseLength: number };
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
  /**
   * Fraction reserved instead when the stage flies back to a landing zone near
   * the launch site: the boostback burn that turns it round costs more than
   * the entry and landing burns of a downrange landing.
   */
  returnReserve?: number;
  /** Default guidance overrides (kick angle etc.) */
  guidanceDefaults?: Partial<GuidanceParams>;
  /**
   * Further overrides when the vehicle flies as a rigid body. A point mass can
   * pitch over at any angle of attack; a real airframe, and the six-DOF model,
   * cannot hold much more than its trim authority allows through max-Q, so a
   * programme tuned on the point mass can hand a weak upper stage a flatter
   * trajectory than it needs (docs/SIXDOF-ACCEPTANCE.md).
   */
  guidanceDefaultsSixDof?: Partial<GuidanceParams>;
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
  /**
   * A trajectory that comes back down rather than an orbit: the perigee is
   * below the ground (a negative altitude). The ascent is cut off on the
   * apsides of that ellipse, the flight is judged there, and the last stage
   * then flies itself back to the surface — Starship's ship on its test
   * flights, 213 × −15 km. Only a vehicle whose last stage can fly that
   * return (`StageSpec.flaps`) is given one.
   */
  suborbital?: boolean;
  /**
   * Fly the southbound of the two launch solutions (descending node over the
   * site) whatever the site's custom — Mercury-Redstone 3's 105° heading out
   * of the Cape (C01). Absent: `launchDirection` chooses.
   */
  descending?: boolean;
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
  | 'crew'
  | 'crewDragon'
  | 'ps1'
  | 'vostok'
  | 'mercury';

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
  /**
   * Flies in the open, not in the fairing (Crew Dragon, roadmap C01): the
   * outer diameter and length the launcher's nose becomes, and the length of
   * its tapering top (the capsule).
   */
  exposed?: { diameter: number; length: number; noseLength: number };
  /** The only vehicles that carry it, when not every one does */
  carriers?: string[];
  /**
   * A capsule that comes home on its own parachutes from a suborbital flight
   * (C01: Mercury), which lets a vehicle with no ship to fly home take one.
   */
  descent?: 'mercury';
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
  /** a commanded launch abort (a crewed Soyuz's escape system; nothing else has one) */
  | 'launchAbort'
  /** a fire on the pad before liftoff (Soyuz T-10-1, 1983) */
  | 'padFire'
  /** a strap-on striking the core as it separates (Soyuz MS-10, 2018) */
  | 'boosterCollision'
  /** a stage separation that half-fails, the next stage lighting still attached (Soyuz 18a, 1975) */
  | 'stagingFailure'
  | 'random';

export interface FailureConfig {
  mode: FailureMode;
  /** Mission time at which the failure is injected, s */
  time: number;
  /** Stage index affected (0-based) */
  stage: number;
}

export interface MissionConfig {
  /** Explicit model selection; absent means the legacy point-mass API. */
  dynamics?: DynamicsConfig;
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
  /**
   * Where each recovered body is flown back to. Absent, every recovered body
   * lands where it comes down, with no boostback (the original model). Only
   * read when `boosterRecovery` is set.
   */
  recoveryPlan?: RecoveryPlan;
  /** Extra payload mass added by the user, kg */
  payloadMassOverride?: number;
  /**
   * Fly on to the station and dock (roadmap G07): the profile, the Russian
   * port, and whether the Engineer mode may take the final approach by hand.
   * Only read for a spacecraft with its own propulsion to the ISS orbit.
   */
  rendezvous?: { profile: import('./physics/rendezvous/profiles').RendezvousProfileId; port?: import('./physics/rendezvous/ports').PortId };
  /**
   * The site's launch pad the mission is drawn on (`SiteExtra.pads`), when it
   * names one; absent, the site's first. The physics does not read it.
   */
  padId?: string;
  /**
   * `guidance` has already been merged with the vehicle's `guidanceDefaults`.
   * The simulation merges them itself when this is false/absent, so a caller
   * that only knows `DEFAULT_GUIDANCE` still flies each vehicle's own pitch
   * program; set it when a tuner deliberately sweeps parameters that happen to
   * equal the library defaults.
   */
  guidanceResolved?: boolean;
}

/**
 * How one recovered body comes home.
 *
 * - `downrange`: entry and landing burns wherever the stage comes down, with
 *   no target: what `boosterRecovery` flies with no plan at all.
 * - `droneShip`: no boostback; a ship is stationed where the stage is
 *   predicted to come down at separation, and the entry and landing burns
 *   steer onto its deck.
 * - `landingZone`: a boostback burn turns the stage round and flies it back to
 *   a landing zone near the launch site (`src/data/landing-zones.ts`).
 * - `expended`: not recovered; it keeps no propellant back.
 */
export type RecoveryMode = { kind: 'downrange' } | { kind: 'droneShip' } | { kind: 'landingZone'; zoneId: string } | { kind: 'expended' };

export interface RecoveryPlan {
  /** the first stage, or the core of a vehicle with strap-ons; left out, it is expended */
  core?: RecoveryMode;
  /** strap-ons, in the order they separate within their group (Falcon Heavy's two side boosters); one left out is expended */
  boosters?: readonly RecoveryMode[];
}

/** The modes that fly a stage to a target: a ship's deck, a pad, a tower's arms. */
export type TargetedRecovery = Extract<RecoveryMode, { kind: 'droneShip' | 'landingZone' }>;

export interface DynamicsConfig {
  model: 'pointMass' | 'sixDof';
  wind: 'calm' | 'crosswind' | 'shear';
  seed: number;
  /** Six-DOF only: propellant slosh, bending and the notch filter (roadmap P05). Absent: rigid. */
  flex?: FlexConfig;
  /** Six-DOF only: the attitude autopilot's tuning (roadmap E04). Absent: the default autopilot, bit for bit. */
  control?: ControlConfig;
  /** Six-DOF only: inertial navigation with GNSS and a star tracker (roadmap G02). Absent: the flight knows its true state. */
  navigation?: NavigationConfig;
  /** Six-DOF only: failures of the control system and the FDIR that meets them (roadmap G08). Absent: nothing fails, bit for bit. */
  controlFaults?: ControlFaultsConfig;
  /** PEG or IGM for the stages out of the atmosphere (roadmap G01). Absent: the standard ascent guidance, bit for bit. */
  explicitGuidance?: ExplicitGuidanceConfig;
}

/**
 * The flexible body of a six-DOF flight (src/physics/rigid/flex.ts). Every
 * option is off by default; off, the flight is the rigid one bit for bit.
 */
export interface FlexConfig {
  slosh?: boolean;
  bending?: boolean;
  notch?: boolean;
  /** IMU station, fraction of the current stack from its aft end; absent = the instrument bay */
  imuStation?: number;
  /** notch depth numerator and width denominator damping ratios */
  notchZetaZero?: number;
  notchZetaPole?: number;
  /** notch centre as a multiple of the predicted bending frequency */
  notchFrequencyScale?: number;
  /** with the filter on, the autopilot's rate gain stays below the bending frequency over this ratio */
  bandwidthRatio?: number;
  /** damping ratios of the slosh modes (baffles) and of the bending mode (structure) */
  sloshDamping?: number;
  bendingDamping?: number;
}

// --- E04 ---
/** One channel of the attitude autopilot (src/physics/rigid/control-config.ts); absent fields keep the default. */
export interface ControlChannelConfig {
  /** K_θ, 1/s: the rate commanded per radian of attitude error */
  attitudeGain?: number;
  /** K_ω, 1/s: the angular acceleration commanded per rad/s of rate error */
  rateGain?: number;
  /** the rate limit, deg/s, and the ceiling of the scheduled angular-acceleration limit, deg/s² */
  maxRateDegS?: number;
  maxAccelerationDegS2?: number;
}

/** The attitude autopilot's tuning (roadmap E04): the roll channel, the pitch–yaw pair and the feed-forward. */
export interface ControlConfig {
  roll?: ControlChannelConfig;
  /** Set gains here are flown as set: P05's flexible-vehicle cap applies to the defaults only. */
  pitchYaw?: ControlChannelConfig;
  /** weight of the aerodynamic feed-forward, 0–1 (1: full, the default) */
  feedForward?: number;
}

// --- G02 ---
/** The navigation a six-DOF flight flies on (src/physics/nav/); its presence turns it on. */
export interface NavigationConfig {
  /** the IMU's grade; 'custom' starts from tactical and takes `imu` */
  grade?: 'navigation' | 'tactical' | 'mems' | 'custom';
  /** figures over the grade's (src/physics/nav/sensors.ts `ImuSpec`) */
  imu?: {
    gyroBiasDegH?: number; gyroBiasInstabilityDegH?: number; gyroArwDegRtH?: number; gyroScalePpm?: number;
    accelBiasUg?: number; accelBiasInstabilityUg?: number; accelVrwMsRtH?: number; accelScalePpm?: number; alignmentDeg?: number;
  };
  /** GNSS fixes (default on): noise, m and m/s; rate, Hz; an outage, mission seconds [start, end) */
  gnss?: boolean;
  gnssPositionM?: number;
  gnssVelocityMs?: number;
  gnssRateHz?: number;
  gnssOutage?: [number, number];
  /** star tracker (default on): noise, arcsec; lowest altitude it sees stars from, km */
  starTracker?: boolean;
  starTrackerArcsec?: number;
  starTrackerMinAltitudeKm?: number;
  /** the sensors' random seed; absent, derived from the dynamics seed */
  seed?: number;
}

// --- G08 ---
/** A failure of the control system (src/physics/rigid/faults.ts): actuators, sensors or the flight computer. */
export type ControlFaultKind =
  | 'gimbalStuck' | 'gimbalHardover' | 'gimbalSlow' | 'actuatorPolarity' | 'rcsStuckOn' | 'rcsFailedOff'
  | 'rateInverted' | 'gyroStuck' | 'gyroBias' | 'gyroNoise' | 'imuFailure' | 'accelBias' | 'gnssLoss' | 'starTrackerLoss'
  | 'computerHold' | 'gainSign';
/** One failure: what fails, when, and where. Engines, jets and IMU units count from 1. */
export interface ControlFaultSpec {
  kind: ControlFaultKind;
  /** mission time it appears, s */
  time: number;
  /** not before this stage (0-based, as `FailureConfig.stage`) is the one flying */
  stage?: number;
  /** actuators: the engine of the flying stage, or all of them */
  engine?: number | 'all';
  /** RCS: the jet of the flying stage, or all of them */
  jet?: number | 'all';
  /** sensors: the IMU units it strikes, or all three (a common-mode failure) */
  units?: number[] | 'all';
  /** the axis, in ISO 1151 body axes (roll x, pitch y, yaw z); absent, every axis */
  axis?: 'roll' | 'pitch' | 'yaw';
  /** hard-over: the side of the stop */
  sign?: 1 | -1;
  /**
   * The size, in the kind's unit: gyroBias °/s, gyroNoise °/s (1σ), accelBias mg,
   * gimbalSlow the fraction of the rate left, computerHold s.
   */
  magnitude?: number;
}
/** The failures a flight carries, and whether its FDIR is on. */
export interface ControlFaultsConfig {
  faults: ControlFaultSpec[];
  /** fault detection, isolation and recovery: IMU voting, the gimbal monitor, jet isolation, the backup computer (default off) */
  fdir?: boolean;
  /** the accident preset the list came from, for the panel */
  preset?: string;
  /** the sensors' random seed; absent, derived from the dynamics seed */
  seed?: number;
}

// --- G01 ---
/** Explicit ascent guidance (src/physics/explicit-guidance.ts): which law, and its cycle. */
export interface ExplicitGuidanceConfig {
  /** 'peg': the Shuttle's Powered Explicit Guidance; 'igm': the Saturn V's Iterative Guidance Mode */
  law: 'peg' | 'igm';
  /** guidance cycle, s (default 1) */
  cycleS?: number;
}
