/**
 * The drag area a designed satellite flies in the lifetime analysis (roadmap
 * D06; Phase 4 map §2.2 G): src/design/satellite-area.ts. Every bound below
 * was written in this comment, and committed, before the first run of this
 * file; a bound changed after a run says so where it is.
 *
 * - **NAPA-2 as a 6U design** (src/data/napa2.ts: 10 kg, 0.2 × 0.1 × 0.3405 m,
 *   Janes; no propulsion; cells on the body, so no wings), C_D 2.2. The
 *   design path must give what docs/VALIDATION.md §7 found for the box of
 *   its size: B = 0.0134 m²/kg, **±0.00005** (the table's last digit), and,
 *   from the first element set
 *   (https://celestrak.org/NORAD/elements/gp-first.php?INTDES=2021-059) with
 *   the Sun as measured, a lifetime **within 25 %** of the 1 806 days to its
 *   re-entry on 2026-07-05 (GCAT, https://planet4589.org/space/gcat/) — the
 *   criterion P2.5 fixed — and the +8.0 % VALIDATION records, **±0.05
 *   percentage points** (its last digit: the same run, reached through the
 *   design, must not move it).
 * - **TU Delft p. 138** (B.T.C. Zandbergen, *Spacecraft bus design and
 *   sizing*, TU Delft 2020, https://repository.tudelft.nl/file/File_124a068a-158f-4b40-a44f-9ba407a14845):
 *   500 km, 5 m², C_D 2, 7.613 km/s, 4.89 × 10⁻¹³ kg/m³ (its Appendix H
 *   mean) gives 142 µN: `dragForce` **±1 µN** (the map computes 141.7).
 * - **Closed forms**, exact to rounding (1e-12 relative): a cube of edge s
 *   tumbling shows 6s²/4 (Cauchy: a quarter of the surface); wings add half
 *   their one-sided area, which is `tumblingBoxArea` of a plate of no
 *   thickness; cells on the body or round a spinning drum add nothing;
 *   B = C_D·A/(dry + propellant).
 * - **`B_RANGE`** (src/orbit/ballistic.ts, [1e-4, 1] m²/kg): NAPA-2 is inside;
 *   a design below or above it is flagged.
 */
import { describe, expect, it } from 'vitest';
import {
  ballisticCoefficient, ballisticProblem, dragArea, lifetimeSpacecraft, satelliteAreaCore, wetMass,
} from '../src/design/satellite-area';
import type { SatelliteDesign } from '../src/design/satellite-spec';
import { dragForce } from '../src/orbit/disposal';
import { B_RANGE } from '../src/orbit/ballistic';
import { predictReentry, tumblingBoxArea } from '../src/orbit/reentry';
import { elementsFromRecord } from '../src/orbit/omm';
import { NAPA2 } from '../src/data/napa2';
import HISTORY from '../src/data/solar-daily.json';
import { measuredActivity, type SolarDaily } from '../src/physics/propagator/activity';

const within = (x: number, ref: number, tol: number, what: string): void => {
  expect(Math.abs(x - ref), `${what}: ${x} against ${ref} ± ${tol}`).toBeLessThanOrEqual(tol);
};
const rel = (x: number, ref: number): number => Math.abs(x / ref - 1);

/**
 * NAPA-2 as a design. Only the bus, the propulsion and the array's mount are
 * read here; the rest is filled in so the object is a whole design, and is
 * not NAPA-2's data (track B's template will carry sourced figures).
 */
const napa2: SatelliteDesign = {
  id: 'test-napa2', name: 'NAPA-2', template: 'cubesat6u', kind: 'science',
  orbit: { perigee: 520e3, apogee: 540e3, inclination: 97.5116, sso: true },
  lifeYears: 3,
  bus: { dryMass: NAPA2.mass, size: { width: NAPA2.size[0], height: NAPA2.size[1], depth: NAPA2.size[2] }, cd: 2.2, cr: 1.3 },
  power: { payloadW: 10, busW: 10, arrayArea: 0.1, cellEff: 0.3, Id: 0.77, degPerYear: 0.0275, mount: 'body', regulation: 'PPT', batteryWh: 40, dod: 0.2, batteryEff: 0.9 },
  propulsion: null,
  adcs: { mode: 'threeAxis', inertia: [0.1, 0.1, 0.05], pointingDeg: 1, wheelH: 0.01, residualDipole: 0.01, cpOffset: 0.01 },
  comms: { txPowerW: 2, frequency: 8.2e9, txAntennaD: 0.1, lineLoss: 1, dataRate: 1e6, requiredEbN0: 5.52, station: 'bangkok', minElDeg: 10 },
  payload: null,
};

describe('NAPA-2 as a 6U design (VALIDATION §7)', () => {
  it('has B = 0.0134 m²/kg ± 0.00005, inside B_RANGE', () => {
    const b = ballisticCoefficient(napa2);
    within(b, 0.0134, 0.00005, 'B');
    expect(ballisticProblem(b)).toBeNull();
    expect(dragArea(napa2)).toBe(tumblingBoxArea(NAPA2.size));
  });

  it('lasts within 25 % from its first element set, the +8.0 % VALIDATION records ± 0.05 points', () => {
    const el = elementsFromRecord(NAPA2.elements);
    const measured = measuredActivity(HISTORY as SolarDaily, null).series;
    // GCAT gives the day: noon
    const actual = Date.parse(`${NAPA2.decay}T12:00:00Z`) / 86400000 + 2440587.5 - (el.jdEpoch + el.jdEpochFrac);
    const p = predictReentry(el, lifetimeSpacecraft(napa2), measured, 3000);
    const err = (p.jd! - p.from) / actual - 1;
    expect(Math.abs(err)).toBeLessThan(0.25);
    within(err * 100, 8.0, 0.05, 'error of the time, %');
  }, 60_000);
});

describe('TU Delft p. 138: the drag on a satellite', () => {
  it('500 km, 5 m², C_D 2, 7.613 km/s, 4.89e-13 kg/m³: 142 µN ± 1', () => {
    within(dragForce(4.89e-13, 2, 5, 7613) * 1e6, 142, 1, 'drag, µN');
  });

  it('on a design is the force on its drag area', () => {
    expect(dragForce(4.89e-13, napa2.bus.cd, dragArea(napa2), 7613)).toBe(0.5 * 4.89e-13 * 7613 * 7613 * 2.2 * dragArea(napa2));
  });
});

describe('the drag area, closed forms', () => {
  const cube = (mount: SatelliteDesign['power']['mount'], arrayArea: number, edge = 1): SatelliteDesign => ({
    ...napa2, bus: { ...napa2.bus, dryMass: 100, size: { width: edge, height: edge, depth: edge } }, power: { ...napa2.power, mount, arrayArea },
  });

  it('a tumbling cube shows a quarter of its surface', () => {
    expect(rel(dragArea(cube('body', 0, 2)), (6 * 4) / 4)).toBeLessThan(1e-12);
  });

  it('wings add half their one-sided area, the quarter of a plate\'s two sides', () => {
    expect(rel(dragArea(cube('tracking', 8)), 1.5 + 4)).toBeLessThan(1e-12);
    // a plate is a box of no thickness: 8 m² as 4 × 2 × 0
    expect(rel(dragArea(cube('tracking', 8)) - dragArea(cube('tracking', 0)), tumblingBoxArea([4, 2, 0]))).toBeLessThan(1e-12);
  });

  it('cells on the body or round a spinning drum add nothing', () => {
    expect(dragArea(cube('body', 8))).toBe(dragArea(cube('body', 0)));
    expect(dragArea(cube('spinner', 8))).toBe(dragArea(cube('body', 0)));
  });

  it('B takes the wet mass', () => {
    const d: SatelliteDesign = { ...cube('tracking', 8), propulsion: { thrust: 1, isp: 220, propellant: 25 } };
    expect(wetMass(d)).toBe(125);
    expect(rel(ballisticCoefficient(d), (2.2 * 5.5) / 125)).toBeLessThan(1e-12);
    expect(lifetimeSpacecraft(d)).toEqual({ mass: 125, area: dragArea(d), cd: 2.2, cr: 1.3 });
  });

  it('refuses a body with no size and a negative array', () => {
    expect(() => dragArea(cube('body', 0, 0))).toThrow(RangeError);
    expect(() => dragArea(cube('tracking', -1))).toThrow(RangeError);
    expect(() => wetMass({ ...napa2, bus: { ...napa2.bus, dryMass: 0 } })).toThrow(RangeError);
  });
});

describe('B against B_RANGE', () => {
  it('flags what lies outside it, and nothing at its ends', () => {
    expect(ballisticProblem(B_RANGE[0])).toBeNull();
    expect(ballisticProblem(B_RANGE[1])).toBeNull();
    expect(ballisticProblem(B_RANGE[0] * 0.99)).toBe('low');
    expect(ballisticProblem(B_RANGE[1] * 1.01)).toBe('high');
    expect(ballisticProblem(Number.NaN)).toBe('low');
  });

  it('a 10 kg 6U with 40 m² of wings is foil: high', () => {
    expect(ballisticProblem(ballisticCoefficient({ ...napa2, power: { ...napa2.power, mount: 'tracking', arrayArea: 40 } }))).toBe('high');
  });
});

describe('the contract', () => {
  it('is the SatelliteAreaCore the satellite model is written against', () => {
    expect(Object.keys(satelliteAreaCore).sort()).toEqual(['ballisticCoefficient', 'dragArea']);
  });
});
