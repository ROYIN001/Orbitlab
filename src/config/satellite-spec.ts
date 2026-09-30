/**
 * A custom satellite, checked before it flies (roadmap D06; Phase 4 map
 * §2.6 c, the owner's option B, 2026-09-29), and whether it fits the
 * vehicle's fairing.
 *
 * A mission may carry its satellite inline (`MissionConfig.satelliteSpec`),
 * as it carries a custom vehicle (`vehicleSpec`, S02): a designed satellite
 * from Build, or one in a mission or lesson file. The physics trusts a
 * `SatelliteSpec` the way it trusts the catalogue's — `VehicleModel` turns its
 * engine into the last stage, the rigid body takes its size, the S03 hand-off
 * its drag area, C_D and C_R — so everything a file could get wrong is caught
 * here, as src/config/vehicle-spec.ts does for a vehicle: the wrong type, NaN
 * and Infinity, figures that are not positive, an engine no chemical engine
 * is, a catalogue satellite's id, and fields this version does not know.
 * Each problem names its path in the spec.
 *
 * The bounds are PLAUSIBILITY bounds, not capability: they take in every
 * catalogue satellite with room to spare and reject a typo or a unit slip.
 * Whether the mission can fly is the feasibility verdict's to say.
 */
import type { SatelliteKind, SatelliteSpec, VehicleSpec } from '../types';
import { ORBIT_PRESETS } from '../data/orbits';
import { isCatalogueSatellite, SATELLITES } from '../data/satellites';
import { ALL_VEHICLES } from '../data/vehicles';
import { PART_ID_PATTERN, PART_LIMITS, SpecChecker, describeSpecValue, isSpecRecord, type VehicleSpecIssue } from './vehicle-spec';

/** A problem with a custom satellite: where in the spec (`propulsion.isp`), and what. */
export type SatelliteSpecIssue = VehicleSpecIssue;

/**
 * The satellite kinds (`SatelliteKind`, src/types.ts): what draws it and what
 * the hand-off carries — the eight classes, and the historical spacecraft C01
 * added (Crew Dragon, PS-1, Vostok, Mercury, Apollo), whose copies a file may
 * carry too.
 */
export const SATELLITE_KIND_IDS = ['comsat', 'earthObs', 'weather', 'navigation', 'science', 'cubesats', 'starlink', 'crew',
  'crewDragon', 'ps1', 'vostok', 'mercury', 'apollo'] as const satisfies readonly SatelliteKind[];
// every kind is in the list: a kind added to the type and not here fails to compile
const allKinds: Exclude<SatelliteKind, (typeof SATELLITE_KIND_IDS)[number]> extends never ? true : never = true;
void allKinds;

/**
 * The upper bounds a custom satellite is held to, by name, so a builder can
 * refuse what the checker would and say which bound. Why each one:
 *
 * - `mass`, kg: the bound vehicle-spec.ts holds a vehicle's `payloadLEO` to;
 *   the catalogue's heaviest is Apollo's 45.7 t. At least `minMass`, the
 *   payload-mass field's own 1 kg floor (`NUMBER_FIELDS['setup.payloadMass']`,
 *   src/config/validation.ts): a lighter satellite could never fly at its own
 *   mass, and a mission file's reset of a bad payload mass to the
 *   satellite's would fail again on every pass until the file was refused as
 *   unreadable.
 * - `thrust`, N: Apollo's service-module engine, about 91 kN, with room to
 *   spare; the catalogue's strongest satellite engine is the crew's 3.9 kN.
 * - `isp`, s: a chemical engine's, the bounds vehicle-spec.ts holds an
 *   engine's `ispVac` to. Launch flies the satellite's engine as a last stage
 *   (`VehicleModel`); an electric thruster's months-long spiral is not a burn
 *   it flies.
 * - `propellantFraction`: a satellite more than 95 % propellant is a slip;
 *   the catalogue's largest share is the comsat's 45 %.
 * - `width`/`depth` and `height`, m: the fairing bounds vehicle-spec.ts
 *   holds a vehicle to (15 m across, 40 m long).
 * - `area`, m²: a slip guard; the class estimates are 2 to 35 m²
 *   (src/physics/propagator/spacecraft.ts).
 * - `cd`: free-molecular drag coefficients of satellite shapes run 2 to 3,
 *   and spacecraft.ts takes 2.2.
 * - `cr`: the propagator's model runs from 1 (absorbing) to 2 (mirror)
 *   (`Spacecraft.cr`, src/physics/propagator/forces.ts).
 */
export const SATELLITE_LIMITS = {
  mass: 5e5,
  minMass: 1,
  thrust: 1e5,
  isp: [50, 480],
  propellantFraction: 0.95,
  width: PART_LIMITS.diameter, height: 40,
  area: 1000,
  cd: 5,
  cr: [1, 2],
} as const;

const SATELLITE_FIELDS = ['id', 'kind', 'name', 'mass', 'typicalOrbit', 'description', 'crewed', 'propulsion', 'size', 'area', 'cd', 'cr', 'derivedFrom',
  'exposed', 'carriers', 'descent', 'staysAttached'];

/**
 * Everything wrong with a custom satellite, or an empty list. `raw` is
 * whatever a file held; nothing is assumed about it.
 */
export function satelliteSpecProblems(raw: unknown): SatelliteSpecIssue[] {
  const c = new SpecChecker();
  if (!isSpecRecord(raw)) { c.add('', `must be a satellite (got ${describeSpecValue(raw)})`); return c.issues; }
  c.known(raw, '', SATELLITE_FIELDS);
  const id = c.string(raw, 'id', '', { pattern: PART_ID_PATTERN });
  // a catalogue id would fly the catalogue's name, translated, over the designer's
  if (id !== undefined && isCatalogueSatellite(id)) c.add('id', `"${id}" is a catalogue satellite's id: a custom satellite needs an id of its own`);
  if (raw.kind !== undefined && !(SATELLITE_KIND_IDS as readonly unknown[]).includes(raw.kind)) {
    c.add('kind', `must be one of ${SATELLITE_KIND_IDS.join(', ')} (got ${JSON.stringify(raw.kind)})`);
  } else if (raw.kind === undefined) c.add('kind', 'is required');
  c.string(raw, 'name', '');
  c.number(raw, 'mass', '', SATELLITE_LIMITS.minMass, SATELLITE_LIMITS.mass);
  if (typeof raw.typicalOrbit !== 'string' || !ORBIT_PRESETS.some((o) => o.id === raw.typicalOrbit)) {
    c.add('typicalOrbit', `must be an orbit preset's id (got ${JSON.stringify(raw.typicalOrbit)})`);
  }
  c.string(raw, 'description', '', { max: 2000, allowEmpty: true });
  c.boolean(raw, 'crewed', '');

  let origin: SatelliteSpec | undefined;
  if (raw.derivedFrom !== undefined) {
    if (typeof raw.derivedFrom !== 'string' || !isCatalogueSatellite(raw.derivedFrom)) c.add('derivedFrom', `must name a catalogue satellite (got ${JSON.stringify(raw.derivedFrom)})`);
    else origin = SATELLITES.find((s) => s.id === raw.derivedFrom);
  }
  // A crew is what a launch abort saves (G06) and what the onboard view and
  // the Soyuz MS drawing are for: only a copy of a crewed satellite has one.
  if (raw.crewed === true && !origin?.crewed) c.add('crewed', 'only a satellite derived from a crewed catalogue one carries a crew');
  // C01's flight behaviours — flown on top with no fairing (`exposed`), home
  // on its own parachutes (`descent`), riding the last stage into orbit
  // (`staysAttached`) — each changes how the launch itself is flown, and each
  // is modelled for its own spacecraft only: a copy keeps its original's, and
  // no other satellite takes one on.
  if (raw.exposed !== undefined) {
    const x = raw.exposed;
    if (!origin?.exposed) c.add('exposed', 'only a satellite derived from one flown without a fairing is flown without one');
    else if (!isSpecRecord(x)) c.add('exposed', `must be a diameter, length and nose length (got ${describeSpecValue(x)})`);
    else {
      c.known(x, 'exposed', ['diameter', 'length', 'noseLength']);
      c.number(x, 'diameter', 'exposed', 0, SATELLITE_LIMITS.width, { exclusiveMin: true });
      const length = c.number(x, 'length', 'exposed', 0, SATELLITE_LIMITS.height, { exclusiveMin: true });
      const nose = c.number(x, 'noseLength', 'exposed', 0, SATELLITE_LIMITS.height, { exclusiveMin: true });
      if (length !== undefined && nose !== undefined && nose > length) c.add('exposed.noseLength', `must not be longer than the whole (${nose} > ${length})`);
    }
  }
  if (raw.descent !== undefined && (raw.descent !== 'mercury' || origin?.descent !== raw.descent)) {
    c.add('descent', `only a satellite derived from one that comes home on its own parachutes keeps that descent (got ${JSON.stringify(raw.descent)})`);
  }
  c.boolean(raw, 'staysAttached', '');
  if (raw.staysAttached === true && !origin?.staysAttached) c.add('staysAttached', 'only a satellite derived from one that rides the last stage into orbit does so');
  if (raw.carriers !== undefined) {
    const known = new Set(ALL_VEHICLES.map((v) => v.id));
    if (!Array.isArray(raw.carriers) || !raw.carriers.length || raw.carriers.length > known.size) c.add('carriers', 'must list the vehicles that carry it');
    else raw.carriers.forEach((v, i) => { if (typeof v !== 'string' || !known.has(v)) c.add(`carriers[${i}]`, `must be a vehicle's id (got ${JSON.stringify(v)})`); });
  }

  if (raw.propulsion !== undefined) {
    const p = raw.propulsion;
    if (!isSpecRecord(p)) c.add('propulsion', `must be an engine, or left out for none (got ${describeSpecValue(p)})`);
    else {
      c.known(p, 'propulsion', ['thrust', 'isp', 'propellantFraction']);
      c.number(p, 'thrust', 'propulsion', 0, SATELLITE_LIMITS.thrust, { exclusiveMin: true });
      c.number(p, 'isp', 'propulsion', SATELLITE_LIMITS.isp[0], SATELLITE_LIMITS.isp[1]);
      c.number(p, 'propellantFraction', 'propulsion', 0, SATELLITE_LIMITS.propellantFraction, { exclusiveMin: true });
    }
  }
  if (raw.size !== undefined) {
    const z = raw.size;
    if (!isSpecRecord(z)) c.add('size', `must be a width, height and depth (got ${describeSpecValue(z)})`);
    else {
      c.known(z, 'size', ['width', 'height', 'depth']);
      c.number(z, 'width', 'size', 0, SATELLITE_LIMITS.width, { exclusiveMin: true });
      c.number(z, 'height', 'size', 0, SATELLITE_LIMITS.height, { exclusiveMin: true });
      c.number(z, 'depth', 'size', 0, SATELLITE_LIMITS.width, { exclusiveMin: true });
    }
  }
  c.number(raw, 'area', '', 0, SATELLITE_LIMITS.area, { optional: true, exclusiveMin: true });
  c.number(raw, 'cd', '', 0, SATELLITE_LIMITS.cd, { optional: true, exclusiveMin: true });
  c.number(raw, 'cr', '', SATELLITE_LIMITS.cr[0], SATELLITE_LIMITS.cr[1], { optional: true });
  return c.issues;
}

/** The problems as one message, for an error thrown at a caller that sent a bad spec. */
export function satelliteSpecText(issues: readonly SatelliteSpecIssue[]): string {
  return issues.map((i) => (i.path ? `${i.path} ${i.message}` : `the satellite ${i.message}`)).join('; ');
}

export function assertSatelliteSpec(raw: unknown): asserts raw is SatelliteSpec {
  const issues = satelliteSpecProblems(raw);
  if (issues.length) throw new Error(`Invalid custom satellite: ${satelliteSpecText(issues)}`);
}

// ─── the fairing ────────────────────────────────────────────────────────────

/**
 * The share of a fairing's outer diameter, and of its length above its own
 * adapter cone, a payload is taken to have: an ESTIMATE, shown as one. A
 * fairing's usable space ("keep-in volume") is smaller than its shell by the
 * wall, the acoustic blankets and the room the two need to move apart in
 * flight, and each launcher publishes its own in its user's guide (the
 * Falcon guide, 2025, gives only the 5.2 m shell in its text and the keep-in
 * volume as a download: https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf).
 * `FairingSpec` carries the shell alone (src/types.ts), so these round
 * shares stand in for every vehicle; they are not a published envelope and
 * were not fitted to one.
 */
export const FAIRING_ENVELOPE = { diameter: 0.85, length: 0.8 } as const;

/**
 * - `fits`: inside the estimated usable space;
 * - `tight`: inside the shell but not the estimated usable space — it may
 *   not fit, and the launcher's user's guide would say;
 * - `tooBig`: wider or longer than the shell itself;
 * - `noFairing`: the vehicle carries its payload in a bay of its own
 *   (`fairing: null`, Starship and the Saturn V), which nothing here models,
 *   or the satellite rides on top with no fairing at all (`exposed`, C01:
 *   Crew Dragon, Mercury, Apollo 11 — `openTopVehicle`, src/data/vehicles.ts);
 * - `noSize`: the satellite gives no size.
 */
export type FairingFitVerdict = 'fits' | 'tight' | 'tooBig' | 'noFairing' | 'noSize';

export interface FairingFit {
  verdict: FairingFitVerdict;
  /** the satellite as a cylinder, m: across, the larger of its width and depth (as the rigid body takes it, src/physics/simulation.ts); long, its height */
  payload?: { diameter: number; length: number };
  /** the fairing's shell above its adapter cone, m */
  shell?: { diameter: number; length: number };
  /** the usable space estimated inside the shell (`FAIRING_ENVELOPE`), m */
  envelope?: { diameter: number; length: number };
}

/** Whether a satellite fits the vehicle's fairing, as an estimate (roadmap D06, Phase 4 map §2.6 c). */
export function fairingFit(vehicle: Pick<VehicleSpec, 'fairing'>, satellite: Pick<SatelliteSpec, 'size' | 'exposed'>): FairingFit {
  const f = vehicle.fairing;
  if (!f || satellite.exposed) return { verdict: 'noFairing' };
  const shell = { diameter: f.diameter, length: f.length - (f.adapter ?? 0) };
  const envelope = { diameter: shell.diameter * FAIRING_ENVELOPE.diameter, length: shell.length * FAIRING_ENVELOPE.length };
  const z = satellite.size;
  if (!z) return { verdict: 'noSize', shell, envelope };
  const payload = { diameter: Math.max(z.width, z.depth), length: z.height };
  const verdict: FairingFitVerdict = payload.diameter > shell.diameter || payload.length > shell.length ? 'tooBig'
    : payload.diameter > envelope.diameter || payload.length > envelope.length ? 'tight' : 'fits';
  return { verdict, payload, shell, envelope };
}
