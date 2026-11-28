/**
 * The Sun and the Moon of the astro base (PF-14): ERFA's two series, whole. The Moon is `moon98` (Meeus 1998,
 * from ELP2000-82), geocentric on GCRS axes; the Earth-Moon barycentre is `plan94` (Simon et al. 1994) for the
 * third body, heliocentric on the mean equator and equinox of J2000; the Sun is formed from the two. Ported from
 * ERFA 2.0.1.5 (liberfa), read from the pyerfa 2.0.1.5 source archive, function by function in ERFA's own order of
 * operations, every term kept, the iteration of Kepler's equation in `plan94` included; the tables are in
 * ./sun-moon-tables. The helpers `s2pv`, `pfw06`, `obl06`, `ir`, `rz`, `rx`, `rxpv`, `rxp` and `anpm` are ported
 * here and are private to this module.
 *
 * Which ERFA routine each exported value equals: `moonState` = `moon98`; `earthMoonBarycentreState` =
 * `plan94(…, 3)`; both with astronomical units and days turned to metres and seconds by `AU` and 86,400 s.
 *
 * Conventions:
 * - The time argument is TT for all three (`plan94` is defined on TDB; TT is within 1.7 ms of it).
 * - `sunState`: with B = `FRAME_BIAS` and μ = `EARTH_MOON_MASS_RATIO`, r = −(Bᵀ·r_emb − r_moon / (1 + μ)), and
 *   the same for the velocity: geocentric, GCRF.
 * - Positions are geometric: no light time, no aberration.
 * - Outside the years 1000 to 3000, where ERFA's `plan94` returns a warning status, the same numbers are returned
 *   and nothing is reported.
 * - A non-finite number in any input gives NaN in every number returned, and nothing throws.
 * - Each function returns a fresh object; an input is never changed.
 */
import type { Jd2 } from './time';
import type { V3 } from './geodesy';
import { type State, FRAME_BIAS, matT, matVec } from './frames';
import { MOON98_B, MOON98_LR, PLAN94_EMB } from './sun-moon-tables';

/** m, ERFA_DAU */
export const AU = 149597870700;
/** Earth / Moon */
export const EARTH_MOON_MASS_RATIO = 81.30056;

// erfam.h
const DPI = 3.141592653589793238462643;
const D2PI = 6.283185307179586476925287;
const DD2R = 1.745329251994329576923691e-2;
const DAS2R = 4.848136811095359935899141e-6;
const DJC = 36525.0;
const DJM = 365250.0;
const DJ00 = 2451545.0;
const DAU = 149597870.7e3;
const DAY = 86400;

/** True unless every argument is finite (x * 0 is 0 only for a finite x, and cannot overflow). */
const nonFinite = (...v: number[]) => v.reduce((s, x) => s + x * 0, 0) !== 0;
const NANS = (): State => ({ r: { x: NaN, y: NaN, z: NaN }, v: { x: NaN, y: NaN, z: NaN } });

/** A position-velocity pair, ERFA's pv[2][3]. */
type Pv = [number[], number[]];

// ---- the helpers: ir, rz, rx, rxp, rxpv, s2pv, obl06, pfw06, anpm

/** `ir`: the identity matrix, row-major. */
const ir = (): number[] => [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0];

/** `rz`: rotate r about the z-axis, in place. */
function rz(psi: number, r: number[]): void {
  const s = Math.sin(psi), c = Math.cos(psi);
  const a00 = c * r[0] + s * r[3], a01 = c * r[1] + s * r[4], a02 = c * r[2] + s * r[5];
  const a10 = -s * r[0] + c * r[3], a11 = -s * r[1] + c * r[4], a12 = -s * r[2] + c * r[5];
  r[0] = a00; r[1] = a01; r[2] = a02; r[3] = a10; r[4] = a11; r[5] = a12;
}

/** `rx`: rotate r about the x-axis, in place. */
function rx(phi: number, r: number[]): void {
  const s = Math.sin(phi), c = Math.cos(phi);
  const a10 = c * r[3] + s * r[6], a11 = c * r[4] + s * r[7], a12 = c * r[5] + s * r[8];
  const a20 = -s * r[3] + c * r[6], a21 = -s * r[4] + c * r[7], a22 = -s * r[5] + c * r[8];
  r[3] = a10; r[4] = a11; r[5] = a12; r[6] = a20; r[7] = a21; r[8] = a22;
}

/** `rxp`: r·p. */
function rxp(r: number[], p: number[]): number[] {
  const wrp = [0, 0, 0];
  for (let j = 0; j < 3; j++) {
    let w = 0.0;
    for (let i = 0; i < 3; i++) w += r[3 * j + i] * p[i];
    wrp[j] = w;
  }
  return wrp;
}

/** `rxpv`: r·pv. */
const rxpv = (r: number[], pv: Pv): Pv => [rxp(r, pv[0]), rxp(r, pv[1])];

/** `s2pv`: spherical position and velocity to Cartesian. */
function s2pv(theta: number, phi: number, r: number, td: number, pd: number, rd: number): Pv {
  const st = Math.sin(theta), ct = Math.cos(theta);
  const sp = Math.sin(phi), cp = Math.cos(phi);
  const rcp = r * cp;
  const x = rcp * ct;
  const y = rcp * st;
  const rpd = r * pd;
  const w = rpd * sp - cp * rd;
  return [
    [x, y, r * sp],
    [-y * td - w * ct, x * td - w * st, rpd * cp + sp * rd],
  ];
}

/** `obl06`: mean obliquity, IAU 2006. */
function obl06(date1: number, date2: number): number {
  const t = ((date1 - DJ00) + date2) / DJC;
  return (84381.406 +
         (-46.836769 +
         (-0.0001831 +
         (0.00200340 +
         (-0.000000576 +
         (-0.0000000434) * t) * t) * t) * t) * t) * DAS2R;
}

/** `pfw06`: the IAU 2006 Fukushima-Williams bias-precession angles [gamb, phib, psib, epsa]. */
function pfw06(date1: number, date2: number): [number, number, number, number] {
  const t = ((date1 - DJ00) + date2) / DJC;
  const gamb = (-0.052928 +
               (10.556378 +
               (0.4932044 +
               (-0.00031238 +
               (-0.000002788 +
               (0.0000000260)
               * t) * t) * t) * t) * t) * DAS2R;
  const phib = (84381.412819 +
               (-46.811016 +
               (0.0511268 +
               (0.00053289 +
               (-0.000000440 +
               (-0.0000000176)
               * t) * t) * t) * t) * t) * DAS2R;
  const psib = (-0.041775 +
               (5038.481484 +
               (1.5584175 +
               (-0.00018522 +
               (-0.000026452 +
               (-0.0000000148)
               * t) * t) * t) * t) * t) * DAS2R;
  return [gamb, phib, psib, obl06(date1, date2)];
}

/** `anpm`: normalize an angle into [−π, +π). */
function anpm(a: number): number {
  let w = a % D2PI;
  if (Math.abs(w) >= DPI) w -= a < 0.0 ? -Math.abs(D2PI) : Math.abs(D2PI);
  return w;
}

// ---- moon98

/** The E factor of a term: e for |M| = 1, e² for |M| = 2, else 1; [en, den]. */
function eFactor(nem: number, e: number, de: number, esq: number, desq: number): [number, number] {
  switch (Math.abs(nem)) {
    case 1: return [e, de];
    case 2: return [esq, desq];
    default: return [1.0, 0.0];
  }
}

/** `moon98`: the Moon, geocentric, GCRS, au and au/day; TT. */
function moon98(date1: number, date2: number): Pv {
  // Moon's mean longitude (Simon et al. 1994)
  const elp0 = 218.31665436, elp1 = 481267.88123421, elp2 = -0.0015786, elp3 = 1.0 / 538841.0, elp4 = -1.0 / 65194000.0;
  // Moon's mean elongation
  const d0 = 297.8501921, d1 = 445267.1114034, d2 = -0.0018819, d3 = 1.0 / 545868.0, d4 = 1.0 / 113065000.0;
  // Sun's mean anomaly
  const em0 = 357.5291092, em1 = 35999.0502909, em2 = -0.0001536, em3 = 1.0 / 24490000.0, em4 = 0.0;
  // Moon's mean anomaly
  const emp0 = 134.9633964, emp1 = 477198.8675055, emp2 = 0.0087414, emp3 = 1.0 / 69699.0, emp4 = -1.0 / 14712000.0;
  // Mean distance of the Moon from its ascending node
  const f0 = 93.2720950, f1 = 483202.0175233, f2 = -0.0036539, f3 = 1.0 / 3526000.0, f4 = 1.0 / 863310000.0;
  // Meeus A_1 (Venus), A_2 (Jupiter), A_3 (sidereal motion of the Moon in longitude), deg
  const a10 = 119.75, a11 = 131.849;
  const a20 = 53.09, a21 = 479264.290;
  const a30 = 313.45, a31 = 481266.484;
  // Meeus additive terms (deg)
  const al1 = 0.003958, al2 = 0.001962, al3 = 0.000318;
  const ab1 = -0.002235, ab2 = 0.000382, ab3 = 0.000175, ab4 = 0.000175, ab5 = 0.000127, ab6 = -0.000115;
  // Fixed term in distance (m)
  const r0 = 385000560.0;
  // Coefficients for the E factor
  const e1 = -0.002516, e2 = -0.0000074;

  // Centuries since J2000.0
  const t = ((date1 - DJ00) + date2) / DJC;

  // Fundamental arguments (radians) and derivatives (radians per Julian century)
  const elp = DD2R * ((elp0 + (elp1 + (elp2 + (elp3 + elp4 * t) * t) * t) * t) % 360.0);
  const delp = DD2R * (elp1 + (elp2 * 2.0 + (elp3 * 3.0 + elp4 * 4.0 * t) * t) * t);
  const d = DD2R * ((d0 + (d1 + (d2 + (d3 + d4 * t) * t) * t) * t) % 360.0);
  const dd = DD2R * (d1 + (d2 * 2.0 + (d3 * 3.0 + d4 * 4.0 * t) * t) * t);
  const em = DD2R * ((em0 + (em1 + (em2 + (em3 + em4 * t) * t) * t) * t) % 360.0);
  const dem = DD2R * (em1 + (em2 * 2.0 + (em3 * 3.0 + em4 * 4.0 * t) * t) * t);
  const emp = DD2R * ((emp0 + (emp1 + (emp2 + (emp3 + emp4 * t) * t) * t) * t) % 360.0);
  const demp = DD2R * (emp1 + (emp2 * 2.0 + (emp3 * 3.0 + emp4 * 4.0 * t) * t) * t);
  const f = DD2R * ((f0 + (f1 + (f2 + (f3 + f4 * t) * t) * t) * t) % 360.0);
  const df = DD2R * (f1 + (f2 * 2.0 + (f3 * 3.0 + f4 * 4.0 * t) * t) * t);

  // Meeus further arguments (da1 is ERFA's, al1, as written)
  const a1 = DD2R * (a10 + a11 * t);
  const da1 = DD2R * al1;
  const a2 = DD2R * (a20 + a21 * t);
  const da2 = DD2R * a21;
  const a3 = DD2R * (a30 + a31 * t);
  const da3 = DD2R * a31;

  // E factor, and square
  const e = 1.0 + (e1 + e2 * t) * t;
  const de = e1 + 2.0 * e2 * t;
  const esq = e * e;
  const desq = 2.0 * e * de;

  // The Meeus additive terms (deg) start the summations
  const elpmf = elp - f;
  const delpmf = delp - df;
  let vel = al1 * Math.sin(a1)
          + al2 * Math.sin(elpmf)
          + al3 * Math.sin(a2);
  let vdel = al1 * Math.cos(a1) * da1
           + al2 * Math.cos(elpmf) * delpmf
           + al3 * Math.cos(a2) * da2;
  let vr = 0.0;
  let vdr = 0.0;

  const a1mf = a1 - f;
  const da1mf = da1 - df;
  const a1pf = a1 + f;
  const da1pf = da1 + df;
  const dlpmp = elp - emp;
  const slpmp = elp + emp;
  let vb = ab1 * Math.sin(elp)
         + ab2 * Math.sin(a3)
         + ab3 * Math.sin(a1mf)
         + ab4 * Math.sin(a1pf)
         + ab5 * Math.sin(dlpmp)
         + ab6 * Math.sin(slpmp);
  let vdb = ab1 * Math.cos(elp) * delp
          + ab2 * Math.cos(a3) * da3
          + ab3 * Math.cos(a1mf) * da1mf
          + ab4 * Math.cos(a1pf) * da1pf
          + ab5 * Math.cos(dlpmp) * (delp - demp)
          + ab6 * Math.cos(slpmp) * (delp + demp);

  // Longitude and distance plus derivatives
  for (let n = MOON98_LR.length - 1; n >= 0; n--) {
    const x = MOON98_LR[n];
    const dn = x[0], emn = x[1], empn = x[2], fn = x[3];
    const [en, den] = eFactor(emn, e, de, esq, desq);
    const arg = dn * d + emn * em + empn * emp + fn * f;
    const darg = dn * dd + emn * dem + empn * demp + fn * df;
    let farg = Math.sin(arg);
    let v = farg * en;
    let dv = Math.cos(arg) * darg * en + farg * den;
    let coeff = x[4];
    vel += coeff * v;
    vdel += coeff * dv;
    farg = Math.cos(arg);
    v = farg * en;
    dv = -Math.sin(arg) * darg * en + farg * den;
    coeff = x[5];
    vr += coeff * v;
    vdr += coeff * dv;
  }
  const el = elp + DD2R * vel;
  const del = (delp + DD2R * vdel) / DJC;
  const r = (vr + r0) / DAU;
  const dr = vdr / DAU / DJC;

  // Latitude plus derivative
  for (let n = MOON98_B.length - 1; n >= 0; n--) {
    const x = MOON98_B[n];
    const dn = x[0], emn = x[1], empn = x[2], fn = x[3];
    const [en, den] = eFactor(emn, e, de, esq, desq);
    const arg = dn * d + emn * em + empn * emp + fn * f;
    const darg = dn * dd + emn * dem + empn * demp + fn * df;
    const farg = Math.sin(arg);
    const v = farg * en;
    const dv = Math.cos(arg) * darg * en + farg * den;
    const coeff = x[4];
    vb += coeff * v;
    vdb += coeff * dv;
  }
  const b = vb * DD2R;
  const db = vdb * DD2R / DJC;

  // Longitude, latitude to x, y, z (au)
  const pv = s2pv(el, b, r, del, db, dr);

  // IAU 2006 Fukushima-Williams bias-precession angles; mean ecliptic of date to GCRS
  const [gamb, phib, psib] = pfw06(date1, date2);
  const rm = ir();
  rz(psib, rm);
  rx(-phib, rm);
  rz(-gamb, rm);
  return rxpv(rm, pv);
}

// ---- plan94, the third body

/** `plan94` for np = 3: the Earth-Moon barycentre, heliocentric, J2000 equator and equinox, au and au/day; TDB. */
function plan94Emb(date1: number, date2: number): Pv {
  // Gaussian constant
  const GK = 0.017202098950;
  // Sin and cos of J2000.0 mean obliquity (IAU 1976)
  const SINEPS = 0.3977771559319137;
  const COSEPS = 0.9174820620691818;
  // Maximum number of iterations allowed to solve Kepler's equation
  const KMAX = 10;
  const { amas, a, dlm, e, pi, dinc, omega, kp, ca, sa, kq, cl, sl } = PLAN94_EMB;

  // Time: Julian millennia since J2000.0
  const t = ((date1 - DJ00) + date2) / DJM;

  // The mean elements
  let da = a[0] +
          (a[1] +
           a[2] * t) * t;
  let dl = (3600.0 * dlm[0] +
                    (dlm[1] +
                     dlm[2] * t) * t) * DAS2R;
  const de = e[0] +
           (e[1] +
            e[2] * t) * t;
  const dp = anpm((3600.0 * pi[0] +
                           (pi[1] +
                            pi[2] * t) * t) * DAS2R);
  const di = (3600.0 * dinc[0] +
                      (dinc[1] +
                       dinc[2] * t) * t) * DAS2R;
  const dom = anpm((3600.0 * omega[0] +
                            (omega[1] +
                             omega[2] * t) * t) * DAS2R);

  // The trigonometric terms
  const dmu = 0.35953620 * t;
  for (let k = 0; k < 8; k++) {
    const arga = kp[k] * dmu;
    const argl = kq[k] * dmu;
    da += (ca[k] * Math.cos(arga) +
           sa[k] * Math.sin(arga)) * 1e-7;
    dl += (cl[k] * Math.cos(argl) +
           sl[k] * Math.sin(argl)) * 1e-7;
  }
  const arga = kp[8] * dmu;
  da += t * (ca[8] * Math.cos(arga) +
             sa[8] * Math.sin(arga)) * 1e-7;
  for (let k = 8; k < 10; k++) {
    const argl = kq[k] * dmu;
    dl += t * (cl[k] * Math.cos(argl) +
               sl[k] * Math.sin(argl)) * 1e-7;
  }
  dl = dl % D2PI;

  // Iterative solution of Kepler's equation for the eccentric anomaly (ERFA's status, jstat, is not kept)
  const am = dl - dp;
  let ae = am + de * Math.sin(am);
  let k = 0;
  let dae = 1.0;
  while (k < KMAX && Math.abs(dae) > 1e-12) {
    dae = (am - ae + de * Math.sin(ae)) / (1.0 - de * Math.cos(ae));
    ae += dae;
    k++;
  }

  // True anomaly
  const ae2 = ae / 2.0;
  const at = 2.0 * Math.atan2(Math.sqrt((1.0 + de) / (1.0 - de)) * Math.sin(ae2), Math.cos(ae2));

  // Distance (au) and speed (radians per day)
  const r = da * (1.0 - de * Math.cos(ae));
  const v = GK * Math.sqrt((1.0 + 1.0 / amas) / (da * da * da));

  const si2 = Math.sin(di / 2.0);
  const xq = si2 * Math.cos(dom);
  const xp = si2 * Math.sin(dom);
  const tl = at + dp;
  const xsw = Math.sin(tl);
  const xcw = Math.cos(tl);
  const xm2 = 2.0 * (xp * xcw - xq * xsw);
  const xf = da / Math.sqrt(1 - de * de);
  const ci2 = Math.cos(di / 2.0);
  const xms = (de * Math.sin(dp) + xsw) * xf;
  const xmc = (de * Math.cos(dp) + xcw) * xf;
  const xpxq2 = 2 * xp * xq;

  // Position (J2000.0 ecliptic, au), rotated to equatorial
  let x = r * (xcw - xm2 * xp);
  let y = r * (xsw + xm2 * xq);
  let z = r * (-xm2 * ci2);
  const p = [x, y * COSEPS - z * SINEPS, y * SINEPS + z * COSEPS];

  // Velocity (J2000.0 ecliptic, au/d), rotated to equatorial
  x = v * ((-1.0 + 2.0 * xp * xp) * xms + xpxq2 * xmc);
  y = v * ((1.0 - 2.0 * xq * xq) * xmc - xpxq2 * xms);
  z = v * (2.0 * ci2 * (xp * xms + xq * xmc));
  return [p, [x, y * COSEPS - z * SINEPS, y * SINEPS + z * COSEPS]];
}

// ---- the exported states

/** au and au/day to m and m/s, as x·AU and x·AU / 86,400. */
function toState(pv: Pv): State {
  const [p, v] = pv;
  const r: V3 = { x: p[0] * AU, y: p[1] * AU, z: p[2] * AU };
  return { r, v: { x: v[0] * AU / DAY, y: v[1] * AU / DAY, z: v[2] * AU / DAY } };
}

/** The Moon, geocentric, GCRF, m and m/s (`moon98`); TT. */
export function moonState(tt: Jd2): State {
  if (nonFinite(tt.a, tt.b)) return NANS();
  return toState(moon98(tt.a, tt.b));
}

/** The Earth-Moon barycentre, heliocentric, mean equator and equinox of J2000, m and m/s (`plan94`, body 3); TT. */
export function earthMoonBarycentreState(tt: Jd2): State {
  if (nonFinite(tt.a, tt.b)) return NANS();
  return toState(plan94Emb(tt.a, tt.b));
}

/** The Sun, geocentric, GCRF, m and m/s: −(Bᵀ·r_emb − r_moon / (1 + μ)), the same for the velocity; TT. */
export function sunState(tt: Jd2): State {
  if (nonFinite(tt.a, tt.b)) return NANS();
  const emb = earthMoonBarycentreState(tt);
  const moon = moonState(tt);
  const bt = matT(FRAME_BIAS);
  const k = 1 + EARTH_MOON_MASS_RATIO;
  const re = matVec(bt, emb.r), ve = matVec(bt, emb.v);
  return {
    r: { x: -(re.x - moon.r.x / k), y: -(re.y - moon.r.y / k), z: -(re.z - moon.r.z / k) },
    v: { x: -(ve.x - moon.v.x / k), y: -(ve.y - moon.v.y / k), z: -(ve.z - moon.v.z / k) },
  };
}
