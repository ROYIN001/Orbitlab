/**
 * NRLMSISE-00, the empirical model of the neutral atmosphere from the ground
 * to the exosphere (Picone, Hedin, Drob and Aikin, "NRLMSISE-00 empirical
 * model of the atmosphere: Statistical comparisons and scientific issues",
 * J. Geophys. Res. 107(A12), 1468, 2002, doi:10.1029/2002JA009430) — the
 * model ECSS-E-ST-10-04C (§8.3) and ISO 27852 name for the density that
 * drags satellites down. Roadmap P2.5: it replaces R05's day-averaged table
 * spread by Harris–Priester's bulge, so the density now follows latitude,
 * local time, season, the day's flux and the day's geomagnetic activity as
 * the model does.
 *
 * A line-by-line port of the C release of 2004-12-27 by Dominik Brodowski
 * (placed in the public domain), itself a port of NRL's Fortran: GTD7, GTD7D
 * and the routines under them, with the same switches, the same units (cm⁻³
 * and g/cm³, or m⁻³ and kg/m³ with switch 0 on) and the same order of
 * operations, so that it gives the same numbers. The coefficients are in
 * msis-data.ts. U.S. Government material, not subject to copyright
 * protection in the United States (17 U.S.C. 403); no endorsement by or
 * affiliation with the Naval Research Laboratory is implied.
 *
 * Like the original it keeps its working state between calls in module
 * variables, so it is not re-entrant — which one thread never needs.
 *
 * DOM-free; tests/msis.test.ts holds it to the distribution's seventeen test
 * cases and to the original Fortran at random points.
 */
import { pavgm, pd, pdl, pdm, pma, ps, pt, ptl, ptm } from './msis-data';

export interface MsisInput {
  /** day of the year, 1–366 */
  doy: number;
  /** seconds of the UT day */
  sec: number;
  /** geodetic altitude, km */
  alt: number;
  /** geodetic latitude and longitude, degrees */
  lat: number;
  lon: number;
  /** local apparent solar time, hours (for consistency, sec/3600 + lon/15) */
  lst: number;
  /** 81-day mean of F10.7 centred on the day, and the previous day's F10.7, solar flux units */
  f107a: number;
  f107: number;
  /** the day's planetary Ap */
  ap: number;
  /**
   * With switch 9 at −1: the day's Ap; the 3-hour ap now, 3, 6 and 9 hours
   * before; the means of the eight 3-hour ap 12–33 and 36–57 hours before.
   */
  apArray?: readonly number[];
}

export interface MsisOutput {
  /**
   * number densities of He, O, N₂, O₂, Ar (cm⁻³ or m⁻³), then the total mass
   * density (g/cm³ or kg/m³), then H, N and anomalous oxygen
   */
  d: Float64Array;
  /** exospheric temperature and the temperature at the altitude, K */
  t: Float64Array;
}

/** The 24 switches: 0 → SI units when 1; the rest 1 (on), 0 (off) or 2 (main effects only); 9 = −1 reads the 3-hour ap. */
export const MSIS_DEFAULT_SWITCHES: readonly number[] = [0, ...Array<number>(23).fill(1)];

// ─── working state (the Fortran COMMON blocks) ─────────────────────────────

let gsurf = 0, re = 0;
let dm28 = 0;
const mesoTn1 = new Float64Array(5), mesoTn2 = new Float64Array(4), mesoTn3 = new Float64Array(5);
const mesoTgn1 = new Float64Array(2), mesoTgn2 = new Float64Array(2), mesoTgn3 = new Float64Array(2);
let dfa = 0;
const plg = [new Float64Array(9), new Float64Array(9), new Float64Array(9), new Float64Array(9)];
let ctloc = 0, stloc = 0, c2tloc = 0, s2tloc = 0, s3tloc = 0, c3tloc = 0;
let apdf = 0;
let cosLon = 0, sinLon = 0;
const apt = new Float64Array(4);
const sw = new Float64Array(24), swc = new Float64Array(24);
/** the temperature a call of densu or densm leaves behind (the Fortran's TZ argument) */
let tzOut = 0;

const xs = new Float64Array(10), ys = new Float64Array(10), y2out = new Float64Array(10), uScratch = new Float64Array(10);
const tg = new Float64Array(15), ts = new Float64Array(14);

function tselec(switches: readonly number[]): void {
  for (let i = 0; i < 24; i++) {
    if (i !== 9) {
      sw[i] = switches[i] === 1 ? 1 : 0;
      swc[i] = switches[i] > 0 ? 1 : 0;
    } else {
      sw[i] = switches[i];
      swc[i] = switches[i];
    }
  }
}

function glatf(lat: number): void {
  const dgtr = 1.74533e-2;
  const c2 = Math.cos(2.0 * dgtr * lat);
  gsurf = 980.616 * (1.0 - 0.0026373 * c2);
  re = ((2.0 * gsurf) / (3.085462e-6 + 2.27e-9 * c2)) * 1.0e-5;
}

/** Chemistry/dissociation correction. */
function ccor(alt: number, r: number, h1: number, zh: number): number {
  let e = (alt - zh) / h1;
  if (e > 70) return Math.exp(0);
  if (e < -70) return Math.exp(r);
  const ex = Math.exp(e);
  e = r / (1.0 + ex);
  return Math.exp(e);
}

/** Chemistry/dissociation correction, with a second scale length. */
function ccor2(alt: number, r: number, h1: number, zh: number, h2: number): number {
  const e1 = (alt - zh) / h1;
  const e2 = (alt - zh) / h2;
  if (e1 > 70 || e2 > 70) return Math.exp(0);
  if (e1 < -70 && e2 < -70) return Math.exp(r);
  const ex1 = Math.exp(e1);
  const ex2 = Math.exp(e2);
  return Math.exp(r / (1.0 + 0.5 * (ex1 + ex2)));
}

function scalh(alt: number, xm: number, temp: number): number {
  const rgas = 831.4;
  let g = gsurf / (1.0 + alt / re) ** 2.0;
  g = (rgas * temp) / (g * xm);
  return g;
}

/** Turbopause correction: the diffusive and fully mixed densities joined. */
function dnet(dd: number, dm: number, zhm: number, xmm: number, xm: number): number {
  let a = zhm / (xmm - xm);
  if (!(dm > 0 && dd > 0)) {
    if (dd === 0 && dm === 0) dd = 1;
    if (dm === 0) return dd;
    if (dd === 0) return dm;
  }
  const ylog = a * Math.log(dm / dd);
  if (ylog < -10) return dd;
  if (ylog > 10) return dm;
  a = dd * (1.0 + Math.exp(ylog)) ** (1.0 / a);
  return a;
}

/** The integral of the cubic spline from xa[0] to x. */
function splini(xa: Float64Array, ya: Float64Array, y2a: Float64Array, n: number, x: number): number {
  let yi = 0;
  let klo = 0, khi = 1;
  while (x > xa[klo] && khi < n) {
    let xx = x;
    if (khi < n - 1) xx = x < xa[khi] ? x : xa[khi];
    const h = xa[khi] - xa[klo];
    const a = (xa[khi] - xx) / h;
    const b = (xx - xa[klo]) / h;
    const a2 = a * a;
    const b2 = b * b;
    yi += ((1.0 - a2) * ya[klo] / 2.0 + b2 * ya[khi] / 2.0 + ((-(1.0 + a2 * a2) / 4.0 + a2 / 2.0) * y2a[klo] + (b2 * b2 / 4.0 - b2 / 2.0) * y2a[khi]) * h * h / 6.0) * h;
    klo++;
    khi++;
  }
  return yi;
}

/** The cubic spline's value at x (Press et al., Numerical Recipes). */
function splint(xa: Float64Array, ya: Float64Array, y2a: Float64Array, n: number, x: number): number {
  let klo = 0, khi = n - 1;
  while (khi - klo > 1) {
    const k = (khi + klo) >> 1;
    if (xa[k] > x) khi = k;
    else klo = k;
  }
  const h = xa[khi] - xa[klo];
  const a = (xa[khi] - x) / h;
  const b = (x - xa[klo]) / h;
  return a * ya[klo] + b * ya[khi] + ((a * a * a - a) * y2a[klo] + (b * b * b - b) * y2a[khi]) * h * h / 6.0;
}

/** The cubic spline's second derivatives (Press et al.); end derivatives ≥ 1e30 mean a natural end. */
function spline(x: Float64Array, y: Float64Array, n: number, yp1: number, ypn: number, y2: Float64Array): void {
  const u = uScratch;
  if (yp1 > 0.99e30) {
    y2[0] = 0;
    u[0] = 0;
  } else {
    y2[0] = -0.5;
    u[0] = (3.0 / (x[1] - x[0])) * ((y[1] - y[0]) / (x[1] - x[0]) - yp1);
  }
  for (let i = 1; i < n - 1; i++) {
    const sig = (x[i] - x[i - 1]) / (x[i + 1] - x[i - 1]);
    const p = sig * y2[i - 1] + 2.0;
    y2[i] = (sig - 1.0) / p;
    u[i] = (6.0 * ((y[i + 1] - y[i]) / (x[i + 1] - x[i]) - (y[i] - y[i - 1]) / (x[i] - x[i - 1])) / (x[i + 1] - x[i - 1]) - sig * u[i - 1]) / p;
  }
  let qn: number, un: number;
  if (ypn > 0.99e30) {
    qn = 0;
    un = 0;
  } else {
    qn = 0.5;
    un = (3.0 / (x[n - 1] - x[n - 2])) * (ypn - (y[n - 1] - y[n - 2]) / (x[n - 1] - x[n - 2]));
  }
  y2[n - 1] = (un - qn * u[n - 2]) / (qn * y2[n - 2] + 1.0);
  for (let k = n - 2; k >= 0; k--) y2[k] = y2[k] * y2[k + 1] + u[k];
}

/** Geopotential height difference. */
const zeta = (zz: number, zl: number): number => ((zz - zl) * (re + zl)) / (re + zz);

/** Temperature (xm 0) or density profile below 72.5 km. */
function densm(
  alt: number, d0: number, xm: number,
  mn3: number, zn3: Float64Array, tn3: Float64Array, tgn3: Float64Array,
  mn2: number, zn2: Float64Array, tn2: Float64Array, tgn2: Float64Array,
): number {
  const rgas = 831.4;
  let densmTmp = d0;
  if (alt > zn2[0]) return xm === 0.0 ? tzOut : d0;

  // stratosphere/mesosphere temperature
  let z = alt > zn2[mn2 - 1] ? alt : zn2[mn2 - 1];
  let mn = mn2;
  let z1 = zn2[0], z2 = zn2[mn - 1], t1 = tn2[0], t2 = tn2[mn - 1];
  let zg = zeta(z, z1), zgdif = zeta(z2, z1);
  for (let k = 0; k < mn; k++) {
    xs[k] = zeta(zn2[k], z1) / zgdif;
    ys[k] = 1.0 / tn2[k];
  }
  let yd1 = (-tgn2[0] / (t1 * t1)) * zgdif;
  let yd2 = (-tgn2[1] / (t2 * t2)) * zgdif * ((re + z2) / (re + z1)) ** 2.0;
  spline(xs, ys, mn, yd1, yd2, y2out);
  let x = zg / zgdif;
  let y = splint(xs, ys, y2out, mn, x);
  let tz = 1.0 / y;
  if (xm !== 0.0) {
    const glb = gsurf / (1.0 + z1 / re) ** 2.0;
    const gamm = (xm * glb * zgdif) / rgas;
    const yi = splini(xs, ys, y2out, mn, x);
    let expl = gamm * yi;
    if (expl > 50.0) expl = 50.0;
    densmTmp = densmTmp * (t1 / tz) * Math.exp(-expl);
  }
  if (alt > zn3[0]) {
    tzOut = tz;
    return xm === 0.0 ? tz : densmTmp;
  }

  // troposphere/stratosphere temperature
  z = alt;
  mn = mn3;
  z1 = zn3[0]; z2 = zn3[mn - 1]; t1 = tn3[0]; t2 = tn3[mn - 1];
  zg = zeta(z, z1);
  zgdif = zeta(z2, z1);
  for (let k = 0; k < mn; k++) {
    xs[k] = zeta(zn3[k], z1) / zgdif;
    ys[k] = 1.0 / tn3[k];
  }
  yd1 = (-tgn3[0] / (t1 * t1)) * zgdif;
  yd2 = (-tgn3[1] / (t2 * t2)) * zgdif * ((re + z2) / (re + z1)) ** 2.0;
  spline(xs, ys, mn, yd1, yd2, y2out);
  x = zg / zgdif;
  y = splint(xs, ys, y2out, mn, x);
  tz = 1.0 / y;
  if (xm !== 0.0) {
    const glb = gsurf / (1.0 + z1 / re) ** 2.0;
    const gamm = (xm * glb * zgdif) / rgas;
    const yi = splini(xs, ys, y2out, mn, x);
    let expl = gamm * yi;
    if (expl > 50.0) expl = 50.0;
    densmTmp = densmTmp * (t1 / tz) * Math.exp(-expl);
  }
  tzOut = tz;
  return xm === 0.0 ? tz : densmTmp;
}

/** Temperature (xm 0) or density profile above 72.5 km: Bates's temperature, a spline below za. */
function densu(
  alt: number, dlb: number, tinf: number, tlb: number, xm: number, alpha: number,
  zlb: number, s2: number, mn1: number, zn1: Float64Array, tn1: Float64Array, tgn1: Float64Array,
): number {
  const rgas = 831.4;
  let x = 0, z1 = 0, t1 = 0, zgdif = 0, mn = 0;
  // joining altitudes of Bates and spline
  const za = zn1[0];
  let z = alt > za ? alt : za;
  // geopotential altitude difference from ZLB
  const zg2 = zeta(z, zlb);
  // Bates temperature
  const tt = tinf - (tinf - tlb) * Math.exp(-s2 * zg2);
  const ta = tt;
  let tz = tt;
  let densuTemp = tz;

  if (alt < za) {
    // temperature gradient at za from Bates's profile
    const dta = (tinf - ta) * s2 * ((re + zlb) / (re + za)) ** 2.0;
    tgn1[0] = dta;
    tn1[0] = ta;
    z = alt > zn1[mn1 - 1] ? alt : zn1[mn1 - 1];
    mn = mn1;
    z1 = zn1[0];
    const z2 = zn1[mn - 1];
    t1 = tn1[0];
    const t2 = tn1[mn - 1];
    const zg = zeta(z, z1);
    zgdif = zeta(z2, z1);
    for (let k = 0; k < mn; k++) {
      xs[k] = zeta(zn1[k], z1) / zgdif;
      ys[k] = 1.0 / tn1[k];
    }
    const yd1 = (-tgn1[0] / (t1 * t1)) * zgdif;
    const yd2 = (-tgn1[1] / (t2 * t2)) * zgdif * ((re + z2) / (re + z1)) ** 2.0;
    spline(xs, ys, mn, yd1, yd2, y2out);
    x = zg / zgdif;
    const y = splint(xs, ys, y2out, mn, x);
    tz = 1.0 / y;
    densuTemp = tz;
  }
  tzOut = tz;
  if (xm === 0) return densuTemp;

  // density above za
  let glb = gsurf / (1.0 + zlb / re) ** 2.0;
  const gamma = (xm * glb) / (s2 * rgas * tinf);
  let expl = Math.exp(-s2 * gamma * zg2);
  if (expl > 50.0) expl = 50.0;
  if (tt <= 0) expl = 50.0;
  const densa = dlb * (tlb / tt) ** (1.0 + alpha + gamma) * expl;
  densuTemp = densa;
  if (alt >= za) return densuTemp;

  // density below za
  glb = gsurf / (1.0 + z1 / re) ** 2.0;
  const gamm = (xm * glb * zgdif) / rgas;
  const yi = splini(xs, ys, y2out, mn, x);
  expl = gamm * yi;
  if (expl > 50.0) expl = 50.0;
  if (tz <= 0) expl = 50.0;
  densuTemp = densuTemp * (t1 / tz) ** (1.0 + alpha) * Math.exp(-expl);
  return densuTemp;
}

// ─── the G(L) functions ─────────────────────────────────────────────────────

/** 3-hour magnetic activity functions, Eqs. A24a–d. */
function g0(a: number, p: Float64Array): number {
  return a - 4.0 + (p[25] - 1.0) * (a - 4.0 + (Math.exp(-Math.sqrt(p[24] * p[24]) * (a - 4.0)) - 1.0) / Math.sqrt(p[24] * p[24]));
}
function sumex(ex: number): number {
  return 1.0 + ((1.0 - ex ** 19.0) / (1.0 - ex)) * ex ** 0.5;
}
function sg0(ex: number, p: Float64Array, ap: readonly number[]): number {
  return (g0(ap[1], p) + (g0(ap[2], p) * ex + g0(ap[3], p) * ex * ex + g0(ap[4], p) * ex ** 3.0
    + ((g0(ap[5], p) * ex ** 4.0 + g0(ap[6], p) * ex ** 12.0) * (1.0 - ex ** 8.0)) / (1.0 - ex))) / sumex(ex);
}

/**
 * The Legendre polynomials of the latitude and the harmonics of the local
 * time, which every call of globe7 for one point computes alike in the
 * original: computed once per point here, the same numbers.
 */
function prepare(input: MsisInput): void {
  const dgtr = 1.74533e-2, hr = 0.2618;
  const tloc = input.lst;
  // Legendre polynomials
  const c = Math.sin(input.lat * dgtr);
  const s = Math.cos(input.lat * dgtr);
  const c2 = c * c, c4 = c2 * c2, s2 = s * s;
  plg[0][1] = c;
  plg[0][2] = 0.5 * (3.0 * c2 - 1.0);
  plg[0][3] = 0.5 * (5.0 * c * c2 - 3.0 * c);
  plg[0][4] = (35.0 * c4 - 30.0 * c2 + 3.0) / 8.0;
  plg[0][5] = (63.0 * c2 * c2 * c - 70.0 * c2 * c + 15.0 * c) / 8.0;
  plg[0][6] = (11.0 * c * plg[0][5] - 5.0 * plg[0][4]) / 6.0;
  plg[1][1] = s;
  plg[1][2] = 3.0 * c * s;
  plg[1][3] = 1.5 * (5.0 * c2 - 1.0) * s;
  plg[1][4] = 2.5 * (7.0 * c2 * c - 3.0 * c) * s;
  plg[1][5] = 1.875 * (21.0 * c4 - 14.0 * c2 + 1.0) * s;
  plg[1][6] = (11.0 * c * plg[1][5] - 6.0 * plg[1][4]) / 5.0;
  plg[2][2] = 3.0 * s2;
  plg[2][3] = 15.0 * s2 * c;
  plg[2][4] = 7.5 * (7.0 * c2 - 1.0) * s2;
  plg[2][5] = 3.0 * c * plg[2][4] - 2.0 * plg[2][3];
  plg[2][6] = (11.0 * c * plg[2][5] - 7.0 * plg[2][4]) / 4.0;
  plg[2][7] = (13.0 * c * plg[2][6] - 8.0 * plg[2][5]) / 5.0;
  plg[3][3] = 15.0 * s2 * s;
  plg[3][4] = 105.0 * s2 * s * c;
  plg[3][5] = (9.0 * c * plg[3][4] - 7.0 * plg[3][3]) / 2.0;
  plg[3][6] = (11.0 * c * plg[3][5] - 8.0 * plg[3][4]) / 3.0;

  if (!(sw[7] === 0 && sw[8] === 0 && sw[14] === 0)) {
    stloc = Math.sin(hr * tloc);
    ctloc = Math.cos(hr * tloc);
    s2tloc = Math.sin(2.0 * hr * tloc);
    c2tloc = Math.cos(2.0 * hr * tloc);
    s3tloc = Math.sin(3.0 * hr * tloc);
    c3tloc = Math.cos(3.0 * hr * tloc);
  }

  cosLon = Math.cos(dgtr * input.lon);
  sinLon = Math.sin(dgtr * input.lon);
}

/** The upper thermosphere's G(L). */
function globe7(p: Float64Array, input: MsisInput): number {
  const t = tg;
  const sr = 7.2722e-5, dgtr = 1.74533e-2, dr = 1.72142e-2, hr = 0.2618;
  const tloc = input.lst;
  for (let j = 0; j < 14; j++) t[j] = 0;

  const cd32 = Math.cos(dr * (input.doy - p[31]));
  const cd18 = Math.cos(2.0 * dr * (input.doy - p[17]));
  const cd14 = Math.cos(dr * (input.doy - p[13]));
  const cd39 = Math.cos(2.0 * dr * (input.doy - p[38]));

  // F10.7
  const df = input.f107 - input.f107a;
  dfa = input.f107a - 150.0;
  t[0] = p[19] * df * (1.0 + p[59] * dfa) + p[20] * df * df + p[21] * dfa + p[29] * dfa ** 2.0;
  const f1 = 1.0 + (p[47] * dfa + p[19] * df + p[20] * df * df) * swc[1];
  const f2 = 1.0 + (p[49] * dfa + p[19] * df + p[20] * df * df) * swc[1];

  // time independent
  t[1] = p[1] * plg[0][2] + p[2] * plg[0][4] + p[22] * plg[0][6] + p[14] * plg[0][2] * dfa * swc[1] + p[26] * plg[0][1];
  // symmetrical annual
  t[2] = p[18] * cd32;
  // symmetrical semiannual
  t[3] = (p[15] + p[16] * plg[0][2]) * cd18;
  // asymmetrical annual
  t[4] = f1 * (p[9] * plg[0][1] + p[10] * plg[0][3]) * cd14;
  // asymmetrical semiannual
  t[5] = p[37] * plg[0][1] * cd39;

  // diurnal
  if (sw[7]) {
    const t71 = p[11] * plg[1][2] * cd14 * swc[5];
    const t72 = p[12] * plg[1][2] * cd14 * swc[5];
    t[6] = f2 * ((p[3] * plg[1][1] + p[4] * plg[1][3] + p[27] * plg[1][5] + t71) * ctloc
      + (p[6] * plg[1][1] + p[7] * plg[1][3] + p[28] * plg[1][5] + t72) * stloc);
  }
  // semidiurnal
  if (sw[8]) {
    const t81 = (p[23] * plg[2][3] + p[35] * plg[2][5]) * cd14 * swc[5];
    const t82 = (p[33] * plg[2][3] + p[36] * plg[2][5]) * cd14 * swc[5];
    t[7] = f2 * ((p[5] * plg[2][2] + p[41] * plg[2][4] + t81) * c2tloc + (p[8] * plg[2][2] + p[42] * plg[2][4] + t82) * s2tloc);
  }
  // terdiurnal
  if (sw[14]) {
    t[13] = f2 * ((p[39] * plg[3][3] + (p[93] * plg[3][4] + p[46] * plg[3][6]) * cd14 * swc[5]) * s3tloc
      + (p[40] * plg[3][3] + (p[94] * plg[3][4] + p[48] * plg[3][6]) * cd14 * swc[5]) * c3tloc);
  }

  // magnetic activity
  if (sw[9] === -1) {
    const ap = input.apArray!;
    if (p[51] !== 0) {
      let exp1 = Math.exp((-10800.0 * Math.sqrt(p[51] * p[51])) / (1.0 + p[138] * (45.0 - Math.sqrt(input.lat * input.lat))));
      if (exp1 > 0.99999) exp1 = 0.99999;
      if (p[24] < 1.0e-4) p[24] = 1.0e-4;
      apt[0] = sg0(exp1, p, ap);
      if (sw[9]) {
        t[8] = apt[0] * (p[50] + p[96] * plg[0][2] + p[54] * plg[0][4]
          + (p[125] * plg[0][1] + p[126] * plg[0][3] + p[127] * plg[0][5]) * cd14 * swc[5]
          + (p[128] * plg[1][1] + p[129] * plg[1][3] + p[130] * plg[1][5]) * swc[7] * Math.cos(hr * (tloc - p[131])));
      }
    }
  } else {
    const apd = input.ap - 4.0;
    let p44 = p[43];
    const p45 = p[44];
    if (p44 < 0) p44 = 1.0e-5;
    apdf = apd + (p45 - 1.0) * (apd + (Math.exp(-p44 * apd) - 1.0) / p44);
    if (sw[9]) {
      t[8] = apdf * (p[32] + p[45] * plg[0][2] + p[34] * plg[0][4]
        + (p[100] * plg[0][1] + p[101] * plg[0][3] + p[102] * plg[0][5]) * cd14 * swc[5]
        + (p[121] * plg[1][1] + p[122] * plg[1][3] + p[123] * plg[1][5]) * swc[7] * Math.cos(hr * (tloc - p[124])));
    }
  }

  if (sw[10] && input.lon > -1000.0) {
    // longitudinal
    if (sw[11]) {
      t[10] = (1.0 + p[80] * dfa * swc[1])
        * ((p[64] * plg[1][2] + p[65] * plg[1][4] + p[66] * plg[1][6]
          + p[103] * plg[1][1] + p[104] * plg[1][3] + p[105] * plg[1][5]
          + swc[5] * (p[109] * plg[1][1] + p[110] * plg[1][3] + p[111] * plg[1][5]) * cd14) * cosLon
          + (p[90] * plg[1][2] + p[91] * plg[1][4] + p[92] * plg[1][6]
            + p[106] * plg[1][1] + p[107] * plg[1][3] + p[108] * plg[1][5]
            + swc[5] * (p[112] * plg[1][1] + p[113] * plg[1][3] + p[114] * plg[1][5]) * cd14) * sinLon);
    }
    // UT and mixed UT, longitude
    if (sw[12]) {
      t[11] = (1.0 + p[95] * plg[0][1]) * (1.0 + p[81] * dfa * swc[1])
        * (1.0 + p[119] * plg[0][1] * swc[5] * cd14)
        * ((p[68] * plg[0][1] + p[69] * plg[0][3] + p[70] * plg[0][5]) * Math.cos(sr * (input.sec - p[71])));
      t[11] += swc[11] * (p[76] * plg[2][3] + p[77] * plg[2][5] + p[78] * plg[2][7])
        * Math.cos(sr * (input.sec - p[79]) + 2.0 * dgtr * input.lon) * (1.0 + p[137] * dfa * swc[1]);
    }
    // UT, longitude magnetic activity
    if (sw[13]) {
      if (sw[9] === -1) {
        if (p[51]) {
          t[12] = apt[0] * swc[11] * (1.0 + p[132] * plg[0][1])
            * ((p[52] * plg[1][2] + p[98] * plg[1][4] + p[67] * plg[1][6]) * Math.cos(dgtr * (input.lon - p[97])))
            + apt[0] * swc[11] * swc[5] * (p[133] * plg[1][1] + p[134] * plg[1][3] + p[135] * plg[1][5]) * cd14 * Math.cos(dgtr * (input.lon - p[136]))
            + apt[0] * swc[12] * (p[55] * plg[0][1] + p[56] * plg[0][3] + p[57] * plg[0][5]) * Math.cos(sr * (input.sec - p[58]));
        }
      } else {
        t[12] = apdf * swc[11] * (1.0 + p[120] * plg[0][1])
          * ((p[60] * plg[1][2] + p[61] * plg[1][4] + p[62] * plg[1][6]) * Math.cos(dgtr * (input.lon - p[63])))
          + apdf * swc[11] * swc[5] * (p[115] * plg[1][1] + p[116] * plg[1][3] + p[117] * plg[1][5]) * cd14 * Math.cos(dgtr * (input.lon - p[118]))
          + apdf * swc[12] * (p[83] * plg[0][1] + p[84] * plg[0][3] + p[85] * plg[0][5]) * Math.cos(sr * (input.sec - p[75]));
      }
    }
  }

  // parameters not used: 82, 89, 99, 139–149
  let tinf = p[30];
  for (let i = 0; i < 14; i++) tinf = tinf + Math.abs(sw[i + 1]) * t[i];
  return tinf;
}

/** The lower atmosphere's G(L). */
function glob7s(p: Float64Array, input: MsisInput): number {
  const pset = 2.0;
  const t = ts;
  const dr = 1.72142e-2, dgtr = 1.74533e-2;
  // confirm the parameter set
  if (p[99] === 0) p[99] = pset;
  if (p[99] !== pset) throw new Error('Wrong parameter set for glob7s');
  for (let j = 0; j < 14; j++) t[j] = 0.0;
  const cd32 = Math.cos(dr * (input.doy - p[31]));
  const cd18 = Math.cos(2.0 * dr * (input.doy - p[17]));
  const cd14 = Math.cos(dr * (input.doy - p[13]));
  const cd39 = Math.cos(2.0 * dr * (input.doy - p[38]));

  // F10.7
  t[0] = p[21] * dfa;
  // time independent
  t[1] = p[1] * plg[0][2] + p[2] * plg[0][4] + p[22] * plg[0][6] + p[26] * plg[0][1] + p[14] * plg[0][3] + p[59] * plg[0][5];
  // symmetrical annual
  t[2] = (p[18] + p[47] * plg[0][2] + p[29] * plg[0][4]) * cd32;
  // symmetrical semiannual
  t[3] = (p[15] + p[16] * plg[0][2] + p[30] * plg[0][4]) * cd18;
  // asymmetrical annual
  t[4] = (p[9] * plg[0][1] + p[10] * plg[0][3] + p[20] * plg[0][5]) * cd14;
  // asymmetrical semiannual
  t[5] = p[37] * plg[0][1] * cd39;

  // diurnal
  if (sw[7]) {
    const t71 = p[11] * plg[1][2] * cd14 * swc[5];
    const t72 = p[12] * plg[1][2] * cd14 * swc[5];
    t[6] = (p[3] * plg[1][1] + p[4] * plg[1][3] + t71) * ctloc + (p[6] * plg[1][1] + p[7] * plg[1][3] + t72) * stloc;
  }
  // semidiurnal
  if (sw[8]) {
    const t81 = (p[23] * plg[2][3] + p[35] * plg[2][5]) * cd14 * swc[5];
    const t82 = (p[33] * plg[2][3] + p[36] * plg[2][5]) * cd14 * swc[5];
    t[7] = (p[5] * plg[2][2] + p[41] * plg[2][4] + t81) * c2tloc + (p[8] * plg[2][2] + p[42] * plg[2][4] + t82) * s2tloc;
  }
  // terdiurnal
  if (sw[14]) t[13] = p[39] * plg[3][3] * s3tloc + p[40] * plg[3][3] * c3tloc;

  // magnetic activity
  if (sw[9]) {
    if (sw[9] === 1) t[8] = apdf * (p[32] + p[45] * plg[0][2] * swc[2]);
    if (sw[9] === -1) t[8] = p[50] * apt[0] + p[96] * plg[0][2] * apt[0] * swc[2];
  }

  // longitudinal
  if (!(sw[10] === 0 || sw[11] === 0 || input.lon <= -1000.0)) {
    t[10] = (1.0 + plg[0][1] * (p[80] * swc[5] * Math.cos(dr * (input.doy - p[81]))
      + p[85] * swc[6] * Math.cos(2.0 * dr * (input.doy - p[86])))
      + p[83] * swc[3] * Math.cos(dr * (input.doy - p[84]))
      + p[87] * swc[4] * Math.cos(2.0 * dr * (input.doy - p[88])))
      * ((p[64] * plg[1][2] + p[65] * plg[1][4] + p[66] * plg[1][6]
        + p[74] * plg[1][1] + p[75] * plg[1][3] + p[76] * plg[1][5]) * Math.cos(dgtr * input.lon)
        + (p[90] * plg[1][2] + p[91] * plg[1][4] + p[92] * plg[1][6]
          + p[77] * plg[1][1] + p[78] * plg[1][3] + p[79] * plg[1][5]) * Math.sin(dgtr * input.lon));
  }
  let tt = 0;
  for (let i = 0; i < 14; i++) tt += Math.abs(sw[i + 1]) * t[i];
  return tt;
}

// ─── the thermosphere, GTS7 ─────────────────────────────────────────────────

const zn1 = Float64Array.from([120.0, 110.0, 100.0, 90.0, 72.5]);
const ALPHA = [-0.38, 0.0, 0.0, 0.0, 0.17, 0.0, -0.38, 0.0, 0.0];
const ALTL = [200.0, 300.0, 160.0, 250.0, 240.0, 450.0, 320.0, 450.0];

/** The thermospheric part, for altitudes of 72.5 km and more. */
function gts7(input: MsisInput, output: MsisOutput): void {
  const dgtr = 1.74533e-2, dr = 1.72142e-2;
  const mn1 = 5;
  const za = pdl[1][15];
  zn1[0] = za;
  for (let j = 0; j < 9; j++) output.d[j] = 0;

  // Tinf variations not important below za or zn1[0]
  const tinf = input.alt > zn1[0] ? ptm[0] * pt[0] * (1.0 + sw[16] * globe7(pt, input)) : ptm[0] * pt[0];
  output.t[0] = tinf;

  // gradient variations not important below zn1[4]
  const g0v = input.alt > zn1[4] ? ptm[3] * ps[0] * (1.0 + sw[19] * globe7(ps, input)) : ptm[3] * ps[0];
  const tlb = ptm[1] * (1.0 + sw[17] * globe7(pd[3], input)) * pd[3][0];
  const s = g0v / (tinf - tlb);

  // lower thermosphere temperature variations not significant for density above 300 km
  if (input.alt < 300.0) {
    mesoTn1[1] = (ptm[6] * ptl[0][0]) / (1.0 - sw[18] * glob7s(ptl[0], input));
    mesoTn1[2] = (ptm[2] * ptl[1][0]) / (1.0 - sw[18] * glob7s(ptl[1], input));
    mesoTn1[3] = (ptm[7] * ptl[2][0]) / (1.0 - sw[18] * glob7s(ptl[2], input));
    mesoTn1[4] = (ptm[4] * ptl[3][0]) / (1.0 - sw[18] * sw[20] * glob7s(ptl[3], input));
    mesoTgn1[1] = (ptm[8] * pma[8][0] * (1.0 + sw[18] * sw[20] * glob7s(pma[8], input)) * mesoTn1[4] * mesoTn1[4]) / (ptm[4] * ptl[3][0]) ** 2.0;
  } else {
    mesoTn1[1] = ptm[6] * ptl[0][0];
    mesoTn1[2] = ptm[2] * ptl[1][0];
    mesoTn1[3] = ptm[7] * ptl[2][0];
    mesoTn1[4] = ptm[4] * ptl[3][0];
    mesoTgn1[1] = (ptm[8] * pma[8][0] * mesoTn1[4] * mesoTn1[4]) / (ptm[4] * ptl[3][0]) ** 2.0;
  }

  // N2 variation factor at Zlb
  const g28 = sw[21] * globe7(pd[2], input);
  // variation of the turbopause height
  const zhf = pdl[1][24] * (1.0 + sw[5] * pdl[0][24] * Math.sin(dgtr * input.lat) * Math.cos(dr * (input.doy - pt[13])));
  output.t[0] = tinf;
  const xmm = pdm[2][4];
  const z = input.alt;

  // N2
  const db28 = pdm[2][0] * Math.exp(g28) * pd[2][0];
  output.d[2] = densu(z, db28, tinf, tlb, 28.0, ALPHA[2], ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
  const zh28 = pdm[2][2] * zhf;
  const zhm28 = pdm[2][3] * pdl[1][5];
  const xmd = 28.0 - xmm;
  const b28 = densu(zh28, db28, tinf, tlb, xmd, ALPHA[2] - 1.0, ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
  if (sw[15] && z <= ALTL[2]) {
    dm28 = densu(z, b28, tinf, tlb, xmm, ALPHA[2], ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
    output.d[2] = dnet(output.d[2], dm28, zhm28, xmm, 28.0);
  }

  // He
  const g4 = sw[21] * globe7(pd[0], input);
  const db04 = pdm[0][0] * Math.exp(g4) * pd[0][0];
  output.d[0] = densu(z, db04, tinf, tlb, 4.0, ALPHA[0], ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
  if (sw[15] && z < ALTL[0]) {
    const zh04 = pdm[0][2];
    const b04 = densu(zh04, db04, tinf, tlb, 4.0 - xmm, ALPHA[0] - 1.0, ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
    const dm04 = densu(z, b04, tinf, tlb, xmm, 0.0, ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
    output.d[0] = dnet(output.d[0], dm04, zhm28, xmm, 4.0);
    const rl = Math.log((b28 * pdm[0][1]) / b04);
    const zc04 = pdm[0][4] * pdl[1][0];
    const hc04 = pdm[0][5] * pdl[1][1];
    output.d[0] = output.d[0] * ccor(z, rl, hc04, zc04);
  }

  // O
  const g16 = sw[21] * globe7(pd[1], input);
  const db16 = pdm[1][0] * Math.exp(g16) * pd[1][0];
  output.d[1] = densu(z, db16, tinf, tlb, 16.0, ALPHA[1], ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
  if (sw[15] && z <= ALTL[1]) {
    const zh16 = pdm[1][2];
    const b16 = densu(zh16, db16, tinf, tlb, 16.0 - xmm, ALPHA[1] - 1.0, ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
    const dm16 = densu(z, b16, tinf, tlb, xmm, 0.0, ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
    output.d[1] = dnet(output.d[1], dm16, zhm28, xmm, 16.0);
    const rl = pdm[1][1] * pdl[1][16] * (1.0 + sw[1] * pdl[0][23] * (input.f107a - 150.0));
    const hc16 = pdm[1][5] * pdl[1][3];
    const zc16 = pdm[1][4] * pdl[1][2];
    const hc216 = pdm[1][5] * pdl[1][4];
    output.d[1] = output.d[1] * ccor2(z, rl, hc16, zc16, hc216);
    // chemistry correction
    const hcc16 = pdm[1][7] * pdl[1][13];
    const zcc16 = pdm[1][6] * pdl[1][12];
    const rc16 = pdm[1][3] * pdl[1][14];
    output.d[1] = output.d[1] * ccor(z, rc16, hcc16, zcc16);
  }

  // O2
  const g32 = sw[21] * globe7(pd[4], input);
  const db32 = pdm[3][0] * Math.exp(g32) * pd[4][0];
  output.d[3] = densu(z, db32, tinf, tlb, 32.0, ALPHA[3], ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
  if (sw[15]) {
    if (z <= ALTL[3]) {
      const zh32 = pdm[3][2];
      const b32 = densu(zh32, db32, tinf, tlb, 32.0 - xmm, ALPHA[3] - 1.0, ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
      const dm32 = densu(z, b32, tinf, tlb, xmm, 0.0, ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
      output.d[3] = dnet(output.d[3], dm32, zhm28, xmm, 32.0);
      // correction to the specified mixing ratio at the ground
      const rl = Math.log((b28 * pdm[3][1]) / b32);
      const hc32 = pdm[3][5] * pdl[1][7];
      const zc32 = pdm[3][4] * pdl[1][6];
      output.d[3] = output.d[3] * ccor(z, rl, hc32, zc32);
    }
    // correction for the general departure from diffusive equilibrium above Zlb
    const hcc32 = pdm[3][7] * pdl[1][22];
    const hcc232 = pdm[3][7] * pdl[0][22];
    const zcc32 = pdm[3][6] * pdl[1][21];
    const rc32 = pdm[3][3] * pdl[1][23] * (1.0 + sw[1] * pdl[0][23] * (input.f107a - 150.0));
    output.d[3] = output.d[3] * ccor2(z, rc32, hcc32, zcc32, hcc232);
  }

  // Ar
  const g40 = sw[21] * globe7(pd[5], input);
  const db40 = pdm[4][0] * Math.exp(g40) * pd[5][0];
  output.d[4] = densu(z, db40, tinf, tlb, 40.0, ALPHA[4], ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
  if (sw[15] && z <= ALTL[4]) {
    const zh40 = pdm[4][2];
    const b40 = densu(zh40, db40, tinf, tlb, 40.0 - xmm, ALPHA[4] - 1.0, ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
    const dm40 = densu(z, b40, tinf, tlb, xmm, 0.0, ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
    output.d[4] = dnet(output.d[4], dm40, zhm28, xmm, 40.0);
    const rl = Math.log((b28 * pdm[4][1]) / b40);
    const hc40 = pdm[4][5] * pdl[1][9];
    const zc40 = pdm[4][4] * pdl[1][8];
    output.d[4] = output.d[4] * ccor(z, rl, hc40, zc40);
  }

  // H
  const g1 = sw[21] * globe7(pd[6], input);
  const db01 = pdm[5][0] * Math.exp(g1) * pd[6][0];
  output.d[6] = densu(z, db01, tinf, tlb, 1.0, ALPHA[6], ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
  if (sw[15] && z <= ALTL[6]) {
    const zh01 = pdm[5][2];
    const b01 = densu(zh01, db01, tinf, tlb, 1.0 - xmm, ALPHA[6] - 1.0, ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
    const dm01 = densu(z, b01, tinf, tlb, xmm, 0.0, ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
    output.d[6] = dnet(output.d[6], dm01, zhm28, xmm, 1.0);
    const rl = Math.log((b28 * pdm[5][1] * Math.sqrt(pdl[1][17] * pdl[1][17])) / b01);
    const hc01 = pdm[5][5] * pdl[1][11];
    const zc01 = pdm[5][4] * pdl[1][10];
    output.d[6] = output.d[6] * ccor(z, rl, hc01, zc01);
    // chemistry correction
    const hcc01 = pdm[5][7] * pdl[1][19];
    const zcc01 = pdm[5][6] * pdl[1][18];
    const rc01 = pdm[5][3] * pdl[1][20];
    output.d[6] = output.d[6] * ccor(z, rc01, hcc01, zcc01);
  }

  // N
  const g14 = sw[21] * globe7(pd[7], input);
  const db14 = pdm[6][0] * Math.exp(g14) * pd[7][0];
  output.d[7] = densu(z, db14, tinf, tlb, 14.0, ALPHA[7], ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
  if (sw[15] && z <= ALTL[7]) {
    const zh14 = pdm[6][2];
    const b14 = densu(zh14, db14, tinf, tlb, 14.0 - xmm, ALPHA[7] - 1.0, ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
    const dm14 = densu(z, b14, tinf, tlb, xmm, 0.0, ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
    output.d[7] = dnet(output.d[7], dm14, zhm28, xmm, 14.0);
    const rl = Math.log((b28 * pdm[6][1] * Math.sqrt(pdl[0][2] * pdl[0][2])) / b14);
    const hc14 = pdm[6][5] * pdl[0][1];
    const zc14 = pdm[6][4] * pdl[0][0];
    output.d[7] = output.d[7] * ccor(z, rl, hc14, zc14);
    // chemistry correction
    const hcc14 = pdm[6][7] * pdl[0][4];
    const zcc14 = pdm[6][6] * pdl[0][3];
    const rc14 = pdm[6][3] * pdl[0][5];
    output.d[7] = output.d[7] * ccor(z, rc14, hcc14, zcc14);
  }

  // anomalous oxygen
  const g16h = sw[21] * globe7(pd[8], input);
  const db16h = pdm[7][0] * Math.exp(g16h) * pd[8][0];
  const tho = pdm[7][9] * pdl[0][6];
  const dd = densu(z, db16h, tho, tho, 16.0, ALPHA[8], ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
  const zsht = pdm[7][5];
  const zmho = pdm[7][4];
  const zsho = scalh(zmho, 16.0, tho);
  output.d[8] = dd * Math.exp((-zsht / zsho) * (Math.exp(-(z - zmho) / zsht) - 1.0));

  // total mass density
  output.d[5] = 1.66e-24 * (4.0 * output.d[0] + 16.0 * output.d[1] + 28.0 * output.d[2] + 32.0 * output.d[3] + 40.0 * output.d[4] + output.d[6] + 14.0 * output.d[7]);

  // temperature
  densu(Math.sqrt(input.alt * input.alt), 1.0, tinf, tlb, 0.0, 0.0, ptm[5], s, mn1, zn1, mesoTn1, mesoTgn1);
  output.t[1] = tzOut;
  if (sw[0]) {
    for (let i = 0; i < 9; i++) output.d[i] = output.d[i] * 1.0e6;
    output.d[5] = output.d[5] / 1000;
  }
}

// ─── the whole atmosphere, GTD7 and GTD7D ───────────────────────────────────

const ZN3 = Float64Array.from([32.5, 20.0, 15.0, 10.0, 0.0]);
const ZN2 = Float64Array.from([72.5, 55.0, 45.0, 32.5]);
const scratch: MsisOutput = { d: new Float64Array(9), t: new Float64Array(2) };

/**
 * GTD7: the neutral atmosphere at a point. `output.d[5]` is the mass of He,
 * O, N₂, O₂, Ar, H and N, without the anomalous oxygen.
 */
export function gtd7(input: MsisInput, switches: readonly number[] = MSIS_DEFAULT_SWITCHES, output: MsisOutput = { d: new Float64Array(9), t: new Float64Array(2) }): MsisOutput {
  const mn3 = 5, mn2 = 4, zmix = 62.5;
  tselec(switches);

  prepare(input);

  // latitude variation of gravity (none for switch 2 off)
  glatf(sw[2] === 0 ? 45.0 : input.lat);
  const xmm = pdm[2][4];

  // thermosphere/mesosphere, above zn2[0]
  const soutput = scratch;
  gts7(input.alt > ZN2[0] ? input : { ...input, alt: ZN2[0] }, soutput);
  const dm28m = sw[0] ? dm28 * 1.0e6 : dm28;
  output.t[0] = soutput.t[0];
  output.t[1] = soutput.t[1];
  if (input.alt >= ZN2[0]) {
    for (let i = 0; i < 9; i++) output.d[i] = soutput.d[i];
    return output;
  }

  // lower mesosphere/upper stratosphere, between zn3[0] and zn2[0]: temperatures at the nodes, gradients at the end nodes
  mesoTgn2[0] = mesoTgn1[1];
  mesoTn2[0] = mesoTn1[4];
  mesoTn2[1] = (pma[0][0] * pavgm[0]) / (1.0 - sw[20] * glob7s(pma[0], input));
  mesoTn2[2] = (pma[1][0] * pavgm[1]) / (1.0 - sw[20] * glob7s(pma[1], input));
  mesoTn2[3] = (pma[2][0] * pavgm[2]) / (1.0 - sw[20] * sw[22] * glob7s(pma[2], input));
  mesoTgn2[1] = (pavgm[8] * pma[9][0] * (1.0 + sw[20] * sw[22] * glob7s(pma[9], input)) * mesoTn2[3] * mesoTn2[3]) / (pma[2][0] * pavgm[2]) ** 2.0;
  mesoTn3[0] = mesoTn2[3];

  if (input.alt <= ZN3[0]) {
    // lower stratosphere and troposphere, below zn3[0]
    mesoTgn3[0] = mesoTgn2[1];
    mesoTn3[1] = (pma[3][0] * pavgm[3]) / (1.0 - sw[22] * glob7s(pma[3], input));
    mesoTn3[2] = (pma[4][0] * pavgm[4]) / (1.0 - sw[22] * glob7s(pma[4], input));
    mesoTn3[3] = (pma[5][0] * pavgm[5]) / (1.0 - sw[22] * glob7s(pma[5], input));
    mesoTn3[4] = (pma[6][0] * pavgm[6]) / (1.0 - sw[22] * glob7s(pma[6], input));
    mesoTgn3[1] = (pma[7][0] * pavgm[7] * (1.0 + sw[22] * glob7s(pma[7], input)) * mesoTn3[4] * mesoTn3[4]) / (pma[6][0] * pavgm[6]) ** 2.0;
  }

  // linear transition to full mixing below zn2[0]
  let dmc = 0;
  if (input.alt > zmix) dmc = 1.0 - (ZN2[0] - input.alt) / (ZN2[0] - zmix);
  const dz28 = soutput.d[2];

  // N2
  let dmr = soutput.d[2] / dm28m - 1.0;
  output.d[2] = densm(input.alt, dm28m, xmm, mn3, ZN3, mesoTn3, mesoTgn3, mn2, ZN2, mesoTn2, mesoTgn2);
  output.d[2] = output.d[2] * (1.0 + dmr * dmc);
  // He
  dmr = soutput.d[0] / (dz28 * pdm[0][1]) - 1.0;
  output.d[0] = output.d[2] * pdm[0][1] * (1.0 + dmr * dmc);
  // O
  output.d[1] = 0;
  output.d[8] = 0;
  // O2
  dmr = soutput.d[3] / (dz28 * pdm[3][1]) - 1.0;
  output.d[3] = output.d[2] * pdm[3][1] * (1.0 + dmr * dmc);
  // Ar
  dmr = soutput.d[4] / (dz28 * pdm[4][1]) - 1.0;
  output.d[4] = output.d[2] * pdm[4][1] * (1.0 + dmr * dmc);
  // H and N
  output.d[6] = 0;
  output.d[7] = 0;
  // total mass density
  output.d[5] = 1.66e-24 * (4.0 * output.d[0] + 16.0 * output.d[1] + 28.0 * output.d[2] + 32.0 * output.d[3] + 40.0 * output.d[4] + output.d[6] + 14.0 * output.d[7]);
  if (sw[0]) output.d[5] = output.d[5] / 1000;

  // temperature at the altitude
  densm(input.alt, 1.0, 0, mn3, ZN3, mesoTn3, mesoTgn3, mn2, ZN2, mesoTn2, mesoTgn2);
  output.t[1] = tzOut;
  return output;
}

/**
 * GTD7D: as GTD7, but `output.d[5]` is the effective mass density for drag,
 * the anomalous oxygen included — the one to drag a satellite with.
 */
export function gtd7d(input: MsisInput, switches: readonly number[] = MSIS_DEFAULT_SWITCHES, output?: MsisOutput): MsisOutput {
  const out = gtd7(input, switches, output);
  out.d[5] = 1.66e-24 * (4.0 * out.d[0] + 16.0 * out.d[1] + 28.0 * out.d[2] + 32.0 * out.d[3] + 40.0 * out.d[4] + out.d[6] + 14.0 * out.d[7] + 16.0 * out.d[8]);
  if (sw[0]) out.d[5] = out.d[5] / 1000;
  return out;
}

const SI_SWITCHES: readonly number[] = [1, ...Array<number>(23).fill(1)];
const dragOut: MsisOutput = { d: new Float64Array(9), t: new Float64Array(2) };

/** The effective mass density for drag, kg/m³ (GTD7D in SI units, every switch on, the daily Ap). */
export function msisDensity(input: MsisInput): number {
  return gtd7d(input, SI_SWITCHES, dragOut).d[5];
}
