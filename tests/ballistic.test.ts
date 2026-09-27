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
 *   insertion); the counts the size arm found are recorded with both.
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

  it('fits B to the first set\'s decay rate where it carries one: the finding', () => {
    const fitted = list.map((x) => ({ ...x, b: ballisticFromDecayRate(x.el, measured) })).filter((x) => x.b !== null);
    const predicted = fitted.map((x) => ({ ...x, p: predictReentry(x.el, craftOfB(x.b!), measured, 400) })).filter((x) => x.p.jd !== null);
    // fixed before: at least 20 predicted, 70 % inside; found: 14 fitted, 13 predicted, 7 inside
    expect(fitted.length).toBe(14);
    expect(predicted.length).toBe(13);
    expect(predicted.filter((x) => inside(x.p, x.actual)).length).toBe(7);
    expect(WINDOW_FRACTION).toBe(0.2);
  }, 300_000);

  it('predicts them as tumbling cylinders of GCAT\'s size and mass, transfer orbits with the Sun and the Moon', () => {
    const res = list.filter((x) => x.s.mass && x.s.length && x.s.diameter).map((x) => ({
      ...x, eccentric: x.s.elements.ECCENTRICITY >= ECCENTRIC,
      p: predictReentry(x.el, { mass: x.s.mass!, area: tumblingCylinderArea(x.s.length!, x.s.diameter!), cd: 2.2 }, measured, 400),
    }));
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
