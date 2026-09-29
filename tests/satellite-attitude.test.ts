/**
 * The attitude cores of the satellite builder (roadmap D06,
 * docs/ROADMAP-PART2-3.md; Phase 4 map §2.2 D, track A2), src/orbit/attitude.ts,
 * held to their published worked examples and to analytic references.
 *
 * REFERENCE. S. R. Starin (NASA GSFC) and J. Eterno (SwRI), "Attitude
 * Determination and Control Systems", §19.1 (the manuscript of *The New
 * SMAD*'s chapter), NTRS 20110007070:
 * https://ntrs.nasa.gov/citations/20110007070
 * https://ntrs.nasa.gov/api/citations/20110007070/downloads/20110007070.pdf
 * Table 19-4 (PDF pp. 9–10), Table 19-11 (p. 20), Table 19-12 (p. 21) and the
 * thruster example in the text of p. 19. Two spacecraft: FireSat (700 km,
 * polar) and SCS (21 000 km, equatorial).
 *
 * TOLERANCE, fixed before the first run (the map's rule for these tables):
 * ±½ unit in the last digit the chapter prints, read off the printed text by
 * `printed` below (the chapter's "1.8x10-6", passed as '1.8e-6', → ±0.05 ×
 * 10⁻⁶; "0.046" → ±0.0005; "0.1" → ±0.05). No comparison with the chapter in
 * this file is looser. Where a printed figure is a defect (below), the
 * equation is held instead to the corrected figure — the map's
 * recomputation, or this file's, written with its digits before the run —
 * at ±½ unit in that figure's last digit.
 *
 * INPUTS are the chapter's, as printed: R = 6 378 km + altitude (7 078 km and
 * 27 378 km; the code's R_EARTH is 137 m more, which moves no printed digit),
 * the periods 5 926 s and 45 083 s, the speeds 7 504 m/s and 3 816 m/s.
 * Where a row feeds another the chapter feeds its printed figure (T_D =
 * 4.4 × 10⁻⁵ N·m into the wheel), and so do the tests. The module uses the
 * code's μ = MU_EARTH (the chapter prints 3.986 × 10¹⁴) and c = C_LIGHT (the
 * chapter uses 3 × 10⁸ m/s); the first test holds the code's μ to the
 * chapter's periods and speeds.
 *
 * SOURCE DEFECTS, recorded, not tuned away. The equation is tested; the
 * printed figure is asserted NOT to follow from its own inputs, and the slip
 * that produces it is shown.
 * - D1, Table 19-4, FireSat aerodynamic torque: printed 1.7 × 10⁻⁵ N·m is
 *   ½ρC_D·A·V² without the 0.2 m arm the working writes; with it,
 *   3.38 × 10⁻⁶ N·m (map §2.2 D).
 * - D2, Table 19-4, FireSat solar torque: the working multiplies by 0.5,
 *   which the printed equation (and the SCS column) does not have; printed
 *   3.3 × 10⁻⁶ N·m, without it 6.57 × 10⁻⁶ N·m (map §2.2 D).
 * - D3, Table 19-11, bias momentum for 0.1° (0.0017 rad): printed
 *   37.7 N·m·s; its own inputs give 38.3, the exact 0.1° gives 37.3
 *   (Phase 4 references report §9; not in the map's table). The 1° row's
 *   3.8 follows from 0.017 rad or from 37.7/10, not from the exact 1°
 *   (3.73); the test feeds 0.017 rad and records the exact figure.
 * - D4, Table 19-12, SCS thruster force against the disturbance: printed
 *   F = (1.2 × 10⁻⁵ N·m)/(0.5 m) = 6 × 10⁻⁶ N; the quotient is 2.4 × 10⁻⁵ N,
 *   and 6 × 10⁻⁶ is the product T·L. Found by this track (checked on the page
 *   image); neither the map nor the references report lists it.
 * - D5, Table 19-11, FireSat wheel: "a margin of >9" for a 0.4 N·m·s wheel
 *   against the 0.046 N·m·s it prints; 0.4/0.046 is 8.7.
 * Slips that change no result: SCS "A_s = 2.5 m × 2.0 m = 3 m²" (the working
 * uses 5 m², and so do the tests); "B = … = 4.4 × 10⁻⁵ N·m" (B is in tesla);
 * T_D "of 4.4 × 10⁻⁵ N·m·s" in Table 19-11's torquer row (a torque, N·m).
 * A rounding: Table 19-12 rounds the slew's α = 0.167°/s² = 0.00291 rad/s² to
 * 0.003 before multiplying; 0.72 N follows from the printed α, 0.70 N from
 * the unrounded one. The test feeds the printed α and records both.
 *
 * The pointing loss is not in the chapter; it is held to the half-power point
 * and a Gaussian beam (analytic), with the form of MIT OCW 16.851 (2003),
 * lecture "Satellite Communication", slide 23:
 * https://ocw.mit.edu/courses/16-851-satellite-engineering-fall-2003/818606568cbb5f2e4116783f6eb0573e_l21satelitecomm2_done.pdf
 */
import { describe, expect, it } from 'vitest';
import {
  EARTH_DIPOLE_MOMENT, aeroTorque, attitudeCore, biasMomentum, dipoleField, dipoleFieldAt, dipoleLatitudeFactor,
  gravityGradientTorque, magneticTorque, momentumDumpForce, pointingLoss, slewTorque, solarTorque,
  thrusterForce, torquerDipole, wheelMomentumCyclic,
} from '../src/orbit/attitude';
import { C_LIGHT } from '../src/orbit/applications';
import { orbitFacts } from '../src/orbit/kepler';
import { circularSpeed } from '../src/physics/orbital';
import { DEG } from '../src/physics/constants';

/** A figure as the chapter prints it: its value, and half a unit in its last printed digit. */
function printed(text: string): { value: number; half: number } {
  const [mantissa, exponent = '0'] = text.split('e');
  const decimals = mantissa.includes('.') ? mantissa.split('.')[1].length : 0;
  return { value: Number(text), half: 0.5 * 10 ** (Number(exponent) - decimals) };
}

/** `x` reproduces the printed figure to ½ unit in its last digit. */
function expectPrinted(x: number, text: string): void {
  const p = printed(text);
  expect(Math.abs(x - p.value), `${x} against the printed ${text} (±${p.half})`).toBeLessThanOrEqual(p.half);
}

/** `x` does not reproduce the printed figure: a source defect. */
function expectNotPrinted(x: number, text: string): void {
  const p = printed(text);
  expect(Math.abs(x - p.value), `${x} against the printed ${text} (±${p.half})`).toBeGreaterThan(p.half);
}

// the chapter's orbits: R = 6 378 km + altitude
const FIRESAT_R = 7.078e6, SCS_R = 2.7378e7;
const periodAt = (r: number) => orbitFacts({ a: r, e: 0, i: 0, raan: 0, argp: 0, m0: 0, jd0: 2451545 }, false).period;

describe('the chapter\'s orbits from the code\'s μ (Starin & Eterno Tables 19-4, 19-11)', () => {
  it('give its periods, 5926 s and 45 083 s, and its speeds, 7504 m/s and 3816 m/s', () => {
    expectPrinted(periodAt(FIRESAT_R), '5926');
    expectPrinted(periodAt(SCS_R), '45083');
    expectPrinted(circularSpeed(FIRESAT_R), '7504');
    expectPrinted(circularSpeed(SCS_R), '3816');
  });
});

describe('disturbance torques (Starin & Eterno Table 19-4, PDF pp. 9–10)', () => {
  it('gravity gradient: FireSat 1.8e-6 N·m at 1° and 4.4e-5 at 30°, SCS 5.0e-7 at 10°', () => {
    expectPrinted(gravityGradientTorque(FIRESAT_R, 90, 60, 1 * DEG), '1.8e-6');
    expectPrinted(gravityGradientTorque(FIRESAT_R, 90, 60, 30 * DEG), '4.4e-5');
    expectPrinted(gravityGradientTorque(SCS_R, 120, 70, 10 * DEG), '5.0e-7');
  });

  it('solar pressure: SCS 1.2e-5 N·m, from 2.5 m × 2.0 m = 5 m² (the "3 m²" printed is a slip)', () => {
    expectPrinted(solarTorque(1367, 2.5 * 2.0, 0.7, 0, 0.3), '1.2e-5');
    // with the 3 m² as printed it would not: the working used 5 m²
    expectNotPrinted(solarTorque(1367, 3, 0.7, 0, 0.3), '1.2e-5');
  });

  it('solar pressure: FireSat 6.57e-6 N·m by the equation; the printed 3.3e-6 is defect D2 (an extra 0.5)', () => {
    const t = solarTorque(1367, 2 * 1.5, 0.6, 0, 0.3);
    // the map's recomputation, 6.57e-6, to ½ unit in its last digit. Its third
    // digit is the code's c: the chapter's 3e8 gives 6.5616e-6, which is 6.56
    // (the references report rounds to 6.6); the printed 2-digit figures do not move
    expectPrinted(t, '6.57e-6');
    expectPrinted((t * C_LIGHT) / 3e8, '6.56e-6');
    expectNotPrinted(t, '3.3e-6');
    // the slip: the working's factor 0.5 gives the printed figure
    expectPrinted(0.5 * t, '3.3e-6');
  });

  it('aerodynamic: SCS 2.2e-11 N·m at 1e-18 kg/m³', () => {
    expectPrinted(aeroTorque(1e-18, 2.0, 5, 3816, 0.3), '2.2e-11');
  });

  it('aerodynamic: FireSat 3.38e-6 N·m by the equation; the printed 1.7e-5 is defect D1 (the 0.2 m arm left out)', () => {
    const t = aeroTorque(1e-13, 2.0, 3, 7504, 0.2);
    // the map's recomputation, 3.38e-6, to ½ unit in its last digit
    expectPrinted(t, '3.38e-6');
    expectNotPrinted(t, '1.7e-5');
    // the slip: the same product with no arm (1 m) gives the printed figure
    expectPrinted(aeroTorque(1e-13, 2.0, 3, 7504, 1), '1.7e-5');
  });

  it('magnetic: B = 4.4e-5 T over FireSat\'s poles, 4.4e-5 N·m on 1 A·m²; SCS 4.6e-7 N·m at λ = 1.2', () => {
    const B = dipoleField(FIRESAT_R);
    expectPrinted(B, '4.4e-5');
    // dipoleField is the polar λ = 2, the chapter's for a polar orbit
    expect(B).toBe(dipoleFieldAt(FIRESAT_R, 2));
    expectPrinted(magneticTorque(1, B), '4.4e-5');
    expectPrinted(magneticTorque(1, dipoleFieldAt(SCS_R, 1.2)), '4.6e-7');
  });
});

describe('wheels and torquers (Starin & Eterno Table 19-11, PDF p. 20, FireSat)', () => {
  it('the two largest disturbances aligned: T_D = T_g + T_m = 8.8e-5 N·m', () => {
    const tg = gravityGradientTorque(FIRESAT_R, 90, 60, 30 * DEG);
    const tm = magneticTorque(1, dipoleField(FIRESAT_R));
    expectPrinted(tg + tm, '8.8e-5');
  });

  it('slew torque: 30° in 10 min at 90 kg·m² takes 5.2e-4 N·m', () => {
    expectPrinted(slewTorque(30 * DEG, 90, 600), '5.2e-4');
  });

  it('wheel momentum: 0.046 N·m·s for FireSat, 0.1 for SCS, ≈0.1 with all four torques aligned', () => {
    expectPrinted(wheelMomentumCyclic(4.4e-5, 5926), '0.046');
    expectPrinted(wheelMomentumCyclic(1.2e-5, 45083), '0.1');
    expectPrinted(wheelMomentumCyclic(1e-4, 5926), '0.1');
  });

  it('the 0.4 N·m·s wheel\'s margin is 8.7, not the ">9" printed (defect D5)', () => {
    const margin = 0.4 / wheelMomentumCyclic(4.4e-5, 5926);
    expectPrinted(margin, '8.7');
    expect(margin).toBeLessThan(9);
  });

  it('bias momentum: 3.8 N·m·s for 1°; 38.3 for 0.1° (0.0017 rad), where the printed 37.7 is defect D3', () => {
    // 1°: the chapter prints no angle in rad for it. 0.017 rad (0.1°'s
    // 0.0017 × 10) gives 3.83, and so does its own 37.7/10 = 3.77; the exact
    // 0.01745 rad gives 3.73, which is not the printed 3.8 either. The 3.8 is
    // read here as the chapter's rounding, and the exact 1° is recorded.
    expectPrinted(biasMomentum(4.4e-5, 5926, 0.017), '3.8');
    expectPrinted(37.7 / 10, '3.8');
    expectPrinted(biasMomentum(4.4e-5, 5926, 1 * DEG), '3.73');
    expectNotPrinted(biasMomentum(4.4e-5, 5926, 1 * DEG), '3.8');
    const h = biasMomentum(4.4e-5, 5926, 0.0017);
    expectPrinted(h, '38.3');
    expectNotPrinted(h, '37.7');
    // nor does the exact 0.1° give the printed figure: 37.3
    expectPrinted(biasMomentum(4.4e-5, 5926, 0.1 * DEG), '37.3');
    expectNotPrinted(biasMomentum(4.4e-5, 5926, 0.1 * DEG), '37.7');
  });

  it('torquer dipole: 4.4e-5 N·m in 4.4e-5 T needs 1 A·m², the printed and the computed figures alike', () => {
    expectPrinted(torquerDipole(4.4e-5, 4.4e-5), '1');
    expectPrinted(torquerDipole(gravityGradientTorque(FIRESAT_R, 90, 60, 30 * DEG), dipoleField(FIRESAT_R)), '1');
  });
});

describe('thrusters (Starin & Eterno Table 19-12, PDF p. 21, SCS; and p. 19)', () => {
  it('against the disturbance: F = T_D/L = 2.4e-5 N; the printed 6e-6 is defect D4 (T·L, not T/L)', () => {
    const f = thrusterForce(1.2e-5, 0.5);
    expectPrinted(f, '2.4e-5');
    expectNotPrinted(f, '6e-6');
    // the slip: the product gives the printed figure
    expectPrinted(1.2e-5 * 0.5, '6e-6');
  });

  it('for a 30° slew in 60 s: F = Iα/L = 0.72 N from the printed α = 0.003 rad/s²', () => {
    // ω = 30°/60 s = 0.5°/s, reached in 5 % of the minute (3 s): α = 0.167°/s²
    const alpha = (30 * DEG) / 60 / 3;
    expectPrinted(alpha / DEG, '0.167');
    expectPrinted(alpha, '0.003');
    expectPrinted(thrusterForce(120 * 0.003, 0.5), '0.72');
    // the rounding recorded: the unrounded α gives 0.70 N
    expectPrinted(thrusterForce(120 * alpha, 0.5), '0.70');
  });

  it('to dump momentum: 1.0 N·m·s in 1 s bursts on 0.5 m takes 2.0 N', () => {
    expectPrinted(momentumDumpForce(1.0, 0.5, 1), '2.0');
  });

  it('p. 19: 50 N on a 1 m arm gives 1 N·m·s in a burst of 20 ms', () => {
    expectPrinted(momentumDumpForce(1, 1, 0.02), '50');
  });
});

/**
 * Analytic checks. Tolerance, fixed before the run: 1e-12 relative where the
 * two sides are the same closed form reached two ways (floating point only);
 * the Simpson integral below to 1e-9 relative (2000 intervals of a sine).
 */
describe('the laws behind the rules (analytic)', () => {
  it('gravity gradient: none on a principal axis, most at 45°, falling as 1/r³', () => {
    const at = (deg: number, r = FIRESAT_R) => gravityGradientTorque(r, 90, 60, deg * DEG);
    expect(at(0)).toBe(0);
    expect(at(90)).toBeLessThan(1e-12 * at(45));
    expect(at(44)).toBeLessThan(at(45));
    expect(at(46)).toBeLessThan(at(45));
    // (3μ/2r³)·|ΔI| at the peak, and the same for either sign of ΔI
    expect(at(45)).toBe(gravityGradientTorque(FIRESAT_R, 60, 90, 45 * DEG));
    expect(at(30, 2 * FIRESAT_R) * 8 / at(30)).toBeCloseTo(1, 12);
  });

  it('sunlight: a mirror (q = 1) takes twice the push of a black face; oblique light less; light from behind none', () => {
    const black = solarTorque(1367, 1, 0, 0, 1);
    expect(solarTorque(1367, 1, 1, 0, 1) / black).toBeCloseTo(2, 12);
    expect(solarTorque(1367, 1, 0, 60 * DEG, 1) / black).toBeCloseTo(0.5, 12);
    expect(solarTorque(1367, 1, 0, 120 * DEG, 1)).toBe(0);
    // 1367 W/m² over c is the propagator's P_SUN, 4.56e-6 N/m² (src/physics/propagator/forces.ts)
    expectPrinted(black, '4.56e-6');
  });

  it('the dipole: λ = √(1 + 3 sin²φ), 1 on the magnetic equator, 2 at a pole, the length of 3(m̂·r̂)r̂ − m̂', () => {
    expect(dipoleLatitudeFactor(0)).toBe(1);
    expect(dipoleLatitudeFactor(90 * DEG)).toBeCloseTo(2, 12);
    for (const deg of [10, 22.5, 45, 70]) {
      const phi = deg * DEG;
      // m̂ = z, r̂ = (cos φ, 0, sin φ)
      const bx = 3 * Math.sin(phi) * Math.cos(phi), bz = 3 * Math.sin(phi) ** 2 - 1;
      expect(dipoleLatitudeFactor(phi) / Math.hypot(bx, bz)).toBeCloseTo(1, 12);
    }
    // at the surface on the magnetic equator the field is 3.0e-5 T (the module's doc)
    expectPrinted(dipoleFieldAt(6378137, 1), '3.0e-5');
  });

  it('the slew torque covers the angle: accelerate half the time, brake the other half', () => {
    const angle = 30 * DEG, inertia = 90, time = 600;
    const alpha = slewTorque(angle, inertia, time) / inertia;
    const covered = 2 * (0.5 * alpha * (time / 2) ** 2);
    expect(covered / angle).toBeCloseTo(1, 12);
  });

  it('the wheel rule is π/(2√2) ≈ 1.11 times the swing a sine at twice the orbital rate builds in a quarter orbit', () => {
    const T = 4.4e-5, P = 5926;
    // Simpson over [0, P/4] of T·sin(4πt/P)
    const n = 2000, dt = P / 4 / n;
    let sum = 0;
    for (let k = 0; k <= n; k++) {
      const w = k === 0 || k === n ? 1 : k % 2 ? 4 : 2;
      sum += w * T * Math.sin((4 * Math.PI * k * dt) / P);
    }
    const swing = (sum * dt) / 3;
    expect(swing / (T * P / (2 * Math.PI))).toBeCloseTo(1, 9);
    expect(wheelMomentumCyclic(T, P) / (T * P / (2 * Math.PI)) / (Math.PI / (2 * Math.SQRT2))).toBeCloseTo(1, 12);
  });

  it('bias momentum is inversely as the accuracy; the torquer and the thruster invert the torque', () => {
    expect(biasMomentum(4.4e-5, 5926, 0.1 * DEG) / biasMomentum(4.4e-5, 5926, 1 * DEG)).toBeCloseTo(10, 12);
    expect(magneticTorque(torquerDipole(3e-5, 4e-5), 4e-5)).toBeCloseTo(3e-5, 18);
    expect(thrusterForce(0.36, 0.5) * 0.5).toBeCloseTo(0.36, 15);
    expect(thrusterForce(1, 0)).toBe(Infinity);
  });
});

/**
 * The pointing loss (analytic; MIT OCW 16.851 slide 23 prints the same law).
 * Tolerances, fixed before the run: exactly 3 dB at e = θ₃dB/2, to 1e-12 (it
 * is the definition of the half-power beamwidth); against a Gaussian main
 * lobe, G/G₀ = exp(−4 ln 2·(e/θ₃dB)²), whose loss is 40·ln 2·log₁₀e·(e/θ)² =
 * 12.04·(e/θ)² dB, the ratio is 12/12.0412 at every error, to 1e-12, which is
 * 0.34 % less (bound: under 0.35 %).
 */
describe('the pointing loss (D06 → link)', () => {
  it('is 3 dB at half the half-power beamwidth, 12 dB at the full width, 0 on the boresight', () => {
    const bw = 3.5 * DEG;
    expect(pointingLoss(bw / 2, bw)).toBeCloseTo(3, 12);
    expect(pointingLoss(bw, bw)).toBeCloseTo(12, 12);
    expect(pointingLoss(0, bw)).toBe(0);
    expect(pointingLoss(-bw / 2, bw)).toBeCloseTo(3, 12);
  });

  it('is a Gaussian main lobe with its constant 12.04 rounded to 12', () => {
    const gaussian = (x: number) => -10 * Math.log10(Math.exp(-4 * Math.LN2 * x * x));
    // the Gaussian's own half-power point
    expect(gaussian(0.5)).toBeCloseTo(10 * Math.log10(2), 12);
    for (const x of [0.05, 0.25, 0.5, 0.75, 1]) {
      const ratio = pointingLoss(x, 1) / gaussian(x);
      expect(ratio / (12 / (40 * Math.LN2 * Math.LOG10E))).toBeCloseTo(1, 12);
      expect(Math.abs(ratio - 1)).toBeLessThan(0.0035);
    }
  });
});

/**
 * SMAD's M against today's field (a cross-check of the constant, not a
 * tolerance on it). IGRF-14, 2025.0 column, degree 1:
 * https://www.ngdc.noaa.gov/IAGA/vmod/coeffs/igrf14coeffs.txt (fetched
 * 2026-09-29; the model: https://www.ngdc.noaa.gov/IAGA/vmod/igrf.html).
 * g₁⁰ = −29 350.0, g₁¹ = −1 410.3, h₁¹ = 4 545.5 nT at the reference radius
 * 6 371.2 km: the dipole's equatorial field B₀ = √(g₁⁰² + g₁¹² + h₁¹²) and
 * M = B₀·a³. The module's doc prints 7.69 × 10¹⁵ T·m³ and "about 1.4 %
 * high"; worked by hand before the run as 7.6897 × 10¹⁵ and +1.43 %, and held
 * here to ½ unit in those printed digits.
 */
describe('the Earth\'s dipole moment', () => {
  it('is SMAD\'s 7.8e15 T·m³, 1.4 % above the dipole of IGRF-14 for 2025', () => {
    expect(EARTH_DIPOLE_MOMENT).toBe(7.8e15);
    const b0 = Math.hypot(-29350.0, -1410.3, 4545.5) * 1e-9;
    const m = b0 * 6371.2e3 ** 3;
    expectPrinted(m, '7.69e15');
    expectPrinted((EARTH_DIPOLE_MOMENT / m - 1) * 100, '1.4');
  });
});

describe('the attitude core (src/orbit/satellite-cores.ts)', () => {
  it('is the module\'s own functions', () => {
    expect(attitudeCore.dipoleField).toBe(dipoleField);
    expect(attitudeCore.pointingLoss).toBe(pointingLoss);
    expect(Object.keys(attitudeCore)).toHaveLength(12);
  });

  it('takes the contract\'s arguments only, so a core passed to map() ignores the index', () => {
    // with λ as an optional second argument the index would be taken for λ: 0 T at the first radius
    const radii = [FIRESAT_R, SCS_R];
    expect(radii.map(attitudeCore.dipoleField)).toEqual(radii.map((r) => dipoleField(r)));
  });
});
