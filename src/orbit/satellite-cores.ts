/**
 * The satellite builder's physics cores, as signatures only (roadmap D06,
 * docs/ROADMAP-PART2-3.md; Phase 4 map §2.2, step 0.3). Types, no code: the
 * contract the Phase 4 tracks compile against while each writes its own
 * module, so none has to edit another's file.
 *
 * | Core | Module (new) | Track | Validation (map §2.2) |
 * |---|---|---|---|
 * | `EclipseCore`, A | src/orbit/eclipse.ts | A1 | V-E1–V-E3 |
 * | `PowerCore`, B | src/orbit/power.ts | A1 | V-P1–V-P4 |
 * | `DisposalCore`, C | src/orbit/disposal.ts | A4 | V-V1–V-V4 |
 * | `AttitudeCore`, D | src/orbit/attitude.ts | A2 | Starin & Eterno tables |
 * | `LinkCore`, E | src/orbit/link.ts | A3 | V-L1–V-L3 |
 * | `ImagingCore`, F | src/orbit/imaging.ts or applications.ts | A3 | V-G1–V-G4 |
 * | `SatelliteAreaCore`, G | src/design/satellite-area.ts | A4 | NAPA-2, TU Delft p. 138 |
 *
 * The last one takes a `SatelliteDesign`, so it is declared beside it in
 * src/design/satellite-spec.ts. `OrbitCores` gathers the rest, so the
 * satellite model (track B's `designFigures`) and D07 can be written against
 * the cores before they land and be handed the real ones after.
 *
 * HOW A MODULE IMPLEMENTS ONE. Export each function under the name given
 * here, as the repo's other cores do, and end the module with, for example,
 * `export const eclipseCore = { betaAngle, eclipseFraction, … } satisfies
 * EclipseCore;` — tsc then holds the module to its contract. The members are
 * function-typed properties, not methods, so their parameters are checked
 * strictly rather than bivariantly.
 *
 * UNITS. SI inside, as everywhere in src/orbit: m, s, kg, N, W, J, Hz, rad;
 * decibels where a link budget is written in them (dB, dBi, dBW, dB-Hz).
 * The stored design (`SatelliteDesign`) keeps degrees and hours, as the other
 * specs a user types do (src/types.ts); the satellite model converts.
 *
 * MODEL CHOICES the map fixes (risk R7): the Sun is `sunDirectionEci`
 * (src/physics/orbital.ts) and the shadow `inSunlight`'s cylinder of radius
 * `R_EARTH` (src/orbit/passes.ts), the pair Skyfield checks; the Earth is a
 * sphere of radius `R_EARTH` in every closed form.
 */
import type { Activity } from '../physics/propagator/activity';
import type { Spacecraft } from '../physics/propagator/forces';
import type { Craft } from './budget';
import type { Orbit } from './kepler';

// ─── A. Eclipse and β angle (src/orbit/eclipse.ts) ──────────────────────────

/** The shadow over one revolution, sampled. */
export interface SampledEclipse {
  /** time in the cylindrical shadow over the revolution, s */
  duration: number;
  /** that time over the revolution's period, 0–1 */
  fraction: number;
}

/** The longest eclipse in a span of days, and when. */
export interface WorstEclipse {
  /** Julian date (UTC) of the day it falls on */
  jd: number;
  /** the β angle then, rad */
  beta: number;
  /** 0–1 */
  fraction: number;
  /** s */
  duration: number;
}

export interface EclipseCore {
  /**
   * The β angle at `jd`, rad: the Sun's elevation above the orbit plane,
   * asin(`sunDirectionEci(jd)` · the orbit normal), the node drifted to `jd`
   * (with J2 when `j2`).
   */
  betaAngle: (o: Orbit, jd: number, j2: boolean) => number;
  /**
   * The share of a circular orbit at altitude `h` (m) spent in the shadow at
   * β (rad), 0–1: (1/π)·acos(√(h² + 2Rh) / ((R + h)·cos β)) while
   * |β| < asin(R/(R + h)), else 0 (SMAD's form; V-E1, V-E2).
   */
  eclipseFraction: (h: number, beta: number) => number;
  /** That share of the two-body period at altitude `h`, s. */
  eclipseDuration: (h: number, beta: number) => number;
  /**
   * The shadow over the revolution that starts at `jd`, sampled every `step`
   * s with `inSunlight` along `stateAt`: any eccentricity, and the closed
   * form's cross-check (V-E3).
   */
  sampledEclipse: (o: Orbit, jd: number, step: number) => SampledEclipse;
  /** The longest eclipse over `days` from `jd0`, β swept as the node and the Sun move. */
  worstEclipse: (o: Orbit, jd0: number, days: number) => WorstEclipse;
}

// ─── B. Power (src/orbit/power.ts) ──────────────────────────────────────────

/** How the array faces the Sun (TU Delft p. 133, V-P3). */
export type ArrayMount =
  /** a wing turned to the Sun */
  | 'tracking'
  /** panels fixed to the body */
  | 'body'
  /** cells round a spinning cylinder, a factor of π in area */
  | 'spinner';

/** How the array's power reaches the loads: direct energy transfer or peak-power tracking (the X_d/X_e pair). */
export type PowerRegulation = 'DET' | 'PPT';

/** The array's power over an orbit (TU Delft p. 120, V-P1, V-P2). */
export interface ArrayPowerInput {
  /** loads in daylight and in eclipse, W */
  dayLoad: number;
  eclipseLoad: number;
  /** time in daylight and in eclipse per orbit, s */
  Td: number;
  Te: number;
  /** path efficiencies from the array to the loads, by day and through the battery in eclipse, 0–1 */
  Xd: number;
  Xe: number;
}

/** The array to size (V-P3). */
export interface ArrayAreaInput {
  /** the array power needed at end of life, W (`arrayPowerRequired`) */
  Psa: number;
  /** the solar flux, W/m² (`solarFlux`, or a figure a test fixes) */
  flux: number;
  /** cell efficiency and the inherent degradation I_d, 0–1 */
  cellEff: number;
  Id: number;
  /** the worst angle of the Sun off the array's normal, rad */
  sunAngle: number;
  /** the output lost each year, 0–1, and the years of life: L_d = (1 − d)^years */
  degPerYear: number;
  years: number;
  /** the mount's own factor on top of cos θ (π for a spinner) */
  mount: ArrayMount;
}

export interface ArrayArea {
  /** output per m² at beginning and at end of life, W/m²: P_BOL = S·η·I_d·cos θ, P_EOL = P_BOL·L_d */
  pBol: number;
  pEol: number;
  /** L_d */
  lifeFactor: number;
  /** m² */
  area: number;
}

/** A battery to size (TU Delft Eq. [81], p. 125). */
export interface BatteryInput {
  /** the load through the eclipse, W, and the eclipse, s */
  eclipseLoad: number;
  Te: number;
  /** depth of discharge allowed, and the battery-to-load efficiency, 0–1 */
  dod: number;
  eff: number;
}

/** A flown battery's depth of discharge, as sourced guidance (Britton & Miller, NASA Glenn 2000, via TU Delft Table 42). */
export interface FlownDepthOfDischarge {
  spacecraft: string;
  battery: string;
  orbit: 'LEO' | 'GEO';
  /** 0–1 */
  dod: number;
  source: string;
}

export interface PowerCore {
  /** The solar flux at 1 AU, W/m², with its source in the implementing module. */
  SOLAR_FLUX_1AU: number;
  /** The flux on `jd`, W/m²: `SOLAR_FLUX_1AU`·(AU/r)², r from `sunPosition` (about ±3.4 % over a year). */
  solarFlux: (jd: number) => number;
  /** The array power, W: (P_e·T_e/X_e + P_d·T_d/X_d)/T_d. */
  arrayPowerRequired: (i: ArrayPowerInput) => number;
  arrayArea: (i: ArrayAreaInput) => ArrayArea;
  /**
   * The battery's capacity, J: P·t/(DoD·η). The map and TU Delft write Wh;
   * SI here (1 Wh = 3600 J), and the design stores Wh
   * (`SatelliteDesign.power.batteryWh`), as batteries are rated.
   */
  batteryCapacity: (i: BatteryInput) => number;
  /** Charge–discharge cycles a year for an orbit of `period` s, one eclipse a revolution. */
  cyclesPerYear: (period: number) => number;
}

// ─── C. Propulsion Δv and disposal (src/orbit/disposal.ts) ──────────────────

/** A Δv budget to hold against the tanks (`deltaVAvailable`, src/orbit/budget.ts). */
export interface DvAllocationInput {
  /** m/s: to the working orbit, and at the end of life */
  insertion: number;
  disposal: number;
  /** station keeping and drag make-up, m/s a year, over `years` */
  stationKeepingPerYear: number;
  years: number;
}

export interface DvAllocation extends DvAllocationInput {
  /** m/s: station keeping over the life, the sum needed, what the tanks hold */
  stationKeeping: number;
  required: number;
  available: number;
  /** available − required, m/s; below zero is a shortfall */
  margin: number;
}

export interface DisposalCore {
  /** Δv to lower the perigee of a circular orbit at altitude `h` to altitude `hp`, one burn, m/s. */
  perigeeLowerDv: (h: number, hp: number) => number;
  /**
   * IADC's re-orbit above GEO for radiation-pressure coefficient `cr` and
   * area-to-mass `areaToMass` (m²/kg): the rise ΔH = 235 km + (1000·C_R·A/m)
   * km, returned in m, and its Δv ≈ v·ΔH/(2a), m/s (V-V3).
   */
  graveyardRaise: (cr: number, areaToMass: number) => { dh: number; dv: number };
  /** North–south station keeping against an inclination drift of `di` rad a year (the map writes °/yr; SI here): 2v·sin(Δi/2), v at GEO, m/s a year (V-V4). */
  nsskPerYear: (di: number) => number;
  /** Δv a year that makes up the drag at the orbit's height at its epoch: (v/2a)·|ȧ|·1 yr, ȧ from `dragRates`, m/s a year. */
  dragMakeupPerYear: (o: Orbit, sc: Spacecraft, activity: Activity) => number;
  dvAllocation: (i: DvAllocationInput, craft: Craft) => DvAllocation;
}

// ─── D. Attitude determination and control (src/orbit/attitude.ts) ──────────

/** Starin & Eterno, NTRS 20110007070, Tables 19-4, 19-11, 19-12; no IGRF (Principle 8). */
export interface AttitudeCore {
  /** Gravity-gradient torque at radius `r` (m), I_z and I_y (kg·m²), θ off the local vertical (rad), N·m: (3μ/2r³)·|I_z − I_y|·sin 2θ. */
  gravityGradientTorque: (r: number, Iz: number, Iy: number, theta: number) => number;
  /** Sunlight-pressure torque, N·m: (Φ/c)·A·(1 + q)·cos i·L, flux Φ in W/m², area m², reflectance q, incidence rad, arm m. */
  solarTorque: (flux: number, area: number, q: number, incidence: number, arm: number) => number;
  /** Aerodynamic torque, N·m: ½ρ·C_D·A·v²·L, ρ in kg/m³, v in m/s, arm m. */
  aeroTorque: (rho: number, cd: number, area: number, v: number, arm: number) => number;
  /** The dipole field's strength at radius `r` (m), T: 2M/r³ (its polar value), M = 7.8e15 T·m³. */
  dipoleField: (r: number) => number;
  /** A residual dipole's torque in a field, N·m: D·B, D in A·m², B in T. */
  magneticTorque: (dipole: number, B: number) => number;
  /** Wheel momentum to store a cyclic torque over an orbit of `period` s, N·m·s: T·P·0.707/4. */
  wheelMomentumCyclic: (torque: number, period: number) => number;
  /** Torque to slew `angle` rad in `time` s about an axis of inertia `inertia` kg·m², N·m: 4θI/t². */
  slewTorque: (angle: number, inertia: number, time: number) => number;
  /** Bias momentum to hold `accuracy` rad against a torque over a quarter orbit, N·m·s: T·P/(4θ_a). */
  biasMomentum: (torque: number, period: number, accuracy: number) => number;
  /** Magnetic torquer dipole to give `torque` in field `B`, A·m²: T/B. */
  torquerDipole: (torque: number, B: number) => number;
  /** Thruster force for a torque on an arm, N: T/L (a slew's torque is `slewTorque`'s). */
  thrusterForce: (torque: number, arm: number) => number;
  /** Thruster force to dump momentum `h` (N·m·s) on an arm in `burnTime` s, N: h/(L·t). */
  momentumDumpForce: (h: number, arm: number, burnTime: number) => number;
  /** Pointing loss of an antenna off by `error` rad, beamwidth θ_3dB rad, dB: 12(e/θ_3dB)²; feeds the link. */
  pointingLoss: (error: number, beamwidth: number) => number;
}

// ─── E. Communications (src/orbit/link.ts) ──────────────────────────────────

/** One downlink's design control table (JPL DESCANSO 18, MarCO, Table 5-4; V-L1). */
export interface DesignControlInput {
  /** dBW (`eirp`) */
  eirp: number;
  /** Hz, and the slant range, m */
  frequency: number;
  range: number;
  /** the receiving antenna's gain, dBi: given, as DSN tables give it, not a dish size */
  rxGain: number;
  /** the system noise temperature, K */
  systemTemperature: number;
  /** every loss between the two antennas, dB: atmosphere, polarisation, pointing (`pointingLoss`) */
  losses: number;
  /** bit/s */
  dataRate: number;
  /** the threshold E_b/N₀ of the coding and error rate, dB (a `RequiredEbN0`) */
  requiredEbN0: number;
  /** modulation and implementation losses together, dB (MarCO: 0.44 + 0.63) */
  implementationLoss: number;
}

export interface DesignControlTable {
  /** free-space loss, dB */
  pathLoss: number;
  /** received power, dBW, and the noise density N₀ = k·T, dBW/Hz */
  received: number;
  n0: number;
  /** received P_t/N₀ and the P_t/N₀ required (data rate + threshold + losses), dB-Hz */
  ptOverN0: number;
  requiredPtOverN0: number;
  /** dB */
  margin: number;
}

/** A required E_b/N₀, kept as sourced data (map §2.2 E). */
export interface RequiredEbN0 {
  id: string;
  /** e.g. turbo rate 1/6, or OQPSK with convolutional coding */
  scheme: string;
  /** the error rate it is quoted at */
  errorRate: { kind: 'FER' | 'BER'; value: number };
  /** dB */
  ebN0: number;
  source: string;
}

export interface LinkCore {
  /** EIRP, dBW, from transmitter power `power` (W), line loss (dB) and antenna gain (dBi). */
  eirp: (power: number, lineLoss: number, gain: number) => number;
  /** The slant range from a station to a satellite at radius `r` (m) seen at elevation ε (rad), m: √(r² − R²cos²ε) − R·sin ε. */
  slantRange: (r: number, elevation: number) => number;
  designControlTable: (i: DesignControlInput) => DesignControlTable;
  /** The highest data rate a C/N₀ (dB-Hz) carries at a required E_b/N₀ and a margin (dB), bit/s: 10^((C/N₀ − E_b/N₀ − M)/10). */
  maxDataRate: (cOverN0: number, requiredEbN0: number, margin: number) => number;
  /** The longest pass, straight overhead, s: (P/π)·λ_max, λ_max = `footprintAngle` (rad), P in s (tests/passes.test.ts holds `findPassesOf` to it). */
  maxPassDuration: (period: number, lambdaMax: number) => number;
}

// ─── F. Payload (src/orbit/imaging.ts, or applications.ts) ──────────────────

export interface ImagingCore {
  /**
   * The ground sample distance looking `offNadir` rad from nadir at altitude
   * `h` (m), pitch and focal length in m: along track p·ρ/f and across track
   * p·ρ/(f·cos θ_inc), ρ the slant range and θ_inc the incidence at the
   * ground, m. At nadir both equal `groundSampleDistance` exactly.
   */
  offNadirGsd: (h: number, pitch: number, focalLength: number, offNadir: number) => { along: number; cross: number };
  /** The diffraction-limited GSD, m: 1.22·λ·h/D, aperture D and wavelength λ in m. */
  diffractionGsd: (h: number, aperture: number, wavelength: number) => number;
  /** The camera's data rate, bit/s: pixels·bits·v_ground/GSD, v_ground = √(μ/r)·R/r. */
  imagingDataRate: (pixels: number, bits: number, gsd: number, h: number) => number;
}

// ─── all of them ────────────────────────────────────────────────────────────

/** The orbit cores together, for code written against them before they land (the satellite model, D07). */
export interface OrbitCores {
  eclipse: EclipseCore;
  power: PowerCore;
  disposal: DisposalCore;
  attitude: AttitudeCore;
  link: LinkCore;
  imaging: ImagingCore;
}
