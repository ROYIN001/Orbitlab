/**
 * NRLMSISE-00 (src/physics/propagator/msis.ts) against the model's own
 * reference: the seventeen test cases of the distribution, whose output the
 * C release prints to seven figures (its DOCUMENTATION, §7, the same as NRL's
 * Fortran package), and 400 random points from ground to 1000 km run through
 * NRL's Fortran itself (tests/fixtures/msis/fortran-points.json, by pymsis).
 * The tolerances were fixed before the comparison: the printed rounding
 * (5 × 10⁻⁷) with a margin, 2 × 10⁻⁶, for the test cases; 10⁻⁴ for the
 * Fortran, which works in single precision. The first run found that bound
 * broken only by species at densities below one particle per cubic metre —
 * anomalous oxygen under 115 km (10⁻³² to 10⁻²⁸ m⁻³, up to 5 %) and hydrogen
 * at 74 km (4 × 10⁻⁵ m⁻³, 1.2 × 10⁻⁴) — where single precision runs out and
 * nothing is left to weigh; those are held only to staying below one.
 */
import { describe, expect, it } from 'vitest';
import { gtd7, gtd7d, msisDensity, MSIS_DEFAULT_SWITCHES, type MsisInput } from '../src/physics/propagator/msis';
import FORTRAN from './fixtures/msis/fortran-points.json';

const base: MsisInput = { doy: 172, sec: 29000, alt: 400, lat: 60, lon: -70, lst: 16, f107a: 150, f107: 150, ap: 4 };
const AP_ARRAY = [100, 100, 100, 100, 100, 100, 100];
const CASES: Partial<MsisInput>[] = [
  {}, { doy: 81 }, { sec: 75000, alt: 1000 }, { alt: 100 }, { lat: 0 }, { lon: 0 }, { lst: 4 }, { f107a: 70 }, { f107: 180 }, { ap: 40 },
  { alt: 0 }, { alt: 10 }, { alt: 30 }, { alt: 50 }, { alt: 70 },
  { apArray: AP_ARRAY }, { alt: 100, apArray: AP_ARRAY },
];
/** He, O, N₂, O₂, Ar, ρ, H, N, anomalous O, T∞, T — as the distribution's test prints them */
const EXPECTED = [
  [6.665177e5, 1.138806e8, 1.998211e7, 4.022764e5, 3.557465e3, 4.074714e-15, 3.475312e4, 4.095913e6, 2.667273e4, 1.250540e3, 1.241416e3],
  [3.407293e6, 1.586333e8, 1.391117e7, 3.262560e5, 1.559618e3, 5.001846e-15, 4.854208e4, 4.380967e6, 6.956682e3, 1.166754e3, 1.161710e3],
  [1.123767e5, 6.934130e4, 4.247105e1, 1.322750e-1, 2.618848e-5, 2.756772e-18, 2.016750e4, 5.741256e3, 2.374394e4, 1.239892e3, 1.239891e3],
  [5.411554e7, 1.918893e11, 6.115826e12, 1.225201e12, 6.023212e10, 3.584426e-10, 1.059880e7, 2.615737e5, 2.819879e-42, 1.027318e3, 2.068878e2],
  [1.851122e6, 1.476555e8, 1.579356e7, 2.633795e5, 1.588781e3, 4.809630e-15, 5.816167e4, 5.478984e6, 1.264446e3, 1.212396e3, 1.208135e3],
  [8.673095e5, 1.278862e8, 1.822577e7, 2.922214e5, 2.402962e3, 4.355866e-15, 3.686389e4, 3.897276e6, 2.667273e4, 1.220146e3, 1.212712e3],
  [5.776251e5, 6.979139e7, 1.236814e7, 2.492868e5, 1.405739e3, 2.470651e-15, 5.291986e4, 1.069814e6, 2.667273e4, 1.116385e3, 1.112999e3],
  [3.740304e5, 4.782720e7, 5.240380e6, 1.759875e5, 5.501649e2, 1.571889e-15, 8.896776e4, 1.979741e6, 9.121815e3, 1.031247e3, 1.024848e3],
  [6.748339e5, 1.245315e8, 2.369010e7, 4.911583e5, 4.578781e3, 4.564420e-15, 3.244595e4, 5.370833e6, 2.667273e4, 1.306052e3, 1.293374e3],
  [5.528601e5, 1.198041e8, 3.495798e7, 9.339618e5, 1.096255e4, 4.974543e-15, 2.686428e4, 4.889974e6, 2.805445e4, 1.361868e3, 1.347389e3],
  [1.375488e14, 0, 2.049687e19, 5.498695e18, 2.451733e17, 1.261066e-3, 0, 0, 0, 1.027318e3, 2.814648e2],
  [4.427443e13, 0, 6.597567e18, 1.769929e18, 7.891680e16, 4.059139e-4, 0, 0, 0, 1.027318e3, 2.274180e2],
  [2.127829e12, 0, 3.170791e17, 8.506280e16, 3.792741e15, 1.950822e-5, 0, 0, 0, 1.027318e3, 2.374389e2],
  [1.412184e11, 0, 2.104370e16, 5.645392e15, 2.517142e14, 1.294709e-6, 0, 0, 0, 1.027318e3, 2.795551e2],
  [1.254884e10, 0, 1.874533e15, 4.923051e14, 2.239685e13, 1.147668e-7, 0, 0, 0, 1.027318e3, 2.190732e2],
  [5.196477e5, 1.274494e8, 4.850450e7, 1.720838e6, 2.354487e4, 5.881940e-15, 2.500078e4, 6.279210e6, 2.667273e4, 1.426412e3, 1.408608e3],
  [4.260860e7, 1.241342e11, 4.929562e12, 1.048407e12, 4.993465e10, 2.914304e-10, 8.831229e6, 2.252516e5, 2.415246e-42, 1.027318e3, 1.934071e2],
];

const close = (got: number, want: number, rel: number, what: string): void => {
  if (want === 0) expect(got, what).toBe(0);
  else expect(Math.abs(got / want - 1), `${what}: ${got} against ${want}`).toBeLessThan(rel);
};

describe('NRLMSISE-00', () => {
  it.each(CASES.map((c, k) => [k + 1, c] as const))('gives test case %i of the distribution', (k, change) => {
    const input = { ...base, ...change };
    const switches = input.apArray ? MSIS_DEFAULT_SWITCHES.map((s, i) => (i === 9 ? -1 : s)) : MSIS_DEFAULT_SWITCHES;
    const out = gtd7(input, switches);
    const got = [...out.d, ...out.t];
    EXPECTED[k - 1].forEach((want, j) => close(got[j], want, 2e-6, `case ${k}, output ${j}`));
  });

  it('adds the anomalous oxygen to the mass density for drag (GTD7D)', () => {
    const plain = gtd7(base);
    const drag = gtd7d(base);
    expect(drag.d[5] - plain.d[5]).toBeCloseTo(16 * 1.66e-24 * plain.d[8], 30);
    // in SI: kg/m³ from g/cm³
    expect(msisDensity(base) / drag.d[5]).toBeCloseTo(1000, 6);
  });

  const points = FORTRAN.points;
  it(`agrees with NRL's Fortran at ${points.length} random points`, () => {
    let worst = 0;
    for (const p of points) {
      const input: MsisInput = {
        doy: p.doy, sec: p.sec, alt: p.alt, lat: p.lat, lon: p.lon, lst: p.sec / 3600 + p.lon / 15,
        f107a: p.f107a, f107: p.f107, ap: p.ap[0], apArray: p.ap,
      };
      const switches = [1, ...Array<number>(23).fill(1)];
      if (p.storm) switches[9] = -1;
      const out = gtd7d(input, switches);
      const species: [number, number | null, string][] = [
        [out.d[0], p.He, 'He'], [out.d[1], p.O, 'O'], [out.d[2], p.N2, 'N2'], [out.d[3], p.O2, 'O2'], [out.d[4], p.Ar, 'Ar'],
        [out.d[6], p.H, 'H'], [out.d[7], p.N, 'N'], [out.d[8], p.anomO, 'anomalous O'], [out.d[5], p.rho, 'ρ'], [out.t[1], p.T, 'T'],
      ];
      for (const [got, want, name] of species) {
        if (want === null || want === 0) continue;
        if (want < 1) { expect(got, name).toBeLessThan(1); continue; }
        const err = Math.abs(got / want - 1);
        worst = Math.max(worst, err);
        expect(err, `${name} at ${p.alt.toFixed(1)} km: ${got} against ${want}`).toBeLessThan(1e-4);
      }
    }
    expect(worst).toBeGreaterThan(0);
  });
});
