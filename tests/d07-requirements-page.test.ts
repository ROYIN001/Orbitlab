/**
 * D07's requirements page (docs/ROADMAP-PART2-3.md; Phase 4 map §3), its
 * DOM-free model (src/design/requirements-page.ts): the form and its bounds,
 * what a run costs, the options that make a row's link and camera the D06
 * bench's, the cores' errors in the page's words, what the lifetime and
 * disposal columns say, the charts' points, and the row opened on the bench.
 *
 * TOLERANCES, fixed in this header before the first run:
 * - round trip (map §3 validation), the THEOS-2 worked case: 0.5 m, 385/26
 *   sun-synchronous, descending node at 10:15 (in 10:00–10:30) → 621 km ± 1 km
 *   and 97.91° ± 0.1°, and with the template's 13 µm pitch f = 16.1 m ± 0.08 m
 *   (as tests/d07-trades.test.ts holds them); the opened design's D06 figures
 *   meet each requirement the row claims met: the GSD and the diffraction
 *   limit to 1e-9 relative, the camera within the template's to 1e-9 (the
 *   row does not claim this one: CHANGED AFTER THE FIRST RUN, see the test), the
 *   link margin 3 dB to 1e-9 and the day's data to 1e-9 relative, the revisit
 *   seen from the design's orbit no longer than asked (1e-12 relative), and
 *   the lifetime and the 25-year rule as the bench's own P07 run gives them
 *   (exact comparisons); the bench's Δv budget and power not short (margin ≥
 *   −1e-9, the battery no deeper than allowed + 1e-9, satelliteChecks' own
 *   slack);
 * - the TU Delft data-volume case (reader p. 200): 8 Mbit/s for 120 min is
 *   57.6 Gbit and needs 96 Mbit/s over a 10-minute pass, EXACTLY (toBe), through
 *   the page's Gbit box and the design it opens; the bench's link margin at
 *   that rate 3 dB to 1e-9;
 * - the page's link and camera are the bench's: a design at a row's orbit with
 *   the template's transmitter has D06's highest rate at 3 dB equal to the
 *   row's to 1e-9 relative, and its diffraction limit at the row's aperture
 *   equal to the GSD asked to 1e-9;
 * - the row set beside the bench: every figure both give is the same to 1e-9
 *   relative, but the eclipse (closed form against sampled, within 0.5 %, D's
 *   own bound), the array and the battery (sized again by the bench) and the
 *   highest rate (the template's transmitter against the design's), each
 *   with its reason;
 * - the cost estimate is arithmetic on D's measured 0.25 s a row for 26-day
 *   cycles, exact; the row cap is MAX_ROWS.
 */
import { describe, expect, it } from 'vitest';
import { DEG, R_EARTH } from '../src/physics/constants';
import { julianDate } from '../src/physics/orbital';
import { runLifetimeJob } from '../src/physics/lifetime-job';
import { sideReach } from '../src/orbit/applications';
import { stationOf } from '../src/orbit/applications-setup';
import { contactTime, repeatPeriod, revisitGaps } from '../src/orbit/coverage';
import { circularOrbit, meanForces, altitudesForLifetimes, type AltitudeForLifetime } from '../src/orbit/lifetime-altitude';
import { slantRange } from '../src/orbit/link';
import { levelActivity } from '../src/orbit/satellite-air';
import { powerAtWorstBeta, requiredDataRate, requiredEirp, txPowerForEirp, focalLengthForGsd } from '../src/design/requirement-inverses';
import { REQUIREMENTS, repeatCycles, tradePlane, tradeRow, type TradeRow } from '../src/design/requirement-trades';
import {
  DEFAULT_FORM, MAX_ROWS, REQUIREMENT_LIMITS, REQ_TEMPLATES, SECONDS_PER_ROW_DAY, aperturePoints, benchDesign, candidateCycles, compareWithBench,
  disposalState, errorKey, gbitToBits, lifeState, lifetimePoints, lifetimeRequestFor, missionRequirements, otherNode, requirementsProblems,
  restoreForm, runCost, standing, targetOf, templateDesign, tradeOptionsFor, type RequirementsForm,
} from '../src/design/requirements-page';
import { designFigures, designHandoff, satelliteChecks } from '../src/design/satellite-model';
import { designOrbit } from '../src/design/satellite-handoff';
import { lifetimeSpacecraft } from '../src/design/satellite-area';
import type { SatelliteDesign } from '../src/design/satellite-spec';

const JD0 = julianDate(new Date(Date.UTC(2026, 8, 30)));
const YEAR = 365.25 * 86400;
const rel = (a: number, b: number): number => Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-300);

/** THEOS-2 as it flies: Bangkok, 0.5 m, its 26-day cycle, the descending node at 10:15 (22:15 ascending), its ten-year life. */
const THEOS2: RequirementsForm = {
  ...DEFAULT_FORM, template: 'theos2', target: 'bangkok', gsd: 0.5, revisitDays: 26, daylightOnly: true, sso: true, ltan: 22.25,
  lifeYears: 10, activity: 'moderate', dataGbit: 100, stations: ['bangkok'], minElDeg: 10, disposal: '25y', tiltDeg: 30, minDays: 26, maxDays: 26,
};

describe('the requirements form (D07)', () => {
  it('starts sound, over Bangkok, sun-synchronous at THEOS-2\'s local time, and says so in the cores\' terms', () => {
    expect(requirementsProblems(DEFAULT_FORM)).toEqual([]);
    expect(REQ_TEMPLATES).toEqual(['napa2', 'theos2', 'earthObs']);
    const req = missionRequirements(DEFAULT_FORM);
    expect(req.target).toMatchObject({ lat: 13.7563, lon: 100.5018 });
    expect(req.ltan).toBe(22.25);
    expect(otherNode(22.25)).toBe(10.25);
    expect(req.dataPerDay).toBe(100e9);
    expect(missionRequirements({ ...DEFAULT_FORM, sso: false }).ltan).toBeUndefined();
    expect(targetOf({ target: 'custom', lat: 1, lon: 2 })).toEqual({ lat: 1, lon: 2 });
    expect(targetOf({ target: 'moscow', lat: 1, lon: 2 })).toEqual({ lat: 55.7558, lon: 37.6173 });
  });

  it('refuses each number outside its box\'s bounds by name, and the life and elevation at the design checker\'s', () => {
    const bad = (patch: Partial<RequirementsForm>) => requirementsProblems({ ...DEFAULT_FORM, ...patch }).map((i) => i.field);
    expect(bad({ gsd: 0.01 })).toEqual(['gsd']);
    expect(bad({ gsd: Number.NaN })).toEqual(['gsd']);
    expect(bad({ revisitDays: 61 })).toEqual(['revisitDays']);
    expect(bad({ ltan: 25 })).toEqual(['ltan']);
    expect(bad({ sso: false, inclination: 181, ltan: 25 })).toEqual(['inclination']);
    expect(bad({ lifeYears: 31 })).toEqual(['lifeYears']);
    expect(REQUIREMENT_LIMITS.lifeYears).toEqual([0.1, 30]);
    expect(bad({ minElDeg: 90 })).toEqual(['minElDeg']);
    expect(bad({ dataGbit: -1 })).toEqual(['dataGbit']);
    expect(bad({ tiltDeg: 61 })).toEqual(['tiltDeg']);
    expect(bad({ stations: [] })).toEqual(['stations']);
    expect(bad({ stations: ['atlantis'] })).toEqual(['stations']);
    expect(bad({ template: 'comsat' })).toEqual(['template']);
    expect(bad({ minDays: 1.5 })).toEqual(['minDays']);
    expect(bad({ minDays: 6, maxDays: 5 })).toEqual(['minDays']);
    expect(bad({ target: 'custom', lat: 91 })).toEqual(['lat']);
    expect(bad({ target: 'bangkok', lat: 91 })).toEqual([]);
    const range = requirementsProblems({ ...DEFAULT_FORM, gsd: 0.01 })[0];
    expect(range).toEqual({ field: 'gsd', key: 'build.req.bad.range', values: { min: 0.05, max: 1000 } });
  });

  it('keeps a form in this browser, and gives the default back for anything it cannot read', () => {
    const f: RequirementsForm = { ...THEOS2, target: 'custom', lat: 64.1, lon: -21.9, stations: ['moscow', 'bangkok'], maxDays: null };
    expect(restoreForm(JSON.stringify(f))).toEqual(f);
    expect(restoreForm(null)).toEqual(DEFAULT_FORM);
    expect(restoreForm('{')).toEqual(DEFAULT_FORM);
    expect(restoreForm(JSON.stringify({ gsd: 'big', template: 'comsat', stations: ['atlantis'], activity: 'extreme' }))).toEqual(DEFAULT_FORM);
  });
});

describe('what a run costs (D07)', () => {
  it('tries the cycles up to the revisit asked, rounded up, says how many and how long, and caps the rows', () => {
    const cycles = candidateCycles(DEFAULT_FORM);
    expect(cycles.length).toBe(repeatCycles(5, true, 0).length);
    expect(Math.max(...cycles.map((c) => c.days))).toBe(5);
    const cost = runCost(cycles, 2);
    expect(cost.rows).toBe(cycles.length);
    expect(cost.tableSeconds).toBe(cycles.reduce((s, c) => s + c.days, 0) * SECONDS_PER_ROW_DAY);
    expect(cost.tooMany).toBe(false);
    expect(runCost(cycles, 0).lifetimeSeconds).toBe(0);
    // THEOS-2's 26 days: every cycle to 26 days is far too many rows; the 26-day ones alone are not
    const all = runCost(candidateCycles({ ...THEOS2, minDays: 1 }), 2);
    expect(all.rows).toBeGreaterThan(MAX_ROWS);
    expect(all.tooMany).toBe(true);
    const only26 = candidateCycles(THEOS2);
    expect(only26.every((c) => c.days === 26)).toBe(true);
    expect(only26.some((c) => c.revs === 385)).toBe(true);
    expect(runCost(only26, 2).tooMany).toBe(false);
    // not sun-synchronous: at the inclination asked
    expect(candidateCycles({ ...DEFAULT_FORM, sso: false, inclination: 51.6, maxDays: 2 }).length).toBe(repeatCycles(2, false, 51.6 * DEG).length);
  });
});

describe('the cores\' errors in the page\'s words (D07)', () => {
  const thrown = (fn: () => unknown): unknown => { try { fn(); } catch (e) { return e; } throw new Error('did not throw'); };
  const tpl = templateDesign('theos2');
  const req = missionRequirements(THEOS2);
  const opts = tradeOptionsFor(tpl, THEOS2, JD0, null);

  it('maps every RangeError a run can meet to a sentence of its own, never the English', () => {
    const cases: [unknown, string][] = [
      [thrown(() => repeatCycles(0, true, 0)), 'build.req.err.days'],
      [thrown(() => tradePlane({ ...req, ltan: undefined }, {})), 'build.req.err.plane'],
      [thrown(() => tradeRow({ ...req, stations: ['atlantis'] }, tpl, { revs: 385, days: 26 }, opts)), 'build.req.err.station'],
      [thrown(() => tradeRow(req, { ...tpl, payload: null }, { revs: 385, days: 26 }, opts)), 'build.req.err.camera'],
      [thrown(() => focalLengthForGsd(600e3, 13e-6, -1)), 'build.req.err.input'],
      [thrown(() => altitudesForLifetimes({ ...lifetimeRequestFor(tpl, THEOS2, JD0), years: [0] })), 'build.req.err.lifetime'],
      [thrown(() => circularOrbit(9000e3, { sso: true, ltan: 10 }, JD0)), 'build.req.err.noSso'],
      [thrown(() => meanForces('extreme' as never)), 'build.req.err.level'],
      [thrown(() => powerAtWorstBeta({ orbit: { ...designOrbit(tpl.orbit, JD0), e: 0.1 }, dayLoad: 1, eclipseLoad: 1, regulation: 'PPT', cellEff: 0.3, Id: 0.77, degPerYear: 0, years: 1, mount: 'body', dod: 0.3, batteryEff: 0.9 })), 'build.req.err.power'],
      [thrown(() => designFigures({ ...tpl, lifeYears: -1 }, JD0)), 'build.req.err.design'],
      [new DOMException('Cancelled', 'AbortError'), 'build.req.err.stopped'],
      [new Error('something no core says'), 'build.req.err.failed'],
    ];
    for (const [e, key] of cases) {
      expect(errorKey(e), String(e)).toBe(key);
      // a worker hands the error back as a plain Error with the same message
      if (e instanceof RangeError) expect(errorKey(new Error(e.message))).toBe(key);
    }
  });
});

describe('a row\'s link and camera are the bench\'s (D07 → D06)', () => {
  it('for each template with a camera, at a row\'s orbit', () => {
    for (const id of REQ_TEMPLATES) {
      const form: RequirementsForm = { ...DEFAULT_FORM, template: id, gsd: id === 'napa2' ? 5 : 0.5 };
      const tpl = templateDesign(id);
      const req = missionRequirements(form);
      const row = tradeRow(req, tpl, { revs: 15, days: 1 }, tradeOptionsFor(tpl, form, JD0, null))!;
      // the template itself, flown at the row's orbit: the bench's highest rate at 3 dB is the row's
      const at: SatelliteDesign = { ...tpl, orbit: { perigee: row.altitude, apogee: row.altitude, inclination: row.inclination / DEG, sso: true, ltan: req.ltan } };
      const fig = designFigures(at, JD0);
      expect(rel(fig.link.maxRate.value, row.maxRate), id).toBeLessThanOrEqual(1e-9);
      // and the aperture the row sizes resolves the GSD asked at the bench's wavelength
      const withAperture = designFigures({ ...at, payload: { ...at.payload!, aperture: row.aperture, focalLength: row.focalLength } }, JD0);
      expect(rel(withAperture.camera!.diffraction.value, form.gsd), id).toBeLessThanOrEqual(1e-9);
      expect(rel(withAperture.camera!.gsd.value, form.gsd), id).toBeLessThanOrEqual(1e-9);
    }
  });
});

describe('what the lifetime, disposal and binds columns say (D07)', () => {
  const tpl = templateDesign('napa2');
  const form: RequirementsForm = { ...DEFAULT_FORM, template: 'napa2', gsd: 5, lifeYears: 1, revisitDays: 1 };
  const req = missionRequirements(form);
  const search = (years: number, lo: number, hi: number): AltitudeForLifetime => ({ years, outcome: 'found', altitude: (lo + hi) / 2, lo, hi, runs: [] });
  const rowWith = (lifetime: AltitudeForLifetime[]): TradeRow => tradeRow(req, tpl, { revs: 15, days: 1 }, tradeOptionsFor(tpl, form, JD0, lifetime))!;

  it('says a row inside the lifetime search\'s bracket is not proven to last, not an infinite ratio', () => {
    const probe = rowWith([search(1, 400e3, 410e3), search(26, 600e3, 610e3)]);
    const h = probe.altitude;
    const inside = rowWith([search(1, h - 5e3, h + 5e3), search(26, h + 100e3, h + 110e3)]);
    expect(inside.life!.lasts).toBe(false);
    expect(inside.ratios.lifetime).toBe(Infinity); // NAPA-2 has no engine
    expect(lifeState(inside, [search(1, h - 5e3, h + 5e3), search(26, h + 100e3, h + 110e3)]).kind).toBe('notProven');
    expect(standing(inside, 'lifetime', [search(1, h - 5e3, h + 5e3), search(26, h + 100e3, h + 110e3)])).toEqual({ kind: 'notProvenLife' });
    // below the bracket: held (and with no engine, nothing to hold it with)
    const below = [search(1, h + 5e3, h + 15e3), search(26, h + 100e3, h + 110e3)];
    const b = rowWith(below);
    expect(lifeState(b, below).kind).toBe('held');
    expect(standing(b, 'lifetime', below)).toEqual({ kind: 'noEngine' });
    // above: lasts, and inside the 25-year search's bracket not proven to come down in time
    const above = [search(1, h - 100e3, h - 90e3), search(26, h - 5e3, h + 5e3)];
    const a = rowWith(above);
    expect(lifeState(a, above).kind).toBe('lasts');
    expect(disposalState(a, above).kind).toBe('notProven');
    expect(standing(a, 'disposal', above)).toEqual({ kind: 'notProvenDown' });
    const wellAbove = [search(1, h - 100e3, h - 90e3), search(26, h - 50e3, h - 40e3)];
    const w = rowWith(wellAbove);
    expect(disposalState(w, wellAbove)).toMatchObject({ kind: 'burn' });
    const d = disposalState(w, wellAbove) as { dvLow: number; dvHigh: number };
    expect(d.dvLow).toBeLessThan(d.dvHigh);
    expect(disposalState(rowWith(above.slice(0, 1).concat(search(26, h + 100e3, h + 110e3))), null).kind).toBe('inTime');
    expect(lifeState(rowWith([]), null).kind).toBe('none');
  });

  it('draws lifetime against altitude from the search\'s runs that came down, and aperture against altitude from the rows', () => {
    const results: AltitudeForLifetime[] = [
      { ...search(1, 400e3, 410e3), runs: [{ altitude: 150e3, lifetime: 1e4 }, { altitude: 5000e3, lifetime: null }, { altitude: 400e3, lifetime: 0.5 * YEAR }] },
      { ...search(26, 600e3, 610e3), runs: [{ altitude: 400e3, lifetime: 0.5 * YEAR }, { altitude: 600e3, lifetime: 20 * YEAR }] },
    ];
    expect(lifetimePoints(results)).toEqual([{ altitude: 150e3, years: 1e4 / YEAR }, { altitude: 400e3, years: 0.5 }, { altitude: 600e3, years: 20 }]);
    const rows = [rowWith([]), tradeRow(req, tpl, { revs: 14, days: 1 }, tradeOptionsFor(tpl, form, JD0, null))!];
    const pts = aperturePoints(rows);
    expect(pts[0].altitude).toBeLessThan(pts[1].altitude);
    expect(rel(pts[0].aperture / pts[0].altitude, pts[1].aperture / pts[1].altitude)).toBeLessThanOrEqual(1e-12);
  });
});

describe('a row opened on the bench (D07 → D06, map §3 round trip)', () => {
  it('works THEOS-2\'s case, and the design the bench gets meets every requirement the row claims met', async () => {
    const tpl = templateDesign('theos2');
    const req = missionRequirements(THEOS2);
    const lifetime = altitudesForLifetimes(lifetimeRequestFor(tpl, THEOS2, JD0));
    expect(lifetime.map((r) => r.outcome)).toEqual(['found', 'found']);
    const opts = tradeOptionsFor(tpl, THEOS2, JD0, lifetime);
    const row = tradeRow(req, tpl, { revs: 385, days: 26 }, opts)!;
    expect(Math.abs(row.altitude / 1e3 - 621)).toBeLessThanOrEqual(1);
    expect(Math.abs(row.inclination / DEG - 97.91)).toBeLessThanOrEqual(0.1);
    expect(tpl.payload!.pixelPitch).toBe(13e-6);
    expect(Math.abs(row.focalLength - 16.1)).toBeLessThanOrEqual(0.08);

    const opened = benchDesign(tpl, row, req, JD0, THEOS2.activity, 'test', 'test');
    if (!opened.ok) throw new Error(`not opened: ${opened.key}`);
    const { design: d, figures: fig } = opened;
    const claimed = REQUIREMENTS.filter((k) => !Number.isNaN(row.ratios[k]) && !row.unmet.includes(k));
    // with a 30° tilt, the life asked and the 25-year rule, THEOS-2's own orbit meets all but the camera: the template's
    // 16.1 m gives 0.5014 m from 621.07 km, so the row asks for a camera 0.30 % longer (CHANGED AFTER THE FIRST RUN: the
    // first run expected 'gsd' among the claims; it is a premise of this test, not a tolerance)
    expect(claimed).toEqual(['revisit', 'data', 'lifetime', 'disposal']);
    expect(row.unmet).toEqual(['gsd']);
    expect(rel(row.ratios.gsd, row.focalLength / tpl.payload!.focalLength)).toBeLessThanOrEqual(1e-12);
    expect(row.ratios.gsd).toBeGreaterThan(1);
    expect(row.ratios.gsd).toBeLessThan(1.004);
    const o = designOrbit(d.orbit, JD0);

    // gsd, not claimed, still met on the bench: the design carries the camera the row sizes, so the bench's GSD and
    // diffraction limit are the GSD asked; its focal length is the template's and a little more, its aperture within the template's
    expect(fig.camera!.gsd.value).toBeLessThanOrEqual(req.gsd * (1 + 1e-9));
    expect(fig.camera!.diffraction.value).toBeLessThanOrEqual(req.gsd * (1 + 1e-9));
    expect(d.payload!.focalLength).toBeGreaterThan(tpl.payload!.focalLength);
    expect(d.payload!.aperture).toBeLessThanOrEqual(tpl.payload!.aperture * (1 + 1e-9));
    // revisit: seen from the design's orbit, with the bench's swath and the tilt the page asked
    const reach = fig.camera!.swath!.value / 2 + (sideReach(fig.camera!.altitude.value, THEOS2.tiltDeg * DEG) ?? 0);
    const target = { lat: req.target.lat * DEG, lon: req.target.lon * DEG, h: 0 };
    const seen = revisitGaps(o, target, reach, JD0, repeatPeriod(o, 385), true, { periodic: true });
    expect(seen.maxGap).toBeLessThanOrEqual(req.revisitDays * (1 + 1e-12));
    // data: the bench's link closes with 3 dB at the design's rate, and that rate over the contact brings the day's data down
    expect(fig.link.margin.value).toBeGreaterThanOrEqual(3 - 1e-9);
    const heard = contactTime(o, [stationOf(d.comms.station)!], d.comms.minElDeg * DEG, JD0, repeatPeriod(o, 385));
    expect(d.comms.dataRate * heard.perDay).toBeGreaterThanOrEqual(req.dataPerDay * (1 - 1e-9));
    // power as the bench sizes it: not short
    expect(fig.power.margin!.value).toBeGreaterThanOrEqual(-1e-9);
    expect(fig.power.depth.value).toBeLessThanOrEqual(d.power.dod + 1e-9);
    expect(satelliteChecks(d, fig).filter((s) => s.level === 'fail')).toEqual([]);
    // lifetime and the 25-year rule: the bench's own P07 run (src/ui/build/satellite-bench.ts runLifetime, its options)
    const h = designHandoff(d, JD0, 'test')!;
    const res = await runLifetimeJob({
      r0: h.r, v0: h.v, jd0: h.jd,
      options: {
        method: 'mean', duration: (d.lifeYears + 25) * YEAR,
        forces: { j2: true, j3j4: true, drag: true, sun: false, moon: false, srp: false, activity: levelActivity(THEOS2.activity) },
        spacecraft: lifetimeSpacecraft(d), samples: 600, tolerance: 1e-9,
      },
    }, new AbortController().signal, () => {});
    expect(res.lifetime === null || res.lifetime > d.lifeYears * YEAR).toBe(true);
    const held = !!d.propulsion;
    expect(res.lifetime !== null && res.lifetime <= ((held ? 0 : d.lifeYears) + 25) * YEAR).toBe(true);
    // the bench's Δv budget holds whatever it plans for the end of life
    expect(fig.dv.margin.value).toBeGreaterThanOrEqual(-1e-9);

    // the row beside the bench: the same figures, but the four that differ, each with its reason
    const lines = compareWithBench(row, req, tpl, opened);
    const differ = lines.filter((l) => !l.same).map((l) => [l.key, l.why]);
    expect(differ).toEqual([
      ['build.sat.r.eclipseWorst', 'build.req.cmp.why.eclipse'],
      ['build.req.col.array', 'build.req.cmp.why.array'],
      ['build.req.col.battery', 'build.req.cmp.why.battery'],
      ['build.req.col.maxRate', 'build.req.cmp.why.rate'],
    ]);
    const eclipse = lines.find((l) => l.key === 'build.sat.r.eclipseWorst')!;
    expect(rel(eclipse.row.value, eclipse.bench.value)).toBeLessThan(0.005);
    expect(lines.filter((l) => l.same).map((l) => l.key)).toEqual(expect.arrayContaining([
      'build.req.col.h', 'build.req.col.i', 'build.sat.f.focal', 'build.sat.f.aperture', 'build.sat.r.gsd', 'build.req.cmp.diffraction',
      'build.sat.r.swath', 'build.req.cmp.dataRate', 'build.req.cmp.margin', 'build.sat.r.dvAvailable', 'build.req.cmp.mass',
    ]));
  }, 180_000);

  it('works the TU Delft data volume exactly: 8 Mbit/s for 120 min is 57.6 Gbit, 96 Mbit/s over a 10-minute pass', () => {
    const form: RequirementsForm = { ...THEOS2, dataGbit: 57.6 };
    const req = missionRequirements(form);
    expect(gbitToBits(57.6)).toBe(8e6 * 120 * 60);
    expect(req.dataPerDay).toBe(57.6e9);
    expect(requiredDataRate(req.dataPerDay, 10 * 60)).toBe(96e6);
    // THEOS-2's row, heard for ten minutes a day: the rate and the transmitter the row would size, through the same cores
    const tpl = templateDesign('theos2');
    const opts = tradeOptionsFor(tpl, form, JD0, null);
    const base = tradeRow(req, tpl, { revs: 385, days: 26 }, opts)!;
    const rate = requiredDataRate(req.dataPerDay, 600);
    const eirpNeeded = requiredEirp({
      frequency: tpl.comms.frequency, rxGain: opts.ground.rxGain, systemTemperature: opts.ground.systemTemperature, losses: opts.ground.losses,
      requiredEbN0: tpl.comms.requiredEbN0, implementationLoss: opts.ground.implementationLoss,
      range: slantRange(R_EARTH + base.altitude, form.minElDeg * DEG), dataRate: rate,
    }, 3);
    const row: TradeRow = { ...base, contactPerDay: 600, requiredRate: rate, requiredTxPower: txPowerForEirp(eirpNeeded, tpl.comms.lineLoss, opts.txGain) };
    const opened = benchDesign(tpl, row, req, JD0, form.activity, 'tud', 'tud');
    if (!opened.ok) throw new Error(`not opened: ${opened.key}`);
    expect(opened.design.comms.dataRate).toBe(96e6);
    expect(opened.design.comms.dataRate * 10 * 60).toBe(57.6e9);
    expect(Math.abs(opened.figures.link.margin.value - 3)).toBeLessThanOrEqual(3e-9);
  });

  it('refuses a row whose camera the bench cannot take, naming the field, and raises a transmitter below the bench\'s smallest', () => {
    const tpl = templateDesign('theos2');
    // 0.5 m from some 4 000 km needs a focal length past the bench's 100 m
    const req = missionRequirements({ ...DEFAULT_FORM });
    const high = tradeRow(req, tpl, { revs: 8, days: 1 }, tradeOptionsFor(tpl, DEFAULT_FORM, JD0, null))!;
    expect(high.focalLength).toBeGreaterThan(100);
    expect(benchDesign(tpl, high, req, JD0, 'moderate', 'x', 'x')).toEqual({ ok: false, key: 'build.req.open.outside', field: 'build.sat.f.focal' });
    // a gigabit a day through an 11 m dish needs well under a milliwatt
    const small = { ...DEFAULT_FORM, dataGbit: 1 };
    const sreq = missionRequirements(small);
    const row = tradeRow(sreq, tpl, { revs: 15, days: 1 }, tradeOptionsFor(tpl, small, JD0, null))!;
    expect(row.requiredTxPower).toBeLessThan(1e-3);
    const opened = benchDesign(tpl, row, sreq, JD0, 'moderate', 'x', 'x');
    if (!opened.ok) throw new Error(opened.key);
    expect(opened.txRaised).toBe(true);
    expect(opened.design.comms.txPowerW).toBe(1e-3);
    expect(opened.figures.link.margin.value).toBeGreaterThan(3);
    expect(compareWithBench(row, sreq, tpl, opened).find((l) => l.key === 'build.req.cmp.margin')!.why).toBe('build.req.cmp.why.txRaised');
  });
});

