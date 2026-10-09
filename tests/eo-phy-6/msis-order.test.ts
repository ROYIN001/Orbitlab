/**
 * EO-PHY-6 (d): NRLMSISE-00 keeps no state from one call to the next that
 * shows in its answer (R0.4 step 4, M-PHYSICS-002; plan S07 §07.4 step
 * 4(d)). msis.ts works in module-level arrays, as the Fortran's COMMON blocks
 * did, and density.ts reads through a shared scratch input: the same input
 * after a different history of calls must give a density `Object.is`-equal,
 * and equal to the one recorded on the CO-6 base. EQ-9 counts on it — FSAL
 * and the reuse of a rejected step's first stage skip `deriv` calls, so
 * they change which densities were asked for before — and drops both if it
 * ever fails (§07.4 step 4, "ถ้า (d) ไม่ผ่าน").
 *
 * Histories: in order; reversed; each point after a "poison" call far from it
 * (sea level at the pole, the other side of the day, the other activity);
 * after `gtd7` with the diurnal switches off (which leaves `prepare`'s
 * local-time terms from the call before); and after `gtd7` in CGS units. The
 * check itself is held to catch a double that leaks one call into the next.
 */
import { describe, expect, it } from 'vitest';
import { gtd7, gtd7d, msisDensity, MSIS_DEFAULT_SWITCHES, type MsisInput } from '../../src/physics/propagator/msis';
import { airDensity } from '../../src/physics/propagator/density';
import { ECSS_LEVELS, type Indices } from '../../src/physics/propagator/activity';
import type { V3 } from '../../src/physics/propagator/ephemeris';
import { R_EARTH } from '../../src/physics/constants';
import { RECORDING, hex, writeReference } from './harness';
import REF from './ref/msis.json';

const point = (doy: number, sec: number, alt: number, lat: number, lon: number, act: Indices): MsisInput =>
  ({ doy, sec, alt, lat, lon, lst: (((sec / 3600 + lon / 15) % 24) + 24) % 24, f107a: act.f107a, f107: act.f107, ap: act.ap });

const { low, moderate, high } = ECSS_LEVELS;
/** Points through every branch of the model: below 32.5 km, the mesosphere, the thermosphere, up to 2000 km. */
const POINTS: readonly MsisInput[] = [
  point(172, 29000, 0, 60, -70, moderate),
  point(172, 29000, 20, 45, 10, moderate),
  point(81, 43200, 50, 0, 0, moderate),
  point(81, 43200, 70, -30, 120, high),
  point(355, 3600, 90, 80, -150, low),
  point(1, 0, 120, 10, 30, moderate),
  point(200, 72000, 200, -60, 200, high),
  point(200, 72000, 400, 51.6, -45, moderate),
  point(300, 10000, 400, -51.6, 170, low),
  point(100, 50000, 600, 20, 90, high),
  point(250, 80000, 1000, -85, -10, moderate),
  point(30, 20000, 2000, 0, 180, high),
];
const POISON = point(1, 0, 0, 90, 0, high);
const NO_DIURNAL = MSIS_DEFAULT_SWITCHES.map((s, i) => (i === 7 || i === 8 || i === 14 ? 0 : s));

/** ECI points for density.ts's path (the shared scratch input), at three dates. */
const JD = 2461310.5;
const ECI: readonly [V3, number][] = [
  [[R_EARTH + 150e3, 0, 0], JD],
  [[0, R_EARTH + 400e3, 1e6], JD + 0.37],
  [[-3e6, -4e6, 4.5e6], JD + 120.9],
  [[R_EARTH + 1500e3, 2e6, -3e6], JD + 33.25],
];

type Density = (i: number) => number;
type History = (i: number) => void;

/** The densities of `n` points asked for in the order `order`, each after `before`, by index. */
function densities(n: number, f: Density, order: readonly number[], before: History = () => {}): number[] {
  const out = new Array<number>(n);
  for (const i of order) { before(i); out[i] = f(i); }
  return out;
}

/** Indexes whose density differs (`Object.is`) between any history and the first. */
function orderDependent(n: number, f: Density, histories: readonly [readonly number[], History?][]): number[] {
  const [first, ...rest] = histories.map(([order, before]) => densities(n, f, order, before));
  const bad = new Set<number>();
  for (const d of rest) for (let i = 0; i < n; i++) if (!Object.is(d[i], first[i])) bad.add(i);
  return [...bad].sort((a, b) => a - b);
}

const forward = (n: number) => [...Array(n).keys()];
const reversed = (n: number) => forward(n).reverse();

function histories(n: number, poison: History): [readonly number[], History?][] {
  return [
    [forward(n)],
    [reversed(n)],
    [forward(n), poison],
    [reversed(n), (i) => { gtd7(POINTS[(i + 5) % POINTS.length], NO_DIURNAL); }],
    [forward(n), (i) => { gtd7(POINTS[(i + 7) % POINTS.length]); gtd7d(POINTS[(i + 3) % POINTS.length]); }],
  ];
}

const msisPoint: Density = (i) => msisDensity({ ...POINTS[i] });
const eciPoint: Density = (i) => airDensity(ECI[i][0], ECI[i][1], moderate);
const poisonMsis: History = () => { msisDensity(POISON); };
const poisonEci: History = (i) => { airDensity([-(R_EARTH + 90e3), 0, 0], ECI[i][1] + 0.5, high); };

describe('EO-PHY-6 (d): NRLMSISE-00 answers the same whatever came before', () => {
  it('msisDensity: every point, every history, Object.is-equal, and as recorded', async () => {
    expect(orderDependent(POINTS.length, msisPoint, histories(POINTS.length, poisonMsis))).toEqual([]);
    const rho = densities(POINTS.length, msisPoint, forward(POINTS.length));
    // air, kg/m³: 1.2 at sea level, down to some 1e-15 at 2000 km
    for (const d of rho) expect(d > 1e-17 && d < 2, `${d}`).toBe(true);
    const got = rho.map(hex);
    if (RECORDING) return;
    expect(got).toEqual(REF.msisDensity);
  });

  it('airDensity from ECI (density.ts\'s shared scratch input): the same', async () => {
    expect(orderDependent(ECI.length, eciPoint, histories(ECI.length, poisonEci))).toEqual([]);
    const rho = densities(ECI.length, eciPoint, forward(ECI.length));
    for (const d of rho) expect(d > 1e-17 && d < 1e-8, `${d}`).toBe(true);
    const got = rho.map(hex);
    if (RECORDING) {
      await writeReference('msis.json', { msisDensity: densities(POINTS.length, msisPoint, forward(POINTS.length)).map(hex), airDensity: got });
      return;
    }
    expect(got).toEqual(REF.airDensity);
  });

  it('the check catches a double that leaks one call into the next', () => {
    let last = 0;
    const leaky: Density = (i) => { const d = msisPoint(i) * (1 + 1e-15 * Math.sign(last)); last = d; return d; };
    expect(orderDependent(POINTS.length, leaky, histories(POINTS.length, poisonMsis)).length).toBeGreaterThan(0);
  });
});
