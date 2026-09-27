/**
 * The ballistic coefficient fitted to an object's own decay (roadmap P2.5,
 * for M03), and re-entries predicted from a first element set. The
 * tolerances below were fixed before the comparisons unless a comment says
 * otherwise; where a fixed one was missed the test records what was found,
 * says so, and VALIDATION.md §7 gives the whole table.
 *
 * - **Two element sets of each sphere**, its first and its last (CelesTrak),
 *   give a B within 30 % of the sphere's known C_D A/m (C_D 2.2, its
 *   published diameter and mass): the fit takes in the density model's own
 *   error, which on these spheres is some 20 % (VALIDATION.md §6). Met.
 * - **The rocket stages of 2023–2025** (tests/fixtures/reentry/stages.json:
 *   every stage GCAT has re-entering uncontrolled, dated to the minute, 5 to
 *   150 days after launch — 66): fixed before, at least 70 % inside the ±20 %
 *   window predicted from the first element set with B from its decay rate,
 *   of at least 20 so predicted. Missed: only 14 first sets carry a decay
 *   rate that gives a B, and 7 of the 13 predicted came down inside. The
 *   stages' mass is GCAT's dry mass since the P2.5 fix-up (it was the mass at
 *   insertion); the counts the size arm found are recorded with both. A
 *   screen written after the results (the first set not the stage's, a stage
 *   built to fire after its payloads are away, an eccentric perigee lowered
 *   by more than drag can) is applied to all 66 and reported beside the
 *   unscreened counts, which stay the result of record.
 * - **NAPA-2** (src/data/napa2.ts): its lifetime from its first element set
 *   within 25 %, as a tumbling box of its published size and mass (met,
 *   +8 %) and with B fitted to that set's decay (missed, −28 %).
 */
import { describe, expect, it } from 'vitest';
import spheres from './fixtures/space-weather/spheres.json';
import stages from './fixtures/reentry/stages.json';
import HISTORY from '../src/data/solar-daily.json';
import { measuredActivity, type SolarDaily } from '../src/physics/propagator/activity';
import { ballisticFromDecayRate, ballisticFromSets, craftOfB } from '../src/orbit/ballistic';
import { ECCENTRIC, WINDOW_FRACTION, predictReentry, tumblingBoxArea, tumblingCylinderArea, type Reentry } from '../src/orbit/reentry';
import { NAPA2 } from '../src/data/napa2';
import { predictFromRequest } from '../src/orbit/reentry-job';
import { elementsFromRecord } from '../src/orbit/omm';
import { meanStart } from '../src/orbit/mean-state';
import { R_EARTH } from '../src/physics/constants';
import type { ElementSet } from '../src/orbit/tle';
import type { OmmRecord } from '../src/provider/satellites';

const measured = measuredActivity(HISTORY as SolarDaily, null).series;
const jdOf = (iso: string): number => Date.parse(iso) / 86400000 + 2440587.5;
const inside = (p: Reentry, actual: number): boolean => p.window !== null && actual >= p.window[0] && actual <= p.window[1];

describe('B from two element sets (P2.5)', () => {
  it.each(spheres.spheres.map((s) => [s.name, s] as const))('%s: within 30 % of its known C_D A/m', (_, s) => {
    const b = ballisticFromSets([elementsFromRecord(s.elements as OmmRecord), elementsFromRecord(s.last as OmmRecord)], measured);
    const known = (2.2 * Math.PI * (s.diameter / 2) ** 2) / s.mass;
    expect(b).not.toBeNull();
    expect(Math.abs(b! / known - 1), `${b!.toExponential(3)} against ${known.toExponential(3)}`).toBeLessThan(0.3);
  }, 60_000);

  it('asks for two sets a day apart, the later one lower', () => {
    const s = spheres.spheres[0];
    const first = elementsFromRecord(s.elements as OmmRecord);
    expect(ballisticFromSets([first], measured)).toBeNull();
    expect(ballisticFromSets([first, first], measured)).toBeNull();
  });
});

describe('the prediction a page asks its worker for (P2.5)', () => {
  const s = spheres.spheres[1];
  const sets = [elementsFromRecord(s.last as OmmRecord), elementsFromRecord(s.elements as OmmRecord)];
  const craft = { mass: s.mass, area: Math.PI * (s.diameter / 2) ** 2, cd: 2.2 };

  it('fits B to a history of sets and predicts from the latest: Starshine 2 down within the day', () => {
    const a = predictFromRequest({ sets, from: 'history', craft, activity: measured, horizonDays: 30 }, () => true);
    expect(a.b).toBeCloseTo(ballisticFromSets(sets, measured)!, 12);
    // GCAT gives the day, 2002-04-26: noon ± a day, fixed before the run
    expect(Math.abs(a.reentry!.jd! - jdOf('2002-04-26T12:00:00Z'))).toBeLessThan(1);
    expect(a.reentry!.from).toBeCloseTo(sets[0].jdEpoch + sets[0].jdEpochFrac, 9);
  }, 120_000);

  it('takes the mass and size given, or says when no B can be fitted', () => {
    const given = predictFromRequest({ sets: [sets[1]], from: 'size', craft, activity: measured, horizonDays: 400 }, () => true);
    expect(given.b).toBeCloseTo((2.2 * craft.area) / craft.mass, 12);
    expect(given.reentry!.jd).not.toBeNull();
    // Starshine 2's first set carries no decay (ṅ < 0)
    expect(predictFromRequest({ sets: [sets[1]], from: 'decay', craft, activity: measured, horizonDays: 400 }, () => true)).toEqual({ b: null, reentry: null });
  }, 60_000);
});

describe('the rocket stages of 2023–2025, from their first element sets (P2.5)', () => {
  const list = stages.stages.map((s) => ({ s, el: elementsFromRecord(s.elements as OmmRecord), actual: jdOf(s.reentry) }));
  // each arm is run once and read by the tests below (vitest runs a file's tests in order)
  let fitRuns: ReturnType<typeof fitArm> | null = null;
  let sizeRuns: ReturnType<typeof sizeArm> | null = null;
  const fitArm = () => list.map((x) => ({ ...x, b: ballisticFromDecayRate(x.el, measured) })).filter((x) => x.b !== null)
    .map((x) => ({ ...x, p: predictReentry(x.el, craftOfB(x.b!), measured, 400) }));
  const sizeArm = () => list.filter((x) => x.s.mass && x.s.length && x.s.diameter).map((x) => ({
    ...x, eccentric: x.s.elements.ECCENTRICITY >= ECCENTRIC,
    p: predictReentry(x.el, { mass: x.s.mass!, area: tumblingCylinderArea(x.s.length!, x.s.diameter!), cd: 2.2 }, measured, 400),
  }));
  const fits = () => (fitRuns ??= fitArm());
  const sizes = () => (sizeRuns ??= sizeArm());

  it('fits B to the first set\'s decay rate where it carries one: the finding', () => {
    const fitted = fits();
    const predicted = fitted.filter((x) => x.p.jd !== null);
    // fixed before: at least 20 predicted, 70 % inside; found: 14 fitted, 13 predicted, 7 inside
    expect(fitted.length).toBe(14);
    expect(predicted.length).toBe(13);
    expect(predicted.filter((x) => inside(x.p, x.actual)).length).toBe(7);
    expect(WINDOW_FRACTION).toBe(0.2);
  }, 300_000);

  it('predicts them as tumbling cylinders of GCAT\'s size and mass, transfer orbits with the Sun and the Moon', () => {
    const res = sizes();
    expect(res.length).toBe(66);
    // the mass is GCAT's DryMass, the mass after the active life, where it gives one (P2.5 fix-up):
    // until 2026-09-27 the fixture read GCAT's Mass, the mass at insertion, which differs for the four
    // Long March third stages (8 400 kg against 2 800 kg), all four in transfer orbits
    expect(stages.stages.filter((s) => s.massFrom === 'DryMass' && s.gcat.mass !== s.gcat.dryMass).length).toBe(4);
    // found, and recorded after the run: 33 of 66 inside the window, 29 of 58 near-circular, 4 of 8
    // transfer orbits — the same counts with either mass column
    expect(res.filter((x) => inside(x.p, x.actual)).length).toBe(33);
    const transfer = res.filter((x) => x.eccentric);
    expect(transfer.length).toBe(8);
    expect(transfer.filter((x) => inside(x.p, x.actual)).length).toBe(4);
    // within 25 % of the day: 5 of the 8 with the dry mass, 6 with the mass at insertion (the Long March
    // 7A Y6 goes from −22 % to −27 %); the Long March 7A Y13, which stayed up past 400 days at 8 400 kg,
    // comes down at 2 800 kg, nine times too late; H3 F4 stays up with either. With the mean elements,
    // which leave the Sun and the Moon out, 5 stayed up past 400 days
    expect(transfer.filter((x) => x.p.jd !== null && Math.abs((x.p.jd - x.p.from) / (x.actual - x.p.from) - 1) < 0.25).length).toBe(5);
    expect(transfer.filter((x) => x.p.jd === null).map((x) => x.s.name)).toEqual(['H3 F4 Stage 2']);
  }, 600_000);

  /*
   * A screen over all 66 for cases that are not a natural decay from the orbit
   * of the first set (P2.5 fix-up). Its rules were written AFTER the results
   * above were seen, prompted by the worst misses; they are general, computed
   * from the fixture (GCAT's own catalogued orbit, bus and motor, and the
   * first set), and applied to every stage, and the unscreened counts above
   * stay the result of record. Each rule, with its physical reason:
   *
   * (a) The first set is not the stage's: its mean perigee differs from GCAT's
   *     catalogued perigee by more than 25 km while GCAT's orbit is dated within
   *     3 days of the set's epoch. Drag cannot move a perigee of 150–350 km by
   *     25 km in 3 days without bringing the stage down, and the mean (Kozai)
   *     and catalogued conventions differ by a few km only. Prompted by
   *     Electron 43 stage 2, whose first set is the payload stack's 515 × 537 km
   *     where GCAT puts the stage at 179 × 527 km.
   * (b) A stage built to fire after deploying its payloads, so that its orbit
   *     can change after the first set: by GCAT's `Motor`, each engine with its
   *     source (`POST_DEPLOYMENT_BURN`).
   * (c) An eccentric orbit (e ≥ `ECCENTRIC`) whose GCAT orbit, dated after the
   *     set, has its perigee more than 30 km below the first set's. On such an
   *     orbit drag takes the apogee down far faster than the perigee, which
   *     hardly moves until the orbit is nearly circular (D. King-Hele, Satellite
   *     Orbits in an Atmosphere, 1987), so a perigee lowered that far was a burn
   *     or venting, not decay. (The Sun and the Moon move such a perigee too,
   *     and the model carries them; for the two stages the rule catches, Cowell
   *     with them keeps the perigee within some 10 km of the first set's over
   *     those weeks — the P2.5 fix-up's diagnosis, VALIDATION.md §7.)
   */
  const POST_DEPLOYMENT_BURN: Record<string, string> = {
    // Rocket Lab, Electron Payload User Guide 8.0, pp. 17–19: the kick stage's sequence ends with
    // "Final engine burn to lower Kick Stage altitude and accelerate deorbiting"
    Curie: 'Rocket Lab Electron Payload User Guide 8.0',
  };
  const meanPerigeeKm = (el: ElementSet, e: number): number => (meanStart(el).a * (1 - e) - R_EARTH) / 1000;
  const screen = (x: (typeof list)[number]): string[] => {
    const e = x.s.elements.ECCENTRICITY;
    const per = meanPerigeeKm(x.el, e);
    const g = x.s.gcat.orbit;
    const dated = g.date === null ? null : jdOf(`${g.date}T12:00:00Z`) - (x.el.jdEpoch + x.el.jdEpochFrac);
    const why: string[] = [];
    if (g.perigee !== null && dated !== null && Math.abs(per - g.perigee) > 25 && Math.abs(dated) <= 3) why.push('a');
    if (x.s.gcat.motor in POST_DEPLOYMENT_BURN) why.push('b');
    if (e >= ECCENTRIC && g.perigee !== null && dated !== null && dated > 0 && per - g.perigee > 30) why.push('c');
    return why;
  };

  it('screens out, by rules made after the results, the stages whose first set is not a natural decay\'s start', () => {
    const caught = list.map((x) => ({ name: x.s.name, why: screen(x) })).filter((x) => x.why.length > 0);
    // found: each rule's catch. (a) also catches Electron 77 stage 2, whose first set (rev 13) decays
    // as its 177-km perigee should — both arms bring it down inside — against GCAT's 263 km: there
    // GCAT's orbit looks the odd one, and the rule excludes a good case. The rule is kept as written.
    expect(caught).toEqual([
      { name: 'Electron 43 Stage 2', why: ['a'] },
      { name: 'H3 F4 Stage 2', why: ['c'] },
      { name: 'Electron 67 Kick Stage', why: ['b'] },
      { name: 'CZ-7A Y13 Stage 3', why: ['c'] },
      { name: 'Electron 77 Stage 2', why: ['a'] },
    ]);
    const kept = (x: (typeof list)[number]): boolean => screen(x).length === 0;
    // the size arm, screened, beside the unscreened 33 of 66 (29 of 58, 4 of 8)
    const size = sizes().filter(kept);
    expect(size.length).toBe(61);
    expect(size.filter((x) => inside(x.p, x.actual)).length).toBe(32);
    expect(size.filter((x) => !x.eccentric).length).toBe(55);
    expect(size.filter((x) => !x.eccentric && inside(x.p, x.actual)).length).toBe(28);
    expect(size.filter((x) => x.eccentric && inside(x.p, x.actual)).length).toBe(4);
    // the fitted arm, screened, beside the unscreened 7 inside of 13 predicted (14 fitted)
    const fit = fits().filter(kept);
    expect(fit.length).toBe(12);
    expect(fit.filter((x) => x.p.jd !== null).length).toBe(12);
    expect(fit.filter((x) => inside(x.p, x.actual)).length).toBe(6);
  }, 600_000);

  it('splits the size arm by whether GCAT\'s mass is its own estimate: the finding', () => {
    // GCAT's "?" flag: "an estimate, hopefully good to about 20 percent"; the split is reported, nothing
    // refitted. Found: 26 of the 43 estimated masses inside, 7 of the 23 unflagged (the Soyuz Blok-I and
    // the Long March 2F stage 2 among them, early by 10 to 65 %)
    const res = sizes();
    const estimate = res.filter((x) => x.s.gcat[x.s.massFrom === 'DryMass' ? 'dryFlag' : 'massFlag'] === '?');
    const other = res.filter((x) => !estimate.includes(x));
    expect([estimate.length, estimate.filter((x) => inside(x.p, x.actual)).length]).toEqual([43, 26]);
    expect([other.length, other.filter((x) => inside(x.p, x.actual)).length]).toEqual([23, 7]);
  }, 600_000);
});

describe('NAPA-2 (P2.5)', () => {
  const el = elementsFromRecord(NAPA2.elements);
  // GCAT gives the day: noon, ±half a day of some 1 800
  const actual = jdOf(`${NAPA2.decay}T12:00:00Z`) - (el.jdEpoch + el.jdEpochFrac);

  it('lasts within 25 % as a tumbling box of its published size and mass', () => {
    const p = predictReentry(el, { mass: NAPA2.mass, area: tumblingBoxArea(NAPA2.size), cd: 2.2 }, measured, 3000);
    expect(Math.abs((p.jd! - p.from) / actual - 1)).toBeLessThan(0.25);
  }, 60_000);

  it('with B fitted to its first set\'s decay comes down 28 % early: the finding', () => {
    const b = ballisticFromDecayRate(el, measured);
    expect(b).not.toBeNull();
    const p = predictReentry(el, craftOfB(b!), measured, 3000);
    // fixed before: within 25 %; found −27.9 %; this bound records it, set after the run
    const err = (p.jd! - p.from) / actual - 1;
    expect(err).toBeLessThan(-0.25);
    expect(err).toBeGreaterThan(-0.3);
  }, 60_000);
});
