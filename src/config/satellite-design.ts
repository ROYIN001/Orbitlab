/**
 * A designed satellite, checked before anything reads it (roadmap D06,
 * docs/ROADMAP-PART2-3.md; Phase 4 map §2.3, track B).
 *
 * A `SatelliteDesign` (src/design/satellite-spec.ts) comes from the builder,
 * from a design file a student imports, and — once Launch carries a designed
 * satellite inline (map §2.6 c, Option B) — from a mission file. The
 * satellite model trusts one the way the flight trusts a checked
 * `VehicleSpec`, so everything a file could get wrong is caught here, as
 * src/config/vehicle-spec.ts catches it for a rocket: the wrong type, NaN and
 * Infinity, figures outside what any satellite has, an unknown kind, station,
 * mount or mode, and fields this version does not know. Each problem names
 * its path in the design, so a file can be fixed from the message alone.
 *
 * The bounds are PLAUSIBILITY bounds, not capability: they take in every
 * template (src/data/satellite-templates.ts) with room to spare — a 10 kg
 * CubeSat and a 5.5 t geostationary bus, 0.1 W and 20 kW — and reject a typo
 * or a unit slip: a cell efficiency of 29.5 where 0.295 was meant, a
 * frequency in GHz where Hz was meant, a perigee typed in km. A sound design
 * may still not work — its battery too small, its link without margin — and
 * that is the satellite model's to say (`satelliteChecks`), in words.
 *
 * The perigee's floor is the S03 hand-off's own (100 km, src/orbit/handoff.ts),
 * and like the hand-off's it is exclusive — `parseHandoff` takes only a
 * perigee above it — so every sound design can be handed to the Orbit
 * section (a perigee of exactly 100 km is refused here by name, not
 * turned away there without a reason); the engine's are
 * the planner's `CRAFT_LIMITS` (src/orbit/budget.ts), so every sound design's
 * engine is one the planner flies.
 *
 * AND WHAT LAUNCH TAKES (the integration of D06 with Launch, Phase 4 map
 * §2.6 c): a design flies in Launch as a `SatelliteSpec`
 * (src/design/satellite-launch.ts), held to src/config/satellite-spec.ts,
 * so the bounds a design and a spec share are one bound, read from there —
 * the dry mass's floor is the spec's 1 kg (the payload field's own, which
 * a wet mass of dry and propellant then clears), an edge is no wider than a
 * spec's width, and the tanks are no larger a share of the whole than a
 * spec's `propellantFraction` (tests/d06-satellite-design.test.ts ties
 * each to the spec's). What a spec does not share stays the design's: an
 * electric engine's Isp above the 480 s of a chemical one, which the design
 * keeps for the planner and Launch flies without (said on screen), and a
 * C_D·A/m outside `B_RANGE`, which the builder warns of and Launch refuses.
 *
 * Units as the design stores them (src/design/satellite-spec.ts): SI, with
 * angles in degrees, local times in hours and the battery in Wh. DOM-free,
 * tests/d06-satellite-design.test.ts.
 */
import type { SatelliteKind } from '../types';
import type { SatelliteDesign } from '../design/satellite-spec';
import { CRAFT_LIMITS } from '../orbit/budget';
import { STATIONS } from '../orbit/applications-setup';
import { SATELLITE_LIMITS as SPEC_LIMITS } from './satellite-spec';

export interface SatelliteDesignIssue {
  /** where in the design, `power.cellEff` */
  path: string;
  message: string;
}

/**
 * Every kind a design may have: the catalogue's, the ones the S03 hand-off
 * carries — the eight classes and C01's historical spacecraft (a record, so
 * tsc keeps it whole).
 */
const KINDS: Readonly<Record<SatelliteKind, true>> = {
  comsat: true, earthObs: true, weather: true, navigation: true, science: true, cubesats: true, starlink: true, crew: true,
  crewDragon: true, ps1: true, vostok: true, mercury: true, apollo: true,
};
export const SATELLITE_DESIGN_KINDS = Object.keys(KINDS) as SatelliteKind[];

/**
 * The bounds the checks below hold a design to, by name, so the builder's
 * number boxes can offer the same range the checker allows.
 */
export const SATELLITE_LIMITS = {
  /** m: the hand-off's floor, and past the Moon's distance nothing is an Earth satellite of this app */
  perigee: [100e3, 400_000e3],
  apogee: [100e3, 400_000e3],
  /** years */
  lifeYears: [0.1, 30],
  /** kg: at least what a satellite in Launch weighs (the spec's floor, the payload field's own 1 kg) */
  dryMass: [SPEC_LIMITS.minMass, 20_000],
  /** m, each edge: no wider than a satellite in Launch may be across (the spec's, the fairing bound of vehicle-spec.ts) */
  edge: [0.01, SPEC_LIMITS.width],
  cd: [1, 4],
  cr: [1, 2],
  /** W, each */
  load: [0, 50_000],
  /** m² */
  arrayArea: [0, 500],
  cellEff: [0.01, 0.5],
  Id: [0.1, 1],
  degPerYear: [0, 0.2],
  /** Wh */
  batteryWh: [0, 1e6],
  dod: [0.01, 1],
  batteryEff: [0.1, 1],
  /** the planner's engine (budget.ts `CRAFT_LIMITS`) */
  thrust: [CRAFT_LIMITS.thrust.min, CRAFT_LIMITS.thrust.max],
  isp: [CRAFT_LIMITS.isp.min, CRAFT_LIMITS.isp.max],
  propellant: [0, CRAFT_LIMITS.propellant.max],
  /** the propellant's share of the wet mass at most: a spec's (more is a slip, not a satellite) */
  propellantFraction: SPEC_LIMITS.propellantFraction,
  insertionDv: [0, 10_000],
  /** kg·m², each principal moment */
  inertia: [1e-5, 1e7],
  pointingDeg: [0.0001, 180],
  wheelH: [0, 10_000],
  residualDipole: [0, 1000],
  /** m, signed */
  cpOffset: [-10, 10],
  txPowerW: [0.001, 10_000],
  /** Hz: VHF to Ka band and beyond */
  frequency: [30e6, 100e9],
  /** m; 0 is an antenna of no size, taken as isotropic */
  txAntennaD: [0, 20],
  lineLoss: [0, 20],
  /** bit/s */
  dataRate: [1, 1e11],
  requiredEbN0: [-5, 30],
  minElDeg: [0, 89],
  rxAntennaD: [0.1, 100],
  rxNoiseK: [1, 5000],
  losses: [0, 30],
  /** m */
  focalLength: [0.001, 100],
  pixelPitch: [0.1e-6, 1e-3],
  pixels: [1, 1e6],
  aperture: [0.001, 20],
  bits: [1, 32],
  /** m: ultraviolet to thermal infrared, 0.1 to 20 µm (a wavelength typed in nm or µm is a slip) */
  wavelength: [0.1e-6, 20e-6],
} as const satisfies Record<string, readonly [number, number] | number>;

type Obj = Record<string, unknown>;
type Bound = readonly [number, number];
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const describe = (v: unknown): string => (typeof v === 'number' ? String(v) : v === null ? 'null' : Array.isArray(v) ? 'an array' : typeof v);
const join = (path: string, key: string): string => `${path}${path ? '.' : ''}${key}`;

/** What an issue says of a field this version does not know (D-22), in the vehicle check's words. */
export const NOT_A_FIELD = 'is not a field of this version';

class Checker {
  readonly issues: SatelliteDesignIssue[] = [];

  add(path: string, message: string): void {
    this.issues.push({ path, message });
  }

  /** Fields the version knows; anything else is reported (a field it does not know could change what the design is). */
  known(o: Obj, path: string, fields: readonly string[]): void {
    for (const key of Object.keys(o)) if (!fields.includes(key)) this.add(join(path, key), NOT_A_FIELD);
  }

  number(o: Obj, key: string, path: string, [min, max]: Bound, opts: { optional?: boolean; integer?: boolean } = {}): number | undefined {
    const v = o[key], at = join(path, key);
    if (v === undefined) {
      if (!opts.optional) this.add(at, 'is required');
      return undefined;
    }
    if (typeof v !== 'number' || !Number.isFinite(v)) { this.add(at, `must be a finite number (got ${describe(v)})`); return undefined; }
    if (opts.integer && !Number.isInteger(v)) this.add(at, `must be a whole number (got ${v})`);
    if (v < min) this.add(at, `must be at least ${min} (got ${v})`);
    else if (v > max) this.add(at, `must be at most ${max} (got ${v})`);
    return v;
  }

  string(o: Obj, key: string, path: string, max = 80): string | undefined {
    const v = o[key], at = join(path, key);
    if (v === undefined) { this.add(at, 'is required'); return undefined; }
    if (typeof v !== 'string') { this.add(at, `must be text (got ${describe(v)})`); return undefined; }
    if (!v.trim()) this.add(at, 'must not be empty');
    else if (v.length > max) this.add(at, `must be at most ${max} characters`);
    return v;
  }

  oneOf(o: Obj, key: string, path: string, values: readonly string[]): void {
    const v = o[key];
    if (typeof v !== 'string' || !values.includes(v)) this.add(join(path, key), `must be one of ${values.map((x) => `"${x}"`).join(', ')} (got ${JSON.stringify(v) ?? 'nothing'})`);
  }

  object(o: Obj, key: string, path: string, what: string): Obj | undefined {
    const v = o[key];
    if (!isObj(v)) { this.add(join(path, key), `must be ${what} (got ${describe(v)})`); return undefined; }
    return v;
  }
}

const L = SATELLITE_LIMITS;
const DESIGN_FIELDS = ['id', 'name', 'template', 'kind', 'orbit', 'lifeYears', 'bus', 'power', 'propulsion', 'adcs', 'comms', 'payload', 'sources'];
const ORBIT_FIELDS = ['perigee', 'apogee', 'inclination', 'sso', 'ltan', 'raan'];
const BUS_FIELDS = ['dryMass', 'size', 'cd', 'cr'];
const POWER_FIELDS = ['payloadW', 'busW', 'arrayArea', 'cellEff', 'Id', 'degPerYear', 'mount', 'regulation', 'batteryWh', 'dod', 'batteryEff'];
const PROPULSION_FIELDS = ['thrust', 'isp', 'propellant', 'insertionDv'];
const ADCS_FIELDS = ['mode', 'inertia', 'pointingDeg', 'wheelH', 'residualDipole', 'cpOffset'];
const COMMS_FIELDS = ['txPowerW', 'frequency', 'txAntennaD', 'lineLoss', 'dataRate', 'requiredEbN0', 'station', 'minElDeg', 'rxAntennaD', 'rxNoiseK', 'losses'];
const PAYLOAD_FIELDS = ['focalLength', 'pixelPitch', 'pixels', 'aperture', 'bits', 'wavelength'];

function checkOrbit(c: Checker, o: Obj): void {
  c.known(o, 'orbit', ORBIT_FIELDS);
  const pe = c.number(o, 'perigee', 'orbit', L.perigee);
  // the hand-off's floor is exclusive (`parseHandoff`: above 100 km), so at the floor itself the design could not be handed on
  if (pe === L.perigee[0]) c.add('orbit.perigee', `must be above ${L.perigee[0]} (got ${pe})`);
  const ap = c.number(o, 'apogee', 'orbit', L.apogee);
  if (pe !== undefined && ap !== undefined && ap < pe) c.add('orbit.apogee', `must not be below the perigee (${ap} < ${pe})`);
  c.number(o, 'inclination', 'orbit', [0, 180]);
  if (typeof o.sso !== 'boolean') c.add('orbit.sso', `must be true or false (got ${describe(o.sso)})`);
  c.number(o, 'ltan', 'orbit', [0, 24], { optional: true });
  c.number(o, 'raan', 'orbit', [0, 360], { optional: true });
}

function checkPower(c: Checker, p: Obj): void {
  c.known(p, 'power', POWER_FIELDS);
  c.number(p, 'payloadW', 'power', L.load);
  c.number(p, 'busW', 'power', L.load);
  c.number(p, 'arrayArea', 'power', L.arrayArea);
  c.number(p, 'cellEff', 'power', L.cellEff);
  c.number(p, 'Id', 'power', L.Id);
  c.number(p, 'degPerYear', 'power', L.degPerYear);
  c.oneOf(p, 'mount', 'power', ['tracking', 'body', 'spinner']);
  c.oneOf(p, 'regulation', 'power', ['DET', 'PPT']);
  c.number(p, 'batteryWh', 'power', L.batteryWh);
  c.number(p, 'dod', 'power', L.dod);
  c.number(p, 'batteryEff', 'power', L.batteryEff);
}

function checkAdcs(c: Checker, a: Obj): void {
  c.known(a, 'adcs', ADCS_FIELDS);
  c.oneOf(a, 'mode', 'adcs', ['gravityGradient', 'spin', 'threeAxis']);
  if (!Array.isArray(a.inertia) || a.inertia.length !== 3) c.add('adcs.inertia', `must be the three principal moments of inertia (got ${describe(a.inertia)})`);
  else a.inertia.forEach((_, i) => c.number(a.inertia as unknown as Obj, String(i), 'adcs.inertia', L.inertia));
  c.number(a, 'pointingDeg', 'adcs', L.pointingDeg);
  c.number(a, 'wheelH', 'adcs', L.wheelH);
  c.number(a, 'residualDipole', 'adcs', L.residualDipole);
  c.number(a, 'cpOffset', 'adcs', L.cpOffset);
}

function checkComms(c: Checker, m: Obj): void {
  c.known(m, 'comms', COMMS_FIELDS);
  c.number(m, 'txPowerW', 'comms', L.txPowerW);
  c.number(m, 'frequency', 'comms', L.frequency);
  c.number(m, 'txAntennaD', 'comms', L.txAntennaD);
  c.number(m, 'lineLoss', 'comms', L.lineLoss);
  c.number(m, 'dataRate', 'comms', L.dataRate);
  c.number(m, 'requiredEbN0', 'comms', L.requiredEbN0);
  c.oneOf(m, 'station', 'comms', STATIONS.map((s) => s.id));
  c.number(m, 'minElDeg', 'comms', L.minElDeg);
  c.number(m, 'rxAntennaD', 'comms', L.rxAntennaD, { optional: true });
  c.number(m, 'rxNoiseK', 'comms', L.rxNoiseK, { optional: true });
  c.number(m, 'losses', 'comms', L.losses, { optional: true });
}

/**
 * Everything wrong with a designed satellite, or an empty list. `raw` is
 * whatever a file held; nothing is assumed about it.
 */
export function satelliteDesignProblems(raw: unknown): SatelliteDesignIssue[] {
  const c = new Checker();
  if (!isObj(raw)) { c.add('', `must be a satellite design (got ${describe(raw)})`); return c.issues; }
  c.known(raw, '', DESIGN_FIELDS);
  c.string(raw, 'id', '');
  c.string(raw, 'name', '');
  c.string(raw, 'template', '', 40);
  if (typeof raw.kind !== 'string' || !Object.hasOwn(KINDS, raw.kind)) c.add('kind', `must be one of the catalogue's kinds (got ${JSON.stringify(raw.kind) ?? 'nothing'})`);
  const orbit = c.object(raw, 'orbit', '', 'an orbit');
  if (orbit) checkOrbit(c, orbit);
  c.number(raw, 'lifeYears', '', L.lifeYears);

  const bus = c.object(raw, 'bus', '', 'a bus');
  if (bus) {
    c.known(bus, 'bus', BUS_FIELDS);
    c.number(bus, 'dryMass', 'bus', L.dryMass);
    const size = c.object(bus, 'size', 'bus', 'the three edges of the body');
    if (size) {
      c.known(size, 'bus.size', ['width', 'height', 'depth']);
      for (const k of ['width', 'height', 'depth']) c.number(size, k, 'bus.size', L.edge);
    }
    c.number(bus, 'cd', 'bus', L.cd);
    c.number(bus, 'cr', 'bus', L.cr);
  }
  const power = c.object(raw, 'power', '', 'a power system');
  if (power) checkPower(c, power);

  if (raw.propulsion !== null) {
    const p = c.object(raw, 'propulsion', '', 'an engine, or null for a satellite without one');
    if (p) {
      c.known(p, 'propulsion', PROPULSION_FIELDS);
      c.number(p, 'thrust', 'propulsion', L.thrust);
      c.number(p, 'isp', 'propulsion', L.isp);
      const prop = c.number(p, 'propellant', 'propulsion', L.propellant);
      c.number(p, 'insertionDv', 'propulsion', L.insertionDv, { optional: true });
      // the planner's own rule (budget.ts `maxPropellant`): the tanks are part of the satellite, never all of it
      const dry = bus && typeof bus.dryMass === 'number' ? bus.dryMass : undefined;
      if (prop !== undefined && dry !== undefined && Number.isFinite(dry) && dry > 0) {
        if (prop + dry > CRAFT_LIMITS.mass.max) c.add('propulsion.propellant', `with the dry mass comes to more than the ${CRAFT_LIMITS.mass.max} kg the planner flies`);
        else if (prop / (prop + dry) > L.propellantFraction) c.add('propulsion.propellant', `with the dry mass is more than ${L.propellantFraction * 100} % of the satellite (got ${Number(((100 * prop) / (prop + dry)).toPrecision(4))} %)`);
      }
    }
  }

  const adcs = c.object(raw, 'adcs', '', 'an attitude control system');
  if (adcs) checkAdcs(c, adcs);
  const comms = c.object(raw, 'comms', '', 'a radio');
  if (comms) checkComms(c, comms);

  if (raw.payload !== null) {
    const p = c.object(raw, 'payload', '', 'a camera, or null for a satellite without one');
    if (p) {
      c.known(p, 'payload', PAYLOAD_FIELDS);
      c.number(p, 'focalLength', 'payload', L.focalLength);
      c.number(p, 'pixelPitch', 'payload', L.pixelPitch);
      c.number(p, 'pixels', 'payload', L.pixels, { integer: true });
      c.number(p, 'aperture', 'payload', L.aperture);
      c.number(p, 'bits', 'payload', L.bits, { integer: true });
      c.number(p, 'wavelength', 'payload', L.wavelength, { optional: true });
    }
  }

  if (raw.sources !== undefined) {
    if (!Array.isArray(raw.sources) || raw.sources.length > 100) c.add('sources', 'must be a list of at most 100 texts');
    else raw.sources.forEach((s, i) => { if (typeof s !== 'string' || s.length > 500) c.add(`sources[${i}]`, 'must be a text of at most 500 characters'); });
  }
  return c.issues;
}

/** The problems as one message, for an error thrown at a caller that sent a bad design. */
export function satelliteDesignText(issues: readonly SatelliteDesignIssue[]): string {
  return issues.map((i) => (i.path ? `${i.path} ${i.message}` : `the satellite ${i.message}`)).join('; ');
}

export function isSatelliteDesign(raw: unknown): raw is SatelliteDesign {
  return satelliteDesignProblems(raw).length === 0;
}
