/**
 * The long-term propagator (roadmap P07): each force against what it must
 * reproduce, the two methods against each other, and the guarantee that the
 * flight does not use it.
 */
import { describe, expect, it } from 'vitest';
import { propagate, elementsOf } from '../src/physics/propagator/propagate';
import { ALL_FORCES, J3_EARTH, J4_EARTH, gravityAcceleration, inShadow, type ForceModel } from '../src/physics/propagator/forces';
import { moonPosition, sunPosition, AU, type V3 } from '../src/physics/propagator/ephemeris';
import { harrisPriesterBounds, harrisPriesterDensity, solarActivityDecades } from '../src/physics/propagator/density';
import { J2_EARTH, MU_EARTH, R_EARTH } from '../src/physics/constants';

const DEG = Math.PI / 180;
const JD = 2461310.5; // 2026-09-25
const NONE: ForceModel = { j2: false, j3j4: false, drag: false, sun: false, moon: false, srp: false, activity: 'mean' };

function circular(alt: number, incDeg: number): { r: V3; v: V3 } {
  const r = R_EARTH + alt, v = Math.sqrt(MU_EARTH / r), i = incDeg * DEG;
  return { r: [r, 0, 0], v: [0, v * Math.cos(i), v * Math.sin(i)] };
}

/** −∇ of the zonal potential, by central differences. */
function potentialGradient(r: V3, j2: boolean, j3j4: boolean): V3 {
  const U = (p: V3): number => {
    const rn = Math.hypot(...p), s = p[2] / rn, q = R_EARTH / rn;
    let u = MU_EARTH / rn;
    if (j2) u -= (MU_EARTH / rn) * J2_EARTH * q ** 2 * (1.5 * s * s - 0.5);
    if (j3j4) {
      u -= (MU_EARTH / rn) * J3_EARTH * q ** 3 * (2.5 * s ** 3 - 1.5 * s);
      u -= (MU_EARTH / rn) * J4_EARTH * q ** 4 * ((35 * s ** 4 - 30 * s * s + 3) / 8);
    }
    return u;
  };
  const h = 1;
  return [0, 1, 2].map((k) => {
    const a = [...r] as V3, b = [...r] as V3;
    a[k] += h; b[k] -= h;
    return (U(a) - U(b)) / (2 * h);
  }) as V3;
}

describe('forces (P07)', () => {
  it.each([[[7e6, 1e6, 2e6]], [[-3e6, 4e6, -5.5e6]], [[1e6, -2e6, 6.9e6]]] as V3[][])('draws gravity from the J2–J4 potential at %j', (r) => {
    const a = gravityAcceleration(r, true, true), g = potentialGradient(r, true, true);
    for (let k = 0; k < 3; k++) expect(a[k]).toBeCloseTo(g[k], 7);
    // and J3/J4 are a small correction on J2
    const j2only = gravityAcceleration(r, true, false);
    const d = Math.hypot(a[0] - j2only[0], a[1] - j2only[1], a[2] - j2only[2]);
    expect(d / Math.hypot(...a)).toBeLessThan(1e-5);
    expect(d).toBeGreaterThan(0);
  });

  it('places the Sun and the Moon', () => {
    expect(Math.hypot(...sunPosition(2451545)) / AU).toBeCloseTo(0.9833, 3);
    // Meeus, Astronomical Algorithms, example 47.a: 1992 April 12, 0h TD, 368 409.7 km
    expect(Math.hypot(...moonPosition(2448724.5)) / 1000).toBeCloseTo(368410, -3);
    for (let d = 0; d < 30; d++) {
      const m = Math.hypot(...moonPosition(JD + d)) / 1000;
      expect(m).toBeGreaterThan(355000);
      expect(m).toBeLessThan(407500);
    }
  });

  it('puts the Earth’s shadow behind it', () => {
    const sun: V3 = [AU, 0, 0];
    expect(inShadow([-7e6, 0, 0], sun)).toBe(true);
    expect(inShadow([7e6, 0, 0], sun)).toBe(false);
    expect(inShadow([-7e6, 7e6, 0], sun)).toBe(false);
  });

  it('reads the Harris–Priester table, with its bulge and the Sun’s activity', () => {
    const [mn, mx] = harrisPriesterBounds(400);
    expect(mn).toBeCloseTo(2.249e-12, 15);
    expect(mx).toBeCloseTo(7.492e-12, 15);
    expect(harrisPriesterBounds(1200)).toEqual([0, 0]);
    const sun: V3 = [AU, 0, 0];
    const r = R_EARTH + 400e3;
    // the apex lags the Sun by 30°: afternoon is densest, the far side thinnest
    const apex = harrisPriesterDensity([r * Math.cos(30 * DEG), r * Math.sin(30 * DEG), 0], 400, sun, 4);
    const night = harrisPriesterDensity([-r * Math.cos(30 * DEG), -r * Math.sin(30 * DEG), 0], 400, sun, 4);
    expect(apex).toBeCloseTo(mx, 15);
    expect(night).toBeCloseTo(mn, 15);
    expect(solarActivityDecades(120, 'high')).toBe(0);
    expect(solarActivityDecades(700, 'low')).toBeCloseTo(-0.45, 9);
  });
});

describe('propagation (P07)', () => {
  it('turns the plane at J2’s secular rate', () => {
    const { r, v } = circular(500e3, 51.6);
    const days = 10;
    const res = propagate(r, v, JD, { method: 'mean', duration: days * 86400, forces: { ...NONE, j2: true }, spacecraft: { mass: 1, area: 0, cd: 0, cr: 0 } });
    const a = R_EARTH + 500e3, n = Math.sqrt(MU_EARTH / a ** 3);
    const rate = -1.5 * n * J2_EARTH * (R_EARTH / a) ** 2 * Math.cos(51.6 * DEG);
    const last = res.samples[res.samples.length - 1];
    const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
    expect(wrap(last.raan) / (rate * days * 86400)).toBeCloseTo(1, 3);
    // and Cowell integrating the force agrees to a few hundredths of a degree a day
    const cow = propagate(r, v, JD, { method: 'cowell', duration: days * 86400, forces: { ...NONE, j2: true }, spacecraft: { mass: 1, area: 0, cd: 0, cr: 0 }, samples: 10 });
    const cl = cow.samples[cow.samples.length - 1];
    expect(Math.abs(wrap(cl.raan - last.raan)) / DEG).toBeLessThan(0.05 * days);
  });

  it('keeps a Kepler orbit exactly with every force off', () => {
    const { r, v } = circular(700e3, 98);
    const res = propagate(r, v, JD, { method: 'cowell', duration: 5 * 86400, forces: NONE, spacecraft: { mass: 1, area: 0, cd: 0, cr: 0 }, samples: 5 });
    const a0 = elementsOf(r, v).a;
    for (const s of res.samples) expect(Math.abs(s.a - a0)).toBeLessThan(1);
  });

  it('decays a space station by a few kilometres a month, and both methods agree', () => {
    const { r, v } = circular(420e3, 51.6);
    const sc = { mass: 420000, area: 1600, cd: 2.2, cr: 1.3 };
    const month = 30 * 86400;
    const mean = propagate(r, v, JD, { method: 'mean', duration: month, forces: { ...NONE, j2: true, drag: true }, spacecraft: sc });
    const meanLoss = (mean.samples[0].a - mean.samples[mean.samples.length - 1].a) / 1000;
    expect(meanLoss).toBeGreaterThan(1);
    expect(meanLoss).toBeLessThan(6);
    // Cowell, averaged over the first and the last day (sixteen revolutions)
    // so that J2's short-period swing of the osculating a averages out
    const cow = propagate(r, v, JD, { method: 'cowell', duration: month, forces: { ...NONE, j2: true, drag: true }, spacecraft: sc, samples: 30 * 96 });
    const avg = (from: number, to: number) => {
      const s = cow.samples.filter((x) => x.t >= from && x.t < to);
      return s.reduce((acc, x) => acc + x.a, 0) / s.length;
    };
    const cowLoss = (avg(0, 86400) - avg(month - 86400, month + 1)) / 1000;
    const meanOver29 = meanLoss * 29 / 30;
    expect(cowLoss / meanOver29).toBeGreaterThan(0.75);
    expect(cowLoss / meanOver29).toBeLessThan(1.25);
  }, 60_000);

  it('brings a CubeSat down from 400 km within months to about a year, sooner when the Sun is active', () => {
    const { r, v } = circular(400e3, 51.6);
    const life = (activity: 'low' | 'mean' | 'high') => propagate(r, v, JD, {
      method: 'mean', duration: 5 * 365 * 86400, forces: { ...ALL_FORCES, activity }, spacecraft: { mass: 1.33, area: 0.01, cd: 2.2, cr: 1.3 },
    }).lifetime! / 86400;
    const [lo, mid, hi] = [life('low'), life('mean'), life('high')];
    expect(hi).toBeLessThan(mid);
    expect(mid).toBeLessThan(lo);
    expect(hi).toBeGreaterThan(30);
    expect(lo).toBeLessThan(730);
  });

  it('tilts a geostationary orbit by the Sun and the Moon at about 0.9° a year', () => {
    const { r, v } = circular(35786e3, 0);
    const res = propagate(r, v, JD, { method: 'cowell', duration: 120 * 86400, forces: { ...NONE, j2: true, sun: true, moon: true }, spacecraft: { mass: 3000, area: 30, cd: 2.2, cr: 1.3 }, samples: 4, tolerance: 1e-9 });
    const perYear = (res.samples[res.samples.length - 1].i / DEG) * (365 / 120);
    expect(perYear).toBeGreaterThan(0.6);
    expect(perYear).toBeLessThan(1.2);
  }, 60_000);

  it('lets sunlight pressure pump a light satellite’s eccentricity', () => {
    const { r, v } = circular(20000e3, 55);
    const run = (srp: boolean) => propagate(r, v, JD, { method: 'cowell', duration: 30 * 86400, forces: { ...NONE, srp }, spacecraft: { mass: 100, area: 10, cd: 2.2, cr: 1.5 }, samples: 1, tolerance: 1e-9 });
    const e0 = run(false).samples.at(-1)!.e, e1 = run(true).samples.at(-1)!.e;
    expect(e1 - e0).toBeGreaterThan(1e-5);
  }, 60_000);

  it('can be stopped', () => {
    const { r, v } = circular(500e3, 51.6);
    let calls = 0;
    const res = propagate(r, v, JD, { method: 'cowell', duration: 30 * 86400, forces: ALL_FORCES, spacecraft: { mass: 100, area: 1, cd: 2.2, cr: 1.3 }, onProgress: () => ++calls < 3 });
    expect(res.samples.at(-1)!.t).toBeLessThan(30 * 86400 * 0.1);
  });
});

describe('the flight is untouched (P07)', () => {
  it('imports the propagator from nothing that flies the ascent or judges the orbit', () => {
    const src = import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    const users = Object.entries(src)
      .filter(([path, text]) => !path.includes('/propagator/') && /from ['"][^'"]*propagator\//.test(text))
      .map(([path]) => path.replace('../src/', ''));
    // the lifetime window, its worker, and the app wiring that opens it
    const allowed = (p: string) => p.startsWith('ui/') || p === 'main.ts' || p === 'physics/lifetime.worker.ts' || p === 'physics/lifetime-job.ts';
    expect(users.filter((p) => !allowed(p))).toEqual([]);
    expect(users.some((p) => p.startsWith('physics/sim/') || p.startsWith('physics/rigid/') || p === 'physics/simulation.ts')).toBe(false);
  });
});
