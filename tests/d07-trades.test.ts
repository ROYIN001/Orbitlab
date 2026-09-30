/**
 * D07 (docs/ROADMAP-PART2-3.md; Phase 4 map §3, "Trades shown" and its
 * validation table): the trade table, one row per repeat-ground-track orbit
 * (src/design/requirement-trades.ts).
 *
 * TOLERANCES, fixed before the first run:
 * - the repeat orbits the rows are drawn from, as the existing tests hold
 *   them: Landsat 233/16 at a = 7077.44–7077.95 km ± 0.5 km and 98.2096° ±
 *   0.05° (tests/kepler.test.ts); Sentinel-2 143/10 at 786 ± 3 km and 98.62°
 *   ± 0.1° (tests/orbit-playground.test.ts); THEOS-2 385/26 at 621 ± 1 km and
 *   97.91° ± 0.1° (tests/applications.test.ts), and with a 13 µm pitch the
 *   focal length 16.1 m ± 0.08 m (0.05 m for its one printed decimal, 0.026 m
 *   for the 1 km);
 * - published revisits through a row (Landsat's 16 days with 185 km,
 *   Sentinel-2's 10 days with 290 km, over Bangkok by day): the longest gap
 *   no longer than the cycle, to 1e-12 relative;
 * - round trips: the design made from a row, fed back into the D06 and O04
 *   functions, gives the requirement to 1e-9 relative (GSD from the focal
 *   length and from the aperture; the link margin; the day's data over the
 *   day's contact; the array and the battery); its orbit, placed as the D06
 *   bench places it, is the row's to 1e-9 relative; its revisit is the row's
 *   within 2 ms (twice the refinement);
 * - lifetime and disposal verdicts against P07 itself: a row said to last
 *   does, one said not to does not (exact comparisons);
 * - the binding requirement is the largest ratio, exactly;
 * - ADDED IN REVIEW, fixed before its first run: a row whose orbit is not
 *   sun-synchronous (31/2 at 51.6°, flown day and night) takes its revisit and
 *   contact over one repeat of its pattern, so twenty repeats give twenty
 *   times its looks exactly, and its contact a day to 1e-6 relative; the same
 *   longest gap within 2 ms, CHANGED AFTER THAT FIRST RUN to 0.1 s: the run
 *   gave 8.5 ms, and the cause is the time, not the orbit — a Julian date
 *   holds it to 40 µs, in which the Earth turns up to 19 m under the track, so
 *   a closest approach far off the track is certain only to some ±20 ms
 *   (the looks of the twenty repeats move by up to 9 ms, not in a trend).
 */
import { describe, expect, it } from 'vitest';
import { DEG, R_EARTH } from '../src/physics/constants';
import { julianDate } from '../src/physics/orbital';
import { groundSampleDistance } from '../src/orbit/applications';
import { contactTime, repeatPeriod, revisitGaps } from '../src/orbit/coverage';
import { orbitFacts } from '../src/orbit/kepler';
import { stationOf } from '../src/orbit/applications-setup';
import { YEAR } from '../src/orbit/disposal';
import { diffractionGsd } from '../src/orbit/imaging';
import { designControlTable, eirp, slantRange } from '../src/orbit/link';
import { lifetimeAt, type AltitudeForLifetime } from '../src/orbit/lifetime-altitude';
import { runAltitudesJob } from '../src/orbit/lifetime-altitude-job';
import { repeatGroundTrack, REPEAT_SEARCH } from '../src/orbit/playground-model';
import { MOUNT_FACTOR } from '../src/orbit/power';
import { powerAtWorstBeta } from '../src/design/requirement-inverses';
import {
  REQUIREMENTS, designFromRow, lifetimeRequest, orbitOfDesign, repeatCycles, tradeRow, tradeTable, type GroundReceiver, type TradeOptions,
} from '../src/design/requirement-trades';
import { runTradesJob } from '../src/design/requirement-trades-job';
import type { MissionRequirements } from '../src/design/requirements';
import { lifetimeSpacecraft } from '../src/design/satellite-area';
import type { SatelliteDesign } from '../src/design/satellite-spec';

const JD0 = julianDate(new Date(Date.UTC(2026, 8, 21)));
const rel = (a: number, b: number): number => Math.abs(a - b) / Math.max(1, Math.abs(b));

/** Palo et al.'s NEN receiver as the D06 link test reads it (NTRS 20150000169, Table 1): test inputs. */
const NEN: GroundReceiver = { rxGain: 57.476, systemTemperature: 189.7, losses: 1.993, implementationLoss: 0 };

/**
 * A THEOS-2-class imager, as TEST INPUTS only (track B's templates carry the
 * sourced figures): eoPortal's 425 kg (an estimate), O04's example camera
 * (16.1 m, 13 µm, 20 600 pixels), and round figures for the rest (a 1 m
 * aperture, a panchromatic band's middle, 0.65 µm, to resolve).
 */
const IMAGER: SatelliteDesign = {
  id: 'test-imager', name: 'test imager', template: 'test', kind: 'earthObs',
  orbit: { perigee: 621e3, apogee: 621e3, inclination: 97.91, sso: true, ltan: 22.25 },
  lifeYears: 7,
  bus: { dryMass: 395, size: { width: 1.5, height: 2, depth: 1.5 }, cd: 2.2, cr: 1.3 },
  power: {
    payloadW: 500, busW: 300, arrayArea: 6, cellEff: 0.28, Id: 0.77, degPerYear: 0.005, mount: 'tracking', regulation: 'PPT',
    batteryWh: 1500, dod: 0.3, batteryEff: 0.9,
  },
  propulsion: { thrust: 1, isp: 220, propellant: 30 },
  adcs: { mode: 'threeAxis', inertia: [300, 300, 200], pointingDeg: 0.05, wheelH: 12, residualDipole: 1, cpOffset: 0.1 },
  comms: { txPowerW: 10, frequency: 8.2e9, txAntennaD: 0.3, lineLoss: 1, dataRate: 300e6, requiredEbN0: 5.52, station: 'bangkok', minElDeg: 5 },
  payload: { focalLength: 16.1, pixelPitch: 13e-6, pixels: 20_600, aperture: 1, bits: 12 },
};

const THEOS2_REQ: MissionRequirements = {
  target: { lat: 13.7563, lon: 100.5018, name: 'Bangkok' },
  gsd: 0.5, revisitDays: 26, daylightOnly: true, ltan: 22.25,
  lifeYears: 7, activity: 'moderate', dataPerDay: 1e12, stations: ['bangkok'], minElDeg: 5, disposal: '25y',
};

const OPTS: TradeOptions = { jd0: JD0, txGain: 20, ground: NEN, wavelength: 0.65e-6, lifetime: null };
const stationsFor = (ids: string[]) => ids.map((id) => stationOf(id)!);

describe('the rows\' orbits (D07)', () => {
  it('are every repeat cycle in 150–5 000 km, highest first, and hold Landsat\'s, Sentinel-2\'s and THEOS-2\'s', () => {
    const rows = repeatCycles(26, true, 0);
    for (let k = 1; k < rows.length; k++) expect(rows[k].orbit.a).toBeLessThanOrEqual(rows[k - 1].orbit.a);
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    for (const r of rows) {
      expect(gcd(r.revs, r.days)).toBe(1);
      expect(r.orbit.a - R_EARTH).toBeGreaterThanOrEqual(REPEAT_SEARCH.min);
      expect(r.orbit.a - R_EARTH).toBeLessThanOrEqual(REPEAT_SEARCH.max);
    }
    // nothing left out: every coprime cycle repeatGroundTrack finds is a row
    for (const days of [1, 7, 26]) {
      const want = [];
      for (let revs = 1; revs <= 20 * days; revs++) if (gcd(revs, days) === 1 && repeatGroundTrack(revs, days, true, 0)) want.push(revs);
      expect(rows.filter((r) => r.days === days).map((r) => r.revs).sort((a, b) => a - b)).toEqual(want);
    }
    const find = (revs: number, days: number) => rows.find((r) => r.revs === revs && r.days === days)!;
    const landsat = find(233, 16), s2 = find(143, 10), theos2 = find(385, 26);
    expect(landsat.orbit.a / 1e3).toBeGreaterThan(7077.44 - 0.5);
    expect(landsat.orbit.a / 1e3).toBeLessThan(7077.95 + 0.5);
    expect(Math.abs(landsat.orbit.i / DEG - 98.2096)).toBeLessThan(0.05);
    expect(Math.abs((s2.orbit.a - R_EARTH) / 1e3 - 786)).toBeLessThan(3);
    expect(Math.abs(s2.orbit.i / DEG - 98.62)).toBeLessThan(0.1);
    expect(Math.abs((theos2.orbit.a - R_EARTH) / 1e3 - 621)).toBeLessThanOrEqual(1);
    expect(Math.abs(theos2.orbit.i / DEG - 97.91)).toBeLessThanOrEqual(0.1);
    // not sun-synchronous: at the inclination given
    for (const r of repeatCycles(2, false, 51.6 * DEG)) expect(r.orbit.i).toBe(51.6 * DEG);
  });
});

describe('a row (D07)', () => {
  it('works THEOS-2\'s case: 385/26 at 621 km, 97.91°, a 16.1 m focal length for 0.5 m at 13 µm', () => {
    const row = tradeRow(THEOS2_REQ, IMAGER, { revs: 385, days: 26 }, { ...OPTS, tilt: 45 * DEG })!;
    expect(Math.abs(row.altitude / 1e3 - 621)).toBeLessThanOrEqual(1);
    expect(Math.abs(row.inclination / DEG - 97.91)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(row.focalLength - 16.1)).toBeLessThanOrEqual(0.08);
    expect(row.sso).toBe(true);
    expect(row.revisit.maxGap).toBeLessThanOrEqual(26 * (1 + 1e-12));
    expect(row.gsdAtTilt!).toBeGreaterThan(0.5);
    expect(row.life).toBeNull();
    expect(Number.isNaN(row.ratios.lifetime)).toBe(true);
  });

  it('meets Landsat\'s 16 days and Sentinel-2\'s 10 over Bangkok by day, as the missions publish them', () => {
    // 185 km of 30 m pixels, 290 km of 10 m ones (test inputs for the pixel counts)
    const landsat = tradeRow({ ...THEOS2_REQ, gsd: 30, revisitDays: 16, ltan: 22 }, { ...IMAGER, payload: { ...IMAGER.payload!, pixels: 6167 } }, { revs: 233, days: 16 }, OPTS)!;
    expect(landsat.swath / 1e3).toBeGreaterThan(184);
    expect(landsat.revisit.maxGap).toBeLessThanOrEqual(16 * (1 + 1e-12));
    expect(landsat.ratios.revisit).toBeLessThanOrEqual(1 + 1e-12);
    const s2 = tradeRow({ ...THEOS2_REQ, gsd: 10, revisitDays: 10, ltan: 22.5 }, { ...IMAGER, payload: { ...IMAGER.payload!, pixels: 29_000 } }, { revs: 143, days: 10 }, OPTS)!;
    expect(s2.swath / 1e3).toBeGreaterThan(289);
    expect(s2.revisit.maxGap).toBeLessThanOrEqual(10 * (1 + 1e-12));
  });

  it('makes a design that gives the requirements back through the D06 and O04 functions', () => {
    const req = { ...THEOS2_REQ, dataPerDay: 2e11 };
    const opts = { ...OPTS, tilt: 30 * DEG, margin: 4 };
    const row = tradeRow(req, IMAGER, { revs: 385, days: 26 }, opts)!;
    const d = designFromRow(IMAGER, row, req)!;
    const h = row.altitude;
    expect(rel(groundSampleDistance(h, d.payload!.pixelPitch, d.payload!.focalLength), 0.5)).toBeLessThanOrEqual(1e-9);
    expect(rel(diffractionGsd(h, d.payload!.aperture, opts.wavelength), 0.5)).toBeLessThanOrEqual(1e-9);
    // the link at the design's power and rate closes with the margin asked, at the lowest elevation
    const t = designControlTable({
      eirp: eirp(d.comms.txPowerW, d.comms.lineLoss, opts.txGain), frequency: d.comms.frequency, range: slantRange(R_EARTH + h, d.comms.minElDeg * DEG),
      rxGain: NEN.rxGain, systemTemperature: NEN.systemTemperature, losses: NEN.losses, dataRate: d.comms.dataRate,
      requiredEbN0: d.comms.requiredEbN0, implementationLoss: NEN.implementationLoss,
    });
    expect(rel(t.margin, 4)).toBeLessThanOrEqual(1e-9);
    expect(rel(d.comms.dataRate * row.contactPerDay, req.dataPerDay)).toBeLessThanOrEqual(1e-9);
    // its orbit is the row's, placed as the D06 bench places it
    const o = orbitOfDesign(d, JD0);
    expect(rel(o.a, row.orbit.a)).toBeLessThanOrEqual(1e-9);
    expect(rel(o.i, row.orbit.i)).toBeLessThanOrEqual(1e-9);
    expect(rel(o.raan, row.orbit.raan)).toBeLessThanOrEqual(1e-9);
    expect(o.e).toBe(0);
    // the array and battery give the loads back at the worst β of that orbit
    const p = powerAtWorstBeta({
      orbit: o, dayLoad: d.power.payloadW + d.power.busW, eclipseLoad: d.power.busW, regulation: d.power.regulation, cellEff: d.power.cellEff,
      Id: d.power.Id, degPerYear: d.power.degPerYear, years: d.lifeYears, mount: d.power.mount, dod: d.power.dod, batteryEff: d.power.batteryEff,
    });
    expect(rel(d.power.arrayArea, p.array.area)).toBeLessThanOrEqual(1e-9);
    expect(rel((d.power.arrayArea * p.array.pEol) / MOUNT_FACTOR[d.power.mount], p.arrayPower)).toBeLessThanOrEqual(1e-9);
    expect(rel(d.power.batteryWh * 3600 * d.power.dod * d.power.batteryEff, d.power.busW * p.eclipse)).toBeLessThanOrEqual(1e-9);
    // and the revisit seen from it is the row's
    // over one repeat of its pattern, as the row takes it (changed in review from 26 days, which is 14 ms more)
    const again = revisitGaps(o, { lat: req.target.lat * DEG, lon: req.target.lon * DEG, h: 0 }, row.reach, JD0, repeatPeriod(o, 385), true, { periodic: true });
    expect(Math.abs(again.maxGap - row.revisit.maxGap) * 86400).toBeLessThanOrEqual(2e-3);
    // the rest is the template's: mass, bus, the engine
    expect(d.bus).toEqual(IMAGER.bus);
    expect(d.propulsion).toEqual(IMAGER.propulsion);
    expect(d.lifeYears).toBe(7);
    expect(d.orbit).toMatchObject({ perigee: h, apogee: h, sso: true, ltan: 22.25 });
  });

  it('names the requirement with the largest ratio as the one that binds', () => {
    const cycle = { revs: 385, days: 26 };
    // tilting 45°, as THEOS-2 does, so the revisit is finite and the other requirements can bind
    const tilted = { ...OPTS, tilt: 45 * DEG };
    const look = (req: MissionRequirements, opts: TradeOptions = tilted, design = IMAGER) => tradeRow(req, design, cycle, opts)!;
    const check = (r: ReturnType<typeof look>): void => {
      const top = Math.max(...REQUIREMENTS.map((k) => r.ratios[k]).filter((x) => !Number.isNaN(x)));
      expect(r.ratios[r.binds]).toBe(top);
      expect(r.meets).toBe(REQUIREMENTS.every((k) => Number.isNaN(r.ratios[k]) || r.ratios[k] <= 1));
      expect(r.unmet).toEqual(REQUIREMENTS.filter((k) => r.ratios[k] > 1));
      if (!r.meets) expect(r.unmet).toContain(r.binds);
    };
    const revisit = look({ ...THEOS2_REQ, revisitDays: 1 });
    expect(revisit.binds).toBe('revisit');
    expect(revisit.meets).toBe(false);
    check(revisit);
    const data = look({ ...THEOS2_REQ, dataPerDay: 1e16 });
    expect(data.binds).toBe('data');
    check(data);
    const gsd = look({ ...THEOS2_REQ, gsd: 0.05 });
    expect(gsd.binds).toBe('gsd');
    check(gsd);
    // the lifetime search's answers, made up for the logic: the life needs 900 km, the 25 years 950 km
    const search = (years: number, lo: number, hi: number): AltitudeForLifetime => ({ years, outcome: 'found', altitude: (lo + hi) / 2, lo, hi, runs: [] });
    const high = { ...tilted, lifetime: [search(7, 895e3, 905e3), search(32, 945e3, 955e3)] };
    const noEngine = { ...IMAGER, propulsion: null };
    const life = look(THEOS2_REQ, high, noEngine);
    expect(life.life!.lasts).toBe(false);
    expect(life.ratios.lifetime).toBe(Infinity);
    expect(life.binds).toBe('lifetime');
    check(life);
    // held by the engine instead: a finite share of the tanks
    const held = look(THEOS2_REQ, high);
    expect(held.life!.holdDv).toBeGreaterThan(0);
    expect(held.ratios.lifetime).toBeCloseTo(held.life!.holdDv / held.dvAvailable, 12);
    // low enough to last, too high to come down in 25 years: a burn, and none to make it
    const low = { ...tilted, lifetime: [search(7, 395e3, 405e3), search(32, 495e3, 505e3)] };
    const disposal = look(THEOS2_REQ, low, noEngine);
    expect(disposal.life!.lasts).toBe(true);
    expect(disposal.disposal!.burn).toBe(true);
    expect(disposal.disposal!.dvLow).toBeLessThan(disposal.disposal!.dvHigh);
    expect(disposal.binds).toBe('disposal');
    check(disposal);
    // two at once, both infinite (no pass climbs to 89.99°, so no contact; no engine): the first in order
    // binds, and both are unmet
    const both = look({ ...THEOS2_REQ, minElDeg: 89.99 }, high, noEngine);
    expect(both.contactPerDay).toBe(0);
    expect(both.ratios.data).toBe(Infinity);
    expect(both.ratios.lifetime).toBe(Infinity);
    expect(both.binds).toBe('data');
    expect(both.unmet).toEqual(expect.arrayContaining(['data', 'lifetime']));
    expect(designFromRow(noEngine, both, THEOS2_REQ)).toBeNull();
    check(both);
    // with no disposal rule it does not count
    const none = look({ ...THEOS2_REQ, disposal: 'none' }, low, noEngine);
    expect(none.disposal).toBeNull();
    expect(Number.isNaN(none.ratios.disposal)).toBe(true);
    // all met: the nearest to failing binds
    const easy = look({ ...THEOS2_REQ, dataPerDay: 1e9, gsd: 1 }, { ...tilted, lifetime: [search(7, 395e3, 405e3), search(32, 695e3, 705e3)] });
    expect(easy.meets).toBe(true);
    check(easy);
  });

  it('takes the revisit and the contact of an orbit that is not sun-synchronous over one repeat of its pattern', () => {
    // 31 revolutions while the Earth turns twice under the node: at 51.6° the node drifts west, so the
    // pattern repeats in two turns under the node, some 1.97 days, not in two solar days
    const req: MissionRequirements = { ...THEOS2_REQ, daylightOnly: false, revisitDays: 2, gsd: 5 };
    delete req.ltan;
    const opts = { ...OPTS, inclination: 51.6 * DEG, tilt: 30 * DEG };
    const row = tradeRow(req, IMAGER, { revs: 31, days: 2 }, opts)!;
    const period = (31 * orbitFacts(row.orbit, true).nodalPeriod) / 86400;
    const target = { lat: req.target.lat * DEG, lon: req.target.lon * DEG, h: 0 };
    const twenty = revisitGaps(row.orbit, target, row.reach, JD0, 20 * period, false, { periodic: true });
    expect(twenty.looks.length).toBeGreaterThan(20);
    expect(twenty.looks.length).toBe(20 * row.revisit.looks);
    expect(Math.abs(twenty.maxGap - row.revisit.maxGap) * 86400).toBeLessThanOrEqual(0.1);
    const contact = contactTime(row.orbit, stationsFor(req.stations), req.minElDeg * DEG, JD0, 20 * period);
    expect(rel(row.contactPerDay, contact.perDay)).toBeLessThanOrEqual(1e-6);
  });

  it('refuses a template with no camera, an unknown station, or no plane', () => {
    expect(() => tradeRow(THEOS2_REQ, { ...IMAGER, payload: null }, { revs: 385, days: 26 }, OPTS)).toThrow(RangeError);
    expect(() => tradeRow({ ...THEOS2_REQ, stations: ['atlantis'] }, IMAGER, { revs: 385, days: 26 }, OPTS)).toThrow(RangeError);
    const noLtan: MissionRequirements = { ...THEOS2_REQ };
    delete noLtan.ltan;
    expect(() => tradeRow(noLtan, IMAGER, { revs: 31, days: 2 }, OPTS)).toThrow(RangeError);
    expect(tradeRow(noLtan, IMAGER, { revs: 31, days: 2 }, { ...OPTS, inclination: 51.6 * DEG })!.sso).toBe(false);
    expect(tradeRow(THEOS2_REQ, IMAGER, { revs: 1, days: 1 }, OPTS)).toBeNull();
  });
});

describe('the table (D07)', () => {
  it('is its rows, highest first, with progress, and stops when asked', () => {
    const req = { ...THEOS2_REQ, revisitDays: 1 };
    const seen: number[] = [];
    const rows = tradeTable(req, IMAGER, { ...OPTS, onProgress: (f) => { seen.push(f); } });
    const cycles = repeatCycles(1, true, 0);
    expect(rows.length).toBe(cycles.length);
    expect(seen.length).toBe(cycles.length);
    expect(seen[seen.length - 1]).toBe(1);
    for (let k = 1; k < rows.length; k++) expect(rows[k].altitude).toBeLessThan(rows[k - 1].altitude);
    expect(rows[3]).toEqual(tradeRow(req, IMAGER, { revs: rows[3].revs, days: rows[3].days }, OPTS));
    let stopped: unknown = null;
    try { tradeTable(req, IMAGER, { ...OPTS, onProgress: (f) => f < 0.3 }); } catch (e) { stopped = e; }
    expect(stopped).toMatchObject({ name: 'AbortError' });
  });

  it('runs as a job: the table\'s own rows where no worker can be made, with its progress, and a Stop', async () => {
    const r = { req: { ...THEOS2_REQ, revisitDays: 1 }, template: IMAGER, opts: { ...OPTS, tilt: 45 * DEG } };
    const seen: number[] = [];
    const rows = await runTradesJob(r, new AbortController().signal, (f) => seen.push(f));
    expect(rows).toEqual(tradeTable(r.req, r.template, r.opts));
    expect(seen[seen.length - 1]).toBe(1);
    for (let k = 1; k < seen.length; k++) expect(seen[k]).toBeGreaterThan(seen[k - 1]);
    const early = new AbortController();
    early.abort();
    await expect(runTradesJob(r, early.signal, () => {})).rejects.toMatchObject({ name: 'AbortError' });
    const mid = new AbortController();
    await expect(runTradesJob(r, mid.signal, (f) => { if (f > 0.3) mid.abort(); })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('asks the lifetime search for the life and the life plus 25 years, and its verdicts are P07\'s', async () => {
    // a 6U CubeSat with a small camera and no engine (test inputs; NAPA-2's size and mass)
    const cube: SatelliteDesign = {
      ...IMAGER, id: 'test-cube', kind: 'science',
      bus: { dryMass: 10, size: { width: 0.1, height: 0.2, depth: 0.3405 }, cd: 2.2, cr: 1.2 },
      power: { ...IMAGER.power, payloadW: 10, busW: 8, mount: 'body', arrayArea: 0.1 },
      propulsion: null,
      comms: { ...IMAGER.comms, txPowerW: 2 },
      payload: { focalLength: 0.58, pixelPitch: 5.5e-6, pixels: 4000, aperture: 0.09, bits: 12 },
    };
    const req: MissionRequirements = { ...THEOS2_REQ, gsd: 5, revisitDays: 1, lifeYears: 1, dataPerDay: 5e9 };
    const ask = lifetimeRequest(req, cube, OPTS);
    expect(ask.years).toEqual([1, 26]);
    expect(ask.spacecraft).toEqual(lifetimeSpacecraft(cube));
    expect(ask.level).toBe('moderate');
    expect(ask.plane).toEqual({ sso: true, ltan: 22.25 });
    const lifetime = await runAltitudesJob({ ...ask, hi: 1500e3 }, new AbortController().signal, () => {});
    expect(lifetime.map((r) => r.outcome)).toEqual(['found', 'found']);
    const rows = tradeTable(req, cube, { ...OPTS, txGain: 6, lifetime });
    expect(rows.length).toBeGreaterThan(5);
    const [life, down] = lifetime;
    for (const r of rows) {
      expect(r.life!.lasts).toBe(r.altitude >= life.hi);
      expect(r.disposal!.burn).toBe(r.altitude > down.lo);
      // no engine: anything that needs Δv cannot be met
      if (!r.life!.lasts) expect(r.ratios.lifetime).toBe(Infinity);
      if (r.disposal!.burn) expect(r.ratios.disposal).toBe(Infinity);
    }
    // P07 itself, at the lowest row said to last and the highest below the bracket (inside it the table is
    // conservative: not proven to last is not lasting)
    const lasting = rows.filter((r) => r.life!.lasts), short = rows.filter((r) => r.altitude < life.lo);
    expect(lasting.length).toBeGreaterThan(0);
    expect(short.length).toBeGreaterThan(0);
    const base = { spacecraft: ask.spacecraft, level: ask.level, plane: ask.plane, jd0: JD0 };
    expect(lifetimeAt(lasting[lasting.length - 1].altitude, base, YEAR)).toBeNull();
    expect(lifetimeAt(short[0].altitude, base, YEAR)).not.toBeNull();
    const inTime = rows.filter((r) => !r.disposal!.burn);
    expect(lifetimeAt(inTime[0].altitude, base, 26 * YEAR)).not.toBeNull();
  }, 120_000);
});
