/**
 * Requirements → orbit and satellite (roadmap D07, docs/ROADMAP-PART2-3.md;
 * Phase 4 map §3): the trade table. One row for each repeat-ground-track
 * orbit between 150 and 5 000 km — sun-synchronous at the local time asked
 * when the requirements give one (`MissionRequirements.ltan`) — and in each
 * row what that orbit asks of the satellite and what it gives the mission:
 *
 * | column | how |
 * |---|---|
 * | h, i, revolutions / days | `repeatGroundTrack` (src/orbit/playground-model.ts) |
 * | focal length, aperture for the GSD | `focalLengthForGsd`, `apertureForGsd` |
 * | swath | the template's pixels across at that focal length (`swathWidth`) |
 * | longest revisit gap | `revisitGaps`, brute force (src/orbit/coverage.ts) |
 * | contact a day | `contactTime` over the stations asked |
 * | highest rate at the margin; data a day | `maxRateAtMargin` × contact |
 * | longest eclipse; array; battery | `powerAtWorstBeta` |
 * | lifetime, or the Δv to hold the orbit | the lifetime search (src/orbit/lifetime-altitude.ts), `holdDvPerYear` |
 * | disposal Δv | `perigeeLowerDv` (src/orbit/disposal.ts) |
 * | which requirement binds | the largest of the ratios below |
 *
 * WHICH REQUIREMENT BINDS. Each requirement gets a ratio, what the orbit
 * needs over what the satellite has, 1 at the edge, above it not met:
 * - `gsd`: the camera the GSD needs over the camera the template carries
 *   (the larger of the focal-length and aperture shares): above 1 the bus
 *   must carry bigger optics than the template's;
 * - `revisit`: the longest gap over the gap allowed;
 * - `data`: the day's data over what the link brings down in the day's
 *   contact at the margin;
 * - `lifetime`: where drag alone keeps it up for the life, the lowest such
 *   altitude over the row's (≤ 1); below it, the Δv to hold the orbit over
 *   the life over the Δv the tanks hold (Infinity with no engine);
 * - `disposal` (the 25-year rule, IADC-02-01 Rev. 4, doc p. 14): where drag
 *   brings it down within 25 years of the end, the row's altitude over the
 *   highest such (≤ 1); above it, the Δv to hold and to leave, together,
 *   over the tanks.
 * The row's `binds` is the requirement with the largest ratio: the one that
 * fails first, or, when all are met, the one nearest to failing; `unmet`
 * lists every one not met, as several can be at once (a CubeSat with no
 * engine and no view of the place fails revisit, lifetime and disposal
 * together, each by an infinite ratio).
 *
 * WHAT IS AN ESTIMATE, and the screen says so: the mass stays the template's
 * (no free, sourced scaling from payload to mass was found, map §3); the drag
 * area is the tumbling estimate (src/design/satellite-area.ts), the
 * template's, as the lifetime search was run with it (`lifetimeRequest`);
 * the disposal Δv where a burn is needed is a bracket, from the Δv to lower
 * the perigee to the altitude that comes down in time as a circle (too
 * little: an ellipse with that perigee lasts longer) to the Δv for Hull's
 * controlled re-entry, perigee 50 km (enough); the verdict uses the upper
 * end, and the D06 bench, which flies the chosen design, settles it.
 *
 * The chosen row becomes a `SatelliteDesign` (`designFromRow`), opened in the
 * D06 bench, where every figure is worked out again by the D06 cores: D07
 * never shows a number that D06 would give differently for the same design.
 *
 * DOM-free. It reads src/orbit only, never the propagator itself
 * (tests/propagator.test.ts): the lifetime search's answers come in as plain
 * data, from the worker job.
 */
import { DEG, R_EARTH } from '../physics/constants';
import { STATIONS } from '../orbit/applications-setup';
import { footprintAngle, sideReach, swathWidth, type GroundStation } from '../orbit/applications';
import { deltaVAvailable } from '../orbit/budget';
import { contactTime, repeatPeriod, revisitGaps } from '../orbit/coverage';
import { CONTROLLED_REENTRY_PERIGEE, perigeeLowerDv } from '../orbit/disposal';
import { offNadirGsd } from '../orbit/imaging';
import { raanForLocalTime, type Orbit } from '../orbit/kepler';
import { holdDvPerYear, type AltitudeForLifetime, type AltitudesRequest, type LifetimePlane } from '../orbit/lifetime-altitude';
import { LINK_MARGIN_THRESHOLD, eirp, slantRange } from '../orbit/link';
import { repeatGroundTrack, REPEAT_SEARCH } from '../orbit/playground-model';
import {
  apertureForGsd, focalLengthForGsd, maxRateAtMargin, powerAtWorstBeta, requiredDataRate, requiredEirp, txPowerForEirp,
} from './requirement-inverses';
import type { MissionRequirements } from './requirements';
import { designOrbit } from './satellite-handoff';
import { lifetimeSpacecraft, wetMass } from './satellite-area';
import type { SatelliteDesign } from './satellite-spec';

/** A repeat cycle: the ground track repeats after `revs` revolutions in `days` days. */
export interface RepeatCycle { revs: number; days: number }

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/**
 * Every repeat cycle of 1 to `maxDays` days whose orbit lies between 150 and
 * 5 000 km (`REPEAT_SEARCH`), with its orbit: sun-synchronous when `sso`,
 * else at inclination `i` (rad); highest first. Cycles that are a shorter
 * one taken twice (466/32 is 233/16) are left out: revolutions and days
 * have no common factor. The orbits' epoch and node are the caller's.
 */
export function repeatCycles(maxDays: number, sso: boolean, i: number): (RepeatCycle & { orbit: Orbit })[] {
  if (!(Number.isInteger(maxDays) && maxDays >= 1)) throw new RangeError(`maxDays must be a whole number of days, 1 or more (got ${maxDays})`);
  const out: (RepeatCycle & { orbit: Orbit })[] = [];
  for (let days = 1; days <= maxDays; days++) {
    // 150–5 000 km is some 16.4 to 7.2 revolutions a day; a little either side, and repeatGroundTrack decides
    for (let revs = Math.floor(days * 6.5); revs <= Math.ceil(days * 17); revs++) {
      if (gcd(revs, days) !== 1) continue;
      const o = repeatGroundTrack(revs, days, sso, i);
      if (o) out.push({ revs, days, orbit: { a: o.a, e: o.e, i: o.i, raan: o.raan, argp: o.argp, m0: o.m0, jd0: o.jd0 } });
    }
  }
  return out.sort((a, b) => b.orbit.a - a.orbit.a);
}

/** The receiving side of the downlink, which a design does not hold (it names the station only, `SatelliteDesign.comms.station`). */
export interface GroundReceiver {
  /** the station antenna's gain, dBi */
  rxGain: number;
  /** its system noise temperature, K */
  systemTemperature: number;
  /** losses between the antennas — atmosphere, polarisation, pointing — dB */
  losses: number;
  /** modulation and implementation losses, dB */
  implementationLoss: number;
}

export interface TradeOptions {
  /** the epoch, Julian date (UTC): the node's local time is set on it, and the Sun and the ground turn from it */
  jd0: number;
  /** the cycles to try; default every cycle of 1 to `maxDays` days (`repeatCycles`) */
  cycles?: RepeatCycle[];
  /**
   * default: the revisit asked, rounded up. A camera looking straight down
   * with a swath narrower than the repeat grid sees a place at most once a
   * cycle, so a longer cycle meets the revisit only with a wider swath or a
   * camera that tilts; ask for more days to see those.
   */
  maxDays?: number;
  /** without an LTAN in the requirements: the plane's inclination and node, rad */
  inclination?: number;
  raan?: number;
  /** the satellite antenna's gain, dBi: the D06 bench's figure for the design's antenna */
  txGain: number;
  ground: GroundReceiver;
  /** the link margin held to, dB (default `LINK_MARGIN_THRESHOLD`, 3) */
  margin?: number;
  /** the wavelength the aperture must resolve, m (the design stores none) */
  wavelength: number;
  /** how far the camera tilts either side, rad (default 0: straight down only) */
  tilt?: number;
  /**
   * The lifetime search's answers for `lifetimeRequest`'s years, in its
   * order: the life, then (with the 25-year rule) the life plus 25 years.
   * Null leaves the lifetime and disposal columns out.
   */
  lifetime: AltitudeForLifetime[] | null;
  /** a window of days to look for revisits in when the pattern does not repeat with the cycle (daylight on an orbit that is not sun-synchronous); default 60 */
  revisitWindow?: number;
  /** called after each row with the share done; return false to stop (the table then throws an AbortError) */
  onProgress?: (fraction: number) => boolean | void;
}

export type Requirement = 'gsd' | 'revisit' | 'data' | 'lifetime' | 'disposal';
export const REQUIREMENTS: readonly Requirement[] = ['gsd', 'revisit', 'data', 'lifetime', 'disposal'];

export interface TradeRow extends RepeatCycle {
  /** the orbit at the epoch: circular, its node set */
  orbit: Orbit;
  /** m, rad */
  altitude: number;
  inclination: number;
  sso: boolean;
  /** the camera for the GSD, m; the swath of the template's pixels with it, m; how far to the side it sees, m (half the swath, plus the tilt's reach) */
  focalLength: number;
  aperture: number;
  swath: number;
  reach: number;
  /** the cross-track GSD at the largest tilt, m (the GSD asked is met straight down); null with no tilt */
  gsdAtTilt: number | null;
  /** days: the longest and the mean gap between looks, and the looks in the window (one repeat of the pattern, `repeatPeriod`, or the open window) */
  revisit: { maxGap: number; meanGap: number; looks: number };
  /** s a day heard by the stations */
  contactPerDay: number;
  /** bit/s: the highest rate at the margin at the lowest elevation, with the template's transmitter; and the rate the day's data needs */
  maxRate: number;
  requiredRate: number;
  /** bit a day at `maxRate` over the day's contact */
  dataPerDay: number;
  /** W: the transmitter power that carries `requiredRate` at the margin */
  requiredTxPower: number;
  /** the longest eclipse of the year and what it sizes */
  power: { beta: number; eclipse: number; arrayArea: number; batteryWh: number };
  /** null without the lifetime search */
  life: { lasts: boolean; holdDvPerYear: number; holdDv: number } | null;
  /** null without the lifetime search or with no disposal rule */
  disposal: { burn: boolean; dvLow: number; dvHigh: number } | null;
  /** m/s the template's tanks hold */
  dvAvailable: number;
  /** what the orbit needs over what the satellite has (NaN where it does not apply) */
  ratios: Record<Requirement, number>;
  /** the largest ratio's requirement; among equal ones (several Infinity) the first in `REQUIREMENTS` order */
  binds: Requirement;
  /** every requirement not met (ratio above 1), in `REQUIREMENTS` order */
  unmet: Requirement[];
  meets: boolean;
}

/** The plane the rows fly in: the requirements' local time of the node, or the options' inclination. */
export function tradePlane(req: MissionRequirements, opts: Pick<TradeOptions, 'inclination' | 'raan'>): LifetimePlane {
  if (req.ltan !== undefined) return { sso: true, ltan: req.ltan };
  if (opts.inclination === undefined || !Number.isFinite(opts.inclination)) throw new RangeError('without a local time of the node, the rows need an inclination');
  return { sso: false, inclination: opts.inclination, raan: opts.raan ?? 0 };
}

/**
 * What to ask the lifetime search (src/orbit/lifetime-altitude-job.ts) before
 * the table: the template's craft (`lifetimeSpacecraft`), the requirements'
 * ECSS level, the rows' plane, and the years — the life, and with the
 * 25-year rule the life plus 25 years.
 */
export function lifetimeRequest(req: MissionRequirements, template: SatelliteDesign, opts: Pick<TradeOptions, 'jd0' | 'inclination' | 'raan'>): AltitudesRequest {
  return {
    years: req.disposal === '25y' ? [req.lifeYears, req.lifeYears + 25] : [req.lifeYears],
    spacecraft: lifetimeSpacecraft(template), level: req.activity, plane: tradePlane(req, opts), jd0: opts.jd0,
  };
}

const lastsAt = (h: number, r: AltitudeForLifetime): boolean => (r.outcome === 'found' ? h >= r.hi : r.outcome === 'belowRange');
const downInTimeAt = (h: number, r: AltitudeForLifetime): boolean => (r.outcome === 'found' ? h <= r.lo : r.outcome === 'aboveRange');

function stationsOf(ids: readonly string[]): GroundStation[] {
  return ids.map((id) => {
    const s = STATIONS.find((x) => x.id === id);
    if (!s) throw new RangeError(`not a station: ${id}`);
    return { lat: s.lat * DEG, lon: s.lon * DEG, h: 0 };
  });
}

/** One row of the table, for one cycle (see the module's note). */
export function tradeRow(req: MissionRequirements, template: SatelliteDesign, cycle: RepeatCycle, opts: TradeOptions): TradeRow | null {
  const cam = template.payload;
  if (!cam) throw new RangeError('the template carries no camera: D07 sizes one from the GSD asked');
  const plane = tradePlane(req, opts);
  const base = repeatGroundTrack(cycle.revs, cycle.days, plane.sso, plane.sso ? 0 : plane.inclination);
  if (!base) return null;
  const raan = plane.sso ? raanForLocalTime(plane.ltan, opts.jd0) : plane.raan;
  const orbit: Orbit = { a: base.a, e: 0, i: base.i, raan, argp: 0, m0: 0, jd0: opts.jd0 };
  const h = base.a - R_EARTH;
  const margin = opts.margin ?? LINK_MARGIN_THRESHOLD;
  const tilt = opts.tilt ?? 0;

  // the camera
  const focalLength = focalLengthForGsd(h, cam.pixelPitch, req.gsd);
  const aperture = apertureForGsd(h, opts.wavelength, req.gsd);
  const horizon = footprintAngle(base.a, 0) * R_EARTH;
  const swath = swathWidth(h, 2 * Math.atan((cam.pixels * cam.pixelPitch) / (2 * focalLength))) ?? 2 * horizon;
  const reach = Math.min(horizon, swath / 2 + (tilt > 0 ? sideReach(h, tilt) ?? horizon : 0));
  const gsdAtTilt = tilt > 0 ? offNadirGsd(h, cam.pixelPitch, focalLength, tilt).cross : null;

  // revisit: one repeat of the pattern when the looks repeat with it, else a longer open window. The
  // pattern takes the cycle's days in turns of the Earth under the node, solar days only when
  // sun-synchronous (`repeatPeriod`: a 31/2 orbit at 51.6° repeats in 1.966 days)
  const target: GroundStation = { lat: req.target.lat * DEG, lon: req.target.lon * DEG, h: 0 };
  const period = repeatPeriod(orbit, cycle.revs);
  const periodic = plane.sso || !req.daylightOnly;
  const window = periodic ? period : Math.max(period, opts.revisitWindow ?? 60);
  const rv = revisitGaps(orbit, target, reach, opts.jd0, window, req.daylightOnly, { periodic });
  const maxGap = periodic ? rv.maxGap : Math.max(rv.gaps.length ? rv.maxGap : 0, rv.firstAfter, rv.lastBefore);

  // the downlink
  const minEl = req.minElDeg * DEG;
  const contact = contactTime(orbit, stationsOf(req.stations), minEl, opts.jd0, period);
  const path = {
    frequency: template.comms.frequency, rxGain: opts.ground.rxGain, systemTemperature: opts.ground.systemTemperature,
    losses: opts.ground.losses, requiredEbN0: template.comms.requiredEbN0, implementationLoss: opts.ground.implementationLoss,
  };
  const txEirp = eirp(template.comms.txPowerW, template.comms.lineLoss, opts.txGain);
  const maxRate = maxRateAtMargin({ ...path, eirp: txEirp, altitude: h, minEl }, margin);
  const dataPerDay = maxRate * contact.perDay;
  const requiredRate = requiredDataRate(req.dataPerDay, contact.perDay);
  let requiredTxPower = requiredRate === 0 ? 0 : Infinity;
  if (Number.isFinite(requiredRate) && requiredRate > 0) {
    const needed = requiredEirp({ ...path, range: slantRange(base.a, minEl), dataRate: requiredRate }, margin);
    requiredTxPower = txPowerForEirp(needed, template.comms.lineLoss, opts.txGain);
  }

  // the array and the battery: an optical camera that works by day only is off through the eclipse
  const p = template.power;
  const sizing = powerAtWorstBeta({
    orbit, dayLoad: p.payloadW + p.busW, eclipseLoad: p.busW + (req.daylightOnly ? 0 : p.payloadW), regulation: p.regulation,
    cellEff: p.cellEff, Id: p.Id, degPerYear: p.degPerYear, years: req.lifeYears, mount: p.mount, dod: p.dod, batteryEff: p.batteryEff,
  });

  // the tanks, the life and the end of it
  const prop = template.propulsion;
  const dvAvailable = prop && prop.propellant > 0
    ? deltaVAvailable({ mass: wetMass(template), propellant: prop.propellant, isp: prop.isp, thrust: prop.thrust }) : 0;
  const share = (need: number, have: number): number => (need <= 0 ? 0 : have > 0 ? need / have : Infinity);
  const [lifeSearch, disposalSearch] = opts.lifetime ?? [];
  let life: TradeRow['life'] = null, disposal: TradeRow['disposal'] = null;
  let lifeRatio = NaN, disposalRatio = NaN;
  if (lifeSearch) {
    const lasts = lastsAt(h, lifeSearch);
    const perYear = lasts ? 0 : holdDvPerYear(orbit, lifetimeSpacecraft(template), req.activity);
    life = { lasts, holdDvPerYear: perYear, holdDv: perYear * req.lifeYears };
    lifeRatio = lasts ? (lifeSearch.altitude ?? REPEAT_SEARCH.min) / h : share(life.holdDv, dvAvailable);
    if (req.disposal === '25y' && disposalSearch) {
      // held below the life's altitude, it comes down sooner than its life once let go: within 25 years if the life is
      const inTime = lasts ? downInTimeAt(h, disposalSearch) : req.lifeYears <= 25;
      const dvHigh = inTime ? 0 : perigeeLowerDv(h, CONTROLLED_REENTRY_PERIGEE);
      const floor = disposalSearch.outcome === 'found' ? Math.min(h, disposalSearch.lo) : h;
      const dvLow = inTime ? 0 : perigeeLowerDv(h, floor);
      disposal = { burn: !inTime, dvLow, dvHigh };
      const highest = disposalSearch.altitude ?? REPEAT_SEARCH.max;
      disposalRatio = inTime ? h / highest : share(life.holdDv + dvHigh, dvAvailable);
    }
  }

  const camera = Math.max(focalLength / cam.focalLength, aperture / cam.aperture);
  const ratios: Record<Requirement, number> = {
    gsd: camera,
    revisit: maxGap / req.revisitDays,
    data: share(req.dataPerDay, dataPerDay),
    lifetime: lifeRatio,
    disposal: disposalRatio,
  };
  let binds: Requirement = 'gsd';
  for (const k of REQUIREMENTS) if (!Number.isNaN(ratios[k]) && !(ratios[k] <= ratios[binds])) binds = k;
  const unmet = REQUIREMENTS.filter((k) => ratios[k] > 1);
  const meets = unmet.length === 0;
  return {
    ...cycle, orbit, altitude: h, inclination: base.i, sso: plane.sso,
    focalLength, aperture, swath, reach, gsdAtTilt,
    revisit: { maxGap, meanGap: rv.meanGap, looks: rv.looks.length },
    contactPerDay: contact.perDay, maxRate, requiredRate, dataPerDay, requiredTxPower,
    power: { beta: sizing.beta, eclipse: sizing.eclipse, arrayArea: sizing.array.area, batteryWh: sizing.batteryWh },
    life, disposal, dvAvailable, ratios, binds, unmet, meets,
  };
}

/**
 * The trade table (D07, map §3): `tradeRow` for each cycle, highest orbit
 * first. Some tens of milliseconds a row, most of it the revisit's and the
 * contact's brute force over the cycle; `onProgress` lets a worker report
 * and stop it.
 */
export function tradeTable(req: MissionRequirements, template: SatelliteDesign, opts: TradeOptions): TradeRow[] {
  const plane = tradePlane(req, opts);
  const cycles = opts.cycles ?? repeatCycles(opts.maxDays ?? Math.max(1, Math.ceil(req.revisitDays)), plane.sso, plane.sso ? 0 : plane.inclination);
  const rows: TradeRow[] = [];
  cycles.forEach((c, k) => {
    const row = tradeRow(req, template, { revs: c.revs, days: c.days }, opts);
    if (row) rows.push(row);
    if (opts.onProgress && opts.onProgress((k + 1) / cycles.length) === false) throw new DOMException('Cancelled', 'AbortError');
  });
  return rows.sort((a, b) => b.altitude - a.altitude);
}

/**
 * The chosen row as a design for the D06 bench (map §3, "Output"): the
 * template with the row's orbit (circular; sun-synchronous at the local time
 * asked, or the row's inclination and node), the life asked, the camera's
 * focal length and aperture for the GSD, the array and the battery sized for
 * the worst eclipse, and the transmitter and rate that bring the day's data
 * down at the margin, over the first station asked. The mass, the bus and
 * everything else stay the template's (an estimate, labelled so). Null when
 * the row cannot bring the data down at all (no contact).
 */
export function designFromRow(template: SatelliteDesign, row: TradeRow, req: MissionRequirements): SatelliteDesign | null {
  if (!template.payload) throw new RangeError('the template carries no camera');
  if (!(Number.isFinite(row.requiredTxPower) && Number.isFinite(row.requiredRate))) return null;
  const orbit: SatelliteDesign['orbit'] = row.sso
    ? { perigee: row.altitude, apogee: row.altitude, inclination: row.inclination / DEG, sso: true, ltan: req.ltan }
    : { perigee: row.altitude, apogee: row.altitude, inclination: row.inclination / DEG, sso: false, raan: row.orbit.raan / DEG };
  return {
    ...template,
    orbit,
    lifeYears: req.lifeYears,
    power: { ...template.power, arrayArea: row.power.arrayArea, batteryWh: row.power.batteryWh },
    comms: {
      ...template.comms, txPowerW: row.requiredTxPower, dataRate: row.requiredRate,
      station: req.stations[0] ?? template.comms.station, minElDeg: req.minElDeg,
    },
    payload: { ...template.payload, focalLength: row.focalLength, aperture: row.aperture },
  };
}

/** The orbit of a design made from a row, at `jd0`, as the D06 bench places it (`designOrbit`, src/design/satellite-handoff.ts). */
export const orbitOfDesign = (d: SatelliteDesign, jd0: number): Orbit => designOrbit(d.orbit, jd0);
