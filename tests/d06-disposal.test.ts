/**
 * The satellite builder's propellant budget (roadmap D06; Phase 4 map §2.2 C):
 * src/orbit/disposal.ts held to the published figures and closed forms the
 * map names, V-V1 to V-V4. Every bound below was written in this comment, and
 * committed, before the first run of this file; a bound changed after a run
 * says so where it is.
 *
 * - **V-V1**, M.J. Patterson and S.R. Oleson, "Low-Power Ion Propulsion for
 *   Small Spacecraft", NASA TM-113111 (1997), Table III
 *   (https://ntrs.nasa.gov/api/citations/19980017819/downloads/19980017819.pdf):
 *   a 430 kg geostationary satellite (Indostar-1), ten years of north–south
 *   station keeping at 45 m/s a year, 450 m/s; hydrazine at 223 s needs
 *   79.9 kg. `propellantFor` within **±0.1 kg** (the map's bound), and it is
 *   `deltaVAvailable`'s inverse to 1e-9. Not in the map's table: the same
 *   Table III's arcjet (450 s, 43.6 kg) and xenon ion (2960 s, 7.6 kg) rows,
 *   which the references report could not reproduce (41.7 and 6.6 kg). The
 *   paper cants those thrusters 17° and 30° off the north–south axis to keep
 *   the plumes off the arrays, so each must give Δv/cos(cant). Worked by hand
 *   (roughly 43.5 and 7.6 kg) before this bound was written: **±0.1 kg** as
 *   for hydrazine; a miss is recorded, not loosened. Found: ion 7.63 kg, met;
 *   arcjet 43.49 kg, 0.109 under, missed — recorded below.
 * - **V-V2**, S.M. Hull, "End of Mission Considerations", NTRS 20130000278
 *   (New SMAD ch. 30), Fig. 30.2-1, p. 6
 *   (https://ntrs.nasa.gov/api/citations/20130000278/downloads/20130000278.pdf):
 *   "Raise perigee to 2000 km" is the Hohmann transfer to the 2000 km circle,
 *   658.9 m/s from 600 km and 83.8 m/s from 1800 km (computed in the map);
 *   `hohmannDv` to **±0.1 m/s** of those, and to **±10 m/s** of the plot as
 *   read (about 660 and 85).
 * - **V-V2b**, the same figure's "Lower to < 25 yr lifetime" curve, A/M =
 *   0.01 m²/kg, read (references report) as 0 m/s from 600 km, 70 from 800,
 *   130 from 1000, 250 from 1400, 335 from 1800, each ±10 m/s. Checked through
 *   P07, not as a number (map): lowered by `perigeeLowerDv` with the read
 *   value **plus its 10 m/s reading error**, the mean-element lifetime at
 *   ECSS's moderate level must be **at most 25 years**. Hull gives neither
 *   C_D, inclination nor year ("depending on … launch year"): C_D 2.2 (the
 *   free-molecular value src/physics/propagator/spacecraft.ts uses), 55°
 *   (FireSat II's orbit in the same chapter, §30.6.1), 2026-01-01.
 * - **V-V3**, IADC Space Debris Mitigation Guidelines, IADC-02-01 Rev. 4,
 *   §5.3.1.1, doc p. 13, as UN A/AC.105/C.1/2025/CRP.9
 *   (https://www.unoosa.org/res/oosadoc/data/documents/2025/aac_105c_12025crp/aac_105c_12025crp_9_0_html/AC105_C1_2025_CRP09E.pdf):
 *   ΔH = 235 km + 1000·C_R·A/m. C_R 1.2 and A/m 0.01 m²/kg give 247 km and
 *   8.97 m/s; C_R 1.5 and 0.02, 265 km and 9.62 m/s (the Δv computed in the
 *   references report, IADC gives none): **±0.01 km, ±0.01 m/s**. The map's
 *   v·ΔH/(2a) is the transfer's first-order term: it must lie above the
 *   exact transfer by no more than the factor 1/(1 − ¾·ΔH/a).
 * - **V-V4**, B.T.C. Zandbergen, *Spacecraft bus design and sizing*, TU Delft
 *   2020, Fig. 11, book p. 26 (https://repository.tudelft.nl/file/File_124a068a-158f-4b40-a44f-9ba407a14845):
 *   ten-year average north–south station keeping 45.5 m/s a year; at the
 *   map's 0.85° a year, `nsskPerYear` within **±0.5 m/s a year**.
 * - **Closed forms** (map §2.2 C): the perigee lowered to 50 km (Hull's
 *   controlled re-entry, PDF p. 5) costs 156.7 m/s from 600 km, 182.8 from 700
 *   and 208.3 from 800: **±0.1 m/s**; and it is the O02 planner's `deorbit`
 *   burn on a circle to **1e-6 m/s**.
 * - **The Δv allocation** against TU Delft Fig. 11's budget for a 15-year
 *   geostationary satellite: apogee kick 1836.49 m/s, 10-year average
 *   north–south 682.0 m/s and east–west 19.9 m/s over 15 years, disposal
 *   10.88 m/s, total ("most favourable") 2549.3 m/s: **±0.1 m/s** (the sum of
 *   printed figures, each rounded to 0.05 at most).
 * - **The templates' Δv** (map §2.2 C, a recorded check; Isp·g₀·ln(1/(1 −
 *   propellant fraction)) of src/data/satellites.ts): comsat 1882, weather
 *   1683, navigation 1084, science 184 m/s, **±0.5 m/s** (the printed
 *   digit); earthObs 232.5 m/s (map §1.3; the task's list writes 232),
 *   **±0.05 m/s**. And the comsat's tanks cover Fig. 11's apogee kick but not
 *   the kick and 15 years of north–south station keeping: the map's point,
 *   which D06 must say.
 * - **Drag make-up**, an identity: on an equatorial circle, (v/2a)·|ȧ|·1 yr
 *   from `dragRates` is the mean of the drag deceleration ½ρC_D(A/m)v_r²
 *   (`dragForce` over the mass) round the orbit, times the year. The test
 *   averages 720 points against the propagator's 24: **1e-4 relative**. And
 *   ECSS low < moderate < high.
 *
 * Source defects recorded, not tuned away: Hull (p. 10) gives C_R "typically
 * 1 – 2 kg/m²"; C_R has no unit, and IADC gives 1.2 to 1.5.
 */
import { describe, expect, it } from 'vitest';
import {
  CONTROLLED_REENTRY_PERIGEE, GEO_RADIUS_IADC, YEAR, disposalCore, dragForce, dragMakeupPerYear, dvAllocation, graveyardRaise,
  nsskPerYear, perigeeLowerDv, propellantFor,
} from '../src/orbit/disposal';
import { deltaVAvailable, type Craft } from '../src/orbit/budget';
import { deorbit, hohmannDv, isPlan } from '../src/orbit/maneuvers';
import type { Orbit } from '../src/orbit/kepler';
import { SATELLITES } from '../src/data/satellites';
import { DEG, MU_EARTH, OMEGA_EARTH, R_EARTH } from '../src/physics/constants';
import { propagate } from '../src/physics/propagator/propagate';
import { airDensity } from '../src/physics/propagator/density';
import { ALL_FORCES } from '../src/physics/propagator/forces';
import { ECSS_LEVELS } from '../src/physics/propagator/activity';

const KM = 1000;
/** 2026-01-01 00:00 UTC */
const JD = 2461041.5;
const within = (x: number, ref: number, tol: number, what: string): void => {
  expect(Math.abs(x - ref), `${what}: ${x} against ${ref} ± ${tol}`).toBeLessThanOrEqual(tol);
};

describe('V-V1: propellant for a Δv (Patterson & Oleson, TM-113111, Table III)', () => {
  it('430 kg, 450 m/s of station keeping, hydrazine at 223 s: 79.9 kg ± 0.1', () => {
    within(propellantFor(430, 450, 223), 79.9, 0.1, 'hydrazine');
  });

  it('is deltaVAvailable\'s inverse', () => {
    const p = propellantFor(430, 450, 223);
    const craft: Craft = { mass: 430, propellant: p, isp: 223, thrust: 4.45 };
    expect(Math.abs(deltaVAvailable(craft) / 450 - 1)).toBeLessThan(1e-9);
  });

  it('the xenon ion row (30° cant), giving Δv/cos(cant): 7.6 kg ± 0.1', () => {
    within(propellantFor(430, 450 / Math.cos(30 * DEG), 2960), 7.6, 0.1, 'xenon ion');
  });

  it('the arcjet row (17° cant) comes out 0.11 kg under the table\'s 43.6: the finding', () => {
    // fixed before: 43.6 ± 0.1 kg; found 43.49 kg (−0.109), missed. The cant takes 41.69 kg (none) to
    // 43.49, 94 % of the way to the table; the rest is not in the paper's text (17.5° would give 43.60).
    // This bound records the miss; it was set after the first run.
    const arcjet = propellantFor(430, 450 / Math.cos(17 * DEG), 450);
    expect(43.6 - arcjet).toBeGreaterThan(0.1);
    expect(43.6 - arcjet).toBeLessThan(0.12);
  });
});

describe('V-V2: to the 2000 km storage orbit (Hull, Fig. 30.2-1)', () => {
  it('is a Hohmann transfer: 658.9 m/s from 600 km, 83.8 from 1800, ± 0.1; and on the plot, ± 10', () => {
    const from600 = hohmannDv(R_EARTH + 600 * KM, R_EARTH + 2000 * KM).total;
    const from1800 = hohmannDv(R_EARTH + 1800 * KM, R_EARTH + 2000 * KM).total;
    within(from600, 658.9, 0.1, 'from 600 km');
    within(from1800, 83.8, 0.1, 'from 1800 km');
    within(from600, 660, 10, 'from 600 km, plot');
    within(from1800, 85, 10, 'from 1800 km, plot');
  });
});

describe('V-V2b: lowered to re-enter within 25 years (Hull, Fig. 30.2-1, through P07)', () => {
  // the plot as read, m/s, from each circular altitude, km
  const READ: [number, number][] = [[600, 0], [800, 70], [1000, 130], [1400, 250], [1800, 335]];
  const READING_ERROR = 10;
  const inclination = 55 * DEG;

  it.each(READ)('from %i km, lowered with %i m/s + 10: down within 25 years at the moderate level', (hKm, read) => {
    const dv = read + READING_ERROR;
    const r = R_EARTH + hKm * KM;
    const vApogee = Math.sqrt(MU_EARTH / r) - dv;
    // the perigee of the ellipse with that speed at r: v² r (r + rp) = 2 μ rp
    const rp = (vApogee * vApogee * r * r) / (2 * MU_EARTH - vApogee * vApogee * r);
    expect(perigeeLowerDv(hKm * KM, rp - R_EARTH)).toBeCloseTo(dv, 6);
    const res = propagate([r, 0, 0], [0, vApogee * Math.cos(inclination), vApogee * Math.sin(inclination)], JD, {
      method: 'mean', duration: 25 * YEAR, forces: { ...ALL_FORCES, activity: ECSS_LEVELS.moderate },
      spacecraft: { mass: 100, area: 1, cd: 2.2, cr: 1.3 },
    });
    expect(res.lifetime, `perigee ${((rp - R_EARTH) / KM).toFixed(0)} km`).not.toBeNull();
    expect(res.lifetime!).toBeLessThanOrEqual(25 * YEAR);
  }, 60_000);
});

describe('V-V3: out of the geostationary ring (IADC-02-01 Rev. 4)', () => {
  it('C_R 1.2, A/m 0.01: 247 km and 8.97 m/s; C_R 1.5, A/m 0.02: 265 km and 9.62 m/s, ± 0.01', () => {
    const a = graveyardRaise(1.2, 0.01), b = graveyardRaise(1.5, 0.02);
    within(a.dh / KM, 247, 0.01, 'rise, 1.2 and 0.01');
    within(a.dv, 8.97, 0.01, 'Δv, 1.2 and 0.01');
    within(b.dh / KM, 265, 0.01, 'rise, 1.5 and 0.02');
    within(b.dv, 9.62, 0.01, 'Δv, 1.5 and 0.02');
  });

  it('lies under the linear v·ΔH/(2a) by no more than its second-order term', () => {
    for (const [cr, am] of [[1.2, 0.01], [1.5, 0.02], [1.3, 0.05]]) {
      const { dh, dv } = graveyardRaise(cr, am);
      const linear = (Math.sqrt(MU_EARTH / GEO_RADIUS_IADC) * dh) / (2 * GEO_RADIUS_IADC);
      expect(dv).toBeLessThan(linear);
      expect(linear / dv).toBeLessThanOrEqual(1 / (1 - (0.75 * dh) / GEO_RADIUS_IADC));
    }
  });
});

describe('V-V4: north–south station keeping (TU Delft, Fig. 11)', () => {
  it('0.85° a year of drift: 45.5 m/s a year ± 0.5', () => {
    within(nsskPerYear(0.85 * DEG), 45.5, 0.5, 'NSSK');
  });
});

describe('closed forms: the perigee lowered to 50 km', () => {
  it.each([[600, 156.7], [700, 182.8], [800, 208.3]])('from %i km: %f m/s ± 0.1', (hKm, ref) => {
    within(perigeeLowerDv(hKm * KM, CONTROLLED_REENTRY_PERIGEE), ref, 0.1, `from ${hKm} km`);
  });

  it('is the O02 planner\'s deorbit burn on a circle', () => {
    for (const hKm of [400, 600, 800, 1400]) {
      const start: Orbit = { a: R_EARTH + hKm * KM, e: 0, i: 55 * DEG, raan: 0, argp: 0, m0: 0, jd0: JD };
      const plan = deorbit(start, 0, CONTROLLED_REENTRY_PERIGEE, false);
      expect(isPlan(plan)).toBe(true);
      if (isPlan(plan)) expect(Math.abs(plan.totalDv - perigeeLowerDv(hKm * KM, CONTROLLED_REENTRY_PERIGEE))).toBeLessThan(1e-6);
    }
  });

  it('refuses a raise, and is zero for no change', () => {
    expect(() => perigeeLowerDv(500 * KM, 600 * KM)).toThrow(RangeError);
    expect(perigeeLowerDv(500 * KM, 500 * KM)).toBe(0);
  });
});

describe('the Δv allocation against the tanks', () => {
  const FIG11 = { insertion: 1836.49, stationKeepingPerYear: (682.0 + 19.9) / 15, years: 15, disposal: 10.88 };
  const comsat = SATELLITES.find((s) => s.id === 'comsat')!;
  const comsatCraft: Craft = { mass: comsat.mass, propellant: comsat.propulsion!.propellantFraction * comsat.mass, isp: comsat.propulsion!.isp, thrust: comsat.propulsion!.thrust };

  it('sums TU Delft Fig. 11\'s budget: 2549.3 m/s ± 0.1', () => {
    const a = dvAllocation(FIG11, null);
    within(a.required, 2549.3, 0.1, 'Fig. 11 total');
    expect(a.stationKeeping).toBeCloseTo(701.9, 9);
    expect(a.available).toBe(0);
    expect(a.margin).toBe(-a.required);
  });

  it('holds it against deltaVAvailable: the comsat covers the apogee kick, not 15 years of station keeping (recorded)', () => {
    const a = dvAllocation(FIG11, comsatCraft);
    expect(a.available).toBe(deltaVAvailable(comsatCraft));
    expect(a.available).toBeGreaterThan(FIG11.insertion);
    expect(a.available).toBeLessThan(FIG11.insertion + 682.0);
    expect(a.margin).toBeLessThan(0);
    expect(a.margin).toBeCloseTo(a.available - a.required, 12);
  });

  it('refuses a negative line, and a craft the planner would refuse', () => {
    expect(() => dvAllocation({ ...FIG11, disposal: -1 }, null)).toThrow(RangeError);
    expect(() => dvAllocation(FIG11, { ...comsatCraft, propellant: comsatCraft.mass })).toThrow(RangeError);
  });
});

describe('the templates\' Δv (map §2.2 C, recorded)', () => {
  const available = (id: string): number => {
    const s = SATELLITES.find((x) => x.id === id)!;
    const p = s.propulsion!;
    return deltaVAvailable({ mass: s.mass, propellant: p.propellantFraction * s.mass, isp: p.isp, thrust: p.thrust });
  };
  it.each([['comsat', 1882, 0.5], ['weather', 1683, 0.5], ['navigation', 1084, 0.5], ['earthObs', 232.5, 0.05], ['science', 184, 0.5]] as const)(
    '%s: %f m/s ± %f', (id, ref, tol) => within(available(id), ref, tol, id),
  );
});

describe('drag make-up', () => {
  const sc = { mass: 100, area: 1, cd: 2.2, cr: 1.3 };

  it('is the mean drag deceleration round an equatorial circle, times a year', () => {
    const a = R_EARTH + 500 * KM, v = Math.sqrt(MU_EARTH / a);
    const o: Orbit = { a, e: 0, i: 0, raan: 0, argp: 0, m0: 0, jd0: JD };
    const N = 720;
    let sum = 0;
    for (let k = 0; k < N; k++) {
      const th = (2 * Math.PI * (k + 0.5)) / N;
      const rho = airDensity([a * Math.cos(th), a * Math.sin(th), 0], JD, ECSS_LEVELS.moderate);
      sum += dragForce(rho, sc.cd, sc.area, v - OMEGA_EARTH * a) / sc.mass;
    }
    const expected = (sum / N) * YEAR;
    expect(Math.abs(dragMakeupPerYear(o, sc, ECSS_LEVELS.moderate) / expected - 1)).toBeLessThan(1e-4);
  });

  it('grows with the Sun\'s activity', () => {
    const o: Orbit = { a: R_EARTH + 500 * KM, e: 0.001, i: 55 * DEG, raan: 0, argp: 0, m0: 0, jd0: JD };
    const [lo, mid, hi] = (['low', 'moderate', 'high'] as const).map((l) => dragMakeupPerYear(o, sc, ECSS_LEVELS[l]));
    expect(lo).toBeGreaterThan(0);
    expect(lo).toBeLessThan(mid);
    expect(mid).toBeLessThan(hi);
  });
});

describe('the contract', () => {
  it('is the DisposalCore the satellite model is written against', () => {
    expect(Object.keys(disposalCore).sort()).toEqual(
      ['dragForce', 'dragMakeupPerYear', 'dvAllocation', 'graveyardRaise', 'nsskPerYear', 'perigeeLowerDv', 'propellantFor'],
    );
  });
});
