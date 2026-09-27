/**
 * The long-term propagator (roadmap P07): each force against what it must
 * reproduce, the two methods against each other, and the guarantee that the
 * flight does not use it. The drag's average over an eccentric revolution
 * (P2.5) is held to a fine even sampling of it.
 */
import { describe, expect, it } from 'vitest';
import { dragRates, propagate, elementsOf, stateAt } from '../src/physics/propagator/propagate';
import { ALL_FORCES, J3_EARTH, J4_EARTH, acceleration, gravityAcceleration, inShadow, type ForceModel } from '../src/physics/propagator/forces';
import { moonPosition, sunPosition, AU, type V3 } from '../src/physics/propagator/ephemeris';
import { airDensity } from '../src/physics/propagator/density';
import { ECSS_LEVELS, type EcssLevel } from '../src/physics/propagator/activity';
import { J2_EARTH, MU_EARTH, OMEGA_EARTH, R_EARTH } from '../src/physics/constants';

const DEG = Math.PI / 180;
const JD = 2461310.5; // 2026-09-25
const NONE: ForceModel = { j2: false, j3j4: false, drag: false, sun: false, moon: false, srp: false, activity: ECSS_LEVELS.moderate };

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

  it('drags with NRLMSISE-00\'s air turning with the Earth: −½ ρ C_D (A/m) |v_r| v_r', () => {
    const r: V3 = [R_EARTH + 350e3, 1e5, 2e5], v: V3 = [10, 7000, 3000];
    const sc = { mass: 100, area: 2, cd: 2.2, cr: 1.3 };
    const on = acceleration(r, v, JD, { ...NONE, drag: true }, sc), off = acceleration(r, v, JD, NONE, sc);
    const rho = airDensity(r, JD, ECSS_LEVELS.moderate);
    expect(rho).toBeGreaterThan(1e-12);
    const vr: V3 = [v[0] + OMEGA_EARTH * r[1], v[1] - OMEGA_EARTH * r[0], v[2]];
    const k = -0.5 * rho * sc.cd * (sc.area / sc.mass) * Math.hypot(...vr);
    // the difference of two accelerations some 10⁶ times the drag: good to a few parts in 10⁸
    for (let i = 0; i < 3; i++) expect((on[i] - off[i]) / (k * vr[i])).toBeCloseTo(1, 6);
  });

  it('averages the drag over an eccentric revolution as a fine even sampling does', () => {
    // a geostationary transfer orbit, perigee 200 km: the air is met over a few degrees about the perigee
    const rp = R_EARTH + 200e3, ra = R_EARTH + 35786e3, a = (rp + ra) / 2, e = (ra - rp) / (ra + rp);
    const sc = { mass: 3000, area: 15, cd: 2.2, cr: 1.3 };
    const f = { ...NONE, drag: true };
    for (const el of [{ a, e, i: 27 * DEG, raan: 1, argp: 2, M: 0 }, { a: R_EARTH + 400e3, e: 0.001, i: 51.6 * DEG, raan: 1, argp: 2, M: 0 }]) {
      const got = dragRates(el, JD, f, sc);
      // the same Gauss equation by 20 000 even points of eccentric anomaly
      let da = 0;
      const N = 20000;
      for (let k = 0; k < N; k++) {
        const E = (2 * Math.PI * (k + 0.5)) / N;
        const { r, v } = stateAt(el, E);
        const rho = airDensity(r, JD, ECSS_LEVELS.moderate);
        const vr: V3 = [v[0] + OMEGA_EARTH * r[1], v[1] - OMEGA_EARTH * r[0], v[2]];
        const kd = -0.5 * rho * sc.cd * (sc.area / sc.mass) * Math.hypot(...vr);
        da += (Math.hypot(...r) / el.a / N) * ((2 * el.a * el.a) / MU_EARTH) * kd * (v[0] * vr[0] + v[1] * vr[1] + v[2] * vr[2]);
      }
      expect(got.da / da, `e = ${el.e}`).toBeGreaterThan(0.97);
      expect(got.da / da, `e = ${el.e}`).toBeLessThan(1.03);
    }
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

  // R05: at ECSS's fixed levels; the measured Sun is tests/activity.test.ts's, against re-entries on record
  it('brings a CubeSat down from 400 km within months when the Sun is active, a few years when it is quiet', () => {
    const { r, v } = circular(400e3, 51.6);
    const life = (level: EcssLevel) => propagate(r, v, JD, {
      method: 'mean', duration: 5 * 365 * 86400, forces: { ...ALL_FORCES, activity: ECSS_LEVELS[level] }, spacecraft: { mass: 1.33, area: 0.01, cd: 2.2, cr: 1.3 },
    }).lifetime! / 86400;
    const [lo, mid, hi] = [life('low'), life('moderate'), life('high')];
    expect(hi).toBeLessThan(mid);
    expect(mid).toBeLessThan(lo);
    expect(hi).toBeGreaterThan(30);
    expect(hi).toBeLessThan(365);
    expect(lo).toBeLessThan(4 * 365);
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
    // the lifetime window, its worker, the app wiring that opens it, the Orbit section (S03), and the
    // worksheets from real cases, which predict a re-entry (P2.5)
    const allowed = (p: string) => p.startsWith('ui/') || p.startsWith('orbit/') || p === 'main.ts'
      || p === 'physics/lifetime.worker.ts' || p === 'physics/lifetime-job.ts' || p === 'worksheets/cases.ts';
    expect(users.filter((p) => !allowed(p))).toEqual([]);
    expect(users.some((p) => p.startsWith('physics/sim/') || p.startsWith('physics/rigid/') || p === 'physics/simulation.ts')).toBe(false);
  });
});
