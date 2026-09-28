/**
 * D05 optimal staging (src/design/optimal-staging.ts) against:
 *
 * 1. the closed form for equal stages, n = exp(Δv/(N c));
 * 2. a brute-force search over the Δv split, two and three stages;
 * 3. stationarity: moving Δv between any two stages lowers the payload ratio;
 * 4. the feasibility limit Σ c ln(1/ε);
 * 5. worked examples published in a university course, copied verbatim:
 *    NPTEL "Introduction to Launch Vehicle Analysis and Design", Prof. Ashok
 *    Joshi, Department of Aerospace Engineering, IIT Bombay, Lecture 20
 *    "Lagrange Solution" (course https://nptel.ac.in/courses/101101086),
 *    transcript with slides fetched from
 *    http://elearn.psgcas.ac.in/nptel/courses/video/101101086/lec20.pdf
 *    (sha256 3e5fa3dd…a05c2f, fetched 2026-09-28).
 *
 * The method's textbook reference is Curtis, Orbital Mechanics for Engineering
 * Students, the rocket vehicle dynamics chapter (method only; no figures are
 * taken from it).
 *
 * Every bound below was fixed before the comparison it guards and says where it
 * comes from; the exceptions say so where they occur.
 *
 * The brute-force and stationarity checks grade with a payload ratio written
 * out here, not the module's: π* = Π (1 − n_i ε_i)/(n_i (1 − ε_i)), n_i = e^(Δv_i/c_i).
 */
import { describe, expect, it } from 'vitest';
import { VEHICLES } from '../src/data/vehicles';
import { G0 } from '../src/physics/constants';
import { vehicleFigures } from '../src/design/budget';
import { optimalStaging, splitPayloadRatio, stagingLimit, stagingProblem, type StagingStage } from '../src/design/optimal-staging';

const rel = (a: number, b: number): number => Math.abs(a - b) / Math.abs(b);

/** π* of a split, by hand; 0 for a split no vehicle of these stages can fly. */
function handRatio(stages: readonly StagingStage[], dv: readonly number[]): number {
  let r = 1;
  for (let i = 0; i < stages.length; i++) {
    const c = G0 * stages[i].ispS, e = stages[i].epsilon;
    const n = Math.exp(dv[i] / c);
    if (n < 1 || n * e >= 1) return 0;
    r *= (1 - n * e) / (n * (1 - e));
  }
  return r;
}

/** The serial stages of a catalogue vehicle as the optimiser sees them. */
function catalogueStages(id: string): StagingStage[] {
  const v = VEHICLES.find((x) => x.id === id)!;
  const f = vehicleFigures(v, v.payloadLEO / 2);
  return v.stages.map((st, i) => ({ ispS: st.engine.ispVac, epsilon: f.stages[i].structuralRatio }));
}

describe('equal stages: the closed form (D05)', () => {
  it('splits Δv equally with n = exp(Δv/(N c)) and η = 1/(c(1 − n ε))', () => {
    // Bound 1e-12 relative: the solver bisects to adjacent doubles in x = 1/η,
    // which moves n by ~1e-16 relative. (Δv was 9 000 m/s at first, which is
    // past a single stage's limit c ln 10 = 7 903 m/s, so N = 1 had no answer;
    // 7 000 m/s is inside every N's. The bound is unchanged.)
    for (const N of [1, 2, 3, 4, 5]) {
      const stages = Array.from({ length: N }, () => ({ ispS: 350, epsilon: 0.1 }));
      const dv = 7000;
      const c = G0 * 350;
      const r = optimalStaging(stages, dv, 1000)!;
      const n = Math.exp(dv / (N * c));
      for (let i = 0; i < N; i++) {
        expect(rel(r.massRatio[i], n), `N=${N} n${i}`).toBeLessThan(1e-12);
        expect(rel(r.stageDv[i], dv / N), `N=${N} Δv${i}`).toBeLessThan(1e-12);
      }
      expect(rel(r.eta, 1 / (c * (1 - n * 0.1))), `N=${N} η`).toBeLessThan(1e-12);
      expect(rel(r.payloadRatio, ((1 - n * 0.1) / (n * 0.9)) ** N), `N=${N} π*`).toBeLessThan(1e-12);
    }
  });
});

describe('the optimum against a brute-force search over the split', () => {
  it('two stages (Falcon 9\'s Isp and ε): the grid maximum lies within one grid step', () => {
    const stages = catalogueStages('falcon9');
    const dv = 9500, h = 1; // m/s; bound: one grid step, fixed before the search
    const r = optimalStaging(stages, dv, 1000)!;
    let best = -1, arg = 0;
    for (let d1 = 0; d1 <= dv; d1 += h) {
      const p = handRatio(stages, [d1, dv - d1]);
      if (p > best) { best = p; arg = d1; }
    }
    expect(Math.abs(arg - r.stageDv[0])).toBeLessThanOrEqual(h);
    expect(best).toBeLessThanOrEqual(r.payloadRatio * (1 + 1e-12));
    expect(rel(handRatio(stages, r.stageDv), r.payloadRatio)).toBeLessThan(1e-12);
  });

  it('three stages (Saturn V\'s Isp and ε): the grid maximum lies within one grid step', () => {
    const stages = catalogueStages('saturnv');
    const dv = 12000, h = 5; // m/s; bound: one grid step in each free share, fixed before the search
    const r = optimalStaging(stages, dv, 1000)!;
    let best = -1, a1 = 0, a2 = 0;
    for (let d1 = 0; d1 <= dv; d1 += h) {
      for (let d2 = 0; d1 + d2 <= dv; d2 += h) {
        const p = handRatio(stages, [d1, d2, dv - d1 - d2]);
        if (p > best) { best = p; a1 = d1; a2 = d2; }
      }
    }
    expect(Math.abs(a1 - r.stageDv[0])).toBeLessThanOrEqual(h);
    expect(Math.abs(a2 - r.stageDv[1])).toBeLessThanOrEqual(h);
    expect(best).toBeLessThanOrEqual(r.payloadRatio * (1 + 1e-12));
  });

  it('beats Saturn V\'s own split at its own Δv (the real vehicle is one point of the same problem)', () => {
    // No fairing and no strap-ons, so the catalogue Saturn V at payloadLEO/2 is
    // exactly a feasible point of this problem: same ε, same Isp, same Δv. The
    // optimum cannot carry less. Bound: ≥, fixed before the comparison.
    const v = VEHICLES.find((x) => x.id === 'saturnv')!;
    const f = vehicleFigures(v, v.payloadLEO / 2);
    const r = optimalStaging(catalogueStages('saturnv'), f.totalDv, v.payloadLEO / 2)!;
    expect(r.payloadRatio).toBeGreaterThanOrEqual(f.payloadFraction);
  });
});

describe('stationarity', () => {
  it('moving δ of Δv between any two stages, either way, lowers the payload ratio', () => {
    const cases: [string, StagingStage[], number][] = [
      ['Saturn V', catalogueStages('saturnv'), 12000],
      ['Falcon 9', catalogueStages('falcon9'), 9500],
      ['unlike stages', [{ ispS: 260, epsilon: 0.06 }, { ispS: 320, epsilon: 0.09 }, { ispS: 450, epsilon: 0.14 }, { ispS: 320, epsilon: 0.2 }], 11000],
    ];
    for (const [what, stages, dv] of cases) {
      const r = optimalStaging(stages, dv, 1000)!;
      expect(r, what).not.toBeNull();
      const top = handRatio(stages, r.stageDv);
      for (const delta of [1, 10, 100]) {
        for (let i = 0; i < stages.length; i++) {
          for (let j = 0; j < stages.length; j++) {
            if (i === j) continue;
            const moved = [...r.stageDv];
            moved[i] += delta;
            moved[j] -= delta;
            expect(handRatio(stages, moved), `${what}: ${delta} m/s from stage ${j} to ${i}`).toBeLessThan(top);
          }
        }
      }
    }
  });
});

describe('where the problem has no answer', () => {
  it('stops at Σ c ln(1/ε): just below it the payload ratio tends to zero, at and past it there is none', () => {
    const stages = [{ ispS: 300, epsilon: 0.08 }, { ispS: 350, epsilon: 0.1 }, { ispS: 450, epsilon: 0.12 }];
    const limit = G0 * (300 * Math.log(1 / 0.08) + 350 * Math.log(1 / 0.1) + 450 * Math.log(1 / 0.12));
    expect(rel(stagingLimit(stages), limit)).toBeLessThan(1e-15);
    let last = Infinity;
    for (const f of [0.5, 0.8, 0.9, 0.99, 0.999, 1 - 1e-6]) {
      const r = optimalStaging(stages, limit * f, 1000);
      expect(r, `${f} of the limit`).not.toBeNull();
      expect(r!.payloadRatio).toBeGreaterThan(0);
      expect(r!.payloadRatio).toBeLessThan(last);
      last = r!.payloadRatio;
    }
    expect(last).toBeLessThan(1e-12);
    expect(optimalStaging(stages, limit, 1000)).toBeNull();
    expect(stagingProblem(stages, limit)).toBe('beyondLimit');
    expect(stagingProblem(stages, limit * 1.01)).toBe('beyondLimit');
    expect(stagingProblem(stages, limit * 0.99)).toBeNull();
  });

  it('reports a stage the optimum would leave out, which the brute force confirms', () => {
    // A 200 s first stage under a 450 s second at 3 km/s: n1 > 1 needs
    // x = 1/η < 0.9·c1, where Σ c ln n = c2 ln((c2 − 0.9 c1)/(0.1 c2)) ≈ 7.9 km/s,
    // so below that the stationary point gives stage 1 a mass ratio under 1.
    const stages = [{ ispS: 200, epsilon: 0.1 }, { ispS: 450, epsilon: 0.1 }];
    expect(stagingProblem(stages, 3000)).toBe('stageWithoutDv');
    expect(optimalStaging(stages, 3000, 1000)).toBeNull();
    let best = -1, arg = -1;
    for (let d1 = 0; d1 <= 3000; d1 += 1) {
      const p = handRatio(stages, [d1, 3000 - d1]);
      if (p > best) { best = p; arg = d1; }
    }
    expect(arg).toBe(0);
    expect(stagingProblem(stages, 9000)).toBeNull();
  });

  it('refuses input that is not a vehicle', () => {
    const ok = [{ ispS: 300, epsilon: 0.1 }];
    expect(stagingProblem([], 1000)).toBe('invalid');
    for (const bad of [0, 1, -0.1, NaN]) expect(stagingProblem([{ ispS: 300, epsilon: bad }], 1000)).toBe('invalid');
    for (const bad of [0, -300, NaN, Infinity]) expect(stagingProblem([{ ispS: bad, epsilon: 0.1 }], 1000)).toBe('invalid');
    for (const bad of [0, -1, NaN, Infinity]) expect(stagingProblem(ok, bad)).toBe('invalid');
    for (const bad of [-1, NaN, Infinity]) {
      expect(optimalStaging(ok, 1000, bad)).toBeNull();
      expect(stagingProblem(ok, 1000, bad), `payload ${bad}`).toBe('invalid');
    }
    expect(stagingProblem(ok, 1000, 0)).toBeNull();
  });

  it('gives a reason for every null answer, and none for an answer', () => {
    // A null from optimalStaging with no reason from stagingProblem would leave
    // the D05 page with nothing to say, so the two are held to each other over
    // every kind of input above.
    const stageSets: StagingStage[][] = [
      [],
      [{ ispS: 300, epsilon: 0.1 }],
      [{ ispS: 300, epsilon: 1 }],
      [{ ispS: 200, epsilon: 0.1 }, { ispS: 450, epsilon: 0.1 }],
      [{ ispS: 300, epsilon: 0.08 }, { ispS: 350, epsilon: 0.1 }, { ispS: 450, epsilon: 0.12 }],
    ];
    let nulls = 0, answers = 0;
    for (const stages of stageSets) {
      for (const dv of [-1, 0, 1, 1000, 3000, 7000, 9000, 12000, 30000, NaN]) {
        for (const pay of [-1, 0, 1000, NaN]) {
          const r = optimalStaging(stages, dv, pay);
          const why = stagingProblem(stages, dv, pay);
          if (r === null) { nulls++; expect(why, `${JSON.stringify(stages)} ${dv} ${pay}`).not.toBeNull(); }
          else { answers++; expect(why, `${JSON.stringify(stages)} ${dv} ${pay}`).toBeNull(); }
        }
      }
    }
    expect(nulls).toBeGreaterThan(0);
    expect(answers).toBeGreaterThan(0);
  });
});

describe('the masses it returns', () => {
  it('rebuild the stack: ε, n, the rocket equation and the gross mass, worked by hand', () => {
    // Bound 1e-12 relative: sums and quotients of the returned masses.
    const stages = catalogueStages('saturnv');
    const pay = 59000, dv = 12000;
    const r = optimalStaging(stages, dv, pay)!;
    let total = 0;
    for (let i = 0; i < stages.length; i++) {
      let m0 = pay;
      for (let j = i; j < stages.length; j++) m0 += r.structureMass[j] + r.propellantMass[j];
      const mf = m0 - r.propellantMass[i];
      expect(rel(r.structureMass[i] / (r.structureMass[i] + r.propellantMass[i]), stages[i].epsilon), `ε${i}`).toBeLessThan(1e-12);
      expect(rel(r.stageMass[i], r.structureMass[i] + r.propellantMass[i]), `m${i}`).toBeLessThan(1e-12);
      expect(rel(m0 / mf, r.massRatio[i]), `n${i}`).toBeLessThan(1e-12);
      expect(rel((m0 - r.stageMass[i]) / m0, r.stagePayloadRatio[i]), `π${i}`).toBeLessThan(1e-12);
      total += G0 * stages[i].ispS * Math.log(m0 / mf);
      if (i === 0) expect(rel(m0, r.grossMass), 'gross').toBeLessThan(1e-12);
    }
    expect(rel(total, dv)).toBeLessThan(1e-12);
    expect(rel(pay / r.grossMass, r.payloadRatio)).toBeLessThan(1e-12);
    expect(rel(splitPayloadRatio(stages, r.stageDv), r.payloadRatio)).toBeLessThan(1e-12);
    // masses scale with the payload; the ratios do not depend on it
    const twice = optimalStaging(stages, dv, 2 * pay)!;
    expect(rel(twice.grossMass, 2 * r.grossMass)).toBeLessThan(1e-12);
    const none = optimalStaging(stages, dv, 0)!;
    expect(none.grossMass).toBe(0);
    expect(none.payloadRatio).toBe(r.payloadRatio);
  });
});

describe('NPTEL Lecture 20 worked examples (IIT Bombay), copied verbatim', () => {
  // The lecture takes g0 = 9.81 m/s² ("4000/(2×9.81×240)"). Its exhaust speed
  // 9.81·Isp is passed as an Isp in this module's G0, so that c is the
  // lecture's own and what is compared is the method, not the constant.
  const lectureIsp = (isp: number): number => (9.81 * isp) / G0;

  it('"Velocity Constraint Example": two equal stages, 4000 m/s', () => {
    // Slide 7/15: "A 2-stage sounding rocket has ε1 = ε2 = 0.15. Determine
    // optimal π's & m0 for a m* of 10 kg, if V* required is 4000 m/s while
    // burning a propellant of Isp = 240s."
    // Slide 8/15: "β = V*/(N g0 Isp) = 4000/(2×9.81×240) = 0.8494;
    // π1 = π2 = π = (e^−β − ε)/(1 − ε) = (0.428 − 0.15)/0.85 = 0.3267;
    // π* = ((e^−β − ε)/(1 − ε))^N = 0.3267² = 0.1067; m0 = 93.7kg"
    // (π_i: mass above stage i over the stack at its ignition; ε = ms/(ms+mp).)
    //
    // Bounds, half a unit of each printed last digit, except β: the slide
    // truncates 4000/4708.8 = 0.84947… to 0.8494, so its bound is one unit
    // (1e-4). That one was set after working the slide's arithmetic by hand,
    // before this code was run against it.
    //
    // π's bound was first 5e-5 like the others, and the comparison missed it by
    // 1.4e-5: this module gives 0.326636, the slide prints 0.3267. Worked by
    // hand, the slide evaluates π from its truncated β = 0.8494
    // (e^−0.8494 = 0.42767 → π = 0.32667), not from 0.84947 (→ 0.32664), which
    // the next line shows. So π's bound is now half a printed unit plus what
    // that truncation is worth, |∂π/∂β|·1e-4 = 0.503·1e-4: 1.0e-4 in all. It
    // was set after seeing the result, and the finding is the slide's.
    expect(Math.abs((Math.exp(-0.8494) - 0.15) / 0.85 - 0.3267)).toBeLessThan(5e-5);
    const stages = [{ ispS: lectureIsp(240), epsilon: 0.15 }, { ispS: lectureIsp(240), epsilon: 0.15 }];
    const r = optimalStaging(stages, 4000, 10)!;
    const c = 9.81 * 240;
    expect(Math.abs(r.stageDv[0] / c - 0.8494)).toBeLessThan(1e-4);
    expect(Math.abs(1 / r.massRatio[0] - 0.428)).toBeLessThan(5e-4); // e^−β
    for (const p of r.stagePayloadRatio) expect(Math.abs(p - 0.3267)).toBeLessThan(1.0e-4);
    expect(Math.abs(r.payloadRatio - 0.1067)).toBeLessThan(5e-5);
    expect(Math.abs(r.grossMass - 93.7)).toBeLessThan(0.05);
  });

  it('"Payload Constraint Example": the same stages at π* = 0.15 need 3466.4 m/s', () => {
    // Slide 10/15: "π1 = π2 = √π* = 0.387; V* = −g0 Isp N ln[ε + (1−ε)π]
    // = −9.81×240×2×ln[0.15+0.85×0.387] = −2354.4×2×(−1.4482) = 3466.4m/s"
    // (the middle factor is misprinted: 2 ln 0.47895 = −1.4723, and that is what
    // gives 3466.4; recorded here, not relied on).
    // So at 3466.4 m/s the optimum must give π = 0.387 (±5e-4, its printed
    // precision), and π* = 0.15 within what rounding π to 0.387 before the
    // slide computed V* costs: 2·0.387·5e-4 < 3.9e-4.
    const stages = [{ ispS: lectureIsp(240), epsilon: 0.15 }, { ispS: lectureIsp(240), epsilon: 0.15 }];
    const r = optimalStaging(stages, 3466.4, 10)!;
    for (const p of r.stagePayloadRatio) expect(Math.abs(p - 0.387)).toBeLessThan(5e-4);
    expect(Math.abs(r.payloadRatio - 0.15)).toBeLessThan(3.9e-4);
  });

  describe('"Unequal Stages Example": Angara 1.2 redesigned for a payload fraction of 0.025', () => {
    // Slide 11/15: "Angara 1.2, is to be redesigned to have a payload fraction
    // of 0.025. 1-Stage: Isp1 = 310s; ε1 = 0.072  2-Stage: Isp2 = 342.5s;
    // ε2 = 0.089. If fixed stage parameters are as follows, determine new
    // stage-wise payload ratios."
    // Slide 12/15: "Old Parameters: π1 = 0.188; π2 = 0.124; V* = 9633.9m/s
    // π1 = −0.0776λ/(λ+3041.1); π2 = −0.0977λ/(λ+3359.9) → 0.025 = … →
    // 0.0174λ² + 160.02λ + 2.5544×10⁵ = 0
    // λ1, λ2 = −2055.9, −7140.7 → π1 = 0.162; π2 = 0.154; π* = 0.029
    // V*−optim = 4491.5 + 3846.4 = 8337.8m/s"
    //
    // The lecture maximises V* at fixed π* (its "H_V"); this module maximises π*
    // at fixed Δv. Both are the same stationarity condition: its
    // π_i = −λε_i/((1−ε_i)(λ + c_i)) is this module's π_i with x = 1/η = −λ.
    // So the test finds the Δv at which the optimum's π* is 0.025, then compares.
    const stages = [{ ispS: lectureIsp(310), epsilon: 0.072 }, { ispS: lectureIsp(342.5), epsilon: 0.089 }];
    const c = [9.81 * 310, 9.81 * 342.5];
    const lectureV = (p1: number, p2: number): number =>
      -(c[0] * Math.log(0.072 + 0.928 * p1) + c[1] * Math.log(0.089 + 0.911 * p2));
    const atRatio = (target: number): { dv: number; r: NonNullable<ReturnType<typeof optimalStaging>> } => {
      let lo = 1, hi = stagingLimit(stages) * (1 - 1e-12);
      for (let k = 0; k < 200; k++) {
        const mid = (lo + hi) / 2;
        if (optimalStaging(stages, mid, 1)!.payloadRatio > target) lo = mid;
        else hi = mid;
      }
      return { dv: lo, r: optimalStaging(stages, lo, 1)! };
    };
    const { dv, r } = atRatio(0.025);

    it('reproduces the valid root λ = −2055.9 and π1 = 0.162, π2 = 0.154', () => {
      expect(rel(r.payloadRatio, 0.025)).toBeLessThan(1e-9);
      // λ: the slide solves a quadratic whose leading coefficient it prints to
      // three figures (0.0174 for 0.025 − 0.0776·0.0977…); the root moves by
      // |∂λ/∂a| ≈ 4.8e4 per unit of it, so half a unit of that last figure
      // (5e-5) is worth 2.4 on λ. Bound 2.5, derived before the comparison.
      expect(Math.abs(1 / r.eta - 2055.9)).toBeLessThan(2.5);
      // π_i: half a unit of the printed third decimal (5e-4) plus the most
      // that bound on λ moves them (|∂π1/∂λ| 2.4e-4, |∂π2/∂λ| 1.9e-4 per unit,
      // times 2.5): 1.1e-3 and 1.0e-3.
      expect(Math.abs(r.stagePayloadRatio[0] - 0.162)).toBeLessThan(1.1e-3);
      expect(Math.abs(r.stagePayloadRatio[1] - 0.154)).toBeLessThan(1.0e-3);
      // The other root, −7140.7, is the one the lecture leaves to the student to
      // reject: x = 7140.7 m/s is above c1, outside the interval this module
      // searches, and gives π1 < 0.
      expect(7140.7).toBeGreaterThan(c[0]);
      expect((-0.072 * -7140.7) / (0.928 * (-7140.7 + c[0]))).toBeLessThan(0);
    });

    it('finding: the slide\'s π* = 0.029 and V* = 8337.8 m/s do not follow from its own π1, π2', () => {
      // Its printed π1·π2 = 0.162·0.154 = 0.0249, the 0.025 it was solved for
      // (within 1.6e-4, the printed rounding), not 0.029; the lecture says as
      // much ("your pi star will be close to 0.025").
      expect(Math.abs(0.162 * 0.154 - 0.025)).toBeLessThan(1.6e-4);
      expect(Math.abs(0.162 * 0.154 - 0.029)).toBeGreaterThan(1.6e-4);
      // Its own V* formula on its own π1, π2 gives ≈ 9 521 m/s, not 8 337.8.
      // This module's Δv at π* = 0.025 agrees with that: bound 28 m/s, the
      // printed π's uncertainties above (1.1e-3, 1.0e-3) times |∂V/∂π1| ≈ 12 700
      // and |∂V/∂π2| ≈ 13 300 m/s, fixed before the comparison.
      const fromItsPis = lectureV(0.162, 0.154);
      expect(Math.abs(dv - fromItsPis)).toBeLessThan(28);
      expect(Math.abs(dv - 8337.8)).toBeGreaterThan(1000);
    });

    it('the old Angara 1.2 split is consistent with the notation, and the optimum beats it at its Δv', () => {
      // The slide's V* = 9633.9 m/s from its π1 = 0.188, π2 = 0.124 checks the
      // reading of ε and g0: bound 13.5 m/s, the V* change of half a unit in each
      // printed π (≈ 5.7 + 7.6 m/s).
      expect(Math.abs(lectureV(0.188, 0.124) - 9633.9)).toBeLessThan(13.5);
      // At that Δv the optimum carries more than the real split, even at the
      // real split's most favourable rounding (0.188·0.124 + 1.6e-4).
      expect(optimalStaging(stages, 9633.9, 1)!.payloadRatio).toBeGreaterThan(0.188 * 0.124 + 1.6e-4);
    });
  });
});
