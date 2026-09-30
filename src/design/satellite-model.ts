/**
 * The satellite builder's model (roadmap D06, docs/ROADMAP-PART2-3.md; Phase 4
 * map §2.3, §2.5, §2.7, track B): a designed satellite's every figure, what
 * is wrong with it in words, where each of its numbers comes from, and the
 * draft a browser keeps between visits. DOM-free; the Explore level's
 * satellite designer (src/ui/build/satellite-level.ts) and the Engineer
 * level's satellite bench (src/ui/build/satellite-bench.ts) only draw it.
 *
 * ONE NUMBER, ONE WAY. `designFigures` works out every D06 number by calling
 * the cores in src/orbit — eclipse.ts (A1), power.ts (A1), disposal.ts (A4),
 * attitude.ts (A2), link.ts and imaging.ts (A3) — and the drag area
 * (src/design/satellite-area.ts, A4), on the orbit `designOrbit` places
 * (src/design/satellite-handoff.ts, C1): the same orbit the Build → Orbit
 * hand-off flies. D07, the design lessons (T01) and their checker (T02) read
 * these figures and never work one out again. Each comes with its unit, SI
 * (s, m, rad, W, J, kg, m/s, N·m, …; decibels where a link budget is written
 * in them; a share 0–1 as a `fraction`); the screen converts for showing.
 *
 * WHAT THE FIGURES ASSUME, said on screen with them:
 * - the power is sized for the LONGEST eclipse of the year from `jd`
 *   (`worstEclipse`), with the loads the same in sunlight and in shadow, the
 *   flux at 1 AU (`SOLAR_FLUX_1AU`), a tracking wing square to the Sun and a
 *   body-fixed or spinning array at the season's worst 23.5° (TU Delft
 *   p. 133), at the end of the design's life;
 * - the Δv budget holds a low orbit against drag (`dragMakeupPerYear`) and a
 *   geostationary one in its box (north–south at 0.85° a year, which
 *   reproduces TU Delft Fig. 11's 45.5 m/s a year, and east–west at its
 *   1.33 m/s a year), and at the end brings a low one down on a controlled
 *   re-entry (Hull's 50 km perigee) or raises a geostationary one by IADC's
 *   rule; a satellite without an engine holds nothing, and the lifetime
 *   (P07) says when the air brings it down;
 * - the torques are worst-case magnitudes for sizing (src/orbit/attitude.ts):
 *   the tilt at 45°, where the gravity gradient peaks; the Sun square on the
 *   sunlit face with Starin & Eterno's reflectance 0.6; the air at the
 *   perigee at an ECSS level (src/orbit/satellite-air.ts); the field at the
 *   pole of a centred dipole;
 * - the downlink is read at the slant range to the lowest elevation from the
 *   apogee, the worst of the orbit; the longest pass straight overhead;
 * - the camera looks from the perigee, straight down and 30° off; its data
 *   rate is a push-broom's before compression.
 *
 * FIXED LEVELS. The air is read at one of ECSS's fixed levels of solar
 * activity, moderate unless asked (src/orbit/satellite-air.ts), never the
 * measured series: a design's figures come out the same tomorrow (map R6).
 *
 * DOM-free and free of the propagator (tests/propagator.test.ts): the air
 * comes through src/orbit/satellite-air.ts, the spacecraft P07 flies is typed
 * as the S03 hand-off carries it. The worst eclipse walks a year of
 * revolutions (a quarter of a second in low orbit), so it is kept per orbit
 * and date (`worstEclipseOf`): a change to the array does not walk it again.
 * tests/d06-satellite-model.test.ts.
 */
import type { SatelliteKind } from '../types';
import { DEG, R_EARTH, GEO_ALTITUDE } from '../physics/constants';
import { ORBIT_PRESETS } from '../data/orbits';
import { SATELLITE_TEMPLATES, satelliteTemplateById } from '../data/satellite-templates';
import { SATELLITE_LIMITS, satelliteDesignProblems, type SatelliteDesignIssue } from '../config/satellite-design';
import { SITE_INCLINATION_DEG } from '../orbit/presets';
import { orbitFacts, sunSynchronousInclination, apsidesToAE, type Orbit } from '../orbit/kepler';
import { betaAngle, eclipseDuration, sampledEclipse, worstEclipse } from '../orbit/eclipse';
import {
  MOUNT_FACTOR, PATH_EFFICIENCY, SOLAR_FLUX_1AU, WORST_SUN_ANGLE, arrayArea, arrayPowerRequired, batteryCapacity, cyclesPerYear,
} from '../orbit/power';
import { CONTROLLED_REENTRY_PERIGEE, dragMakeupPerYear, dvAllocation, graveyardRaise, nsskPerYear, perigeeLowerDv, propellantFor } from '../orbit/disposal';
import {
  aeroTorque, biasMomentum, dipoleField, gravityGradientTorque, magneticTorque, pointingLoss, solarTorque, torquerDipole, wheelMomentumCyclic,
} from '../orbit/attitude';
import { LINK_MARGIN_THRESHOLD, designControlTable, eirp, maxDataRate, maxPassDuration, slantRange } from '../orbit/link';
import { diffractionGsd, imagingDataRate, offNadirGsd } from '../orbit/imaging';
import { dishGain, footprintAngle, swathWidth } from '../orbit/applications';
import { STATIONS } from '../orbit/applications-setup';
import { DEFAULT_ACTIVITY_LEVEL, levelActivity, perigeeDensity, type EcssLevel } from '../orbit/satellite-air';
import type { OrbitHandoff } from '../orbit/handoff';
import { ballisticCoefficient, ballisticProblem, dragArea, lifetimeSpacecraft, satelliteAreaCore, wetMass } from './satellite-area';
import { designOrbit, handoffFromDesign } from './satellite-handoff';
import type { SatelliteDesign, SatelliteTemplate } from './satellite-spec';

// ─── the assumptions, by name ───────────────────────────────────────────────

/** The tilt off the local vertical the gravity gradient is sized at: 45°, where sin 2θ and the torque peak (a worst case). */
export const GG_SIZING_ANGLE = 45 * DEG;
/** The sunlit face's reflectance q for the sunlight torque: Starin & Eterno's FireSat, 0.6 (NTRS 20110007070, Table 19-4). */
export const SUNLIT_REFLECTANCE = 0.6;
/** The camera's tilt for the off-nadir figures, rad: 30°. */
export const OFF_NADIR_ANGLE = 30 * DEG;
/** The wavelength the diffraction limit is read at, m: 550 nm, the middle of the visible. */
export const DIFFRACTION_WAVELENGTH = 550e-9;
/** A transmitting dish's aperture efficiency: 0.55, a textbook value, and an estimate. */
export const TX_DISH_EFFICIENCY = 0.55;
/** The receiving dish's efficiency: Palo et al.'s NEN dish, 57 % (NTRS 20150000169, Table 1). */
export const RX_DISH_EFFICIENCY = 0.57;
/** The receiving station a design without its own figures is read with: Palo et al.'s NEN 11.28 m dish, 189.7 K, 2 dB (src/data/satellite-templates.ts). */
export const RX_DEFAULTS = { rxAntennaD: 11.28, rxNoiseK: 189.7, losses: 2 } as const;
/**
 * The half-power beamwidth of a dish, deg ≈ 21 / (f in GHz · D in m) (MIT OCW
 * 16.851, L21, slide 23): the angle the pointing loss is measured against.
 */
export const beamwidthOf = (frequency: number, diameter: number): number => (21 / ((frequency / 1e9) * diameter)) * DEG;
/**
 * The inclination a geostationary satellite drifts by each year under the
 * Sun and the Moon, rad a year: 0.85°, which reproduces TU Delft Fig. 11's
 * ten-year mean north–south station keeping of 45.5 m/s a year (V-V4). An
 * estimate: the drift goes from about 0.75 to 0.95° a year over the Moon's
 * 18.6-year cycle (src/orbit/disposal.ts `nsskPerYear`).
 */
export const GEO_INCLINATION_DRIFT = 0.85 * DEG;
/** East–west station keeping in GEO, m/s a year: TU Delft Fig. 11's ten-year mean, 1.33. */
export const GEO_EWSK_PER_YEAR = 1.33;
/** IADC's protected geostationary ring (IADC-02-01 Rev. 4 §3.3.2): 35 786 km ± 200 km, latitudes within ±15°. */
export const GEO_RING = { halfHeight: 200e3, maxInclination: 15 * DEG } as const;
/** IADC's protected low region: altitudes to 2000 km. */
export const LEO_TOP = 2000e3;

// ─── a figure and its unit ──────────────────────────────────────────────────

/** Every unit a figure comes in: SI, decibels where a link budget is written in them. */
export type FigUnit =
  | 's' | 'm' | 'rad' | 'h' | 'fraction' | 'count' | 'ratio' | 'per-year' | 'per-day'
  | 'W' | 'J' | 'W/m2' | 'm2' | 'kg' | 'm2/kg' | 'kg/m3'
  | 'm/s' | 'm/s/yr' | 'N·m' | 'N·m·s' | 'A·m2' | 'T'
  | 'dB' | 'dBi' | 'dBW' | 'dBW/Hz' | 'dB-Hz' | 'bit/s' | 'bit';

export interface Fig {
  value: number;
  unit: FigUnit;
}
const f = (value: number, unit: FigUnit): Fig => ({ value, unit });

/** Where the orbit is, as the rules divide space (IADC's protected regions). */
export type OrbitRegion = 'leo' | 'geo' | 'other';
/** What the Δv budget does at the end of life. */
export type DisposalPlan = 'reentry' | 'graveyard' | 'decay' | 'none';

export interface SatelliteFigures {
  /** the Julian date (UTC) the figures are read on, and the ECSS level of the air */
  jd: number;
  level: EcssLevel;
  orbit: {
    perigee: Fig; apogee: Fig; inclination: Fig; semiMajorAxis: Fig; eccentricity: Fig;
    period: Fig; nodalPeriod: Fig; revsPerDay: Fig;
    region: OrbitRegion;
    /** a sun-synchronous design asked for where no inclination turns the node with the Sun (it flies the stored one) */
    noSso: boolean;
  };
  eclipse: {
    /** β on `jd`, and the shadow over the revolution that starts then */
    beta: Fig; now: Fig; nowFraction: Fig;
    /** the longest of the year from `jd`, its β, and the Julian date its revolution starts */
    worst: Fig; worstFraction: Fig; worstBeta: Fig; worstJd: number;
    /** SMAD's closed form at β = 0 at the mean altitude (a nearly circular orbit only, e < 0.005), the longest any season can give */
    atBetaZero: Fig | null;
    /** charge cycles a year: one a revolution, an upper bound; 0 with no eclipse all year */
    cyclesPerYear: Fig;
  };
  power: {
    load: Fig; daylight: Fig; eclipse: Fig; Xd: Fig; Xe: Fig;
    /** what the array must give in sunlight at the end of life (`arrayPowerRequired`) */
    required: Fig;
    flux: Fig; sunAngle: Fig; pBol: Fig; pEol: Fig; lifeFactor: Fig;
    /** the cells needed, and the design's */
    areaNeeded: Fig; area: Fig;
    /** what the design's array gives in sunlight at the end of life, and its margin over the need (null with no load) */
    eolPower: Fig; margin: Fig | null;
    /** the battery the longest eclipse needs at the design's depth of discharge, the design's, and how deep it is drained */
    batteryNeeded: Fig; battery: Fig; depth: Fig;
  };
  mass: { dry: Fig; propellant: Fig; wet: Fig };
  drag: { area: Fig; ballistic: Fig; problem: 'low' | 'high' | null };
  dv: {
    plan: DisposalPlan; engine: boolean;
    insertion: Fig; dragMakeupPerYear: Fig; nsskPerYear: Fig; ewskPerYear: Fig; stationKeepingPerYear: Fig;
    stationKeeping: Fig; disposal: Fig; required: Fig; available: Fig; margin: Fig;
    /** the propellant the budget burns (null with no engine); IADC's rise above GEO (graveyard only) */
    propellantNeeded: Fig | null; graveyardRise: Fig | null;
  };
  attitude: {
    radius: Fig; density: Fig; field: Fig;
    gravityGradient: Fig; solar: Fig; aero: Fig; magnetic: Fig;
    /** the disturbances together, all aligned (the gravity gradient left out when it is what holds the attitude) */
    total: Fig;
    wheelNeeded: Fig | null; biasNeeded: Fig | null; torquerDipole: Fig;
    /** the design's wheel over what is needed, null where no wheel is sized */
    wheelMargin: Fig | null;
  };
  link: {
    txGain: Fig; beamwidth: Fig | null; pointingLoss: Fig; eirp: Fig;
    range: Fig; pathLoss: Fig; rxGain: Fig; received: Fig; n0: Fig; ptOverN0: Fig; requiredPtOverN0: Fig; margin: Fig;
    /** the highest rate at `LINK_MARGIN_THRESHOLD` */
    maxRate: Fig;
    /** the longest pass, straight overhead, and the data it brings down at the design's rate; null in the geostationary ring (always in view) */
    passMax: Fig | null; dataPerPass: Fig | null;
  };
  camera: null | {
    altitude: Fig; gsd: Fig; offNadir: Fig; offNadirAlong: Fig; offNadirCross: Fig;
    diffraction: Fig; limitedBy: 'aperture' | 'pixels';
    fov: Fig; swath: Fig | null;
    /** a push-broom's rate before compression; null in the geostationary ring, where the ground does not slide by */
    dataRate: Fig | null;
  };
}

// ─── the templates ──────────────────────────────────────────────────────────

/** Each template's name and description keys (literals, for tests/i18n.test.ts); the catalogue's classes keep their `sat.<id>.name`. */
export const TEMPLATE_TEXT: Readonly<Record<string, { name: string; about: string }>> = {
  napa2: { name: 'build.sat.tpl.napa2', about: 'build.sat.tpl.napa2.about' },
  theos2: { name: 'build.sat.tpl.theos2', about: 'build.sat.tpl.theos2.about' },
  earthObs: { name: 'sat.earthObs.name', about: 'build.sat.tpl.earthObs.about' },
  comsat: { name: 'sat.comsat.name', about: 'build.sat.tpl.comsat.about' },
  weather: { name: 'sat.weather.name', about: 'build.sat.tpl.weather.about' },
  navigation: { name: 'sat.navigation.name', about: 'build.sat.tpl.navigation.about' },
  science: { name: 'sat.science.name', about: 'build.sat.tpl.science.about' },
};

/**
 * An orbit preset (src/data/orbits.ts) as a design's orbit, placed as
 * `presetOrbit` places it (src/orbit/presets.ts): a sun-synchronous preset
 * keeps the flag and its local time (the inclination stored is J2's for the
 * size, which `designOrbit` works out again), a launch site's is due east
 * from Cape Canaveral, a fixed node keeps its right ascension.
 */
export function presetDesignOrbit(id: string): SatelliteDesign['orbit'] {
  const spec = ORBIT_PRESETS.find((o) => o.id === id);
  if (!spec) throw new Error(`Unknown orbit preset ${id}`);
  const sso = spec.inclination === 'sso';
  const orbit: SatelliteDesign['orbit'] = {
    perigee: spec.perigee, apogee: spec.apogee, sso,
    inclination: sso ? ssoInclinationDeg(spec.perigee, spec.apogee) ?? 90 : spec.inclination === 'site' ? SITE_INCLINATION_DEG : spec.inclination as number,
  };
  if (sso && spec.raanMode === 'ltan' && spec.ltan !== undefined) orbit.ltan = spec.ltan;
  if (!sso && spec.raanMode === 'fixed' && spec.raan !== undefined) orbit.raan = spec.raan;
  return orbit;
}

/** J2's sun-synchronous inclination for these apsides, deg, rounded to 0.001°; null where none exists. */
export function ssoInclinationDeg(perigee: number, apogee: number): number | null {
  const i = sunSynchronousInclination(apsidesToAE(perigee, apogee));
  return i === null ? null : Math.round((i / DEG) * 1000) / 1000;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** A new design from template `templateId`, with its own id and the name given. */
export function designFromTemplate(templateId: string, id: string, name: string): SatelliteDesign {
  const tpl = satelliteTemplateById(templateId);
  if (!tpl) throw new Error(`Unknown satellite template ${templateId}`);
  // a sun-synchronous orbit starts with J2's inclination for its size, as it is flown (the published figure to its printed precision)
  return syncOrbit({
    id, name, template: tpl.id, kind: tpl.kind,
    orbit: clone(tpl.orbit ?? presetDesignOrbit(tpl.typicalOrbit)),
    ...clone(tpl.design),
  });
}

/** A new design's id: unique enough in one browser, and not a template's. */
export const newSatelliteId = (): string => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ─── the fields a student edits ─────────────────────────────────────────────

/** How a field's number is shown, and its unit on screen. */
export type FieldUnit =
  | 'km' | 'deg' | 'h' | 'years' | 'kg' | 'm' | 'm2' | 'W' | 'Wh' | 'percent' | 'N' | 's' | 'ms'
  | 'kgm2' | 'Nms' | 'Am2' | 'GHz' | 'dB' | 'Mbps' | 'K' | 'um' | 'count' | 'bits' | 'plain';

/** Stored (SI, or the design's degrees, hours and Wh) × `SHOWN` is what the box shows. */
export const SHOWN: Readonly<Record<FieldUnit, number>> = {
  km: 1e-3, deg: 1, h: 1, years: 1, kg: 1, m: 1, m2: 1, W: 1, Wh: 1, percent: 100, N: 1, s: 1, ms: 1,
  kgm2: 1, Nms: 1, Am2: 1, GHz: 1e-9, dB: 1, Mbps: 1e-6, K: 1, um: 1e6, count: 1, bits: 1, plain: 1,
};

export type FieldGroup = 'orbit' | 'bus' | 'power' | 'propulsion' | 'adcs' | 'comms' | 'payload';

export interface SatelliteField {
  /** its path in the design, `power.arrayArea` */
  path: string;
  /** the label's dictionary key */
  key: string;
  group: FieldGroup;
  unit: FieldUnit;
  /** the checker's bounds, stored units (config/satellite-design.ts `SATELLITE_LIMITS`) */
  min: number;
  max: number;
  /** a step of the box's arrows and the decimals it shows, in the units shown */
  step: number;
  digits: number;
  /** shown at the Explore level too (the rest at the Engineer level's bench only) */
  explore?: true;
  integer?: true;
}

const L = SATELLITE_LIMITS;
const fld = (path: string, key: string, group: FieldGroup, unit: FieldUnit, [min, max]: readonly [number, number], step: number, digits: number,
  more: { explore?: true; integer?: true } = {}): SatelliteField => ({ path, key, group, unit, min, max, step, digits, ...more });

/**
 * Every number a design has, in the order the screen lists them, with the
 * checker's bounds. The keys are literals (tests/i18n.test.ts finds each one).
 */
export const SATELLITE_FIELDS: readonly SatelliteField[] = [
  fld('orbit.perigee', 'build.sat.f.perigee', 'orbit', 'km', L.perigee, 10, 0, { explore: true }),
  fld('orbit.apogee', 'build.sat.f.apogee', 'orbit', 'km', L.apogee, 10, 0, { explore: true }),
  fld('orbit.inclination', 'build.sat.f.inclination', 'orbit', 'deg', [0, 180], 0.1, 2, { explore: true }),
  fld('orbit.ltan', 'build.sat.f.ltan', 'orbit', 'h', [0, 24], 0.25, 2, { explore: true }),
  fld('orbit.raan', 'build.sat.f.raan', 'orbit', 'deg', [0, 360], 1, 1),
  fld('lifeYears', 'build.sat.f.life', 'orbit', 'years', L.lifeYears, 1, 1, { explore: true }),
  fld('bus.dryMass', 'build.sat.f.dryMass', 'bus', 'kg', L.dryMass, 1, 1, { explore: true }),
  fld('bus.size.width', 'build.sat.f.width', 'bus', 'm', L.edge, 0.1, 3),
  fld('bus.size.height', 'build.sat.f.height', 'bus', 'm', L.edge, 0.1, 3),
  fld('bus.size.depth', 'build.sat.f.depth', 'bus', 'm', L.edge, 0.1, 3),
  fld('bus.cd', 'build.sat.f.cd', 'bus', 'plain', L.cd, 0.1, 2),
  fld('bus.cr', 'build.sat.f.cr', 'bus', 'plain', L.cr, 0.1, 2),
  fld('power.payloadW', 'build.sat.f.payloadW', 'power', 'W', L.load, 1, 1, { explore: true }),
  fld('power.busW', 'build.sat.f.busW', 'power', 'W', L.load, 1, 1, { explore: true }),
  fld('power.arrayArea', 'build.sat.f.arrayArea', 'power', 'm2', L.arrayArea, 0.01, 3, { explore: true }),
  fld('power.cellEff', 'build.sat.f.cellEff', 'power', 'percent', L.cellEff, 0.5, 1),
  fld('power.Id', 'build.sat.f.Id', 'power', 'percent', L.Id, 1, 0),
  fld('power.degPerYear', 'build.sat.f.degPerYear', 'power', 'percent', L.degPerYear, 0.1, 2),
  fld('power.batteryWh', 'build.sat.f.batteryWh', 'power', 'Wh', L.batteryWh, 1, 0, { explore: true }),
  fld('power.dod', 'build.sat.f.dod', 'power', 'percent', L.dod, 1, 0),
  fld('power.batteryEff', 'build.sat.f.batteryEff', 'power', 'percent', L.batteryEff, 1, 0),
  fld('propulsion.thrust', 'build.sat.f.thrust', 'propulsion', 'N', L.thrust, 1, 2),
  fld('propulsion.isp', 'build.sat.f.isp', 'propulsion', 's', L.isp, 1, 0),
  fld('propulsion.propellant', 'build.sat.f.propellant', 'propulsion', 'kg', L.propellant, 1, 1, { explore: true }),
  fld('propulsion.insertionDv', 'build.sat.f.insertionDv', 'propulsion', 'ms', L.insertionDv, 10, 1),
  fld('adcs.pointingDeg', 'build.sat.f.pointing', 'adcs', 'deg', L.pointingDeg, 0.01, 3),
  fld('adcs.inertia.0', 'build.sat.f.inertiaX', 'adcs', 'kgm2', L.inertia, 1, 4),
  fld('adcs.inertia.1', 'build.sat.f.inertiaY', 'adcs', 'kgm2', L.inertia, 1, 4),
  fld('adcs.inertia.2', 'build.sat.f.inertiaZ', 'adcs', 'kgm2', L.inertia, 1, 4),
  fld('adcs.wheelH', 'build.sat.f.wheelH', 'adcs', 'Nms', L.wheelH, 0.01, 3),
  fld('adcs.residualDipole', 'build.sat.f.dipole', 'adcs', 'Am2', L.residualDipole, 0.01, 3),
  fld('adcs.cpOffset', 'build.sat.f.cpOffset', 'adcs', 'm', L.cpOffset, 0.01, 3),
  fld('comms.txPowerW', 'build.sat.f.txPower', 'comms', 'W', L.txPowerW, 0.5, 2, { explore: true }),
  fld('comms.frequency', 'build.sat.f.frequency', 'comms', 'GHz', L.frequency, 0.1, 3),
  fld('comms.txAntennaD', 'build.sat.f.txAntenna', 'comms', 'm', L.txAntennaD, 0.05, 2),
  fld('comms.lineLoss', 'build.sat.f.lineLoss', 'comms', 'dB', L.lineLoss, 0.1, 2),
  fld('comms.dataRate', 'build.sat.f.dataRate', 'comms', 'Mbps', L.dataRate, 1, 4, { explore: true }),
  fld('comms.requiredEbN0', 'build.sat.f.ebN0', 'comms', 'dB', L.requiredEbN0, 0.1, 2),
  fld('comms.minElDeg', 'build.sat.f.minEl', 'comms', 'deg', L.minElDeg, 1, 0),
  fld('comms.rxAntennaD', 'build.sat.f.rxAntenna', 'comms', 'm', L.rxAntennaD, 0.5, 2),
  fld('comms.rxNoiseK', 'build.sat.f.rxNoise', 'comms', 'K', L.rxNoiseK, 10, 1),
  fld('comms.losses', 'build.sat.f.losses', 'comms', 'dB', L.losses, 0.1, 2),
  fld('payload.focalLength', 'build.sat.f.focal', 'payload', 'm', L.focalLength, 0.01, 3, { explore: true }),
  fld('payload.pixelPitch', 'build.sat.f.pitch', 'payload', 'um', L.pixelPitch, 0.1, 2),
  fld('payload.pixels', 'build.sat.f.pixels', 'payload', 'count', L.pixels, 100, 0, { explore: true, integer: true }),
  fld('payload.aperture', 'build.sat.f.aperture', 'payload', 'm', L.aperture, 0.01, 3),
  fld('payload.bits', 'build.sat.f.bits', 'payload', 'bits', L.bits, 1, 0, { integer: true }),
];

export const fieldByPath = (path: string): SatelliteField | undefined => SATELLITE_FIELDS.find((x) => x.path === path);

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The value at `path` in a design (`adcs.inertia.1`), or undefined where there is none (no engine, no camera). */
export function valueAt(design: SatelliteDesign, path: string): unknown {
  let at: unknown = design;
  for (const part of path.split('.')) {
    if (at === null || typeof at !== 'object') return undefined;
    at = (at as Obj)[part];
  }
  return at;
}

/**
 * Set the number at `path` (stored units) in a copy of the design; an empty
 * box is NaN, which the checker refuses by name. An orbit that is
 * sun-synchronous keeps its stored inclination J2's for its size, as
 * `designOrbit` flies it.
 */
export function withValue(design: SatelliteDesign, path: string, value: number): SatelliteDesign {
  const next = clone(design);
  const parts = path.split('.');
  let at: Obj = next as unknown as Obj;
  for (const part of parts.slice(0, -1)) {
    const inner = at[part];
    if (!isObj(inner) && !Array.isArray(inner)) return design;
    at = inner as Obj;
  }
  at[parts[parts.length - 1]] = value;
  return syncOrbit(next);
}

/** A sun-synchronous design's stored inclination brought to J2's for its size (where one exists and the apsides are numbers). */
export function syncOrbit(design: SatelliteDesign): SatelliteDesign {
  const o = design.orbit;
  if (o.sso && Number.isFinite(o.perigee) && Number.isFinite(o.apogee) && o.apogee >= o.perigee && o.perigee > -R_EARTH) {
    const i = ssoInclinationDeg(o.perigee, o.apogee);
    if (i !== null) o.inclination = i;
  }
  return design;
}

/** A copy with the orbit sun-synchronous or not: on, the local time kept or 10:30 a.m. at the descending node; off, the node kept where it was. */
export function withSso(design: SatelliteDesign, sso: boolean): SatelliteDesign {
  const next = clone(design);
  next.orbit.sso = sso;
  if (sso && next.orbit.ltan === undefined) next.orbit.ltan = 22.5;
  if (sso) delete next.orbit.raan;
  else delete next.orbit.ltan;
  return syncOrbit(next);
}

/** A copy with an engine (the template's, else a small hydrazine one: estimates) or none. */
export function withEngine(design: SatelliteDesign, on: boolean): SatelliteDesign {
  const next = clone(design);
  if (!on) next.propulsion = null;
  else if (!next.propulsion) {
    const tpl = satelliteTemplateById(design.template)?.design.propulsion;
    next.propulsion = tpl ? clone(tpl) : { thrust: 1, isp: 223, propellant: Math.max(0.1, Math.round(design.bus.dryMass * 0.05 * 10) / 10) };
  }
  return next;
}

/** A copy with a camera (the template's, else O04's example: estimates) or none. */
export function withCamera(design: SatelliteDesign, on: boolean): SatelliteDesign {
  const next = clone(design);
  if (!on) next.payload = null;
  else if (!next.payload) {
    const tpl = satelliteTemplateById(design.template)?.design.payload;
    next.payload = tpl ? clone(tpl) : { focalLength: 16.1, pixelPitch: 13e-6, pixels: 20_600, aperture: 0.9, bits: 12 };
  }
  return next;
}

/** A copy with one of the design's choices (a menu, not a number) set. */
export function withChoice(design: SatelliteDesign, which: 'mount' | 'regulation' | 'mode' | 'station', value: string): SatelliteDesign {
  const next = clone(design);
  if (which === 'mount' && (value === 'tracking' || value === 'body' || value === 'spinner')) next.power.mount = value;
  else if (which === 'regulation' && (value === 'DET' || value === 'PPT')) next.power.regulation = value;
  else if (which === 'mode' && (value === 'gravityGradient' || value === 'spin' || value === 'threeAxis')) next.adcs.mode = value;
  else if (which === 'station' && STATIONS.some((s) => s.id === value)) next.comms.station = value;
  return next;
}

/**
 * Where a design's number comes from (Principle 4): the template's source,
 * unchanged (`sourced`, with the source's text); the template's figure with
 * no source, or one its sources give only for a class (`estimate`, with the
 * source where there is one); or the student's own (`yours`).
 */
export type FieldOrigin = { kind: 'sourced'; source: string } | { kind: 'estimate'; source?: string } | { kind: 'yours' };

export function fieldOrigin(design: SatelliteDesign, path: string): FieldOrigin {
  const tpl = satelliteTemplateById(design.template);
  if (!tpl) return { kind: 'yours' };
  const start = designFromTemplate(tpl.id, design.id, design.name);
  const now = valueAt(design, path), was = valueAt(start, path);
  // a sun-synchronous design's inclination follows its size: it is the template's as long as the flag is
  const same = typeof now === 'number' && typeof was === 'number' ? Math.abs(now - was) <= 1e-9 * Math.max(1, Math.abs(was)) : now === was;
  if (!same) return { kind: 'yours' };
  const source = tpl.sources[path];
  if (source === undefined) return { kind: 'estimate' };
  return tpl.estimates?.includes(path) ? { kind: 'estimate', source } : { kind: 'sourced', source };
}

// ─── the figures ────────────────────────────────────────────────────────────

/** How many revolutions `worstEclipseOf` keeps; a design changing its array does not walk the year again. */
const WORST_KEPT = 16;
const worstKept = new Map<string, ReturnType<typeof worstEclipse>>();

/**
 * The longest eclipse of the year from `jd` on the design's orbit
 * (`worstEclipse` over 365 days), kept per orbit and date: it walks a
 * revolution a day for a year, the one figure here that takes time.
 */
export function worstEclipseOf(o: Orbit, jd: number): ReturnType<typeof worstEclipse> {
  const key = JSON.stringify([o.a, o.e, o.i, o.raan, o.argp, o.m0, o.jd0, jd]);
  const hit = worstKept.get(key);
  if (hit) return hit;
  const w = worstEclipse(o, jd, 365);
  if (worstKept.size >= WORST_KEPT) worstKept.delete(worstKept.keys().next().value!);
  worstKept.set(key, w);
  return w;
}

/** Where the orbit lies, as IADC's protected regions divide it. */
export function orbitRegion(perigeeAlt: number, apogeeAlt: number, inclination: number): OrbitRegion {
  if (perigeeAlt >= GEO_ALTITUDE - GEO_RING.halfHeight && apogeeAlt <= GEO_ALTITUDE + GEO_RING.halfHeight && inclination <= GEO_RING.maxInclination) return 'geo';
  if (perigeeAlt < LEO_TOP) return 'leo';
  return 'other';
}

export interface FigureOptions {
  /** the ECSS level the air is read at (default moderate) */
  level?: EcssLevel;
}

/**
 * Every D06 figure of a design on Julian date `jd` (UTC), each with its unit.
 * The design must be sound (`satelliteDesignProblems` empty): this throws a
 * `RangeError` otherwise, as the cores do on figures they cannot take.
 */
export function designFigures(design: SatelliteDesign, jd: number, opts: FigureOptions = {}): SatelliteFigures {
  const issues = satelliteDesignProblems(design);
  if (issues.length) throw new RangeError(`not a sound design: ${issues[0].path} ${issues[0].message}`);
  const level = opts.level ?? DEFAULT_ACTIVITY_LEVEL;
  const o = designOrbit(design.orbit, jd);
  const facts = orbitFacts(o, true);
  const hP = facts.perigeeAlt, hA = facts.apogeeAlt, P = facts.nodalPeriod;
  const region = orbitRegion(hP, hA, o.i);
  const noSso = design.orbit.sso && ssoInclinationDeg(design.orbit.perigee, design.orbit.apogee) === null;

  // ── eclipse (A1): now, the year's worst, and SMAD's closed form at β = 0
  const beta = betaAngle(o, jd, true);
  const now = sampledEclipse(o, jd, P / 360);
  const worst = worstEclipseOf(o, jd);
  // SMAD's closed form is for a circle: read at the mean altitude where the orbit is nearly one (e < 0.005, NAPA-2's 520 × 540 km is 0.0015)
  const circular = o.e < 5e-3;
  const atBetaZero = circular ? eclipseDuration(o.a - R_EARTH, 0) : null;
  const cycles = worst.duration > 0 ? cyclesPerYear(P) : 0;

  // ── power (A1): sized for the longest eclipse, at the end of life
  const pw = design.power;
  const load = pw.payloadW + pw.busW;
  const Te = worst.duration, Td = P - Te;
  const { Xd, Xe } = PATH_EFFICIENCY[pw.regulation];
  const required = arrayPowerRequired({ dayLoad: load, eclipseLoad: load, Td, Te, Xd, Xe });
  const sunAngle = pw.mount === 'tracking' ? 0 : WORST_SUN_ANGLE;
  const sized = arrayArea({ Psa: required, flux: SOLAR_FLUX_1AU, cellEff: pw.cellEff, Id: pw.Id, sunAngle, degPerYear: pw.degPerYear, years: design.lifeYears, mount: pw.mount });
  // the design's cells give what the needed area gives, in proportion (area ∝ power in `arrayArea`)
  const eolPower = sized.area > 0 ? required * (pw.arrayArea / sized.area) : (pw.arrayArea * sized.pEol) / MOUNT_FACTOR[pw.mount];
  const margin = required > 0 ? pw.arrayArea / sized.area - 1 : null;
  const batteryNeeded = batteryCapacity({ eclipseLoad: load, Te, dod: pw.dod, eff: pw.batteryEff });
  const drawn = batteryCapacity({ eclipseLoad: load, Te, dod: 1, eff: pw.batteryEff });
  const depth = drawn === 0 ? 0 : pw.batteryWh > 0 ? drawn / (pw.batteryWh * 3600) : Infinity;

  // ── mass and drag area (A4)
  const wet = wetMass(design);
  const propellant = design.propulsion?.propellant ?? 0;
  const area = dragArea(design);
  const ballistic = ballisticCoefficient(design);

  // ── Δv (A4): held against drag or in the geostationary box, and left at the end
  const p = design.propulsion;
  const sc = lifetimeSpacecraft(design);
  const craft = p ? { mass: wet, propellant: p.propellant, isp: p.isp, thrust: p.thrust } : null;
  const makeup = p && region !== 'geo' ? dragMakeupPerYear(o, sc, levelActivity(level)) : 0;
  const nssk = p && region === 'geo' ? nsskPerYear(GEO_INCLINATION_DRIFT) : 0;
  const ewsk = p && region === 'geo' ? GEO_EWSK_PER_YEAR : 0;
  let plan: DisposalPlan, disposal = 0, rise: number | null = null;
  if (region === 'geo') {
    const g = graveyardRaise(design.bus.cr, area / design.bus.dryMass);
    rise = g.dh;
    plan = 'graveyard';
    disposal = p ? g.dv : 0;
  } else if (region === 'leo') {
    plan = p ? 'reentry' : 'decay';
    // at the apogee, the perigee from where it is down to Hull's 50 km: the difference of two lowerings from the circle there
    disposal = p ? perigeeLowerDv(hA, CONTROLLED_REENTRY_PERIGEE) - perigeeLowerDv(hA, hP) : 0;
  } else plan = 'none';
  const alloc = dvAllocation({ insertion: p?.insertionDv ?? 0, disposal, stationKeepingPerYear: makeup + nssk + ewsk, years: design.lifeYears }, craft);
  const propellantNeeded = p ? propellantFor(wet, alloc.required, p.isp) : null;

  // ── attitude (A2): worst-case disturbances, the hardware they size
  const ad = design.adcs;
  const rP = R_EARTH + hP;
  const iMax = Math.max(...ad.inertia), iMin = Math.min(...ad.inertia);
  const gg = gravityGradientTorque(rP, iMax, iMin, GG_SIZING_ANGLE);
  const { width, height, depth: dep } = design.bus.size;
  const sunlit = Math.max(width * height, width * dep, height * dep) + (pw.mount === 'tracking' ? pw.arrayArea : 0);
  const solar = solarTorque(SOLAR_FLUX_1AU, sunlit, SUNLIT_REFLECTANCE, 0, ad.cpOffset);
  const rho = perigeeDensity(o, level);
  const aero = aeroTorque(rho, design.bus.cd, area, facts.vPerigee, ad.cpOffset);
  const field = dipoleField(rP);
  const magnetic = magneticTorque(ad.residualDipole, field);
  const total = (ad.mode === 'gravityGradient' ? 0 : gg) + solar + aero + magnetic;
  const wheelNeeded = ad.mode === 'threeAxis' ? wheelMomentumCyclic(total, P) : null;
  const biasNeeded = ad.mode === 'spin' ? biasMomentum(total, P, ad.pointingDeg * DEG) : null;
  const sized2 = wheelNeeded ?? biasNeeded;
  const wheelMargin = sized2 !== null && sized2 > 0 ? ad.wheelH / sized2 : null;

  // ── link (A3): the downlink at the worst range, the longest pass
  const c = design.comms;
  const txGain = c.txAntennaD > 0 ? dishGain(c.txAntennaD, c.frequency, TX_DISH_EFFICIENCY) : 0;
  const beamwidth = c.txAntennaD > 0 ? beamwidthOf(c.frequency, c.txAntennaD) : null;
  const pLoss = beamwidth !== null ? pointingLoss(ad.pointingDeg * DEG, beamwidth) : 0;
  const e = eirp(c.txPowerW, c.lineLoss, txGain, pLoss);
  const range = slantRange(R_EARTH + hA, c.minElDeg * DEG);
  const rxD = c.rxAntennaD ?? RX_DEFAULTS.rxAntennaD;
  const rxGain = dishGain(rxD, c.frequency, RX_DISH_EFFICIENCY);
  const table = designControlTable({
    eirp: e, frequency: c.frequency, range, rxGain, systemTemperature: c.rxNoiseK ?? RX_DEFAULTS.rxNoiseK,
    losses: c.losses ?? RX_DEFAULTS.losses, dataRate: c.dataRate, requiredEbN0: c.requiredEbN0, implementationLoss: 0,
  });
  const maxRate = maxDataRate(table.ptOverN0, c.requiredEbN0, LINK_MARGIN_THRESHOLD);
  const passMax = region === 'geo' ? null : maxPassDuration(P, footprintAngle(o.a, c.minElDeg * DEG));

  // ── camera (A3)
  let camera: SatelliteFigures['camera'] = null;
  const cam = design.payload;
  if (cam) {
    const gsd = offNadirGsd(hP, cam.pixelPitch, cam.focalLength, 0).along;
    const off = offNadirGsd(hP, cam.pixelPitch, cam.focalLength, OFF_NADIR_ANGLE);
    const diffraction = diffractionGsd(hP, cam.aperture, DIFFRACTION_WAVELENGTH);
    const fov = 2 * Math.atan((cam.pixels * cam.pixelPitch) / (2 * cam.focalLength));
    const swath = swathWidth(hP, fov);
    camera = {
      altitude: f(hP, 'm'), gsd: f(gsd, 'm'), offNadir: f(OFF_NADIR_ANGLE, 'rad'), offNadirAlong: f(off.along, 'm'), offNadirCross: f(off.cross, 'm'),
      diffraction: f(diffraction, 'm'), limitedBy: diffraction > gsd ? 'aperture' : 'pixels',
      fov: f(fov, 'rad'), swath: swath === null ? null : f(swath, 'm'),
      dataRate: region === 'geo' ? null : f(imagingDataRate(cam.pixels, cam.bits, gsd, hP), 'bit/s'),
    };
  }

  return {
    jd, level,
    orbit: {
      perigee: f(hP, 'm'), apogee: f(hA, 'm'), inclination: f(o.i, 'rad'), semiMajorAxis: f(o.a, 'm'), eccentricity: f(o.e, 'count'),
      period: f(facts.period, 's'), nodalPeriod: f(P, 's'), revsPerDay: f(facts.revsPerDay, 'per-day'), region, noSso,
    },
    eclipse: {
      beta: f(beta, 'rad'), now: f(now.duration, 's'), nowFraction: f(now.fraction, 'fraction'),
      worst: f(worst.duration, 's'), worstFraction: f(worst.fraction, 'fraction'), worstBeta: f(worst.beta, 'rad'), worstJd: worst.jd,
      atBetaZero: atBetaZero === null ? null : f(atBetaZero, 's'), cyclesPerYear: f(cycles, 'per-year'),
    },
    power: {
      load: f(load, 'W'), daylight: f(Td, 's'), eclipse: f(Te, 's'), Xd: f(Xd, 'fraction'), Xe: f(Xe, 'fraction'),
      required: f(required, 'W'), flux: f(SOLAR_FLUX_1AU, 'W/m2'), sunAngle: f(sunAngle, 'rad'),
      pBol: f(sized.pBol, 'W/m2'), pEol: f(sized.pEol, 'W/m2'), lifeFactor: f(sized.lifeFactor, 'fraction'),
      areaNeeded: f(sized.area, 'm2'), area: f(pw.arrayArea, 'm2'), eolPower: f(eolPower, 'W'), margin: margin === null ? null : f(margin, 'fraction'),
      batteryNeeded: f(batteryNeeded, 'J'), battery: f(pw.batteryWh * 3600, 'J'), depth: f(depth, 'fraction'),
    },
    mass: { dry: f(design.bus.dryMass, 'kg'), propellant: f(propellant, 'kg'), wet: f(wet, 'kg') },
    drag: { area: f(area, 'm2'), ballistic: f(ballistic, 'm2/kg'), problem: ballisticProblem(ballistic) },
    dv: {
      plan, engine: !!p,
      insertion: f(alloc.insertion, 'm/s'), dragMakeupPerYear: f(makeup, 'm/s/yr'), nsskPerYear: f(nssk, 'm/s/yr'), ewskPerYear: f(ewsk, 'm/s/yr'),
      stationKeepingPerYear: f(alloc.stationKeepingPerYear, 'm/s/yr'), stationKeeping: f(alloc.stationKeeping, 'm/s'),
      disposal: f(alloc.disposal, 'm/s'), required: f(alloc.required, 'm/s'), available: f(alloc.available, 'm/s'), margin: f(alloc.margin, 'm/s'),
      propellantNeeded: propellantNeeded === null ? null : f(propellantNeeded, 'kg'), graveyardRise: rise === null ? null : f(rise, 'm'),
    },
    attitude: {
      radius: f(rP, 'm'), density: f(rho, 'kg/m3'), field: f(field, 'T'),
      gravityGradient: f(gg, 'N·m'), solar: f(solar, 'N·m'), aero: f(aero, 'N·m'), magnetic: f(magnetic, 'N·m'), total: f(total, 'N·m'),
      wheelNeeded: wheelNeeded === null ? null : f(wheelNeeded, 'N·m·s'), biasNeeded: biasNeeded === null ? null : f(biasNeeded, 'N·m·s'),
      torquerDipole: f(torquerDipole(total, field), 'A·m2'), wheelMargin: wheelMargin === null ? null : f(wheelMargin, 'ratio'),
    },
    link: {
      txGain: f(txGain, 'dBi'), beamwidth: beamwidth === null ? null : f(beamwidth, 'rad'), pointingLoss: f(pLoss, 'dB'), eirp: f(e, 'dBW'),
      range: f(range, 'm'), pathLoss: f(table.pathLoss, 'dB'), rxGain: f(rxGain, 'dBi'), received: f(table.received, 'dBW'), n0: f(table.n0, 'dBW/Hz'),
      ptOverN0: f(table.ptOverN0, 'dB-Hz'), requiredPtOverN0: f(table.requiredPtOverN0, 'dB-Hz'), margin: f(table.margin, 'dB'),
      maxRate: f(maxRate, 'bit/s'), passMax: passMax === null ? null : f(passMax, 's'), dataPerPass: passMax === null ? null : f(passMax * c.dataRate, 'bit'),
    },
    camera,
  };
}

// ─── what the builder says ──────────────────────────────────────────────────

/** A sentence's number, a word to translate, or a word that is data. */
export type SatValue = Fig | { key: string } | string;

export type SatLevel = 'fail' | 'warn' | 'note';

/** A sentence as a key and its numbers (src/design/warning-text.ts's pattern): the screen says it (src/ui/build/satellite-text.ts). */
export interface SatText {
  key: string;
  level: SatLevel;
  values: Record<string, SatValue>;
  /** a technical detail shown as it is, not translated: the checker's path and message */
  detail?: string;
}

/**
 * What is wrong with a design that the checker refuses, as sentences: the
 * field's name where it has one, and the checker's own words as detail.
 */
export function problemTexts(issues: readonly SatelliteDesignIssue[]): SatText[] {
  return issues.slice(0, 6).map((i): SatText => {
    const field = fieldByPath(i.path.replace(/\[(\d+)\]/g, '.$1'));
    return field
      ? { key: 'build.sat.warn.field', level: 'fail', values: { field: { key: field.key } }, detail: `${i.path} ${i.message}` }
      : { key: 'build.sat.warn.invalid', level: 'fail', values: {}, detail: i.path ? `${i.path} ${i.message}` : i.message };
  });
}

/**
 * What the figures say is wrong or thin, as sentences: will not work
 * (`fail`), may work but something is short (`warn`). The notes on what is
 * an estimate are `estimateTexts`.
 */
export function satelliteChecks(design: SatelliteDesign, fig: SatelliteFigures): SatText[] {
  const out: SatText[] = [];
  const fl = (value: number, unit: FigUnit): Fig => ({ value, unit });
  if (fig.orbit.perigee.value < 200e3) out.push({ key: 'build.sat.warn.lowPerigee', level: 'warn', values: { h: fig.orbit.perigee } });
  if (fig.orbit.noSso) out.push({ key: 'build.sat.warn.noSso', level: 'warn', values: { i: fl(design.orbit.inclination * DEG, 'rad') } });
  const pw = fig.power;
  if (pw.margin !== null && pw.margin.value < 0) {
    out.push({ key: 'build.sat.warn.power', level: 'fail', values: { have: pw.eolPower, need: pw.required, area: pw.areaNeeded } });
  }
  if (pw.depth.value > 1) out.push({ key: 'build.sat.warn.battery', level: 'fail', values: { need: pw.batteryNeeded, have: pw.battery } });
  else if (pw.depth.value > design.power.dod + 1e-9) {
    out.push({ key: 'build.sat.warn.batteryDeep', level: 'warn', values: { depth: pw.depth, dod: fl(design.power.dod, 'fraction'), need: pw.batteryNeeded } });
  }
  const dv = fig.dv;
  if (dv.engine && dv.margin.value < 0) {
    out.push({ key: 'build.sat.warn.dv', level: 'warn', values: { available: dv.available, required: dv.required, short: fl(-dv.margin.value, 'm/s') } });
  }
  if (!dv.engine && fig.orbit.region === 'geo') out.push({ key: 'build.sat.warn.geoNoEngine', level: 'warn', values: { dh: dv.graveyardRise! } });
  const ln = fig.link;
  if (ln.margin.value < LINK_MARGIN_THRESHOLD) {
    out.push({
      key: ln.margin.value < 0 ? 'build.sat.warn.linkNone' : 'build.sat.warn.linkThin', level: ln.margin.value < 0 ? 'fail' : 'warn',
      values: { margin: ln.margin, rate: fl(design.comms.dataRate, 'bit/s'), floor: fl(LINK_MARGIN_THRESHOLD, 'dB'), max: ln.maxRate },
    });
  }
  const at = fig.attitude;
  if (at.wheelMargin !== null && at.wheelMargin.value < 1) {
    out.push({ key: 'build.sat.warn.wheel', level: 'warn', values: { have: fl(design.adcs.wheelH, 'N·m·s'), need: (at.wheelNeeded ?? at.biasNeeded)! } });
  }
  if (fig.drag.problem) {
    out.push({ key: fig.drag.problem === 'low' ? 'build.sat.warn.ballisticLow' : 'build.sat.warn.ballisticHigh', level: 'warn', values: { b: fig.drag.ballistic } });
  }
  const cam = fig.camera;
  if (cam && design.payload) {
    if (cam.limitedBy === 'aperture') {
      out.push({ key: 'build.sat.warn.aperture', level: 'warn', values: { d: fl(design.payload.aperture, 'm'), diff: cam.diffraction, gsd: cam.gsd } });
    }
    if (cam.swath === null) out.push({ key: 'build.sat.warn.swathHorizon', level: 'warn', values: {} });
    if (cam.dataRate && cam.dataRate.value > design.comms.dataRate) {
      // what imaging satellites do: pictures wait on board for a pass (a note, not a fault)
      out.push({ key: 'build.sat.warn.cameraRate', level: 'note', values: { camera: cam.dataRate, link: fl(design.comms.dataRate, 'bit/s') } });
    }
  }
  return out;
}

/**
 * What in the figures is an estimate or a simplification, said so they are
 * not taken for data (Principle 4). The drag area's line says the same area
 * drives sunlight pressure (map risk R8).
 */
export function estimateTexts(design: SatelliteDesign, fig: SatelliteFigures): SatText[] {
  const out: SatText[] = [
    { key: 'build.sat.est.dragArea', level: 'note', values: { area: fig.drag.area, b: fig.drag.ballistic } },
    { key: 'build.sat.est.power', level: 'note', values: {} },
    { key: 'build.sat.est.torques', level: 'note', values: { level: { key: LEVEL_KEY[fig.level] } } },
    { key: 'build.sat.est.link', level: 'note', values: {} },
  ];
  if (fig.eclipse.cyclesPerYear.value > 0) out.push({ key: 'build.sat.est.cycles', level: 'note', values: { n: fig.eclipse.cyclesPerYear } });
  if (!fig.dv.engine && fig.orbit.region === 'leo') out.push({ key: 'build.sat.est.noEngine', level: 'note', values: {} });
  if (fig.dv.plan === 'reentry') out.push({ key: 'build.sat.est.reentry', level: 'note', values: {} });
  if (fig.orbit.region === 'geo' && fig.dv.engine) out.push({ key: 'build.sat.est.geoKeeping', level: 'note', values: {} });
  if (design.payload) out.push({ key: 'build.sat.est.camera', level: 'note', values: {} });
  if (fig.orbit.eccentricity.value >= 5e-3) out.push({ key: 'build.sat.est.eccentric', level: 'note', values: {} });
  return out;
}

/** The ECSS levels' names (literals). */
export const LEVEL_KEY: Readonly<Record<EcssLevel, string>> = { low: 'life.activity.low', moderate: 'life.activity.moderate', high: 'life.activity.high' };

// ─── the hand-off to the Orbit section ──────────────────────────────────────

/**
 * The design, in its orbit on `jd`, as the S03 hand-off the Orbit section
 * takes (C1's `handoffFromDesign`), with the drag area this builder shows
 * (`satelliteAreaCore.dragArea`): the lifetime analysis there flies the
 * design's mass, area, C_D and C_R. Null for a design the checker refuses or
 * the hand-off would not read back.
 */
export function designHandoff(design: SatelliteDesign, jd: number, label: string): OrbitHandoff | null {
  if (satelliteDesignProblems(design).length) return null;
  return handoffFromDesign(design, { jd, dragArea: satelliteAreaCore.dragArea, label });
}

// ─── the draft a browser keeps ──────────────────────────────────────────────

/** Where the Explore level's satellite designer keeps its draft (src/ui/build/satellite-level.ts). */
export const SATELLITE_DRAFT_KEY = 'orbitlab.build.satellite.v1';
const DRAFT_VERSION = 1;

/** The design on screen, the saved record it belongs to, and the default name it was given (so a language switch can give it again). */
export interface SatelliteDraft {
  design: SatelliteDesign;
  recordId: string | null;
  defaultName: string;
}

/** The first draft: NAPA-2, a Thai design small enough to change by hand. */
export const FIRST_TEMPLATE = 'napa2';

export function keptSatelliteText(d: SatelliteDraft): string {
  return JSON.stringify({ v: DRAFT_VERSION, ...d });
}

/** Numbers JSON keeps as null (an empty box, NaN), put back as NaN so the checker names them. */
function nullsToNaN(v: unknown): unknown {
  if (v === null) return Number.NaN;
  if (Array.isArray(v)) return v.map(nullsToNaN);
  if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'propulsion' || k === 'payload' ? (x === null ? null : nullsToNaN(x)) : nullsToNaN(x)]));
  return v;
}

/**
 * The draft a browser kept (`keptSatelliteText`), or null when there is none
 * or it cannot be taken: another version's, a shape this version does not
 * know, a template it no longer has. A draft with a box left empty or a
 * number out of bounds is taken as it is — that is where the student left
 * it, and the checker says what is wrong.
 */
export function restoreKeptSatellite(text: string | null): SatelliteDraft | null {
  if (!text) return null;
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return null; }
  if (!isObj(raw) || raw.v !== DRAFT_VERSION || !isObj(raw.design) || typeof raw.defaultName !== 'string') return null;
  if (raw.recordId !== null && typeof raw.recordId !== 'string') return null;
  const design = nullsToNaN(raw.design) as SatelliteDesign;
  if (!satelliteTemplateById(String(design.template))) return null;
  const structural = satelliteDesignProblems(design).filter((i) => !/^must be (a finite number|at least|at most|above|a whole number)|^must not be below|^with the dry mass/.test(i.message));
  if (structural.length) return null;
  return { design, recordId: raw.recordId, defaultName: raw.defaultName };
}

/** The templates, for a picker: id, kind and the name key. */
export function templateEntries(): { id: string; kind: SatelliteKind; nameKey: string; aboutKey: string }[] {
  return SATELLITE_TEMPLATES.map((t: SatelliteTemplate) => ({ id: t.id, kind: t.kind, nameKey: TEMPLATE_TEXT[t.id].name, aboutKey: TEMPLATE_TEXT[t.id].about }));
}
