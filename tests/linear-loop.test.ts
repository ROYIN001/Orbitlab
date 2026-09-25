import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import { captureFrame } from '../src/physics/frame';
import { bode, closedLoop, eigenvalues, expm, loopGain, margins, sample, stepMetrics, stepResponse, type LinearModel, type PlaneModel } from '../src/physics/rigid/linear';
import { modelAt } from '../src/ui/loop-analysis';
import { buildTelemetryCsv } from '../src/ui/csv';
import type { FlexConfig, MissionConfig } from '../src/types';
import { LAUNCH_TIME } from './fleet-harness';

const DEG = 180 / Math.PI, T = 0.01;

/** Falcon 9 from the Cape in crosswind, 6-DOF, optionally with P05's flexible body. */
function falcon9(flex?: FlexConfig): Simulation {
  return new Simulation({ vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbit: orbitById('leo'), launchTime: LAUNCH_TIME,
    guidance: guidanceForVehicle(vehicleById('falcon9'), DEFAULT_GUIDANCE, 'sixDof'), guidanceResolved: true, failure: { ...DEFAULT_FAILURE },
    boosterRecovery: false, dynamics: { model: 'sixDof', wind: 'crosswind', seed: 20260919, ...(flex ? { flex } : {}) } } as MissionConfig, { headless: true });
}
function flyTo(sim: Simulation, t: number): LinearModel {
  while (!sim.done && sim.state.t < t) sim.step(sim.suggestedDt());
  return sim.rigidRuntime!.latestLinear!;
}
/** The closed loop's worst growth rate, s⁻¹, with the controller's gain scaled by k. */
function growth(p: PlaneModel, k: number, ffError = 0): number {
  const { dim, M } = closedLoop({ ...p, inertia: p.inertia * k }, T, ffError), e = eigenvalues(M, dim);
  return Math.max(...e.re.map((re, i) => Math.log(Math.hypot(re, e.im[i])) / T));
}
/** One CSV line's fields; quoted fields may hold commas and doubled quotes. */
function fields(line: string): string[] {
  const out: string[] = [];
  let field = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c;
    } else if (c === '"') quoted = true; else if (c === ',') { out.push(field); field = ''; } else field += c;
  }
  out.push(field);
  return out;
}
/** C (zI − Φ)⁻¹ Γ by dense complex elimination, for the Hessenberg solve to be checked against. */
function denseResponse(Phi: number[], Gamma: number[], c: number[], m: number, omega: number): { re: number; im: number } {
  const zr = Math.cos(omega * T), zi = Math.sin(omega * T);
  const Ar = Phi.map((v, k) => (Math.floor(k / m) === k % m ? zr : 0) - v), Ai = Phi.map((_, k) => (Math.floor(k / m) === k % m ? zi : 0));
  const br = Gamma.slice(), bi = new Array<number>(m).fill(0);
  for (let col = 0; col < m; col++) {
    let piv = col;
    for (let r = col + 1; r < m; r++) if (Ar[r * m + col] ** 2 + Ai[r * m + col] ** 2 > Ar[piv * m + col] ** 2 + Ai[piv * m + col] ** 2) piv = r;
    for (let j = 0; j < m; j++) { [Ar[col * m + j], Ar[piv * m + j]] = [Ar[piv * m + j], Ar[col * m + j]]; [Ai[col * m + j], Ai[piv * m + j]] = [Ai[piv * m + j], Ai[col * m + j]]; }
    [br[col], br[piv]] = [br[piv], br[col]]; [bi[col], bi[piv]] = [bi[piv], bi[col]];
    const pr = Ar[col * m + col], pi = Ai[col * m + col], pd = pr * pr + pi * pi;
    for (let r = col + 1; r < m; r++) {
      const xr = Ar[r * m + col], xi = Ai[r * m + col], fr = (xr * pr + xi * pi) / pd, fi = (xi * pr - xr * pi) / pd;
      for (let j = col; j < m; j++) { const ar = Ar[col * m + j], ai = Ai[col * m + j]; Ar[r * m + j] -= fr * ar - fi * ai; Ai[r * m + j] -= fr * ai + fi * ar; }
      br[r] -= fr * br[col] - fi * bi[col]; bi[r] -= fr * bi[col] + fi * br[col];
    }
  }
  const vr = new Array<number>(m).fill(0), vi = new Array<number>(m).fill(0);
  for (let r = m - 1; r >= 0; r--) {
    let sr = br[r], si = bi[r];
    for (let j = r + 1; j < m; j++) { sr -= Ar[r * m + j] * vr[j] - Ai[r * m + j] * vi[j]; si -= Ar[r * m + j] * vi[j] + Ai[r * m + j] * vr[j]; }
    const pr = Ar[r * m + r], pi = Ai[r * m + r], pd = pr * pr + pi * pi;
    vr[r] = (sr * pr + si * pi) / pd; vi[r] = (si * pr - sr * pi) / pd;
  }
  return { re: c.reduce((a, v, i) => a + v * vr[i], 0), im: c.reduce((a, v, i) => a + v * vi[i], 0) };
}

describe('the linear-algebra kernel (roadmap G04)', () => {
  it('exponentiates a matrix, however large its norm', () => {
    for (const w of [1, 50]) {
      const R = expm([0, w, -w, 0], 2);
      expect(R[0]).toBeCloseTo(Math.cos(w), 10); expect(R[1]).toBeCloseTo(Math.sin(w), 10);
      expect(R[2]).toBeCloseTo(-Math.sin(w), 10); expect(R[3]).toBeCloseTo(Math.cos(w), 10);
    }
    const D = expm([-3, 0, 0, 0.5], 2);
    expect(D[0]).toBeCloseTo(Math.exp(-3), 12); expect(D[3]).toBeCloseTo(Math.exp(0.5), 12); expect(D[1]).toBe(0);
  });

  it('finds real and complex eigenvalues, also of a badly scaled matrix', () => {
    // Companion matrix of (x − 1)(x − 2)(x − 3)(x² + 1).
    const n = 5, C = new Array<number>(25).fill(0);
    [6, -12, 12, -11, 6].forEach((v, j) => { C[j] = v; });
    for (let i = 1; i < n; i++) C[i * n + i - 1] = 1;
    // The same matrix under a similarity D C D⁻¹ with D from 10⁻⁴ to 10⁴: the eigenvalues must not move.
    const d = [1e-4, 1e-2, 1, 1e2, 1e4], S = C.map((v, k) => v * d[Math.floor(k / n)] / d[k % n]);
    for (const M of [C, S]) {
      const e = eigenvalues(M, n), roots = e.re.map((re, i) => ({ re, im: e.im[i] })).sort((a, b) => a.re - b.re || a.im - b.im);
      const want = [{ re: 0, im: -1 }, { re: 0, im: 1 }, { re: 1, im: 0 }, { re: 2, im: 0 }, { re: 3, im: 0 }];
      roots.forEach((r, i) => { expect(r.re).toBeCloseTo(want[i].re, 8); expect(r.im).toBeCloseTo(want[i].im, 8); });
    }
  });
});

describe('a PD autopilot on a double integrator, against the textbook', () => {
  const I = 1e7, tau = 0.05, kTheta = 1.5, kOmega = 3;
  const plant: PlaneModel = { axis: 'z', n: 2, states: ['angle', 'rate'], A: [0, 1, 0, 0], B: [0, 1 / I], cAngle: [1, 0], cRate: [0, 1], cAero: [0, 0],
    actuator: 'engines', tau, inertia: I, kTheta, kOmega };

  it('has the phase margin of L(s) = K_ω(K_θ + s)/s² through the gimbals\' lag and the hold\'s half-step delay', () => {
    const m = margins(plant, T, 0);
    // |L(jω)| = 1 for the continuous loop with the lag: solved by bisection.
    const mag = (w: number) => kOmega * Math.hypot(kTheta, w) / (w * w * Math.hypot(1, tau * w));
    let lo = 0.1, hi = 100;
    for (let i = 0; i < 100; i++) { const mid = Math.sqrt(lo * hi); if (mag(mid) > 1) lo = mid; else hi = mid; }
    const wc = lo, pm = Math.atan2(wc, kTheta) * DEG - Math.atan(tau * wc) * DEG - wc * T / 2 * DEG;
    expect(m.stable).toBe(true);
    expect(m.openLoopUnstable).toBe(0);
    expect(m.wcRadS!).toBeCloseTo(wc, 1);
    expect(Math.abs(m.pmDeg! - pm)).toBeLessThan(0.3);
    // The double integrator has no finite gain margin in continuous time; the lag and the sampling give it one.
    expect(m.gmDb!).toBeGreaterThan(20);
    expect(m.gmLowDb).toBeUndefined();
  });

  it('agrees with its own closed loop: the gain margin is where the eigenvalues cross the unit circle', () => {
    const m = margins(plant, T, 0), k = 10 ** (m.gmDb! / 20);
    expect(growth(plant, k * 0.97)).toBeLessThan(0);
    expect(growth(plant, k * 1.03)).toBeGreaterThan(0);
  });

  it('settles a 1° step with the second-order loop\'s overshoot', () => {
    const step = 1 / DEG, r = stepResponse(plant, T, 0, step, 10), s = stepMetrics(r, step);
    expect(s.final).toBeCloseTo(1, 4);
    expect(s.overshootPct).toBeGreaterThan(1); expect(s.overshootPct).toBeLessThan(10);
    expect(s.riseS!).toBeGreaterThan(0.5); expect(s.riseS!).toBeLessThan(s.settlingS!);
    // The delivered moment lags the demand through the gimbals and starts at zero.
    expect(r.delivered[0]).toBe(0);
    expect(r.demand[0]).toBeCloseTo(I * kOmega * kTheta * step, 6);
    // A response that never comes within 2 % has no settling time (not zero).
    const short = stepResponse(plant, T, 0, step, 0.5);
    expect(stepMetrics(short, step).settlingS).toBeUndefined();
    expect(stepMetrics(short, step).riseS).toBeUndefined();
  });

  it('turns an aerodynamically unstable airframe into a conditionally stable loop without the feed-forward', () => {
    const a = 0.5, aero: PlaneModel = { ...plant, A: [0, 1, a, 0], cAero: [a * I, 0] };
    const exact = margins(aero, T, 0), none = margins(aero, T, -1);
    expect(exact.stable).toBe(true); expect(none.stable).toBe(true);
    expect(none.openLoopUnstable).toBe(1);
    // Without the feed-forward the loop needs K_ω K_θ > a: the gain can drop by a/(K_ω K_θ) before it goes.
    const kLow = a / (kOmega * kTheta);
    expect(growth(aero, kLow * 1.05, -1)).toBeLessThan(1e-3);
    expect(growth(aero, kLow * 0.95, -1)).toBeGreaterThan(1e-3);
  });
});

describe('Falcon 9\'s loop over its ascent', () => {
  const rigid = falcon9(), rigidMax = flyTo(rigid, 62);
  const full = falcon9({ slosh: true, bending: true, notch: true }), fullMax = flyTo(full, 62);

  it('is linearised every half second, and handed to the telemetry but not to the frames', () => {
    const models = [...new Set(rigid.telemetry.map((s) => s.rigid?.linearModel).filter((m): m is LinearModel => !!m))];
    expect(models.length).toBeGreaterThan(110);
    const gaps = models.slice(1).map((m, i) => m.t - models[i].t);
    expect(Math.max(...gaps)).toBeLessThan(0.55);
    for (const s of rigid.telemetry) if (s.rigid?.linearModel) expect(s.t - s.rigid.linearModel.t).toBeLessThanOrEqual(1.5);
    expect(captureFrame(rigid).rigid?.linearModel).toBeUndefined();
    expect(modelAt(rigid.telemetry, 40)!.t).toBeLessThanOrEqual(40);
    expect(40 - modelAt(rigid.telemetry, 40)!.t).toBeLessThan(1.5);
  });

  it('writes each plane\'s margins to the CSV, from the latest linearisation', () => {
    const [header, ...rows] = buildTelemetryCsv(rigid).split('\n# events')[0].trim().split('\n');
    const cols = header.split(','), at = (name: string) => cols.indexOf(name);
    for (const name of ['loop_linearised_t_s', 'loop_pitch_pm_deg', 'loop_pitch_gm_db', 'loop_yaw_stable', 'loop_roll_crossover_rad_s']) expect(cols).toContain(name);
    const i = rigid.telemetry.findIndex((s) => s.rigid?.linearModel && s.t > 30), sample = rigid.telemetry[i], row = fields(rows[i]);
    expect(Number(row[at('loop_linearised_t_s')])).toBeCloseTo(sample.rigid!.linearModel!.t, 6);
    expect(Number(row[at('loop_pitch_pm_deg')])).toBeCloseTo(sample.rigid!.linearModel!.margins.z.pmDeg!, 3);
    expect(Number(row[at('loop_yaw_gm_db')])).toBeCloseTo(sample.rigid!.linearModel!.margins.y.gmDb!, 3);
    expect(row[at('loop_pitch_stable')]).toBe('true');
    // Before lift-off nothing was linearised: the columns stay empty.
    expect(fields(rows[0])[at('loop_pitch_pm_deg')]).toBe('');
    expect(fields(rows[i]).length).toBe(cols.length);
  });

  it('models each plane with the states P05 flies', () => {
    expect(rigidMax.planes.x.states).toEqual(['angle', 'rate']);
    expect(rigidMax.planes.z.states).toEqual(['angle', 'rate', 'drift']);
    const z = fullMax.planes.z;
    expect(z.states.filter((s) => s.startsWith('slosh:')).length).toBe(4);
    expect(z.states).toContain('bending');
    expect(z.notch).toBeDefined();
    expect(z.cAngle.some((c, i) => i > 1 && c !== 0)).toBe(true); // the IMU sees the bending slope
    for (const p of [rigidMax.planes.x, rigidMax.planes.z, rigidMax.planes.y]) { expect(p.actuator).toBe('engines'); expect(p.tau).toBeGreaterThan(0); }
  });

  it('keeps a rigid stack stable through max-q with a textbook phase margin and a wide gain margin', () => {
    for (const axis of ['z', 'y'] as const) {
      const m = rigidMax.margins[axis];
      expect(m.stable).toBe(true);
      expect(m.pmDeg!).toBeGreaterThan(35); expect(m.pmDeg!).toBeLessThan(60);
      expect(m.wcRadS!).toBeGreaterThan(2); expect(m.wcRadS!).toBeLessThan(5);
      expect(m.gmDb!).toBeGreaterThan(20);
    }
    expect(rigidMax.margins.x.stable).toBe(true);
  });

  it('finds the flexible stack stable but with a thin gain margin at the slosh and bending frequencies', () => {
    const m = fullMax.margins.z;
    expect(m.stable).toBe(true);
    expect(m.pmDeg!).toBeGreaterThan(30);
    expect(m.gmDb!).toBeLessThan(6);
    expect(m.wgRadS!).toBeGreaterThan(5); expect(m.wgRadS!).toBeLessThan(15);
  });

  it('reads the same gain margins off the Bode plot as off the closed loop\'s eigenvalues', () => {
    for (const p of [rigidMax.planes.z, fullMax.planes.z]) {
      const m = margins(p, T, 0), k = 10 ** (m.gmDb! / 20);
      expect(growth(p, k * 0.95)).toBeLessThan(1e-3);
      expect(growth(p, k * 1.05)).toBeGreaterThan(1e-3);
    }
  });

  it('solves the loop gain in Hessenberg form exactly as a dense solve would', () => {
    const p = fullMax.planes.z, s = sample(p, T);
    for (const omega of [0.05, 1, 3, 8.3, 40, 250]) {
      const hA = denseResponse(s.Phi, s.Gamma, s.cAngle, s.m, omega), hR = denseResponse(s.Phi, s.Gamma, s.cRate, s.m, omega), hF = denseResponse(s.Phi, s.Gamma, s.cAero, s.m, omega);
      const zr = Math.cos(omega * T), zi = Math.sin(omega * T), g = p.inertia * p.kOmega, n = p.notch!;
      const inv = { re: zr / (zr * zr + zi * zi), im: -zi / (zr * zr + zi * zi) }, inv2 = { re: inv.re * inv.re - inv.im * inv.im, im: 2 * inv.re * inv.im };
      const fNum = { re: n.b0 + n.b1 * inv.re + n.b2 * inv2.re, im: n.b1 * inv.im + n.b2 * inv2.im }, fDen = { re: 1 + n.a1 * inv.re + n.a2 * inv2.re, im: n.a1 * inv.im + n.a2 * inv2.im };
      const num0 = { re: g * (p.kTheta * hA.re + hR.re), im: g * (p.kTheta * hA.im + hR.im) };
      const mul = (a: { re: number; im: number }, b: { re: number; im: number }) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
      const div = (a: { re: number; im: number }, b: { re: number; im: number }) => { const d = b.re * b.re + b.im * b.im; return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }; };
      const want = div(mul(num0, div(fNum, fDen)), { re: 1 + hF.re, im: hF.im }), got = loopGain(p, T, 0, omega);
      expect(Math.hypot(got.re - want.re, got.im - want.im) / Math.hypot(want.re, want.im)).toBeLessThan(1e-9);
    }
  });

  it('loses margin as the feed-forward errs, and says so', () => {
    const p = rigidMax.planes.z, exact = margins(p, T, 0), off = margins(p, T, -0.5);
    expect(off.stable).toBe(true);
    expect(off.pmDeg).not.toBeCloseTo(exact.pmDeg!, 1);
    expect(bode(p, T, -0.5)[0].magDb).not.toBeCloseTo(bode(p, T, 0)[0].magDb, 1);
  });

  it('flies its roll on the attitude thrusters after staging', { timeout: 120_000 }, () => {
    const upper = flyTo(rigid, 300);
    expect(upper.planes.x.actuator).toBe('jets');
    expect(upper.planes.x.tau).toBe(0);
    expect(upper.margins.x.stable).toBe(true);
    expect(upper.margins.x.pmDeg!).toBeGreaterThan(30);
    // Between main-engine cut-off and separation nothing steers the stack: no loop, not an unstable one.
    const coast = rigid.telemetry.map((s) => s.rigid?.linearModel).find((m) => m && m.t > 150 && m.planes.z.actuator === 'none');
    expect(coast).toBeDefined();
    expect(coast!.margins.z.active).toBe(false);
    expect(rigidMax.margins.z.active).toBe(true);
  });
});

describe('the linear model against the nonlinear flight (P05 without the bending filter)', () => {
  it('predicts the rate and frequency at which the first bending mode diverges', { timeout: 120_000 }, () => {
    const sim = falcon9({ bending: true });
    const rows: { t: number; eta: number }[] = [];
    let model: LinearModel | undefined;
    while (!sim.done && sim.state.t < 3) {
      sim.step(sim.suggestedDt());
      const b = sim.state.rigid?.flex?.bending;
      if (b) rows.push({ t: sim.state.t, eta: b.modal.y });
      if (!model && sim.state.t >= 1) model = sim.rigidRuntime!.latestLinear;
    }
    const m = model!.margins.z;
    expect(m.stable).toBe(false);
    // The flight: the mode's envelope from T+0.5 s to T+2 s, before the gimbals saturate, and its half-periods.
    const peak = (a: number) => Math.max(...rows.filter((r) => r.t >= a && r.t < a + 0.5).map((r) => Math.abs(r.eta)));
    const sigma = Math.log(peak(1.5) / peak(0.5));
    const crossings = rows.filter((r, i) => i > 0 && r.t > 1 && r.t < 2.5 && (rows[i - 1].eta > 0) !== (r.eta > 0)).map((r) => r.t);
    const omega = Math.PI / ((crossings[crossings.length - 1] - crossings[0]) / (crossings.length - 1));
    expect(Math.abs(omega / m.growthFrequency - 1)).toBeLessThan(0.05);
    expect(Math.abs(sigma / m.growthRate - 1)).toBeLessThan(0.3);
  });
});
